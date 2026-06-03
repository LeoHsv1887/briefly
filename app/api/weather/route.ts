import { NextResponse } from 'next/server';
import type { WeatherData } from '@/lib/types';

export const revalidate = 3600;

const LAT = 51.9427;
const LON = 7.9827;

export async function GET() {
  try {
    const url =
      `https://api.open-meteo.com/v1/forecast` +
      `?latitude=${LAT}&longitude=${LON}` +
      `&current=temperature_2m,relative_humidity_2m,apparent_temperature,precipitation,weather_code,wind_speed_10m` +
      `&daily=temperature_2m_max,temperature_2m_min` +
      `&timezone=Europe%2FBerlin&forecast_days=1`;

    const res = await fetch(url, { next: { revalidate: 3600 } });
    if (!res.ok) throw new Error(`Open-Meteo ${res.status}`);

    const data = await res.json();
    const c = data.current ?? {};
    const d = data.daily ?? {};

    const weather: WeatherData = {
      temperature: Math.round(c.temperature_2m ?? 0),
      feelsLike: Math.round(c.apparent_temperature ?? 0),
      weatherCode: c.weather_code ?? 0,
      windSpeed: Math.round(c.wind_speed_10m ?? 0),
      humidity: Math.round(c.relative_humidity_2m ?? 0),
      tempMax: Math.round((d.temperature_2m_max ?? [0])[0] ?? 0),
      tempMin: Math.round((d.temperature_2m_min ?? [0])[0] ?? 0),
    };

    return NextResponse.json({ weather });
  } catch (err) {
    console.error('Weather fetch error:', err);
    return NextResponse.json({ weather: null, error: 'Weather unavailable' });
  }
}
