import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  const { url } = await request.json()

  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'de-DE,de;q=0.9,en;q=0.8',
        'Accept-Encoding': 'gzip, deflate, br',
        'Cache-Control': 'no-cache',
      },
      next: { revalidate: 3600 },
    })

    const html = await res.text()
    const text = extractArticleText(html)
    const isPaywall = detectPaywall(html)

    return NextResponse.json({ success: true, text, isPaywall, charCount: text.length })
  } catch {
    return NextResponse.json({ success: false, text: '', isPaywall: false, charCount: 0 })
  }
}

function extractArticleText(html: string): string {
  let text = html

  text = text.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
  text = text.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
  text = text.replace(/<nav[^>]*>[\s\S]*?<\/nav>/gi, '')
  text = text.replace(/<header[^>]*>[\s\S]*?<\/header>/gi, '')
  text = text.replace(/<footer[^>]*>[\s\S]*?<\/footer>/gi, '')
  text = text.replace(/<aside[^>]*>[\s\S]*?<\/aside>/gi, '')
  text = text.replace(/<form[^>]*>[\s\S]*?<\/form>/gi, '')

  const articlePatterns = [
    /<article[^>]*>([\s\S]*?)<\/article>/i,
    /<div[^>]*class="[^"]*article[^"]*"[^>]*>([\s\S]*?)<\/div>/i,
    /<div[^>]*class="[^"]*content[^"]*"[^>]*>([\s\S]*?)<\/div>/i,
    /<div[^>]*class="[^"]*body[^"]*"[^>]*>([\s\S]*?)<\/div>/i,
    /<main[^>]*>([\s\S]*?)<\/main>/i,
  ]

  for (const pattern of articlePatterns) {
    const match = text.match(pattern)
    if (match && match[1].length > 500) {
      text = match[1]
      break
    }
  }

  const paragraphs: string[] = []
  const pMatches = text.matchAll(/<p[^>]*>([\s\S]*?)<\/p>/gi)
  for (const match of pMatches) {
    const p = match[1]
      .replace(/<[^>]+>/g, '')
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/\s+/g, ' ')
      .trim()
    if (p.length > 40) paragraphs.push(p)
  }

  if (paragraphs.length > 0) return paragraphs.join('\n\n')

  return text
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 3000)
}

function detectPaywall(html: string): boolean {
  const paywallSignals = [
    'paywall', 'paid-content', 'subscriber-only', 'premium-content',
    'abo-inhalt', 'plus-inhalt', 'exklusiv-inhalt', 'nur für abonnenten',
    'jetzt abonnieren', 'artikel weiterlesen', 'premium artikel',
    'registrieren sie sich', 'anmelden um weiterzulesen',
  ]
  const lower = html.toLowerCase()
  return paywallSignals.some(s => lower.includes(s))
}
