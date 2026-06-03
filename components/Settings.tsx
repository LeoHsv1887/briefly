'use client';

import { RotateCcw } from 'lucide-react';
import type { Settings } from '@/lib/types';
import { TOPICS, resetInterestProfile } from '@/lib/profile';

interface SettingsProps {
  settings: Settings;
  onChange: (s: Settings) => void;
}

function Toggle({
  checked,
  onChange,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <button
      onClick={() => onChange(!checked)}
      role="switch"
      aria-checked={checked}
      className="relative flex-shrink-0 w-10 h-5 rounded-full transition-colors focus:outline-none"
      style={{ background: checked ? '#22c47a' : '#2a2a2a' }}
    >
      <span
        className="absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform"
        style={{ transform: checked ? 'translateX(20px)' : 'translateX(0)' }}
      />
    </button>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-6">
      <p className="text-[11px] font-semibold text-[#555] uppercase tracking-widest mb-3 px-4">
        {title}
      </p>
      <div className="bg-[#161616] border-y border-[#1e1e1e] divide-y divide-[#1e1e1e]">
        {children}
      </div>
    </div>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between px-4 py-3">
      <span className="text-[14px] text-[#ccc]">{label}</span>
      {children}
    </div>
  );
}

export default function SettingsPanel({ settings, onChange }: SettingsProps) {
  const update = (patch: Partial<Settings>) => onChange({ ...settings, ...patch });

  const toggleTopic = (topic: string) => {
    const has = settings.enabledTopics.includes(topic);
    update({
      enabledTopics: has
        ? settings.enabledTopics.filter((t) => t !== topic)
        : [...settings.enabledTopics, topic],
    });
  };

  return (
    <div className="py-4">
      <Section title="Profil">
        <div className="px-4 py-3">
          <label className="text-[12px] text-[#555] block mb-1.5">Name</label>
          <input
            type="text"
            value={settings.username}
            onChange={(e) => update({ username: e.target.value })}
            className="w-full bg-[#0f0f0f] border border-[#2a2a2a] rounded-lg px-3 py-2 text-[14px] text-[#e8e8e8] placeholder:text-[#444] focus:outline-none focus:border-[#444]"
            placeholder="Dein Name"
          />
        </div>
      </Section>

      <Section title="Themen">
        {TOPICS.map((topic) => (
          <Row key={topic} label={topic}>
            <Toggle
              checked={settings.enabledTopics.includes(topic)}
              onChange={() => toggleTopic(topic)}
            />
          </Row>
        ))}
      </Section>

      <Section title="Feed">
        <div className="px-4 py-3">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[14px] text-[#ccc]">Relevanz-Schwelle</span>
            <span className="text-[14px] font-semibold text-[#e8e8e8]">{settings.minScore}</span>
          </div>
          <input
            type="range"
            min={5}
            max={9}
            step={1}
            value={settings.minScore}
            onChange={(e) => update({ minScore: Number(e.target.value) })}
            className="w-full h-1 rounded-full appearance-none bg-[#2a2a2a] cursor-pointer"
          />
          <div className="flex justify-between mt-1">
            <span className="text-[10px] text-[#444]">5 – Mehr Artikel</span>
            <span className="text-[10px] text-[#444]">9 – Nur Top-Artikel</span>
          </div>
        </div>
        <Row label="Zusammenfassungen auf Deutsch">
          <Toggle
            checked={settings.summariesInGerman}
            onChange={(v) => update({ summariesInGerman: v })}
          />
        </Row>
      </Section>

      <Section title="Interesse-Profil">
        <div className="px-4 py-4">
          <p className="text-[13px] text-[#666] mb-3 leading-relaxed">
            Briefly lernt aus deinen Klicks, welche Themen dir wichtig sind. Das beeinflusst die
            Sortierung deines Feeds.
          </p>
          <button
            onClick={() => {
              resetInterestProfile();
              alert('Interesse-Profil wurde zurückgesetzt.');
            }}
            className="flex items-center gap-2 text-[13px] text-[#e05a4b] hover:opacity-80 transition-opacity"
          >
            <RotateCcw size={14} strokeWidth={2} />
            Profil zurücksetzen
          </button>
        </div>
      </Section>

      <div className="px-4 mt-2 mb-8">
        <p className="text-[11px] text-[#333] text-center">
          Briefly · Powered by Claude AI
        </p>
      </div>
    </div>
  );
}
