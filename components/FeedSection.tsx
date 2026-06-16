'use client'
import { useState } from 'react'
import { Bookmark, ChevronDown } from 'lucide-react'
import { KISummaryButton } from '@/components/KISummaryButton'
import { addBookmark, removeBookmark, isBookmarked } from '@/lib/bookmarks'
import { trackInteraction } from '@/lib/profile'
import type { Article } from '@/lib/types'

function relTime(dateStr: string): string {
  const min = Math.floor((Date.now() - new Date(dateStr).getTime()) / 60_000)
  if (min < 1) return 'gerade'
  if (min < 60) return `vor ${min} Min.`
  const h = Math.floor(min / 60)
  if (h < 24) return `vor ${h} Std.`
  return new Date(dateStr).toLocaleDateString('de-DE', { day: 'numeric', month: 'short' })
}

function ArticleBookmark({ article }: { article: Article }) {
  const [saved, setSaved] = useState(() => isBookmarked(article.id))

  function handleClick(e: React.MouseEvent) {
    e.stopPropagation()
    e.preventDefault()
    if (saved) {
      removeBookmark(article.id)
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
      })
    }
    setSaved(s => !s)
  }

  return (
    <button
      onClick={handleClick}
      style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 2 }}
      aria-label={saved ? 'Gespeichert' : 'Speichern'}
    >
      <Bookmark
        size={14}
        color={saved ? '#4a9e6a' : '#1c1c1c'}
        fill={saved ? '#4a9e6a' : 'none'}
        strokeWidth={1.8}
      />
    </button>
  )
}

// Layout 1: Big card with thumbnail (first article in each section)
function BigCard({ article }: { article: Article }) {
  return (
    <a
      href={article.url}
      target="_blank"
      rel="noopener noreferrer"
      onClick={() => trackInteraction(article.topic)}
      style={{ display: 'block', textDecoration: 'none' }}
    >
      <div
        style={{
          background: 'var(--bg-card)',
          border: '0.5px solid #141414',
          borderRadius: 18,
          padding: '14px 15px',
          marginBottom: 8,
        }}
      >
        <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 5,
                marginBottom: 7,
                flexWrap: 'wrap',
              }}
            >
              <span
                style={{
                  fontSize: 9,
                  color: '#282828',
                  fontWeight: 500,
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                }}
              >
                {article.source}
              </span>
              <div
                style={{
                  width: 2,
                  height: 2,
                  borderRadius: '50%',
                  background: '#1c1c1c',
                  flexShrink: 0,
                }}
              />
              <span style={{ fontSize: 9, color: '#1c1c1c' }}>{relTime(article.publishedAt)}</span>
              <span
                style={{
                  fontSize: 9,
                  color: '#363636',
                  background: '#0a0a0a',
                  border: '0.5px solid #161616',
                  borderRadius: 20,
                  padding: '2px 7px',
                }}
              >
                {article.topic}
              </span>
            </div>
            <div
              style={{
                fontFamily: "'Playfair Display', serif",
                fontSize: 14,
                fontWeight: 400,
                color: '#d0ccc4',
                lineHeight: 1.42,
                marginBottom: 9,
              }}
            >
              {article.title}
            </div>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
              onClick={e => e.preventDefault()}
            >
              <KISummaryButton article={article} />
              <ArticleBookmark article={article} />
            </div>
          </div>
          {article.imageUrl && (
            <div
              style={{
                width: 72,
                height: 72,
                borderRadius: 12,
                flexShrink: 0,
                overflow: 'hidden',
              }}
            >
              <img
                src={article.imageUrl}
                alt=""
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                onError={e => {
                  (e.currentTarget.parentElement as HTMLElement).style.display = 'none'
                }}
              />
            </div>
          )}
        </div>
      </div>
    </a>
  )
}

// Layout 2: Half-width card with image header (2nd & 3rd articles)
function HalfCard({ article }: { article: Article }) {
  return (
    <a
      href={article.url}
      target="_blank"
      rel="noopener noreferrer"
      onClick={() => trackInteraction(article.topic)}
      style={{ display: 'block', textDecoration: 'none', flex: 1, minWidth: 0 }}
    >
      <div
        style={{
          background: 'var(--bg-card)',
          border: '0.5px solid #141414',
          borderRadius: 16,
          overflow: 'hidden',
          height: '100%',
        }}
      >
        <div style={{ height: 70, position: 'relative', overflow: 'hidden' }}>
          {article.imageUrl ? (
            <img
              src={article.imageUrl}
              alt=""
              style={{ width: '100%', height: '100%', objectFit: 'cover', opacity: 0.7 }}
              onError={e => (e.currentTarget.style.display = 'none')}
            />
          ) : (
            <div style={{ width: '100%', height: '100%', background: '#111' }} />
          )}
        </div>
        <div style={{ padding: '10px 11px 11px' }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 4,
              marginBottom: 5,
              flexWrap: 'wrap',
            }}
          >
            <span
              style={{
                fontSize: 9,
                color: '#282828',
                fontWeight: 500,
                textTransform: 'uppercase',
                letterSpacing: '0.04em',
              }}
            >
              {article.source}
            </span>
            <span
              style={{
                fontSize: 8,
                color: '#303030',
                background: '#0a0a0a',
                border: '0.5px solid #161616',
                borderRadius: 20,
                padding: '2px 6px',
              }}
            >
              {article.topic}
            </span>
          </div>
          <div
            style={{
              fontFamily: "'Playfair Display', serif",
              fontSize: 11,
              fontWeight: 400,
              color: '#909090',
              lineHeight: 1.38,
              marginBottom: 7,
            }}
          >
            {article.title}
          </div>
          <div onClick={e => e.preventDefault()}>
            <KISummaryButton article={article} small />
          </div>
        </div>
      </div>
    </a>
  )
}

