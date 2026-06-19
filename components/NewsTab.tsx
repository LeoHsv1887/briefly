'use client'
import { useState } from 'react'
import { Bookmark } from 'lucide-react'
import type { Article } from '@/lib/types'
import { KISummaryButton } from '@/components/KISummaryButton'
import { addBookmark, removeBookmark, isBookmarked } from '@/lib/bookmarks'
import { trackInteraction } from '@/lib/profile'

function timeAgo(dateStr: string): string {
  const min = Math.floor((Date.now() - new Date(dateStr).getTime()) / 60_000)
  if (min < 1) return 'gerade'
  if (min < 60) return `vor ${min} Min.`
  const h = Math.floor(min / 60)
  if (h < 24) return `vor ${h} Std.`
  return new Date(dateStr).toLocaleDateString('de-DE', { day: 'numeric', month: 'short' })
}

function BookmarkButton({ article }: { article: Article }) {
  const [saved, setSaved] = useState(() => isBookmarked(article.id))

  function handleClick(e: React.MouseEvent) {
    e.stopPropagation()
    if (saved) { removeBookmark(article.id) } else {
      addBookmark({ id: article.id, title: article.title, url: article.url, source: article.source, topic: article.topic, publishedAt: article.publishedAt, imageUrl: article.imageUrl ?? null, savedAt: new Date().toISOString() })
    }
    setSaved(s => !s)
  }

  return (
    <button onClick={handleClick} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 2, flexShrink: 0 }} aria-label={saved ? 'Gespeichert' : 'Speichern'}>
      <Bookmark size={15} color={saved ? '#4a9e6a' : '#1a1a1a'} fill={saved ? '#4a9e6a' : 'none'} strokeWidth={1.8} />
    </button>
  )
}

// ─── Card components ──────────────────────────────────────────────────────────

type OnClick = (article: Article) => void

function FeaturedCard({ article, onArticleClick }: { article: Article; onArticleClick: OnClick }) {
  return (
    <div
      style={{ margin: '14px 18px 0', borderRadius: 22, overflow: 'hidden', background: 'var(--bg0)', border: '0.5px solid var(--border)', cursor: 'pointer' }}
      onClick={() => { trackInteraction(article.topic); onArticleClick(article) }}
    >
      <div style={{ height: 200, position: 'relative', overflow: 'hidden' }}>
        {article.imageUrl && (
          <img src={article.imageUrl} alt="" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', opacity: 0.5 }} onError={e => (e.currentTarget.style.display = 'none')} />
        )}
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to bottom, rgba(0,0,0,0.1) 0%, rgba(0,0,0,0.85) 100%)' }} />
        {!article.imageUrl && <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(135deg, #0a1218, #141e2a)' }} />}
        <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: 14 }}>
          <span style={{ fontSize: 9, fontWeight: 500, color: '#ccc', background: 'rgba(0,0,0,0.5)', border: '0.5px solid rgba(255,255,255,0.1)', borderRadius: 20, padding: '3px 9px', display: 'inline-block', marginBottom: 6, letterSpacing: '0.04em' }}>{article.topic}</span>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.35)', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{article.source}</span>
            <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.2)' }}>{timeAgo(article.publishedAt)}</span>
          </div>
        </div>
      </div>
      <div style={{ padding: '14px 15px 15px' }}>
        <div style={{ fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Display', 'Helvetica Neue', sans-serif", fontSize: 18, fontWeight: 500, color: '#ffffff', lineHeight: 1.38, marginBottom: 11 }}>{article.title}</div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }} onClick={e => e.stopPropagation()}>
          <KISummaryButton article={article} />
          <BookmarkButton article={article} />
        </div>
      </div>
    </div>
  )
}

