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
  { symbol: 'SAP', name: 'SAP SE', exchange: 'XETRA' },
  { symbol: 'NVDA', name: 'NVIDIA Corporation', exchange: 'NASDAQ' },
  { symbol: 'VOW3', name: 'Volkswagen AG', exchange: 'XETRA' },
];

// ─── Helpers ─────────────────────────────────────────────────────────────────

function relTime(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const min = Math.floor(diff / 60_000);
  if (min < 1) return 'gerade';
  if (min < 60) return `vor ${min} Min.`;
  const h = Math.floor(min / 60);
  if (h < 24) return `vor ${h} Std.`;
  return new Date(dateStr).toLocaleDateString('de-DE', { day: 'numeric', month: 'short' });
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
    // Support both old string[] format and new FavoriteStock[] format
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
        <line x1="0" y1="14" x2="100" y2="14" stroke="#2a2a2a" strokeWidth={1} />
      </svg>
    );
  }
  const closes = points.map((p) => p.close);
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
        stroke={isPositive ? '#22c47a' : '#e05a4b'}
        strokeWidth={1.5}
        strokeLinejoin="round"
        strokeLinecap="round"
      />
    </svg>
  );
}

// ─── History chart (detail panel) ────────────────────────────────────────────

function HistoryChart({ points, isPositive }: { points: HistoryPoint[]; isPositive: boolean }) {
  if (points.length < 2) {
    return (
      <div style={{ height: 80, background: '#111', borderRadius: 6 }} className="animate-pulse" />
    );
  }
  const closes = points.map((p) => p.close);
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
      <path d={d} fill="none" stroke={isPositive ? '#22c47a' : '#e05a4b'} strokeWidth={1.5} />
    </svg>
  );
}

// ─── News Carousel ───────────────────────────────────────────────────────────

const NEWS_CARD_STEP = 238;

function StockNewsCarousel({
  news,
  favorites,
}: {
  news: StockNewsItem[];
  favorites: FavoriteStock[];
}) {
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
      setSummaries((prev) => { const n = { ...prev }; delete n[item.url]; return n; });
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
      setSummaries((prev) => ({ ...prev, [item.url]: d.summary ?? '...' }));
    } finally {
      setLoadingSummary(null);
    }
  };

  if (!news.length) return null;

  const symIdx = (sym: string) =>
    favorites.findIndex((f) => f.symbol.replace(/\.DE$/, '') === sym.replace(/\.DE$/, ''));

  return (
    <div className="mb-2">
      <p className="text-[11px] font-semibold text-[#555] uppercase tracking-widest px-[14px] mb-3">
        News zu deinen Aktien
      </p>
      <div
        ref={scrollRef}
        className="flex overflow-x-auto no-scrollbar gap-[8px] pl-[14px]"
        style={{ scrollSnapType: 'x mandatory' }}
      >
        {news.map((item) => {
          const idx = symIdx(item.symbol);
          const badge = BADGE_COLORS[Math.max(0, idx) % BADGE_COLORS.length];
          const hasSummary = !!summaries[item.url];
          return (
            <a
              key={item.url}
              href={item.url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-shrink-0 flex flex-col"
              style={{
                width: 230,
                background: '#161616',
                border: '0.5px solid #222',
                borderRadius: 14,
                padding: '10px 12px',
                scrollSnapAlign: 'start',
              }}
            >
              <div className="flex items-center justify-between mb-1.5">
                <span
                  className="text-[10px] font-semibold px-1.5 py-0.5 rounded-md"
                  style={{ background: badge.bg, color: badge.text }}
                >
                  {item.symbol}
                </span>
                <span className="text-[10px] font-medium uppercase tracking-wide" style={{ color: '#333' }}>
                  {item.source}
                </span>
              </div>
              <p
                className="text-[12px] font-medium leading-snug mb-auto"
                style={{
                  color: '#c0c0c0',
                  display: '-webkit-box',
                  WebkitLineClamp: 3,
                  WebkitBoxOrient: 'vertical',
                  overflow: 'hidden',
                }}
              >
                {item.title}
              </p>
              {hasSummary && (
                <p className="text-[11px] leading-relaxed mt-2 border-l-2 border-[#333] pl-2" style={{ color: '#777' }}>
                  {summaries[item.url]}
                </p>
              )}
              <div className="flex items-center justify-between mt-2">
                <span className="text-[10px]" style={{ color: '#444' }}>
                  {relTime(item.publishedAt)}
                </span>
                <button
                  onClick={(e) => handleSummarize(e, item)}
                  className="flex items-center gap-1 text-[10px] transition-colors"
                  style={{ color: loadingSummary === item.url ? '#888' : '#444' }}
                >
                  <Sparkles size={10} strokeWidth={1.5} />
                  {loadingSummary === item.url ? 'Lädt…' : hasSummary ? 'Ausblenden' : 'KI-Zusammenfassung'}
                </button>
              </div>
            </a>
          );
        })}
        <div className="flex-shrink-0" style={{ width: 14 }} />
      </div>
      <div className="flex items-center justify-center mt-3" style={{ gap: 5 }}>
        {news.map((_, i) => (
          <div
            key={i}
            style={{
              width: i === activeIdx ? 14 : 5,
              height: 5,
              borderRadius: i === activeIdx ? 3 : '50%',
              background: i === activeIdx ? '#666' : '#2a2a2a',
              transition: 'all 0.2s',
            }}
          />
        ))}
      </div>
    </div>
  );
}

