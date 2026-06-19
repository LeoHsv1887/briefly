'use client'
import { useState, useEffect } from 'react'
import { Play, Mic } from 'lucide-react'
import { isMorningInGermany } from '@/lib/time'

interface PodcastBannerProps {
  onNavigateToBriefing: () => void
}

export function PodcastBanner({ onNavigateToBriefing }: PodcastBannerProps) {
  const [episode, setEpisode] = useState<any>(null)
  const [isGenerating, setIsGenerating] = useState(false)

  const isMorning = isMorningInGermany()
  const typeLabel = isMorning ? 'Morning Brief' : 'Evening Brief'

  const topics = isMorning
    ? ['Wirtschaft', 'Politik', 'Technologie']
    : ['Märkte', 'Nachrichten', 'Ausblick']

  useEffect(() => {
    const type = isMorning ? 'morning' : 'evening'
    fetch(`/api/podcast/latest?type=${type}`)
      .then(r => r.json())
      .then(data => { if (data.available) setEpisode(data) })
      .catch(() => {})
  }, [])

  async function generate(e: React.MouseEvent) {
    e.stopPropagation()
    setIsGenerating(true)
    try {
      const res = await fetch('/api/podcast/generate')
      const data = await res.json()
      if (data.success) {
        setEpisode(data)
        onNavigateToBriefing()
      }
    } catch (e) { console.error(e) }
    setIsGenerating(false)
  }

  const mainText = episode
    ? `Dein ${isMorning ? 'Morning' : 'Evening'} Briefing ist verfügbar`
    : 'Jetzt dein Briefing bekommen'

  return (
    <div
      onClick={episode ? onNavigateToBriefing : undefined}
      style={{
        margin: '16px 18px 0',
        background: 'var(--pol-bg)',
        border: '0.5px solid var(--pol-border)',
        borderRadius: 22,
        padding: '16px 18px',
        position: 'relative',
        overflow: 'hidden',
        cursor: episode ? 'pointer' : 'default',
      }}
    >
      {/* Decorative background mic icon */}
      <Mic
        size={90}
        color="var(--pol-border)"
        style={{ position: 'absolute', right: -16, bottom: -16, opacity: 0.18, pointerEvents: 'none' }}
      />

      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12, position: 'relative' }}>
        <div style={{ width: 38, height: 38, borderRadius: 12, background: 'rgba(0,0,0,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <Mic size={18} color="var(--pol-t)" />
        </div>
        <div>
          <div style={{ fontSize: 9, fontWeight: 600, color: 'var(--pol-t)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 4 }}>
            {typeLabel}
          </div>
          <div style={{ fontSize: 15, fontWeight: 300, color: 'var(--t2)', lineHeight: 1.3 }}>
            {mainText}
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'relative' }}>
        <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
          {topics.map(t => (
            <span key={t} style={{ fontSize: 9, color: 'var(--pol-t)', background: 'rgba(0,0,0,0.25)', border: '0.5px solid var(--pol-border)', borderRadius: 20, padding: '3px 8px' }}>
              {t}
            </span>
          ))}
        </div>
        {episode ? (
          <button
            onClick={e => { e.stopPropagation(); onNavigateToBriefing() }}
            style={{ width: 34, height: 34, borderRadius: '50%', background: '#2a5aaa', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}
          >
            <Play size={14} color="#fff" fill="#fff" />
          </button>
        ) : (
          <button
            onClick={generate}
            disabled={isGenerating}
            style={{ width: 34, height: 34, borderRadius: '50%', background: isGenerating ? 'rgba(0,0,0,0.3)' : '#2a5aaa', border: 'none', cursor: isGenerating ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, opacity: isGenerating ? 0.5 : 1 }}
          >
            {isGenerating ? <Mic size={14} color="var(--pol-t)" /> : <Play size={14} color="#fff" fill="#fff" />}
          </button>
        )}
      </div>

      {episode && (
        <div style={{ display: 'flex', justifyContent: 'flex-end', fontSize: 9, color: 'var(--pol-border)', marginTop: 8, position: 'relative' }}>
          <span>{episode.duration} Min.</span>
        </div>
      )}
    </div>
  )
}
