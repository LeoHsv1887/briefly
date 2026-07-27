'use client'
import { useEffect, useRef, useState } from 'react'
import { isMorningInGermany } from '@/lib/time'
import { TopicPill } from '@/components/FeedCards'

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

interface PreviewArticle {
  id?: string
  title: string
  topic: string
}

function formatTime(s: number) {
  const m = Math.floor(s / 60)
  return `${m}:${Math.floor(s % 60).toString().padStart(2, '0')}`
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('de-DE', { weekday: 'short', day: 'numeric', month: 'long' })
}

export function BriefingTab() {
  const [episode, setEpisode] = useState<Episode | null>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [isGenerating, setIsGenerating] = useState(false)
  const [showScript, setShowScript] = useState(false)
  const [progress, setProgress] = useState(0)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [morningEpisode, setMorningEpisode] = useState<Episode | null>(null)
  const [eveningEpisode, setEveningEpisode] = useState<Episode | null>(null)
  const [previewArticles, setPreviewArticles] = useState<PreviewArticle[]>([])
  const audioRef = useRef<HTMLAudioElement>(null)

  const isMorning = isMorningInGermany()
  const currentType = isMorning ? 'morning' : 'evening'

  useEffect(() => {
    fetch(`/api/podcast/latest?type=morning`).then(r => r.json())
      .then(data => { if (data.available) setMorningEpisode({ ...data, type: 'morning' }) }).catch(() => {})
    fetch(`/api/podcast/latest?type=evening`).then(r => r.json())
      .then(data => { if (data.available) setEveningEpisode({ ...data, type: 'evening' }) }).catch(() => {})
    fetch(`/api/podcast/latest?type=${currentType}`).then(r => r.json())
      .then(data => { if (data.available) setEpisode({ ...data, type: currentType }) }).catch(() => {})
    fetch('/api/feeds').then(r => r.json())
      .then(data => setPreviewArticles((data.articles ?? []).sort((a: any, b: any) => b.score - a.score).slice(0, 6)))
      .catch(() => {})
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
        const ep: Episode = { available: true, type: currentType, ...data }
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

  const pastEpisodes = [
    ...(morningEpisode && morningEpisode.type !== currentType ? [morningEpisode] : []),
    ...(eveningEpisode && eveningEpisode.type !== currentType ? [eveningEpisode] : []),
  ]

  return (
    <div>
      {/* Header */}
      <div style={{ padding: '16px 20px 14px', borderBottom: '0.5px solid var(--line)' }}>
        <div style={{ fontSize: 28, fontWeight: 800, color: 'var(--t1)', letterSpacing: '-0.03em', marginBottom: 4 }}>Briefing</div>
        <div style={{ fontSize: 12, color: 'var(--t3)' }}>
          {new Date().toLocaleDateString('de-DE', { weekday: 'long', day: 'numeric', month: 'long' })}
        </div>
      </div>

      {/* Player Card */}
      <div style={{ margin: '14px 14px 0', background: 'var(--bg1)', border: '0.5px solid var(--line)', borderRadius: 20, overflow: 'hidden' }}>
        <div style={{ padding: '16px 18px 14px', borderBottom: '0.5px solid var(--line)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10 }}>
            <span style={{ width: 5, height: 5, borderRadius: '50%', background: episode?.available ? 'var(--up)' : 'var(--t4)', display: 'inline-block' }} />
            <span style={{ fontSize: 9, fontWeight: 700, color: 'var(--t4)', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
              {isMorning ? 'Morning Brief' : 'Evening Brief'}
            </span>
          </div>
          <div style={{ fontSize: 20, fontWeight: 700, color: 'var(--t1)', letterSpacing: '-0.02em', marginBottom: 3 }}>
            {episode?.available ? 'Dein Briefing ist bereit' : 'Noch kein Briefing vorhanden'}
          </div>
          <div style={{ fontSize: 12, color: 'var(--t3)' }}>
            {episode?.available ? `${episode.duration} Minuten` : 'Tippe auf Generieren'}
          </div>
        </div>

        <div style={{ padding: '16px 18px' }}>
          {episode?.available && (
            <>
              <div
                style={{ height: 3, background: 'var(--bg2)', borderRadius: 2, marginBottom: 8, cursor: 'pointer' }}
                onClick={e => {
                  if (!audioRef.current || !duration) return
                  const rect = e.currentTarget.getBoundingClientRect()
                  audioRef.current.currentTime = ((e.clientX - rect.left) / rect.width) * duration
                }}
              >
                <div style={{ height: '100%', width: `${progress}%`, background: 'var(--t2)', borderRadius: 2, transition: 'width 0.5s linear' }} />
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
                <span style={{ fontSize: 10, color: 'var(--t4)' }}>{formatTime(currentTime)}</span>
                <span style={{ fontSize: 10, color: 'var(--t4)' }}>{formatTime(duration)}</span>
              </div>
            </>
          )}

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 20, marginBottom: 16 }}>
            <button onClick={() => skip(-15)} style={{ background: 'none', border: 'none', color: 'var(--t3)', fontSize: 20, cursor: 'pointer' }}>
              <i className="ti ti-rewind-backward-15" />
            </button>
            <div onClick={episode?.available ? togglePlay : generate} style={{
              width: 48, height: 48, borderRadius: '50%',
              background: episode?.available ? 'var(--acc)' : 'var(--bg2)',
              border: episode?.available ? 'none' : '0.5px solid var(--line2)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: isGenerating ? 'not-allowed' : 'pointer',
            }}>
              {isGenerating
                ? <span className="spinner" />
                : <i className={`ti ${isPlaying ? 'ti-player-pause-filled' : 'ti-player-play-filled'}`} style={{ fontSize: 20, color: episode?.available ? '#fff' : 'var(--t3)' }} />}
            </div>
            <button onClick={() => skip(15)} style={{ background: 'none', border: 'none', color: 'var(--t3)', fontSize: 20, cursor: 'pointer' }}>
              <i className="ti ti-rewind-forward-15" />
            </button>
          </div>

          {isGenerating && (
            <div style={{ textAlign: 'center', fontSize: 10, color: 'var(--t4)', marginBottom: 10 }}>
              Wird generiert… (30–60 Sek.)
            </div>
          )}

          <div style={{ display: 'flex', gap: 8 }}>
            {episode?.available && (
              <div onClick={() => setShowScript(s => !s)} style={{
                flex: 1, padding: '9px', borderRadius: 12, background: 'var(--bg2)', border: '0.5px solid var(--line)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, cursor: 'pointer',
                fontSize: 12, fontWeight: 600, color: 'var(--t3)',
              }}>
                <i className="ti ti-file-text" style={{ fontSize: 14 }} />Skript
              </div>
            )}
            <div onClick={generate} style={{
              flex: 1.5, padding: '9px', borderRadius: 12, background: 'var(--bg2)', border: '0.5px solid var(--line)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
              cursor: isGenerating ? 'not-allowed' : 'pointer',
              fontSize: 12, fontWeight: 600, color: 'var(--t2)',
            }}>
              {isGenerating ? <span className="spinner" /> : <i className="ti ti-refresh" style={{ fontSize: 14 }} />}
              {isGenerating ? 'Generiert…' : episode?.available ? 'Neu generieren' : 'Generieren'}
            </div>
          </div>
        </div>
      </div>

      {/* Skript */}
      {showScript && episode?.script && (
        <div style={{ margin: '8px 14px 0', background: 'var(--bg1)', border: '0.5px solid var(--line)', borderRadius: 16, overflow: 'hidden' }}>
          <div onClick={() => setShowScript(false)} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 15px', borderBottom: '0.5px solid var(--line)', cursor: 'pointer' }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--t3)', display: 'flex', alignItems: 'center', gap: 6 }}>
              <i className="ti ti-file-text" style={{ fontSize: 13 }} />Skript
            </span>
            <i className="ti ti-x" style={{ fontSize: 13, color: 'var(--t4)' }} />
          </div>
          <div style={{ padding: '13px 15px', fontSize: 12, color: 'var(--t2)', lineHeight: 1.7, maxHeight: 220, overflowY: 'auto' }}>
            {episode.script}
          </div>
        </div>
      )}

      {/* Themen */}
      {previewArticles.length > 0 && (
        <div style={{ margin: '8px 14px 0', background: 'var(--bg1)', border: '0.5px solid var(--line)', borderRadius: 18, overflow: 'hidden' }}>
          <div style={{ padding: '13px 16px', borderBottom: '0.5px solid var(--line)' }}>
            <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--t4)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
              {episode?.available ? 'Themen dieser Episode' : 'Nächstes Briefing · Vorschau'}
            </span>
          </div>
          {previewArticles.map((article, i) => (
            <div key={article.id ?? i} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '12px 16px',
              borderBottom: i < previewArticles.length - 1 ? '0.5px solid var(--line)' : 'none' }}>
              <span style={{ fontSize: 13, fontWeight: 800, color: 'var(--t5)', width: 18, flexShrink: 0 }}>{i + 1}</span>
              <span style={{ fontSize: 13, color: 'var(--t2)', lineHeight: 1.4, flex: 1 }}>{article.title}</span>
              <TopicPill topic={article.topic} small />
            </div>
          ))}
        </div>
      )}

      {/* Frühere Episoden */}
      {pastEpisodes.length > 0 && (
        <>
          <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--t4)', letterSpacing: '0.1em', textTransform: 'uppercase', padding: '18px 18px 10px' }}>
            Frühere Episoden
          </div>
          <div style={{ margin: '0 14px', background: 'var(--bg1)', border: '0.5px solid var(--line)', borderRadius: 18, overflow: 'hidden' }}>
            {pastEpisodes.map((ep, i) => (
              <div key={ep.type} onClick={() => { setEpisode(ep); loadAudio(ep); setIsPlaying(false) }} style={{
                display: 'flex', alignItems: 'center', gap: 10, padding: '12px 16px',
                borderBottom: i < pastEpisodes.length - 1 ? '0.5px solid var(--line)' : 'none', cursor: 'pointer',
              }}>
                <div style={{ width: 32, height: 32, borderRadius: 9, background: 'var(--bg2)', border: '0.5px solid var(--line)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <i className={`ti ${ep.type === 'morning' ? 'ti-sun' : 'ti-moon'}`} style={{ fontSize: 15, color: 'var(--t3)' }} />
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 12, color: 'var(--t2)', fontWeight: 500 }}>
                    {ep.type === 'morning' ? 'Morning' : 'Evening'} Brief{ep.generatedAt ? ` · ${formatDate(ep.generatedAt)}` : ''}
                  </div>
                  <div style={{ fontSize: 10, color: 'var(--t4)', marginTop: 2 }}>{ep.duration} Min.</div>
                </div>
                <i className="ti ti-player-play" style={{ fontSize: 14, color: 'var(--t4)' }} />
              </div>
            ))}
          </div>
        </>
      )}

      <div style={{ height: 20 }} />

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
