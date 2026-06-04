'use client'
import { useEffect, useState } from 'react'
import { Bookmark, Sparkles } from 'lucide-react'
import { getBookmarks, removeBookmark } from '@/lib/bookmarks'
import type { BookmarkedArticle } from '@/lib/bookmarks'

const TOPIC_STYLE: Record<string, { bg: string; color: string }> = {
  'Wirtschaft & Finanzen': { bg: '#1a2a1e', color: '#22c47a' },
  'Politik DE/EU':         { bg: '#1e1e2e', color: '#7b7fe0' },
  'Geopolitik':            { bg: '#2a1e1a', color: '#d4844a' },
  'Aktienmärkte':          { bg: '#2a2310', color: '#d4a843' },
  'Technologie & KI':      { bg: '#1e2530', color: '#5ba8e0' },
  'Sport':                 { bg: '#251e2a', color: '#b87bd4' },
  'Allgemein':             { bg: '#1e1e1e', color: '#888' },
}

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

function BookmarkCard({ article, onRemove }: { article: BookmarkedArticle; onRemove: () => void }) {
  const [summary, setSummary] = useState<string | null>(null)
  const [loadingSummary, setLoadingSummary] = useState(false)
  const [showSummary, setShowSummary] = useState(false)
  const style = TOPIC_STYLE[article.topic] ?? TOPIC_STYLE['Allgemein']

  async function loadSummary(e: React.MouseEvent) {
    e.preventDefault()
    e.stopPropagation()
    if (summary) { setShowSummary(s => !s); return }
    setLoadingSummary(true)
    try {
      const res = await fetch('/api/summarize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: article.title, url: article.url, content: article.title, lang: 'de' }),
      })
      const data = await res.json()
      setSummary(data.summary || 'Zusammenfassung nicht verfügbar.')
      setShowSummary(true)
    } catch {
      setSummary('Zusammenfassung konnte nicht geladen werden.')
      setShowSummary(true)
    } finally {
      setLoadingSummary(false)
    }
  }

  return (
    <div style={{ borderBottom: '0.5px solid #181818' }}>
      <a
        href={article.url}
        target="_blank"
        rel="noopener noreferrer"
        className="block px-4 py-4 hover:bg-[#111] transition-colors"
      >
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2 min-w-0">
            <span
              className="text-[10px] font-medium px-1.5 py-0.5 rounded-full flex-shrink-0"
              style={{ background: style.bg, color: style.color }}
            >
              {article.topic}
            </span>
            <span className="text-[10px] text-[#484848] uppercase tracking-wider truncate">
              {article.source}
            </span>
          </div>
          <button
            onClick={(e) => { e.preventDefault(); e.stopPropagation(); onRemove() }}
            className="p-1 flex-shrink-0 hover:opacity-70 transition-opacity"
            aria-label="Lesezeichen entfernen"
          >
            <Bookmark size={15} fill="#c48a2a" color="#c48a2a" strokeWidth={1.8} />
          </button>
        </div>

        <p className="text-[14px] text-[#ccc] font-medium leading-snug mb-2">{article.title}</p>

        {showSummary && summary && (
          <p className="text-[13px] text-[#888] leading-relaxed mb-2 border-l-2 border-[#333] pl-3">
            {summary}
          </p>
        )}

        <div className="flex items-center justify-between mt-1">
          <button
            onClick={loadSummary}
            className="flex items-center gap-1.5 text-[11px] text-[#555] hover:text-[#888] transition-colors"
          >
            <Sparkles size={12} strokeWidth={1.5} />
            {loadingSummary ? 'Wird geladen…' : showSummary ? 'Zusammenfassung ausblenden' : 'KI-Zusammenfassung'}
          </button>
          <span className="text-[10px] text-[#333]">
            Gespeichert {relTime(article.savedAt)}
          </span>
        </div>
      </a>
    </div>
  )
}

export function BookmarksTab() {
  const [bookmarks, setBookmarks] = useState<BookmarkedArticle[]>([])

  useEffect(() => {
    setBookmarks(getBookmarks())
  }, [])

  function handleRemove(id: string) {
    removeBookmark(id)
    setBookmarks(getBookmarks())
  }

  if (bookmarks.length === 0) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '60px 20px', gap: 12 }}>
        <Bookmark size={32} color="#2a2a2a" />
        <p style={{ fontSize: 14, color: '#444', textAlign: 'center' }}>Noch keine gespeicherten Artikel.</p>
        <p style={{ fontSize: 12, color: '#333', textAlign: 'center' }}>Tippe auf das Lesezeichen-Icon um Artikel zu speichern.</p>
      </div>
    )
  }

  return (
    <div style={{ padding: '8px 0' }}>
      <div style={{ padding: '8px 16px 4px', fontSize: 11, fontWeight: 500, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#3a3a3a' }}>
        {bookmarks.length} gespeicherte Artikel
      </div>
      {bookmarks.map(article => (
        <BookmarkCard key={article.id} article={article} onRemove={() => handleRemove(article.id)} />
      ))}
    </div>
  )
}
