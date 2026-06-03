import { NextResponse } from 'next/server';
import type { TickerData } from '@/lib/types';

export const revalidate = 300;

function placeholder(symbol: string): TickerData {
  return {
    symbol, name: symbol, value: 0, change: 0, changePercent: 0,
    isPositive: true, formattedValue: '—', isMarketOpen: false,
  };
}

function formatValue(value: number, decimals: number): string {
  if (decimals === 0) return Math.round(value).toLocaleString('de-DE');
  return value.toFixed(decimals);
}

// stooq.com: free index data, no API key required
// JSON may have "volume":} (empty value) — clean before parsing
async function fetchStooq(label: string, stooqSymbol: string, decimals: number): Promise<TickerData> {
  const url = `https://stooq.com/q/l/?s=${stooqSymbol}&f=sd2t2ohlcv&e=json`;
  try {
    const res = await fetch(url, { cache: 'no-store' });
    if (!res.ok) {
      console.warn(`[Ticker] ${label}: stooq HTTP ${res.status}`);
      return placeholder(label);
    }
    const raw = await res.text();
    const clean = raw.replace(/("volume":)([,}])/g, '$1null$2');
    const json = JSON.parse(clean);
    const q = json.symbols?.[0];
    if (!q?.close) {
      console.warn(`[Ticker] ${label}: stooq no data`, raw);
      return placeholder(label);
    }
    const price: number = q.close;
    const open: number = q.open ?? price;
    const change = price - open;
    const changePercent = open !== 0 ? (change / open) * 100 : 0;
    const today = new Date().toISOString().slice(0, 10);
    const isMarketOpen = q.date === today;
    console.log(`[Ticker] ${label}: price=${price}, date=${q.date}, open=${isMarketOpen}`);
    return {
      symbol: label, name: label, value: price, change, changePercent,
      isPositive: changePercent >= 0,
      formattedValue: formatValue(price, decimals),
      isMarketOpen,
    };
  } catch (err) {
    console.error(`[Ticker] ${label}: stooq error`, err);
    return placeholder(label);
  }
}

// api.frankfurter.app: free ECB forex rates, no API key required
async function fetchEurUsd(): Promise<TickerData> {
  try {
    const res = await fetch('https://api.frankfurter.app/latest?from=EUR&to=USD', {
      redirect: 'follow',
      cache: 'no-store',
    });
    if (!res.ok) {
      console.warn(`[Ticker] EUR/USD: frankfurter HTTP ${res.status}`);
      return placeholder('EUR/USD');
    }
    const json = await res.json();
    const price: number = json.rates?.USD ?? 0;
    if (!price) return placeholder('EUR/USD');
    console.log(`[Ticker] EUR/USD: price=${price}, date=${json.date}`);
    return {
      symbol: 'EUR/USD', name: 'EUR/USD', value: price,
      change: 0, changePercent: 0, isPositive: true,
      formattedValue: price.toFixed(4),
      isMarketOpen: false,
    };
  } catch (err) {
    console.error('[Ticker] EUR/USD: error', err);
    return placeholder('EUR/USD');
  }
}

// finnhub.io: reliable crypto data on free tier
async function fetchBtc(apiKey: string): Promise<TickerData> {
  try {
    const res = await fetch(
      `https://finnhub.io/api/v1/quote?symbol=BINANCE%3ABTCUSDT&token=${apiKey}`,
      { cache: 'no-store' },
    );
    if (!res.ok) return placeholder('BTC/USD');
    const d: { c?: number; d?: number; dp?: number; pc?: number } = await res.json();
    console.log('[Ticker] BTC/USD:', JSON.stringify(d));
    const isMarketOpen = typeof d.c === 'number' && d.c > 0;
    const price = isMarketOpen ? d.c! : (d.pc ?? 0);
    if (!price) return placeholder('BTC/USD');
    return {
      symbol: 'BTC/USD', name: 'BTC/USD', value: price,
      change: isMarketOpen ? (d.d ?? 0) : 0,
      changePercent: isMarketOpen ? (d.dp ?? 0) : 0,
      isPositive: (d.dp ?? 0) >= 0,
      formattedValue: formatValue(price, 0),
      isMarketOpen,
    };
  } catch (err) {
    console.error('[Ticker] BTC/USD: error', err);
    return placeholder('BTC/USD');
  }
}

export async function GET() {
  const finnhubKey = process.env.FINNHUB_API_KEY ?? '';

  const [dax, sp500, btc, eurusd] = await Promise.all([
    fetchStooq('DAX',     '^dax', 0),
    fetchStooq('S&P 500', '^spx', 0),
    finnhubKey ? fetchBtc(finnhubKey) : fetchStooq('BTC/USD', 'btc.f', 0),
    fetchEurUsd(),
  ]);

  return NextResponse.json({ tickers: [dax, sp500, btc, eurusd] });
}
