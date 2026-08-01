import Parser from 'rss-parser';
import type { Article } from './types';

type MediaContent = { $?: { url?: string; medium?: string }; url?: string };
type Enclosure = { url?: string; type?: string };
type ItunesImage = { $?: { href?: string }; href?: string };

type FeedItem = {
  title?: string;
  link?: string;
  guid?: string;
  pubDate?: string;
  isoDate?: string;
  contentSnippet?: string;
  content?: string;
  // rss-parser's built-in RSS handling always overwrites `content` with the
  // plain <description> text when a <description> tag is present (see
  // parseItemRss in rss-parser/lib/parser.js), even when <content:encoded>
  // is also present — which is where most feeds actually put their inline
  // image. This custom field captures the real content:encoded HTML under
  // its own key so it survives that overwrite.
  contentEncoded?: string;
  rawDescription?: string;
  itunesImage?: ItunesImage;
  mediaContent?: MediaContent | MediaContent[];
  mediaThumbnail?: MediaContent;
  enclosure?: Enclosure;
};

const parser = new Parser<Record<string, unknown>, FeedItem>({
  customFields: {
    item: [
      ['media:content', 'mediaContent', { keepArray: false }],
      ['media:thumbnail', 'mediaThumbnail', { keepArray: false }],
      ['itunes:image', 'itunesImage', { keepArray: false }],
      ['content:encoded', 'contentEncoded'],
      ['description', 'rawDescription'],
    ],
  },
  timeout: 5000,
  headers: {
    'User-Agent': 'Mozilla/5.0 (compatible; BrieflyBot/1.0)',
    Accept: 'application/rss+xml, application/xml, text/xml, */*',
  },
});

