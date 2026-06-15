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

export async function GET(request: Request) {
  const baseUrl = new URL(request.url).origin
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

  // Fetch market-relevant articles from the app's own scored+classified feed
  let marketArticles: Array<{ title: string; source: string; topic: string; score: number }> = []
  try {
    const feedRes = await fetch(`${baseUrl}/api/feeds`, { next: { revalidate: 900 } })
    const feedData = await feedRes.json()
    marketArticles = (feedData.articles ?? [])
      .filter((a: any) =>
        ['Wirtschaft & Finanzen', 'Aktienmärkte', 'Geopolitik'].includes(a.topic)
      )
      .sort((a: any, b: any) => b.score - a.score)
      .slice(0, 15)
  } catch {}

  const today = new Date().toLocaleDateString('de-DE', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
    timeZone: 'Europe/Berlin',
  })

  const marketLines = Object.values(marketData)
    .map(d => `- ${d.label}: ${d.price} (${d.isMarketOpen ? d.changePercent + '%' : 'Schluss: ' + d.changePercent + '%'})`)
    .join('\n')

  const marketContext = marketArticles.length > 0
    ? marketArticles.map(a => `- ${a.title} (${a.source})`).join('\n')
    : '(keine Artikel verfügbar)'

  const prompt = `Du bist ein erfahrener Finanzjournalist. Heute ist ${today}.

Aktuelle Marktdaten:
${marketLines}

Relevante Wirtschafts- und Finanznachrichten der letzten Stunden:
${marketContext}

WICHTIGE REGELN für die Markteinschätzung:
1. Nenne als Grund für eine Kursbewegung NUR Ereignisse die explizit in den bereitgestellten Artikeln erwähnt werden.
2. Erfinde KEINE Gründe und spekuliere NICHT ("könnte daran liegen", "vermutlich wegen", "angesichts von").
3. Falls kein klarer Auslöser für eine Kursbewegung erkennbar ist, schreibe es ehrlich: "Ein konkreter Auslöser ist aus den aktuellen Nachrichten nicht eindeutig ersichtlich."
4. Verknüpfe Kursbewegungen nur wenn ein zeitlicher und thematischer Zusammenhang plausibel ist.
5. Nenne konkrete Zahlen aus den Artikeln wenn vorhanden (z.B. "Gewinnrückgang von X%" statt "schwache Zahlen").
6. Wo eine Begründung auf einem Artikel basiert, füge die Quelle in Klammern ein, z.B. "(laut Handelsblatt)" oder "(laut Reuters)".

Schreibe ein präzises Markt-Briefing auf Deutsch. Antworte NUR als JSON ohne Markdown oder Codeblöcke:
{"summary":"2-3 Sätze faktenbasierter Gesamtüberblick mit Quellenangaben.","dax":"2 Sätze zu DAX und Europa mit konkret belegtem Treiber oder ehrlichem Hinweis falls kein Auslöser bekannt.","usa":"2 Sätze zu S&P 500 und Nasdaq.","crypto":"2 Sätze zu Bitcoin und Krypto.","commodities":"2 Sätze zu Gold, Öl und Rohstoffen.","sentiment":"bullish"}`

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
