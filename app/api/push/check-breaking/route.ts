import Anthropic from '@anthropic-ai/sdk'
import { NextResponse } from 'next/server'
import { getSentArticleIds, saveSentArticleIds } from '@/lib/pushStore'
import type { Article } from '@/lib/types'

export const dynamic = 'force-dynamic'

const MAX_NOTIFICATIONS_PER_RUN = 3
const BREAKING_SCORE_THRESHOLD = 9 // scores are 0–10, see lib/scoring.ts
const BREAKING_MAX_AGE_MS = 3 * 60 * 60 * 1000 // matches the client-side "Breaking" badge heuristic

function isBreaking(article: Article): boolean {
  return article.score >= BREAKING_SCORE_THRESHOLD
    && (Date.now() - new Date(article.publishedAt).getTime()) < BREAKING_MAX_AGE_MS
}

async function summarizeOneSentence(anthropic: Anthropic, article: Article): Promise<string> {
  try {
    const res = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 80,
      messages: [{
        role: 'user',
        content: `Fasse diesen Artikel in einem einzigen kurzen Satz zusammen (max. 120 Zeichen): "${article.title}". Antworte NUR mit dem Satz.`,
      }],
    })
    const text = res.content[0].type === 'text' ? res.content[0].text.trim() : ''
    return text || (article.content ?? '').slice(0, 120)
  } catch {
    return (article.content ?? '').slice(0, 120)
  }
}

export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization')
  if (!process.env.CRON_SECRET || authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const baseUrl = new URL(request.url).origin

    const feedRes = await fetch(`${baseUrl}/api/feeds`, { cache: 'no-store' })
    const data = await feedRes.json()
    const articles: Article[] = data.articles ?? []

    const sentIds = await getSentArticleIds()

    const toNotify = articles
      .filter((a) => !sentIds.includes(a.id) && isBreaking(a))
      .slice(0, MAX_NOTIFICATIONS_PER_RUN)

    if (toNotify.length === 0) {
      return NextResponse.json({ notified: 0 })
    }

    const anthropic = process.env.ANTHROPIC_API_KEY ? new Anthropic() : null

    let notified = 0
    for (const article of toNotify) {
      const summary = anthropic
        ? await summarizeOneSentence(anthropic, article)
        : (article.content ?? '').slice(0, 120)

      const res = await fetch(`${baseUrl}/api/push/send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: article.title,
          body: summary,
          url: `/?article=${article.id}`,
          secret: process.env.PUSH_SECRET,
        }),
      })

      // Only mark as sent on success, so a transient failure gets retried
      // on the next cron run instead of being silently dropped forever.
      if (res.ok) {
        sentIds.push(article.id)
        notified++
      }
    }

    await saveSentArticleIds(sentIds)

    return NextResponse.json({ notified })
  } catch (error) {
    console.error('Breaking news check error:', error)
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}
