'use client'
import { useState, useRef, useEffect } from 'react'
import { Play, Pause, SkipBack, SkipForward, Mic, FileText, RefreshCw, X } from 'lucide-react'

interface Episode {
  available: boolean
  title?: string
  duration?: number
  generatedAt?: string
  type?: 'morning' | 'evening'
  audioBase64?: string
  script?: string
  topics?: string[]
}

const topicColors: Record<string, { bg: string; color: string }> = {
  'Wirtschaft & Finanzen': { bg: '#1a2a1e', color: '#22c47a' },
  'Aktienmärkte':          { bg: '#2a2310', color: '#d4a843' },
  'Politik DE/EU':         { bg: '#1e1e2e', color: '#7b7fe0' },
  'Geopolitik':            { bg: '#2a1e1a', color: '#d4844a' },
  'Technologie & KI':      { bg: '#1e2530', color: '#5ba8e0' },
  'Sport':                 { bg: '#251e2a', color: '#b87bd4' },
}

function getTopicLabel(topic: string): string {
  const map: Record<string, string> = {
    'Wirtschaft & Finanzen': 'Wirtschaft',
    'Aktienmärkte':          'Märkte',
    'Politik DE/EU':         'Politik',
    'Geopolitik':            'Geopolitik',
    'Technologie & KI':      'Tech & KI',
    'Sport':                 'Sport',
  }
  return map[topic] ?? topic
}

