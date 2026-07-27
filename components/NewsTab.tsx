'use client'
import { useState } from 'react'
import type { Article } from '@/lib/types'
import { HeroCard, OnArticleClick, renderArticleStream } from '@/components/FeedCards'

const FILTERS = ['Alle', 'Wirtschaft', 'Politik', 'Tech', 'Startups', 'Münster', 'Lokal', 'Sport']

function matchFilter(article: Article, filter: string): boolean {
  const t = (article.topic ?? '').toLowerCase()
  if (filter === 'Wirtschaft') return t.includes('wirtschaft') || t.includes('aktien') || t.includes('finanzen')
  if (filter === 'Politik')    return t.includes('politik') || t.includes('geopolitik')
  if (filter === 'Tech')       return t.includes('tech') || t.includes('ki')
  if (filter === 'Startups')   return t.includes('gründer') || t.includes('startup')
  if (filter === 'Münster')    return t.includes('münster')
  if (filter === 'Lokal')      return t.includes('badbergen') || t.includes('osnabrück')
  if (filter === 'Sport')      return t === 'sport'
  return true
}

interface Props {
  articles: Article[]
  onArticleClick: OnArticleClick
}

export function NewsTab({ articles, onArticleClick }: Props) {
  const [activeFilter, setActiveFilter] = useState('Alle')

  const filtered = activeFilter === 'Alle' ? articles : articles.filter(a => matchFilter(a, activeFilter))
  const topStory = filtered[0]
  const rest = filtered.slice(1)

  return (
    <div>
      <div style={{ padding: '16px 20px 0', borderBottom: '0.5px solid var(--line)' }}>
        <div style={{ fontSize: 28, fontWeight: 800, color: 'var(--t1)', letterSpacing: '-0.03em', marginBottom: 14 }}>News</div>
        <div className="no-scrollbar" style={{ display: 'flex', gap: 6, overflowX: 'auto', paddingBottom: 12 }}>
          {FILTERS.map(f => (
            <div key={f} onClick={() => setActiveFilter(f)} style={{
              flexShrink: 0, fontSize: 11, fontWeight: 600, padding: '5px 13px', borderRadius: 100,
              background: activeFilter === f ? 'var(--bg3)' : 'var(--bg1)',
              color: activeFilter === f ? 'var(--t1)' : 'var(--t4)',
              border: `0.5px solid ${activeFilter === f ? 'var(--line2)' : 'var(--line)'}`,
              cursor: 'pointer',
            }}>{f}</div>
          ))}
        </div>
      </div>

      {topStory ? (
        <>
          <HeroCard article={topStory} onArticleClick={onArticleClick} />
          {renderArticleStream(rest, onArticleClick)}
        </>
      ) : (
        <div style={{ padding: '60px 20px', textAlign: 'center' }}>
          <p style={{ fontSize: 14, color: 'var(--t3)' }}>Keine Artikel für diesen Filter.</p>
        </div>
      )}

      <div style={{ height: 20 }} />
    </div>
  )
}
