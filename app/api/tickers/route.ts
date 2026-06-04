import { NextResponse } from 'next/server'
import { fetchMultipleQuotes, formatPrice } from '@/lib/yahoo-finance'

export const revalidate = 300

const TICKER_SYMBOLS = [
  { symbol: '^GDAXI', label: 'DAX' },
  { symbol: '^GSPC', label: 'S&P 500' },
  { symbol: '^IXIC', label: 'Nasdaq' },
  { symbol: 'BTC-USD', label: 'BTC/USD' },
  { symbol: 'EURUSD=X', label: 'EUR/USD' },
]

export async function GET() {
  try {
    const quotes = await fetchMultipleQuotes(TICKER_SYMBOLS)

    const tickers = quotes.map(q => ({
      symbol: q.symbol,
      name: q.label,
      label: q.label,
      value: q.price,
      formattedValue: formatPrice(q.price, q.symbol),
      change: q.change,
      changePercent: parseFloat(q.changePercent.toFixed(2)),
      isPositive: q.isPositive,
      isMarketOpen: q.isMarketOpen,
    }))

    return NextResponse.json({ tickers })
  } catch (error) {
    console.error('[Tickers] Error:', error)
    return NextResponse.json({ tickers: [] }, { status: 500 })
  }
}
