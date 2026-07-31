'use client'
import { useEffect, useRef, useState } from 'react'
import type { Article, TickerData } from '@/lib/types'
import { getTopicColors, getTopicIcon, getTopicShortLabel } from '@/lib/topicColors'
import { timeAgo } from '@/lib/time'
import { addBookmark, removeBookmark, isBookmarked } from '@/lib/bookmarks'
import { trackInteraction } from '@/lib/profile'

export type OnArticleClick = (article: Article) => void

// ─── TopicPill ──────────────────────────────────────────────────────────────

export function TopicPill({ topic, small = false }: { topic: string; small?: boolean }) {
  const c = getTopicColors(topic)
  return (
    <div style={{
      fontSize: small ? 8 : 9, fontWeight: 700, padding: small ? '2px 8px' : '3px 9px',
      borderRadius: 100, letterSpacing: '0.04em',
      background: c.bg, color: c.color, border: `0.5px solid ${c.border}`, whiteSpace: 'nowrap',
    }}>
      {getTopicShortLabel(topic)}
    </div>
  )
}

// ─── ArticleMeta ────────────────────────────────────────────────────────────

export function ArticleMeta({ article }: { article: Article }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8, flexWrap: 'wrap' }}>
      <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--t4)', letterSpacing: '0.05em', textTransform: 'uppercase' }}>
        {article.source}
      </span>
      <div style={{ width: 3, height: 3, borderRadius: '50%', background: 'var(--line2)', flexShrink: 0 }} />
      <span style={{ fontSize: 10, color: 'var(--t4)' }}>{timeAgo(article.publishedAt)}</span>
    </div>
  )
}

// ─── KIButton ───────────────────────────────────────────────────────────────

export function KIButton({ article, small = false, variant = 'default', onArticleClick }: {
  article: Article; small?: boolean; variant?: 'default' | 'glass'; onArticleClick?: OnArticleClick
}) {
  const [summary, setSummary] = useState<string | null>(null)
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)

  const glassStyle = variant === 'glass' ? {
    background: 'rgba(255,255,255,0.08)', border: '0.5px solid rgba(255,255,255,0.12)',
    color: 'rgba(255,255,255,0.5)',
  } : {
    background: 'var(--bg2)', border: '0.5px solid var(--line)', color: 'var(--t3)',
  }

  async function handleClick(e: React.MouseEvent) {
    e.stopPropagation()
    e.preventDefault()
    if (small && onArticleClick) { onArticleClick(article); return }
    if (summary) { setOpen(o => !o); return }
    if (loading) return
    setLoading(true)
    try {
      const res = await fetch('/api/summarize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: article.title, url: article.url, content: article.content ?? article.title, lang: 'de' }),
      })
      const data = await res.json()
      setSummary(data.summary || 'Zusammenfassung nicht verfügbar.')
      setOpen(true)
    } catch {
      setSummary('Zusammenfassung konnte nicht geladen werden.')
      setOpen(true)
    }
    setLoading(false)
  }

  return (
    <div>
      <div onClick={handleClick} style={{
        display: 'inline-flex', alignItems: 'center', gap: 4,
        fontSize: small ? 9 : 10, fontWeight: 600,
        borderRadius: 100, padding: small ? '4px 9px' : '5px 11px',
        cursor: 'pointer', ...glassStyle,
      }}>
        <i className="ti ti-sparkles" style={{ fontSize: small ? 9 : 10 }} />
        {loading ? 'Lädt…' : open ? 'Ausblenden' : small ? 'KI' : 'KI-Zusammenfassung'}
      </div>
      {!small && open && summary && (
        <div onClick={e => e.stopPropagation()} style={{
          fontSize: 12, color: 'var(--t2)', lineHeight: 1.65, marginTop: 8,
          padding: '10px 12px', background: 'var(--bg2)', borderRadius: 10, borderLeft: '2px solid var(--line2)',
        }}>
          {summary}
        </div>
      )}
    </div>
  )
}

// ─── BookmarkButton ─────────────────────────────────────────────────────────

