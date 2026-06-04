'use client';

import { useEffect, useState } from 'react';
import { Bookmark, Home, Search, Settings as SettingsIcon, TrendingUp } from 'lucide-react';
import Header from '@/components/Header';
import { PodcastPlayer } from '@/components/PodcastPlayer';
import TickerBar from '@/components/TickerBar';
import TopStories from '@/components/TopStories';
import StocksTab from '@/components/StocksTab';
import { BookmarksTab } from '@/components/BookmarksTab';
import { FeedSection } from '@/components/FeedSection';
import SettingsPanel from '@/components/Settings';
import {
  getSettings,
  saveSettings,
  getSavedIds,
  toggleSaved,
  DEFAULT_SETTINGS,
} from '@/lib/profile';
import type { Article, TickerData, Settings } from '@/lib/types';

type MainTab = 'feed' | 'top' | 'stocks' | 'bookmarks' | 'settings';
type BottomTab = 'home' | 'stocks' | 'search' | 'bookmarks' | 'settings';

function SkeletonCard() {
  return (
    <div style={{ padding: '12px 16px', borderBottom: '0.5px solid #181818' }}>
      <div style={{ display: 'flex', gap: 10 }}>
        <div style={{ flex: 1 }}>
          <div style={{ height: 10, background: '#1e1e1e', borderRadius: 4, width: '40%', marginBottom: 8 }} />
          <div style={{ height: 13, background: '#1e1e1e', borderRadius: 4, width: '100%', marginBottom: 6 }} />
          <div style={{ height: 13, background: '#1e1e1e', borderRadius: 4, width: '75%' }} />
        </div>
        <div style={{ width: 72, height: 72, borderRadius: 8, background: '#1a1a1a', flexShrink: 0 }} />
      </div>
    </div>
  );
}

const TAB_LABELS: Record<MainTab, string> = {
  feed: 'Feed',
  top: 'Top Stories',
  stocks: 'Aktien',
  bookmarks: 'Gespeichert',
  settings: 'Einstellungen',
};

