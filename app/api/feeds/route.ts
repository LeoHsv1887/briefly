import { NextResponse } from 'next/server';
import { fetchFeed, removeDuplicates, filterByAge, FEEDS } from '@/lib/feeds';
import { scoreAndAssignTopics, clusterAndDeduplicate } from '@/lib/scoring';

export const revalidate = 900;

export async function GET() {
  try {
    const results = await Promise.allSettled(FEEDS.map(fetchFeed));
    const allArticles = results
      .filter((r): r is PromiseFulfilledResult<Awaited<ReturnType<typeof fetchFeed>>> => r.status === 'fulfilled')
      .flatMap((r) => r.value);

    const fresh = filterByAge(allArticles, 36);
    const unique = removeDuplicates(fresh);
    unique.sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime());

    const toScore = unique.slice(0, 100);
    const scored = await scoreAndAssignTopics(toScore);
    const filtered = scored.filter((a) => a.score >= 6);
    const clustered = await clusterAndDeduplicate(filtered);
    const sorted = clustered.sort((a, b) =>
      new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime()
    );

    return NextResponse.json({
      articles: sorted,
      total: clustered.length,
      fetchedAt: new Date().toISOString(),
    });
  } catch (err) {
    console.error('Feed aggregation error:', err);
    return NextResponse.json({ articles: [], total: 0, error: 'Feed fetch failed' }, { status: 500 });
  }
}
