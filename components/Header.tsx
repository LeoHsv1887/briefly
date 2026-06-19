'use client';

import { useEffect, useState } from 'react';
import { Sun, Cloud, CloudSun, CloudFog, CloudDrizzle, CloudRain, CloudSnow, CloudLightning } from 'lucide-react';
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

interface WeatherInfo {
  city: string;
  temp: number;
  label: string;
  weatherCode: number;
}

function getWeatherIcon(code: number) {
  if (code === 0) return Sun;
  if (code <= 2) return CloudSun;
  if (code === 3) return Cloud;
  if (code <= 49) return CloudFog;
  if (code <= 59) return CloudDrizzle;
  if (code <= 69) return CloudRain;
  if (code <= 79) return CloudSnow;
  return CloudLightning;
}

export default function Header({ dax, articleCount, settings }: HeaderProps) {
  const [date, setDate] = useState('');
  const [hour, setHour] = useState(new Date().getHours());
  const [weather, setWeather] = useState<WeatherInfo | null>(null);

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

  useEffect(() => {
    if (!navigator.geolocation) {
      fetch('/api/weather').then(r => r.json()).then(d => { if (!d.error) setWeather(d) }).catch(() => {});
      return;
    }
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const res = await fetch(`/api/weather?lat=${pos.coords.latitude}&lon=${pos.coords.longitude}`);
          const data = await res.json();
          if (!data.error) setWeather(data);
        } catch {}
      },
      () => {
        fetch('/api/weather').then(r => r.json()).then(d => { if (!d.error) setWeather(d) }).catch(() => {});
      }
    );
  }, []);

  const greeting  = getGreeting(hour);
  const firstName = settings.username.split(' ')[0];
  const daxChange = dax && dax.formattedValue !== '—' ? `${dax.isPositive ? '+' : ''}${dax.changePercent.toFixed(2)}%` : null;
  const daxPositive = dax?.isPositive ?? true;

  const chipStyle: React.CSSProperties = {
    display: 'flex', alignItems: 'center', gap: 5,
    fontSize: 12, color: '#ffffff',
    background: 'var(--bg1)', border: '0.5px solid var(--border)',
    borderRadius: 20, padding: '6px 12px',
    flexShrink: 0,
  };

  return (
    <div style={{ padding: '22px 22px 0' }}>
      <div style={{ fontSize: 10, fontWeight: 600, color: 'var(--t4)', letterSpacing: '0.14em', textTransform: 'uppercase', marginBottom: 20 }}>
        Briefly
      </div>
      <div style={{ fontSize: 30, fontWeight: 500, color: '#ffffff', lineHeight: 1.2, letterSpacing: '-0.02em', marginBottom: 5 }}>
        {greeting},<br />{firstName}.
      </div>
      <div style={{ fontSize: 10, color: 'var(--t4)', letterSpacing: '0.01em', marginBottom: 14 }}>{date}</div>

      {/* All chips in one row */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, paddingBottom: 18, flexWrap: 'wrap' }}>
        {weather && (() => {
          const WeatherIcon = getWeatherIcon(weather.weatherCode);
          return (
            <div style={chipStyle}>
              <WeatherIcon size={13} strokeWidth={1.5} />
              <span>{weather.temp}°C · {weather.city}</span>
            </div>
          );
        })()}
        <div style={chipStyle}>
          <span className="live-dot" />
          {articleCount} neue Artikel
        </div>
        {daxChange && (
          <div style={chipStyle}>
            DAX
            <span style={{ color: daxPositive ? 'var(--up)' : 'var(--dn)', fontWeight: 600, marginLeft: 2 }}>
              {daxChange}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
