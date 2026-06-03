'use client';

import { ArrowRight, Bookmark, BookmarkCheck } from 'lucide-react';
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

function relativeTime(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const min = Math.floor(diff / 60_000);
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

export default function TopStories({ articles, saved, onSave }: TopStoriesProps) {
  if (!articles.length) {
    return (
      <div className="px-4 py-12 text-center text-[#555] text-sm">
        Noch keine Top-Storys verfügbar.
      </div>
    );
  }

  return (
    <div className="px-4 py-4 space-y-3">
      <p className="text-[11px] text-[#555] font-medium uppercase tracking-widest mb-4">
        Top-Storys des Tages
      </p>
      {articles.map((article, i) => {
        const style = TOPIC_STYLE[article.topic] ?? TOPIC_STYLE['Allgemein'];
        const isSaved = saved.has(article.id);

        return (
          <div key={article.id} className="bg-[#161616] border border-[#222] rounded-xl overflow-hidden">
            <div className="p-4">
              {/* Label row */}
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  {i === 0 && (
                    <span className="text-[10px] font-semibold text-[#c48a2a] bg-[#2a2310] px-2 py-0.5 rounded-full">
                      Top Story
                    </span>
                  )}
                  <span
                    className="text-[10px] font-medium px-1.5 py-0.5 rounded-full"
                    style={{ background: style.bg, color: style.color }}
                  >
                    {article.topic}
                  </span>
                </div>
                <button
                  onClick={(e) => {
                    e.preventDefault();
                    onSave(article.id);
                  }}
                  className="p-1"
                >
                  {isSaved ? (
                    <BookmarkCheck size={15} color="#22c47a" strokeWidth={1.8} />
                  ) : (
                    <Bookmark size={15} color="#444" strokeWidth={1.8} />
                  )}
                </button>
              </div>

              {/* Headline */}
              <p className="text-[16px] text-[#e8e8e8] font-semibold leading-snug mb-3">
                {article.title}
              </p>

              {/* Footer */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-[11px] text-[#484848] uppercase font-medium">
                    {article.source}
                  </span>
                  <span className="text-[11px] text-[#333]">·</span>
                  <span className="text-[11px] text-[#444]">{relativeTime(article.publishedAt)}</span>
                </div>
                <a
                  href={article.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => trackInteraction(article.topic)}
                  className="flex items-center gap-1 text-[12px] text-[#888] hover:text-[#e8e8e8] transition-colors"
                >
                  Artikel lesen
                  <ArrowRight size={12} strokeWidth={2} />
                </a>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
