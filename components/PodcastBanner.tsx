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
  const greeting = isMorning ? 'Dein Morgenbriefing ist verfügbar' : 'Dein Abendbriefing ist verfügbar'
  const generateLabel = isMorning ? 'Morgenbriefing jetzt generieren' : 'Abendbriefing jetzt generieren'

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
    <div style={{
      background: '#161616',
      border: '0.5px solid #2a2010',
      borderRadius: 13,
      padding: '12px 14px',
      marginBottom: 8
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{
          width: 36, height: 36, borderRadius: 9,
          background: '#1e1a10', border: '0.5px solid #c48a2a44',
          display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
        }}>
          <Mic size={18} color="#c48a2a" />
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 10, fontWeight: 500, color: '#c48a2a', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
            {typeLabel}
          </div>
          <div style={{ fontSize: 13, fontWeight: 500, color: '#d8d8d8', marginTop: 2 }}>
            {episode ? greeting : generateLabel}
          </div>
          {episode && (
            <div style={{ fontSize: 11, color: '#444', marginTop: 1 }}>
              {episode.duration} Min. · bereit zum Abspielen
            </div>
          )}
        </div>

        {episode ? (
          <button
            onClick={togglePlay}
            style={{
              width: 32, height: 32, borderRadius: '50%', background: '#c48a2a',
              border: 'none', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
            }}
          >
            {isPlaying
              ? <Pause size={14} color="#0f0f0f" />
              : <Play size={14} color="#0f0f0f" fill="#0f0f0f" />
            }
          </button>
        ) : (
          <button
            onClick={generate}
            disabled={isGenerating}
            style={{
              padding: '6px 12px', borderRadius: 8,
              background: isGenerating ? '#1a1a1a' : '#1e1a10',
              border: '0.5px solid #c48a2a44',
              color: isGenerating ? '#444' : '#c48a2a',
              fontSize: 11, fontWeight: 500, cursor: isGenerating ? 'not-allowed' : 'pointer',
              flexShrink: 0, whiteSpace: 'nowrap'
            }}
          >
            {isGenerating ? 'Generiert...' : 'Generieren'}
          </button>
        )}
      </div>

      {episode && (
        <>
          <div style={{ height: '2.5px', background: '#1e1e1e', borderRadius: 2, marginTop: 10 }}>
            <div style={{ height: '100%', width: `${progress}%`, background: '#c48a2a', borderRadius: 2 }} />
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: '#333', marginTop: 4 }}>
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
