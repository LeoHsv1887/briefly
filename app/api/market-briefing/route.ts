import Anthropic from '@anthropic-ai/sdk';
import { NextResponse } from 'next/server';

export const revalidate = 1800;

interface QuoteResult {
  price: number;
  changePercent: number;
  isPositive: boolean;
  isMarketOpen: boolean;
}

async function fetchWithFallback(finnhubSymbol: string, yahooSymbol: string): Promise<QuoteResult> {
  // Try Finnhub first
  try {
    const url = `https://finnhub.io/api/v1/quote?symbol=${encodeURIComponent(finnhubSymbol)}&token=${process.env.FINNHUB_API_KEY}`;
    const res = await fetch(url, { next: { revalidate: 300 } });
    const data = await res.json();
    const price: number = data.c && data.c !== 0 ? data.c : (data.pc ?? 0);
    if (price > 0) {
      const changePercent: number = data.c && data.c !== 0 ? (data.dp ?? 0) : 0;
      return { price, changePercent, isPositive: changePercent >= 0, isMarketOpen: data.c > 0 };
    }
  } catch {}

  // Fallback: Yahoo Finance
  try {
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${yahooSymbol}?interval=1d&range=2d`;
    const res = await fetch(url, { next: { revalidate: 300 } });
    const data = await res.json();
    const meta = data?.chart?.result?.[0]?.meta;
    if (meta?.regularMarketPrice) {
      const price: number = meta.regularMarketPrice;
      const prevClose: number = meta.previousClose ?? meta.chartPreviousClose ?? 0;
      const changePercent = prevClose ? ((price - prevClose) / prevClose) * 100 : 0;
      return { price, changePercent, isPositive: changePercent >= 0, isMarketOpen: false };
    }
  } catch {}

  return { price: 0, changePercent: 0, isPositive: true, isMarketOpen: false };
}

export async function GET() {
  const symbols = [
    { key: 'dax',    finnhub: '^GDAXI',         yahoo: '%5EGDAXI', label: 'DAX' },
    { key: 'sp500',  finnhub: '^GSPC',           yahoo: '%5EGSPC',  label: 'S&P 500' },
    { key: 'nasdaq', finnhub: '^IXIC',           yahoo: '%5EIXIC',  label: 'Nasdaq' },
    { key: 'btc',    finnhub: 'BINANCE:BTCUSDT', yahoo: 'BTC-USD',  label: 'Bitcoin' },
    { key: 'eth',    finnhub: 'BINANCE:ETHUSDT', yahoo: 'ETH-USD',  label: 'Ethereum' },
    { key: 'gold',   finnhub: 'OANDA:XAU_USD',   yahoo: 'GC=F',     label: 'Gold' },
    { key: 'oil',    finnhub: 'OANDA:BCO_USD',    yahoo: 'BZ=F',     label: 'Öl' },
  ];

  const results = await Promise.allSettled(
    symbols.map(({ finnhub, yahoo }) => fetchWithFallback(finnhub, yahoo)),
  );

  const marketData = symbols.reduce<
    Record<string, { label: string; price: string; changePercent: string; isPositive: boolean; isMarketOpen: boolean }>
  >((acc, { key, label }, i) => {
    const result = results[i];
    if (result.status === 'fulfilled' && result.value.price > 0) {
      const { price, changePercent, isPositive, isMarketOpen } = result.value;
      acc[key] = {
        label,
        price: price.toLocaleString('de-DE', { maximumFractionDigits: 2 }),
        changePercent: changePercent.toFixed(2),
        isPositive,
        isMarketOpen,
      };
    }
    return acc;
  }, {});

  let headlines: string[] = [];
  try {
    const newsRes = await fetch(
      'https://news.google.com/rss/search?q=Aktienmarkt+DAX+Wall+Street+Börse+heute&hl=de&gl=DE&ceid=DE:de',
      { next: { revalidate: 900 } },
    );
    const xml = await newsRes.text();
    const matches = xml.match(/<title><!\[CDATA\[(.*?)\]\]><\/title>/g) ?? [];
    headlines = matches
      .map((m) => m.replace(/<title><!\[CDATA\[/, '').replace(/\]\]><\/title>/, ''))
      .filter((t) => !t.includes('Google News'))
      .slice(0, 8);
  } catch {}

  const today = new Date().toLocaleDateString('de-DE', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  const marketLines = Object.values(marketData)
    .map((d) => `- ${d.label}: ${d.price} (${d.isMarketOpen ? d.changePercent + '%' : 'Schluss: ' + d.changePercent + '%'})`)
    .join('\n');

  const headlineLines = headlines.map((h, i) => `${i + 1}. ${h}`).join('\n');

  const prompt = `Du bist ein erfahrener Finanzjournalist. Heute ist ${today}.

Marktdaten (teilweise Schlusskurse da Märkte aktuell geschlossen):
${marketLines || '(keine Daten verfügbar)'}

Aktuelle Schlagzeilen:
${headlineLines || '(keine Schlagzeilen verfügbar)'}

Schreibe ein Markt-Briefing auf Deutsch basierend auf den heutigen Schlusskursen und aktuellen Nachrichten. Erkläre konkret WAS heute passiert ist und WARUM – verknüpfe Kursbewegungen mit echten Ereignissen. Wenn Märkte gerade geschlossen sind, beziehe dich auf den heutigen Handelstag.

Antworte NUR als JSON ohne Markdown oder Codeblöcke:
{"summary":"2-3 Sätze Gesamtüberblick.","dax":"2 Sätze zu DAX und Europa mit konkretem Treiber.","usa":"2 Sätze zu S&P 500 und Nasdaq.","crypto":"2 Sätze zu Bitcoin und Krypto.","commodities":"2 Sätze zu Gold, Öl und Rohstoffen.","sentiment":"bullish"}`;

  let analysis = {
    summary: 'Das Briefing konnte heute nicht geladen werden.',
    dax: '',
    usa: '',
    crypto: '',
    commodities: '',
    sentiment: 'neutral' as 'bullish' | 'bearish' | 'neutral',
  };

  try {
    if (process.env.ANTHROPIC_API_KEY) {
      const anthropic = new Anthropic();
      const response = await anthropic.messages.create({
        model: 'claude-sonnet-4-6',
        max_tokens: 800,
        messages: [{ role: 'user', content: prompt }],
      });
      const text = response.content[0].type === 'text' ? response.content[0].text : '';
      const match = text.match(/\{[\s\S]*\}/);
      if (match) analysis = JSON.parse(match[0]);
    }
  } catch {}

  return NextResponse.json({ ...analysis, marketData, generatedAt: new Date().toISOString() });
}
