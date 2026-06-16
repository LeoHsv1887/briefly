'use client';

import { useEffect, useState } from 'react';
import { ChevronRight, RefreshCw, TrendingUp } from 'lucide-react';

// Compact inline card for the feed
export function MarketBriefingCard() {
  const [briefing, setBriefing] = useState<BriefingData | null>(null);

  useEffect(() => {
    fetch('/api/market-briefing')
      .then(r => r.json())
      .then(data => setBriefing(data))
      .catch(() => {});
  }, []);

  if (!briefing) return null;

  const dax = briefing.marketData['dax'];
  const daxChange = dax
    ? `${dax.isPositive ? '+' : ''}${dax.changePercent}%`
    : null;

  return (
    <div
      style={{
        margin: '18px 18px 0',
        background: 'var(--bg-card)',
        border: '0.5px solid #141414',
        borderRadius: 16,
        padding: '13px 15px',
        display: 'flex',
        alignItems: 'center',
        gap: 12,
      }}
    >
      <div
        style={{
          width: 32,
          height: 32,
          borderRadius: 9,
          background: '#0a0a0a',
          border: '0.5px solid #161616',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
        }}
      >
        <TrendingUp size={15} color="#2a2a2a" />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            fontSize: 9,
            color: '#2a2a2a',
            fontWeight: 500,
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
            marginBottom: 3,
          }}
        >
          Markteinschätzung
        </div>
        <div
          style={{
            fontSize: 12,
            color: '#585450',
            lineHeight: 1.4,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {daxChange && (
            <>
              DAX{' '}
              <span
                style={{
                  color: dax?.isPositive ? '#4a9e6a' : '#9e4a4a',
                  fontWeight: 500,
                }}
              >
                {daxChange}
              </span>{' '}
              —{' '}
            </>
          )}
          {briefing.summary}
        </div>
      </div>
      <ChevronRight size={15} color="#1c1c1c" style={{ flexShrink: 0 }} />
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
      <div style={{ margin: '0 18px', background: 'var(--bg-card)', border: '0.5px solid #141414', borderRadius: 18, overflow: 'hidden' }}>
        {indices.map(({ key, label, region, data }, i) => (
          <div
            key={key}
            style={{ display: 'flex', alignItems: 'center', padding: '10px 13px', borderBottom: i < indices.length - 1 ? '0.5px solid #0a0a0a' : 'none' }}
          >
            <div style={{ width: 28, height: 28, borderRadius: 7, background: '#0a0a0a', border: '0.5px solid #141414', display: 'flex', alignItems: 'center', justifyContent: 'center', marginRight: 10, flexShrink: 0 }}>
              <TrendingUp size={13} color="#1e1e1e" />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 11, color: '#c0c0b8', fontWeight: 400 }}>{label}</div>
              <div style={{ fontSize: 9, color: '#2a2a2a', marginTop: 1 }}>{region}</div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: 12, fontWeight: 400, color: '#d8d4cc' }}>{data.price}</div>
              <div style={{ fontSize: 9, fontWeight: 500, marginTop: 1, color: data.isPositive ? '#4a9e6a' : '#9e4a4a' }}>
                {data.isPositive ? '+' : ''}{data.changePercent}%
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Markteinschätzung */}
      <div style={{ margin: '10px 18px 0', background: 'var(--bg-card)', border: '0.5px solid #141414', borderRadius: 16, padding: '12px 13px' }}>
        <div style={{ fontSize: 8, color: '#222', fontWeight: 500, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 5 }}>
          Markteinschätzung heute
        </div>
        <div style={{ fontSize: 11, color: '#585450', lineHeight: 1.5 }}>
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
