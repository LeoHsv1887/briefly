'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Bookmark } from 'lucide-react';
import type { Article } from '@/lib/types';
import { KISummaryButton } from '@/components/KISummaryButton';
import { addBookmark, removeBookmark, isBookmarked } from '@/lib/bookmarks';
import { trackInteraction } from '@/lib/profile';

function relTime(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const min = Math.floor(diff / 60_000);
  if (min < 1) return 'gerade';
  if (min < 60) return `vor ${min} Min.`;
  const h = Math.floor(min / 60);
  if (h < 24) return `vor ${h} Std.`;
  return new Date(dateStr).toLocaleDateString('de-DE', { day: 'numeric', month: 'short' });
}

function HeroBookmark({ article }: { article: Article }) {
  const [saved, setSaved] = useState(() => isBookmarked(article.id));

  function handleClick(e: React.MouseEvent) {
    e.stopPropagation();
    e.preventDefault();
    if (saved) {
      removeBookmark(article.id);
    } else {
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
    }
    setSaved(s => !s);
  }

  return (
    <button
      onClick={handleClick}
      style={{
        background: 'none',
        border: 'none',
        cursor: 'pointer',
        padding: 4,
        flexShrink: 0,
      }}
      aria-label={saved ? 'Gespeichert' : 'Speichern'}
    >
      <Bookmark
        size={17}
        color={saved ? '#4a9e6a' : '#1a1a1a'}
        fill={saved ? '#4a9e6a' : 'none'}
        strokeWidth={1.8}
      />
    </button>
  );
}

function HeroImage({ article }: { article: Article }) {
  const [url, setUrl] = useState<string | null>(article.imageUrl ?? null);

  useEffect(() => {
    if (url || !article.url) return;
    fetch(`/api/og-image?url=${encodeURIComponent(article.url)}`)
      .then(r => r.json())
      .then(d => { if (d.imageUrl) setUrl(d.imageUrl); })
      .catch(() => {});
  }, [article.url, url]);

  if (!url) return null;

  return (
    <img
      src={url}
      alt=""
      style={{
        position: 'absolute',
        inset: 0,
        width: '100%',
        height: '100%',
        objectFit: 'cover',
        opacity: 0.45,
      }}
      onError={e => (e.currentTarget.style.display = 'none')}
    />
  );
}

interface Props {
  articles: Article[];
  onArticleClick: (article: Article) => void;
}

export default function TopStoriesCarousel({ articles, onArticleClick }: Props) {
  const [current, setCurrent] = useState(0);
  const [userPaused, setUserPaused] = useState(false);
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const resumeTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  function handleTouchStart(e: React.TouchEvent) {
    setTouchStart(e.touches[0].clientX);
  }

  function handleTouchEnd(e: React.TouchEvent) {
    if (touchStart === null) return;
    const diff = touchStart - e.changedTouches[0].clientX;
    if (Math.abs(diff) > 40) {
      handleInteraction();
      if (diff > 0) {
        setCurrent(c => (c + 1) % articles.length);
      } else {
        setCurrent(c => (c - 1 + articles.length) % articles.length);
      }
    }
    setTouchStart(null);
  }

  useEffect(() => {
    if (userPaused || articles.length <= 1) return;
    const id = setInterval(() => {
      setCurrent(c => (c + 1) % articles.length);
    }, 4000);
    return () => clearInterval(id);
  }, [userPaused, articles.length]);

  useEffect(() => () => clearTimeout(resumeTimer.current), []);

  const handleInteraction = useCallback(() => {
    setUserPaused(true);
    clearTimeout(resumeTimer.current);
    resumeTimer.current = setTimeout(() => setUserPaused(false), 8000);
  }, []);

  if (!articles.length) return null;

  const article = articles[current];

  return (
    <div
      style={{ margin: '16px 18px 0' }}
      className="hero-card"
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      <div
        key={article.id}
        style={{
          background: 'var(--bg-card)',
          borderRadius: 22,
          overflow: 'hidden',
          border: '0.5px solid #181818',
          cursor: 'pointer',
        }}
        onClick={() => {
          trackInteraction(article.topic);
          onArticleClick(article);
        }}
        onMouseDown={handleInteraction}
      >
        {/* Image area */}
        <div
          style={{
            height: 178,
            position: 'relative',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            padding: 14,
            overflow: 'hidden',
            background: '#0a0a0a',
          }}
        >
          <HeroImage key={article.id} article={article} />
          {/* Gradient overlay */}
          <div
            style={{
              position: 'absolute',
              inset: 0,
              background: 'linear-gradient(to bottom, rgba(0,0,0,0.2) 0%, rgba(0,0,0,0.8) 100%)',
            }}
          />
          {/* Topic tag */}
          <div
            style={{
              position: 'relative',
              zIndex: 1,
              alignSelf: 'flex-start',
              fontSize: 9,
              fontWeight: 500,
              color: '#ccc',
              background: 'rgba(0,0,0,0.5)',
              border: '0.5px solid rgba(255,255,255,0.1)',
              borderRadius: 20,
              padding: '3px 9px',
              letterSpacing: '0.04em',
            }}
          >
            {article.topic}
          </div>
          {/* Source + time */}
          <div
            style={{
              position: 'relative',
              zIndex: 1,
              display: 'flex',
              justifyContent: 'space-between',
            }}
          >
            <span
              style={{
                fontSize: 10,
                color: 'rgba(255,255,255,0.4)',
                fontWeight: 500,
                textTransform: 'uppercase',
                letterSpacing: '0.06em',
              }}
            >
              {article.source}
            </span>
            <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.25)' }}>
              {relTime(article.publishedAt)}
            </span>
          </div>
        </div>

        {/* Text area */}
        <div style={{ padding: '14px 16px 15px' }}>
          <div
            style={{
              fontFamily: "'Playfair Display', serif",
              fontSize: 17,
              fontWeight: 400,
              color: '#ebe7df',
              lineHeight: 1.4,
              marginBottom: 12,
            }}
          >
            {article.title}
          </div>
          <div
            style={{
              display: 'flex',
              alignItems: 'flex-start',
              justifyContent: 'space-between',
              gap: 8,
            }}
            onClick={e => e.stopPropagation()}
          >
            <KISummaryButton article={article} />
            <HeroBookmark article={article} />
          </div>
        </div>
      </div>

      {/* Dots */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 5,
          marginTop: 10,
        }}
      >
        {articles.map((_, i) => (
          <button
            key={i}
            onClick={() => { setCurrent(i); handleInteraction(); }}
            aria-label={`Karte ${i + 1}`}
            style={{
              width: i === current ? 18 : 5,
              height: 5,
              borderRadius: i === current ? 3 : '50%',
              background: i === current ? '#666' : '#1a1a1a',
              cursor: 'pointer',
              transition: 'all 0.25s',
              padding: 0,
              border: 'none',
              flexShrink: 0,
            }}
          />
        ))}
      </div>
    </div>
  );
}
