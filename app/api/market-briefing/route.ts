import Anthropic from '@anthropic-ai/sdk';
import { NextResponse } from 'next/server';

export const revalidate = 1800;

export async function GET() {
  const symbols = [
    { key: 'dax', symbol: '^GDAXI', label: 'DAX' },
    { key: 'sp500', symbol: '^GSPC', label: 'S&P 500' },
    { key: 'nasdaq', symbol: '^IXIC', label: 'Nasdaq' },
    { key: 'btc', symbol: 'BINANCE:BTCUSDT', label: 'Bitcoin' },
    { key: 'eth', symbol: 'BINANCE:ETHUSDT', label: 'Ethereum' },
    { key: 'gold', symbol: 'OANDA:XAU_USD', label: 'Gold' },
    { key: 'oil', symbol: 'OANDA:BCO_USD', label: 'Öl (Brent)' },
  ];

  const results = await Promise.allSettled(
    symbols.map(({ symbol }) =>
      fetch(
        `https://finnhub.io/api/v1/quote?symbol=${encodeURIComponent(symbol)}&token=${process.env.FINNHUB_API_KEY}`,
        { next: { revalidate: 300 } },
      ).then((r) => r.json()),
    ),
  );

  const marketData = symbols.reduce<
    Record<string, { label: string; price: string; changePercent: string; isPositive: boolean }>
  >((acc, { key, label }, i) => {
    const result = results[i];
    if (result.status === 'fulfilled' && result.value?.c) {
      const data = result.value;
      const price: number = data.c ?? 0;
      const changePercent: number = data.dp ?? 0;
      acc[key] = {
        label,
        price: price.toLocaleString('de-DE', { maximumFractionDigits: 2 }),
        changePercent: changePercent.toFixed(2),
        isPositive: changePercent >= 0,
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
    .map((d) => `- ${d.label}: ${d.price} (${d.changePercent}%)`)
    .join('\n');

  const headlineLines = headlines.map((h, i) => `${i + 1}. ${h}`).join('\n');

  const prompt = `Du bist ein erfahrener Finanzjournalist. Heute ist ${today}.

Heutige Marktdaten:
${marketLines || '(keine Daten verfügbar)'}

Aktuelle Schlagzeilen:
${headlineLines || '(keine Schlagzeilen verfügbar)'}

Schreibe ein prägnantes Markt-Briefing auf Deutsch. Erkläre konkret WAS passiert ist und WARUM – verknüpfe Kursbewegungen mit echten Ereignissen (Notenbankentscheidungen, Geopolitik, Unternehmensberichte etc.). Keine Floskeln, kein Finanzjargon.

Antworte NUR als JSON ohne Markdown oder Codeblöcke:
{"summary":"2-3 Sätze Gesamtüberblick.","dax":"2 Sätze zu DAX und Europa.","usa":"2 Sätze zu S&P 500 und Nasdaq.","crypto":"2 Sätze zu Bitcoin und Krypto.","commodities":"2 Sätze zu Gold, Öl und Rohstoffen.","sentiment":"bullish"}`;

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
