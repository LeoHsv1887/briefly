'use client';

import {
  Cloud,
  CloudDrizzle,
  CloudFog,
  CloudLightning,
  CloudRain,
  CloudSnow,
  CloudSun,
  Droplets,
  Sun,
  Wind,
} from 'lucide-react';
import type { WeatherData } from '@/lib/types';
import type { LucideIcon } from 'lucide-react';

interface WeatherWidgetProps {
  weather: WeatherData | null;
}

function getWeatherInfo(code: number): { Icon: LucideIcon; label: string } {
  if (code === 0) return { Icon: Sun, label: 'Sonnig' };
  if (code <= 2) return { Icon: CloudSun, label: 'Teilweise bewölkt' };
  if (code === 3) return { Icon: Cloud, label: 'Bewölkt' };
  if (code <= 48) return { Icon: CloudFog, label: 'Neblig' };
  if (code <= 55) return { Icon: CloudDrizzle, label: 'Nieselregen' };
  if (code <= 65) return { Icon: CloudRain, label: 'Regen' };
  if (code <= 77) return { Icon: CloudSnow, label: 'Schnee' };
  if (code <= 82) return { Icon: CloudRain, label: 'Regenschauer' };
  if (code <= 86) return { Icon: CloudSnow, label: 'Schneeschauer' };
  return { Icon: CloudLightning, label: 'Gewitter' };
}

export default function WeatherWidget({ weather }: WeatherWidgetProps) {
  if (!weather) return null;

  const { Icon, label } = getWeatherInfo(weather.weatherCode);

  return (
    <div className="mx-4 my-3 bg-[#161616] border border-[#222] rounded-xl px-4 py-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Icon size={28} color="#888" strokeWidth={1.5} />
          <div>
            <div className="flex items-baseline gap-1.5">
              <span className="text-2xl font-semibold text-[#e8e8e8]">{weather.temperature}°</span>
              <span className="text-sm text-[#888]">{label}</span>
            </div>
            <p className="text-[12px] text-[#555] mt-0.5">
              Fühlt sich an wie {weather.feelsLike}° · {weather.tempMin}° / {weather.tempMax}°
            </p>
          </div>
        </div>
        <div className="flex flex-col items-end gap-1.5">
          <div className="flex items-center gap-1 text-[#666]">
            <Droplets size={13} strokeWidth={1.5} />
            <span className="text-[12px]">{weather.humidity}%</span>
          </div>
          <div className="flex items-center gap-1 text-[#666]">
            <Wind size={13} strokeWidth={1.5} />
            <span className="text-[12px]">{weather.windSpeed} km/h</span>
          </div>
        </div>
      </div>
    </div>
  );
}