export function BookmarkButton({ article, variant = 'default' }: { article: Article; variant?: 'default' | 'glass' }) {
  const [saved, setSaved] = useState(() => isBookmarked(article.id))

  function handleClick(e: React.MouseEvent) {
    e.stopPropagation()
    e.preventDefault()
    if (saved) {
      removeBookmark(article.id)
    } else {
      addBookmark({
        id: article.id, title: article.title, url: article.url, source: article.source,
        topic: article.topic, publishedAt: article.publishedAt, imageUrl: article.imageUrl ?? null,
        savedAt: new Date().toISOString(),
      })
    }
    setSaved(s => !s)
  }

  return (
    <div onClick={handleClick} style={{
      width: 32, height: 32, borderRadius: '50%', cursor: 'pointer',
      background: variant === 'glass' ? 'rgba(255,255,255,0.08)' : 'var(--bg2)',
      border: `0.5px solid ${variant === 'glass' ? 'rgba(255,255,255,0.12)' : 'var(--line)'}`,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: 16, color: saved ? 'var(--acc)' : (variant === 'glass' ? 'rgba(255,255,255,0.35)' : 'var(--t4)'),
      flexShrink: 0,
    }}>
      <i className={`ti ${saved ? 'ti-bookmark-filled' : 'ti-bookmark'}`} />
    </div>
  )
}

// ─── CardFooter ─────────────────────────────────────────────────────────────

export function CardFooter({ article }: { article: Article }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }} onClick={e => e.stopPropagation()}>
      <KIButton article={article} />
      <BookmarkButton article={article} />
    </div>
  )
}

// ─── Image placeholder helper ────────────────────────────────────────────────
// Placeholder always renders behind the image so a broken/missing image never
// leaves a blank hole — the colored topic icon shows through immediately.

function ArticleImage({ article, iconSize }: { article: Article; iconSize: number }) {
  const [imgError, setImgError] = useState(false)
  const colors = getTopicColors(article.topic)
  return (
    <>
      <div style={{ position: 'absolute', inset: 0, background: colors.bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <i className={`ti ${getTopicIcon(article.topic)}`} style={{ fontSize: iconSize, color: colors.color, opacity: 0.3 }} />
      </div>
      {article.imageUrl && !imgError && (
        <img src={article.imageUrl} alt="" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }}
          onError={() => setImgError(true)} />
      )}
    </>
  )
}

function click(article: Article, onArticleClick: OnArticleClick) {
  trackInteraction(article.topic)
  onArticleClick(article)
}

function isBreakingNews(article: Article): boolean {
  return article.score >= 9 && (Date.now() - new Date(article.publishedAt).getTime()) < 3 * 60 * 60 * 1000
}

// ─── HeroCard ───────────────────────────────────────────────────────────────

export function HeroCard({ article, onArticleClick }: { article: Article; onArticleClick: OnArticleClick }) {
  const isBreaking = isBreakingNews(article)

  return (
    <div onClick={() => click(article, onArticleClick)} style={{ position: 'relative', cursor: 'pointer' }}>
      <div style={{ height: 320, position: 'relative', overflow: 'hidden', background: 'var(--bg1)' }}>
        <ArticleImage article={article} iconSize={80} />
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to bottom, rgba(0,0,0,0) 20%, rgba(17,18,20,0.98) 100%)' }} />
        <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: '20px 20px 16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 12, flexWrap: 'wrap' }}>
            {isBreaking && (
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 9, fontWeight: 800,
                letterSpacing: '0.12em', textTransform: 'uppercase', padding: '4px 11px', borderRadius: 100,
                background: 'rgba(239,68,68,0.15)', color: '#fca5a5', border: '0.5px solid rgba(239,68,68,0.25)' }}>
                <span style={{ width: 5, height: 5, borderRadius: '50%', background: '#ef4444', display: 'inline-block' }} />
                Breaking
              </div>
            )}
            <TopicPill topic={article.topic} />
          </div>
          <div style={{ fontSize: 26, fontWeight: 900, color: '#fff', lineHeight: 1.15, letterSpacing: '-0.03em', marginBottom: 14 }}>
            {article.title}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <div style={{ fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.3)', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
                {article.source}
              </div>
              <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.2)', marginTop: 2 }}>
                {timeAgo(article.publishedAt)}
              </div>
            </div>
            <div style={{ display: 'flex', gap: 8 }} onClick={e => e.stopPropagation()}>
              <KIButton article={article} variant="glass" />
              <BookmarkButton article={article} variant="glass" />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── HeroCarousel ───────────────────────────────────────────────────────────

