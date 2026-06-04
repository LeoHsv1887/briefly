import { NextResponse } from 'next/server'
import { fetchYahooQuote } from '@/lib/yahoo-finance'

export const dynamic = 'force-dynamic'
export const revalidate = 0

const GERMAN_STOCKS = new Set([
  'SAP', 'VOW3', 'BMW', 'MBG', 'SIE', 'ALV', 'MUV2', 'DBK', 'DTE', 'BAS',
  'BAYN', 'RWE', 'EON', 'HEN3', 'ADS', 'LIN', 'FRE', 'CON', 'INF', 'MTX',
  'ZAL', 'BEI', 'DPW', 'HAL', 'HEI', 'IFX', 'MRK', 'NDA', 'PUM', 'QIA',
  'SHL', 'VNA',
])

function getYahooSymbol(symbol: string): string {
  const base = symbol.toUpperCase().replace(/\.DE$/, '')
  if (GERMAN_STOCKS.has(base)) return `${base}.DE`
  if (symbol.includes('.')) return symbol
  return symbol
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const raw = searchParams.get('symbol')

  if (!raw) {
    return NextResponse.json({ error: 'Symbol required' }, { status: 400 })
  }

  const yahooSymbol = getYahooSymbol(raw)
  const quote = await fetchYahooQuote(yahooSymbol, raw.toUpperCase())

  if (!quote) {
    return NextResponse.json({ error: 'Quote not found' }, { status: 404 })
  }

  return NextResponse.json({
    symbol: raw.toUpperCase(),
    price: quote.price,
    change: quote.change,
    changePercent: parseFloat(quote.changePercent.toFixed(2)),
    open: quote.open,
    high: quote.high,
    low: quote.low,
    volume: quote.volume,
    prevClose: quote.previousClose,
    isPositive: quote.isPositive,
    isMarketOpen: quote.isMarketOpen,
    currency: quote.currency,
  })
}
