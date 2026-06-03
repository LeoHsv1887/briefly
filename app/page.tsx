'use client';

import { useEffect, useState } from 'react';
import { ChevronDown, Home, Search, Settings as SettingsIcon, TrendingUp } from 'lucide-react';
import Header from '@/components/Header';
import TickerBar from '@/components/TickerBar';
import WeatherWidget from '@/components/WeatherWidget';
import NewsCard from '@/components/NewsCard';
import TopStories from '@/components/TopStories';
import TopStoriesCarousel from '@/components/TopStoriesCarousel';
import StocksTab from '@/components/StocksTab';
import SettingsPanel from '@/components/Settings';
import {
  getSettings,
  saveSettings,
  getSavedIds,
  toggleSaved,
  DEFAULT_SETTINGS,
} from '@/lib/profile';
import type { Article, TickerData, WeatherData, Settings } from '@/lib/types';

type MainTab = 'feed' | 'top' | 'stocks' | 'settings';
type BottomTab = 'home' | 'stocks' | 'search' | 'settings';

function groupByDate(articles: Article[]): Record<string, Article[]> {
  return articles.reduce<Record<string, Article[]>>((groups, article) => {
    const label = new Date(article.publishedAt).toLocaleDateString('de-DE', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
    });
    if (!groups[label]) groups[label] = [];
    groups[label].push(article);
    return groups;
  }, {});
}

function SectionHeader({ title, meta }: { title: string; meta: string }) {
  return (
    <div
      style={{
        padding: '10px 16px 6px',
        display: 'flex',
        alignItems: 'baseline',
        gap: 8,
        borderTop: '0.5px solid #1a1a1a',
      }}
    >
      <span style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#e8e8e8' }}>
        {title}
      </span>
      <span style={{ fontSize: 11, color: '#444' }}>{meta}</span>
    </div>
  );
}

