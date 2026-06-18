'use client'
import { useEffect, useState } from 'react'
import { Bookmark } from 'lucide-react'
import { getBookmarks, removeBookmark } from '@/lib/bookmarks'
import type { BookmarkedArticle } from '@/lib/bookmarks'
import { KISummaryButton } from '@/components/KISummaryButton'

function relTime(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const min = Math.floor(diff / 60_000)
  if (min < 1) return 'gerade'
  if (min < 60) return `vor ${min} Min.`
  const h = Math.floor(min / 60)
  if (h < 24) return `vor ${h} Std.`
  const d = Math.floor(h / 24)
  return `vor ${d} Tag${d > 1 ? 'en' : ''}`
}

function BigCard({ article, onRemove, onArticleClick }: { article: BookmarkedArticle; onRemove: () => void; onArticleClick: (a: BookmarkedArticle) => void }) {
  return (
    <div
      onClick={() => onArticleClick(article)}
      style={{ display: 'block', textDecoration: 'none', marginBottom: 8, cursor: 'pointer' }}
    >
      <div style={{ background: 'var(--bg-card)', border: '0.5px solid #141414', borderRadius: 18, padding: '14px 15px' }}>
        <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 7, flexWrap: 'wrap' }}>
              <span style={{ fontSize: 9, color: '#282828', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                {article.source}
              </span>
              <div style={{ width: 2, height: 2, borderRadius: '50%', background: '#1c1c1c', flexShrink: 0 }} />
              <span style={{ fontSize: 9, color: '#1c1c1c' }}>{relTime(article.publishedAt)}</span>
              <span style={{ fontSize: 9, color: '#363636', background: '#0a0a0a', border: '0.5px solid #161616', borderRadius: 20, padding: '2px 7px' }}>
                {article.topic}
              </span>
            </div>
            <div style={{ fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Display', 'Helvetica Neue', sans-serif", fontSize: 16, fontWeight: 300, color: '#f0ece6', lineHeight: 1.42, marginBottom: 6 }}>
              {article.title}
            </div>
            <div style={{ fontSize: 9, color: '#2a2a2a', marginBottom: 9 }}>
              Gespeichert {relTime(article.savedAt)}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }} onClick={e => e.stopPropagation()}>
              <KISummaryButton article={article} />
              <button
                onClick={e => { e.stopPropagation(); onRemove(); }}
                style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 2 }}
                aria-label="Lesezeichen entfernen"
              >
                <Bookmark size={14} color="#2a5aaa" fill="#2a5aaa" strokeWidth={1.8} />
              </button>
            </div>
          </div>
          {article.imageUrl && (
            <div style={{ width: 72, height: 72, borderRadius: 12, flexShrink: 0, overflow: 'hidden' }}>
              <img
                src={article.imageUrl}
                alt=""
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                onError={e => { (e.currentTarget.parentElement as HTMLElement).style.display = 'none' }}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function HalfCard({ article, onRemove, onArticleClick }: { article: BookmarkedArticle; onRemove: () => void; onArticleClick: (a: BookmarkedArticle) => void }) {
  return (
    <div
      onClick={() => onArticleClick(article)}
      style={{ display: 'block', textDecoration: 'none', flex: 1, minWidth: 0, cursor: 'pointer' }}
    >
      <div style={{ background: 'var(--bg-card)', border: '0.5px solid #141414', borderRadius: 16, overflow: 'hidden', height: '100%' }}>
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
          <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 5, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 9, color: '#282828', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              {article.source}
            </span>
            <span style={{ fontSize: 8, color: '#303030', background: '#0a0a0a', border: '0.5px solid #161616', borderRadius: 20, padding: '2px 6px' }}>
              {article.topic}
            </span>
          </div>
          <div style={{ fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Display', 'Helvetica Neue', sans-serif", fontSize: 13, fontWeight: 300, color: '#c8c4be', lineHeight: 1.38, marginBottom: 7 }}>
            {article.title}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }} onClick={e => e.stopPropagation()}>
            <KISummaryButton article={article} small />
            <button
              onClick={e => { e.stopPropagation(); onRemove(); }}
              style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 2 }}
            >
              <Bookmark size={12} color="#2a5aaa" fill="#2a5aaa" strokeWidth={1.8} />
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

interface BookmarksTabProps {
  onArticleClick: (article: BookmarkedArticle) => void
}

export function BookmarksTab({ onArticleClick }: BookmarksTabProps) {
  const [bookmarks, setBookmarks] = useState<BookmarkedArticle[]>([])

  useEffect(() => { setBookmarks(getBookmarks()) }, [])

  function handleRemove(id: string) {
    removeBookmark(id)
    setBookmarks(getBookmarks())
  }

  if (bookmarks.length === 0) {
    return (
      <div style={{ padding: '22px 22px 0' }}>
        <div style={{ fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Display', 'Helvetica Neue', sans-serif", fontSize: 12, color: '#2a2a2a', letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 22 }}>
          Briefly
        </div>
        <div style={{ fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Display', 'Helvetica Neue', sans-serif", fontSize: 28, fontWeight: 200, color: '#f2ede8', lineHeight: 1.15, marginBottom: 40 }}>
          Gespeichert
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14 }}>
          <Bookmark size={32} color="#141414" />
          <div style={{ fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Display', 'Helvetica Neue', sans-serif", fontSize: 16, color: '#2a2a2a', textAlign: 'center' }}>
            Noch nichts gespeichert.
          </div>
          <div style={{ fontSize: 12, color: '#1e1e1e', textAlign: 'center', lineHeight: 1.6 }}>
            Tippe auf das Lesezeichen-Icon,<br />um Artikel zu speichern.
          </div>
        </div>
      </div>
    )
  }

  // Build groups: [BigCard, HalfCard, HalfCard] repeated
  const groups: { big: BookmarkedArticle; halves: BookmarkedArticle[] }[] = []
  for (let i = 0; i < bookmarks.length; i += 3) {
    groups.push({ big: bookmarks[i], halves: bookmarks.slice(i + 1, i + 3) })
  }

  return (
    <div style={{ paddingBottom: 24 }}>

      {/* ── Header ── */}
      <div style={{ padding: '22px 22px 0' }}>
        <div style={{ fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Display', 'Helvetica Neue', sans-serif", fontSize: 12, color: '#2a2a2a', letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 22 }}>
          Briefly
        </div>
        <div style={{ fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Display', 'Helvetica Neue', sans-serif", fontSize: 28, fontWeight: 200, color: '#f2ede8', lineHeight: 1.15, marginBottom: 5 }}>
          Gespeichert
        </div>
        <div style={{ fontSize: 11, color: '#2e2e2e', letterSpacing: '0.03em', paddingBottom: 18 }}>
          {bookmarks.length} {bookmarks.length === 1 ? 'Artikel' : 'Artikel'}
        </div>
      </div>

      {/* ── Article groups ── */}
      <div style={{ padding: '0 18px' }}>
        {groups.map((group, gi) => (
          <div key={group.big.id}>
            <BigCard article={group.big} onRemove={() => handleRemove(group.big.id)} onArticleClick={onArticleClick} />
            {group.halves.length > 0 && (
              <div style={{ display: 'flex', gap: 7, marginBottom: 8 }}>
                {group.halves.map(article => (
                  <HalfCard key={article.id} article={article} onRemove={() => handleRemove(article.id)} onArticleClick={onArticleClick} />
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