function TrioCards({ articles, onArticleClick }: { articles: Article[]; onArticleClick: OnClick }) {
  return (
    <div style={{ display: 'flex', gap: 7, padding: '8px 18px 0' }}>
      {articles.map(article => (
        <div key={article.id} style={{ flex: 1, background: 'var(--bg0)', border: '0.5px solid var(--border)', borderRadius: 16, overflow: 'hidden', minWidth: 0, cursor: 'pointer' }}
          onClick={() => { trackInteraction(article.topic); onArticleClick(article) }}>
          <div style={{ height: 64, background: '#111', overflow: 'hidden', position: 'relative' }}>
            {article.imageUrl && <img src={article.imageUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', opacity: 0.65, position: 'absolute', inset: 0 }} onError={e => (e.currentTarget.style.display = 'none')} />}
          </div>
          <div style={{ padding: '9px 10px 10px' }}>
            <div style={{ fontSize: 8, color: 'var(--t4)', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 4 }}>{article.source}</div>
            <div style={{ fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Display', 'Helvetica Neue', sans-serif", fontSize: 13, fontWeight: 500, color: '#ffffff', lineHeight: 1.35, marginBottom: 5 }}>{article.title}</div>
            <div onClick={e => e.stopPropagation()}><KISummaryButton article={article} small onArticleClick={() => onArticleClick(article)} /></div>
          </div>
        </div>
      ))}
    </div>
  )
}

function FullCard({ article, onArticleClick }: { article: Article; onArticleClick: OnClick }) {
  return (
    <div style={{ margin: '8px 18px 0', background: 'var(--bg0)', border: '0.5px solid var(--border)', borderRadius: 18, padding: '14px 15px', cursor: 'pointer' }}
      onClick={() => { trackInteraction(article.topic); onArticleClick(article) }}>
      <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 7, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 9, color: 'var(--t4)', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{article.source}</span>
            <div style={{ width: 2, height: 2, borderRadius: '50%', background: 'var(--border2)', flexShrink: 0 }} />
            <span style={{ fontSize: 9, color: 'var(--t4)' }}>{timeAgo(article.publishedAt)}</span>
            <span style={{ fontSize: 9, color: 'var(--t3)', background: 'var(--bg2)', border: '0.5px solid var(--border2)', borderRadius: 20, padding: '2px 7px' }}>{article.topic}</span>
          </div>
          <div style={{ fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Display', 'Helvetica Neue', sans-serif", fontSize: 16, fontWeight: 500, color: '#ffffff', lineHeight: 1.42, marginBottom: 9 }}>{article.title}</div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }} onClick={e => e.stopPropagation()}>
            <KISummaryButton article={article} />
            <BookmarkButton article={article} />
          </div>
        </div>
        {article.imageUrl && (
          <div style={{ width: 68, height: 68, borderRadius: 11, flexShrink: 0, overflow: 'hidden' }}>
            <img src={article.imageUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} onError={e => { (e.currentTarget.parentElement as HTMLElement).style.display = 'none' }} />
          </div>
        )}
      </div>
    </div>
  )
}

function SplitCards({ articles, onArticleClick }: { articles: Article[]; onArticleClick: OnClick }) {
  const flexValues = ['1.8', '1']
  return (
    <div style={{ display: 'flex', gap: 7, padding: '8px 18px 0' }}>
      {articles.map((article, i) => (
        <div key={article.id} style={{ flex: flexValues[i] ?? '1', background: 'var(--bg0)', border: '0.5px solid var(--border)', borderRadius: 16, overflow: 'hidden', minWidth: 0, cursor: 'pointer' }}
          onClick={() => { trackInteraction(article.topic); onArticleClick(article) }}>
          <div style={{ height: 80, background: '#111', position: 'relative', overflow: 'hidden' }}>
            {article.imageUrl && <img src={article.imageUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', opacity: 0.65, position: 'absolute', inset: 0 }} onError={e => (e.currentTarget.style.display = 'none')} />}
          </div>
          <div style={{ padding: '10px 11px 11px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 5 }}>
              <span style={{ fontSize: 8, color: 'var(--t4)', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.04em' }}>{article.source}</span>
              <span style={{ fontSize: 7, color: 'var(--t3)', background: 'var(--bg2)', border: '0.5px solid var(--border2)', borderRadius: 20, padding: '2px 5px' }}>{article.topic}</span>
            </div>
            <div style={{ fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Display', 'Helvetica Neue', sans-serif", fontSize: 13, fontWeight: 500, color: '#ffffff', lineHeight: 1.35, marginBottom: 6 }}>{article.title}</div>
            <div onClick={e => e.stopPropagation()}><KISummaryButton article={article} small onArticleClick={() => onArticleClick(article)} /></div>
          </div>
        </div>
      ))}
    </div>
  )
}

function ListCard({ articles, onArticleClick }: { articles: Article[]; onArticleClick: OnClick }) {
  return (
    <div style={{ margin: '8px 18px 0', background: 'var(--bg0)', border: '0.5px solid var(--border)', borderRadius: 16, overflow: 'hidden' }}>
      {articles.map((article, i) => (
        <div key={article.id} style={{ display: 'flex', gap: 10, padding: '10px 13px', borderBottom: i < articles.length - 1 ? '0.5px solid var(--border)' : 'none', cursor: 'pointer' }}
          onClick={() => { trackInteraction(article.topic); onArticleClick(article) }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 3 }}>
              <span style={{ fontSize: 9, color: 'var(--t4)', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.04em' }}>{article.source}</span>
              <div style={{ width: 2, height: 2, borderRadius: '50%', background: 'var(--border2)', flexShrink: 0 }} />
              <span style={{ fontSize: 9, color: 'var(--t4)' }}>{timeAgo(article.publishedAt)}</span>
            </div>
            <div style={{ fontSize: 11, color: '#d8d4d0', lineHeight: 1.35, marginBottom: 4 }}>{article.title}</div>
            <div onClick={e => e.stopPropagation()}><KISummaryButton article={article} small onArticleClick={() => onArticleClick(article)} /></div>
          </div>
          {article.imageUrl && (
            <div style={{ width: 40, height: 40, borderRadius: 8, flexShrink: 0, overflow: 'hidden' }}>
              <img src={article.imageUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', opacity: 0.75 }} onError={e => { (e.currentTarget.parentElement as HTMLElement).style.display = 'none' }} />
            </div>
          )}
        </div>
      ))}
    </div>
  )
}

// ─── Layout engine ────────────────────────────────────────────────────────────

function renderArticles(articles: Article[], onArticleClick: OnClick): React.ReactNode[] {
  const blocks: React.ReactNode[] = []
  let i = 0
  let bk = 0

  if (articles[i]) { blocks.push(<FeaturedCard key={bk++} article={articles[i++]} onArticleClick={onArticleClick} />) }
  { const sl = articles.slice(i, i + 3); if (sl.length) blocks.push(<TrioCards key={bk++} articles={sl} onArticleClick={onArticleClick} />); i += 3 }
  if (articles[i]) { blocks.push(<FullCard key={bk++} article={articles[i++]} onArticleClick={onArticleClick} />) }
  { const sl = articles.slice(i, i + 2); if (sl.length) blocks.push(<SplitCards key={bk++} articles={sl} onArticleClick={onArticleClick} />); i += 2 }
  { const sl = articles.slice(i, i + 3); if (sl.length) blocks.push(<ListCard key={bk++} articles={sl} onArticleClick={onArticleClick} />); i += 3 }

  while (i < articles.length) {
    if (articles[i]) { blocks.push(<FullCard key={bk++} article={articles[i++]} onArticleClick={onArticleClick} />) }
    { const sl = articles.slice(i, i + 2); if (sl.length) blocks.push(<SplitCards key={bk++} articles={sl} onArticleClick={onArticleClick} />); i += 2 }
    { const sl = articles.slice(i, i + 3); if (sl.length) blocks.push(<ListCard key={bk++} articles={sl} onArticleClick={onArticleClick} />); i += 3 }
  }

  return blocks
}

// ─── Filter pills ─────────────────────────────────────────────────────────────

const FILTERS = ['Alle', 'Geopolitik', 'Wirtschaft', 'Tech & KI', 'Politik', 'Sport']

function matchFilter(article: Article, filter: string): boolean {
  const t = article.topic ?? ''
  if (filter === 'Geopolitik') return ['Geopolitik', 'Geopolitik & Welt'].includes(t)
  if (filter === 'Tech & KI')  return ['Technologie & KI', 'Tech & KI'].includes(t)
  if (filter === 'Wirtschaft') return ['Wirtschaft & Finanzen', 'Aktienmärkte', 'Aktienmärkte & Investing'].includes(t)
  if (filter === 'Politik')    return ['Politik DE/EU', 'Politik (DE/EU)', 'Geopolitik', 'Geopolitik & Welt'].includes(t)
  if (filter === 'Sport')      return t === 'Sport'
  return t.toLowerCase().includes(filter.toLowerCase())
}

// ─── Main component ───────────────────────────────────────────────────────────

interface Props {
  articles: Article[]
  onArticleClick: OnClick
}

export function NewsTab({ articles, onArticleClick }: Props) {
  const [activeFilter, setActiveFilter] = useState('Alle')

  const filtered = activeFilter === 'Alle'
    ? articles
    : articles.filter(a => matchFilter(a, activeFilter))

  return (
    <div style={{ paddingBottom: 24 }}>
      <div className="no-scrollbar" style={{ display: 'flex', gap: 6, padding: '14px 18px 0', overflowX: 'auto', scrollbarWidth: 'none' }}>
        {FILTERS.map(f => (
          <div key={f} onClick={() => setActiveFilter(f)} style={{
            fontSize: 10, fontWeight: 400,
            color: activeFilter === f ? '#ffffff' : 'var(--t3)',
            background: activeFilter === f ? 'var(--bg2)' : 'var(--bg1)',
            border: `0.5px solid ${activeFilter === f ? 'var(--border2)' : 'var(--border)'}`,
            borderRadius: 20, padding: '5px 12px', whiteSpace: 'nowrap', cursor: 'pointer', flexShrink: 0,
          }}>{f}</div>
        ))}
      </div>

      {filtered.length > 0
        ? renderArticles(filtered, onArticleClick)
        : <div style={{ padding: '60px 18px', textAlign: 'center' }}><p style={{ fontSize: 14, color: 'var(--t3)' }}>Keine Artikel für diesen Filter.</p></div>
      }

      <div style={{ height: 16 }} />
    </div>
  )
}
