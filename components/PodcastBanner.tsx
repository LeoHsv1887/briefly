'use client'
import { useState, useRef, useEffect } from 'react'
import { Play, Pause, Mic } from 'lucide-react'
import { isMorningInGermany } from '@/lib/time'

export function PodcastBanner() {
  const [episode, setEpisode] = useState<any>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [isGenerating, setIsGenerating] = useState(false)
  const [progress, setProgress] = useState(0)
  const audioRef = useRef<HTMLAudioElement>(null)

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

  async function generate() {
    setIsGenerating(true)
    try {
      const res = await fetch('/api/podcast/generate')
      const data = await res.json()
      if (data.success) {
        setEpisode(data)
        if (audioRef.current && data.audioBase64) {
          const byteChars = atob(data.audioBase64)
          const byteArrays = []
          for (let i = 0; i < byteChars.length; i += 512) {
            const slice = byteChars.slice(i, i + 512)
            const bytes = new Uint8Array(slice.length)
            for (let j = 0; j < slice.length; j++) bytes[j] = slice.charCodeAt(j)
            byteArrays.push(bytes)
          }
          const blob = new Blob(byteArrays, { type: 'audio/mpeg' })
          audioRef.current.src = URL.createObjectURL(blob)
          audioRef.current.load()
        }
      }
    } catch (e) { console.error(e) }
    setIsGenerating(false)
  }

  function togglePlay() {
    if (!audioRef.current) return
    if (isPlaying) audioRef.current.pause()
    else audioRef.current.play()
    setIsPlaying(!isPlaying)
  }

  return (
    <div
      style={{
        margin: '20px 18px 0',
        background: '#0c1624',
        border: '0.5px solid #142036',
        borderRadius: 22,
        padding: '16px 18px',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
        <div
          style={{
            width: 38,
            height: 38,
            borderRadius: 12,
            background: '#0f1e36',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}
        >
          <Mic size={18} color="#2a5aaa" />
        </div>
        <div>
          <div
            style={{
              fontSize: 9,
              fontWeight: 500,
              color: '#3a6aaa',
              letterSpacing: '0.1em',
              textTransform: 'uppercase',
              marginBottom: 4,
            }}
          >
            {typeLabel}
          </div>
          <div
            style={{
              fontFamily: "'Playfair Display', serif",
              fontSize: 15,
              fontWeight: 400,
              color: '#b8ccec',
              lineHeight: 1.3,
            }}
          >
            {episode ? 'Dein Briefing anhören' : 'Briefing generieren'}
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
          {topics.map(t => (
            <span
              key={t}
              style={{
                fontSize: 9,
                color: '#2a4a6a',
                background: '#0a1828',
                border: '0.5px solid #142036',
                borderRadius: 20,
                padding: '3px 8px',
              }}
            >
              {t}
            </span>
          ))}
        </div>
        {episode ? (
          <button
            onClick={togglePlay}
            style={{
              width: 34,
              height: 34,
              borderRadius: '50%',
              background: '#2a5aaa',
              border: 'none',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            {isPlaying
              ? <Pause size={14} color="#fff" />
              : <Play size={14} color="#fff" fill="#fff" />
            }
          </button>
        ) : (
          <button
            onClick={generate}
            disabled={isGenerating}
            style={{
              width: 34,
              height: 34,
              borderRadius: '50%',
              background: isGenerating ? '#0a1828' : '#2a5aaa',
              border: 'none',
              cursor: isGenerating ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
              opacity: isGenerating ? 0.5 : 1,
            }}
          >
            {isGenerating
              ? <Mic size={14} color="#3a6aaa" />
              : <Play size={14} color="#fff" fill="#fff" />
            }
          </button>
        )}
      </div>

      {episode && (
        <>
          <div
            style={{
              height: '2px',
              background: '#0f1e36',
              borderRadius: 2,
              marginTop: 12,
            }}
          >
            <div
              style={{
                height: '100%',
                width: `${progress}%`,
                background: '#2a5aaa',
                borderRadius: 2,
                transition: 'width 0.5s linear',
              }}
            />
          </div>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              fontSize: 9,
              color: '#1e3050',
              marginTop: 4,
            }}
          >
            <span>0:00</span>
            <span>{episode.duration} Min.</span>
          </div>
        </>
      )}

      <audio
        ref={audioRef}
        onTimeUpdate={() => {
          if (!audioRef.current) return
          setProgress((audioRef.current.currentTime / audioRef.current.duration) * 100 || 0)
        }}
        onEnded={() => setIsPlaying(false)}
      />
    </div>
  )
}
