'use client'
import { useState } from 'react'
import { Bookmark, ChevronDown, Sparkles } from 'lucide-react'
import { KISummaryButton } from '@/components/KISummaryButton'
import { addBookmark, removeBookmark, isBookmarked } from '@/lib/bookmarks'
import { trackInteraction } from '@/lib/profile'
import type { Article } from '@/lib/types'

const SF = "-apple-system, BlinkMacSystemFont, 'SF Pro Display', 'Helvetica Neue', sans-serif"

// ─── Theme helpers ────────────────────────────────────────────────────────────

function getSectionColors(title: string) {
  if (title.includes('Wirtschaft') || title.includes('Finanzen') || title.includes('Märkte'))
    return { bg: 'var(--eco-bg)', color: 'var(--eco-t)', border: 'var(--eco-border)' }
  if (title.includes('Politik') || title.includes('Geopolitik'))
    return { bg: 'var(--pol-bg)', color: 'var(--pol-t)', border: 'var(--pol-border)' }
  if (title.includes('Technologie') || title.includes('Tech') || title.includes('KI'))
    return { bg: 'var(--tec-bg)', color: 'var(--tec-t)', border: 'var(--tec-border)' }
  return { bg: 'var(--mkt-bg)', color: 'var(--mkt-t)', border: 'var(--mkt-border)' }
}

function getTopicColors(topic: string) {
  if (['Wirtschaft & Finanzen', 'Aktienmärkte & Investing', 'Aktienmärkte'].includes(topic))
    return { bg: 'var(--eco-bg)', color: 'var(--eco-t)', border: 'var(--eco-border)' }
  if (['Politik (DE/EU)', 'Politik DE/EU', 'Geopolitik & Welt', 'Geopolitik'].includes(topic))
    return { bg: 'var(--pol-bg)', color: 'var(--pol-t)', border: 'var(--pol-border)' }
  if (topic === 'Technologie & KI')
    return { bg: 'var(--tec-bg)', color: 'var(--tec-t)', border: 'var(--tec-border)' }
  return { bg: 'var(--mkt-bg)', color: 'var(--mkt-t)', border: 'var(--mkt-border)' }
}

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
    if (saved) { removeBookmark(article.id) } else {
      addBookmark({ id: article.id, title: article.title, url: article.url, source: article.source, topic: article.topic, publishedAt: article.publishedAt, imageUrl: article.imageUrl ?? null, savedAt: new Date().toISOString() })
    }
    setSaved(s => !s)
  }
  return (
    <button onClick={handleClick} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 2 }} aria-label={saved ? 'Gespeichert' : 'Speichern'}>
      <Bookmark size={14} color={saved ? 'var(--up)' : 'var(--t4)'} fill={saved ? 'var(--up)' : 'none'} strokeWidth={1.8} />
    </button>
  )
}

// ─── Card components ──────────────────────────────────────────────────────────

