export interface Quote {
  symbol: string
  label: string
  price: number
  change: number
  changePercent: number
  isPositive: boolean
  isMarketOpen: boolean
  currency: string
  previousClose: number
  open: number
  high: number
  low: number
  volume: number
  marketState: string
  lastUpdated: string // ISO string
}

export async function fetchYahooQuote(symbol: string, label: string): Promise<Quote | null> {
  try {
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?interval=1m&range=1d`
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      },
      next: { revalidate: 60 },
    })

    if (!res.ok) throw new Error(`Yahoo Finance HTTP ${res.status}`)

    const data = await res.json()
    const result = data?.chart?.result?.[0]
    if (!result) throw new Error('No result in Yahoo response')

    const meta = result.meta
    const price = meta.regularMarketPrice ?? meta.previousClose ?? 0
    const previousClose = meta.previousClose ?? meta.chartPreviousClose ?? price
    const change = price - previousClose
    const changePercent = previousClose > 0 ? (change / previousClose) * 100 : 0
    const marketState: string = meta.marketState ?? 'CLOSED'
    const isMarketOpen = marketState === 'REGULAR' || marketState === 'PRE' || marketState === 'POST'
    const lastUpdated = meta.regularMarketTime
      ? new Date(meta.regularMarketTime * 1000).toISOString()
      : new Date().toISOString()

    return {
      symbol,
      label,
      price,
      change,
      changePercent,
      isPositive: changePercent >= 0,
      isMarketOpen,
      currency: meta.currency ?? 'USD',
      previousClose,
      open: meta.regularMarketOpen ?? price,
      high: meta.regularMarketDayHigh ?? price,
      low: meta.regularMarketDayLow ?? price,
      volume: meta.regularMarketVolume ?? 0,
      marketState,
      lastUpdated,
    }
  } catch (error) {
    console.error(`[Yahoo] Failed to fetch ${symbol}:`, error)
    return null
  }
}

export async function fetchMultipleQuotes(symbols: { symbol: string; label: string }[]): Promise<Quote[]> {
  const results = await Promise.allSettled(
    symbols.map(({ symbol, label }) => fetchYahooQuote(symbol, label))
  )
  return results
    .filter((r): r is PromiseFulfilledResult<Quote> => r.status === 'fulfilled' && r.value !== null)
    .map(r => r.value)
}

export function formatPrice(price: number, symbol: string): string {
  if (symbol.includes('EUR') || symbol.includes('GBP') || symbol === 'EURUSD=X') {
    return price.toFixed(4)
  }
  if (price > 1000) {
    return price.toLocaleString('de-DE', { maximumFractionDigits: 0 })
  }
  return price.toLocaleString('de-DE', { maximumFractionDigits: 2 })
}
