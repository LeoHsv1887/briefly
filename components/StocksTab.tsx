'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { ChevronRight, ChevronUp, Plus, Search, Sparkles, Star, TrendingDown, TrendingUp, X } from 'lucide-react';
import type { FavoriteStock, HistoryPoint, StockNewsItem, StockQuote, StockSearchResult } from '@/lib/types';
import { MarketBriefing } from '@/components/MarketBriefing';

// ─── Constants ───────────────────────────────────────────────────────────────

const BADGE_COLORS = [
  { bg: '#1e2a1e', text: '#22c47a' },
  { bg: '#1e1e2e', text: '#7b7fe0' },
  { bg: '#2a2310', text: '#d4a843' },
  { bg: '#1e2530', text: '#5ba8e0' },
  { bg: '#2a1e1a', text: '#d4844a' },
  { bg: '#251e2a', text: '#b87bd4' },
] as const;

const HISTORY_RANGES = ['1W', '1M', '3M', '1J', '5J'] as const;
type HistoryRange = (typeof HISTORY_RANGES)[number];

const FAVORITES_KEY = 'briefly_favorites';
const FAVORITE_NAMES_KEY = 'briefly_favorite_names';

const DEFAULT_FAVORITES: FavoriteStock[] = [
  { symbol: 'SAP',  name: 'SAP SE',               exchange: 'XETRA'  },
  { symbol: 'NVDA', name: 'NVIDIA Corporation',    exchange: 'NASDAQ' },
  { symbol: 'VOW3', name: 'Volkswagen AG',          exchange: 'XETRA'  },
];

// ─── Helpers ─────────────────────────────────────────────────────────────────

function newsDate(dateStr: string): string {
  const now = new Date();
  const date = new Date(dateStr);
  const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
  if (diffDays === 0) return 'Heute';
  if (diffDays === 1) return 'Gestern';
  if (diffDays < 7) return `vor ${diffDays} Tagen`;
  return date.toLocaleDateString('de-DE', { day: 'numeric', month: 'short' });
}

function fmtPrice(p: number): string {
  return p.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function fmtVol(v: number): string {
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1_000) return `${(v / 1_000).toFixed(0)}K`;
  return v.toString();
}

function loadFavorites(): FavoriteStock[] {
  if (typeof window === 'undefined') return DEFAULT_FAVORITES;
  try {
    const raw = localStorage.getItem(FAVORITES_KEY);
    if (!raw) return DEFAULT_FAVORITES;
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.length > 0) {
      if (typeof parsed[0] === 'string') {
        const names: Record<string, { name: string; exchange: string }> =
          JSON.parse(localStorage.getItem(FAVORITE_NAMES_KEY) ?? '{}');
        return parsed.map((s: string) => ({
          symbol: s,
          name: names[s]?.name ?? s,
          exchange: names[s]?.exchange ?? '',
        }));
      }
      return parsed as FavoriteStock[];
    }
    return DEFAULT_FAVORITES;
  } catch {
    return DEFAULT_FAVORITES;
  }
}

function saveFavorites(favs: FavoriteStock[]): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(FAVORITES_KEY, JSON.stringify(favs));
}

// ─── Sparkline ───────────────────────────────────────────────────────────────

function Sparkline({ points, isPositive }: { points: HistoryPoint[]; isPositive: boolean }) {
  if (points.length < 2) {
    return (
      <svg viewBox="0 0 100 28" preserveAspectRatio="none" style={{ width: '100%', height: 28 }}>
        <line x1="0" y1="14" x2="100" y2="14" stroke="var(--border)" strokeWidth={1} />
      </svg>
    );
  }
  const closes = points.map(p => p.close);
  const min = Math.min(...closes);
  const max = Math.max(...closes);
  const range = max - min || 1;
  const pts = points
    .map((p, i) => {
      const x = (i / (points.length - 1)) * 100;
      const y = 26 - ((p.close - min) / range) * 24;
      return `${x},${y}`;
    })
    .join(' ');
  return (
    <svg viewBox="0 0 100 28" preserveAspectRatio="none" style={{ width: '100%', height: 28 }}>
      <polyline
        points={pts}
        fill="none"
        stroke={isPositive ? '#4a9e6a' : '#9e4a4a'}
        strokeWidth={1.5}
        strokeLinejoin="round"
        strokeLinecap="round"
      />
    </svg>
  );
}