function BigCard({ article, onArticleClick }: { article: Article; onArticleClick: (a: Article) => void }) {
  const [summary, setSummary]               = useState<string | null>(null)
  const [summaryOpen, setSummaryOpen]       = useState(false)
  const [summaryLoading, setSummaryLoading] = useState(false)
  const tc = getTopicColors(article.topic ?? '')

  async function handleSummaryClick(e: React.MouseEvent) {
    e.stopPropagation()
    if (summary) { setSummaryOpen(o => !o); return }
    if (summaryLoading) return
    setSummaryLoading(true)
    try {
      const res = await fetch('/api/summarize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: article.title, url: article.url, content: article.content ?? article.title, lang: 'de' }),
      })
      const data = await res.json()
      setSummary(data.summary || 'Zusammenfassung nicht verfügbar.')
      setSummaryOpen(true)
    } catch {
      setSummary('Zusammenfassung konnte nicht geladen werden.')
      setSummaryOpen(true)
    }
    setSummaryLoading(false)
  }

  return (
    <div onClick={() => { trackInteraction(article.topic); onArticleClick(article) }} style={{ cursor: 'pointer', marginBottom: 8 }}>
      <div style={{ background: 'var(--bg1)', border: '0.5px solid var(--border)', borderRadius: 18, padding: '14px 15px' }}>
        <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 7, flexWrap: 'wrap' }}>
              <span style={{ fontSize: 10, color: 'var(--t4)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{article.source}</span>
              <div style={{ width: 2, height: 2, borderRadius: '50%', background: 'var(--border2)', flexShrink: 0 }} />
              <span style={{ fontSize: 10, color: 'var(--t4)' }}>{relTime(article.publishedAt)}</span>
              <span style={{ fontSize: 10, fontWeight: 600, padding: '2px 6px', borderRadius: 10, background: tc.bg, color: tc.color, border: `0.5px solid ${tc.border}` }}>{article.topic}</span>
            </div>
            <div style={{ fontSize: 16, fontFamily: SF, fontWeight: 500, color: '#ffffff', lineHeight: 1.38, letterSpacing: '-0.02em', marginBottom: 9 }}>
              {article.title}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }} onClick={e => e.stopPropagation()}>
              <div onClick={handleSummaryClick} style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 11, color: 'var(--t3)', background: 'var(--bg2)', border: '0.5px solid var(--border2)', borderRadius: 7, padding: '5px 10px', cursor: 'pointer', userSelect: 'none' }}>
                <Sparkles size={10} color="var(--t3)" />
                {summaryLoading ? 'Lädt...' : summaryOpen ? 'Ausblenden' : 'KI-Zusammenfassung'}
              </div>
              <ArticleBookmark article={article} />
            </div>
          </div>
          <div style={{ width: 60, height: 60, borderRadius: 10, flexShrink: 0, background: tc.bg, overflow: 'hidden', border: `0.5px solid ${tc.border}` }}>
            {article.imageUrl && <img src={article.imageUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} onError={e => { (e.currentTarget.parentElement as HTMLElement).style.background = tc.bg }} />}
          </div>
        </div>
        {summaryOpen && summary && (
          <div onClick={e => e.stopPropagation()} style={{ fontSize: 13, color: '#d8d4d0', lineHeight: 1.65, marginTop: 10, padding: '10px 12px', background: 'var(--bg2)', borderRadius: 10, borderLeft: '2px solid var(--border2)' }}>
            {summary}
          </div>
        )}
      </div>
    </div>
  )
}

