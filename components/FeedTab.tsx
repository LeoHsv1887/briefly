'use client'
import { useEffect, useState } from 'react'
import type { Article, TickerData } from '@/lib/types'
import { getGreeting, getGermanDate, getGermanTime, isMorningInGermany } from '@/lib/time'
import {
  HeroCard, BriefingCard, TickerRow, FeatureCard, SplitPair, MarktInsight,
  CompactList, StreamDivider, OnArticleClick,
} from '@/components/FeedCards'

interface WeatherInfo { temp: number; icon: string; city: string }
interface Episode { available: boolean; type?: 'morning' | 'evening'; duration?: number; topics?: unknown[] }
interface MarketBriefing { summary: string; sentiment: 'bullish' | 'bearish' | 'neutral' }

const FILTERS = ['Alle', 'Wirtschaft', 'Politik', 'Tech', 'Startups', 'Münster', 'Lokal', 'Sport']

function matchFilter(article: Article, filter: string): boolean {
  const t = (article.topic ?? '').toLowerCase()
  if (filter === 'Wirtschaft') return t.includes('wirtschaft') || t.includes('aktien') || t.includes('finanzen')
  if (filter === 'Politik')    return t.includes('politik') || t.includes('geopolitik')
  if (filter === 'Tech')       return t.includes('tech') || t.includes('ki')
  if (filter === 'Startups')   return t.includes('gründer') || t.includes('startup')
  if (filter === 'Münster')    return t.includes('münster')
  if (filter === 'Lokal')      return t.includes('badbergen') || t.includes('osnabrück')
  if (filter === 'Sport')      return t === 'sport'
  return true
}

const chipStyle: React.CSSProperties = {
  display: 'flex', alignItems: 'center', gap: 5,
  fontSize: 12, fontWeight: 500, color: 'var(--t2)',
  background: 'var(--bg1)', border: '0.5px solid var(--line)',
  borderRadius: 100, padding: '6px 12px', flexShrink: 0,
}

function buildStream(
  hero: Article | undefined,
  rest: Article[],
  episode: Episode | null,
  onNavigateToBriefing: () => void,
  tickers: TickerData[],
  briefing: MarketBriefing | null,
  onArticleClick: OnArticleClick,
): React.ReactNode[] {
  const blocks: React.ReactNode[] = []
  let k = 0
  let i = 0

  if (hero) blocks.push(<HeroCard key={k++} article={hero} onArticleClick={onArticleClick} />)
  blocks.push(<BriefingCard key={k++} episode={episode} onNavigateToBriefing={onNavigateToBriefing} />)
  if (tickers.length) blocks.push(<TickerRow key={k++} tickers={tickers} />)

  if (rest[i]) blocks.push(<FeatureCard key={k++} article={rest[i++]} onArticleClick={onArticleClick} />)
  if (rest[i] && rest[i + 1]) { blocks.push(<SplitPair key={k++} articles={[rest[i], rest[i + 1]]} onArticleClick={onArticleClick} />); i += 2 }
  if (briefing) blocks.push(<MarktInsight key={k++} summary={briefing.summary} sentiment={briefing.sentiment} />)
  if (rest[i]) blocks.push(<FeatureCard key={k++} article={rest[i++]} onArticleClick={onArticleClick} />)
  if (rest[i] && rest[i + 1]) { blocks.push(<SplitPair key={k++} articles={[rest[i], rest[i + 1]]} onArticleClick={onArticleClick} />); i += 2 }

  if (rest[i]) blocks.push(<StreamDivider key={k++} label="Weitere Meldungen" />)
  { const batch = rest.slice(i, i + 5); if (batch.length) blocks.push(<CompactList key={k++} articles={batch} onArticleClick={onArticleClick} />); i += batch.length }

  if (rest[i]) blocks.push(<StreamDivider key={k++} label="Mehr aus deinem Feed" />)

  while (i < rest.length) {
    if (rest[i]) blocks.push(<FeatureCard key={k++} article={rest[i++]} onArticleClick={onArticleClick} />)
    if (rest[i] && rest[i + 1]) { blocks.push(<SplitPair key={k++} articles={[rest[i], rest[i + 1]]} onArticleClick={onArticleClick} />); i += 2 }
    else if (rest[i]) { blocks.push(<FeatureCard key={k++} article={rest[i++]} onArticleClick={onArticleClick} />) }
    const batch = rest.slice(i, i + 5)
    if (batch.length) blocks.push(<CompactList key={k++} articles={batch} onArticleClick={onArticleClick} />)
    i += batch.length
  }

  return blocks
}

interface FeedTabProps {
  articles: Article[]
  tickers: TickerData[]
  loading: boolean
  username: string
  onArticleClick: OnArticleClick
  onNavigateToBriefing: () => void
  pullIndicator?: React.ReactNode
}

