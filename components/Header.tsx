'use client';

import { useEffect, useState } from 'react';
import type { TickerData, Settings } from '@/lib/types';

interface HeaderProps {
  dax?: TickerData;
  articleCount: number;
  settings: Settings;
}

function getGreeting(hour: number): string {
  if (hour >= 5 && hour < 12) return 'Guten Morgen';
  if (hour >= 12 && hour < 18) return 'Guten Tag';
  if (hour >= 18 && hour < 23) return 'Guten Abend';
  return 'Gute Nacht';
}

export default function Header({ dax, articleCount, settings }: HeaderProps) {
  const [date, setDate] = useState('');
  const [hour, setHour] = useState(new Date().getHours());

  useEffect(() => {
    const update = () => {
      const now = new Date();
      setHour(now.getHours());
      setDate(now.toLocaleDateString('de-DE', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }));
    };
    update();
    const interval = setInterval(update, 60_000);
    return () => clearInterval(interval);
  }, []);

  const greeting   = getGreeting(hour);
  const firstName  = settings.username.split(' ')[0];
  const daxChange  = dax && dax.formattedValue !== '—' ? `${dax.isPositive ? '+' : ''}${dax.changePercent.toFixed(2)}%` : null;
  const daxPositive = dax?.isPositive ?? true;

  const chipStyle: React.CSSProperties = {
    display: 'flex', alignItems: 'center', gap: 5,
    fontSize: 10, color: 'var(--t3)',
    background: 'var(--bg1)', border: '0.5px solid var(--border)',
    borderRadius: 20, padding: '4px 10px',
  };

  return (
    <div style={{ padding: '22px 22px 0' }}>
      <div style={{ fontSize: 10, fontWeight: 600, color: 'var(--t4)', letterSpacing: '0.14em', textTransform: 'uppercase', marginBottom: 20 }}>
        Briefly
      </div>
      <div style={{ fontSize: 26, fontWeight: 200, color: 'var(--t1)', lineHeight: 1.2, letterSpacing: '-0.03em', marginBottom: 5 }}>
        {greeting},<br />{firstName}.
      </div>
      <div style={{ fontSize: 10, color: 'var(--t4)', letterSpacing: '0.01em', marginBottom: 14 }}>{date}</div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, paddingBottom: 18 }}>
        <div style={chipStyle}>
          <span className="live-dot" />
          {articleCount} neue Artikel
        </div>
        {daxChange && (
          <div style={chipStyle}>
            DAX
            <span style={{ color: daxPositive ? 'var(--up)' : 'var(--dn)', fontWeight: 500 }}>
              {daxChange}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
