'use client'
import { useState, useRef, useEffect } from 'react'
import { Play, Pause, SkipBack, SkipForward, Mic } from 'lucide-react'

interface Episode {
  available: boolean
  title?: string
  duration?: number
  generatedAt?: string
  type?: 'morning' | 'evening'
  audioBase64?: string
}

export function BriefingTab() {
  const [morning, setMorning] = useState<Episode>({ available: false })
  const [evening, setEvening] = useState<Episode>({ available: false })
  const [activeEpisode, setActiveEpisode] = useState<Episode | null>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [isGenerating, setIsGenerating] = useState(false)
  const [progress, setProgress] = useState(0)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const audioRef = useRef<HTMLAudioElement>(null)

  useEffect(() => {
    fetch('/api/podcast/latest?type=morning').then(r => r.json()).then(setMorning)
    fetch('/api/podcast/latest?type=evening').then(r => r.json()).then(setEvening)
  }, [])

  const hour = new Date().getHours()
  const currentType = hour >= 12 ? 'evening' : 'morning'
  const currentEpisode = currentType === 'morning' ? morning : evening

  function loadEpisode(ep: Episode) {
    if (!ep.audioBase64) return
    setActiveEpisode(ep)
    setIsPlaying(false)
    setProgress(0)
    setCurrentTime(0)
    if (audioRef.current) {
      const byteChars = atob(ep.audioBase64)
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

  async function generateEpisode() {
    setIsGenerating(true)
    try {
      const res = await fetch('/api/podcast/generate')
      const data = await res.json()
      if (data.success) {
        const ep: Episode = { available: true, ...data }
        if (data.type === 'morning') setMorning(ep)
        else setEvening(ep)
        loadEpisode(ep)
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

  function skip(s: number) {
    if (audioRef.current) audioRef.current.currentTime = Math.max(0, audioRef.current.currentTime + s)
  }

  function formatTime(s: number) {
    const m = Math.floor(s / 60)
    return `${m}:${Math.floor(s % 60).toString().padStart(2, '0')}`
  }

  const pastEpisodes = [
    morning.available && morning !== currentEpisode ? morning : null,
    evening.available && evening !== currentEpisode ? evening : null,
  ].filter(Boolean) as Episode[]

  return (
    <div style={{ padding: '10px 14px 16px', overflowY: 'auto' }}>

      {/* Aktuelle Episode – großer Player */}
      <div style={{ background: '#161616', border: '0.5px solid #222', borderRadius: 14, overflow: 'hidden', marginBottom: 8 }}>
        <div style={{ padding: '14px 16px', borderBottom: '0.5px solid #1e1e1e' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
            <Mic size={12} color="#c48a2a" />
            <span style={{ fontSize: 10, fontWeight: 500, color: '#c48a2a', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
              {currentType === 'morning' ? 'Morning Brief' : 'Evening Brief'}
            </span>
          </div>
          {currentEpisode.available ? (
            <>
              <div style={{ fontSize: 16, fontWeight: 500, color: '#e8e8e8', marginBottom: 4 }}>
                {currentEpisode.title}
              </div>
              <div style={{ fontSize: 12, color: '#555' }}>
                {currentEpisode.duration} Minuten
              </div>
            </>
          ) : (
            <>
              <div style={{ fontSize: 15, fontWeight: 500, color: '#e8e8e8', marginBottom: 4 }}>
                {currentType === 'morning' ? 'Kein Morning Brief verfügbar' : 'Kein Evening Brief verfügbar'}
              </div>
              <div style={{ fontSize: 12, color: '#555' }}>
                {currentType === 'morning' ? 'Wird täglich um 8 Uhr generiert' : 'Wird täglich um 20 Uhr generiert'}
              </div>
            </>
          )}
        </div>

        <div style={{ padding: '14px 16px' }}>
          {activeEpisode && (
            <>
              <div
                style={{ height: 3, background: '#1e1e1e', borderRadius: 2, marginBottom: 6, cursor: 'pointer' }}
                onClick={(e) => {
                  if (!audioRef.current) return
                  const rect = e.currentTarget.getBoundingClientRect()
                  audioRef.current.currentTime = ((e.clientX - rect.left) / rect.width) * duration
                }}
              >
                <div style={{ height: '100%', width: `${progress}%`, background: '#c48a2a', borderRadius: 2 }} />
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: '#333', marginBottom: 14 }}>
                <span>{formatTime(currentTime)}</span>
                <span>{formatTime(duration)}</span>
              </div>
            </>
          )}

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 20 }}>
            <button onClick={() => skip(-15)} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: activeEpisode ? '#555' : '#2a2a2a' }}>
              <SkipBack size={22} />
            </button>
            <button
              onClick={currentEpisode.available ? (activeEpisode ? togglePlay : () => loadEpisode(currentEpisode)) : generateEpisode}
              disabled={isGenerating}
              style={{
                width: 48, height: 48, borderRadius: '50%',
                background: currentEpisode.available ? '#c48a2a' : '#1e1e1e',
                border: currentEpisode.available ? 'none' : '0.5px solid #333',
                cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center'
              }}
            >
              {isGenerating
                ? <span style={{ fontSize: 10, color: '#555' }}>...</span>
                : isPlaying
                  ? <Pause size={20} color="#0f0f0f" />
                  : <Play size={20} color={currentEpisode.available ? '#0f0f0f' : '#555'} fill={currentEpisode.available ? '#0f0f0f' : 'none'} />
              }
            </button>
            <button onClick={() => skip(15)} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: activeEpisode ? '#555' : '#2a2a2a' }}>
              <SkipForward size={22} />
            </button>
          </div>

          {!currentEpisode.available && !isGenerating && (
            <button
              onClick={generateEpisode}
              style={{
                width: '100%', marginTop: 12, padding: '8px', borderRadius: 8,
                background: '#1e1a10', border: '0.5px solid #c48a2a44',
                color: '#c48a2a', fontSize: 12, cursor: 'pointer'
              }}
            >
              Jetzt generieren
            </button>
          )}

          {isGenerating && (
            <div style={{ textAlign: 'center', marginTop: 12, fontSize: 12, color: '#444' }}>
              Episode wird generiert... (30-60 Sek.)
            </div>
          )}
        </div>
      </div>

      {/* Frühere Episoden */}
      {pastEpisodes.length > 0 && (
        <>
          <div style={{ fontSize: 11, fontWeight: 500, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#3a3a3a', marginBottom: 8 }}>
            Frühere Episoden
          </div>
          {pastEpisodes.map((ep, i) => (
            <div
              key={i}
              onClick={() => loadEpisode(ep)}
              style={{
                background: '#161616', border: '0.5px solid #1e1e1e', borderRadius: 12,
                padding: '11px 13px', marginBottom: 6,
                display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer'
              }}
            >
              <div style={{
                width: 36, height: 36, borderRadius: 8, flexShrink: 0,
                background: ep.type === 'morning' ? '#1a1a10' : '#14141e',
                display: 'flex', alignItems: 'center', justifyContent: 'center'
              }}>
                <Mic size={16} color={ep.type === 'morning' ? '#c48a2a' : '#7b7fe0'} />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 12, fontWeight: 500, color: '#c8c8c8' }}>{ep.title}</div>
                <div style={{ fontSize: 11, color: '#444', marginTop: 2 }}>{ep.duration} Min.</div>
              </div>
              <Play size={16} color="#444" />
            </div>
          ))}
        </>
      )}

      <audio
        ref={audioRef}
        onTimeUpdate={() => {
          if (!audioRef.current) return
          setCurrentTime(audioRef.current.currentTime)
          setProgress((audioRef.current.currentTime / audioRef.current.duration) * 100 || 0)
        }}
        onLoadedMetadata={() => { if (audioRef.current) setDuration(audioRef.current.duration) }}
        onEnded={() => setIsPlaying(false)}
      />
    </div>
  )
}
