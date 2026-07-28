'use client'
import { useState } from 'react'
import type { Article } from '@/lib/types'
import { getTopicColors, getTopicShortLabel } from '@/lib/topicColors'
import { FeatureCard, CompactList, OnArticleClick } from '@/components/FeedCards'

const FILTERS = ['Alle', 'Wirtschaft', 'Politik', 'Tech', 'Startups', 'Münster', 'Lokal', 'Sport']

const SECTIONS: { key: string; title: string }[] = [
  { key: 'Wirtschaft', title: 'Wirtschaft & Finanzen' },
  { key: 'Politik',    title: 'Politik & Geopolitik' },
  { key: 'Tech',       title: 'Technologie & KI' },
  { key: 'Startups',   title: 'Gründer & Startups' },
  { key: 'Münster',    title: 'Münster & Region' },
  { key: 'Lokal',      title: 'Badbergen & Osnabrücker Land' },
  { key: 'Sport',      title: 'Sport' },
]

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

  const visibleSections = SECTIONS
    .filter(s => activeFilter === 'Alle' || activeFilter === s.key)
    .map(s => ({ ...s, articles: articles.filter(a => matchFilter(a, s.key)) }))
    .filter(s => s.articles.length > 0)

  return (
    <div>
      {/* Header */}
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

      {/* Thematische Sektionen */}
      {visibleSections.length > 0 ? (
        visibleSections.map(section => (
          <TopicSection key={section.key} topic={section.title} articles={section.articles} onArticleClick={onArticleClick} />
        ))
      ) : (
        <div style={{ padding: '60px 20px', textAlign: 'center' }}>
          <p style={{ fontSize: 14, color: 'var(--t3)' }}>Keine Artikel für diesen Filter.</p>
        </div>
      )}

      <div style={{ height: 20 }} />
    </div>
  )
}

function TopicSection({ topic, articles, onArticleClick }: { topic: string; articles: Article[]; onArticleClick: OnArticleClick }) {
  const colors = getTopicColors(topic)
  const [expanded, setExpanded] = useState(false)
  const visibleArticles = expanded ? articles : articles.slice(0, 4)

  return (
    <div style={{ marginBottom: 8 }}>
      {/* Sektions-Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '18px 20px 10px' }}>
        <div style={{ fontSize: 20, fontWeight: 800, color: 'var(--t1)', letterSpacing: '-0.02em' }}>
          {topic.split(' ')[0]}
        </div>
        <div style={{
          fontSize: 9, fontWeight: 700, padding: '3px 9px', borderRadius: 100,
          background: colors.bg, color: colors.color, border: `0.5px solid ${colors.border}`,
          letterSpacing: '0.05em', textTransform: 'uppercase',
        }}>
          {getTopicShortLabel(topic)}
        </div>
        <div style={{ fontSize: 11, color: 'var(--t4)', marginLeft: 'auto' }}>{articles.length}</div>
      </div>
      <div style={{ height: '0.5px', background: 'var(--line)', margin: '0 20px 10px' }} />

      {/* TOP STORY der Sektion */}
      {visibleArticles[0] && (
        <FeatureCard article={visibleArticles[0]} onArticleClick={onArticleClick} />
      )}

      {/* Rest als kompakte Liste */}
      {visibleArticles.length > 1 && (
        <CompactList
          articles={visibleArticles.slice(1)}
          title={`Mehr zu ${getTopicShortLabel(topic)}`}
          onArticleClick={onArticleClick}
        />
      )}

      {/* Mehr anzeigen */}
      {articles.length > 4 && (
        <div
          onClick={() => setExpanded(e => !e)}
          style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
            padding: '12px', margin: '4px 14px 0',
            background: 'var(--bg1)', border: '0.5px solid var(--line)', borderRadius: 14,
            fontSize: 12, fontWeight: 600, color: colors.color, cursor: 'pointer',
          }}
        >
          <i className={`ti ${expanded ? 'ti-chevron-up' : 'ti-chevron-down'}`} style={{ fontSize: 13 }} />
          {expanded ? 'Weniger anzeigen' : `${articles.length - 4} weitere Artikel`}
        </div>
      )}
    </div>
  )
}
