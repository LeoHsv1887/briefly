'use client'
import { useState, useRef } from 'react'
import { Play, Pause, SkipBack, SkipForward, Mic, RefreshCw } from 'lucide-react'

export function PodcastPlayer() {
  const [isLoading, setIsLoading] = useState(false)
  const [isPlaying, setIsPlaying] = useState(false)
  const [progress, setProgress] = useState(0)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [episodeInfo, setEpisodeInfo] = useState<any>(null)
  const [audioUrl, setAudioUrl] = useState<string | null>(null)
  const audioRef = useRef<HTMLAudioElement>(null)

  async function generateEpisode() {
    setIsLoading(true)
    setIsPlaying(false)
    try {
      const res = await fetch('/api/podcast/generate')
      const data = await res.json()

      if (data.success && data.audioBase64) {
        // Base64 in Blob URL umwandeln
        const byteChars = atob(data.audioBase64)
        const byteArrays = []
        for (let i = 0; i < byteChars.length; i += 512) {
          const slice = byteChars.slice(i, i + 512)
          const byteNumbers = new Array(slice.length)
          for (let j = 0; j < slice.length; j++) {
            byteNumbers[j] = slice.charCodeAt(j)
          }
          byteArrays.push(new Uint8Array(byteNumbers))
        }
        const blob = new Blob(byteArrays, { type: 'audio/mpeg' })
        const url = URL.createObjectURL(blob)
        setAudioUrl(url)
        setEpisodeInfo(data)

        if (audioRef.current) {
          audioRef.current.src = url
          audioRef.current.load()
        }
      }
    } catch (e) {
      console.error('Podcast error:', e)
    }
    setIsLoading(false)
  }

  function togglePlay() {
    if (!audioRef.current || !audioUrl) return
    if (isPlaying) {
      audioRef.current.pause()
    } else {
      audioRef.current.play()
    }
    setIsPlaying(!isPlaying)
  }

  function skip(seconds: number) {
    if (!audioRef.current) return
    audioRef.current.currentTime = Math.max(0, audioRef.current.currentTime + seconds)
  }

  function formatTime(s: number) {
    const m = Math.floor(s / 60)
    const sec = Math.floor(s % 60)
    return `${m}:${sec.toString().padStart(2, '0')}`
  }

  return (
    <div style={{ margin: '12px 14px 0', background: '#161616', border: '0.5px solid #222', borderRadius: 14, overflow: 'hidden' }}>
      <div style={{ padding: '12px 14px', display: 'flex', alignItems: 'center', gap: 8 }}>
        <Mic size={13} color="#c48a2a" />
        <span style={{ fontSize: 11, fontWeight: 500, color: '#c48a2a', letterSpacing: '0.06em', textTransform: 'uppercase', flex: 1 }}>
          Briefly Podcast
        </span>
        {episodeInfo && (
          <span style={{ fontSize: 10, color: '#444' }}>{episodeInfo.duration} Min.</span>
        )}
      </div>

      <div style={{ padding: '0 14px 14px' }}>
        {!audioUrl && !isLoading && (
          <button
            onClick={generateEpisode}
            style={{
              width: '100%', padding: '10px', borderRadius: 10,
              background: '#1e1a10', border: '0.5px solid #c48a2a',
              color: '#c48a2a', fontSize: 13, fontWeight: 500,
              cursor: 'pointer', display: 'flex', alignItems: 'center',
              justifyContent: 'center', gap: 8
            }}
          >
            <Mic size={14} />
            Episode generieren
          </button>
        )}

        {isLoading && (
          <div style={{ textAlign: 'center', padding: '12px 0' }}>
            <div style={{ fontSize: 12, color: '#555', marginBottom: 6 }}>Episode wird generiert...</div>
            <div style={{ fontSize: 11, color: '#333' }}>Das dauert ca. 30-60 Sekunden</div>
          </div>
        )}

        {audioUrl && episodeInfo && (
          <>
            <div style={{ fontSize: 12, color: '#666', marginBottom: 10 }}>{episodeInfo.title}</div>

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

            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: '#333', marginBottom: 12 }}>
              <span>{formatTime(currentTime)}</span>
              <span>{formatTime(duration)}</span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 20 }}>
              <button onClick={() => skip(-15)} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#555' }}>
                <SkipBack size={20} />
              </button>
              <button
                onClick={togglePlay}
                style={{ width: 44, height: 44, borderRadius: '50%', background: '#c48a2a', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              >
                {isPlaying ? <Pause size={20} color="#0f0f0f" /> : <Play size={20} color="#0f0f0f" fill="#0f0f0f" />}
              </button>
              <button onClick={() => skip(15)} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#555' }}>
                <SkipForward size={20} />
              </button>
            </div>

            <button
              onClick={generateEpisode}
              style={{ width: '100%', marginTop: 12, padding: '6px', borderRadius: 8, background: 'transparent', border: '0.5px solid #222', color: '#444', fontSize: 11, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}
            >
              <RefreshCw size={11} /> Neue Episode
            </button>
          </>
        )}
      </div>

      <audio
        ref={audioRef}
        onTimeUpdate={() => {
          if (!audioRef.current) return
          setCurrentTime(audioRef.current.currentTime)
          setProgress((audioRef.current.currentTime / audioRef.current.duration) * 100 || 0)
        }}
        onLoadedMetadata={() => {
          if (audioRef.current) setDuration(audioRef.current.duration)
        }}
        onEnded={() => setIsPlaying(false)}
      />
    </div>
  )
}
