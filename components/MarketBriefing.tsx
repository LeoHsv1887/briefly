'use client';

import { useEffect, useState } from 'react';
import { ArrowRight, TrendingDown, TrendingUp } from 'lucide-react';

// Compact inline card for the feed
export function MarketBriefingCard({ onPress }: { onPress?: () => void }) {
  const [briefing, setBriefing] = useState<BriefingData | null>(null);

  useEffect(() => {
    fetch('/api/market-briefing')
      .then(r => r.json())
      .then(data => setBriefing(data))
      .catch(() => {});
  }, []);

  if (!briefing) return null;

  const sentiment = briefing.sentiment ?? 'neutral';
  const sentimentColor =
    sentiment === 'bullish' ? '#4a9e6a' :
    sentiment === 'bearish' ? '#9e4a4a' : '#444';
  const sentimentBg =
    sentiment === 'bullish' ? '#0a1a0e' :
    sentiment === 'bearish' ? '#1a0a0a' : '#111';
  const sentimentLabel =
    sentiment === 'bullish' ? 'Bullish' :
    sentiment === 'bearish' ? 'Bearish' : 'Neutral';

  return (
    <div
      onClick={onPress}
      style={{ margin: '16px 18px 0', background: 'var(--bg1)', border: '0.5px solid var(--border)', borderRadius: 18, overflow: 'hidden', cursor: onPress ? 'pointer' : 'default' }}
    >
      <div style={{ display: 'flex', alignItems: 'stretch' }}>

        {/* Linker Sentiment-Balken */}
        <div style={{
          width: 56, background: sentimentBg,
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
          padding: '16px 0', flexShrink: 0, borderRight: '0.5px solid var(--border)',
        }}>
          {sentiment === 'bearish'
            ? <TrendingDown size={18} color={sentimentColor} style={{ marginBottom: 6 }} />
            : <TrendingUp   size={18} color={sentimentColor} style={{ marginBottom: 6 }} />
          }
          <span style={{ fontSize: 8, fontWeight: 600, color: sentimentColor, letterSpacing: '0.06em', textTransform: 'uppercase' }}>
            {sentimentLabel}
          </span>
        </div>

        {/* Rechter Textbereich */}
        <div style={{ flex: 1, padding: '13px 14px' }}>
          <div style={{ fontSize: 9, fontWeight: 700, color: 'var(--t4)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 6 }}>
            Markteinschätzung
          </div>
          <div style={{ fontSize: 12, color: 'var(--t3)', lineHeight: 1.6, marginBottom: 10 }}>
            {briefing.summary}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 10, color: 'var(--t4)' }}>
            <ArrowRight size={11} />
            Vollständiger Bericht
          </div>
        </div>

      </div>
    </div>
  );
}

interface MarketEntry {
  label: string;
  price: string;
  changePercent: string;
  isPositive: boolean;
  isMarketOpen: boolean;
}

interface BriefingData {
  summary: string;
  dax: string;
  usa: string;
  crypto: string;
  commodities: string;
  sentiment: 'bullish' | 'bearish' | 'neutral';
  marketData: Record<string, MarketEntry>;
  generatedAt: string;
}

const INDICES = [
  { key: 'dax',        label: 'DAX & Europa',  region: 'Deutschland · Europa' },
  { key: 'nasdaq',     label: 'Nasdaq & USA',   region: 'Vereinigte Staaten'  },
  { key: 'btc',        label: 'Bitcoin',         region: 'Kryptowährung'       },
  { key: 'gold',       label: 'Gold',            region: 'Rohstoff'            },
] as const;

export function MarketBriefing() {
  const [briefing, setBriefing] = useState<BriefingData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => { load(); }, []);

  async function load() {
    setIsLoading(true);
    try {
      const res = await fetch('/api/market-briefing');
      setBriefing(await res.json());
    } catch {}
    setIsLoading(false);
  }

  if (isLoading) return <BriefingSkeleton />;
  if (!briefing) return null;

  const indices = INDICES.map(i => ({ ...i, data: briefing.marketData[i.key] })).filter(i => i.data);

  return (
    <div>
      {/* Indizes */}
      <div style={{ fontSize: 9, fontWeight: 500, color: '#1e1e1e', letterSpacing: '0.1em', textTransform: 'uppercase', padding: '16px 18px 8px' }}>
        Indizes
      </div>
      <div style={{ margin: '0 18px', background: 'var(--bg1)', border: '0.5px solid var(--border)', borderRadius: 18, overflow: 'hidden' }}>
        {indices.map(({ key, label, region, data }, i) => (
          <div
            key={key}
            style={{ display: 'flex', alignItems: 'center', padding: '10px 13px', borderBottom: i < indices.length - 1 ? '0.5px solid var(--border)' : 'none' }}
          >
            <div style={{ width: 28, height: 28, borderRadius: 7, background: 'var(--bg2)', border: '0.5px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginRight: 10, flexShrink: 0 }}>
              <TrendingUp size={13} color="var(--t4)" />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 11, color: 'var(--t2)', fontWeight: 300 }}>{label}</div>
              <div style={{ fontSize: 9, color: 'var(--t4)', marginTop: 1 }}>{region}</div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: 12, fontWeight: 300, color: 'var(--t1)' }}>{data.price}</div>
              <div style={{ fontSize: 9, fontWeight: 500, marginTop: 1, color: data.isPositive ? 'var(--up)' : 'var(--dn)' }}>
                {data.isPositive ? '+' : ''}{data.changePercent}%
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Markteinschätzung */}
      <div style={{ margin: '10px 18px 0', background: 'var(--bg1)', border: '0.5px solid var(--border)', borderRadius: 16, padding: '12px 13px' }}>
        <div style={{ fontSize: 8, color: 'var(--t4)', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 5 }}>
          Markteinschätzung heute
        </div>
        <div style={{ fontSize: 11, color: 'var(--t3)', lineHeight: 1.5 }}>
          {briefing.summary}
        </div>
      </div>
    </div>
  );
}

function BriefingSkeleton() {
  return (
    <div style={{ padding: '16px 18px 0' }}>
      <div style={{ height: 9, background: '#0e0e0e', borderRadius: 4, width: 60, marginBottom: 12 }} />
      <div style={{ background: '#0e0e0e', borderRadius: 18, overflow: 'hidden' }}>
        {[0, 1, 2, 3].map(i => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', padding: '10px 13px', borderBottom: i < 3 ? '0.5px solid #0a0a0a' : 'none', gap: 10 }}>
            <div style={{ width: 28, height: 28, borderRadius: 7, background: '#141414' }} />
            <div style={{ flex: 1 }}>
              <div style={{ height: 9, background: '#141414', borderRadius: 4, width: '55%', marginBottom: 5 }} />
              <div style={{ height: 7, background: '#141414', borderRadius: 4, width: '35%' }} />
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ height: 10, background: '#141414', borderRadius: 4, width: 50, marginBottom: 4 }} />
              <div style={{ height: 8, background: '#141414', borderRadius: 4, width: 30 }} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