// ─── Detail Panel ─────────────────────────────────────────────────────────────

function DetailPanel({
  fav,
  quote,
  isFavorite,
  onToggleFavorite,
}: {
  fav: FavoriteStock;
  quote: StockQuote | null;
  isFavorite: boolean;
  onToggleFavorite: () => void;
}) {
  const [range, setRange] = useState<HistoryRange>('1M');
  const [history, setHistory] = useState<HistoryPoint[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  const fetchHistory = useCallback(
    async (r: HistoryRange) => {
      setLoadingHistory(true);
      try {
        const res = await fetch(`/api/stocks/history?symbol=${fav.symbol}&range=${r}`);
        const d = await res.json();
        setHistory(d.data ?? []);
      } finally {
        setLoadingHistory(false);
      }
    },
    [fav.symbol],
  );

  useEffect(() => {
    fetchHistory('1M');
  }, [fetchHistory]);

  const handleRange = (r: HistoryRange) => {
    setRange(r);
    fetchHistory(r);
  };

  const isPositive = quote ? quote.isPositive : true;

  return (
    <div
      className="mx-[14px] mb-2 rounded-xl overflow-hidden"
      style={{ background: '#141414', border: '0.5px solid #222' }}
    >
      <div className="px-3 pt-3 pb-2">
        {/* Header */}
        <div className="flex items-start justify-between mb-1">
          <div>
            <div className="flex items-center gap-2">
              <p className="text-[13px] font-semibold text-[#e0e0e0]">
                {fav.symbol} <span style={{ color: '#3a3a3a' }}>·</span>{' '}
                <span className="text-[11px] font-normal" style={{ color: '#3a3a3a' }}>
                  {fav.exchange}
                </span>
              </p>
              <button
                onClick={onToggleFavorite}
                style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: 2 }}
                aria-label={isFavorite ? 'Aus Favoriten entfernen' : 'Zu Favoriten hinzufügen'}
              >
                <Star
                  size={14}
                  color={isFavorite ? '#c48a2a' : '#444'}
                  fill={isFavorite ? '#c48a2a' : 'none'}
                  strokeWidth={1.5}
                />
              </button>
            </div>
            <p className="text-[11px]" style={{ color: '#555' }}>
              {fav.name}
            </p>
          </div>
          {quote && (
            <div className="text-right">
              <p className="text-[20px] font-semibold text-[#e8e8e8] tabular-nums leading-none">
                {fmtPrice(quote.price)}
              </p>
              <p
                className="text-[12px] font-medium tabular-nums mt-0.5"
                style={{ color: isPositive ? '#22c47a' : '#e05a4b' }}
              >
                {isPositive ? '+' : ''}
                {fmtPrice(quote.change)} ({isPositive ? '+' : ''}
                {quote.changePercent.toFixed(2)}%)
              </p>
            </div>
          )}
        </div>

        {/* Range selector */}
        <div className="flex gap-1 mb-2">
          {HISTORY_RANGES.map((r) => (
            <button
              key={r}
              onClick={() => handleRange(r)}
              className="text-[11px] font-medium px-2 py-0.5 rounded transition-colors"
              style={{
                background: range === r ? '#222' : 'transparent',
                color: range === r ? '#d0d0d0' : '#444',
              }}
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
          <div className="flex justify-between mt-2 pt-2 border-t border-[#1e1e1e]">
            {[
              { label: 'Eröffnung', value: fmtPrice(quote.open) },
              { label: 'Tageshoch', value: fmtPrice(quote.high) },
              { label: 'Volumen', value: fmtVol(quote.volume) },
            ].map(({ label, value }) => (
              <div key={label}>
                <p className="text-[9px] uppercase tracking-wide" style={{ color: '#444' }}>
                  {label}
                </p>
                <p className="text-[12px] font-medium text-[#ccc] tabular-nums">{value}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Stock Tile ───────────────────────────────────────────────────────────────

function StockTile({
  fav,
  badgeColor,
  quote,
  sparkline,
  isSelected,
  isLoading,
  onSelect,
  onRemove,
}: {
  fav: FavoriteStock;
  badgeColor: (typeof BADGE_COLORS)[number];
  quote: StockQuote | null;
  sparkline: HistoryPoint[];
  isSelected: boolean;
  isLoading: boolean;
  onSelect: () => void;
  onRemove: (e: React.MouseEvent) => void;
}) {
  // Skeleton while quotes are being fetched for the first time
  if (isLoading && !quote) {
    return (
      <div
        style={{
          background: '#161616',
          border: '0.5px solid #1e1e1e',
          borderRadius: 12,
          padding: '10px 11px',
          minHeight: 94,
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
          <div style={{ width: 36, height: 14, background: '#1e1e1e', borderRadius: 4 }} />
          <div style={{ width: 14, height: 14, background: '#1e1e1e', borderRadius: 4 }} />
        </div>
        <div style={{ width: 60, height: 10, background: '#1e1e1e', borderRadius: 4, marginBottom: 10 }} />
        <div style={{ width: '100%', height: 28, background: '#1e1e1e', borderRadius: 4, marginBottom: 8 }} />
        <div style={{ width: 50, height: 14, background: '#1e1e1e', borderRadius: 4 }} />
      </div>
    );
  }

  return (
    // div instead of button to avoid nested-button hydration error
    <div
      onClick={onSelect}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === 'Enter' && onSelect()}
      className="rounded-xl overflow-hidden"
      style={{
        background: '#161616',
        border: `0.5px solid ${isSelected ? '#333' : '#1e1e1e'}`,
        cursor: 'pointer',
      }}
    >
      <div className="p-3">
        <div className="flex items-center justify-between mb-0.5">
          <span
            className="text-[12px] font-semibold px-1.5 py-0.5 rounded"
            style={{ background: badgeColor.bg, color: badgeColor.text }}
          >
            {fav.symbol}
          </span>
          {/* This button is the only interactive element – no nesting issue */}
          <button
            onClick={onRemove}
            className="p-0.5"
            aria-label="Aus Favoriten entfernen"
          >
            <Star size={13} style={{ color: '#c48a2a' }} fill="#c48a2a" strokeWidth={0} />
          </button>
        </div>
        <p className="text-[9px] mb-2 truncate" style={{ color: '#3a3a3a' }}>
          {fav.name}
        </p>

        {!quote ? (
          /* Loaded but no data from API */
          <>
            <p className="text-[14px] font-semibold tabular-nums leading-none mb-1" style={{ color: '#555' }}>
              –
            </p>
            <div style={{ height: 28 }} />
            <p className="text-[11px] mt-1" style={{ color: '#3a3a3a' }}>
              Keine Daten
            </p>
          </>
        ) : (
          <>
            <p className="text-[14px] font-semibold text-[#e8e8e8] tabular-nums leading-none mb-1">
              {fmtPrice(quote.price)}
            </p>
            <Sparkline points={sparkline} isPositive={quote.isPositive} />
            <div
              className="flex items-center gap-1 mt-1"
              style={{ color: quote.isPositive ? '#22c47a' : '#e05a4b' }}
            >
              {quote.isPositive ? (
                <TrendingUp size={11} strokeWidth={2} />
              ) : (
                <TrendingDown size={11} strokeWidth={2} />
              )}
              <span className="text-[11px] font-medium tabular-nums">
                {quote.isPositive ? '+' : ''}
                {quote.changePercent.toFixed(2)}%
              </span>
            </div>
          </>
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
  const searchTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const searchRef = useRef<HTMLDivElement>(null);

  // Load favorites from localStorage
  useEffect(() => {
    setFavorites(loadFavorites());
  }, []);

  // Fetch quotes + sparklines + news when favorites change
  useEffect(() => {
    if (!favorites.length) return;

    const fetchQuotes = async () => {
      const results = await Promise.allSettled(
        favorites.map((f) =>
          fetch(`/api/stocks/quote?symbol=${f.symbol}`)
            .then((r) => r.json())
            .then((d): [string, StockQuote] => [f.symbol, d]),
        ),
      );
      setQuotes((prev) => {
        const next = { ...prev };
        results.forEach((r) => {
          if (r.status === 'fulfilled' && r.value[1]?.price) {
            next[r.value[0]] = r.value[1];
          }
        });
        return next;
      });
      setQuotesLoading(false);
    };

    const fetchSparklines = async () => {
      const results = await Promise.allSettled(
        favorites.map((f) =>
          fetch(`/api/stocks/history?symbol=${f.symbol}&range=1M`)
            .then((r) => r.json())
            .then((d): [string, HistoryPoint[]] => [f.symbol, d.data ?? []]),
        ),
      );
      setSparklines((prev) => {
        const next = { ...prev };
        results.forEach((r) => {
          if (r.status === 'fulfilled') next[r.value[0]] = r.value[1];
        });
        return next;
      });
    };

    const fetchNews = async () => {
      const symbols = favorites.map((f) => f.symbol.replace(/\.DE$/, '')).join(',');
      const res = await fetch(`/api/stocks/news?symbols=${symbols}`).catch(() => null);
      if (res?.ok) {
        const d = await res.json();
        setNews(d.news ?? []);
      }
    };

    fetchQuotes();
    fetchSparklines();
    fetchNews();
  }, [favorites]);

  // Search debounce
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
      } finally {
        setSearching(false);
      }
    }, 350);
  }, []);

  const handleSelectResult = useCallback((result: StockSearchResult) => {
    setSelectedStock({ symbol: result.symbol, name: result.name, exchange: result.exchange });
    setSearchQuery('');
    setShowDropdown(false);
    setSearchResults([]);
  }, []);

  const addFavoriteToList = useCallback((stock: FavoriteStock) => {
    setFavorites((prev) => {
      if (prev.some((f) => f.symbol === stock.symbol)) return prev;
      const next = [...prev, stock];
      saveFavorites(next);
      return next;
    });
  }, []);

  const removeFavorite = useCallback((symbol: string) => {
    setFavorites((prev) => {
      const next = prev.filter((f) => f.symbol !== symbol);
      saveFavorites(next);
      return next;
    });
  }, []);

  // Fetch quote for search-selected stocks not already in favorites
  useEffect(() => {
    if (!selectedStock) return;
    const sym = selectedStock.symbol;
    if (quotes[sym]) return;
    fetch(`/api/stocks/quote?symbol=${sym}`)
      .then(r => r.json())
      .then(d => { if (d?.price) setQuotes(prev => ({ ...prev, [sym]: d })); });
  }, [selectedStock?.symbol]);

  const noApiKey = typeof window !== 'undefined' && !favorites.length;

  return (
    <div className="py-4">
      {/* 1. Market Briefing */}
      <MarketBriefing />

      {/* 2. News Carousel */}
      {news.length > 0 && (
        <div className="mt-4">
          <StockNewsCarousel news={news} favorites={favorites} />
        </div>
      )}

      {/* 3. Divider */}
      <div style={{ height: '0.5px', background: '#1a1a1a', margin: '14px 14px 0' }} />

      {/* 4. Search */}
      <div className="px-[14px] mt-4 mb-4 relative" ref={searchRef}>
        <div
          className="flex items-center gap-2"
          style={{ background: '#161616', border: '0.5px solid #222', borderRadius: 10, padding: '9px 12px' }}
        >
          {searching ? (
            <div className="w-4 h-4 border border-[#3a3a3a] border-t-[#888] rounded-full animate-spin flex-shrink-0" />
          ) : (
            <Search size={16} color="#3a3a3a" strokeWidth={1.8} className="flex-shrink-0" />
          )}
          <input
            value={searchQuery}
            placeholder="Aktie suchen – z.B. SAP, Apple, Tesla…"
            onChange={(e) => handleSearch(e.target.value)}
            onFocus={() => searchResults.length && setShowDropdown(true)}
            onBlur={() => setTimeout(() => setShowDropdown(false), 200)}
            style={{ background: 'transparent', border: 'none', outline: 'none', color: '#e8e8e8', fontSize: 13, width: '100%' }}
          />
          {searchQuery && (
            <button onClick={() => { setSearchQuery(''); setShowDropdown(false); }}>
              <X size={14} color="#444" />
            </button>
          )}
        </div>

        {/* Dropdown */}
        {showDropdown && searchResults.length > 0 && (
          <div
            className="absolute left-[14px] right-[14px] top-[calc(100%+4px)] z-30 rounded-xl overflow-hidden"
            style={{ background: '#1a1a1a', border: '0.5px solid #333' }}
          >
            {searchResults.map((r) => (
              <div
                key={r.symbol}
                onMouseDown={() => handleSelectResult(r)}
                className="w-full px-3 py-2.5 flex items-center justify-between hover:bg-[#222] transition-colors border-b border-[#222] last:border-0 cursor-pointer"
              >
                <div>
                  <div style={{ fontSize: 13, fontWeight: 500, color: '#d0d0d0' }}>{r.symbol}</div>
                  <div style={{ fontSize: 11, color: '#444', marginTop: 2 }}>{r.name} · {r.exchange}</div>
                </div>
                <ChevronRight size={14} color="#333" />
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 5. Favorites Grid */}
      <p className="text-[11px] font-semibold text-[#555] uppercase tracking-widest px-[14px] mb-3 mt-2">
        Meine Favoriten
      </p>

      <div className="grid grid-cols-2 gap-[8px] px-[14px]">
        {favorites.map((fav, i) => {
          const badge = BADGE_COLORS[i % BADGE_COLORS.length];
          const quote = quotes[fav.symbol] ?? null;
          const sparkline = sparklines[fav.symbol] ?? [];
          const isSelected = selectedStock?.symbol === fav.symbol;

          return (
            <div key={fav.symbol}>
              <StockTile
                fav={fav}
                badgeColor={badge}
                quote={quote}
                sparkline={sparkline}
                isSelected={isSelected}
                isLoading={quotesLoading}
                onSelect={() => setSelectedStock(isSelected ? null : fav)}
                onRemove={(e) => { e.stopPropagation(); removeFavorite(fav.symbol); }}
              />
              {/* Inline detail panel — spans full width */}
              {isSelected && i % 2 === 1 && (
                <div
                  className="col-span-2 -mx-[14px] mt-2"
                  style={{ gridColumn: '1 / -1' }}
                />
              )}
            </div>
          );
        })}

        {/* Add tile */}
        <button
          onClick={() => (document.querySelector('input[placeholder*="Aktie"]') as HTMLInputElement)?.focus()}
          className="rounded-xl flex flex-col items-center justify-center gap-1.5 py-6"
          style={{ border: '1px dashed #2a2a2a', background: 'transparent', minHeight: 100 }}
        >
          <Plus size={20} color="#333" strokeWidth={1.5} />
          <span className="text-[11px]" style={{ color: '#333' }}>Hinzufügen</span>
        </button>
      </div>

      {/* Detail panels (full width, after grid) */}
      {selectedStock && (
        <div className="mt-3">
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
        </div>
      )}

      {/* Chevron hint */}
      {selectedStock && (
        <div className="flex justify-center mt-1 mb-2">
          <button
            onClick={() => setSelectedStock(null)}
            className="flex items-center gap-1 text-[11px]"
            style={{ color: '#3a3a3a' }}
          >
            <ChevronUp size={14} />
            Schließen
          </button>
        </div>
      )}

      {!selectedStock && favorites.length > 0 && (
        <p className="text-center text-[10px] mt-3" style={{ color: '#2a2a2a' }}>
          Kachel antippen für Details
        </p>
      )}

      {/* Alpha Vantage key hint */}
      {typeof window !== 'undefined' && !process.env.NEXT_PUBLIC_HAS_AV_KEY && (
        <p className="text-center text-[11px] px-4 mt-4" style={{ color: '#3a3a3a' }}>
          Für Live-Kurse ALPHA_VANTAGE_API_KEY in .env.local eintragen
        </p>
      )}
    </div>
  );
}
