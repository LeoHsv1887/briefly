'use client'
import { useEffect, useState } from 'react'
import type { Article } from '@/lib/types'
import { addBookmark, removeBookmark, isBookmarked } from '@/lib/bookmarks'
import { getTopicColors, getTopicIcon } from '@/lib/topicColors'
import { timeAgo } from '@/lib/time'
import { TopicPill } from '@/components/FeedCards'

interface Props {
  article: Article
  onClose: () => void
  relatedArticles?: Article[]
}

function hostname(url: string, fallback: string): string {
  try { return new URL(url).hostname.replace('www.', '') } catch { return fallback }
}

export function ArticleReader({ article, onClose, relatedArticles = [] }: Props) {
  const [summary, setSummary] = useState<string | null>(null)
  const [loadingSummary, setLoadingSummary] = useState(false)
  const [bookmarked, setBookmarked] = useState(false)
  const [articleText, setArticleText] = useState<string | null>(null)
  const [isPaywall, setIsPaywall] = useState(false)
  const [loadingText, setLoadingText] = useState(false)

  const colors = getTopicColors(article.topic)

  useEffect(() => {
    setBookmarked(isBookmarked(article.id))
    setSummary(null)
    setArticleText(null)
    setIsPaywall(false)
    loadSummary()
    loadFullText()
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
    } else {
      addBookmark({
        id: article.id, title: article.title, url: article.url,
        source: article.source, topic: article.topic,
        publishedAt: article.publishedAt, imageUrl: article.imageUrl ?? null,
        savedAt: new Date().toISOString(),
      })
    }
    setBookmarked(b => !b)
  }

  function shareArticle() {
    if (navigator.share) navigator.share({ title: article.title, url: article.url })
    else navigator.clipboard?.writeText(article.url)
  }

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 200,
      background: 'var(--bg0)', overflowY: 'auto', WebkitOverflowScrolling: 'touch',
      animation: 'fadeSlideUp 0.3s ease both',
    } as React.CSSProperties}>

      {/* Hero */}
      <div style={{ height: 320, position: 'relative', overflow: 'hidden', flexShrink: 0 }}>
        {article.imageUrl ? (
          <img src={article.imageUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            onError={e => (e.currentTarget.style.display = 'none')} />
        ) : (
          <div style={{ width: '100%', height: '100%', background: colors.bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <i className={`ti ${getTopicIcon(article.topic)}`} style={{ fontSize: 80, color: colors.color, opacity: 0.3 }} />
          </div>
        )}
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to bottom, rgba(0,0,0,0) 30%, rgba(17,18,20,0.98) 100%)' }} />

        <div style={{ position: 'absolute', top: 54, left: 16, right: 16, display: 'flex', justifyContent: 'space-between' }}>
          <div onClick={onClose} style={{ width: 36, height: 36, borderRadius: '50%',
            background: 'rgba(255,255,255,0.1)', border: '0.5px solid rgba(255,255,255,0.15)',
            backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' } as React.CSSProperties}>
            <i className="ti ti-arrow-left" style={{ fontSize: 16, color: 'rgba(255,255,255,0.7)' }} />
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <div onClick={toggleBookmark} style={{ width: 36, height: 36, borderRadius: '50%',
              background: 'rgba(255,255,255,0.1)', border: '0.5px solid rgba(255,255,255,0.15)',
              backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' } as React.CSSProperties}>
              <i className={`ti ${bookmarked ? 'ti-bookmark-filled' : 'ti-bookmark'}`} style={{ fontSize: 16, color: bookmarked ? 'var(--acc)' : 'rgba(255,255,255,0.7)' }} />
            </div>
            <div onClick={shareArticle} style={{ width: 36, height: 36, borderRadius: '50%',
              background: 'rgba(255,255,255,0.1)', border: '0.5px solid rgba(255,255,255,0.15)',
              backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' } as React.CSSProperties}>
              <i className="ti ti-share" style={{ fontSize: 16, color: 'rgba(255,255,255,0.7)' }} />
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div style={{ padding: '0 20px 40px' }}>
        <TopicPill topic={article.topic} />
        <div style={{ marginTop: 10, fontSize: 24, fontWeight: 800, color: 'var(--t1)', lineHeight: 1.25, letterSpacing: '-0.02em', marginBottom: 12 }}>
          {article.title}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 20, paddingBottom: 20, borderBottom: '0.5px solid var(--line)' }}>
          <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--t3)', letterSpacing: '0.04em', textTransform: 'uppercase' }}>{article.source}</span>
          <div style={{ width: 3, height: 3, borderRadius: '50%', background: 'var(--line2)' }} />
          <span style={{ fontSize: 12, color: 'var(--t3)' }}>{timeAgo(article.publishedAt)}</span>
        </div>

        {/* KI-Zusammenfassung */}
        <div style={{ background: 'var(--bg1)', border: '0.5px solid var(--line)', borderRadius: 16, padding: '14px 15px', marginBottom: 22 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10 }}>
            <i className="ti ti-sparkles" style={{ fontSize: 12, color: 'var(--t3)' }} />
            <span style={{ fontSize: 9, fontWeight: 700, color: 'var(--t4)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>KI-Zusammenfassung</span>
          </div>
          <div style={{ fontSize: 13, color: 'var(--t2)', lineHeight: 1.7 }}>
            {loadingSummary
              ? <span style={{ color: 'var(--t4)' }}>Zusammenfassung wird geladen…</span>
              : (summary ?? <span style={{ color: 'var(--t4)' }}>Nicht verfügbar.</span>)}
          </div>
        </div>

        {/* Divider */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 18 }}>
          <div style={{ flex: 1, height: '0.5px', background: 'var(--line)' }} />
          <span style={{ fontSize: 10, color: 'var(--t4)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
            {isPaywall ? 'Vorschau' : 'Vollständiger Artikel'}
          </span>
          <div style={{ flex: 1, height: '0.5px', background: 'var(--line)' }} />
        </div>

        {isPaywall && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'var(--bg1)', border: '0.5px solid var(--line)', borderRadius: 12, padding: '10px 13px', marginBottom: 16 }}>
            <i className="ti ti-lock" style={{ fontSize: 14, color: 'var(--t4)', flexShrink: 0 }} />
            <span style={{ fontSize: 12, color: 'var(--t4)', lineHeight: 1.5 }}>
              Dieser Artikel ist teilweise hinter einer Paywall. Es wird so viel wie möglich angezeigt.
            </span>
          </div>
        )}

        {loadingText ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '20px 0', marginBottom: 16 }}>
            <span className="spinner" />
            <span style={{ fontSize: 12, color: 'var(--t4)' }}>Artikel wird geladen…</span>
          </div>
        ) : articleText ? (
          <div style={{ marginBottom: 24 }}>
            {articleText.split('\n\n').map((p, i) => p.trim().length > 0 && (
              <p key={i} style={{ fontSize: 15, color: 'var(--t2)', lineHeight: 1.85, marginBottom: 16 }}>{p.trim()}</p>
            ))}
          </div>
        ) : (
          <div style={{ fontSize: 13, color: 'var(--t4)', lineHeight: 1.7, marginBottom: 20, fontStyle: 'italic' }}>
            Artikel-Text konnte nicht geladen werden.
          </div>
        )}

        {/* Original lesen */}
        <a href={article.url} target="_blank" rel="noopener noreferrer" style={{
          display: 'flex', alignItems: 'center', gap: 10,
          padding: '13px 15px', borderRadius: 14, marginBottom: 28,
          background: 'var(--bg1)', border: '0.5px solid var(--line)', textDecoration: 'none',
        }}>
          <div style={{ width: 28, height: 28, borderRadius: 8, background: 'var(--bg2)', border: '0.5px solid var(--line)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <i className="ti ti-external-link" style={{ fontSize: 13, color: 'var(--t4)' }} />
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 12, color: 'var(--t2)' }}>
              {isPaywall ? 'Vollständigen Artikel lesen (Abo erforderlich)' : 'Artikel auf Originalseite öffnen'}
            </div>
            <div style={{ fontSize: 10, color: 'var(--t4)', marginTop: 2 }}>{hostname(article.url, article.source)}</div>
          </div>
          <i className="ti ti-chevron-right" style={{ fontSize: 14, color: 'var(--t4)' }} />
        </a>

        {/* Ähnliche Artikel */}
        {relatedArticles.length > 0 && (
          <>
            <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--t4)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 12 }}>
              Ähnliche Artikel
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 20 }}>
              {relatedArticles.slice(0, 3).map(related => (
                <a key={related.id} href={related.url} target="_blank" rel="noopener noreferrer" style={{
                  background: 'var(--bg1)', border: '0.5px solid var(--line)', borderRadius: 14, padding: '12px 13px',
                  display: 'flex', gap: 10, alignItems: 'flex-start', textDecoration: 'none',
                }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 9, color: 'var(--t4)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 4 }}>
                      {related.source} · {timeAgo(related.publishedAt)}
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--t2)', lineHeight: 1.4 }}>{related.title}</div>
                  </div>
                  <div style={{ width: 52, height: 52, borderRadius: 10, flexShrink: 0, overflow: 'hidden', background: 'var(--bg2)' }}>
                    {related.imageUrl && (
                      <img src={related.imageUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                        onError={e => (e.currentTarget.style.display = 'none')} />
                    )}
                  </div>
                </a>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
