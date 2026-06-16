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
      setDate(
        now.toLocaleDateString('de-DE', {
          weekday: 'long',
          day: 'numeric',
          month: 'long',
          year: 'numeric',
        }),
      );
    };
    update();
    const interval = setInterval(update, 60_000);
    return () => clearInterval(interval);
  }, []);

  const greeting = getGreeting(hour);
  const firstName = settings.username.split(' ')[0];
  const daxChange = dax && dax.formattedValue !== '—'
    ? `${dax.isPositive ? '+' : ''}${dax.changePercent.toFixed(2)}%`
    : null;
  const daxPositive = dax?.isPositive ?? true;

  return (
    <div style={{ padding: '22px 22px 0' }}>
      <div
        style={{
          fontFamily: "'Playfair Display', serif",
          fontSize: 12,
          fontWeight: 400,
          color: '#2a2a2a',
          letterSpacing: '0.12em',
          textTransform: 'uppercase',
          marginBottom: 22,
        }}
      >
        Briefly
      </div>
      <div
        style={{
          fontFamily: "'Playfair Display', serif",
          fontSize: 28,
          fontWeight: 400,
          color: 'var(--text-primary)',
          lineHeight: 1.15,
          marginBottom: 5,
        }}
      >
        {greeting},<br />
        {firstName}.
      </div>
      <div style={{ fontSize: 11, color: '#2e2e2e', letterSpacing: '0.03em' }}>{date}</div>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          marginTop: 14,
          paddingBottom: 18,
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 5,
            fontSize: 10,
            color: '#3a3a3a',
            background: '#101010',
            border: '0.5px solid #1c1c1c',
            borderRadius: 20,
            padding: '5px 11px',
          }}
        >
          ✦ {articleCount} neue Artikel
        </div>
        {daxChange && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 5,
              fontSize: 10,
              color: '#3a3a3a',
              background: '#101010',
              border: '0.5px solid #1c1c1c',
              borderRadius: 20,
              padding: '5px 11px',
            }}
          >
            DAX{' '}
            <span
              style={{
                color: daxPositive ? '#4a9e6a' : '#9e4a4a',
                marginLeft: 4,
                fontWeight: 500,
              }}
            >
              {daxChange}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