export function FeedTab({ articles, tickers, loading, username, onArticleClick, onNavigateToBriefing, pullIndicator }: FeedTabProps) {
  const [filter, setFilter] = useState('Alle')
  const [weather, setWeather] = useState<WeatherInfo | null>(null)
  const [episode, setEpisode] = useState<Episode | null>(null)
  const [briefing, setBriefing] = useState<MarketBriefing | null>(null)

  useEffect(() => {
    function load(lat?: number, lon?: number) {
      const qs = lat != null && lon != null ? `?lat=${lat}&lon=${lon}` : ''
      fetch(`/api/weather${qs}`).then(r => r.json()).then(d => { if (!d.error) setWeather(d) }).catch(() => {})
    }
    if (!navigator.geolocation) { load(); return }
    navigator.geolocation.getCurrentPosition(
      pos => load(pos.coords.latitude, pos.coords.longitude),
      () => load(),
    )
  }, [])

  useEffect(() => {
    const type = isMorningInGermany() ? 'morning' : 'evening'
    fetch(`/api/podcast/latest?type=${type}`)
      .then(r => r.json())
      .then(data => setEpisode({ ...data, type }))
      .catch(() => {})
  }, [])

  useEffect(() => {
    fetch('/api/market-briefing').then(r => r.json()).then(setBriefing).catch(() => {})
  }, [])

  const dax = tickers.find(t => t.label === 'DAX' || t.symbol === '^GDAXI')
  const daxChange = dax && dax.formattedValue !== '—' ? `${dax.isPositive ? '+' : ''}${dax.changePercent.toFixed(2)}%` : null

  const filtered = filter === 'Alle' ? articles : articles.filter(a => matchFilter(a, filter))
  const hero = filtered[0]
  const rest = filtered.slice(1)

  return (
    <div>
      {/* Header */}
      <div style={{ padding: '16px 20px 14px' }}>
        <div style={{ fontSize: 30, fontWeight: 800, color: 'var(--t1)', letterSpacing: '-0.04em', lineHeight: 1.1, marginBottom: 4 }}>
          {getGreeting()},<br />{username}.
        </div>
        <div style={{ fontSize: 12, color: 'var(--t3)', marginBottom: 14 }}>
          {getGermanDate()} · {getGermanTime()} Uhr
        </div>

        <div className="no-scrollbar" style={{ display: 'flex', gap: 8, flexWrap: 'nowrap', overflowX: 'auto' }}>
          {weather && (
            <div style={chipStyle}>
              <i className={`ti ti-${weather.icon}`} style={{ fontSize: 13, color: '#fbbf24' }} />
              {weather.temp}°C · {weather.city}
            </div>
          )}
          <div style={chipStyle}>
            <span className="live-dot" style={{ marginRight: 2 }} />
            {articles.length} neue Artikel
          </div>
          {daxChange && (
            <div style={chipStyle}>
              DAX <span style={{ color: dax?.isPositive ? 'var(--up)' : 'var(--dn)', fontWeight: 700, marginLeft: 4 }}>{daxChange}</span>
            </div>
          )}
        </div>
      </div>

      {/* Filter chips */}
      <div className="no-scrollbar" style={{ display: 'flex', gap: 6, padding: '10px 20px 12px', overflowX: 'auto', borderBottom: '0.5px solid var(--line)' }}>
        {FILTERS.map(f => (
          <div key={f} onClick={() => setFilter(f)} style={{
            flexShrink: 0, fontSize: 11, fontWeight: 600, padding: '5px 13px', borderRadius: 100,
            background: filter === f ? 'var(--bg3)' : 'var(--bg1)',
            color: filter === f ? 'var(--t1)' : 'var(--t4)',
            border: `0.5px solid ${filter === f ? 'var(--line2)' : 'var(--line)'}`,
            cursor: 'pointer',
          }}>{f}</div>
        ))}
      </div>

      {pullIndicator}

      {loading && articles.length === 0 ? (
        <div style={{ padding: '20px 14px 0' }}>
          <div style={{ background: 'var(--bg1)', border: '0.5px solid var(--line)', borderRadius: 18, overflow: 'hidden' }}>
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} style={{ padding: '14px 15px', borderBottom: i < 4 ? '0.5px solid var(--line)' : 'none' }}>
                <div style={{ display: 'flex', gap: 12 }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ height: 9, background: 'var(--bg2)', borderRadius: 4, width: '40%', marginBottom: 8 }} />
                    <div style={{ height: 13, background: 'var(--bg2)', borderRadius: 4, width: '100%', marginBottom: 6 }} />
                    <div style={{ height: 13, background: 'var(--bg2)', borderRadius: 4, width: '75%' }} />
                  </div>
                  <div style={{ width: 60, height: 60, borderRadius: 12, background: 'var(--bg2)', flexShrink: 0 }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : filtered.length === 0 ? (
        <div style={{ padding: '60px 20px', textAlign: 'center' }}>
          <p style={{ fontSize: 14, color: 'var(--t3)' }}>Keine Artikel für diesen Filter.</p>
        </div>
      ) : (
        buildStream(hero, rest, episode, onNavigateToBriefing, tickers, briefing, onArticleClick)
      )}

      <div style={{ height: 20 }} />
    </div>
  )
}
