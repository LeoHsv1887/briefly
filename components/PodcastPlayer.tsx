'use client';

import { useEffect, useRef, useState } from 'react';
import { Mic, Pause, Play, SkipBack, SkipForward } from 'lucide-react';

interface Episode {
  available: boolean;
  url?: string;
  title?: string;
  duration?: number;
  generatedAt?: string;
  type?: 'morning' | 'evening';
}

export function PodcastPlayer() {
  const [morning, setMorning] = useState<Episode>({ available: false });
  const [evening, setEvening] = useState<Episode>({ available: false });
  const [activeEpisode, setActiveEpisode] = useState<Episode | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [audioDuration, setAudioDuration] = useState(0);
  const audioRef = useRef<HTMLAudioElement>(null);

  useEffect(() => {
    fetch('/api/podcast/latest?type=morning')
      .then((r) => r.json())
      .then(setMorning)
      .catch(() => {});
    fetch('/api/podcast/latest?type=evening')
      .then((r) => r.json())
      .then(setEvening)
      .catch(() => {});
  }, []);

  function loadEpisode(episode: Episode) {
    if (!episode.url) return;
    setActiveEpisode(episode);
    setIsPlaying(false);
    setProgress(0);
    setCurrentTime(0);
    if (audioRef.current) {
      audioRef.current.src = episode.url;
      audioRef.current.load();
    }
  }

  function togglePlay() {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play();
    }
    setIsPlaying((p) => !p);
  }

  function skip(seconds: number) {
    if (!audioRef.current) return;
    audioRef.current.currentTime = Math.max(0, audioRef.current.currentTime + seconds);
  }

  function formatTime(s: number): string {
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    return `${m}:${sec.toString().padStart(2, '0')}`;
  }

  if (!morning.available && !evening.available) return null;

  return (
    <div
      style={{
        margin: '0 14px 2px',
        background: '#161616',
        border: '0.5px solid #222',
        borderRadius: 14,
        overflow: 'hidden',
      }}
    >
      {/* Header */}
      <div
        style={{
          padding: '11px 14px 9px',
          borderBottom: '0.5px solid #1e1e1e',
          display: 'flex',
          alignItems: 'center',
          gap: 8,
        }}
      >
        <Mic size={13} color="#c48a2a" />
        <span
          style={{
            fontSize: 11,
            fontWeight: 500,
            color: '#c48a2a',
            letterSpacing: '0.06em',
            textTransform: 'uppercase',
            flex: 1,
          }}
        >
          Briefly Podcast
        </span>
        {activeEpisode?.duration && (
          <span style={{ fontSize: 10, color: '#2e2e2e' }}>{activeEpisode.duration} Min.</span>
        )}
      </div>

      {/* Episode selector */}
      <div style={{ display: 'flex', gap: 6, padding: '10px 14px' }}>
        {morning.available && (
          <button
            onClick={() => loadEpisode(morning)}
            style={{
              flex: 1,
              padding: '8px 10px',
              borderRadius: 8,
              border: '0.5px solid',
              borderColor: activeEpisode?.type === 'morning' ? '#c48a2a' : '#222',
              background: activeEpisode?.type === 'morning' ? '#1e1a10' : '#111',
              cursor: 'pointer',
              textAlign: 'left',
            }}
          >
            <div style={{ fontSize: 14, marginBottom: 2 }}>☀️</div>
            <div
              style={{
                fontSize: 11,
                fontWeight: 500,
                color: activeEpisode?.type === 'morning' ? '#c48a2a' : '#555',
              }}
            >
              Morning Brief
            </div>
            <div style={{ fontSize: 10, color: '#333', marginTop: 1 }}>{morning.duration} Min.</div>
          </button>
        )}
        {evening.available && (
          <button
            onClick={() => loadEpisode(evening)}
            style={{
              flex: 1,
              padding: '8px 10px',
              borderRadius: 8,
              border: '0.5px solid',
              borderColor: activeEpisode?.type === 'evening' ? '#7b7fe0' : '#222',
              background: activeEpisode?.type === 'evening' ? '#14141e' : '#111',
              cursor: 'pointer',
              textAlign: 'left',
            }}
          >
            <div style={{ fontSize: 14, marginBottom: 2 }}>🌙</div>
            <div
              style={{
                fontSize: 11,
                fontWeight: 500,
                color: activeEpisode?.type === 'evening' ? '#7b7fe0' : '#555',
              }}
            >
              Evening Brief
            </div>
            <div style={{ fontSize: 10, color: '#333', marginTop: 1 }}>{evening.duration} Min.</div>
          </button>
        )}
      </div>

      {/* Player controls */}
      {activeEpisode && (
        <div style={{ padding: '0 14px 14px' }}>
          <div style={{ fontSize: 12, color: '#666', marginBottom: 10 }}>{activeEpisode.title}</div>

          {/* Progress bar */}
          <div
            style={{
              height: 3,
              background: '#1e1e1e',
              borderRadius: 2,
              marginBottom: 6,
              cursor: 'pointer',
              position: 'relative',
            }}
            onClick={(e) => {
              if (!audioRef.current || !audioDuration) return;
              const rect = e.currentTarget.getBoundingClientRect();
              audioRef.current.currentTime =
                ((e.clientX - rect.left) / rect.width) * audioDuration;
            }}
          >
            <div
              style={{
                height: '100%',
                width: `${progress}%`,
                background: '#c48a2a',
                borderRadius: 2,
                transition: 'width 0.1s',
              }}
            />
          </div>

          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              fontSize: 10,
              color: '#333',
              marginBottom: 12,
            }}
          >
            <span>{formatTime(currentTime)}</span>
            <span>{formatTime(audioDuration)}</span>
          </div>

          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 20,
            }}
          >
            <button
              onClick={() => skip(-15)}
              style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#555' }}
              aria-label="15 Sekunden zurück"
            >
              <SkipBack size={20} />
            </button>
            <button
              onClick={togglePlay}
              style={{
                width: 44,
                height: 44,
                borderRadius: '50%',
                background: '#c48a2a',
                border: 'none',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
              aria-label={isPlaying ? 'Pause' : 'Abspielen'}
            >
              {isPlaying ? (
                <Pause size={20} color="#0f0f0f" />
              ) : (
                <Play size={20} color="#0f0f0f" fill="#0f0f0f" />
              )}
            </button>
            <button
              onClick={() => skip(15)}
              style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#555' }}
              aria-label="15 Sekunden vor"
            >
              <SkipForward size={20} />
            </button>
          </div>
        </div>
      )}

      <audio
        ref={audioRef}
        onTimeUpdate={() => {
          if (!audioRef.current) return;
          setCurrentTime(audioRef.current.currentTime);
          setProgress(
            audioDuration > 0 ? (audioRef.current.currentTime / audioDuration) * 100 : 0,
          );
        }}
        onLoadedMetadata={() => {
          if (audioRef.current) setAudioDuration(audioRef.current.duration);
        }}
        onEnded={() => setIsPlaying(false)}
      />
    </div>
  );
}