export function HeroCarousel({ articles, onArticleClick }: { articles: Article[]; onArticleClick: OnArticleClick }) {
  const [current, setCurrent] = useState(0)
  const [dragStart, setDragStart] = useState(0)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const startTimer = () => {
    if (articles.length <= 1) return
    timerRef.current = setInterval(() => {
      setCurrent(prev => (prev + 1) % articles.length)
    }, 4000)
  }

  const stopTimer = () => {
    if (timerRef.current) clearInterval(timerRef.current)
  }

  useEffect(() => {
    setCurrent(0)
    startTimer()
    return stopTimer
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [articles.length])

  function handleTouchStart(e: React.TouchEvent) {
    setDragStart(e.touches[0].clientX)
    stopTimer()
  }

  function handleTouchEnd(e: React.TouchEvent) {
    const diff = dragStart - e.changedTouches[0].clientX
    if (Math.abs(diff) > 50) {
      if (diff > 0) setCurrent(prev => (prev + 1) % articles.length)
      else setCurrent(prev => (prev - 1 + articles.length) % articles.length)
    }
    startTimer()
  }

  if (!articles.length) return null
  const article = articles[current] ?? articles[0]
  const isBreaking = isBreakingNews(article)

  return (
    <div
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      onClick={() => click(article, onArticleClick)}
      style={{ position: 'relative', cursor: 'pointer', userSelect: 'none' }}
    >
      <div style={{ height: 320, position: 'relative', overflow: 'hidden', background: 'var(--bg1)' }}>
        <ArticleImage article={article} iconSize={80} />
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to bottom, rgba(0,0,0,0) 20%, rgba(17,18,20,0.98) 100%)' }} />
        <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: '20px 20px 16px', zIndex: 2 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 12, flexWrap: 'wrap' }}>
            {isBreaking && (
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 9, fontWeight: 800,
                letterSpacing: '0.12em', textTransform: 'uppercase', padding: '4px 11px', borderRadius: 100,
                background: 'rgba(239,68,68,0.15)', color: '#fca5a5', border: '0.5px solid rgba(239,68,68,0.25)' }}>
                <span style={{ width: 5, height: 5, borderRadius: '50%', background: '#ef4444', display: 'inline-block' }} />
                Breaking
              </div>
            )}
            <TopicPill topic={article.topic} />
          </div>
          <div style={{ fontSize: 24, fontWeight: 900, color: '#fff', lineHeight: 1.18, letterSpacing: '-0.03em', marginBottom: 14 }}>
            {article.title}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <div style={{ fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.3)', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
                {article.source}
              </div>
              <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.2)', marginTop: 2 }}>
                {timeAgo(article.publishedAt)}
              </div>
            </div>
            <div style={{ display: 'flex', gap: 8 }} onClick={e => e.stopPropagation()}>
              <KIButton article={article} variant="glass" />
              <BookmarkButton article={article} variant="glass" />
            </div>
          </div>
        </div>
      </div>

      {articles.length > 1 && (
        <div style={{ display: 'flex', justifyContent: 'center', gap: 5, padding: '10px 0 4px' }}>
          {articles.map((a, i) => (
            <div
              key={a.id}
              onClick={e => { e.stopPropagation(); setCurrent(i); stopTimer(); startTimer() }}
              style={{
                width: i === current ? 18 : 5,
                height: 5, borderRadius: i === current ? 3 : '50%',
                background: i === current ? 'var(--t2)' : 'var(--bg3)',
                transition: 'all 0.3s ease',
                cursor: 'pointer',
              }}
            />
          ))}
        </div>
      )}
    </div>
  )
}

// ─── BriefingCard ───────────────────────────────────────────────────────────

interface BriefingCardEpisode {
  available: boolean
  type?: 'morning' | 'evening'
  duration?: number
  topicCount?: number
}

