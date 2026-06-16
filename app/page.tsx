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
import { FeedSection } from '@/components/FeedSection';
import TopStoriesCarousel from '@/components/TopStoriesCarousel';
import { MarketBriefingCard } from '@/components/MarketBriefing';
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
    <div style={{ padding: '14px 15px', marginBottom: 8 }}>
      <div style={{ display: 'flex', gap: 12 }}>
        <div style={{ flex: 1 }}>
          <div style={{ height: 9, background: '#111', borderRadius: 4, width: '40%', marginBottom: 8 }} />
          <div style={{ height: 13, background: '#111', borderRadius: 4, width: '100%', marginBottom: 6 }} />
          <div style={{ height: 13, background: '#111', borderRadius: 4, width: '75%' }} />
        </div>
        <div style={{ width: 72, height: 72, borderRadius: 12, background: '#0e0e0e', flexShrink: 0 }} />
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

  const topArticles        = articles.filter(a => a.score >= 8 && search(a)).sort((a, b) => b.score - a.score).slice(0, 7);
  const wirtschaftArticles = articles.filter(a => ['Wirtschaft & Finanzen', 'Aktienmärkte'].includes(a.topic) && search(a)).sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime()).slice(0, 15);
  const politikArticles    = articles.filter(a => ['Politik DE/EU', 'Geopolitik'].includes(a.topic) && search(a)).sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime()).slice(0, 15);
  const NON_SPORT_KEYWORDS = ['Parlament', 'Wiederwahl', 'Klima', 'CO2', 'CO₂', 'Regierung', 'Bundestag', 'Bundesrat', 'Minister', 'Wahl', 'Koalition', 'Gesetz', 'Haushalt', 'Zinsen', 'Inflation', 'EZB', 'Fed'];
  const sportArticles      = articles.filter(a => a.topic === 'Sport' && search(a) && !NON_SPORT_KEYWORDS.some(kw => a.title.includes(kw))).sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime()).slice(0, 15);
  const techArticles       = articles.filter(a => a.topic === 'Technologie & KI' && search(a)).sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime()).slice(0, 15);
  const topStoriesTabArticles = [...articles].filter(a => a.score >= 7).sort((a, b) => b.score - a.score).slice(0, 30);
  const dax = tickers.find(t => t.label === 'DAX' || t.symbol === '^GDAXI');

  const goTo = (main: MainTab, bottom: BottomTab) => {
    setMainTab(main);
    setBottomTab(bottom);
    setShowSearch(false);
    setSearchQuery('');
  };

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-primary)', color: 'var(--text-primary)', fontFamily: "'Inter', -apple-system, sans-serif" }}>
      <Header dax={dax} articleCount={articles.length} settings={settings} />

      {/* Tab nav */}
      <nav
        style={{
          display: 'flex',
          padding: '0 22px',
          borderBottom: '0.5px solid #0e0e0e',
          overflowX: 'auto',
          scrollbarWidth: 'none',
          position: 'sticky',
          top: 0,
          background: 'var(--bg-primary)',
          zIndex: 10,
        }}
        className="no-scrollbar"
      >
        {(Object.keys(TAB_LABELS) as MainTab[]).map(t => (
          <div
            key={t}
            onClick={() => goTo(t, t === 'settings' ? 'settings' : t === 'stocks' ? 'stocks' : t === 'bookmarks' ? 'bookmarks' : t === 'briefing' ? 'briefing' : 'home')}
            style={{
              fontSize: 12,
              fontWeight: mainTab === t ? 400 : 300,
              color: mainTab === t ? '#ede9e0' : '#2a2a2a',
              padding: '14px 0',
              marginRight: 24,
              borderBottom: mainTab === t ? '1px solid #ede9e0' : '1px solid transparent',
              whiteSpace: 'nowrap',
              cursor: 'pointer',
              flexShrink: 0,
            }}
          >
            {TAB_LABELS[t]}
          </div>
        ))}
      </nav>

      {/* Search bar */}
      {showSearch && mainTab === 'feed' && (
        <div style={{ padding: '8px 18px', background: 'var(--bg-primary)', borderBottom: '0.5px solid #111' }}>
          <input
            autoFocus
            type="search"
            placeholder="Artikel durchsuchen…"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            style={{
              width: '100%',
              background: '#0e0e0e',
              border: '0.5px solid #1a1a1a',
              borderRadius: 10,
              padding: '8px 12px',
              fontSize: 13,
              color: 'var(--text-primary)',
              outline: 'none',
            }}
          />
        </div>
      )}

      <main style={{ paddingBottom: 80 }}>
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
          <div>
            {tickers.length > 0 && <TickerBar tickers={tickers} />}
            <PodcastBanner />

            {loading ? (
              <div style={{ padding: '20px 18px 0' }}>
                <div style={{ background: '#0e0e0e', border: '0.5px solid #141414', borderRadius: 18, overflow: 'hidden' }}>
                  {Array.from({ length: 5 }).map((_, i) => <SkeletonCard key={i} />)}
                </div>
              </div>
            ) : (
              <>
                <TopStoriesCarousel articles={topArticles} />
                <MarketBriefingCard />
                <FeedSection
                  title="Wirtschaft"
                  articles={wirtschaftArticles}
                  initialCount={7}
                />
                <FeedSection
                  title="Politik"
                  articles={politikArticles}
                  initialCount={7}
                />
                {techArticles.length > 0 && (
                  <FeedSection
                    title="Technologie & KI"
                    articles={techArticles}
                    initialCount={7}
                  />
                )}
                {sportArticles.length > 0 && (
                  <FeedSection
                    title="Sport"
                    articles={sportArticles}
                    initialCount={7}
                  />
                )}
                <div style={{ height: 20 }} />
              </>
            )}
          </div>
        )}
      </main>

      {/* Bottom nav */}
      <nav
        style={{
          position: 'fixed',
          bottom: 0,
          left: 0,
          right: 0,
          display: 'flex',
          justifyContent: 'space-around',
          padding: '12px 10px calc(6px + env(safe-area-inset-bottom, 0px))',
          borderTop: '0.5px solid #0e0e0e',
          background: 'var(--bg-primary)',
          zIndex: 20,
        }}
      >
        {[
          { Icon: Home, label: 'Feed', main: 'feed' as MainTab, bottom: 'home' as BottomTab },
          { Icon: Mic, label: 'Briefing', main: 'briefing' as MainTab, bottom: 'briefing' as BottomTab },
          { Icon: TrendingUp, label: 'Märkte', main: 'stocks' as MainTab, bottom: 'stocks' as BottomTab },
          { Icon: Bookmark, label: 'Gespeichert', main: 'bookmarks' as MainTab, bottom: 'bookmarks' as BottomTab },
          { Icon: SettingsIcon, label: 'Settings', main: 'settings' as MainTab, bottom: 'settings' as BottomTab },
        ].map(({ Icon, label, main, bottom }) => (
          <button
            key={main}
            onClick={() => goTo(main, bottom)}
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 3,
              color: bottomTab === bottom ? '#ede9e0' : '#1c1c1c',
              fontSize: 9,
              letterSpacing: '0.05em',
              textTransform: 'uppercase',
              cursor: 'pointer',
              background: 'none',
              border: 'none',
              padding: '4px 8px',
            }}
            aria-label={label}
          >
            <Icon size={18} strokeWidth={1.6} />
            <span>{label}</span>
          </button>
        ))}
      </nav>
    </div>
  );
}
