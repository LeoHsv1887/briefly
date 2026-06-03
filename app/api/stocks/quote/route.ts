import { NextRequest, NextResponse } from 'next/server';
import type { StockQuote } from '@/lib/types';

// Known XETRA symbols that need .DE suffix for Alpha Vantage
const XETRA = new Set([
  'SAP', 'VOW3', 'BMW', 'MBG', 'ADS', 'DTE', 'ALV', 'MUV2', 'SIE',
  'BAS', 'BAYN', 'DBK', 'LIN', 'RWE', 'EON', 'HEN3', 'FRE', 'CON',
  'INF', 'MTX', 'ZAL', 'BEI', 'DPW', 'HAL', 'HEI', 'IFX', 'MRK',
  'NDA', 'PUM', 'QIA', 'SAX', 'SHL', 'SY1', 'VNA', 'WDI',
]);

function resolveSymbol(symbol: string): string {
  const base = symbol.toUpperCase().replace(/\.DE$/, '');
  return XETRA.has(base) ? `${base}.DE` : symbol.toUpperCase();
}

export async function GET(request: NextRequest) {
  const raw = request.nextUrl.searchParams.get('symbol');
  if (!raw) return NextResponse.json({ error: 'symbol required' }, { status: 400 });

  const apiKey = process.env.ALPHA_VANTAGE_API_KEY;
  if (!apiKey) return NextResponse.json({ error: 'API key not configured' }, { status: 503 });

  const symbol = resolveSymbol(raw);
  const url = `https://www.alphavantage.co/query?function=GLOBAL_QUOTE&symbol=${encodeURIComponent(symbol)}&apikey=${apiKey}`;

  try {
    const res = await fetch(url, { next: { revalidate: 300 } });
    const data = await res.json();
    const q = data['Global Quote'];

    if (!q || !q['05. price']) {
      return NextResponse.json({ error: 'No data for symbol' }, { status: 404 });
    }

    const price = parseFloat(q['05. price']);
    const change = parseFloat(q['09. change']);
    const changePercent = parseFloat((q['10. change percent'] as string).replace('%', ''));

    const quote: StockQuote = {
      symbol: raw.toUpperCase(),
      price,
      change,
      changePercent,
      open: parseFloat(q['02. open']),
      high: parseFloat(q['03. high']),
      low: parseFloat(q['04. low']),
      volume: parseInt(q['06. volume'], 10),
      prevClose: parseFloat(q['08. previous close']),
      isPositive: change >= 0,
    };
    return NextResponse.json(quote);
  } catch (err) {
    console.error('[Stocks/Quote]', err);
    return NextResponse.json({ error: 'Fetch failed' }, { status: 500 });
  }
}