export function BriefingCard({ episode, onNavigateToBriefing }: { episode: BriefingCardEpisode | null; onNavigateToBriefing: () => void }) {
  return (
    <div onClick={onNavigateToBriefing} style={{
      margin: '14px 14px 0', borderRadius: 20, padding: '16px 18px',
      background: 'var(--bg1)', border: '0.5px solid var(--line)',
      cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 14, position: 'relative', overflow: 'hidden',
    }}>
      <i className="ti ti-microphone-2" style={{ position: 'absolute', right: -8, top: '50%', transform: 'translateY(-50%)',
        fontSize: 80, color: 'var(--t1)', opacity: 0.03, pointerEvents: 'none' }} />
      <div style={{ width: 42, height: 42, borderRadius: 13, background: 'var(--bg2)', border: '0.5px solid var(--line)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        <i className="ti ti-microphone" style={{ fontSize: 18, color: 'var(--t3)' }} />
      </div>
      <div style={{ flex: 1, minWidth: 0, position: 'relative', zIndex: 1 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
          <span style={{ width: 5, height: 5, borderRadius: '50%', background: 'var(--up)', display: 'inline-block' }} />
          <span style={{ fontSize: 9, fontWeight: 700, color: 'var(--t3)', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
            {episode?.type === 'morning' ? 'Morning Brief' : 'Evening Brief'}
          </span>
        </div>
        <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--t1)' }}>
          {episode?.available ? 'Jetzt dein Briefing anhören' : 'Briefing generieren'}
        </div>
        {episode?.available && (
          <div style={{ fontSize: 11, color: 'var(--t4)', marginTop: 2 }}>
            {episode.duration} Min.{episode.topicCount ? ` · ${episode.topicCount} Themen` : ''}
          </div>
        )}
      </div>
      <i className="ti ti-chevron-right" style={{ fontSize: 18, color: 'var(--t4)', flexShrink: 0, position: 'relative', zIndex: 1 }} />
    </div>
  )
}

// ─── TickerRow ──────────────────────────────────────────────────────────────

export function TickerRow({ tickers }: { tickers: TickerData[] }) {
  if (!tickers.length) return null
  return (
    <div style={{ margin: '8px 14px 0', borderRadius: 16, overflow: 'hidden', background: 'var(--bg1)', border: '0.5px solid var(--line)', display: 'flex' }}>
      {tickers.slice(0, 4).map((tk, i, arr) => (
        <div key={tk.symbol} style={{ flex: 1, padding: '11px 0 11px 12px', borderRight: i < arr.length - 1 ? '0.5px solid var(--line)' : 'none', minWidth: 0 }}>
          <div style={{ fontSize: 9, fontWeight: 700, color: 'var(--t4)', letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{tk.label}</div>
          <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--t1)', letterSpacing: '-0.01em', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{tk.formattedValue}</div>
          {tk.isMarketOpen ? (
            <div style={{ fontSize: 10, fontWeight: 700, color: tk.isPositive ? 'var(--up)' : 'var(--dn)', marginTop: 2 }}>
              {tk.isPositive ? '+' : ''}{tk.changePercent.toFixed(2)}%
            </div>
          ) : (
            <div style={{ fontSize: 9, color: 'var(--t4)', marginTop: 2 }}>Schluss</div>
          )}
        </div>
      ))}
    </div>
  )
}

// ─── TextCard ───────────────────────────────────────────────────────────────
// The dedicated layout for imageless articles: fixed, predictable height via
// line-clamping (no image slot, no empty boxes), a colored left rail in the
// article's topic color, and a small topic icon up top. `compact` produces
// the narrower variant used inside a SplitPair column.

function TextCard({ article, onArticleClick, compact = false }: { article: Article; onArticleClick: OnArticleClick; compact?: boolean }) {
  const colors = getTopicColors(article.topic)
  const teaserChars = compact ? 90 : 180

  return (
    <div onClick={() => click(article, onArticleClick)} style={{
      margin: compact ? undefined : '8px 14px 0',
      flex: compact ? 1 : undefined,
      minHeight: compact ? 176 : 220,
      borderRadius: compact ? 18 : 20, overflow: 'hidden', position: 'relative',
      background: 'var(--bg1)', border: '0.5px solid var(--line)', cursor: 'pointer',
      padding: compact ? '14px 14px 12px 17px' : '18px 18px 16px 21px',
      display: 'flex', flexDirection: 'column',
    }}>
      <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 4, background: colors.color }} />

      <div style={{ display: 'flex', alignItems: 'center', gap: compact ? 6 : 8, marginBottom: compact ? 8 : 12, flexWrap: 'wrap' }}>
        <div style={{
          width: compact ? 20 : 22, height: compact ? 20 : 22, borderRadius: 7, flexShrink: 0,
          background: colors.bg, display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <i className={`ti ${getTopicIcon(article.topic)}`} style={{ fontSize: compact ? 11 : 12, color: colors.color }} />
        </div>
        {!compact && <TopicPill topic={article.topic} />}
      </div>

      <div style={{
        fontSize: compact ? 14 : 22, fontWeight: 800, color: 'var(--t1)',
        lineHeight: compact ? 1.28 : 1.22, letterSpacing: '-0.02em', marginBottom: compact ? 6 : 10,
        display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden',
      }}>
        {article.title}
      </div>

      {article.content && (
        <div style={{
          fontSize: compact ? 11.5 : 14, color: 'var(--t3)', lineHeight: 1.55, flex: 1,
          marginBottom: compact ? 8 : 14,
          display: '-webkit-box', WebkitLineClamp: compact ? 2 : 3, WebkitBoxOrient: 'vertical', overflow: 'hidden',
        }}>
          {article.content.slice(0, teaserChars)}{article.content.length > teaserChars ? '…' : ''}
        </div>
      )}

      <div style={{ marginTop: 'auto' }}>
        {compact ? (
          <span style={{ fontSize: 9.5, fontWeight: 700, color: 'var(--t4)', letterSpacing: '0.04em', textTransform: 'uppercase' }}>
            {article.source} · {timeAgo(article.publishedAt)}
          </span>
        ) : (
          <>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 12 }}>
              <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--t4)', letterSpacing: '0.05em', textTransform: 'uppercase' }}>{article.source}</span>
              <div style={{ width: 2, height: 2, borderRadius: '50%', background: 'var(--t5)', flexShrink: 0 }} />
              <span style={{ fontSize: 10, color: 'var(--t4)' }}>{timeAgo(article.publishedAt)}</span>
            </div>
            <CardFooter article={article} />
          </>
        )}
      </div>
    </div>
  )
}

// ─── TickerBlock ────────────────────────────────────────────────────────────
// Bundles 3-4 short, imageless, same-topic articles into one compact card
// (headline + source + time, no teaser) instead of letting them spread out
// as repetitive individual cards in the stream.

export function TickerBlock({ articles, onArticleClick }: { articles: Article[]; onArticleClick: OnArticleClick }) {
  if (!articles.length) return null
  const colors = getTopicColors(articles[0].topic)
  return (
    <div style={{ margin: '8px 14px 0', borderRadius: 18, overflow: 'hidden', background: 'var(--bg1)', border: '0.5px solid var(--line)' }}>
      <div style={{ padding: '12px 16px', borderBottom: '0.5px solid var(--line)', display: 'flex', alignItems: 'center', gap: 7 }}>
        <i className={`ti ${getTopicIcon(articles[0].topic)}`} style={{ fontSize: 13, color: colors.color }} />
        <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--t4)', letterSpacing: '0.09em', textTransform: 'uppercase' }}>
          {getTopicShortLabel(articles[0].topic)} · Kurz-Updates
        </span>
      </div>
      {articles.map((article, i) => (
        <div key={article.id} onClick={() => click(article, onArticleClick)} style={{
          padding: '11px 16px', cursor: 'pointer',
          borderBottom: i < articles.length - 1 ? '0.5px solid var(--line)' : 'none',
        }}>
          <div style={{ fontSize: 13.5, fontWeight: 700, color: 'var(--t1)', lineHeight: 1.32, letterSpacing: '-0.01em', marginBottom: 4 }}>
            {article.title}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
            <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--t4)', letterSpacing: '0.04em', textTransform: 'uppercase' }}>
              {article.source}
            </span>
            <div style={{ width: 2, height: 2, borderRadius: '50%', background: 'var(--t5)', flexShrink: 0 }} />
            <span style={{ fontSize: 10, color: 'var(--t5)' }}>{timeAgo(article.publishedAt)}</span>
          </div>
        </div>
      ))}
    </div>
  )
}

// ─── FeatureCard ────────────────────────────────────────────────────────────
// Two variants: a photo card when the article has a (working) image, and a
// TextCard when it doesn't — the text card reclaims the space a broken or
// missing image would otherwise waste on an empty container.

export function FeatureCard({ article, onArticleClick }: { article: Article; onArticleClick: OnArticleClick }) {
  const [imgFailed, setImgFailed] = useState(false)
  const hasImage = !!article.imageUrl && !imgFailed

  if (!hasImage) {
    return <TextCard article={article} onArticleClick={onArticleClick} />
  }

  return (
    <div onClick={() => click(article, onArticleClick)} style={{ margin: '8px 14px 0', borderRadius: 20, overflow: 'hidden',
      background: 'var(--bg1)', border: '0.5px solid var(--line)', cursor: 'pointer' }}>
      <div style={{ height: 190, position: 'relative', overflow: 'hidden' }}>
        <img src={article.imageUrl!} alt="" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }}
          onError={() => setImgFailed(true)} />
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to bottom, transparent 50%, var(--bg1) 100%)' }} />
        <div style={{ position: 'absolute', bottom: 12, left: 14 }}>
          <TopicPill topic={article.topic} />
        </div>
      </div>
      <div style={{ padding: '14px 16px 15px' }}>
        <ArticleMeta article={article} />
        <div style={{ fontSize: 19, fontWeight: 800, color: 'var(--t1)', lineHeight: 1.25, letterSpacing: '-0.02em', marginBottom: 8 }}>
          {article.title}
        </div>
        {article.content && (
          <div style={{ fontSize: 13, color: 'var(--t3)', lineHeight: 1.65, marginBottom: 12 }}>
            {article.content.slice(0, 120)}{article.content.length > 120 ? '…' : ''}
          </div>
        )}
        <CardFooter article={article} />
      </div>
    </div>
  )
}

