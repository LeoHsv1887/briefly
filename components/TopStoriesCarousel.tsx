'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { BarChart2, Cpu, Globe, Landmark, Pause, Play, Sparkles, TrendingUp, Trophy } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { Article } from '@/lib/types';

const CARD_W = 270;
const CARD_GAP = 10;
const CARD_STEP = CARD_W + CARD_GAP;

const TOPIC_FALLBACK: Record<string, { bg: string; iconColor: string; Icon: LucideIcon }> = {
  'Aktienmärkte':           { bg: '#1c1a14', iconColor: '#3a3010', Icon: TrendingUp },
  'Wirtschaft & Finanzen':  { bg: '#141a18', iconColor: '#0e2820', Icon: BarChart2 },
  'Technologie & KI':       { bg: '#141820', iconColor: '#0e2540', Icon: Cpu },
  'Sport':                  { bg: '#18141a', iconColor: '#321040', Icon: Trophy },
  'Politik DE/EU':          { bg: '#141c14', iconColor: '#0e280e', Icon: Landmark },
  'Geopolitik':             { bg: '#1a1410', iconColor: '#3a2010', Icon: Globe },
};

const TOPIC_PILL: Record<string, { bg: string; color: string }> = {
  'Wirtschaft & Finanzen': { bg: '#1a2a1e', color: '#22c47a' },
  'Politik DE/EU':         { bg: '#1e1e2e', color: '#7b7fe0' },
  'Geopolitik':            { bg: '#2a1e1a', color: '#d4844a' },
  'Aktienmärkte':          { bg: '#2a2310', color: '#d4a843' },
  'Technologie & KI':      { bg: '#1e2530', color: '#5ba8e0' },
  'Sport':                 { bg: '#251e2a', color: '#b87bd4' },
  'Allgemein':             { bg: '#1e1e1e', color: '#888' },
};

function relTime(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const min = Math.floor(diff / 60_000);
  if (min < 1) return 'gerade';
  if (min < 60) return `vor ${min} Min.`;
  const h = Math.floor(min / 60);
  if (h < 24) return `vor ${h} Std.`;
  return new Date(dateStr).toLocaleDateString('de-DE', { day: 'numeric', month: 'short' });
}

function CardImage({ article }: { article: Article }) {
  const [url, setUrl] = useState<string | null>(article.imageUrl ?? null);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (url || !article.url) return;
    fetch(`/api/og-image?url=${encodeURIComponent(article.url)}`)
      .then((r) => r.json())
      .then((d) => { if (d.imageUrl) setUrl(d.imageUrl); })
      .catch(() => {});
  }, [article.url, url]);

  const fb = TOPIC_FALLBACK[article.topic] ?? { bg: '#1a1a1a', iconColor: '#2a2a2a', Icon: Globe };
  const { Icon } = fb;

  if (!url || error) {
    return (
      <div
        className="w-full flex items-center justify-center"
        style={{ height: 130, background: fb.bg }}
      >
        <Icon size={44} color={fb.iconColor} strokeWidth={1.2} />
      </div>
    );
  }

  return (
    <div className="w-full relative overflow-hidden" style={{ height: 130 }}>
      {!loaded && (
        <div className="absolute inset-0 animate-pulse" style={{ background: fb.bg }} />
      )}
      <img
        src={url}
        alt=""
        onLoad={() => setLoaded(true)}
        onError={() => { setError(true); setLoaded(false); }}
        className="w-full h-full object-cover"
        style={{ opacity: loaded ? 1 : 0, transition: 'opacity 0.25s' }}
      />
    </div>
  );
}

