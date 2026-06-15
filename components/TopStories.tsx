'use client';

import { useState } from 'react';
import { Sparkles } from 'lucide-react';
import type { Article } from '@/lib/types';
import { trackInteraction } from '@/lib/profile';

const TOPIC_STYLE: Record<string, { bg: string; color: string }> = {
  'Wirtschaft & Finanzen': { bg: '#1a2a1e', color: '#22c47a' },
  'Politik DE/EU':         { bg: '#1e1e2e', color: '#7b7fe0' },
  Geopolitik:              { bg: '#2a1e1a', color: '#d4844a' },
  Aktienmärkte:            { bg: '#2a2310', color: '#d4a843' },
  'Technologie & KI':      { bg: '#1e2530', color: '#5ba8e0' },
  Sport:                   { bg: '#251e2a', color: '#b87bd4' },
  Allgemein:               { bg: '#1e1e1e', color: '#888' },
};

function TopicPill({ topic }: { topic: string }) {
  const s = TOPIC_STYLE[topic] ?? TOPIC_STYLE['Allgemein'];
  return (
    <span style={{ fontSize: 10, fontWeight: 500, padding: '1px 6px', borderRadius: 999, background: s.bg, color: s.color }}>
      {topic}
    </span>
  );
}

function formatTimeAgo(dateStr: string): string {
  const min = Math.floor((Date.now() - new Date(dateStr).getTime()) / 60_000);
  if (min < 1) return 'gerade';
  if (min < 60) return `vor ${min} Min.`;
  const h = Math.floor(min / 60);
  if (h < 24) return `vor ${h} Std.`;
  return new Date(dateStr).toLocaleDateString('de-DE', { day: 'numeric', month: 'short' });
}

interface TopStoriesProps {
  articles: Article[];
  saved: Set<string>;
  onSave: (id: string) => void;
}

export default function TopStories({ articles }: TopStoriesProps) {
  const [summaries, setSummaries] = useState<Record<string, string>>({});
  const [summaryOpen, setSummaryOpen] = useState<Record<string, boolean>>({});
  const [loadingSummaries, setLoadingSummaries] = useState<Record<string, boolean>>({});

  async function handleSummaryClick(id: string) {
    if (summaries[id]) {
      setSummaryOpen(prev => ({ ...prev, [id]: !prev[id] }));
      return;
    }
    if (loadingSummaries[id]) return;
    const article = articles.find(a => a.id === id);
    if (!article) return;
    setLoadingSummaries(prev => ({ ...prev, [id]: true }));
    try {
      const res = await fetch('/api/summarize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: article.title, url: article.url, content: article.title, lang: 'de' }),
      });
      const data = await res.json();
      setSummaries(prev => ({ ...prev, [id]: data.summary }));
      setSummaryOpen(prev => ({ ...prev, [id]: true }));
    } catch {}
    setLoadingSummaries(prev => ({ ...prev, [id]: false }));
  }

  if (!articles.length) {
    return (
      <div className="px-4 py-12 text-center text-[#555] text-sm">
        Noch keine Top-Storys verfügbar.
      </div>
    );
  }

  return (
    <div className="px-4 pt-4">
      <p className="text-[11px] text-[#555] font-medium uppercase tracking-widest mb-2">
        Top-Storys des Tages
      </p>

      {articles.map(article => (
        <div
          key={article.id}
          style={{ padding: '12px 0', borderBottom: '0.5px solid #181818', cursor: 'pointer' }}
          onClick={() => { trackInteraction(article.topic); window.open(article.url, '_blank'); }}
        >
          <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>

            {/* Text */}
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 5, flexWrap: 'wrap' }}>
                <span style={{ fontSize: 10, fontWeight: 500, color: '#484848', letterSpacing: '0.04em', textTransform: 'uppercase' }}>
                  {article.source}
                </span>
                <div style={{ width: 3, height: 3, borderRadius: '50%', background: '#2e2e2e' }} />
                <span style={{ fontSize: 10, color: '#333' }}>{formatTimeAgo(article.publishedAt)}</span>
                <TopicPill topic={article.topic} />
              </div>

              <div style={{ fontSize: 13, fontWeight: 500, color: '#cccccc', lineHeight: 1.4, marginBottom: 7 }}>
                {article.title}
              </div>

              <div
                onClick={(e) => { e.stopPropagation(); handleSummaryClick(article.id); }}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 5,
                  fontSize: 11,
                  fontWeight: 500,
                  color: '#c48a2a',
                  background: '#1e1a10',
                  border: '0.5px solid #c48a2a33',
                  borderRadius: 6,
                  padding: '3px 8px',
                  cursor: 'pointer',
                  marginTop: 2,
                }}
              >
                <Sparkles size={11} color="#c48a2a" strokeWidth={1.5} />
                {loadingSummaries[article.id] ? 'Lädt...' : summaryOpen[article.id] ? 'Zusammenfassung ausblenden' : summaries[article.id] ? 'Zusammenfassung anzeigen' : 'KI-Zusammenfassung'}
              </div>

              {summaryOpen[article.id] && summaries[article.id] && (
                <div style={{
                  fontSize: 12,
                  color: '#a0a0a0',
                  lineHeight: 1.65,
                  marginTop: 8,
                  padding: '10px 12px',
                  background: '#141414',
                  borderRadius: 8,
                  borderLeft: '2px solid #c48a2a',
                  borderTop: '0.5px solid #1e1e1e',
                  borderRight: '0.5px solid #1e1e1e',
                  borderBottom: '0.5px solid #1e1e1e',
                }}>
                  {summaries[article.id]}
                </div>
              )}
            </div>

            {/* Thumbnail */}
            {article.imageUrl && (
              <div style={{ width: 72, height: 72, borderRadius: 8, flexShrink: 0, overflow: 'hidden', background: '#1a1a1a' }}>
                <img
                  src={article.imageUrl}
                  alt=""
                  style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                  onError={(e) => { (e.target as HTMLImageElement).parentElement!.style.display = 'none'; }}
                />
              </div>
            )}

          </div>
        </div>
      ))}
    </div>
  );
}
