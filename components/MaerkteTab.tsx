'use client'
import { useCallback, useEffect, useRef, useState } from 'react'
import type { Article, FavoriteStock, HistoryPoint, StockNewsItem, StockQuote, StockSearchResult } from '@/lib/types'
import { getGermanDate, getGermanTime } from '@/lib/time'
import { CompactList, SplitPair, StreamDivider, OnArticleClick } from '@/components/FeedCards'

const FAVORITES_KEY = 'briefly_favorites'
const DEFAULT_FAVORITES: FavoriteStock[] = [
  { symbol: 'SAP',  name: 'SAP SE',            exchange: 'XETRA'  },
  { symbol: 'NVDA', name: 'NVIDIA Corporation', exchange: 'NASDAQ' },
  { symbol: 'VOW3', name: 'Volkswagen AG',      exchange: 'XETRA'  },
]

interface MarketEntry { label: string; price: string; changePercent: string; isPositive: boolean; isMarketOpen: boolean }
interface BriefingData {
  summary: string; dax: string; usa: string; crypto: string; commodities: string
  sentiment: 'bullish' | 'bearish' | 'neutral'
  marketData: Record<string, MarketEntry>
  generatedAt: string
}

function fmtPrice(p: number): string {
  return p.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}
function fmtVol(v: number): string {
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M`
  if (v >= 1_000) return `${(v / 1_000).toFixed(0)}K`
  return v.toString()
}

function loadFavorites(): FavoriteStock[] {
  if (typeof window === 'undefined') return DEFAULT_FAVORITES
  try {
    const raw = localStorage.getItem(FAVORITES_KEY)
    const parsed = raw ? JSON.parse(raw) : null
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : DEFAULT_FAVORITES
  } catch { return DEFAULT_FAVORITES }
}
function saveFavorites(favs: FavoriteStock[]): void {
  if (typeof window !== 'undefined') localStorage.setItem(FAVORITES_KEY, JSON.stringify(favs))
}

function Sparkline({ points, isPositive }: { points: HistoryPoint[]; isPositive: boolean }) {
  if (points.length < 2) {
    return <svg viewBox="0 0 100 28" style={{ width: '100%', height: 28 }}><line x1="0" y1="14" x2="100" y2="14" stroke="var(--line)" strokeWidth={1} /></svg>
  }
  const closes = points.map(p => p.close)
  const min = Math.min(...closes), max = Math.max(...closes), range = max - min || 1
  const pts = points.map((p, i) => `${(i / (points.length - 1)) * 100},${26 - ((p.close - min) / range) * 24}`).join(' ')
  return (
    <svg viewBox="0 0 100 28" preserveAspectRatio="none" style={{ width: '100%', height: 28 }}>
      <polyline points={pts} fill="none" stroke={isPositive ? 'var(--up)' : 'var(--dn)'} strokeWidth={1.5} strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  )
}

function chartPath(points: HistoryPoint[]): string {
  if (points.length < 2) return 'M0 25 L100 25'
  const closes = points.map(p => p.close)
  const min = Math.min(...closes), max = Math.max(...closes), range = max - min || 1
  return points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${(i / (points.length - 1)) * 100} ${48 - ((p.close - min) / range) * 46}`).join(' ')
}

// ─── Dax Hero ───────────────────────────────────────────────────────────────

function DaxHeroCard({ entry, history }: { entry?: MarketEntry; history: HistoryPoint[] }) {
  if (!entry) return null
  const isUp = entry.isPositive
  return (
    <div style={{ margin: '0 14px', borderRadius: 20, overflow: 'hidden', background: 'var(--bg1)', border: '0.5px solid var(--line)' }}>
      <div style={{ padding: '18px 18px 14px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--t4)', letterSpacing: '0.07em', textTransform: 'uppercase', marginBottom: 6 }}>
            DAX · Frankfurt
          </div>
          <div style={{ fontSize: 34, fontWeight: 800, color: isUp ? 'var(--up)' : 'var(--dn)', letterSpacing: '-0.03em', lineHeight: 1, marginBottom: 5 }}>
            {entry.price}
          </div>
          <div style={{ fontSize: 13, fontWeight: 700, color: isUp ? 'var(--up)' : 'var(--dn)' }}>
            {isUp ? '+' : ''}{entry.changePercent}% {entry.isMarketOpen ? '' : '· Schluss'}
          </div>
        </div>
        <svg viewBox="0 0 100 50" style={{ width: 100, height: 50 }} preserveAspectRatio="none">
          <path d={chartPath(history)} fill="none" stroke={isUp ? 'var(--up)' : 'var(--dn)'} strokeWidth="2" />
        </svg>
      </div>
    </div>
  )
}

