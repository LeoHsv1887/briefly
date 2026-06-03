import { NextRequest, NextResponse } from 'next/server';
import Parser from 'rss-parser';
import type { StockNewsItem } from '@/lib/types';

export const revalidate = 1800;

type FeedItem = { title?: string; link?: string; guid?: string; isoDate?: string; pubDate?: string };
const parser = new Parser<Record<string, unknown>, FeedItem>({ timeout: 8000 });

async function fetchForSymbol(symbol: string): Promise<StockNewsItem[]> {
  const q = encodeURIComponent(`${symbol} Aktie stock`);
  const url = `https://news.google.com/rss/search?q=${q}&hl=de&gl=DE&ceid=DE:de`;
  try {
    const feed = await parser.parseURL(url);
    return (feed.items ?? []).slice(0, 5).map((item): StockNewsItem => {
      let title = (item.title ?? '').replace(/<[^>]+>/g, '').trim();
      let source = 'Google News';
      const idx = title.lastIndexOf(' - ');
      if (idx > 0) {
        source = title.slice(idx + 3).trim();
        title = title.slice(0, idx).trim();
      }
      return {
        title,
        url: item.link ?? item.guid ?? '',
        source,
        publishedAt: item.isoDate ?? item.pubDate ?? new Date().toISOString(),
        symbol: symbol.replace(/\.DE$/, ''),
      };
    }).filter((a) => a.title && a.url);
  } catch {
    return [];
  }
}

export async function GET(request: NextRequest) {
  const symbolsParam = request.nextUrl.searchParams.get('symbols') ?? '';
  const symbols = symbolsParam.split(',').map((s) => s.trim()).filter(Boolean).slice(0, 5);
  if (!symbols.length) return NextResponse.json({ news: [] });

  const results = await Promise.all(symbols.map(fetchForSymbol));
  const all: StockNewsItem[] = results.flat();

  // Deduplicate by title similarity (quick lowercase check)
  const seen = new Set<string>();
  const unique = all.filter((item) => {
    const key = item.title.toLowerCase().slice(0, 60);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  unique.sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime());
  return NextResponse.json({ news: unique.slice(0, 15) });
}