// ─── SplitPair ──────────────────────────────────────────────────────────────
// Both items in a pair are decided together: if either article lacks an
// image (or its image fails to load), BOTH render as compact TextCards, so a
// photo card never ends up next to a text card in the same row.

export function SplitPair({ articles, onArticleClick }: { articles: Article[]; onArticleClick: OnArticleClick }) {
  const [failed, setFailed] = useState<Record<string, boolean>>({})
  const bothHaveImages = articles.every(a => !!a.imageUrl && !failed[a.id])

  return (
    <div style={{ display: 'flex', gap: 8, margin: '8px 14px 0', alignItems: 'stretch' }}>
      {articles.map(article => (
        bothHaveImages
          ? <SplitPairImageItem key={article.id} article={article} onArticleClick={onArticleClick}
              onImageError={() => setFailed(f => ({ ...f, [article.id]: true }))} />
          : <TextCard key={article.id} article={article} onArticleClick={onArticleClick} compact />
      ))}
    </div>
  )
}

function SplitPairImageItem({ article, onArticleClick, onImageError }: {
  article: Article; onArticleClick: OnArticleClick; onImageError: () => void
}) {
  return (
    <div onClick={() => click(article, onArticleClick)} style={{
      flex: 1, borderRadius: 18, overflow: 'hidden',
      background: 'var(--bg1)', border: '0.5px solid var(--line)',
      display: 'flex', flexDirection: 'column', cursor: 'pointer', minWidth: 0,
    }}>
      <div style={{ height: 100, position: 'relative', overflow: 'hidden', flexShrink: 0 }}>
        <img src={article.imageUrl!} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }}
          onError={onImageError} />
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to bottom, transparent 30%, var(--bg1) 100%)' }} />
        <div style={{ position: 'absolute', bottom: 8, left: 10 }}><TopicPill topic={article.topic} small /></div>
      </div>

      <div style={{ padding: '10px 12px 12px', flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--t1)', lineHeight: 1.3, letterSpacing: '-0.01em', marginBottom: 8 }}>
          {article.title}
        </div>
        <div onClick={e => e.stopPropagation()}>
          <KIButton article={article} small onArticleClick={onArticleClick} />
        </div>
      </div>
    </div>
  )
}

