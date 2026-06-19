'use client'
import { useState, useEffect } from 'react'
import { ChevronRight, Mic } from 'lucide-react'
import { isMorningInGermany } from '@/lib/time'

interface PodcastBannerProps {
  onNavigateToBriefing: () => void
}

export function PodcastBanner({ onNavigateToBriefing }: PodcastBannerProps) {
  const [episode, setEpisode] = useState<any>(null)

  const isMorning = isMorningInGermany()
  const typeLabel = isMorning ? 'Morning Brief' : 'Evening Brief'

  useEffect(() => {
    const type = isMorning ? 'morning' : 'evening'
    fetch(`/api/podcast/latest?type=${type}`)
      .then(r => r.json())
      .then(data => { if (data.available) setEpisode(data) })
      .catch(() => {})
  }, [])

  const mainText = episode ? 'Jetzt dein Briefing anhören' : 'Briefing generieren'

  return (
    <div
      onClick={onNavigateToBriefing}
      style={{
        margin: '14px 18px 0',
        background: 'var(--pol-bg)',
        border: '0.5px solid var(--pol-border)',
        borderRadius: 18,
        padding: 14,
        position: 'relative',
        overflow: 'hidden',
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        cursor: 'pointer',
      }}
    >
      {/* Decorative background mic */}
      <Mic
        size={80}
        style={{ position: 'absolute', right: -10, top: '50%', transform: 'translateY(-50%)', color: 'rgba(255,255,255,0.04)', pointerEvents: 'none' }}
      />

      {/* Mic icon */}
      <div style={{
        width: 38, height: 38, borderRadius: 11,
        background: 'rgba(90,138,186,0.15)', border: '0.5px solid rgba(90,138,186,0.2)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
        position: 'relative', zIndex: 1,
      }}>
        <Mic size={17} color="var(--pol-t)" />
      </div>

      {/* Text */}
      <div style={{ flex: 1, minWidth: 0, position: 'relative', zIndex: 1 }}>
        <div style={{ fontSize: 9, fontWeight: 700, color: 'var(--pol-t)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 3 }}>
          {typeLabel}
        </div>
        <div style={{ fontSize: 15, fontWeight: 500, color: '#ffffff' }}>
          {mainText}
        </div>
      </div>

      {/* Chevron */}
      <ChevronRight size={18} color="var(--pol-t)" style={{ flexShrink: 0, position: 'relative', zIndex: 1 }} />
    </div>
  )
}
