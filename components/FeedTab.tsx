'use client'
import { useEffect, useState } from 'react'
import type { Article, TickerData } from '@/lib/types'
import { getGreeting, getGermanDate, getGermanTime, isMorningInGermany } from '@/lib/time'
import {
  HeroCarousel, BriefingCard, TickerRow, FeatureCard, SplitPair, MarktInsight,
  CompactList, StreamDivider, TickerBlock, OnArticleClick,
} from '@/components/FeedCards'

interface WeatherInfo { temp: number; icon: string; city: string }
interface Episode { available: boolean; type?: 'morning' | 'evening'; duration?: number; topics?: unknown[] }
interface MarketBriefing { summary: string; sentiment: 'bullish' | 'bearish' | 'neutral' }

const FILTERS = ['Alle', 'Wirtschaft', 'Politik', 'Tech', 'Startups', 'Münster', 'Lokal', 'Sport']
const BATCH_SIZE = 45
const CAROUSEL_SIZE = 5

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

const STREAM_PATTERN: Array<'feature' | 'pair' | 'list'> = ['feature', 'pair', 'feature', 'pair', 'list', 'feature', 'pair']

// Imageless articles never get a full-size solo slot (FeatureCard's and
// SplitPair's imageless fallback is a big TextCard) — instead they're
// deferred into this buffer and flushed as one bundle once enough have
// accumulated, so the visible feed stays dominated by image cards. A bundle
// that happens to share one topic reads better as a themed TickerBlock;
// anything mixed falls back to the generic CompactList.
const PENDING_FLUSH_SIZE = 4

function flushPendingGroup(group: Article[], keySuffix: string, elements: React.ReactNode[], onArticleClick: OnArticleClick) {
  if (!group.length) return
  const sameTopic = group.length >= 3 && group.every(a => a.topic === group[0].topic)
  if (sameTopic) {
    elements.push(<TickerBlock key={`tb-${keySuffix}`} articles={group} onArticleClick={onArticleClick} />)
  } else {
    elements.push(<CompactList key={`cl-${keySuffix}`} title="Weitere Meldungen" articles={group} onArticleClick={onArticleClick} />)
  }
}

// A pair slot looks a few articles ahead for a second image-bearing article
// instead of giving up the moment the very next one lacks an image — small
// enough to keep the feed feeling chronological, big enough to noticeably
// raise how often two photo cards actually land side by side.
const PAIR_LOOKAHEAD = 4

function renderStream(articles: Article[], briefing: MarketBriefing | null, onArticleClick: OnArticleClick): React.ReactNode[] {
  const elements: React.ReactNode[] = []
  let i = 0
  let slotIdx = 0
  let insertedMarktInsight = false
  let pending: Article[] = []

  while (i < articles.length) {
    const slot = STREAM_PATTERN[slotIdx % STREAM_PATTERN.length]

    if (slot === 'list') {
      // Tolerates imageless articles fine (small thumbnail + placeholder),
      // so it draws straight from the sequential stream, unaffected by the
      // deferral logic below.
      slotIdx++
      const batch = articles.slice(i, i + 5)
      elements.push(<StreamDivider key={`div-${i}`} label="Weitere Meldungen" />)
      elements.push(<CompactList key={`list-${i}`} articles={batch} onArticleClick={onArticleClick} />)
      i += batch.length
      continue
    }

    if (!articles[i].imageUrl) {
      pending.push(articles[i])
      i++
      if (pending.length >= PENDING_FLUSH_SIZE) {
        flushPendingGroup(pending, `p${i}`, elements, onArticleClick)
        pending = []
      }
      continue
    }

    if (slot === 'pair') {
      let j = i + 1
      let scanned = 0
      const skipped: Article[] = []
      while (j < articles.length && scanned < PAIR_LOOKAHEAD && !articles[j].imageUrl) {
        skipped.push(articles[j])
        j++
        scanned++
      }
      if (j < articles.length && articles[j].imageUrl) {
        elements.push(<SplitPair key={`p-${articles[i].id}`} articles={[articles[i], articles[j]]} onArticleClick={onArticleClick} />)
        pending.push(...skipped)
        i = j + 1
        slotIdx++
        if (pending.length >= PENDING_FLUSH_SIZE) {
          flushPendingGroup(pending, `p${i}`, elements, onArticleClick)
          pending = []
        }
        // Markteinschätzung – once, right after the first real pair
        if (!insertedMarktInsight && briefing) {
          elements.push(<MarktInsight key="markt-insight" summary={briefing.summary} sentiment={briefing.sentiment} />)
          insertedMarktInsight = true
        }
        continue
      }
      // No image-bearing partner nearby — fall through to a solo feature card.
    }

    elements.push(<FeatureCard key={`f-${articles[i].id}`} article={articles[i]} onArticleClick={onArticleClick} />)
    i += 1
    slotIdx++
  }

  flushPendingGroup(pending, 'end', elements, onArticleClick)
  return elements
}

