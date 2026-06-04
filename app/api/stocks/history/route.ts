import { NextResponse } from 'next/server'

export const revalidate = 3600

const RANGE_MAP: Record<string, { range: string; interval: string }> = {
  '1W': { range: '5d', interval: '1d' },
  '1M': { range: '1mo', interval: '1d' },
  '3M': { range: '3mo', interval: '1d' },
  '1J': { range: '1y', interval: '1wk' },
  '5J': { range: '5y', interval: '1mo' },
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const symbol = searchParams.get('symbol')
  const rangeKey = searchParams.get('range') ?? '1M'

  if (!symbol) return NextResponse.json({ data: [] }, { status: 400 })

  const { range, interval } = RANGE_MAP[rangeKey] ?? RANGE_MAP['1M']

  try {
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?range=${range}&interval=${interval}`
    const res = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0' },
      next: { revalidate: 3600 }
    })

    const json = await res.json()
    const result = json?.chart?.result?.[0]
    if (!result) return NextResponse.json({ data: [] })

    const timestamps: number[] = result.timestamp ?? []
    const closes: (number | null)[] = result.indicators?.quote?.[0]?.close ?? []

    const data = timestamps
      .map((ts, i) => ({
        date: new Date(ts * 1000).toISOString().split('T')[0],
        close: closes[i] ?? null,
      }))
      .filter((p): p is { date: string; close: number } => p.close !== null)

    return NextResponse.json({ data })
  } catch (error) {
    console.error('[History] Error:', error)
    return NextResponse.json({ data: [] })
  }
}