function firstImageFromHtml(html: string | undefined): string | null {
  if (!html) return null;
  const match = html.match(/<img[^>]+src=["']([^"']+)["']/i);
  const url = match?.[1];
  if (url && /^https?:\/\//i.test(url) && !/pixel|track|spacer|1x1|blank\.gif/i.test(url)) return url;
  return null;
}

// Priority order: enclosure > media:content > media:thumbnail > inline <img>
// in content:encoded/description/content (RSS and Atom bodies alike). No
// og:image fallback — that would require
// fetching every article's HTML page during feed aggregation (hundreds of
// extra requests per load), and no such batch mechanism exists today; the
// only page-fetching route (`/api/article`) is a per-click, on-demand
// full-text reader, not part of the aggregation pipeline.
function extractImageUrl(item: FeedItem): string | null {
  // 1. enclosure
  if (item.enclosure?.url) {
    const t = item.enclosure.type ?? '';
    if (!t || t.startsWith('image/') || /\.(jpg|jpeg|png|webp|gif)(\?|$)/i.test(item.enclosure.url)) {
      return item.enclosure.url;
    }
  }

  // 2. media:content
  const mc = Array.isArray(item.mediaContent) ? item.mediaContent[0] : item.mediaContent;
  if (mc?.$?.url) return mc.$.url;
  if (mc?.url) return mc.url;

  // 3. media:thumbnail
  const mt = item.mediaThumbnail;
  if (mt?.$?.url) return mt.$.url;
  if (mt?.url) return mt.url;

  // 4. first <img> inside content:encoded (the real field — see FeedItem.contentEncoded)
  const fromContent = firstImageFromHtml(item.contentEncoded);
  if (fromContent) return fromContent;

  // 5. first <img> inside the raw <description>
  const fromDescription = firstImageFromHtml(item.rawDescription);
  if (fromDescription) return fromDescription;

  // 6. first <img> inside `content` — Atom feeds (e.g. The Verge, Heise) put
  // their body HTML directly in <content>, not <content:encoded>/<description>,
  // so rss-parser's plain `content` field is the only place the image shows
  // up. RSS feeds with a <description> tag overwrite `content` with plain
  // text (see the comment on FeedItem.contentEncoded above), so this only
  // ever adds coverage — it can't shadow field 4 or 5.
  const fromAtomContent = firstImageFromHtml(item.content);
  if (fromAtomContent) return fromAtomContent;

  // 7. itunes:image
  if (item.itunesImage?.$?.href) return item.itunesImage.$.href;
  if (item.itunesImage?.href) return item.itunesImage.href;

  return null;
}

export const FEEDS: Array<{ url: string; source: string; topic?: string; translate?: boolean }> = [
  { url: 'https://www.spiegel.de/schlagzeilen/index.rss', source: 'Spiegel' },
  { url: 'https://www.faz.net/rss/aktuell', source: 'FAZ' },
  { url: 'https://newsfeed.zeit.de/all', source: 'Zeit' },
  { url: 'https://www.handelsblatt.com/contentexport/feed/schlagzeilen', source: 'Handelsblatt' },
  { url: 'https://feeds.reuters.com/reuters/topNews', source: 'Reuters' },
  { url: 'https://www.economist.com/rss/the_world_this_week_rss.xml', source: 'Economist' },
  { url: 'https://www.finanzen.net/rss/nachrichten', source: 'Finanzen.net', topic: 'Aktienmärkte' },
  { url: 'https://www.kicker.de/news/rss/navigationsbereich/aktuell.rss', source: 'Kicker' },
  { url: 'https://www.sport1.de/news.rss', source: 'Sport1' },
  { url: 'https://techcrunch.com/feed', source: 'TechCrunch' },
  { url: 'https://www.theverge.com/rss/index.xml', source: 'The Verge' },
  { url: 'https://www.heise.de/rss/heise-atom.xml', source: 'Heise', topic: 'Technologie & KI' },

  // Wirtschaft & Finanzen
  { url: 'https://www.faz.net/rss/aktuell/wirtschaft/', source: 'FAZ Wirtschaft', topic: 'Wirtschaft & Finanzen' },
  { url: 'https://www.wiwo.de/rss-feeds/', source: 'WirtschaftsWoche', topic: 'Wirtschaft & Finanzen' },

  // Politik
  { url: 'https://www.spiegel.de/politik/index.rss', source: 'Spiegel Politik', topic: 'Politik DE/EU' },
  { url: 'https://www.faz.net/rss/aktuell/politik/', source: 'FAZ Politik', topic: 'Politik DE/EU' },
  { url: 'https://www.tagesschau.de/infoservices/alle-meldungen-100~rss2.xml', source: 'Tagesschau', topic: 'Politik DE/EU' },

  // Geopolitik
  { url: 'https://www.spiegel.de/ausland/index.rss', source: 'Spiegel Ausland', topic: 'Geopolitik' },
  { url: 'https://www.faz.net/rss/aktuell/politik/ausland/', source: 'FAZ Ausland', topic: 'Geopolitik' },

  // Technologie & KI
  { url: 'https://rss.golem.de/rss.php', source: 'Golem', topic: 'Technologie & KI' },

  // Aktienmärkte
  { url: 'https://www.wallstreet-online.de/rss/nachrichten.xml', source: 'Wallstreet Online', topic: 'Aktienmärkte' },

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

  // Gründer & Startups
  { url: 'https://www.gruenderszene.de/feed', source: 'Gründerszene', topic: 'Gründer & Startups' },
  { url: 'https://www.eu-startups.com/feed/', source: 'EU-Startups', topic: 'Gründer & Startups', translate: true },
  { url: 'https://www.deutsche-startups.de/feed/', source: 'Deutsche Startups', topic: 'Gründer & Startups' },
  { url: 'https://startupvalley.news/de/feed/', source: 'Startup Valley', topic: 'Gründer & Startups' },
  { url: 'https://financefwd.com/feed/', source: 'Finance Forward', topic: 'Gründer & Startups' },

  // Münster & Region, Badbergen & Osnabrücker Land — kein Regionalblatt oben liefert
  // ein funktionierendes öffentliches RSS mehr (WN/MS-Magazin/Münstersche Zeitung/NOZ/
  // Lokalkompass wurden geprüft: 404, tote Verbindung oder Weiterleitung auf fremde
  // Domains). Google News Suche ist der einzige zuverlässige Kanal für diese Themen.
  {
    url: 'https://news.google.com/rss/search?q=M%C3%BCnster+Lokales&hl=de&gl=DE&ceid=DE:de',
    source: 'Google News',
    topic: 'Münster & Region',
  },
  {
    url: 'https://news.google.com/rss/search?q=Osnabr%C3%BCck+Bersenbr%C3%BCck+Badbergen&hl=de&gl=DE&ceid=DE:de',
    source: 'Google News',
    topic: 'Badbergen & Osnabrücker Land',
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

const MAX_ARTICLES_PER_SOURCE = 25;
const FETCH_HARD_TIMEOUT_MS = 5500;

// rss-parser's own `timeout` option doesn't reliably abort connections that
// stall mid-handshake (observed against a few dead regional-newspaper hosts) —
// without this hard race, one stuck feed could hang the whole /api/feeds route.
function withHardTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) => setTimeout(() => reject(new Error('hard timeout')), ms)),
  ]);
}

export async function fetchFeed(feed: { url: string; source: string; topic?: string; translate?: boolean }): Promise<Article[]> {
  try {
    const data = await withHardTimeout(parser.parseURL(feed.url), FETCH_HARD_TIMEOUT_MS);
    return (data.items || [])
      .slice(0, MAX_ARTICLES_PER_SOURCE)
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
          topic: feed.topic ?? 'Allgemein',
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