function HalfCard({ article, onArticleClick }: { article: Article; onArticleClick: (a: Article) => void }) {
  const tc = getTopicColors(article.topic ?? '')
  return (
    <div onClick={() => { trackInteraction(article.topic); onArticleClick(article) }} style={{ flex: 1, minWidth: 0, cursor: 'pointer' }}>
      <div style={{ background: 'var(--bg1)', border: '0.5px solid var(--border)', borderRadius: 16, overflow: 'hidden', height: '100%' }}>
        <div style={{ height: 70, position: 'relative', overflow: 'hidden', background: tc.bg }}>
          {article.imageUrl && <img src={article.imageUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', opacity: 0.7 }} onError={e => (e.currentTarget.style.display = 'none')} />}
        </div>
        <div style={{ padding: '10px 11px 11px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 5, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 10, color: 'var(--t4)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }}>{article.source}</span>
            <span style={{ fontSize: 10, fontWeight: 600, padding: '2px 5px', borderRadius: 8, background: tc.bg, color: tc.color, border: `0.5px solid ${tc.border}` }}>{article.topic}</span>
          </div>
          <div style={{ fontSize: 13, fontFamily: SF, fontWeight: 500, color: '#ffffff', lineHeight: 1.38, letterSpacing: '-0.01em', marginBottom: 7 }}>
            {article.title}
          </div>
          <div onClick={e => e.stopPropagation()}>
            <KISummaryButton article={article} small onArticleClick={() => onArticleClick(article)} />
          </div>
        </div>
      </div>
    </div>
  )
}

function HorizontalCard({ article, onArticleClick }: { article: Article; onArticleClick: (a: Article) => void }) {
  const tc = getTopicColors(article.topic ?? '')
  return (
    <div
      onClick={() => { trackInteraction(article.topic); onArticleClick(article) }}
      style={{ background: 'var(--bg1)', border: '0.5px solid var(--border)', borderRadius: 14, overflow: 'hidden', marginBottom: 6, display: 'flex', height: 90, cursor: 'pointer' }}
    >
      <div style={{ width: 100, flexShrink: 0, overflow: 'hidden', background: tc.bg }}>
        {article.imageUrl
          ? <img src={article.imageUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} onError={e => (e.currentTarget.style.display = 'none')} />
          : null
        }
      </div>
      <div style={{ flex: 1, padding: '10px 12px', minWidth: 0, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 5 }}>
            <span style={{ fontSize: 10, color: 'var(--t4)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{article.source}</span>
            <span style={{ fontSize: 10, color: 'var(--t4)' }}>{relTime(article.publishedAt)}</span>
          </div>
          <div style={{ fontSize: 13, fontFamily: SF, fontWeight: 500, color: '#ffffff', lineHeight: 1.35, letterSpacing: '-0.01em' }}>
            {article.title}
          </div>
        </div>
        <div onClick={e => e.stopPropagation()}>
          <KISummaryButton article={article} small onArticleClick={() => onArticleClick(article)} />
        </div>
      </div>
    </div>
  )
}

function CompactItem({ article, isLast, onArticleClick }: { article: Article; isLast: boolean; onArticleClick: (a: Article) => void }) {
  return (
    <div onClick={() => { trackInteraction(article.topic); onArticleClick(article) }} style={{ cursor: 'pointer' }}>
      <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start', padding: '13px 14px', borderBottom: isLast ? 'none' : '0.5px solid var(--border)' }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 4 }}>
            <span style={{ fontSize: 10, color: 'var(--t4)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }}>{article.source}</span>
            <div style={{ width: 2, height: 2, borderRadius: '50%', background: 'var(--border2)', flexShrink: 0 }} />
            <span style={{ fontSize: 10, color: 'var(--t4)' }}>{relTime(article.publishedAt)}</span>
          </div>
          <div style={{ fontSize: 13, fontFamily: SF, fontWeight: 400, color: '#d8d4d0', lineHeight: 1.38, marginBottom: 5 }}>{article.title}</div>
          <div onClick={e => e.stopPropagation()}>
            <KISummaryButton article={article} small onArticleClick={() => onArticleClick(article)} />
          </div>
        </div>
        {article.imageUrl && (
          <div style={{ width: 48, height: 48, borderRadius: 10, flexShrink: 0, overflow: 'hidden' }}>
            <img src={article.imageUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', opacity: 0.75 }} onError={e => { (e.currentTarget.parentElement as HTMLElement).style.display = 'none' }} />
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

interface FeedSectionProps {
  title: string
  articles: Article[]
  initialCount?: number
  onArticleClick: (article: Article) => void
}

export function FeedSection({ title, articles, initialCount = 7, onArticleClick }: FeedSectionProps) {
  const [expanded, setExpanded] = useState(false)
  if (!articles || articles.length === 0) return null

  const visible      = expanded ? articles : articles.slice(0, initialCount)
  const hiddenCount  = articles.length - initialCount
  const colors       = getSectionColors(title)

  const bigCard        = visible[0]
  const halfCards      = visible.slice(1, 3)
  const horizontalCard = visible[3]
  const compactItems   = visible.slice(4)

  return (
    <div style={{ padding: '0 18px 0' }} className="feed-section">

      {/* Section Header */}
      <div style={{ margin: '20px 0 11px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 9 }}>
          <span style={{ fontSize: 22, fontFamily: SF, fontWeight: 300, color: 'var(--t1)', letterSpacing: '-0.03em' }}>
            {title}
          </span>
          <span style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase', padding: '3px 8px', borderRadius: 20, background: colors.bg, color: colors.color, border: `0.5px solid ${colors.border}` }}>
            {title.split(' ')[0]}
          </span>
          <span style={{ fontSize: 10, color: 'var(--t4)', marginLeft: 'auto' }}>{articles.length}</span>
        </div>
        <div style={{ height: '0.5px', background: 'var(--border)' }} />
      </div>

      <BigCard article={bigCard} onArticleClick={onArticleClick} />

      {halfCards.length > 0 && (
        <div style={{ display: 'flex', gap: 7, marginBottom: 8 }}>
          {halfCards.map(article => (
            <HalfCard key={article.id} article={article} onArticleClick={onArticleClick} />
          ))}
        </div>
      )}

      {horizontalCard && (
        <HorizontalCard article={horizontalCard} onArticleClick={onArticleClick} />
      )}

      {compactItems.length > 0 && (
        <div style={{ background: 'var(--bg1)', border: '0.5px solid var(--border)', borderRadius: 16, overflow: 'hidden', marginBottom: 8 }}>
          {compactItems.map((article, i) => (
            <CompactItem key={article.id} article={article} isLast={i === compactItems.length - 1} onArticleClick={onArticleClick} />
          ))}
        </div>
      )}

      {hiddenCount > 0 && (
        <div onClick={() => setExpanded(e => !e)} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7, padding: 11, color: 'var(--t4)', fontSize: 11, cursor: 'pointer' }}>
          <div style={{ display: 'flex', gap: 3 }}>
            {[0, 1, 2].map(i => <div key={i} style={{ width: 3, height: 3, borderRadius: '50%', background: 'var(--border2)' }} />)}
          </div>
          <span>{expanded ? 'Weniger anzeigen' : `${hiddenCount} weitere Meldungen`}</span>
          <ChevronDown size={11} color="var(--t4)" style={{ transform: expanded ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />
        </div>
      )}
    </div>
  )
}
