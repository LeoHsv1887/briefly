'use client'
import { useState, useEffect } from 'react'
import { ChevronLeft, ChevronRight, Bookmark, Share2, ExternalLink, Sparkles, Lock } from 'lucide-react'
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

interface Props {
  article: Article
  onClose: () => void
  relatedArticles?: Article[]
}

export function ArticleReader({ article, onClose, relatedArticles = [] }: Props) {
  const [summary, setSummary]               = useState<string | null>(null)
  const [summaryOpen, setSummaryOpen]       = useState(true)
  const [loadingSummary, setLoadingSummary] = useState(false)
  const [bookmarked, setBookmarked]         = useState(false)
  const [articleText, setArticleText]       = useState<string | null>(null)
  const [isPaywall, setIsPaywall]           = useState(false)
  const [loadingText, setLoadingText]       = useState(false)

  useEffect(() => {
    setBookmarked(isBookmarked(article.id))
    setSummary(null)
    setSummaryOpen(true)
    setArticleText(null)
    setIsPaywall(false)
    loadSummary()
    loadFullText()
  }, [article.id])

  async function loadSummary() {
    setLoadingSummary(true)
    try {
      const res = await fetch('/api/summarize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: article.title, url: article.url, content: article.content || article.title }),
      })
      const data = await res.json()
      setSummary(data.summary ?? null)
    } catch {}
    setLoadingSummary(false)
  }

  async function loadFullText() {
    setLoadingText(true)
    try {
      const res = await fetch('/api/article', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: article.url }),
      })
      const data = await res.json()
      if (data.success && data.text.length > 100) {
        setArticleText(data.text)
        setIsPaywall(data.isPaywall)
      } else {
        setArticleText(article.content ?? null)
      }
    } catch {
      setArticleText(article.content ?? null)
    }
    setLoadingText(false)
  }

  function toggleBookmark() {
    if (bookmarked) {
      removeBookmark(article.id)
      setBookmarked(false)
    } else {
      addBookmark({
        id: article.id, title: article.title, url: article.url,
        source: article.source, topic: article.topic,
        publishedAt: article.publishedAt, imageUrl: article.imageUrl ?? null,
        savedAt: new Date().toISOString(),
      })
      setBookmarked(true)
    }
  }

  function shareArticle() {
    if (navigator.share) { navigator.share({ title: article.title, url: article.url }) }
    else { navigator.clipboard?.writeText(article.url) }
  }

  function hostname(url: string): string {
    try { return new URL(url).hostname.replace('www.', '') } catch { return article.source }
  }

  return (
    <div style={{
      position: 'fixed', inset: 0, background: '#060606', zIndex: 100,
      overflowY: 'auto', WebkitOverflowScrolling: 'touch' as React.CSSProperties['WebkitOverflowScrolling'],
    }}>

      {/* ── Vollbild Hero ── */}
      <div style={{ height: 320, position: 'relative', overflow: 'hidden' }}>

        {article.imageUrl ? (
          <img
            src={article.imageUrl}
            alt=""
            style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }}
            onError={e => (e.currentTarget.style.display = 'none')}
          />
        ) : (
          <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(135deg,#1a2a3a,#0a1828,#2a1a2a)' }} />
        )}

        {/* Zurück + Actions – Glasmorphism */}
        <div style={{
          position: 'absolute', top: 0, left: 0, right: 0,
          padding: '50px 18px 0',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          background: 'linear-gradient(to bottom, rgba(0,0,0,0.5) 0%, transparent 100%)',
        }}>
          <div onClick={onClose} style={{
            display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer',
            background: 'rgba(0,0,0,0.3)', borderRadius: 20,
            padding: '6px 12px 6px 8px', backdropFilter: 'blur(8px)',
            WebkitBackdropFilter: 'blur(8px)' as React.CSSProperties['WebkitBackdropFilter'],
          }}>
            <ChevronLeft size={16} color="rgba(255,255,255,0.7)" />
            <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)' }}>Zurück</span>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <div onClick={toggleBookmark} style={{
              width: 32, height: 32, borderRadius: '50%',
              background: 'rgba(0,0,0,0.3)', backdropFilter: 'blur(8px)',
              WebkitBackdropFilter: 'blur(8px)' as React.CSSProperties['WebkitBackdropFilter'],
              display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
            }}>
              <Bookmark size={15} color={bookmarked ? '#2a5aaa' : 'rgba(255,255,255,0.6)'} fill={bookmarked ? '#2a5aaa' : 'none'} />
            </div>
            <div onClick={shareArticle} style={{
              width: 32, height: 32, borderRadius: '50%',
              background: 'rgba(0,0,0,0.3)', backdropFilter: 'blur(8px)',
              WebkitBackdropFilter: 'blur(8px)' as React.CSSProperties['WebkitBackdropFilter'],
              display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
            }}>
              <Share2 size={15} color="rgba(255,255,255,0.6)" />
            </div>
          </div>
        </div>

        {/* Meta + Headline auf dem Bild */}
        <div style={{
          position: 'absolute', bottom: 0, left: 0, right: 0, padding: '0 18px 18px',
          background: 'linear-gradient(to top, rgba(6,6,6,1) 0%, rgba(6,6,6,0.7) 50%, transparent 100%)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10, flexWrap: 'wrap' }}>
            <span style={{
              fontSize: 9, fontWeight: 500, color: 'rgba(255,255,255,0.5)',
              background: 'rgba(255,255,255,0.1)', border: '0.5px solid rgba(255,255,255,0.15)',
              borderRadius: 20, padding: '3px 9px', letterSpacing: '0.04em',
              backdropFilter: 'blur(4px)',
            }}>{article.topic}</span>
            <div style={{ width: 2, height: 2, borderRadius: '50%', background: 'rgba(255,255,255,0.2)' }} />
            <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.3)', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{article.source}</span>
            <div style={{ width: 2, height: 2, borderRadius: '50%', background: 'rgba(255,255,255,0.2)' }} />
            <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.2)' }}>{timeAgo(article.publishedAt)}</span>
          </div>
          <div style={{ fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Display', 'Helvetica Neue', sans-serif", fontSize: 20, fontWeight: 300, color: '#f2ede8', lineHeight: 1.3 }}>
            {article.title}
          </div>
        </div>
      </div>

      {/* ── Content-Bereich ── */}
      <div style={{ background: '#080808', padding: '18px 22px 0' }}>

        {/* KI-Zusammenfassung */}
        <div style={{ background: '#0e0e0e', border: '0.5px solid #1a1a1a', borderRadius: 14, padding: '13px 14px', marginBottom: 22 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: summaryOpen ? 10 : 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <Sparkles size={11} color="#555" />
              <span style={{ fontSize: 9, fontWeight: 500, color: '#444', letterSpacing: '0.06em', textTransform: 'uppercase' }}>KI-Zusammenfassung</span>
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
          <span style={{ fontSize: 9, color: '#1e1e1e', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
            {isPaywall ? 'Vorschau' : 'Vollständiger Artikel'}
          </span>
          <div style={{ flex: 1, height: '0.5px', background: '#111' }} />
        </div>

        {/* Paywall-Hinweis */}
        {isPaywall && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#0e0e0e', border: '0.5px solid #141414', borderRadius: 10, padding: '9px 12px', marginBottom: 14 }}>
            <Lock size={13} color="#2a2a2a" style={{ flexShrink: 0 }} />
            <span style={{ fontSize: 11, color: '#2a2a2a', lineHeight: 1.4 }}>
              Dieser Artikel ist teilweise hinter einer Paywall. Es wird so viel wie möglich angezeigt.
            </span>
          </div>
        )}

        {/* Artikel-Text */}
        {loadingText ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '20px 0', marginBottom: 16 }}>
            <div style={{ width: 14, height: 14, borderRadius: '50%', border: '1.5px solid #1e1e1e', borderTopColor: '#3a3a3a', animation: 'spin 0.7s linear infinite' }} />
            <span style={{ fontSize: 11, color: '#2a2a2a' }}>Artikel wird geladen…</span>
          </div>
        ) : articleText ? (
          <div style={{ marginBottom: 24 }}>
            {articleText.split('\n\n').map((paragraph, i) =>
              paragraph.trim().length > 0 && (
                <p key={i} style={{ fontSize: 15, color: '#9a9690', lineHeight: 1.85, marginBottom: 16, fontWeight: 300 }}>
                  {paragraph.trim()}
                </p>
              )
            )}
          </div>
        ) : (
          <div style={{ fontSize: 13, color: '#2a2a2a', lineHeight: 1.7, marginBottom: 20, fontStyle: 'italic' }}>
            Artikel-Text konnte nicht geladen werden.
          </div>
        )}

        {/* Original-Link */}
        <div
          onClick={() => window.open(article.url, '_blank')}
          style={{ background: '#0e0e0e', border: '0.5px solid #141414', borderRadius: 14, padding: '13px 15px', display: 'flex', alignItems: 'center', gap: 10, marginBottom: 28, cursor: 'pointer' }}
        >
          <div style={{ width: 28, height: 28, borderRadius: 7, background: '#0a0a0a', border: '0.5px solid #141414', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <ExternalLink size={13} color="#2a2a2a" />
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 11, color: '#686460' }}>
              {isPaywall ? 'Vollständigen Artikel lesen (Abo erforderlich)' : 'Artikel auf Originalseite öffnen'}
            </div>
            <div style={{ fontSize: 9, color: '#2a2a2a', marginTop: 2 }}>{hostname(article.url)}</div>
          </div>
          <ChevronRight size={13} color="#1c1c1c" />
        </div>

        {/* Ähnliche Artikel */}
        {relatedArticles.length > 0 && (
          <>
            <div style={{ fontSize: 9, fontWeight: 500, color: '#1e1e1e', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 12 }}>
              Ähnliche Artikel
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 40 }}>
              {relatedArticles.slice(0, 3).map(related => (
                <div
                  key={related.id}
                  onClick={() => window.open(related.url, '_blank')}
                  style={{ background: '#0e0e0e', border: '0.5px solid #141414', borderRadius: 14, padding: '12px 13px', display: 'flex', gap: 10, alignItems: 'flex-start', cursor: 'pointer' }}
                >
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 9, color: '#2a2a2a', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 4 }}>
                      {related.source} · {timeAgo(related.publishedAt)}
                    </div>
                    <div style={{ fontSize: 12, color: '#848484', lineHeight: 1.4 }}>{related.title}</div>
                  </div>
                  <div style={{ width: 52, height: 52, borderRadius: 10, flexShrink: 0, overflow: 'hidden', background: '#141414' }}>
                    {related.imageUrl ? (
                      <img src={related.imageUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', opacity: 0.8 }} onError={e => (e.currentTarget.style.display = 'none')} />
                    ) : (
                      <div style={{ width: '100%', height: '100%', background: '#111' }} />
                    )}
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

      </div>
    </div>
  )
}
