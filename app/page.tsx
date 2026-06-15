'use client';

import { useEffect, useState } from 'react';
import { Bookmark, Home, Mic, Settings as SettingsIcon, TrendingUp } from 'lucide-react';
import Header from '@/components/Header';
import { BriefingTab } from '@/components/BriefingTab';
import { PodcastBanner } from '@/components/PodcastBanner';
import TickerBar from '@/components/TickerBar';
import TopStories from '@/components/TopStories';
import StocksTab from '@/components/StocksTab';
import { BookmarksTab } from '@/components/BookmarksTab';
import { FeedSection } from '@/components/FeedSection'
import TopStoriesCarousel from '@/components/TopStoriesCarousel';
import SettingsPanel from '@/components/Settings';
import {
  getSettings,
  saveSettings,
  getSavedIds,
  toggleSaved,
  DEFAULT_SETTINGS,
} from '@/lib/profile';
import type { Article, TickerData, Settings } from '@/lib/types';

type MainTab = 'feed' | 'top' | 'stocks' | 'bookmarks' | 'settings' | 'briefing';
type BottomTab = 'home' | 'stocks' | 'briefing' | 'bookmarks' | 'settings';

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
  briefing: 'Briefing',
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

  const topArticles           = articles.filter(a => a.score >= 8 && search(a)).sort((a, b) => b.score - a.score).slice(0, 8);
  const wirtschaftArticles    = articles.filter(a => ['Wirtschaft & Finanzen', 'Aktienmärkte'].includes(a.topic) && search(a)).sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime()).slice(0, 20);
  const politikArticles       = articles.filter(a => ['Politik DE/EU', 'Geopolitik'].includes(a.topic) && search(a)).sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime()).slice(0, 20);
  const sportArticles         = articles.filter(a => a.topic === 'Sport' && search(a)).sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime()).slice(0, 20);
  const techArticles          = articles.filter(a => a.topic === 'Technologie & KI' && search(a)).sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime()).slice(0, 20);
  const topStoriesTabArticles = [...articles].filter(a => a.score >= 7).sort((a, b) => b.score - a.score).slice(0, 30);
  const dax = tickers.find(t => t.label === 'DAX' || t.symbol === '^GDAXI');

  const goTo = (main: MainTab, bottom: BottomTab) => {
    setMainTab(main);
    setBottomTab(bottom);
    setShowSearch(false);
    setSearchQuery('');
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
            onClick={() => goTo(t, t === 'settings' ? 'settings' : t === 'stocks' ? 'stocks' : t === 'bookmarks' ? 'bookmarks' : t === 'briefing' ? 'briefing' : 'home')}
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
          <TopStories articles={topStoriesTabArticles} saved={saved} onSave={handleSave} />
        ) : mainTab === 'briefing' ? (
          <BriefingTab />
        ) : (
          /* Feed */
          <div style={{ padding: '8px 12px 0' }}>
            {tickers.length > 0 && <TickerBar tickers={tickers} />}
            <PodcastBanner />

            {loading ? (
              <div style={{ background: '#161616', border: '0.5px solid #222', borderRadius: 14, overflow: 'hidden', marginBottom: 8 }}>
                {Array.from({ length: 5 }).map((_, i) => <SkeletonCard key={i} />)}
              </div>
            ) : (
              <>
                {/* Section Header */}
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'baseline',
                  padding: '12px 16px 8px'
                }}>
                  <span style={{
                    fontSize: 11,
                    fontWeight: 500,
                    letterSpacing: '0.08em',
                    textTransform: 'uppercase',
                    color: '#3a3a3a'
                  }}>
                    Top Meldungen
                  </span>
                  <span style={{ fontSize: 11, color: '#2e2e2e' }}>
                    {topArticles.length} Artikel
                  </span>
                </div>

                {/* Karussell */}
                <TopStoriesCarousel articles={topArticles} />
                <FeedSection
                  title="Wirtschaft"
                  iconName="chart-bar"
                  iconBg="#1a2a1e"
                  iconColor="#22c47a"
                  articles={wirtschaftArticles}
                  initialCount={7}
                />
                <FeedSection
                  title="Politik"
                  iconName="building"
                  iconBg="#1e1e2e"
                  iconColor="#7b7fe0"
                  articles={politikArticles}
                  initialCount={7}
                />
                {techArticles.length > 0 && (
                  <FeedSection
                    title="Technologie & KI"
                    iconName="cpu"
                    iconBg="#1e2530"
                    iconColor="#5ba8e0"
                    articles={techArticles}
                    initialCount={7}
                  />
                )}
                {sportArticles.length > 0 && (
                  <FeedSection
                    title="Sport"
                    iconName="trophy"
                    iconBg="#251e2a"
                    iconColor="#b87bd4"
                    articles={sportArticles}
                    initialCount={7}
                  />
                )}
              </>
            )}
          </div>
        )}
      </main>

      {/* Bottom nav */}
      <nav className="fixed bottom-0 left-0 right-0 bg-[#0a0a0a] border-t border-[#1a1a1a] flex justify-around items-center z-20 safe-bottom">
        <button onClick={() => goTo('feed', 'home')} className={`p-3 transition-opacity ${bottomTab === 'home' ? 'opacity-100' : 'opacity-25'}`} aria-label="Feed">
          <Home size={22} strokeWidth={1.8} />
        </button>
        <button onClick={() => goTo('bookmarks', 'bookmarks')} className={`p-3 transition-opacity ${bottomTab === 'bookmarks' ? 'opacity-100' : 'opacity-25'}`} aria-label="Gespeichert">
          <Bookmark size={22} strokeWidth={1.8} />
        </button>
        <button onClick={() => goTo('briefing', 'briefing')} className={`p-3 transition-opacity ${bottomTab === 'briefing' ? 'opacity-100' : 'opacity-25'}`} aria-label="Briefing">
          <Mic size={22} strokeWidth={1.8} />
        </button>
        <button onClick={() => goTo('stocks', 'stocks')} className={`p-3 transition-opacity ${bottomTab === 'stocks' ? 'opacity-100' : 'opacity-25'}`} aria-label="Aktien">
          <TrendingUp size={22} strokeWidth={1.8} />
        </button>
        <button onClick={() => goTo('settings', 'settings')} className={`p-3 transition-opacity ${bottomTab === 'settings' ? 'opacity-100' : 'opacity-25'}`} aria-label="Einstellungen">
          <SettingsIcon size={22} strokeWidth={1.8} />
        </button>
      </nav>
    </div>
  );
}
