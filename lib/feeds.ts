import Parser from 'rss-parser';
import type { Article } from './types';

type MediaContent = { $?: { url?: string; medium?: string }; url?: string };
type Enclosure = { url?: string; type?: string };

type FeedItem = {
  title?: string;
  link?: string;
  guid?: string;
  pubDate?: string;
  isoDate?: string;
  contentSnippet?: string;
  content?: string;
  mediaContent?: MediaContent | MediaContent[];
  mediaThumbnail?: MediaContent;
  enclosure?: Enclosure;
};

const parser = new Parser<Record<string, unknown>, FeedItem>({
  customFields: {
    item: [
      ['media:content', 'mediaContent', { keepArray: false }],
      ['media:thumbnail', 'mediaThumbnail', { keepArray: false }],
    ],
  },
  timeout: 12000,
  headers: {
    'User-Agent': 'Mozilla/5.0 (compatible; BrieflyBot/1.0)',
    Accept: 'application/rss+xml, application/xml, text/xml, */*',
  },
});

function extractImageUrl(item: FeedItem): string | null {
  const mc = Array.isArray(item.mediaContent) ? item.mediaContent[0] : item.mediaContent;
  if (mc?.$?.url) return mc.$.url;
  if (mc?.url) return mc.url;
  if (item.enclosure?.url) {
    const t = item.enclosure.type ?? '';
    if (!t || t.startsWith('image/')) return item.enclosure.url;
  }
  const mt = item.mediaThumbnail;
  if (mt?.$?.url) return mt.$.url;
  if (mt?.url) return mt.url;
  return null;
}

export const FEEDS: Array<{ url: string; source: string }> = [
  { url: 'https://www.spiegel.de/schlagzeilen/index.rss', source: 'Spiegel' },
  { url: 'https://www.faz.net/rss/aktuell', source: 'FAZ' },
  { url: 'https://newsfeed.zeit.de/all', source: 'Zeit' },
  { url: 'https://www.handelsblatt.com/contentexport/feed/schlagzeilen', source: 'Handelsblatt' },
  { url: 'https://feeds.reuters.com/reuters/topNews', source: 'Reuters' },
  { url: 'https://www.economist.com/rss/the_world_this_week_rss.xml', source: 'Economist' },
  { url: 'https://www.finanzen.net/rss/nachrichten', source: 'Finanzen.net' },
  { url: 'https://www.kicker.de/news/rss/navigationsbereich/aktuell.rss', source: 'Kicker' },
  { url: 'https://www.sport1.de/news.rss', source: 'Sport1' },
  { url: 'https://techcrunch.com/feed', source: 'TechCrunch' },
  { url: 'https://www.theverge.com/rss/index.xml', source: 'The Verge' },
  { url: 'https://www.heise.de/rss/heise-atom.xml', source: 'Heise' },
  {
    url: 'https://news.google.com/rss/search?q=DAX+Aktienmarkt&hl=de&gl=DE&ceid=DE:de',
    source: 'Google News',
  },
  {
    url: 'https://news.google.com/rss/search?q=Politik+Deutschland+EU&hl=de&gl=DE&ceid=DE:de',
    source: 'Google News',
  },
  {
    url: 'https://news.google.com/rss/search?q=Geopolitik+Welt&hl=de&gl=DE&ceid=DE:de',
    source: 'Google News',
  },
  {
    url: 'https://news.google.com/rss/search?q=Technologie+KI+Artificial+Intelligence&hl=de&gl=DE&ceid=DE:de',
    source: 'Google News',
  },
  {
    url: 'https://news.google.com/rss/search?q=Fussball+Sport+Bundesliga&hl=de&gl=DE&ceid=DE:de',
    source: 'Google News',
  },
  {
    url: 'https://news.google.com/rss/search?q=Wirtschaft+Finanzen+Deutschland&hl=de&gl=DE&ceid=DE:de',
    source: 'Google News',
  },
  {
    url: 'https://news.google.com/rss/search?q=DAX+Aktien+Börse&hl=de&gl=DE&ceid=DE:de',
    source: 'Google News',
  },
  {
    url: 'https://news.google.com/rss/search?q=EZB+Fed+Zinsen&hl=de&gl=DE&ceid=DE:de',
    source: 'Google News',
  },
  {
    url: 'https://news.google.com/rss/search?q=EU+Europa+Politik&hl=de&gl=DE&ceid=DE:de',
    source: 'Google News',
  },
  {
    url: 'https://news.google.com/rss/search?q=Apple+Google+Microsoft+Tech&hl=de&gl=DE&ceid=DE:de',
    source: 'Google News',
  },
  {
    url: 'https://news.google.com/rss/search?q=Champions+League+Sport&hl=de&gl=DE&ceid=DE:de',
    source: 'Google News',
  },
  {
    url: 'https://news.google.com/rss/search?q=Formel+1+Tennis+NBA&hl=de&gl=DE&ceid=DE:de',
    source: 'Google News',
  },
];

function hashStr(s: string): string {
  let h = 5381;
  for (let i = 0; i < s.length; i++) {
    h = ((h << 5) + h) ^ s.charCodeAt(i);
    h = h >>> 0;
  }
  return h.toString(36);
}

function levenshtein(a: string, b: string): number {
  const m = a.length,
    n = b.length;
  if (!m) return n;
  if (!n) return m;
  const dp: number[] = Array.from({ length: n + 1 }, (_, i) => i);
  for (let i = 1; i <= m; i++) {
    let prev = dp[0];
    dp[0] = i;
    for (let j = 1; j <= n; j++) {
      const tmp = dp[j];
      dp[j] = a[i - 1] === b[j - 1] ? prev : 1 + Math.min(prev, dp[j], dp[j - 1]);
      prev = tmp;
    }
  }
  return dp[n];
}

export function removeDuplicates(articles: Article[]): Article[] {
  const unique: Article[] = [];
  for (const a of articles) {
    const ta = a.title.toLowerCase().trim().slice(0, 100);
    const dup = unique.some((u) => {
      const tb = u.title.toLowerCase().trim().slice(0, 100);
      const maxLen = Math.max(ta.length, tb.length);
      return maxLen > 0 && 1 - levenshtein(ta, tb) / maxLen > 0.65;
    });
    if (!dup) unique.push(a);
  }
  return unique;
}

export function filterByAge(articles: Article[], maxAgeHours = 36): Article[] {
  const cutoff = new Date(Date.now() - maxAgeHours * 60 * 60 * 1000);
  return articles.filter((a) => new Date(a.publishedAt) >= cutoff);
}

export async function fetchFeed(feed: { url: string; source: string }): Promise<Article[]> {
  try {
    const data = await parser.parseURL(feed.url);
    return (data.items || [])
      .slice(0, 25)
      .map((item): Article => {
        let title = (item.title || '').replace(/<[^>]+>/g, '').trim();
        let source = feed.source;
        if (feed.source === 'Google News') {
          const idx = title.lastIndexOf(' - ');
          if (idx > 0) {
            source = title.slice(idx + 3).trim();
            title = title.slice(0, idx).trim();
          }
        }
        return {
          id: hashStr(title + (item.link || item.guid || '')),
          title,
          url: item.link || item.guid || '',
          source,
          publishedAt: item.isoDate || item.pubDate || new Date().toISOString(),
          topic: 'Allgemein',
          score: 0,
          content: (item.contentSnippet || '').slice(0, 300),
          imageUrl: extractImageUrl(item),
        };
      })
      .filter((a) => a.title.length > 5 && a.url.length > 5);
  } catch {
    return [];
  }
}
