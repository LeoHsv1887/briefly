import { NextResponse } from 'next/server'
import { fetchMultipleQuotes, formatPrice } from '@/lib/yahoo-finance'

export const dynamic = 'force-dynamic'
export const revalidate = 0

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

    const germanHour = new Date().getUTCHours() + 1
    const isDefinitelyClosed = germanHour >= 20 || germanHour < 8

    const tickers = quotes.map(q => ({
      symbol: q.symbol,
      name: q.label,
      label: q.label,
      value: q.price,
      formattedValue: formatPrice(q.price, q.symbol),
      change: q.change,
      changePercent: parseFloat(q.changePercent.toFixed(2)),
      isPositive: q.isPositive,
      isMarketOpen: !isDefinitelyClosed,
    }))

    return NextResponse.json({ tickers })
  } catch (error) {
    console.error('[Tickers] Error:', error)
    return NextResponse.json({ tickers: [] }, { status: 500 })
  }
}
