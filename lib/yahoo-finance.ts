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
}

export async function fetchYahooQuote(symbol: string, label: string): Promise<Quote | null> {
  try {
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?interval=1d&range=2d`
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
      },
      next: { revalidate: 300 }
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
    const isMarketOpen = meta.marketState === 'REGULAR' ||
                         meta.marketState === 'PRE' ||
                         !!(meta.regularMarketPrice && meta.regularMarketPrice !== meta.previousClose)

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
