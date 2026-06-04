import Anthropic from '@anthropic-ai/sdk'
import { NextResponse } from 'next/server'
import { fetchMultipleQuotes } from '@/lib/yahoo-finance'

export const dynamic = 'force-dynamic'
export const revalidate = 0

const BRIEFING_SYMBOLS = [
  { symbol: '^GDAXI', label: 'DAX' },
  { symbol: '^GSPC', label: 'S&P 500' },
  { symbol: '^IXIC', label: 'Nasdaq' },
  { symbol: 'BTC-USD', label: 'Bitcoin' },
  { symbol: 'ETH-USD', label: 'Ethereum' },
  { symbol: 'GC=F', label: 'Gold' },
  { symbol: 'BZ=F', label: 'Öl (Brent)' },
]

export async function GET() {
  const quotes = await fetchMultipleQuotes(BRIEFING_SYMBOLS)

  const marketData = quotes.reduce((acc, q) => {
    acc[q.label] = {
      label: q.label,
      price: q.price.toLocaleString('de-DE', { maximumFractionDigits: 2 }),
      changePercent: q.changePercent.toFixed(2),
      isPositive: q.isPositive,
      isMarketOpen: q.isMarketOpen,
    }
    return acc
  }, {} as Record<string, { label: string; price: string; changePercent: string; isPositive: boolean; isMarketOpen: boolean }>)

  let headlines: string[] = []
  try {
    const newsRes = await fetch(
      'https://news.google.com/rss/search?q=Aktienmarkt+DAX+Wall+Street+Börse+heute&hl=de&gl=DE&ceid=DE:de',
      { next: { revalidate: 900 } },
    )
    const xml = await newsRes.text()
    const matches = xml.match(/<title><!\[CDATA\[(.*?)\]\]><\/title>/g) ?? []
    headlines = matches
      .map(m => m.replace(/<title><!\[CDATA\[/, '').replace(/\]\]><\/title>/, ''))
      .filter(t => !t.includes('Google News'))
      .slice(0, 8)
  } catch {}

  const today = new Date().toLocaleDateString('de-DE', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  })

  const marketLines = Object.values(marketData)
    .map(d => `- ${d.label}: ${d.price} (${d.isMarketOpen ? d.changePercent + '%' : 'Schluss: ' + d.changePercent + '%'})`)
    .join('\n')

  const headlineLines = headlines.map((h, i) => `${i + 1}. ${h}`).join('\n')

  const prompt = `Du bist ein erfahrener Finanzjournalist. Heute ist ${today}.

Marktdaten (teilweise Schlusskurse da Märkte aktuell geschlossen):
${marketLines || '(keine Daten verfügbar)'}

Aktuelle Schlagzeilen:
${headlineLines || '(keine Schlagzeilen verfügbar)'}

Schreibe ein Markt-Briefing auf Deutsch basierend auf den heutigen Schlusskursen und aktuellen Nachrichten. Erkläre konkret WAS heute passiert ist und WARUM – verknüpfe Kursbewegungen mit echten Ereignissen. Wenn Märkte gerade geschlossen sind, beziehe dich auf den heutigen Handelstag.

Antworte NUR als JSON ohne Markdown oder Codeblöcke:
{"summary":"2-3 Sätze Gesamtüberblick.","dax":"2 Sätze zu DAX und Europa mit konkretem Treiber.","usa":"2 Sätze zu S&P 500 und Nasdaq.","crypto":"2 Sätze zu Bitcoin und Krypto.","commodities":"2 Sätze zu Gold, Öl und Rohstoffen.","sentiment":"bullish"}`

  let analysis = {
    summary: 'Das Briefing konnte heute nicht geladen werden.',
    dax: '',
    usa: '',
    crypto: '',
    commodities: '',
    sentiment: 'neutral' as 'bullish' | 'bearish' | 'neutral',
  }

  try {
    if (process.env.ANTHROPIC_API_KEY) {
      const anthropic = new Anthropic()
      const response = await anthropic.messages.create({
        model: 'claude-sonnet-4-6',
        max_tokens: 800,
        messages: [{ role: 'user', content: prompt }],
      })
      const text = response.content[0].type === 'text' ? response.content[0].text : ''
      const match = text.match(/\{[\s\S]*\}/)
      if (match) analysis = JSON.parse(match[0])
    }
  } catch {}

  return NextResponse.json({ ...analysis, marketData, generatedAt: new Date().toISOString() })
}
