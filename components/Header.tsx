'use client';

import { useEffect, useState } from 'react';
import { Moon, Sparkles, Sun, Sunrise, Star } from 'lucide-react';
import type { TickerData } from '@/lib/types';
import type { Settings } from '@/lib/types';

interface HeaderProps {
  dax?: TickerData;
  articleCount: number;
  settings: Settings;
}

function getTimeContext(hour: number) {
  if (hour >= 5 && hour < 11)
    return { greeting: 'Guten Morgen', Icon: Sunrise, color: '#c48a2a', period: 'morning' };
  if (hour >= 11 && hour < 18)
    return { greeting: 'Guten Tag', Icon: Sun, color: '#c48a2a', period: 'day' };
  if (hour >= 18 && hour < 23)
    return { greeting: 'Guten Abend', Icon: Moon, color: '#7b7fe0', period: 'evening' };
  return { greeting: 'Gute Nacht', Icon: Star, color: '#7b7fe0', period: 'night' };
}

function getStatusLine(period: string, count: number, dax?: TickerData) {
  const daxEl = dax && dax.formattedValue !== '—' ? (
    <span style={{ color: dax.isPositive ? '#22c47a' : '#e05a4b' }}>
      {' '}· DAX {dax.isPositive ? '+' : ''}{dax.changePercent.toFixed(2)}%
    </span>
  ) : null;

  if (period === 'morning')
    return (
      <>
        {count} neue Artikel warten auf dich{daxEl}
      </>
    );
  if (period === 'day')
    return (
      <>
        {count} neue Artikel seit deinem letzten Besuch{daxEl}
      </>
    );
  if (period === 'evening')
    return (
      <>
        Das war der heutige Tag · {count} Top-Storys zur Zusammenfassung
      </>
    );
  return <>Gute Nacht · {count} Artikel warten auf dich</>;
}

export default function Header({ dax, articleCount, settings }: HeaderProps) {
  const [time, setTime] = useState('');
  const [date, setDate] = useState('');
  const [hour, setHour] = useState(new Date().getHours());

  useEffect(() => {
    const update = () => {
      const now = new Date();
      setHour(now.getHours());
      setTime(now.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' }));
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

  const { greeting, Icon, color, period } = getTimeContext(hour);

  return (
    <header className="px-4 pt-6 pb-4 border-b border-[#1e1e1e]">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-[22px] font-semibold text-[#e8e8e8] leading-tight tracking-tight">
            {greeting},
            <br />
            {settings.username}.
          </h1>
          <p className="text-[13px] text-[#888] mt-1">{date}</p>
        </div>
        <div className="flex flex-col items-end gap-1 pt-1">
          <span className="text-xl font-semibold text-[#e8e8e8] tabular-nums">{time}</span>
          <Icon size={18} style={{ color }} strokeWidth={1.8} />
        </div>
      </div>
      <div className="flex items-center gap-1.5 mt-3">
        <Sparkles size={12} color="#555" strokeWidth={1.5} />
        <p className="text-[12px] text-[#555]">{getStatusLine(period, articleCount, dax)}</p>
      </div>
    </header>
  );
}
