'use client';

import { useState } from 'react';
import { Bookmark, Sparkles } from 'lucide-react';
import type { Article } from '@/lib/types';
import { trackInteraction } from '@/lib/profile';
import { addBookmark, removeBookmark, isBookmarked } from '@/lib/bookmarks';

const TOPIC_STYLE: Record<string, { bg: string; color: string }> = {
  'Wirtschaft & Finanzen': { bg: '#1a2a1e', color: '#22c47a' },
  'Politik DE/EU':         { bg: '#1e1e2e', color: '#7b7fe0' },
  Geopolitik:              { bg: '#2a1e1a', color: '#d4844a' },
  Aktienmärkte:            { bg: '#2a2310', color: '#d4a843' },
  'Technologie & KI':      { bg: '#1e2530', color: '#5ba8e0' },
  Sport:                   { bg: '#251e2a', color: '#b87bd4' },
  Allgemein:               { bg: '#1e1e1e', color: '#888' },
};

function topicStyle(topic: string) {
  return TOPIC_STYLE[topic] ?? TOPIC_STYLE['Allgemein'];
}

function relativeTime(dateStr: string): string {
  const diffMin = Math.floor((Date.now() - new Date(dateStr).getTime()) / 60_000);
  if (diffMin < 1) return 'Gerade eben';
  if (diffMin < 60) return `vor ${diffMin} Min.`;
  const h = Math.floor(diffMin / 60);
  if (h < 24) return `vor ${h} Std.`;
  return 'Gestern';
}

interface NewsCardProps {
  article: Article;
  isLast?: boolean;
  isSaved?: boolean;
  onSave?: (id: string) => void;
  summariesInGerman?: boolean;
}

export default function NewsCard({
  article,
  isLast = false,
  isSaved,
  onSave,
  summariesInGerman = true,
}: NewsCardProps) {
  const [summary, setSummary] = useState('');
  const [loadingSummary, setLoadingSummary] = useState(false);
  const [showSummary, setShowSummary] = useState(false);
  // Self-contained bookmark state when parent doesn't manage it
  const [localSaved, setLocalSaved] = useState(() => isBookmarked(article.id));
  const [saveScale, setSaveScale] = useState(false);

  const saved = isSaved !== undefined ? isSaved : localSaved;
  const style = topicStyle(article.topic);

  const handleSummarize = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (summary) { setShowSummary(s => !s); return; }
    setLoadingSummary(true);
    try {
      const res = await fetch('/api/summarize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: article.title,
          url: article.url,
          content: article.content,
          lang: summariesInGerman ? 'de' : 'en',
        }),
      });
      const data = await res.json();
      setSummary(data.summary || 'Zusammenfassung nicht verfügbar.');
      setShowSummary(true);
    } catch {
      setSummary('Zusammenfassung konnte nicht geladen werden.');
      setShowSummary(true);
    } finally {
      setLoadingSummary(false);
    }
  };

  const handleSave = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!saved) {
      addBookmark({
        id: article.id,
        title: article.title,
        url: article.url,
        source: article.source,
        topic: article.topic,
        publishedAt: article.publishedAt,
        imageUrl: article.imageUrl ?? null,
        savedAt: new Date().toISOString(),
      });
      setSaveScale(true);
      setTimeout(() => setSaveScale(false), 300);
    } else {
      removeBookmark(article.id);
    }
    setLocalSaved(s => !s);
    onSave?.(article.id);
  };

  return (
    <a
      href={article.url}
      target="_blank"
      rel="noopener noreferrer"
      onClick={() => trackInteraction(article.topic)}
      className="block hover:bg-[#111] transition-colors"
      style={{ padding: '12px 16px' }}
    >
      <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>

        {/* Text */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 5, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 10, fontWeight: 500, color: '#484848', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              {article.source}
            </span>
            <span style={{ fontSize: 10, color: '#333' }}>·</span>
            <span style={{ fontSize: 10, color: '#444' }}>{relativeTime(article.publishedAt)}</span>
            <span style={{ fontSize: 10, fontWeight: 500, padding: '1px 6px', borderRadius: 999, background: style.bg, color: style.color }}>
              {article.topic}
            </span>
          </div>

          <p style={{ fontSize: 13, fontWeight: 500, color: '#cccccc', lineHeight: 1.4, marginBottom: 7 }}>
            {article.title}
          </p>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <button
              onClick={handleSummarize}
              style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, color: '#555', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
            >
              <Sparkles size={12} strokeWidth={1.5} />
              {loadingSummary ? 'Wird geladen…' : showSummary ? 'Ausblenden' : 'KI-Zusammenfassung'}
            </button>
            <button
              onClick={handleSave}
              style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, transform: saveScale ? 'scale(1.4)' : 'scale(1)', transition: 'transform 0.2s ease' }}
              aria-label={saved ? 'Gespeichert' : 'Speichern'}
            >
              <Bookmark size={14} strokeWidth={1.8} color={saved ? '#c48a2a' : '#444'} fill={saved ? '#c48a2a' : 'none'} />
            </button>
          </div>
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

      {/* Summary */}
      {showSummary && summary && (
        <div style={{ fontSize: 12, color: '#555', lineHeight: 1.6, marginTop: 8, padding: '9px 11px', background: '#141414', borderRadius: 8, borderLeft: '2px solid #222' }}>
          {summary}
        </div>
      )}
    </a>
  );
}
