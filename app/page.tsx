'use client';

import { useEffect, useRef, useState } from 'react';
import { BottomNav, Tab } from '@/components/BottomNav';
import { FeedTab } from '@/components/FeedTab';
import { NewsTab } from '@/components/NewsTab';
import { BriefingTab } from '@/components/BriefingTab';
import { MaerkteTab } from '@/components/MaerkteTab';
import SettingsPanel from '@/components/Settings';
import { ArticleReader } from '@/components/ArticleReader';
import { BookmarksTab } from '@/components/BookmarksTab';
import { PushManager } from '@/components/PushManager';
import { getBookmarks } from '@/lib/bookmarks';
import { getSettings, saveSettings, DEFAULT_SETTINGS } from '@/lib/profile';
import type { Article, TickerData, Settings } from '@/lib/types';

const PULL_THRESHOLD = 70;
const STALE_MS = 5 * 60 * 1000; // don't auto-reload the feed more often than this

export default function App() {
  const [activeTab, setActiveTab]     = useState<Tab>('feed');
  const [articles, setArticles]       = useState<Article[]>([]);
  const [tickers, setTickers]         = useState<TickerData[]>([]);
  const [loading, setLoading]         = useState(true);
  const [settings, setSettings]       = useState<Settings>(DEFAULT_SETTINGS);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastLoaded, setLastLoaded]   = useState<Date | null>(null);
  const [pullDistance, setPullDistance] = useState(0);
  const [selectedArticle, setSelectedArticle] = useState<Article | null>(null);
  const [showBookmarks, setShowBookmarks] = useState(false);
  const [bookmarkCount, setBookmarkCount] = useState(0);
  const touchStartY = useRef<number | null>(null);
  const scrollRef   = useRef<HTMLDivElement>(null);
  const didMountRef = useRef(false);
  const deepLinkHandledRef = useRef(false);

  // `fresh` busts the API route's 90s ISR cache (via ?fresh=true) so manual
  // refreshes always re-run the full pipeline instead of getting a cached hit.
  async function fetchFeeds(fresh = false) {
    try {
      const [feedRes, tickerRes] = await Promise.allSettled([
        fetch(`/api/feeds${fresh ? '?fresh=true' : ''}`, { cache: 'no-store' }).then(r => r.json()),
        fetch('/api/tickers').then(r => r.json()),
      ]);
      if (feedRes.status === 'fulfilled') setArticles(feedRes.value.articles ?? []);
      if (tickerRes.status === 'fulfilled') setTickers(tickerRes.value.tickers ?? []);
      setLastLoaded(new Date());
    } finally {
      setLoading(false);
    }
  }

  // Reload the feed, but skip the network round-trip if we already refreshed
  // recently — used for the "reload on tab switch" behavior so flipping
  // between tabs doesn't refetch every single time.
  async function refreshFeeds(force = false) {
    if (isRefreshing) return;
    if (!force && lastLoaded && Date.now() - lastLoaded.getTime() < STALE_MS) return;
    setIsRefreshing(true);
    try {
      await fetchFeeds(force);
    } finally {
      setIsRefreshing(false);
    }
  }

  useEffect(() => {
    setSettings(getSettings());
    setBookmarkCount(getBookmarks().length);
    fetchFeeds();
  }, []);

  // Reload the feed whenever the user switches back to it, if it's gone stale.
  useEffect(() => {
    if (!didMountRef.current) { didMountRef.current = true; return; }
    if (activeTab === 'feed') refreshFeeds();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab]);

  const handleSettingsChange = (s: Settings) => { setSettings(s); saveSettings(s); };

  function handleArticleClick(article: Article) {
    setSelectedArticle(article);
  }

  function openArticleById(id: string) {
    const article = articles.find(a => a.id === id);
    if (article) setSelectedArticle(article);
  }

  // Deep link from a push notification: ?article=<id> on initial load, or a
  // NAVIGATE postMessage from the service worker if the app is already open.
  useEffect(() => {
    if (deepLinkHandledRef.current || articles.length === 0) return;
    const id = new URLSearchParams(window.location.search).get('article');
    if (id) {
      openArticleById(id);
      deepLinkHandledRef.current = true;
      window.history.replaceState({}, '', window.location.pathname);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [articles]);

  useEffect(() => {
    if (!('serviceWorker' in navigator)) return;
    function onMessage(event: MessageEvent) {
      if (event.data?.type !== 'NAVIGATE') return;
      const id = new URL(event.data.url, window.location.origin).searchParams.get('article');
      if (id) openArticleById(id);
    }
    navigator.serviceWorker.addEventListener('message', onMessage);
    return () => navigator.serviceWorker.removeEventListener('message', onMessage);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [articles]);

  function openBookmarks() {
    setBookmarkCount(getBookmarks().length);
    setShowBookmarks(true);
  }

  // ── Pull-to-refresh handlers ──────────────────────────────────────────────

  function handleTouchStart(e: React.TouchEvent) {
    if (activeTab !== 'feed') return;
    if ((scrollRef.current?.scrollTop ?? 0) === 0) {
      touchStartY.current = e.touches[0].clientY;
    }
  }

  function handleTouchMove(e: React.TouchEvent) {
    if (activeTab !== 'feed' || touchStartY.current === null || isRefreshing) return;
    const delta = e.touches[0].clientY - touchStartY.current;
    if (delta > 0 && (scrollRef.current?.scrollTop ?? 0) === 0) {
      setPullDistance(Math.min(delta * 0.5, PULL_THRESHOLD + 20));
    }
  }

  async function handleTouchEnd() {
    if (activeTab !== 'feed') return;
    if (pullDistance >= PULL_THRESHOLD && !isRefreshing) {
      setIsRefreshing(true);
      setPullDistance(0);
      touchStartY.current = null;
      try {
        await Promise.all([
          fetchFeeds(true),
          new Promise<void>(r => setTimeout(r, 800)),
        ]);
      } finally {
        setIsRefreshing(false);
      }
    } else {
      setPullDistance(0);
      touchStartY.current = null;
    }
  }

  const showPullIndicator = (pullDistance > 0 || isRefreshing) && activeTab === 'feed';
  const pullIndicator = showPullIndicator ? (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      height: isRefreshing ? 44 : pullDistance,
      overflow: 'hidden',
      transition: isRefreshing ? 'none' : 'height 0.1s',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, opacity: isRefreshing ? 1 : Math.min(pullDistance / PULL_THRESHOLD, 1) }}>
        <span className="spinner" style={{ animationPlayState: isRefreshing ? 'running' : 'paused' }} />
        <span style={{ fontSize: 11, color: 'var(--t3)' }}>
          {isRefreshing ? 'Wird aktualisiert…' : pullDistance >= PULL_THRESHOLD ? 'Loslassen zum Aktualisieren' : 'Zum Aktualisieren ziehen'}
        </span>
      </div>
    </div>
  ) : null;

  return (
    <div style={{ background: 'var(--bg0)', minHeight: '100vh', maxWidth: 480, margin: '0 auto', position: 'relative' }}>

      {/* Status bar */}
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        padding: '14px 20px 0',
        position: 'sticky', top: 0, zIndex: 50,
        background: 'rgba(var(--bg0-rgb), 0.92)',
        backdropFilter: 'blur(24px)', WebkitBackdropFilter: 'blur(24px)',
      } as React.CSSProperties}>
        <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--t5)' }}>
          Briefly
        </span>
        <div style={{ width: 1 }} />
      </div>

      {/* Scroll container */}
      <div
        ref={scrollRef}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        style={{ paddingBottom: 96 }}
      >
        {activeTab === 'feed' && (
          <FeedTab
            articles={articles}
            tickers={tickers}
            loading={loading}
            username={settings.username.split(' ')[0] || 'Leonard'}
            onArticleClick={handleArticleClick}
            onNavigateToBriefing={() => setActiveTab('briefing')}
            pullIndicator={pullIndicator}
            lastLoaded={lastLoaded}
            isRefreshing={isRefreshing}
            onRefresh={() => refreshFeeds(true)}
          />
        )}
        {activeTab === 'news'     && <NewsTab articles={articles} onArticleClick={handleArticleClick} />}
        {activeTab === 'briefing' && <BriefingTab />}
        {activeTab === 'maerkte'  && <MaerkteTab onArticleClick={handleArticleClick} />}
        {activeTab === 'settings' && (
          <SettingsPanel
            settings={settings}
            onChange={handleSettingsChange}
            onOpenBookmarks={openBookmarks}
            bookmarkCount={bookmarkCount}
          />
        )}
      </div>

      {/* Bottom navigation */}
      <BottomNav activeTab={activeTab} onTabChange={setActiveTab} />

      {/* Article reader overlay */}
      {selectedArticle && (
        <ArticleReader
          article={selectedArticle}
          onClose={() => setSelectedArticle(null)}
          relatedArticles={articles.filter(a => a.topic === selectedArticle.topic && a.id !== selectedArticle.id).slice(0, 3)}
        />
      )}

      {/* Bookmarks overlay */}
      {showBookmarks && (
        <BookmarksTab onClose={() => setShowBookmarks(false)} onArticleClick={handleArticleClick} />
      )}

      <PushManager />
    </div>
  );
}
