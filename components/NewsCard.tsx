'use client';

import { useState } from 'react';
import { Bookmark, BookmarkCheck, Sparkles } from 'lucide-react';
import type { Article } from '@/lib/types';
import { trackInteraction } from '@/lib/profile';

const TOPIC_STYLE: Record<string, { bg: string; color: string }> = {
  'Wirtschaft & Finanzen': { bg: '#1a2a1e', color: '#22c47a' },
  'Politik DE/EU': { bg: '#1e1e2e', color: '#7b7fe0' },
  Geopolitik: { bg: '#2a1e1a', color: '#d4844a' },
  Aktienmärkte: { bg: '#2a2310', color: '#d4a843' },
  'Technologie & KI': { bg: '#1e2530', color: '#5ba8e0' },
  Sport: { bg: '#251e2a', color: '#b87bd4' },
  Allgemein: { bg: '#1e1e1e', color: '#888' },
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
  isSaved: boolean;
  onSave: (id: string) => void;
  summariesInGerman: boolean;
}

export default function NewsCard({ article, isSaved, onSave, summariesInGerman }: NewsCardProps) {
  const [summary, setSummary] = useState('');
  const [loadingSummary, setLoadingSummary] = useState(false);
  const [showSummary, setShowSummary] = useState(false);

  const style = topicStyle(article.topic);

  const handleCardClick = () => {
    trackInteraction(article.topic);
  };

  const handleSummarize = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (summary) {
      setShowSummary((s) => !s);
      return;
    }
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
    onSave(article.id);
  };

  return (
    <a
      href={article.url}
      target="_blank"
      rel="noopener noreferrer"
      onClick={handleCardClick}
      className="block px-4 py-4 hover:bg-[#111] transition-colors"
    >
      {/* Meta row */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-[10px] font-medium text-[#484848] uppercase tracking-wider truncate">
            {article.source}
          </span>
          <span className="text-[10px] text-[#333]">·</span>
          <span className="text-[10px] text-[#444]">{relativeTime(article.publishedAt)}</span>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0 ml-2">
          <span
            className="text-[10px] font-medium px-1.5 py-0.5 rounded-full"
            style={{ background: style.bg, color: style.color }}
          >
            {article.topic}
          </span>
        </div>
      </div>

      {/* Headline */}
      <p className="text-[14px] text-[#ccc] font-medium leading-snug mb-2">{article.title}</p>

      {/* Summary */}
      {showSummary && summary && (
        <p className="text-[13px] text-[#888] leading-relaxed mb-2 border-l-2 border-[#333] pl-3">
          {summary}
        </p>
      )}

      {/* Actions */}
      <div className="flex items-center justify-between mt-1">
        <button
          onClick={handleSummarize}
          className="flex items-center gap-1.5 text-[11px] text-[#555] hover:text-[#888] transition-colors"
        >
          <Sparkles size={12} strokeWidth={1.5} />
          {loadingSummary ? (
            <span>Wird geladen…</span>
          ) : showSummary ? (
            <span>Zusammenfassung ausblenden</span>
          ) : (
            <span>KI-Zusammenfassung</span>
          )}
        </button>
        <button
          onClick={handleSave}
          className="p-1 hover:opacity-70 transition-opacity"
          aria-label={isSaved ? 'Gespeichert' : 'Speichern'}
        >
          {isSaved ? (
            <BookmarkCheck size={15} color="#22c47a" strokeWidth={1.8} />
          ) : (
            <Bookmark size={15} color="#444" strokeWidth={1.8} />
          )}
        </button>
      </div>
    </a>
  );
}