// ─── Mini index row ─────────────────────────────────────────────────────────

function MiniIndexRow({ entries }: { entries: MarketEntry[] }) {
  if (!entries.length) return null
  return (
    <div className="no-scrollbar" style={{ display: 'flex', gap: 8, margin: '8px 14px 0', overflowX: 'auto' }}>
      {entries.map(e => (
        <div key={e.label} style={{ flexShrink: 0, minWidth: 110, background: 'var(--bg1)', border: '0.5px solid var(--line)', borderRadius: 14, padding: '10px 12px' }}>
          <div style={{ fontSize: 9, fontWeight: 700, color: 'var(--t4)', letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: 4 }}>{e.label}</div>
          <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--t1)' }}>{e.price}</div>
          <div style={{ fontSize: 10, fontWeight: 700, color: e.isPositive ? 'var(--up)' : 'var(--dn)', marginTop: 2 }}>
            {e.isPositive ? '+' : ''}{e.changePercent}%
          </div>
        </div>
      ))}
    </div>
  )
}

// ─── KI Marktbrief ──────────────────────────────────────────────────────────

function KIMarktbrief({ briefing }: { briefing: BriefingData }) {
  const [expanded, setExpanded] = useState<string | null>(null)
  const rows = [
    { key: 'dax', label: 'DAX & Europa', text: briefing.dax },
    { key: 'usa', label: 'USA & Nasdaq', text: briefing.usa },
    { key: 'crypto', label: 'Krypto', text: briefing.crypto },
    { key: 'commodities', label: 'Rohstoffe', text: briefing.commodities },
  ].filter(r => r.text)

  return (
    <div style={{ margin: '8px 14px 0', background: 'var(--bg1)', border: '0.5px solid var(--line)', borderRadius: 18, overflow: 'hidden' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '14px 16px', borderBottom: '0.5px solid var(--line)' }}>
        <div style={{ width: 34, height: 34, borderRadius: 10, background: 'var(--bg2)', border: '0.5px solid var(--line)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <i className="ti ti-sparkles" style={{ fontSize: 16, color: 'var(--t3)' }} />
        </div>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 3 }}>
            <span style={{ width: 5, height: 5, borderRadius: '50%', background: 'var(--up)', display: 'inline-block' }} />
            <span style={{ fontSize: 9, fontWeight: 700, color: 'var(--t4)', letterSpacing: '0.1em', textTransform: 'uppercase' }}>KI-Marktbrief</span>
          </div>
          <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--t1)' }}>Was bewegt den Markt heute?</div>
        </div>
      </div>
      <div style={{ padding: '14px 16px' }}>
        <div style={{ fontSize: 13, color: 'var(--t2)', lineHeight: 1.65, marginBottom: rows.length ? 12 : 0 }}>{briefing.summary}</div>
        {rows.map(r => (
          <div key={r.key} onClick={() => setExpanded(e => e === r.key ? null : r.key)} style={{ borderTop: '0.5px solid var(--line)', paddingTop: 10, marginTop: 10, cursor: 'pointer' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--t2)' }}>{r.label}</span>
              <i className={`ti ti-chevron-${expanded === r.key ? 'up' : 'down'}`} style={{ fontSize: 13, color: 'var(--t4)' }} />
            </div>
            {expanded === r.key && <div style={{ fontSize: 12, color: 'var(--t3)', lineHeight: 1.6, marginTop: 6 }}>{r.text}</div>}
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── Watchlist ──────────────────────────────────────────────────────────────

function WatchlistCard({
  favorites, quotes, sparklines, quotesLoading, selected, onSelect, onRemove,
}: {
  favorites: FavoriteStock[]; quotes: Record<string, StockQuote>; sparklines: Record<string, HistoryPoint[]>
  quotesLoading: boolean; selected: FavoriteStock | null
  onSelect: (f: FavoriteStock) => void; onRemove: (symbol: string) => void
}) {
  if (quotesLoading) {
    return (
      <div style={{ margin: '0 14px', background: 'var(--bg1)', border: '0.5px solid var(--line)', borderRadius: 16, overflow: 'hidden' }}>
        {[0, 1, 2].map(i => (
          <div key={i} style={{ padding: '11px 13px', borderBottom: i < 2 ? '0.5px solid var(--line)' : 'none', height: 44 }} />
        ))}
      </div>
    )
  }
  return (
    <div style={{ margin: '0 14px', background: 'var(--bg1)', border: '0.5px solid var(--line)', borderRadius: 16, overflow: 'hidden' }}>
      {favorites.map((fav, i) => {
        const quote = quotes[fav.symbol] ?? null
        const isSelected = selected?.symbol === fav.symbol
        return (
          <div key={fav.symbol} onClick={() => onSelect(fav)} style={{
            display: 'flex', alignItems: 'center', padding: '11px 13px',
            borderBottom: i < favorites.length - 1 ? '0.5px solid var(--line)' : 'none',
            cursor: 'pointer', background: isSelected ? 'var(--bg2)' : 'transparent',
          }}>
            <div style={{ width: 90, flexShrink: 0 }}>
              <div style={{ fontSize: 12, color: 'var(--t1)', fontWeight: 600 }}>{fav.symbol}</div>
              <div style={{ fontSize: 9, color: 'var(--t4)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 82, marginTop: 2 }}>{fav.name}</div>
            </div>
            <div style={{ flex: 1, padding: '0 8px' }}>
              <Sparkline points={sparklines[fav.symbol] ?? []} isPositive={quote?.isPositive ?? true} />
            </div>
            <div style={{ textAlign: 'right', flexShrink: 0, minWidth: 60 }}>
              <div style={{ fontSize: 12, color: 'var(--t2)', fontVariantNumeric: 'tabular-nums' }}>{quote ? fmtPrice(quote.price) : '–'}</div>
              <div style={{ fontSize: 9, fontWeight: 700, marginTop: 2, color: quote?.isPositive ? 'var(--up)' : 'var(--dn)', fontVariantNumeric: 'tabular-nums' }}>
                {quote ? `${quote.isPositive ? '+' : ''}${quote.changePercent.toFixed(2)}%` : '–'}
              </div>
            </div>
            <div onClick={e => { e.stopPropagation(); onRemove(fav.symbol) }} style={{ padding: '0 0 0 10px', flexShrink: 0, cursor: 'pointer' }}>
              <i className="ti ti-star-filled" style={{ fontSize: 14, color: 'var(--line2)' }} />
            </div>
          </div>
        )
      })}
    </div>
  )
}

function DetailPanel({ fav, quote }: { fav: FavoriteStock; quote: StockQuote | null }) {
  const [history, setHistory] = useState<HistoryPoint[]>([])
  const [range, setRange] = useState('1M')
  const isPositive = quote?.isPositive ?? true

  const fetchHistory = useCallback(async (r: string) => {
    const res = await fetch(`/api/stocks/history?symbol=${fav.symbol}&range=${r}`)
    const d = await res.json()
    setHistory(d.data ?? [])
  }, [fav.symbol])

  useEffect(() => { fetchHistory('1M') }, [fetchHistory])

  return (
    <div style={{ margin: '8px 14px 0', background: 'var(--bg1)', border: '0.5px solid var(--line)', borderRadius: 18, padding: '14px 15px' }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 10 }}>
        <div>
          <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--t1)' }}>{fav.symbol} <span style={{ color: 'var(--t4)', fontWeight: 400 }}>· {fav.exchange}</span></div>
          <div style={{ fontSize: 11, color: 'var(--t4)', marginTop: 2 }}>{fav.name}</div>
        </div>
        {quote && (
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--t1)', fontVariantNumeric: 'tabular-nums' }}>{fmtPrice(quote.price)}</div>
            <div style={{ fontSize: 11, fontWeight: 700, marginTop: 3, color: isPositive ? 'var(--up)' : 'var(--dn)' }}>
              {isPositive ? '+' : ''}{fmtPrice(quote.change)} ({isPositive ? '+' : ''}{quote.changePercent.toFixed(2)}%)
            </div>
          </div>
        )}
      </div>
      <div style={{ display: 'flex', gap: 4, marginBottom: 8 }}>
        {['1W', '1M', '3M', '1J', '5J'].map(r => (
          <div key={r} onClick={() => { setRange(r); fetchHistory(r) }} style={{
            fontSize: 11, fontWeight: 600, padding: '3px 9px', borderRadius: 8, cursor: 'pointer',
            background: range === r ? 'var(--bg2)' : 'transparent', color: range === r ? 'var(--t1)' : 'var(--t4)',
          }}>{r}</div>
        ))}
      </div>
      <svg viewBox="0 0 100 80" preserveAspectRatio="none" style={{ width: '100%', height: 80 }}>
        <path d={chartPath(history).replace(/48/g, '78').replace(/46/g, '74')} fill="none" stroke={isPositive ? 'var(--up)' : 'var(--dn)'} strokeWidth={1.5} />
      </svg>
      {quote && (
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 12, paddingTop: 12, borderTop: '0.5px solid var(--line)' }}>
          {[['Eröffnung', fmtPrice(quote.open)], ['Tageshoch', fmtPrice(quote.high)], ['Volumen', fmtVol(quote.volume)]].map(([label, value]) => (
            <div key={label}>
              <div style={{ fontSize: 9, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--t4)' }}>{label}</div>
              <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--t2)', marginTop: 2 }}>{value}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ─── Main ───────────────────────────────────────────────────────────────────

interface Props { onArticleClick: OnArticleClick }

export function MaerkteTab({ onArticleClick }: Props) {
  const [briefing, setBriefing] = useState<BriefingData | null>(null)
  const [daxHistory, setDaxHistory] = useState<HistoryPoint[]>([])
  const [favorites, setFavorites] = useState<FavoriteStock[]>([])
  const [quotes, setQuotes] = useState<Record<string, StockQuote>>({})
  const [quotesLoading, setQuotesLoading] = useState(true)
  const [sparklines, setSparklines] = useState<Record<string, HistoryPoint[]>>({})
  const [stockNews, setStockNews] = useState<StockNewsItem[]>([])
  const [selected, setSelected] = useState<FavoriteStock | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<StockSearchResult[]>([])
  const [showDropdown, setShowDropdown] = useState(false)
  const searchTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)

  useEffect(() => {
    fetch('/api/market-briefing').then(r => r.json()).then(setBriefing).catch(() => {})
    fetch('/api/stocks/history?symbol=^GDAXI&range=1M').then(r => r.json()).then(d => setDaxHistory(d.data ?? [])).catch(() => {})
    setFavorites(loadFavorites())
  }, [])

  useEffect(() => {
    if (!favorites.length) return
    Promise.allSettled(favorites.map(f => fetch(`/api/stocks/quote?symbol=${f.symbol}`).then(r => r.json()).then((d): [string, StockQuote] => [f.symbol, d])))
      .then(results => {
        setQuotes(prev => {
          const next = { ...prev }
          results.forEach(r => { if (r.status === 'fulfilled' && r.value[1]?.price) next[r.value[0]] = r.value[1] })
          return next
        })
        setQuotesLoading(false)
      })
    Promise.allSettled(favorites.map(f => fetch(`/api/stocks/history?symbol=${f.symbol}&range=1M`).then(r => r.json()).then((d): [string, HistoryPoint[]] => [f.symbol, d.data ?? []])))
      .then(results => setSparklines(prev => {
        const next = { ...prev }
        results.forEach(r => { if (r.status === 'fulfilled') next[r.value[0]] = r.value[1] })
        return next
      }))
    const symbols = favorites.map(f => f.symbol.replace(/\.DE$/, '')).join(',')
    fetch(`/api/stocks/news?symbols=${symbols}`).then(r => r.ok ? r.json() : null).then(d => { if (d) setStockNews(d.news ?? []) }).catch(() => {})
  }, [favorites])

  const handleSearch = useCallback((q: string) => {
    setSearchQuery(q)
    clearTimeout(searchTimer.current)
    if (q.length < 1) { setSearchResults([]); setShowDropdown(false); return }
    searchTimer.current = setTimeout(async () => {
      const res = await fetch(`/api/stocks/search?q=${encodeURIComponent(q)}`)
      const d = await res.json()
      setSearchResults(d.results ?? [])
      setShowDropdown(true)
    }, 350)
  }, [])

  const addFavorite = useCallback((stock: FavoriteStock) => {
    setFavorites(prev => {
      if (prev.some(f => f.symbol === stock.symbol)) return prev
      const next = [...prev, stock]
      saveFavorites(next)
      return next
    })
  }, [])

  const removeFavorite = useCallback((symbol: string) => {
    setFavorites(prev => {
      const next = prev.filter(f => f.symbol !== symbol)
      saveFavorites(next)
      return next
    })
    setSelected(sel => sel?.symbol === symbol ? null : sel)
  }, [])

  const sentiment = briefing?.sentiment ?? 'neutral'
  const marketData = briefing?.marketData ?? {}
  const daxEntry = marketData['DAX']
  const otherEntries = Object.values(marketData).filter(e => e.label !== 'DAX')

  const newsAsArticles: Article[] = stockNews.map(item => ({
    id: item.url, title: item.title, url: item.url, source: item.source,
    publishedAt: item.publishedAt, topic: 'Aktienmärkte & Investing', score: 0,
    content: undefined, imageUrl: null,
  }))

  return (
    <div>
      {/* Header */}
      <div style={{ padding: '16px 20px 14px' }}>
        <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 6 }}>
          <div style={{ fontSize: 28, fontWeight: 800, color: 'var(--t1)', letterSpacing: '-0.03em' }}>Märkte</div>
          <div style={{
            fontSize: 10, fontWeight: 700, padding: '4px 10px', borderRadius: 100,
            color: sentiment === 'bullish' ? 'var(--up)' : sentiment === 'bearish' ? 'var(--dn)' : 'var(--t3)',
            background: sentiment === 'bullish' ? 'rgba(34,197,94,0.1)' : sentiment === 'bearish' ? 'rgba(239,68,68,0.1)' : 'var(--bg2)',
            textTransform: 'uppercase', letterSpacing: '0.06em',
          }}>
            {sentiment === 'bullish' ? 'Bullish' : sentiment === 'bearish' ? 'Bearish' : 'Neutral'}
          </div>
        </div>
        <div style={{ fontSize: 12, color: 'var(--t3)' }}>{getGermanDate()} · {getGermanTime()} Uhr · Xetra</div>
      </div>

      <DaxHeroCard entry={daxEntry} history={daxHistory} />
      <MiniIndexRow entries={otherEntries} />
      {briefing && <KIMarktbrief briefing={briefing} />}

      {/* Watchlist */}
      <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--t4)', letterSpacing: '0.1em', textTransform: 'uppercase', padding: '18px 18px 10px' }}>
        Meine Favoriten
      </div>
      <WatchlistCard
        favorites={favorites} quotes={quotes} sparklines={sparklines} quotesLoading={quotesLoading}
        selected={selected} onSelect={f => setSelected(sel => sel?.symbol === f.symbol ? null : f)} onRemove={removeFavorite}
      />

      {/* Search */}
      <div style={{ margin: '10px 14px 0', position: 'relative' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'var(--bg1)', border: '0.5px solid var(--line)', borderRadius: 12, padding: '9px 12px' }}>
          <i className="ti ti-search" style={{ fontSize: 15, color: 'var(--t3)' }} />
          <input
            value={searchQuery}
            placeholder="Aktie suchen – z. B. SAP, Apple, Tesla…"
            onChange={e => handleSearch(e.target.value)}
            onFocus={() => searchResults.length && setShowDropdown(true)}
            onBlur={() => setTimeout(() => setShowDropdown(false), 200)}
            style={{ background: 'transparent', border: 'none', outline: 'none', color: 'var(--t1)', fontSize: 13, width: '100%' }}
          />
        </div>
        {showDropdown && searchResults.length > 0 && (
          <div style={{ position: 'absolute', left: 0, right: 0, top: 'calc(100% + 4px)', zIndex: 30, background: 'var(--bg1)', border: '0.5px solid var(--line)', borderRadius: 14, overflow: 'hidden' }}>
            {searchResults.map(r => (
              <div key={r.symbol} onMouseDown={() => { addFavorite({ symbol: r.symbol, name: r.name, exchange: r.exchange }); setSearchQuery(''); setShowDropdown(false) }}
                style={{ padding: '10px 13px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '0.5px solid var(--line)', cursor: 'pointer' }}>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--t1)' }}>{r.symbol}</div>
                  <div style={{ fontSize: 11, color: 'var(--t4)', marginTop: 2 }}>{r.name} · {r.exchange}</div>
                </div>
                <i className="ti ti-plus" style={{ fontSize: 14, color: 'var(--t4)' }} />
              </div>
            ))}
          </div>
        )}
      </div>

      {selected && <DetailPanel fav={selected} quote={quotes[selected.symbol] ?? null} />}

      {newsAsArticles.length > 0 && (
        <>
          <StreamDivider label="Markt-News" />
          {(() => {
            const blocks: React.ReactNode[] = []
            let i = 0, k = 0
            if (newsAsArticles[i] && newsAsArticles[i + 1]) { blocks.push(<SplitPair key={k++} articles={[newsAsArticles[i], newsAsArticles[i + 1]]} onArticleClick={onArticleClick} />); i += 2 }
            const rest = newsAsArticles.slice(i)
            if (rest.length) blocks.push(<CompactList key={k++} articles={rest} title="Weitere Markt-News" onArticleClick={onArticleClick} />)
            return blocks
          })()}
        </>
      )}

      <div style={{ height: 20 }} />
    </div>
  )
}