// ─── History chart ────────────────────────────────────────────────────────────

function HistoryChart({ points, isPositive }: { points: HistoryPoint[]; isPositive: boolean }) {
  if (points.length < 2) {
    return <div style={{ height: 80, background: 'var(--bg2)', borderRadius: 6 }} />;
  }
  const closes = points.map(p => p.close);
  const min = Math.min(...closes);
  const max = Math.max(...closes);
  const range = max - min || 1;
  const d = points
    .map((p, i) => {
      const x = (i / (points.length - 1)) * 100;
      const y = 78 - ((p.close - min) / range) * 74;
      return `${i === 0 ? 'M' : 'L'} ${x} ${y}`;
    })
    .join(' ');
  return (
    <svg viewBox="0 0 100 80" preserveAspectRatio="none" style={{ width: '100%', height: 80 }}>
      <path d={d} fill="none" stroke={isPositive ? '#4a9e6a' : '#9e4a4a'} strokeWidth={1.5} />
    </svg>
  );
}

// ─── News Carousel ────────────────────────────────────────────────────────────

const NEWS_CARD_STEP = 238;

function StockNewsCarousel({ news, favorites }: { news: StockNewsItem[]; favorites: FavoriteStock[] }) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [activeIdx, setActiveIdx] = useState(0);
  const [summaries, setSummaries] = useState<Record<string, string>>({});
  const [loadingSummary, setLoadingSummary] = useState<string | null>(null);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const onScroll = () =>
      setActiveIdx(Math.min(Math.round(el.scrollLeft / NEWS_CARD_STEP), news.length - 1));
    el.addEventListener('scroll', onScroll, { passive: true });
    return () => el.removeEventListener('scroll', onScroll);
  }, [news.length]);

  const handleSummarize = async (e: React.MouseEvent, item: StockNewsItem) => {
    e.preventDefault();
    e.stopPropagation();
    if (summaries[item.url]) {
      setSummaries(prev => { const n = { ...prev }; delete n[item.url]; return n; });
      return;
    }
    setLoadingSummary(item.url);
    try {
      const res = await fetch('/api/summarize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: item.title, url: item.url }),
      });
      const d = await res.json();
      setSummaries(prev => ({ ...prev, [item.url]: d.summary ?? '...' }));
    } finally {
      setLoadingSummary(null);
    }
  };

  if (!news.length) return null;

  const symIdx = (sym: string) =>
    favorites.findIndex(f => f.symbol.replace(/\.DE$/, '') === sym.replace(/\.DE$/, ''));

  return (
    <div style={{ marginBottom: 8 }}>
      <div style={{ fontSize: 9, fontWeight: 500, color: 'var(--t4)', letterSpacing: '0.1em', textTransform: 'uppercase', padding: '14px 18px 8px' }}>
        News zu deinen Aktien
      </div>
      <div
        ref={scrollRef}
        className="no-scrollbar"
        style={{ display: 'flex', overflowX: 'auto', gap: 8, paddingLeft: 18, scrollSnapType: 'x mandatory' }}
      >
        {news.map(item => {
          const idx = symIdx(item.symbol);
          const badge = BADGE_COLORS[Math.max(0, idx) % BADGE_COLORS.length];
          const hasSummary = !!summaries[item.url];
          return (
            <a
              key={item.url}
              href={item.url}
              target="_blank"
              rel="noopener noreferrer"
              style={{ flexShrink: 0, display: 'flex', flexDirection: 'column', width: 230, background: 'var(--bg1)', border: '0.5px solid var(--border)', borderRadius: 14, padding: '10px 12px', scrollSnapAlign: 'start', textDecoration: 'none' }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                <span style={{ fontSize: 10, fontWeight: 600, padding: '2px 6px', borderRadius: 6, background: badge.bg, color: badge.text }}>
                  {item.symbol}
                </span>
                <span style={{ fontSize: 10, fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--t4)' }}>
                  {item.source}
                </span>
              </div>
              <p style={{ fontSize: 12, color: '#d8d4d0', lineHeight: 1.4, marginBottom: 'auto', display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                {item.title}
              </p>
              {hasSummary && (
                <p style={{ fontSize: 11, lineHeight: 1.6, marginTop: 8, borderLeft: '2px solid var(--border2)', paddingLeft: 8, color: 'var(--t3)' }}>
                  {summaries[item.url]}
                </p>
              )}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 8 }}>
                <span style={{ fontSize: 10, color: 'var(--t4)' }}>{newsDate(item.publishedAt)}</span>
                <button
                  onClick={e => handleSummarize(e, item)}
                  style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 10, background: 'none', border: 'none', cursor: 'pointer', color: loadingSummary === item.url ? 'var(--t3)' : 'var(--t4)' }}
                >
                  <Sparkles size={10} strokeWidth={1.5} />
                  {loadingSummary === item.url ? 'Lädt…' : hasSummary ? 'Ausblenden' : 'KI-Zusammenfassung'}
                </button>
              </div>
            </a>
          );
        })}
        <div style={{ flexShrink: 0, width: 18 }} />
      </div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', marginTop: 10, gap: 5 }}>
        {news.map((_, i) => (
          <div
            key={i}
            style={{ width: i === activeIdx ? 14 : 5, height: 5, borderRadius: i === activeIdx ? 3 : '50%', background: i === activeIdx ? 'var(--t3)' : 'var(--border2)', transition: 'all 0.2s' }}
          />
        ))}
      </div>
    </div>
  );
}

