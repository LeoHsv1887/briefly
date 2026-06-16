'use client';

import type { TickerData } from '@/lib/types';

interface TickerBarProps {
  tickers: TickerData[];
}

export default function TickerBar({ tickers }: TickerBarProps) {
  if (!tickers.length) return null;

  return (
    <div
      style={{
        display: 'flex',
        borderTop: '0.5px solid #111',
        borderBottom: '0.5px solid #111',
      }}
    >
      {tickers.map((t, i) => (
        <div
          key={t.symbol}
          style={{
            flex: 1,
            padding: '10px 14px',
            borderRight: i < tickers.length - 1 ? '0.5px solid #111' : 'none',
            minWidth: 0,
          }}
        >
          <div
            style={{
              fontSize: 9,
              color: '#2a2a2a',
              fontWeight: 500,
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
              marginBottom: 3,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {t.label}
          </div>
          <div
            style={{
              fontSize: 13,
              fontWeight: 400,
              color: '#d8d4cc',
              letterSpacing: '-0.01em',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {t.formattedValue}
          </div>
          {t.isMarketOpen ? (
            <div
              style={{
                fontSize: 10,
                fontWeight: 500,
                marginTop: 1,
                color: t.isPositive ? '#4a9e6a' : '#9e4a4a',
              }}
            >
              {t.isPositive ? '+' : ''}
              {t.changePercent.toFixed(2)}%
            </div>
          ) : (
            <div
              style={{
                fontSize: 9,
                marginTop: 1,
                color: '#2a2a2a',
              }}
            >
              Schluss
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
