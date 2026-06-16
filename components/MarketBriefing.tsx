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

const SENTIMENT = {
  bullish: { label: 'Bullish', bg: '#1a2a1e', color: '#22c47a' },
  bearish: { label: 'Bearish', bg: '#2a1a1a', color: '#e05a4b' },
  neutral: { label: 'Neutral', bg: '#1e1e1e', color: '#888888' },
};

const SECTIONS = [
  { key: 'dax', icon: '🇩🇪', title: 'DAX & Europa', marketKey: 'dax' },
  { key: 'usa', icon: '🇺🇸', title: 'USA & Nasdaq', marketKey: 'nasdaq' },
  { key: 'crypto', icon: '₿', title: 'Krypto', marketKey: 'btc' },
  { key: 'commodities', icon: '🛢️', title: 'Rohstoffe', marketKey: 'gold' },
] as const;

export function MarketBriefing() {
  const [briefing, setBriefing] = useState<BriefingData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    load();
  }, []);

  async function load() {
    setIsLoading(true);
    try {
      const res = await fetch('/api/market-briefing');
      const data = await res.json();
      setBriefing(data);
    } catch {}
    setIsLoading(false);
  }

  if (isLoading) return <BriefingSkeleton />;
  if (!briefing) return null;

  const sentiment = SENTIMENT[briefing.sentiment] ?? SENTIMENT.neutral;
  const time = new Date(briefing.generatedAt).toLocaleTimeString('de-DE', {
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <div style={{ marginBottom: 4 }}>
      {/* Header card */}
      <div
        style={{
          margin: '12px 14px 0',
          background: '#161616',
          border: '0.5px solid #222',
          borderRadius: 14,
          padding: '13px 14px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 9 }}>
          <div
            style={{
              width: 6,
              height: 6,
              borderRadius: '50%',
              background: '#22c47a',
              boxShadow: '0 0 5px #22c47a88',
              flexShrink: 0,
            }}
          />
          <span
            style={{
              fontSize: 11,
              fontWeight: 500,
              color: '#c48a2a',
              letterSpacing: '0.06em',
              textTransform: 'uppercase',
              flex: 1,
            }}
          >
            Was ist heute passiert?
          </span>
          <span
            style={{
              fontSize: 10,
              fontWeight: 500,
              padding: '2px 8px',
              borderRadius: 7,
              background: sentiment.bg,
              color: sentiment.color,
            }}
          >
            {sentiment.label}
          </span>
          <span style={{ fontSize: 10, color: '#2e2e2e', marginLeft: 4 }}>{time}</span>
          <button
            onClick={load}
            style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: 0, marginLeft: 4 }}
            aria-label="Briefing aktualisieren"
          >
            <RefreshCw size={12} color="#333" />
          </button>
        </div>
        <p style={{ fontSize: 13, color: '#a8a8a8', lineHeight: 1.65 }}>{briefing.summary}</p>
      </div>

      {/* Market ticker */}
      {Object.keys(briefing.marketData).length > 0 && (
        <div
          style={{
            display: 'flex',
            gap: 6,
            padding: '10px 14px 0',
            overflowX: 'auto',
            scrollbarWidth: 'none',
          }}
        >
          {Object.values(briefing.marketData).map((m) => (
            <div
              key={m.label}
              style={{
                background: '#161616',
                border: '0.5px solid #1e1e1e',
                borderRadius: 9,
                padding: '8px 10px',
                flexShrink: 0,
                minWidth: 62,
              }}
            >
              <div style={{ fontSize: 10, color: '#3a3a3a', marginBottom: 2 }}>{m.label}</div>
              <div style={{ fontSize: 12, fontWeight: 500, color: m.isMarketOpen ? '#d0d0d0' : '#888' }}>
                {m.price}
              </div>
              <div
                style={{
                  fontSize: 10,
                  marginTop: 1,
                  color: m.isMarketOpen
                    ? m.isPositive ? '#22c47a' : '#e05a4b'
                    : m.isPositive ? '#1a6b42' : '#7a2d26',
                }}
              >
                {m.isMarketOpen ? (m.isPositive ? '+' : '') + m.changePercent + '%' : 'Schluss'}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Detail tiles 2×2 */}
      <div
        style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, padding: '10px 14px 0' }}
      >
        {SECTIONS.map(({ key, icon, title, marketKey }) => {
          const market = briefing.marketData[marketKey];
          const isPositive = market?.isPositive ?? true;
          const text = briefing[key as keyof BriefingData] as string;
          if (!text) return null;
          return (
            <div
              key={key}
              style={{
                background: '#161616',
                border: '0.5px solid #1e1e1e',
                borderRadius: 12,
                padding: '11px 12px',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  marginBottom: 6,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                  <span style={{ fontSize: 13 }}>{icon}</span>
                  <span style={{ fontSize: 11, fontWeight: 500, color: '#888' }}>{title}</span>
                </div>
                {market && (
                  <span
                    style={{
                      fontSize: 11,
                      fontWeight: 500,
                      color: isPositive ? '#22c47a' : '#e05a4b',
                    }}
                  >
                    {isPositive ? '+' : ''}
                    {market.changePercent}%
                  </span>
                )}
              </div>
              <p style={{ fontSize: 11, color: '#555', lineHeight: 1.55 }}>{text}</p>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function BriefingSkeleton() {
  return (
    <div
      style={{
        margin: '12px 14px 0',
        background: '#161616',
        border: '0.5px solid #222',
        borderRadius: 14,
        padding: '13px 14px',
      }}
      className="animate-pulse"
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 12 }}>
        <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#1e1e1e' }} />
        <div style={{ width: 140, height: 10, background: '#1e1e1e', borderRadius: 4 }} />
        <div
          style={{ width: 60, height: 16, background: '#1e1e1e', borderRadius: 7, marginLeft: 'auto' }}
        />
      </div>
      {[100, 90, 95, 70].map((w, i) => (
        <div
          key={i}
          style={{
            width: `${w}%`,
            height: 10,
            background: '#1e1e1e',
            borderRadius: 4,
            marginBottom: i < 3 ? 8 : 0,
          }}
        />
      ))}
    </div>
  );
}