export default function App() {
  const [mainTab, setMainTab] = useState<MainTab>('feed');
  const [bottomTab, setBottomTab] = useState<BottomTab>('home');
  const [articles, setArticles] = useState<Article[]>([]);
  const [tickers, setTickers] = useState<TickerData[]>([]);
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
        const [feedRes, tickerRes] = await Promise.allSettled([
          fetch('/api/feeds').then(r => r.json()),
          fetch('/api/tickers').then(r => r.json()),
        ]);
        if (feedRes.status === 'fulfilled') setArticles(feedRes.value.articles ?? []);
        if (tickerRes.status === 'fulfilled') setTickers(tickerRes.value.tickers ?? []);
      } finally {
        setLoading(false);
      }
    };
    fetchAll();
  }, []);

  const handleSettingsChange = (s: Settings) => { setSettings(s); saveSettings(s); };
  const handleSave = (id: string) => setSaved(toggleSaved(id));

  const search = (a: Article) =>
    !searchQuery ||
    a.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    a.source.toLowerCase().includes(searchQuery.toLowerCase());

  const topArticles        = articles.filter(a => a.score >= 7 && search(a)).slice(0, 7);
  const wirtschaftArticles = articles.filter(a => ['Wirtschaft & Finanzen', 'Aktienmärkte'].includes(a.topic) && search(a)).slice(0, 7);
  const politikArticles    = articles.filter(a => ['Politik DE/EU', 'Geopolitik'].includes(a.topic) && search(a)).slice(0, 7);
  const sportArticles      = articles.filter(a => a.topic === 'Sport' && search(a)).slice(0, 7);
  const techArticles       = articles.filter(a => a.topic === 'Technologie & KI' && search(a)).slice(0, 7);

  const topStories = [...articles].filter(a => a.score >= 7).sort((a, b) => b.score - a.score).slice(0, 8);
  const dax = tickers.find(t => t.label === 'DAX' || t.symbol === '^GDAXI');

  const goTo = (main: MainTab, bottom: BottomTab) => {
    setMainTab(main);
    setBottomTab(bottom);
    if (bottom !== 'search') { setShowSearch(false); setSearchQuery(''); }
  };

  return (
    <div
      className="min-h-screen bg-[#0f0f0f] text-[#e8e8e8]"
      style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif' }}
    >
      <Header dax={dax} articleCount={articles.length} settings={settings} />

      {/* Tab nav */}
      <nav className="flex border-b border-[#1e1e1e] px-4 sticky top-0 bg-[#0f0f0f] z-10 overflow-x-auto no-scrollbar">
        {(Object.keys(TAB_LABELS) as MainTab[]).map(t => (
          <button
            key={t}
            onClick={() => goTo(t, t === 'settings' ? 'settings' : t === 'stocks' ? 'stocks' : t === 'bookmarks' ? 'bookmarks' : 'home')}
            className={`py-3 px-1 mr-5 text-[13px] font-medium transition-colors border-b-2 flex-shrink-0 ${
              mainTab === t ? 'text-[#e8e8e8] border-white' : 'text-[#555] border-transparent'
            }`}
          >
            {TAB_LABELS[t]}
          </button>
        ))}
      </nav>

      {/* Search bar */}
      {showSearch && mainTab === 'feed' && (
        <div className="px-4 py-2 bg-[#0f0f0f] border-b border-[#1e1e1e]">
          <input
            autoFocus
            type="search"
            placeholder="Artikel durchsuchen…"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full bg-[#161616] border border-[#2a2a2a] rounded-lg px-3 py-2 text-[14px] text-[#e8e8e8] placeholder:text-[#444] focus:outline-none"
          />
        </div>
      )}

      <main className="pb-24">
        {mainTab === 'settings' ? (
          <SettingsPanel settings={settings} onChange={handleSettingsChange} />
        ) : mainTab === 'bookmarks' ? (
          <BookmarksTab />
        ) : mainTab === 'stocks' ? (
          <StocksTab />
        ) : mainTab === 'top' ? (
          <TopStories articles={topStories} saved={saved} onSave={handleSave} />
        ) : (
          /* Feed */
          <div style={{ padding: '8px 12px 0' }}>
            {tickers.length > 0 && <TickerBar tickers={tickers} />}
            <PodcastPlayer compact={true} />

            {loading ? (
              <div style={{ background: '#161616', border: '0.5px solid #222', borderRadius: 14, overflow: 'hidden', marginBottom: 8 }}>
                {Array.from({ length: 5 }).map((_, i) => <SkeletonCard key={i} />)}
              </div>
            ) : (
              <>
                <FeedSection
                  title="Top Meldungen"
                  iconName="star"
                  iconBg="#1e1a2e"
                  iconColor="#a89de0"
                  articles={topArticles}
                />
                <FeedSection
                  title="Wirtschaft"
                  iconName="chart-bar"
                  iconBg="#1a2a1e"
                  iconColor="#22c47a"
                  articles={wirtschaftArticles}
                />
                <FeedSection
                  title="Technologie & KI"
                  iconName="cpu"
                  iconBg="#1e2530"
                  iconColor="#5ba8e0"
                  articles={techArticles}
                />
                <FeedSection
                  title="Politik"
                  iconName="building"
                  iconBg="#1e1e2e"
                  iconColor="#7b7fe0"
                  articles={politikArticles}
                />
                <FeedSection
                  title="Sport"
                  iconName="trophy"
                  iconBg="#251e2a"
                  iconColor="#b87bd4"
                  articles={sportArticles}
                />
              </>
            )}
          </div>
        )}
      </main>

      {/* Bottom nav */}
      <nav className="fixed bottom-0 left-0 right-0 bg-[#0a0a0a] border-t border-[#1a1a1a] flex justify-around items-center z-20 safe-bottom">
        <button onClick={() => goTo('feed', 'home')} className={`p-3 transition-opacity ${bottomTab === 'home' ? 'opacity-100' : 'opacity-25'}`} aria-label="Home">
          <Home size={22} strokeWidth={1.8} />
        </button>
        <button onClick={() => goTo('stocks', 'stocks')} className={`p-3 transition-opacity ${bottomTab === 'stocks' ? 'opacity-100' : 'opacity-25'}`} aria-label="Aktien">
          <TrendingUp size={22} strokeWidth={1.8} />
        </button>
        <button
          onClick={() => { const next = !showSearch; setShowSearch(next); if (next) goTo('feed', 'search'); else setBottomTab('home'); if (!next) setSearchQuery(''); }}
          className={`p-3 transition-opacity ${bottomTab === 'search' ? 'opacity-100' : 'opacity-25'}`}
          aria-label="Suche"
        >
          <Search size={22} strokeWidth={1.8} />
        </button>
        <button onClick={() => goTo('bookmarks', 'bookmarks')} className={`p-3 transition-opacity ${bottomTab === 'bookmarks' ? 'opacity-100' : 'opacity-25'}`} aria-label="Gespeichert">
          <Bookmark size={22} strokeWidth={1.8} />
        </button>
        <button onClick={() => goTo('settings', 'settings')} className={`p-3 transition-opacity ${bottomTab === 'settings' ? 'opacity-100' : 'opacity-25'}`} aria-label="Einstellungen">
          <SettingsIcon size={22} strokeWidth={1.8} />
        </button>
      </nav>
    </div>
  );
}
