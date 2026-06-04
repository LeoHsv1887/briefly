'use client'
import { useState } from 'react'
import { ChevronDown } from 'lucide-react'
import NewsCard from './NewsCard'
import type { Article } from '@/lib/types'

interface FeedSectionProps {
  title: string
  icon: React.ReactNode
  iconBg: string
  articles: Article[]
  initialCount?: number
}

export function FeedSection({ title, icon, iconBg, articles, initialCount = 5 }: FeedSectionProps) {
  const [expanded, setExpanded] = useState(false)

  const visibleArticles = expanded ? articles : articles.slice(0, initialCount)
  const hiddenCount = articles.length - initialCount

  if (articles.length === 0) return null

  return (
    <div style={{ background: '#161616', border: '0.5px solid #222', borderRadius: 14, overflow: 'hidden', marginBottom: 8 }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '11px 14px 10px', borderBottom: '0.5px solid #1e1e1e' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
          <div style={{ width: 18, height: 18, borderRadius: 5, background: iconBg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            {icon}
          </div>
          <span style={{ fontSize: 12, fontWeight: 500, color: '#d0d0d0' }}>{title}</span>
        </div>
        <span style={{ fontSize: 10, color: '#3a3a3a' }}>{articles.length} Artikel</span>
      </div>

      {/* Articles */}
      {visibleArticles.map((article, index) => (
        <NewsCard
          key={article.id}
          article={article}
          isLast={index === visibleArticles.length - 1 && (!expanded || articles.length <= initialCount)}
        />
      ))}

      {/* Load more */}
      {hiddenCount > 0 && (
        <div
          onClick={() => setExpanded(e => !e)}
          style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '9px 14px', cursor: 'pointer', borderTop: '0.5px solid #1a1a1a', background: '#141414' }}
        >
          <div style={{ display: 'flex', gap: 3 }}>
            {[0, 1, 2].map(i => (
              <div key={i} style={{ width: 4, height: 4, borderRadius: '50%', background: '#252525' }} />
            ))}
          </div>
          <span style={{ fontSize: 11, color: '#333' }}>
            {expanded ? 'Weniger anzeigen' : `${hiddenCount} weitere Meldungen`}
          </span>
          <ChevronDown
            size={12}
            color="#2a2a2a"
            style={{ transform: expanded ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}
          />
        </div>
      )}
    </div>
  )
}
