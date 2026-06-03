import { NextRequest, NextResponse } from 'next/server';
import type { StockSearchResult } from '@/lib/types';

export async function GET(request: NextRequest) {
  const q = request.nextUrl.searchParams.get('q');
  if (!q || q.length < 1) return NextResponse.json({ results: [] });

  const apiKey = process.env.ALPHA_VANTAGE_API_KEY;
  if (!apiKey) return NextResponse.json({ error: 'API key not configured' }, { status: 503 });

  const url = `https://www.alphavantage.co/query?function=SYMBOL_SEARCH&keywords=${encodeURIComponent(q)}&apikey=${apiKey}`;

  try {
    const res = await fetch(url, { next: { revalidate: 60 } });
    const data = await res.json();
    const matches: Array<Record<string, string>> = data.bestMatches ?? [];

    const results: StockSearchResult[] = matches.slice(0, 6).map((m) => ({
      symbol: m['1. symbol'] ?? '',
      name: m['2. name'] ?? '',
      exchange: m['4. region'] ?? '',
      currency: m['8. currency'] ?? '',
    }));

    return NextResponse.json({ results });
  } catch (err) {
    console.error('[Stocks/Search]', err);
    return NextResponse.json({ results: [] });
  }
}