// Layout 3: Compact list item (remaining articles grouped in one card)
function CompactItem({
  article,
  isLast,
}: {
  article: Article
  isLast: boolean
}) {
  return (
    <a
      href={article.url}
      target="_blank"
      rel="noopener noreferrer"
      onClick={() => trackInteraction(article.topic)}
      style={{ display: 'block', textDecoration: 'none' }}
    >
      <div
        style={{
          display: 'flex',
          gap: 10,
          alignItems: 'flex-start',
          padding: '11px 13px',
          borderBottom: isLast ? 'none' : '0.5px solid #0c0c0c',
        }}
      >
        <div style={{ flex: 1, minWidth: 0 }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 4,
              marginBottom: 4,
            }}
          >
            <span
              style={{
                fontSize: 9,
                color: '#282828',
                fontWeight: 500,
                textTransform: 'uppercase',
                letterSpacing: '0.04em',
              }}
            >
              {article.source}
            </span>
            <div
              style={{
                width: 2,
                height: 2,
                borderRadius: '50%',
                background: '#1c1c1c',
                flexShrink: 0,
              }}
            />
            <span style={{ fontSize: 9, color: '#181818' }}>{relTime(article.publishedAt)}</span>
          </div>
          <div
            style={{
              fontSize: 12,
              color: '#848484',
              lineHeight: 1.38,
              marginBottom: 5,
            }}
          >
            {article.title}
          </div>
          <div onClick={e => e.preventDefault()}>
            <KISummaryButton article={article} small />
          </div>
        </div>
        {article.imageUrl && (
          <div
            style={{
              width: 42,
              height: 42,
              borderRadius: 8,
              flexShrink: 0,
              overflow: 'hidden',
            }}
          >
            <img
              src={article.imageUrl}
              alt=""
              style={{ width: '100%', height: '100%', objectFit: 'cover', opacity: 0.75 }}
              onError={e => {
                (e.currentTarget.parentElement as HTMLElement).style.display = 'none'
              }}
            />
          </div>
        )}
      </div>
    </a>
  )
}

interface FeedSectionProps {
  title: string
  articles: Article[]
  initialCount?: number
}

export function FeedSection({ title, articles, initialCount = 7 }: FeedSectionProps) {
  const [expanded, setExpanded] = useState(false)

  if (!articles || articles.length === 0) return null

  const visible = expanded ? articles : articles.slice(0, initialCount)
  const hiddenCount = articles.length - initialCount

  const bigCard = visible[0]
  const halfCards = visible.slice(1, 3)
  const compactItems = visible.slice(3)

  return (
    <div style={{ padding: '20px 18px 0' }} className="feed-section">
      {/* Section Divider */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          marginBottom: 14,
        }}
      >
        <div style={{ flex: 1, height: '0.5px', background: '#111' }} />
        <span
          style={{
            fontSize: 10,
            fontWeight: 500,
            color: '#282828',
            letterSpacing: '0.12em',
            textTransform: 'uppercase',
            whiteSpace: 'nowrap',
          }}
        >
          {title}
        </span>
        <span style={{ fontSize: 10, color: '#1c1c1c' }}>{articles.length} Artikel</span>
        <div style={{ flex: 1, height: '0.5px', background: '#111' }} />
      </div>

      {/* Big card — first article */}
      <BigCard article={bigCard} />

      {/* Two-column — articles 2 & 3 */}
      {halfCards.length > 0 && (
        <div style={{ display: 'flex', gap: 7, marginBottom: 8 }}>
          {halfCards.map(article => (
            <HalfCard key={article.id} article={article} />
          ))}
        </div>
      )}

      {/* Compact list — remaining visible articles */}
      {compactItems.length > 0 && (
        <div
          style={{
            background: 'var(--bg-card)',
            border: '0.5px solid #141414',
            borderRadius: 16,
            overflow: 'hidden',
            marginBottom: 8,
          }}
        >
          {compactItems.map((article, i) => (
            <CompactItem
              key={article.id}
              article={article}
              isLast={i === compactItems.length - 1}
            />
          ))}
        </div>
      )}

      {/* Mehr anzeigen */}
      {hiddenCount > 0 && (
        <div
          onClick={() => setExpanded(e => !e)}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 7,
            padding: 11,
            color: '#1e1e1e',
            fontSize: 11,
            cursor: 'pointer',
          }}
        >
          <div style={{ display: 'flex', gap: 3 }}>
            {[0, 1, 2].map(i => (
              <div
                key={i}
                style={{ width: 3, height: 3, borderRadius: '50%', background: '#1c1c1c' }}
              />
            ))}
          </div>
          <span>
            {expanded ? 'Weniger anzeigen' : `${hiddenCount} weitere Meldungen`}
          </span>
          <ChevronDown
            size={11}
            color="#1e1e1e"
            style={{
              transform: expanded ? 'rotate(180deg)' : 'none',
              transition: 'transform 0.2s',
            }}
          />
        </div>
      )}
    </div>
  )
}