// ─── CompactList ────────────────────────────────────────────────────────────

export function CompactList({ articles, title = 'Weitere Meldungen', onArticleClick }: { articles: Article[]; title?: string; onArticleClick: OnArticleClick }) {
  if (!articles.length) return null
  return (
    <div style={{ margin: '8px 14px 0', borderRadius: 18, overflow: 'hidden', background: 'var(--bg1)', border: '0.5px solid var(--line)' }}>
      <div style={{ padding: '13px 16px', borderBottom: '0.5px solid var(--line)', display: 'flex', alignItems: 'center', gap: 7 }}>
        <i className="ti ti-flame" style={{ fontSize: 13, color: 'var(--sta)' }} />
        <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--t4)', letterSpacing: '0.09em', textTransform: 'uppercase' }}>{title}</span>
      </div>
      {articles.map((article, i) => (
        <div key={article.id} onClick={() => click(article, onArticleClick)} style={{
          display: 'flex', gap: 12, padding: '13px 16px',
          borderBottom: i < articles.length - 1 ? '0.5px solid var(--line)' : 'none',
          alignItems: 'flex-start', cursor: 'pointer',
        }}>
          <div style={{ fontSize: 15, fontWeight: 800, color: 'var(--t5)', width: 18, flexShrink: 0, marginTop: 2 }}>{i + 1}</div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--t1)', lineHeight: 1.3, letterSpacing: '-0.01em', marginBottom: 4 }}>
              {article.title}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
              <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--t4)', letterSpacing: '0.04em', textTransform: 'uppercase' }}>
                {article.source}
              </span>
              <div style={{ width: 2, height: 2, borderRadius: '50%', background: 'var(--t5)', flexShrink: 0 }} />
              <span style={{ fontSize: 10, color: 'var(--t5)' }}>{timeAgo(article.publishedAt)}</span>
            </div>
          </div>
          <div style={{ width: 52, height: 52, borderRadius: 11, overflow: 'hidden', flexShrink: 0, position: 'relative' }}>
            <ArticleImage article={article} iconSize={20} />
          </div>
        </div>
      ))}
    </div>
  )
}

