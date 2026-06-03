import { NextRequest, NextResponse } from 'next/server';
import type { HistoryPoint } from '@/lib/types';

export const revalidate = 3600;

const XETRA = new Set([
  'SAP', 'VOW3', 'BMW', 'MBG', 'ADS', 'DTE', 'ALV', 'MUV2', 'SIE',
  'BAS', 'BAYN', 'DBK', 'LIN', 'RWE', 'EON', 'HEN3', 'FRE', 'CON',
  'INF', 'MTX', 'ZAL', 'BEI', 'DPW', 'HAL', 'HEI', 'IFX', 'MRK',
  'NDA', 'PUM', 'QIA', 'SHL', 'VNA',
]);

function resolveSymbol(symbol: string): string {
  const base = symbol.toUpperCase().replace(/\.DE$/, '');
  return XETRA.has(base) ? `${base}.DE` : symbol.toUpperCase();
}

const RANGE_DAYS: Record<string, number> = {
  '1W': 7, '1M': 30, '3M': 90, '1J': 365, '5J': 1825,
};

export async function GET(request: NextRequest) {
  const raw = request.nextUrl.searchParams.get('symbol');
  const range = request.nextUrl.searchParams.get('range') ?? '1M';
  if (!raw) return NextResponse.json({ data: [] });

  const apiKey = process.env.ALPHA_VANTAGE_API_KEY;
  if (!apiKey) return NextResponse.json({ error: 'API key not configured' }, { status: 503 });

  const symbol = resolveSymbol(raw);
  const days = RANGE_DAYS[range] ?? 30;
  const outputsize = days > 100 ? 'full' : 'compact';

  const url = `https://www.alphavantage.co/query?function=TIME_SERIES_DAILY&symbol=${encodeURIComponent(symbol)}&outputsize=${outputsize}&apikey=${apiKey}`;

  try {
    const res = await fetch(url, { next: { revalidate: 3600 } });
    const json = await res.json();
    const series: Record<string, Record<string, string>> = json['Time Series (Daily)'] ?? {};

    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - days);

    const points: HistoryPoint[] = Object.entries(series)
      .filter(([date]) => new Date(date) >= cutoff)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, vals]) => ({
        date,
        close: parseFloat(vals['4. close']),
      }));

    return NextResponse.json({ data: points });
  } catch (err) {
    console.error('[Stocks/History]', err);
    return NextResponse.json({ data: [] });
  }
}