function CarouselCard({ article }: { article: Article }) {
  const [summary, setSummary] = useState('');
  const [summaryOpen, setSummaryOpen] = useState(false);
  const [loadingSummary, setLoadingSummary] = useState(false);
  const pill = TOPIC_PILL[article.topic] ?? TOPIC_PILL['Allgemein'];

  const handleSummarize = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (summary) {
      setSummaryOpen(prev => !prev);
      return;
    }
    if (loadingSummary) return;
    setLoadingSummary(true);
    try {
      const res = await fetch('/api/summarize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: article.title, url: article.url, content: article.title, lang: 'de' }),
      });
      const data = await res.json();
      setSummary(data.summary || 'Zusammenfassung nicht verfügbar.');
      setSummaryOpen(true);
    } catch {
      setSummary('Zusammenfassung konnte nicht geladen werden.');
      setSummaryOpen(true);
    } finally {
      setLoadingSummary(false);
    }
  };

  return (
    <div
      className="flex-shrink-0 flex flex-col overflow-hidden"
      style={{
        width: CARD_W,
        height: 360,
        borderRadius: 16,
        background: '#161616',
        border: '0.5px solid #222',
        scrollSnapAlign: 'start',
      }}
    >
      <a href={article.url} target="_blank" rel="noopener noreferrer" style={{ flexShrink: 0 }}>
        <CardImage article={article} />
      </a>
      <div className="px-3 py-2.5 flex flex-col flex-1 overflow-hidden">
        {/* Pill + title + source — fixed area */}
        <a href={article.url} target="_blank" rel="noopener noreferrer" style={{ flexShrink: 0 }}>
          <span
            className="inline-block self-start text-[10px] font-medium px-1.5 py-0.5 rounded-full mb-1.5"
            style={{ background: pill.bg, color: pill.color }}
          >
            {article.topic}
          </span>
          <p
            className="text-[13px] font-medium leading-snug"
            style={{ color: '#d0d0d0', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}
          >
            {article.title}
          </p>
          <div className="flex items-center justify-between mt-2">
            <span
              className="text-[10px] font-medium uppercase tracking-wide truncate"
              style={{ color: '#484848', maxWidth: 130 }}
            >
              {article.source}
            </span>
            <span className="text-[10px]" style={{ color: '#444' }}>
              {relTime(article.publishedAt)}
            </span>
          </div>
        </a>

        {/* Summary — scrollable, takes remaining space */}
        {summaryOpen && summary && (
          <div style={{
            fontSize: 11,
            color: '#a0a0a0',
            lineHeight: 1.55,
            marginTop: 6,
            padding: '8px 10px',
            background: '#141414',
            borderRadius: 8,
            borderLeft: '2px solid #c48a2a',
            flex: 1,
            overflowY: 'auto',
            minHeight: 0,
          }}>
            {summary}
          </div>
        )}

        {/* Button — always pinned to bottom */}
        <div
          onClick={handleSummarize}
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
            marginTop: 'auto',
            paddingTop: 6,
            flexShrink: 0,
          }}
        >
          <Sparkles size={11} color="#c48a2a" strokeWidth={1.5} />
          {loadingSummary ? 'Lädt...' : summaryOpen ? 'Zusammenfassung ausblenden' : summary ? 'Zusammenfassung anzeigen' : 'KI-Zusammenfassung'}
        </div>
      </div>
    </div>
  );
}

interface Props {
  articles: Article[];
}

export default function TopStoriesCarousel({ articles }: Props) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const resumeTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const [activeIdx, setActiveIdx] = useState(0);
  const [autoPlay, setAutoPlay] = useState(true);
  const [userPaused, setUserPaused] = useState(false);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const onScroll = () => {
      setActiveIdx(Math.min(Math.round(el.scrollLeft / CARD_STEP), articles.length - 1));
    };
    el.addEventListener('scroll', onScroll, { passive: true });
    return () => el.removeEventListener('scroll', onScroll);
  }, [articles.length]);

  useEffect(() => {
    if (!autoPlay || userPaused || articles.length <= 1) return;
    const id = setInterval(() => {
      setActiveIdx((prev) => {
        const next = (prev + 1) % articles.length;
        scrollRef.current?.scrollTo({ left: next * CARD_STEP, behavior: 'smooth' });
        return next;
      });
    }, 4000);
    return () => clearInterval(id);
  }, [autoPlay, userPaused, articles.length]);

  useEffect(() => () => clearTimeout(resumeTimer.current), []);

  const handleInteraction = useCallback(() => {
    setUserPaused(true);
    clearTimeout(resumeTimer.current);
    resumeTimer.current = setTimeout(() => setUserPaused(false), 8000);
  }, []);

  const scrollToCard = useCallback((i: number) => {
    scrollRef.current?.scrollTo({ left: i * CARD_STEP, behavior: 'smooth' });
    setActiveIdx(i);
  }, []);

  if (!articles.length) return null;

  return (
    <div className="mt-2 mb-1">
      {/* Header */}
      <div className="flex items-center justify-between px-[14px] mb-3">
        <span className="text-[11px] font-semibold text-[#555] uppercase tracking-widest">
          Top Stories
        </span>
        <button
          onClick={() => setAutoPlay((p) => !p)}
          className="flex items-center gap-1 text-[11px] transition-colors"
          style={{ color: autoPlay && !userPaused ? '#555' : '#3a3a3a' }}
          aria-label={autoPlay ? 'Auto-Play pausieren' : 'Auto-Play starten'}
        >
          {autoPlay && !userPaused ? (
            <Pause size={11} strokeWidth={2} />
          ) : (
            <Play size={11} strokeWidth={2} />
          )}
        </button>
      </div>

      {/* Scroll container */}
      <div
        ref={scrollRef}
        onTouchStart={handleInteraction}
        onMouseDown={handleInteraction}
        className="flex overflow-x-auto no-scrollbar gap-[10px]"
        style={{
          scrollSnapType: 'x mandatory',
          WebkitOverflowScrolling: 'touch' as never,
          paddingLeft: 14,
        }}
      >
        {articles.map((article) => (
          <CarouselCard key={article.id} article={article} />
        ))}
        <div className="flex-shrink-0" style={{ width: 14 }} />
      </div>

      {/* Dot indicator */}
      <div className="flex items-center justify-center mt-3" style={{ gap: 6 }}>
        {articles.map((_, i) => (
          <button
            key={i}
            onClick={() => scrollToCard(i)}
            aria-label={`Karte ${i + 1}`}
            style={{
              width: i === activeIdx ? 14 : 5,
              height: 5,
              borderRadius: i === activeIdx ? 3 : '50%',
              background: i === activeIdx ? '#666' : '#2a2a2a',
              transition: 'all 0.2s',
              padding: 0,
              border: 'none',
              cursor: 'pointer',
              flexShrink: 0,
            }}
          />
        ))}
      </div>
    </div>
  );
}
