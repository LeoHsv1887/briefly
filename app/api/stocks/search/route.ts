import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const q = searchParams.get('q')

  if (!q || q.length < 2) {
    return NextResponse.json({ results: [] })
  }

  try {
    const url = `https://query1.finance.yahoo.com/v1/finance/search?q=${encodeURIComponent(q)}&lang=de&region=DE&quotesCount=8&newsCount=0`
    const res = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0' },
      next: { revalidate: 0 }
    })

    const data = await res.json()
    const quotes = data.quotes ?? []

    const results = quotes
      .filter((q: any) => q.quoteType === 'EQUITY' || q.quoteType === 'INDEX' || q.quoteType === 'CRYPTOCURRENCY')
      .slice(0, 6)
      .map((q: any) => ({
        symbol: q.symbol,
        name: q.longname ?? q.shortname ?? q.symbol,
        exchange: q.exchange ?? '',
        currency: q.currency ?? '',
        type: q.quoteType,
      }))

    return NextResponse.json({ results })
  } catch (error) {
    console.error('[Search] Error:', error)
    return NextResponse.json({ results: [] })
  }
}
