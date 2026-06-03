'use client';

import { TrendingDown, TrendingUp } from 'lucide-react';
import type { TickerData } from '@/lib/types';

interface TickerBarProps {
  tickers: TickerData[];
}

export default function TickerBar({ tickers }: TickerBarProps) {
  if (!tickers.length) return null;

  return (
    <div className="flex gap-2 overflow-x-auto px-4 py-3 no-scrollbar border-b border-[#1e1e1e]">
      {tickers.map((t) => (
        <div
          key={t.symbol}
          className="flex-shrink-0 bg-[#161616] border border-[#222] rounded-xl px-3 py-2 min-w-[105px]"
        >
          <p className="text-[10px] text-[#555] font-medium uppercase tracking-wider mb-0.5">
            {t.symbol}
          </p>
          <p className="text-[15px] font-semibold text-[#e8e8e8] tabular-nums leading-none">
            {t.formattedValue}
          </p>
          {t.isMarketOpen ? (
            <div
              className="flex items-center gap-1 mt-1"
              style={{ color: t.isPositive ? '#22c47a' : '#e05a4b' }}
            >
              {t.isPositive ? (
                <TrendingUp size={11} strokeWidth={2} />
              ) : (
                <TrendingDown size={11} strokeWidth={2} />
              )}
              <span className="text-[11px] font-medium tabular-nums">
                {t.isPositive ? '+' : ''}
                {t.changePercent.toFixed(2)}%
              </span>
            </div>
          ) : (
            <p className="text-[10px] mt-1" style={{ color: '#3a3a3a' }}>
              Schluss
            </p>
          )}
        </div>
      ))}
    </div>
  );
}
