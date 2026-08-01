import { NextResponse } from 'next/server';
import { fetchFeed, removeDuplicates, filterByAge, FEEDS } from '@/lib/feeds';
import { scoreAndAssignTopics, clusterAndDeduplicate } from '@/lib/scoring';

// Short ISR window: most opens get an instant, edge-cached response, but the
// full fetch/score/cluster pipeline (several seconds) reruns at least every
// 90s so the feed never goes stale for long. `force-dynamic` (no caching at
// all) made every single open slow. `?fresh=true` busts the edge cache for
// the manual pull-to-refresh path — a distinct query string is a cache miss
// on Vercel's edge regardless of the revalidate window, and the no-store
// response header makes the intent explicit to any cache in between.
export const revalidate = 90;

const MAX_ARTICLES_TOTAL = 220;

// These topics only ever produce a handful of fresh candidates at any given
// moment (a couple of local papers vs. dozens of national outlets). A flat
// "most recent 150 overall" cutoff always loses that race to national news,
// so their candidates are carved out and guaranteed a spot ahead of the cut.
const RESERVED_TOPICS = new Set(['Münster & Region', 'Badbergen & Osnabrücker Land', 'Gründer & Startups']);

export async function GET(request: Request) {
  const forceFresh = new URL(request.url).searchParams.get('fresh') === 'true';
  try {
    const results = await Promise.allSettled(FEEDS.map(fetchFeed));
    const allArticles = results
      .filter((r): r is PromiseFulfilledResult<Awaited<ReturnType<typeof fetchFeed>>> => r.status === 'fulfilled')
      .flatMap((r) => r.value);

    const fresh = filterByAge(allArticles, 36);
    const unique = removeDuplicates(fresh);
    unique.sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime());

    const reserved = unique.filter((a) => RESERVED_TOPICS.has(a.topic));
    const remaining = unique.filter((a) => !RESERVED_TOPICS.has(a.topic));
    const toScore = [...reserved, ...remaining.slice(0, MAX_ARTICLES_TOTAL - reserved.length)];
    const scored = await scoreAndAssignTopics(toScore);
    const filtered = scored.filter((a) => a.score >= 6);
    const clustered = await clusterAndDeduplicate(filtered);
    const sorted = clustered
      .sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime())
      .slice(0, MAX_ARTICLES_TOTAL);

    return NextResponse.json(
      { articles: sorted, total: sorted.length, fetchedAt: new Date().toISOString() },
      forceFresh ? { headers: { 'Cache-Control': 'no-store, must-revalidate' } } : undefined,
    );
  } catch (err) {
    console.error('Feed aggregation error:', err);
    return NextResponse.json({ articles: [], total: 0, error: 'Feed fetch failed' }, { status: 500 });
  }
}