export function BriefingTab() {
  const [episode, setEpisode] = useState<Episode | null>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [isGenerating, setIsGenerating] = useState(false)
  const [showScript, setShowScript] = useState(false)
  const [progress, setProgress] = useState(0)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [pastEpisodes, setPastEpisodes] = useState<Episode[]>([])
  const [previewArticles, setPreviewArticles] = useState<any[]>([])
  const audioRef = useRef<HTMLAudioElement>(null)

  const hour = new Date().getHours()
  const isMorning = hour < 12
  const currentType = isMorning ? 'morning' : 'evening'
  const typeLabel = isMorning ? 'Morning Brief' : 'Evening Brief'

  useEffect(() => {
    fetch(`/api/podcast/latest?type=${currentType}`)
      .then(r => r.json())
      .then(data => { if (data.available) setEpisode(data) })
      .catch(() => {})

    const otherType = isMorning ? 'evening' : 'morning'
    fetch(`/api/podcast/latest?type=${otherType}`)
      .then(r => r.json())
      .then(data => { if (data.available) setPastEpisodes([data]) })
      .catch(() => {})

    fetch('/api/feeds')
      .then(r => r.json())
      .then(data => {
        const top = (data.articles ?? [])
          .sort((a: any, b: any) => b.score - a.score)
          .slice(0, 5)
        setPreviewArticles(top)
      })
      .catch(() => {})
  }, [])

  function loadAudio(ep: Episode) {
    if (!ep.audioBase64 || !audioRef.current) return
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

  async function generate() {
    setIsGenerating(true)
    setProgress(0)
    setCurrentTime(0)
    try {
      const res = await fetch('/api/podcast/generate')
      const data = await res.json()
      if (data.success) {
        const ep: Episode = { available: true, ...data }
        setEpisode(ep)
        loadAudio(ep)
      }
    } catch (e) { console.error(e) }
    setIsGenerating(false)
  }

  function togglePlay() {
    if (!audioRef.current) return
    if (!audioRef.current.src || audioRef.current.src === window.location.href) {
      if (episode) loadAudio(episode)
      return
    }
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

  function formatDate(iso: string) {
    return new Date(iso).toLocaleDateString('de-DE', { weekday: 'short', day: 'numeric', month: 'long' })
  }

  return (
    <div style={{ padding: '12px 14px 16px', overflowY: 'auto' }}>

      {/* ── PLAYER CARD ── */}
      <div style={{ background: '#161616', border: '0.5px solid #222', borderRadius: 14, overflow: 'hidden', marginBottom: 10 }}>

        {/* Header */}
        <div style={{ padding: '14px 16px 12px', borderBottom: '0.5px solid #1e1e1e' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
            <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#c48a2a', boxShadow: '0 0 5px #c48a2a88' }} />
            <span style={{ fontSize: 10, fontWeight: 500, color: '#c48a2a', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
              {typeLabel}
            </span>
          </div>
          {episode ? (
            <>
              <div style={{ fontSize: 16, fontWeight: 500, color: '#e8e8e8', marginBottom: 3 }}>
                {episode.generatedAt ? formatDate(episode.generatedAt) : typeLabel}
              </div>
              <div style={{ fontSize: 12, color: '#555' }}>
                {episode.duration} Minuten
              </div>
            </>
          ) : (
            <>
              <div style={{ fontSize: 15, fontWeight: 500, color: '#888', marginBottom: 3 }}>
                Noch kein {typeLabel} vorhanden
              </div>
              <div style={{ fontSize: 12, color: '#444' }}>
                Tippe auf &quot;Generieren&quot; um eine neue Episode zu erstellen
              </div>
            </>
          )}
        </div>

        {/* Controls */}
        <div style={{ padding: '14px 16px' }}>
          {episode && (
            <>
              <div
                style={{ height: 3, background: '#1e1e1e', borderRadius: 2, marginBottom: 7, cursor: 'pointer' }}
                onClick={(e) => {
                  if (!audioRef.current || !duration) return
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

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 20, marginBottom: 14 }}>
            <button onClick={() => skip(-15)} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: episode ? '#555' : '#2a2a2a', fontSize: 22 }}>
              <SkipBack size={22} />
            </button>
            <button
              onClick={episode ? togglePlay : generate}
              disabled={isGenerating}
              style={{
                width: 48, height: 48, borderRadius: '50%',
                background: episode ? '#c48a2a' : '#1e1e1e',
                border: episode ? 'none' : '0.5px solid #333',
                cursor: isGenerating ? 'not-allowed' : 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}
            >
              {isGenerating
                ? <Mic size={18} color="#444" />
                : isPlaying
                  ? <Pause size={20} color={episode ? '#0f0f0f' : '#555'} />
                  : <Play size={20} color={episode ? '#0f0f0f' : '#555'} fill={episode ? '#0f0f0f' : 'none'} />
              }
            </button>
            <button onClick={() => skip(15)} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: episode ? '#555' : '#2a2a2a' }}>
              <SkipForward size={22} />
            </button>
          </div>

          {isGenerating && (
            <div style={{ textAlign: 'center', fontSize: 12, color: '#555', marginBottom: 12 }}>
              Episode wird generiert… (30–60 Sekunden)
            </div>
          )}

          {/* Action Buttons */}
          <div style={{ display: 'flex', gap: 8 }}>
            {episode && (
              <button
                onClick={() => setShowScript(!showScript)}
                style={{
                  flex: 1, padding: '8px 0', borderRadius: 8,
                  background: 'transparent', border: '0.5px solid #2a2a2a',
                  color: '#555', fontSize: 12, fontWeight: 500,
                  cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5,
                }}
              >
                <FileText size={13} />
                Skript lesen
              </button>
            )}
            <button
              onClick={generate}
              disabled={isGenerating}
              style={{
                flex: 1, padding: '8px 0', borderRadius: 8,
                background: '#1e1a10', border: '0.5px solid #c48a2a44',
                color: isGenerating ? '#444' : '#c48a2a',
                fontSize: 12, fontWeight: 500,
                cursor: isGenerating ? 'not-allowed' : 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5,
              }}
            >
              <RefreshCw size={13} />
              {episode ? 'Neu generieren' : 'Generieren'}
            </button>
          </div>
        </div>
      </div>

      {/* ── SKRIPT ANSICHT ── */}
      {showScript && episode?.script && (
        <div style={{ background: '#161616', border: '0.5px solid #222', borderRadius: 12, overflow: 'hidden', marginBottom: 10 }}>
          <div
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', borderBottom: '0.5px solid #1e1e1e', cursor: 'pointer' }}
            onClick={() => setShowScript(false)}
          >
            <span style={{ fontSize: 12, fontWeight: 500, color: '#888', display: 'flex', alignItems: 'center', gap: 6 }}>
              <FileText size={13} /> Skript
            </span>
            <X size={13} color="#444" />
          </div>
          <div style={{ padding: '12px 14px', fontSize: 12, color: '#666', lineHeight: 1.7, maxHeight: 200, overflowY: 'auto' }}>
            {episode.script}
          </div>
        </div>
      )}

      {/* ── HEUTE IM BRIEFING (Vorschau) ── */}
      {previewArticles.length > 0 && (
        <div style={{ background: '#161616', border: '0.5px solid #222', borderRadius: 12, padding: '12px 14px', marginBottom: 10 }}>
          <div style={{ fontSize: 10, fontWeight: 500, color: '#3a3a3a', letterSpacing: '0.07em', textTransform: 'uppercase', marginBottom: 10 }}>
            {episode ? 'Themen dieser Episode' : 'Nächstes Briefing – Vorschau'}
          </div>
          {previewArticles.map((article, i) => {
            const tc = topicColors[article.topic] ?? { bg: '#1e1e1e', color: '#888' }
            return (
              <div key={article.id ?? i} style={{
                display: 'flex', alignItems: 'flex-start', gap: 8,
                padding: '6px 0',
                borderBottom: i < previewArticles.length - 1 ? '0.5px solid #1a1a1a' : 'none',
              }}>
                <span style={{ fontSize: 11, fontWeight: 500, color: '#c48a2a', width: 16, flexShrink: 0, marginTop: 1 }}>
                  {i + 1}
                </span>
                <span style={{ fontSize: 12, color: '#a0a0a0', lineHeight: 1.4, flex: 1 }}>
                  {article.title}
                </span>
                <span style={{
                  fontSize: 10, fontWeight: 500, padding: '2px 6px', borderRadius: 5,
                  background: tc.bg, color: tc.color,
                  flexShrink: 0, alignSelf: 'flex-start', marginTop: 1,
                }}>
                  {getTopicLabel(article.topic)}
                </span>
              </div>
            )
          })}
        </div>
      )}

      {/* ── FRÜHERE EPISODEN ── */}
      {pastEpisodes.length > 0 && (
        <>
          <div style={{ fontSize: 11, fontWeight: 500, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#3a3a3a', marginBottom: 8 }}>
            Frühere Episoden
          </div>
          {pastEpisodes.map((ep, i) => (
            <div
              key={i}
              style={{
                background: '#161616', border: '0.5px solid #1e1e1e', borderRadius: 12,
                padding: '11px 13px', marginBottom: 6,
                display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer',
              }}
              onClick={() => { setEpisode(ep); loadAudio(ep); setIsPlaying(false) }}
            >
              <div style={{
                width: 36, height: 36, borderRadius: 8, flexShrink: 0,
                background: ep.type === 'morning' ? '#1a1a10' : '#14141e',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <Mic size={16} color={ep.type === 'morning' ? '#c48a2a' : '#7b7fe0'} />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 12, fontWeight: 500, color: '#c8c8c8' }}>
                  {ep.type === 'morning' ? 'Morning Brief' : 'Evening Brief'}
                  {ep.generatedAt ? ` · ${formatDate(ep.generatedAt)}` : ''}
                </div>
                <div style={{ fontSize: 11, color: '#444', marginTop: 2 }}>
                  {ep.duration} Min.
                </div>
              </div>
              <Play size={16} color="#333" />
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
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
      />
    </div>
  )
}
