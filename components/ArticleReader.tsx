'use client'
import { useState, useEffect } from 'react'
import { ChevronLeft, Bookmark, Share2, ExternalLink, Sparkles } from 'lucide-react'
import type { Article } from '@/lib/types'
import { addBookmark, removeBookmark, isBookmarked } from '@/lib/bookmarks'

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const minutes = Math.floor(diff / 60000)
  if (minutes < 60) return `vor ${minutes} Min.`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `vor ${hours} Std.`
  return `vor ${Math.floor(hours / 24)} Tagen`
}

function hostname(url: string): string {
  try { return new URL(url).hostname.replace('www.', '') } catch { return url }
}

interface Props {
  article: Article
  onClose: () => void
  relatedArticles?: Article[]
}

export function ArticleReader({ article, onClose, relatedArticles = [] }: Props) {
  const [summary, setSummary]           = useState<string | null>(null)
  const [summaryOpen, setSummaryOpen]   = useState(true)
  const [loadingSummary, setLoadingSummary] = useState(false)
  const [bookmarked, setBookmarked]     = useState(false)

  useEffect(() => {
    setBookmarked(isBookmarked(article.id))
    setSummary(null)
    setSummaryOpen(true)
    loadSummary()
  }, [article.id])

  async function loadSummary() {
    setLoadingSummary(true)
    try {
      const res = await fetch('/api/summarize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: article.title,
          url: article.url,
          content: article.content || article.title,
        }),
      })
      const data = await res.json()
      setSummary(data.summary ?? null)
    } catch {}
    setLoadingSummary(false)
  }

  function toggleBookmark() {
    if (bookmarked) {
      removeBookmark(article.id)
      setBookmarked(false)
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
      setBookmarked(true)
    }
  }

  function shareArticle() {
    if (navigator.share) {
      navigator.share({ title: article.title, url: article.url })
    } else {
      navigator.clipboard?.writeText(article.url)
    }
  }

  return (
    <div style={{
      position: 'fixed', inset: 0, background: '#060606', zIndex: 100,
      overflowY: 'auto', WebkitOverflowScrolling: 'touch' as React.CSSProperties['WebkitOverflowScrolling'],
    }}>

      {/* Top bar */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '52px 18px 12px',
        position: 'sticky', top: 0,
        background: 'linear-gradient(to bottom, #060606 80%, transparent)',
        zIndex: 10,
      }}>
        <div onClick={onClose} style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', padding: '4px 0' }}>
          <ChevronLeft size={20} color="#444" />
          <span style={{ fontSize: 11, color: '#2a2a2a' }}>Zurück</span>
        </div>
        <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 13, color: '#2a2a2a', letterSpacing: '0.06em' }}>
          Briefly
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <Bookmark
            size={18}
            color={bookmarked ? '#2a5aaa' : '#2a2a2a'}
            fill={bookmarked ? '#2a5aaa' : 'none'}
            onClick={toggleBookmark}
            style={{ cursor: 'pointer' }}
          />
          <Share2 size={17} color="#2a2a2a" onClick={shareArticle} style={{ cursor: 'pointer' }} />
        </div>
      </div>

      {/* Hero image */}
      <div style={{ height: 220, position: 'relative', overflow: 'hidden', marginTop: -20 }}>
        {article.imageUrl ? (
          <img
            src={article.imageUrl}
            alt=""
            style={{ width: '100%', height: '100%', objectFit: 'cover', opacity: 0.6 }}
            onError={e => { (e.currentTarget.parentElement as HTMLElement).style.background = 'linear-gradient(135deg,#0a1218,#141e2a)' }}
          />
        ) : (
          <div style={{ width: '100%', height: '100%', background: 'linear-gradient(135deg,#0a1218,#141e2a)' }} />
        )}
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to bottom, transparent 30%, #060606 100%)' }} />
      </div>

      {/* Content */}
      <div style={{ padding: '0 22px', marginTop: -30, position: 'relative', zIndex: 1 }}>

        {/* Meta */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 12, flexWrap: 'wrap' }}>
          <span style={{ fontSize: 9, fontWeight: 500, color: '#444', background: '#0e0e0e', border: '0.5px solid #1a1a1a', borderRadius: 20, padding: '3px 9px', letterSpacing: '0.04em' }}>
            {article.topic}
          </span>
          <div style={{ width: 2, height: 2, borderRadius: '50%', background: '#1c1c1c' }} />
          <span style={{ fontSize: 9, color: '#2a2a2a', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.04em' }}>{article.source}</span>
          <div style={{ width: 2, height: 2, borderRadius: '50%', background: '#1c1c1c' }} />
          <span style={{ fontSize: 9, color: '#1e1e1e' }}>{timeAgo(article.publishedAt)}</span>
        </div>

        {/* Headline */}
        <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 22, fontWeight: 400, color: '#ebe7df', lineHeight: 1.35, marginBottom: 18 }}>
          {article.title}
        </div>

        {/* KI-Zusammenfassung */}
        <div style={{ background: '#0e0e0e', border: '0.5px solid #1a1a1a', borderRadius: 14, padding: '13px 14px', marginBottom: 22 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: summaryOpen ? 10 : 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <Sparkles size={11} color="#555" />
              <span style={{ fontSize: 9, fontWeight: 500, color: '#444', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
                KI-Zusammenfassung
              </span>
            </div>
            <span onClick={() => setSummaryOpen(o => !o)} style={{ fontSize: 10, color: '#2a2a2a', cursor: 'pointer' }}>
              {summaryOpen ? 'Ausblenden' : 'Einblenden'}
            </span>
          </div>
          {summaryOpen && (
            <div style={{ fontSize: 12, color: '#686460', lineHeight: 1.7 }}>
              {loadingSummary
                ? <span style={{ color: '#2a2a2a' }}>Zusammenfassung wird geladen…</span>
                : (summary ?? <span style={{ color: '#2a2a2a' }}>Nicht verfügbar.</span>)
              }
            </div>
          )}
        </div>

        {/* Divider */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 18 }}>
          <div style={{ flex: 1, height: '0.5px', background: '#111' }} />
          <span style={{ fontSize: 9, color: '#1e1e1e', letterSpacing: '0.06em', textTransform: 'uppercase' }}>Artikel</span>
          <div style={{ flex: 1, height: '0.5px', background: '#111' }} />
        </div>

        {/* Article text */}
        {article.content ? (
          <div style={{ fontSize: 14, color: '#848484', lineHeight: 1.8, marginBottom: 20 }}>
            {article.content}
          </div>
        ) : (
          <div style={{ fontSize: 13, color: '#2a2a2a', lineHeight: 1.7, marginBottom: 20, fontStyle: 'italic' }}>
            Der vollständige Artikel ist auf der Webseite des Herausgebers verfügbar.
          </div>
        )}

        {/* Original link */}
        <div
          onClick={() => window.open(article.url, '_blank')}
          style={{ background: '#0e0e0e', border: '0.5px solid #141414', borderRadius: 14, padding: '13px 15px', display: 'flex', alignItems: 'center', gap: 10, marginBottom: 28, cursor: 'pointer' }}
        >
          <div style={{ width: 28, height: 28, borderRadius: 7, background: '#0a0a0a', border: '0.5px solid #141414', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <ExternalLink size={13} color="#2a2a2a" />
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 11, color: '#686460' }}>Vollständigen Artikel lesen</div>
            <div style={{ fontSize: 9, color: '#2a2a2a', marginTop: 2 }}>{hostname(article.url)}</div>
          </div>
          <ChevronLeft size={13} color="#1c1c1c" style={{ transform: 'rotate(180deg)' }} />
        </div>

        {/* Related articles */}
        {relatedArticles.length > 0 && (
          <>
            <div style={{ fontSize: 9, fontWeight: 500, color: '#1e1e1e', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 12 }}>
              Ähnliche Artikel
            </div>
            <div style={{ background: '#0e0e0e', border: '0.5px solid #141414', borderRadius: 14, overflow: 'hidden', marginBottom: 32 }}>
              {relatedArticles.slice(0, 3).map((related, i) => (
                <div
                  key={related.id}
                  onClick={() => window.open(related.url, '_blank')}
                  style={{ padding: '11px 13px', borderBottom: i < 2 ? '0.5px solid #0c0c0c' : 'none', cursor: 'pointer' }}
                >
                  <div style={{ fontSize: 9, color: '#2a2a2a', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 4 }}>
                    {related.source} · {timeAgo(related.publishedAt)}
                  </div>
                  <div style={{ fontSize: 12, color: '#848484', lineHeight: 1.38 }}>{related.title}</div>
                </div>
              ))}
            </div>
          </>
        )}

      </div>
    </div>
  )
}