interface FeedTabProps {
  articles: Article[]
  tickers: TickerData[]
  loading: boolean
  username: string
  onArticleClick: OnArticleClick
  onNavigateToBriefing: () => void
  pullIndicator?: React.ReactNode
  lastLoaded?: Date | null
  isRefreshing?: boolean
  onRefresh?: () => void
}

export function FeedTab({
  articles, tickers, loading, username, onArticleClick, onNavigateToBriefing, pullIndicator,
  lastLoaded, isRefreshing = false, onRefresh,
}: FeedTabProps) {
  const [filter, setFilter] = useState('Alle')
  const [weather, setWeather] = useState<WeatherInfo | null>(null)
  const [episode, setEpisode] = useState<Episode | null>(null)
  const [briefing, setBriefing] = useState<MarketBriefing | null>(null)
  const [visibleCount, setVisibleCount] = useState(BATCH_SIZE)
  const [isLoadingMore, setIsLoadingMore] = useState(false)
  // Greeting/date/time are wall-clock-dependent, so they must stay null until
  // after mount — computing them during SSR too would make the server-rendered
  // minute drift from the client's hydration-time minute and trigger a
  // hydration mismatch. Ticking this also keeps the header clock live.
  const [clock, setClock] = useState<Date | null>(null)

  useEffect(() => {
    setClock(new Date())
    const id = setInterval(() => setClock(new Date()), 60_000)
    return () => clearInterval(id)
  }, [])

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

  // Hero is the largest visual slot in the feed, so articles with a working
  // image are preferred; imageless articles only fill remaining slots if
  // there aren't enough image articles to go around.
  const carouselArticles = [...filtered]
    .sort((a, b) => {
      const imageDiff = (b.imageUrl ? 1 : 0) - (a.imageUrl ? 1 : 0)
      return imageDiff !== 0 ? imageDiff : (b.score ?? 0) - (a.score ?? 0)
    })
    .slice(0, CAROUSEL_SIZE)
  const feedArticles = filtered.filter(a => !carouselArticles.some(c => c.id === a.id))

  // Reset the infinite-scroll window whenever the filter or article set changes
  useEffect(() => {
    setVisibleCount(BATCH_SIZE)
  }, [filter, articles])

  useEffect(() => {
    function handleScroll() {
      const scrolled = window.scrollY + window.innerHeight
      const total = document.documentElement.scrollHeight
      if (scrolled > total - 800 && !isLoadingMore && visibleCount < feedArticles.length) {
        setIsLoadingMore(true)
        setTimeout(() => {
          setVisibleCount(prev => Math.min(prev + BATCH_SIZE, feedArticles.length))
          setIsLoadingMore(false)
        }, 300)
      }
    }
    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [isLoadingMore, visibleCount, feedArticles.length])

  const visibleArticles = feedArticles.slice(0, visibleCount)

  return (
    <div>
      {/* Header */}
      <div style={{ padding: '16px 20px 14px' }}>
        <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 4 }}>
          <div style={{ fontSize: 30, fontWeight: 800, color: 'var(--t1)', letterSpacing: '-0.04em', lineHeight: 1.1 }}>
            {clock ? getGreeting() : ' '},<br />{username}.
          </div>
          {onRefresh && (
            <div onClick={onRefresh} style={{
              width: 34, height: 34, borderRadius: '50%', flexShrink: 0,
              background: 'var(--bg1)', border: '0.5px solid var(--line)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer', color: isRefreshing ? 'var(--acc)' : 'var(--t4)',
            }}>
              <i className={`ti ti-refresh ${isRefreshing ? 'spinning' : ''}`} style={{ fontSize: 16 }} />
            </div>
          )}
        </div>
        <div style={{ fontSize: 12, color: 'var(--t3)', marginBottom: 14 }}>
          {clock ? `${getGermanDate()} · ${getGermanTime()} Uhr` : ' '}
          {lastLoaded && ` · Aktualisiert ${lastLoaded.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })} Uhr`}
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
        <>
          <HeroCarousel articles={carouselArticles} onArticleClick={onArticleClick} />
          <BriefingCard episode={episode} onNavigateToBriefing={onNavigateToBriefing} />
          <TickerRow tickers={tickers} />
          {renderStream(visibleArticles, briefing, onArticleClick)}

          {isLoadingMore && (
            <div style={{ display: 'flex', justifyContent: 'center', padding: '24px 0' }}>
              <span className="spinner" />
            </div>
          )}
          {!isLoadingMore && visibleCount >= feedArticles.length && feedArticles.length > 0 && (
            <div style={{ textAlign: 'center', padding: '24px 0', fontSize: 12, color: 'var(--t4)' }}>
              Alle {articles.length} Artikel geladen
            </div>
          )}
        </>
      )}

      <div style={{ height: 20 }} />
    </div>
  )
}
