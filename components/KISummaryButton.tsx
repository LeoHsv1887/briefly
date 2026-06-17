'use client'
import { useState } from 'react'
import { Sparkles } from 'lucide-react'

interface ArticleInput {
  title: string
  url: string
  content?: string
}

interface KISummaryButtonProps {
  article: ArticleInput
  small?: boolean
  onArticleClick?: () => void
}

export function KISummaryButton({ article, small = false, onArticleClick }: KISummaryButtonProps) {
  const [summary, setSummary] = useState<string | null>(null)
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)

  async function handleClick(e: React.MouseEvent) {
    e.stopPropagation()
    e.preventDefault()

    if (small && onArticleClick) {
      onArticleClick()
      return
    }

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
      <div
        onClick={handleClick}
        style={{
          display: 'inline-flex', alignItems: 'center', gap: 4,
          fontSize: small ? 9 : 10,
          color: '#666', background: 'var(--bg-subtle)',
          border: '0.5px solid #1a1a1a', borderRadius: 7,
          padding: small ? '3px 8px' : '5px 10px',
          cursor: 'pointer', userSelect: 'none',
        }}
      >
        <Sparkles size={small ? 9 : 10} color="#666" />
        {loading ? 'Lädt...' : open ? 'Ausblenden' : 'KI-Zusammenfassung'}
      </div>
      {!small && open && summary && (
        <div style={{
          fontSize: 12, color: '#686460', lineHeight: 1.65, marginTop: 8,
          padding: '10px 12px', background: 'var(--bg-subtle)',
          borderRadius: 10, borderLeft: '2px solid #1e1e1e',
        }}>
          {summary}
        </div>
      )}
    </div>
  )
}