// ─── MarktInsight ───────────────────────────────────────────────────────────

export function MarktInsight({ summary, sentiment, onClick }: { summary: string; sentiment: 'bullish' | 'bearish' | 'neutral'; onClick?: () => void }) {
  const isUp = sentiment === 'bullish'
  const isDown = sentiment === 'bearish'
  return (
    <div onClick={onClick} style={{ margin: '8px 14px 0', borderRadius: 18, overflow: 'hidden',
      background: 'var(--bg1)', border: '0.5px solid var(--line)', display: 'flex', cursor: onClick ? 'pointer' : 'default' }}>
      <div style={{ width: 52, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 5,
        flexShrink: 0, padding: '18px 0', background: isDown ? 'rgba(239,68,68,0.06)' : 'rgba(34,197,94,0.06)' }}>
        <i className={`ti ${isDown ? 'ti-trending-down' : 'ti-trending-up'}`}
          style={{ fontSize: 20, color: isDown ? 'var(--dn)' : 'var(--up)' }} />
        <span style={{ fontSize: 7, fontWeight: 800, color: isDown ? 'var(--dn)' : 'var(--up)',
          letterSpacing: '0.09em', textTransform: 'uppercase' }}>
          {isUp ? 'Bullish' : isDown ? 'Bearish' : 'Neutral'}
        </span>
      </div>
      <div style={{ flex: 1, padding: '14px 15px' }}>
        <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--t1)', letterSpacing: '0.07em', textTransform: 'uppercase', marginBottom: 6 }}>
          Markteinschätzung
        </div>
        <div style={{ fontSize: 12, color: 'var(--t2)', lineHeight: 1.6 }}>{summary}</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 10, fontWeight: 600, color: 'var(--t4)', marginTop: 8 }}>
          <i className="ti ti-arrow-right" style={{ fontSize: 11 }} />Vollständiger Bericht
        </div>
      </div>
    </div>
  )
}

// ─── StreamDivider ──────────────────────────────────────────────────────────

export function StreamDivider({ label }: { label: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '20px 18px 10px' }}>
      <div style={{ flex: 1, height: '0.5px', background: 'var(--line)' }} />
      <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--t5)', letterSpacing: '0.1em', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>
        {label}
      </span>
      <div style={{ flex: 1, height: '0.5px', background: 'var(--line)' }} />
    </div>
  )
}

// ─── Article stream renderer (shared between Feed / News) ──────────────────

export function renderArticleStream(articles: Article[], onArticleClick: OnArticleClick, startIndex = 0): React.ReactNode[] {
  const blocks: React.ReactNode[] = []
  let i = 0
  let key = startIndex

  while (i < articles.length) {
    const cycle = key % 4
    if (cycle === 0 && articles[i]) {
      blocks.push(<FeatureCard key={key++} article={articles[i++]} onArticleClick={onArticleClick} />)
    } else if (cycle === 1 || cycle === 2) {
      const pair = articles.slice(i, i + 2)
      if (pair.length === 2) blocks.push(<SplitPair key={key} articles={pair} onArticleClick={onArticleClick} />)
      else if (pair.length === 1) blocks.push(<FeatureCard key={key} article={pair[0]} onArticleClick={onArticleClick} />)
      key++
      i += pair.length
    } else {
      const batch = articles.slice(i, i + 5)
      if (batch.length) blocks.push(<CompactList key={key} articles={batch} onArticleClick={onArticleClick} />)
      key++
      i += batch.length
    }
    if (articles.slice(i).length === 0) break
  }

  return blocks
}