// ─── Detail Panel ─────────────────────────────────────────────────────────────

function DetailPanel({
  fav, quote, isFavorite, onToggleFavorite,
}: {
  fav: FavoriteStock; quote: StockQuote | null; isFavorite: boolean; onToggleFavorite: () => void;
}) {
  const [range, setRange] = useState<HistoryRange>('1M');
  const [history, setHistory] = useState<HistoryPoint[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  const fetchHistory = useCallback(async (r: HistoryRange) => {
    setLoadingHistory(true);
    try {
      const res = await fetch(`/api/stocks/history?symbol=${fav.symbol}&range=${r}`);
      const d = await res.json();
      setHistory(d.data ?? []);
    } finally {
      setLoadingHistory(false);
    }
  }, [fav.symbol]);

  useEffect(() => { fetchHistory('1M'); }, [fetchHistory]);

  const isPositive = quote ? quote.isPositive : true;

  return (
    <div style={{ margin: '8px 18px 0', background: 'var(--bg1)', border: '0.5px solid var(--border)', borderRadius: 18, overflow: 'hidden' }}>
      <div style={{ padding: '13px 13px 12px' }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 8 }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3 }}>
              <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--t1)' }}>
                {fav.symbol} <span style={{ color: 'var(--border2)' }}>·</span>{' '}
                <span style={{ fontSize: 11, fontWeight: 400, color: 'var(--t4)' }}>{fav.exchange}</span>
              </span>
              <button
                onClick={onToggleFavorite}
                style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: 2 }}
              >
                <Star size={14} color={isFavorite ? '#c48a2a' : 'var(--border2)'} fill={isFavorite ? '#c48a2a' : 'none'} strokeWidth={1.5} />
              </button>
            </div>
            <span style={{ fontSize: 11, color: 'var(--t4)' }}>{fav.name}</span>
          </div>
          {quote && (
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: 20, fontWeight: 500, color: '#d8d4cc', fontVariantNumeric: 'tabular-nums', lineHeight: 1 }}>
                {fmtPrice(quote.price)}
              </div>
              <div style={{ fontSize: 12, fontWeight: 500, fontVariantNumeric: 'tabular-nums', marginTop: 4, color: isPositive ? '#4a9e6a' : '#9e4a4a' }}>
                {isPositive ? '+' : ''}{fmtPrice(quote.change)} ({isPositive ? '+' : ''}{quote.changePercent.toFixed(2)}%)
              </div>
              {quote.lastUpdated && (
                <div style={{ fontSize: 9, marginTop: 4, color: 'var(--t4)' }}>
                  Stand: {new Date(quote.lastUpdated).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Berlin' })} Uhr
                  {quote.marketState && quote.marketState !== 'REGULAR' ? ' · Markt geschlossen' : ''}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Range selector */}
        <div style={{ display: 'flex', gap: 4, marginBottom: 8 }}>
          {HISTORY_RANGES.map(r => (
            <button
              key={r}
              onClick={() => { setRange(r); fetchHistory(r); }}
              style={{ fontSize: 11, fontWeight: 500, padding: '2px 8px', borderRadius: 6, background: range === r ? 'var(--bg2)' : 'transparent', color: range === r ? 'var(--t1)' : 'var(--t4)', border: 'none', cursor: 'pointer' }}
            >
              {r}
            </button>
          ))}
        </div>

        {/* Chart */}
        <div style={{ opacity: loadingHistory ? 0.4 : 1, transition: 'opacity 0.2s' }}>
          <HistoryChart points={history} isPositive={isPositive} />
        </div>

        {/* Stats */}
        {quote && (
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 10, paddingTop: 10, borderTop: '0.5px solid var(--border)' }}>
            {[
              { label: 'Eröffnung', value: fmtPrice(quote.open) },
              { label: 'Tageshoch', value: fmtPrice(quote.high) },
              { label: 'Volumen',   value: fmtVol(quote.volume)  },
            ].map(({ label, value }) => (
              <div key={label}>
                <div style={{ fontSize: 9, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--t4)' }}>{label}</div>
                <div style={{ fontSize: 12, fontWeight: 500, color: 'var(--t2)', fontVariantNumeric: 'tabular-nums', marginTop: 2 }}>{value}</div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function StocksTab() {
  const [favorites, setFavorites] = useState<FavoriteStock[]>([]);
  const [quotes, setQuotes] = useState<Record<string, StockQuote>>({});
  const [quotesLoading, setQuotesLoading] = useState(true);
  const [sparklines, setSparklines] = useState<Record<string, HistoryPoint[]>>({});
  const [news, setNews] = useState<StockNewsItem[]>([]);
  const [selectedStock, setSelectedStock] = useState<FavoriteStock | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<StockSearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const searchTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const searchRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const update = () => {
      const now = new Date();
      setDate(now.toLocaleDateString('de-DE', { weekday: 'long', day: 'numeric', month: 'long' }));
      setTime(now.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Berlin' }));
    };
    update();
    const id = setInterval(update, 60_000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => { setFavorites(loadFavorites()); }, []);

  useEffect(() => {
    if (!favorites.length) return;

    const fetchQuotes = async () => {
      const results = await Promise.allSettled(
        favorites.map(f =>
          fetch(`/api/stocks/quote?symbol=${f.symbol}`)
            .then(r => r.json())
            .then((d): [string, StockQuote] => [f.symbol, d]),
        ),
      );
      setQuotes(prev => {
        const next = { ...prev };
        results.forEach(r => {
          if (r.status === 'fulfilled' && r.value[1]?.price) next[r.value[0]] = r.value[1];
        });
        return next;
      });
      setQuotesLoading(false);
    };

    const fetchSparklines = async () => {
      const results = await Promise.allSettled(
        favorites.map(f =>
          fetch(`/api/stocks/history?symbol=${f.symbol}&range=1M`)
            .then(r => r.json())
            .then((d): [string, HistoryPoint[]] => [f.symbol, d.data ?? []]),
        ),
      );
      setSparklines(prev => {
        const next = { ...prev };
        results.forEach(r => { if (r.status === 'fulfilled') next[r.value[0]] = r.value[1]; });
        return next;
      });
    };

    const fetchNews = async () => {
      const symbols = favorites.map(f => f.symbol.replace(/\.DE$/, '')).join(',');
      const res = await fetch(`/api/stocks/news?symbols=${symbols}`).catch(() => null);
      if (res?.ok) { const d = await res.json(); setNews(d.news ?? []); }
    };

    fetchQuotes();
    fetchSparklines();
    fetchNews();
  }, [favorites]);

  const handleSearch = useCallback((q: string) => {
    setSearchQuery(q);
    clearTimeout(searchTimer.current);
    if (q.length < 1) { setSearchResults([]); setShowDropdown(false); return; }
    searchTimer.current = setTimeout(async () => {
      setSearching(true);
      try {
        const res = await fetch(`/api/stocks/search?q=${encodeURIComponent(q)}`);
        const d = await res.json();
        setSearchResults(d.results ?? []);
        setShowDropdown(true);
      } finally { setSearching(false); }
    }, 350);
  }, []);

  const handleSelectResult = useCallback((result: StockSearchResult) => {
    setSelectedStock({ symbol: result.symbol, name: result.name, exchange: result.exchange });
    setSearchQuery('');
    setShowDropdown(false);
    setSearchResults([]);
  }, []);

  const addFavoriteToList = useCallback((stock: FavoriteStock) => {
    setFavorites(prev => {
      if (prev.some(f => f.symbol === stock.symbol)) return prev;
      const next = [...prev, stock];
      saveFavorites(next);
      return next;
    });
  }, []);

  const removeFavorite = useCallback((symbol: string) => {
    setFavorites(prev => {
      const next = prev.filter(f => f.symbol !== symbol);
      saveFavorites(next);
      return next;
    });
  }, []);

  useEffect(() => {
    if (!selectedStock) return;
    const sym = selectedStock.symbol;
    if (quotes[sym]) return;
    fetch(`/api/stocks/quote?symbol=${sym}`)
      .then(r => r.json())
      .then(d => { if (d?.price) setQuotes(prev => ({ ...prev, [sym]: d })); });
  }, [selectedStock?.symbol]);

  return (
    <div style={{ overflowY: 'auto', paddingBottom: 24 }}>

      {/* ── Header ── */}
      <div style={{ padding: '22px 22px 0' }}>
        <div style={{ fontSize: 10, fontWeight: 600, color: 'var(--t4)', letterSpacing: '0.14em', textTransform: 'uppercase', marginBottom: 20 }}>
          Briefly
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 5 }}>
          <div style={{ fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Display', 'Helvetica Neue', sans-serif", fontSize: 30, fontWeight: 600, color: '#ffffff', lineHeight: 1.15, letterSpacing: '-0.02em' }}>
            Märkte
          </div>
          <TrendingUp size={20} color="var(--t4)" strokeWidth={1.5} />
        </div>
        <div style={{ fontSize: 11, color: 'var(--t4)', letterSpacing: '0.03em', paddingBottom: 18 }}>
          {date}{time ? ` · ${time} Uhr` : ''}
        </div>
      </div>

      {/* ── Market Briefing ── */}
      <MarketBriefing />

      {/* ── News Carousel ── */}
      {news.length > 0 && (
        <div style={{ marginTop: 16 }}>
          <StockNewsCarousel news={news} favorites={favorites} />
        </div>
      )}

      {/* ── Divider ── */}
      <div style={{ height: '0.5px', background: 'var(--border)', margin: '14px 18px 0' }} />

      {/* ── Search ── */}
      <div style={{ padding: '14px 18px', position: 'relative' }} ref={searchRef}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'var(--bg1)', border: '0.5px solid var(--border)', borderRadius: 12, padding: '9px 12px' }}>
          {searching ? (
            <div style={{ width: 16, height: 16, border: '1px solid var(--border)', borderTopColor: 'var(--t3)', borderRadius: '50%', animation: 'spin 0.8s linear infinite', flexShrink: 0 }} />
          ) : (
            <Search size={16} color="var(--t3)" strokeWidth={1.8} style={{ flexShrink: 0 }} />
          )}
          <input
            value={searchQuery}
            placeholder="Aktie suchen – z.B. SAP, Apple, Tesla…"
            onChange={e => handleSearch(e.target.value)}
            onFocus={() => searchResults.length && setShowDropdown(true)}
            onBlur={() => setTimeout(() => setShowDropdown(false), 200)}
            style={{ background: 'transparent', border: 'none', outline: 'none', color: 'var(--text-primary)', fontSize: 13, width: '100%' }}
          />
          {searchQuery && (
            <button onClick={() => { setSearchQuery(''); setShowDropdown(false); }} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
              <X size={14} color="var(--t4)" />
            </button>
          )}
        </div>

        {/* Dropdown */}
        {showDropdown && searchResults.length > 0 && (
          <div style={{ position: 'absolute', left: 18, right: 18, top: 'calc(100% - 6px)', zIndex: 30, background: 'var(--bg1)', border: '0.5px solid var(--border)', borderRadius: 14, overflow: 'hidden' }}>
            {searchResults.map(r => (
              <div
                key={r.symbol}
                onMouseDown={() => handleSelectResult(r)}
                style={{ padding: '10px 13px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '0.5px solid var(--border)', cursor: 'pointer' }}
              >
                <div>
                  <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--t1)' }}>{r.symbol}</div>
                  <div style={{ fontSize: 11, color: 'var(--t4)', marginTop: 2 }}>{r.name} · {r.exchange}</div>
                </div>
                <ChevronRight size={14} color="var(--t4)" />
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Watchlist label ── */}
      <div style={{ fontSize: 9, fontWeight: 500, color: 'var(--t4)', letterSpacing: '0.1em', textTransform: 'uppercase', padding: '0 18px 8px' }}>
        Meine Favoriten
      </div>

      {/* ── Watchlist ── */}
      {quotesLoading ? (
        <div style={{ margin: '0 18px', background: 'var(--bg1)', border: '0.5px solid var(--border)', borderRadius: 16, overflow: 'hidden' }}>
          {[0, 1, 2].map(i => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', padding: '11px 13px', borderBottom: i < 2 ? '0.5px solid var(--border)' : 'none', gap: 10 }}>
              <div style={{ width: 80 }}>
                <div style={{ height: 11, background: 'var(--bg2)', borderRadius: 4, width: 45, marginBottom: 5 }} />
                <div style={{ height: 8, background: 'var(--bg2)', borderRadius: 4, width: 62 }} />
              </div>
              <div style={{ flex: 1, height: 28, background: 'var(--bg2)', borderRadius: 4 }} />
              <div style={{ width: 55, textAlign: 'right' }}>
                <div style={{ height: 11, background: 'var(--bg2)', borderRadius: 4, width: 50, marginBottom: 5 }} />
                <div style={{ height: 8, background: 'var(--bg2)', borderRadius: 4, width: 30, marginLeft: 'auto' }} />
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div style={{ margin: '0 18px', background: 'var(--bg1)', border: '0.5px solid var(--border)', borderRadius: 16, overflow: 'hidden' }}>
          {favorites.map((fav, i) => {
            const quote = quotes[fav.symbol] ?? null;
            const isSelected = selectedStock?.symbol === fav.symbol;
            return (
              <div
                key={fav.symbol}
                onClick={() => setSelectedStock(isSelected ? null : fav)}
                style={{ display: 'flex', alignItems: 'center', padding: '11px 13px', borderBottom: i < favorites.length - 1 ? '0.5px solid var(--border)' : 'none', cursor: 'pointer', background: isSelected ? 'var(--bg2)' : 'transparent' }}
              >
                <div style={{ width: 90, flexShrink: 0 }}>
                  <div style={{ fontSize: 12, color: 'var(--t1)', fontWeight: 500 }}>{fav.symbol}</div>
                  <div style={{ fontSize: 9, color: 'var(--t4)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 82, marginTop: 2 }}>{fav.name}</div>
                </div>
                <div style={{ flex: 1, padding: '0 8px' }}>
                  <Sparkline points={sparklines[fav.symbol] ?? []} isPositive={quote?.isPositive ?? true} />
                </div>
                <div style={{ textAlign: 'right', flexShrink: 0, minWidth: 60 }}>
                  <div style={{ fontSize: 12, color: '#d8d4cc', fontVariantNumeric: 'tabular-nums' }}>{quote ? fmtPrice(quote.price) : '–'}</div>
                  <div style={{ fontSize: 9, fontWeight: 500, marginTop: 2, color: quote?.isPositive ? '#4a9e6a' : '#9e4a4a', fontVariantNumeric: 'tabular-nums' }}>
                    {quote ? `${quote.isPositive ? '+' : ''}${quote.changePercent.toFixed(2)}%` : '–'}
                  </div>
                </div>
                <button
                  onClick={e => { e.stopPropagation(); removeFavorite(fav.symbol); }}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '0 0 0 10px', flexShrink: 0 }}
                >
                  <Star size={13} color="var(--border2)" fill="var(--border2)" strokeWidth={0} />
                </button>
              </div>
            );
          })}
        </div>
      )}

      {/* ── Add button ── */}
      <div style={{ margin: '8px 18px 0' }}>
        <button
          onClick={() => (document.querySelector('input[placeholder*="Aktie"]') as HTMLInputElement)?.focus()}
          style={{ width: '100%', padding: '11px 0', borderRadius: 12, border: '0.5px dashed var(--border2)', background: 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, cursor: 'pointer' }}
        >
          <Plus size={16} color="var(--t3)" strokeWidth={1.5} />
          <span style={{ fontSize: 11, color: 'var(--t3)' }}>Hinzufügen</span>
        </button>
      </div>

      {/* ── Detail Panel ── */}
      {selectedStock && (
        <>
          <DetailPanel
            fav={selectedStock}
            quote={quotes[selectedStock.symbol] ?? null}
            isFavorite={favorites.some(f => f.symbol === selectedStock.symbol)}
            onToggleFavorite={() => {
              if (favorites.some(f => f.symbol === selectedStock.symbol)) {
                removeFavorite(selectedStock.symbol);
              } else {
                addFavoriteToList(selectedStock);
              }
            }}
          />
          <div style={{ display: 'flex', justifyContent: 'center', marginTop: 6 }}>
            <button
              onClick={() => setSelectedStock(null)}
              style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, color: 'var(--t4)', background: 'none', border: 'none', cursor: 'pointer' }}
            >
              <ChevronUp size={14} /> Schließen
            </button>
          </div>
        </>
      )}

      {!selectedStock && favorites.length > 0 && (
        <p style={{ textAlign: 'center', fontSize: 10, marginTop: 10, color: 'var(--t4)' }}>
          Eintrag antippen für Details
        </p>
      )}

      {typeof window !== 'undefined' && !process.env.NEXT_PUBLIC_HAS_AV_KEY && (
        <p style={{ textAlign: 'center', fontSize: 11, padding: '14px 18px', color: 'var(--t4)' }}>
          Für Live-Kurse ALPHA_VANTAGE_API_KEY in .env.local eintragen
        </p>
      )}
    </div>
  );
}