function OlderArticlesSection({
  articles,
  saved,
  onSave,
  summariesInGerman,
}: {
  articles: Article[];
  saved: Set<string>;
  onSave: (id: string) => void;
  summariesInGerman: boolean;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const grouped = groupByDate(articles);

  return (
    <div>
      <button
        onClick={() => setIsOpen((o) => !o)}
        style={{
          width: '100%',
          padding: '12px 16px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          background: 'transparent',
          border: 'none',
          borderTop: '0.5px solid #1a1a1a',
          cursor: 'pointer',
        }}
      >
        <span style={{ fontSize: 11, fontWeight: 500, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#3a3a3a' }}>
          Ältere Meldungen · {articles.length} Artikel
        </span>
        <ChevronDown
          size={14}
          color="#3a3a3a"
          style={{ transform: isOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}
        />
      </button>

      {isOpen &&
        Object.entries(grouped).map(([date, dayArticles]) => (
          <div key={date}>
            <div style={{ padding: '8px 16px 4px', fontSize: 11, color: '#2e2e2e', fontWeight: 500 }}>
              {date}
            </div>
            <div className="divide-y divide-[#181818]">
              {dayArticles.map((article) => (
                <NewsCard
                  key={article.id}
                  article={article}
                  isSaved={saved.has(article.id)}
                  onSave={onSave}
                  summariesInGerman={summariesInGerman}
                />
              ))}
            </div>
          </div>
        ))}
    </div>
  );
}

function SkeletonCard() {
  return (
    <div className="px-4 py-4 border-b border-[#181818] animate-pulse">
      <div className="flex justify-between mb-2">
        <div className="h-3 bg-[#1e1e1e] rounded w-24" />
        <div className="h-4 bg-[#1e1e1e] rounded w-20" />
      </div>
      <div className="h-4 bg-[#1e1e1e] rounded w-full mb-1.5" />
      <div className="h-4 bg-[#1e1e1e] rounded w-4/5" />
    </div>
  );
}

const TAB_LABELS: Record<MainTab, string> = {
  feed: 'Feed',
  top: 'Top Stories',
  stocks: 'Aktien',
  settings: 'Einstellungen',
};

export default function App() {
  const [mainTab, setMainTab] = useState<MainTab>('feed');
  const [bottomTab, setBottomTab] = useState<BottomTab>('home');
  const [articles, setArticles] = useState<Article[]>([]);
  const [tickers, setTickers] = useState<TickerData[]>([]);
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [loading, setLoading] = useState(true);
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const [saved, setSaved] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearch, setShowSearch] = useState(false);

  useEffect(() => {
    setSettings(getSettings());
    setSaved(getSavedIds());

    const fetchAll = async () => {
      try {
        const [feedRes, tickerRes, weatherRes] = await Promise.allSettled([
          fetch('/api/feeds').then((r) => r.json()),
          fetch('/api/tickers').then((r) => r.json()),
          fetch('/api/weather').then((r) => r.json()),
        ]);
        if (feedRes.status === 'fulfilled') setArticles(feedRes.value.articles ?? []);
        if (tickerRes.status === 'fulfilled') setTickers(tickerRes.value.tickers ?? []);
        if (weatherRes.status === 'fulfilled') setWeather(weatherRes.value.weather ?? null);
      } finally {
        setLoading(false);
      }
    };
    fetchAll();
  }, []);

  const handleSettingsChange = (s: Settings) => {
    setSettings(s);
    saveSettings(s);
  };

  const handleSave = (id: string) => setSaved(toggleSaved(id));

  const filteredArticles = articles
    .filter((a) => a.score >= settings.minScore)
    .filter((a) => settings.enabledTopics.includes(a.topic) || a.topic === 'Allgemein')
    .filter(
      (a) =>
        !searchQuery ||
        a.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        a.source.toLowerCase().includes(searchQuery.toLowerCase()),
    );

  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const todayArticles = filteredArticles.filter((a) => new Date(a.publishedAt) >= todayStart).slice(0, 12);
  const olderArticles = filteredArticles.filter((a) => new Date(a.publishedAt) < todayStart);

  const topStories = [...articles]
    .filter((a) => a.score >= 7)
    .sort((a, b) => b.score - a.score)
    .slice(0, 8);

  const todayHighlights = [...articles]
    .filter((a) => new Date(a.publishedAt) >= todayStart && a.score >= 7)
    .sort((a, b) => b.score - a.score)
    .slice(0, 8);
  const carouselStories =
    todayHighlights.length >= 3
      ? todayHighlights
      : [...articles].sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime()).slice(0, 8);

  const dax = tickers.find((t) => t.symbol === 'DAX');

  const goTo = (main: MainTab, bottom: BottomTab) => {
    setMainTab(main);
    setBottomTab(bottom);
    if (bottom !== 'search') {
      setShowSearch(false);
      setSearchQuery('');
    }
  };

  return (
    <div
      className="min-h-screen bg-[#0f0f0f] text-[#e8e8e8]"
      style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif' }}
    >
      <Header dax={dax} articleCount={filteredArticles.length} settings={settings} />

      {/* Tab nav */}
      <nav className="flex border-b border-[#1e1e1e] px-4 sticky top-0 bg-[#0f0f0f] z-10 overflow-x-auto no-scrollbar">
        {(Object.keys(TAB_LABELS) as MainTab[]).map((t) => (
          <button
            key={t}
            onClick={() => goTo(t, t === 'settings' ? 'settings' : t === 'stocks' ? 'stocks' : 'home')}
            className={`py-3 px-1 mr-5 text-[13px] font-medium transition-colors border-b-2 flex-shrink-0 ${
              mainTab === t ? 'text-[#e8e8e8] border-white' : 'text-[#555] border-transparent'
            }`}
          >
            {TAB_LABELS[t]}
          </button>
        ))}
      </nav>

      {/* Search bar (feed only) */}
      {showSearch && mainTab === 'feed' && (
        <div className="px-4 py-2 bg-[#0f0f0f] border-b border-[#1e1e1e]">
          <input
            autoFocus
            type="search"
            placeholder="Artikel durchsuchen…"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-[#161616] border border-[#2a2a2a] rounded-lg px-3 py-2 text-[14px] text-[#e8e8e8] placeholder:text-[#444] focus:outline-none"
          />
        </div>
      )}

      {/* Content */}
      <main className="pb-24">
        {mainTab === 'settings' ? (
          <SettingsPanel settings={settings} onChange={handleSettingsChange} />
        ) : mainTab === 'stocks' ? (
          <StocksTab />
        ) : mainTab === 'top' ? (
          <TopStories articles={topStories} saved={saved} onSave={handleSave} />
        ) : (
          /* Feed */
          <>
            {tickers.length > 0 && <TickerBar tickers={tickers} />}
            <WeatherWidget weather={weather} />
            {!loading && carouselStories.length > 0 && (
              <TopStoriesCarousel articles={carouselStories} />
            )}
            {loading ? (
              <div className="divide-y divide-[#181818]">
                {Array.from({ length: 7 }).map((_, i) => (
                  <SkeletonCard key={i} />
                ))}
              </div>
            ) : filteredArticles.length === 0 ? (
              <div className="px-4 py-12 text-center text-[#555] text-sm">
                Keine Artikel gefunden. Relevanz-Schwelle verringern?
              </div>
            ) : (
              <>
                <SectionHeader title="Heute" meta={`${todayArticles.length} Artikel`} />
                <div className="divide-y divide-[#181818]">
                  {todayArticles.map((article) => (
                    <NewsCard
                      key={article.id}
                      article={article}
                      isSaved={saved.has(article.id)}
                      onSave={handleSave}
                      summariesInGerman={settings.summariesInGerman}
                    />
                  ))}
                </div>
                {olderArticles.length > 0 && (
                  <OlderArticlesSection
                    articles={olderArticles}
                    saved={saved}
                    onSave={handleSave}
                    summariesInGerman={settings.summariesInGerman}
                  />
                )}
              </>
            )}
          </>
        )}
      </main>

      {/* Bottom nav */}
      <nav className="fixed bottom-0 left-0 right-0 bg-[#0a0a0a] border-t border-[#1a1a1a] flex justify-around items-center z-20 safe-bottom">
        <button
          onClick={() => goTo('feed', 'home')}
          className={`p-3 transition-opacity ${bottomTab === 'home' ? 'opacity-100' : 'opacity-25'}`}
          aria-label="Home"
        >
          <Home size={22} strokeWidth={1.8} />
        </button>
        <button
          onClick={() => goTo('stocks', 'stocks')}
          className={`p-3 transition-opacity ${bottomTab === 'stocks' ? 'opacity-100' : 'opacity-25'}`}
          aria-label="Aktien"
        >
          <TrendingUp size={22} strokeWidth={1.8} />
        </button>
        <button
          onClick={() => {
            const next = !showSearch;
            setShowSearch(next);
            if (next) goTo('feed', 'search');
            else setBottomTab('home');
            if (!next) setSearchQuery('');
          }}
          className={`p-3 transition-opacity ${bottomTab === 'search' ? 'opacity-100' : 'opacity-25'}`}
          aria-label="Suche"
        >
          <Search size={22} strokeWidth={1.8} />
        </button>
        <button
          onClick={() => goTo('settings', 'settings')}
          className={`p-3 transition-opacity ${bottomTab === 'settings' ? 'opacity-100' : 'opacity-25'}`}
          aria-label="Einstellungen"
        >
          <SettingsIcon size={22} strokeWidth={1.8} />
        </button>
      </nav>
    </div>
  );
}
