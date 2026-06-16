'use client'
import { useState, useRef, useEffect } from 'react'
import { Play, Pause, SkipBack, SkipForward, Mic, FileText, RefreshCw, X } from 'lucide-react'
import { isMorningInGermany } from '@/lib/time'
import { getSettings } from '@/lib/profile'

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

function getTimeOfDay(hour: number): string {
  if (hour >= 5 && hour < 12) return 'Morgen'
  if (hour >= 12 && hour < 18) return 'Tag'
  if (hour >= 18) return 'Abend'
  return 'Nacht'
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
  const [date, setDate] = useState('')
  const [hour, setHour] = useState(new Date().getHours())
  const [firstName, setFirstName] = useState('Leonard')
  const audioRef = useRef<HTMLAudioElement>(null)

  const isMorning = isMorningInGermany()
  const currentType = isMorning ? 'morning' : 'evening'
  const typeLabel = isMorning ? 'Morning Brief' : 'Evening Brief'

  useEffect(() => {
    setFirstName(getSettings().username.split(' ')[0])
    const update = () => {
      const now = new Date()
      setHour(now.getHours())
      setDate(now.toLocaleDateString('de-DE', { weekday: 'long', day: 'numeric', month: 'long' }))
    }
    update()
    const interval = setInterval(update, 60_000)
    return () => clearInterval(interval)
  }, [])

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
        const top = (data.articles ?? []).sort((a: any, b: any) => b.score - a.score).slice(0, 5)
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

  const timeOfDay = getTimeOfDay(hour)

  return (
    <div style={{ overflowY: 'auto', paddingBottom: 24 }}>

      {/* ── Header ── */}
      <div style={{ padding: '22px 22px 0' }}>
        <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 12, color: '#2a2a2a', letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 22 }}>
          Briefly
        </div>
        <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 28, fontWeight: 400, color: '#f2f0ec', lineHeight: 1.15, marginBottom: 5 }}>
          Guten {timeOfDay},<br />{firstName}.
        </div>
        <div style={{ fontSize: 11, color: '#2e2e2e', letterSpacing: '0.03em', paddingBottom: 18 }}>{date}</div>
      </div>

      {/* ── Player Card ── */}
      <div style={{ margin: '0 18px', background: 'var(--bg-card)', border: '0.5px solid #141414', borderRadius: 20, overflow: 'hidden' }}>

        {/* Header */}
        <div style={{ padding: '14px 15px 12px', borderBottom: '0.5px solid #111' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 7 }}>
            <div style={{ width: 5, height: 5, borderRadius: '50%', background: '#2a5aaa', boxShadow: '0 0 4px #2a5aaa66' }} />
            <span style={{ fontSize: 8, fontWeight: 500, color: '#2a5aaa', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
              {typeLabel}
            </span>
          </div>
          {episode ? (
            <>
              <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 16, fontWeight: 400, color: '#e8e4dc', marginBottom: 3 }}>
                {episode.generatedAt ? formatDate(episode.generatedAt) : typeLabel}
              </div>
              <div style={{ fontSize: 10, color: '#333' }}>{episode.duration} Minuten</div>
            </>
          ) : (
            <>
              <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 15, fontWeight: 400, color: '#484440', marginBottom: 3 }}>
                Noch kein Briefing vorhanden
              </div>
              <div style={{ fontSize: 10, color: '#333' }}>Tippe auf Generieren</div>
            </>
          )}
        </div>

        {/* Controls */}
        <div style={{ padding: '12px 15px' }}>
          {episode && (
            <>
              <div
                style={{ height: '2.5px', background: '#141414', borderRadius: 2, marginBottom: 6, cursor: 'pointer' }}
                onClick={(e) => {
                  if (!audioRef.current || !duration) return
                  const rect = e.currentTarget.getBoundingClientRect()
                  audioRef.current.currentTime = ((e.clientX - rect.left) / rect.width) * duration
                }}
              >
                <div style={{ height: '100%', width: `${progress}%`, background: '#2a5aaa', borderRadius: 2 }} />
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 9, color: '#2a2a2a', marginBottom: 12 }}>
                <span>{formatTime(currentTime)}</span>
                <span>{formatTime(duration)}</span>
              </div>
            </>
          )}

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 18, marginBottom: 12 }}>
            <button
              onClick={() => skip(-15)}
              style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#444' }}
            >
              <SkipBack size={20} />
            </button>
            <button
              onClick={episode ? togglePlay : generate}
              disabled={isGenerating}
              style={{
                width: 42, height: 42, borderRadius: '50%',
                background: episode ? '#2a5aaa' : '#141414',
                border: episode ? 'none' : '0.5px solid #1c1c1c',
                cursor: isGenerating ? 'not-allowed' : 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}
            >
              {isGenerating
                ? <Mic size={16} color="#444" />
                : isPlaying
                  ? <Pause size={18} color="#fff" />
                  : <Play size={18} color={episode ? '#fff' : '#444'} fill={episode ? '#fff' : 'none'} />
              }
            </button>
            <button
              onClick={() => skip(15)}
              style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#444' }}
            >
              <SkipForward size={20} />
            </button>
          </div>

          {isGenerating && (
            <div style={{ textAlign: 'center', fontSize: 10, color: '#333', marginBottom: 10 }}>
              Wird generiert… (30–60 Sek.)
            </div>
          )}

          <div style={{ display: 'flex', gap: 7 }}>
            {episode && (
              <button
                onClick={() => setShowScript(!showScript)}
                style={{ flex: 1, padding: '7px 0', borderRadius: 8, background: 'transparent', border: '0.5px solid #1c1c1c', color: '#444', fontSize: 10, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}
              >
                <FileText size={12} /> Skript
              </button>
            )}
            <button
              onClick={generate}
              disabled={isGenerating}
              style={{ flex: 1, padding: '7px 0', borderRadius: 8, background: '#0c1624', border: '0.5px solid #142036', color: isGenerating ? '#333' : '#3a6aaa', fontSize: 10, cursor: isGenerating ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}
            >
              <RefreshCw size={12} /> {episode ? 'Neu generieren' : 'Generieren'}
            </button>
          </div>
        </div>
      </div>

      {/* ── Skript ── */}
      {showScript && episode?.script && (
        <div style={{ margin: '10px 18px 0', background: 'var(--bg-card)', border: '0.5px solid #141414', borderRadius: 14, overflow: 'hidden' }}>
          <div
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 13px', borderBottom: '0.5px solid #111', cursor: 'pointer' }}
            onClick={() => setShowScript(false)}
          >
            <span style={{ fontSize: 10, fontWeight: 500, color: '#484440', display: 'flex', alignItems: 'center', gap: 5 }}>
              <FileText size={12} /> Skript
            </span>
            <X size={12} color="#333" />
          </div>
          <div style={{ padding: '12px 13px', fontSize: 12, color: '#585450', lineHeight: 1.7, maxHeight: 200, overflowY: 'auto' }}>
            {episode.script}
          </div>
        </div>
      )}

      {/* ── Themen-Preview ── */}
      {previewArticles.length > 0 && (
        <div style={{ margin: '10px 18px 0', background: 'var(--bg-card)', border: '0.5px solid #141414', borderRadius: 14, padding: '12px 13px' }}>
          <div style={{ fontSize: 8, color: '#222', fontWeight: 500, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 8 }}>
            {episode ? 'Themen dieser Episode' : 'Nächstes Briefing · Vorschau'}
          </div>
          {previewArticles.map((article, i) => (
            <div
              key={article.id ?? i}
              style={{ display: 'flex', alignItems: 'flex-start', gap: 6, padding: '5px 0', borderBottom: i < previewArticles.length - 1 ? '0.5px solid #0e0e0e' : 'none' }}
            >
              <span style={{ fontSize: 10, fontWeight: 500, color: '#2a5aaa', width: 14, flexShrink: 0, marginTop: 1 }}>
                {i + 1}
              </span>
              <span style={{ fontSize: 11, color: '#848484', lineHeight: 1.35, flex: 1 }}>
                {article.title}
              </span>
              <span style={{ fontSize: 8, color: '#2a2a2a', background: '#0a0a0a', border: '0.5px solid #141414', borderRadius: 20, padding: '2px 6px', flexShrink: 0, marginTop: 1 }}>
                {getTopicLabel(article.topic)}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* ── Frühere Episoden ── */}
      {pastEpisodes.length > 0 && (
        <>
          <div style={{ fontSize: 9, fontWeight: 500, color: '#1e1e1e', letterSpacing: '0.1em', textTransform: 'uppercase', padding: '14px 18px 8px' }}>
            Frühere Episoden
          </div>
          {pastEpisodes.map((ep, i) => (
            <div
              key={i}
              onClick={() => { setEpisode(ep); loadAudio(ep); setIsPlaying(false) }}
              style={{ display: 'flex', alignItems: 'center', gap: 9, padding: '9px 18px', borderBottom: '0.5px solid #0a0a0a', cursor: 'pointer' }}
            >
              <div style={{ width: 32, height: 32, borderRadius: 8, flexShrink: 0, background: ep.type === 'morning' ? '#0e1624' : '#14141e', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Mic size={14} color={ep.type === 'morning' ? '#2a4a8a' : '#2a2a5a'} />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 11, color: '#b0b0b0' }}>
                  {ep.type === 'morning' ? 'Morning' : 'Evening'} Brief{ep.generatedAt ? ` · ${formatDate(ep.generatedAt)}` : ''}
                </div>
                <div style={{ fontSize: 9, color: '#2a2a2a', marginTop: 2 }}>{ep.duration} Min.</div>
              </div>
              <Play size={14} color="#1e1e1e" />
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
