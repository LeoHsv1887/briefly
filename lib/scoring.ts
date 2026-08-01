import Anthropic from '@anthropic-ai/sdk';
import { TOPICS } from './types';
import type { Article } from './types';

type ScoreResult = { id: string; score: number; topic: string; title?: string };

const ENGLISH_SOURCES = new Set(['TechCrunch', 'The Verge', 'Reuters', 'Economist', 'Wired', 'EU-Startups']);

async function scoreBatch(articles: Article[]): Promise<ScoreResult[]> {
  if (!process.env.ANTHROPIC_API_KEY) {
    return articles.map((a) => ({ id: a.id, score: 5, topic: 'Allgemein' }));
  }

  const client = new Anthropic();
  const list = articles.map((a) => ({ id: a.id, title: a.title, source: a.source, needsTranslation: ENGLISH_SOURCES.has(a.source) }));

  try {
    const msg = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 1024,
      messages: [
        {
          role: 'user',
          content: `Du bist ein strenger Nachrichten-Kurator für einen anspruchsvollen Leser.

Bewerte jeden Artikel auf einer Skala 0–10 nach diesen Kriterien:

Score 8-10 NUR für:
- Entscheidungen von Zentralbanken, Regierungen oder DAX/S&P-Unternehmen mit Marktrelevanz
- Geopolitische Ereignisse mit direkter wirtschaftlicher oder sicherheitspolitischer Auswirkung
- Marktbewegungen über 2% oder Kurseinbrüche
- Wahlergebnisse, Rücktritt oder Ernennung wichtiger Persönlichkeiten
- Technologie-Durchbrüche mit breiter gesellschaftlicher Relevanz (kein Hype)
- Breaking News mit unmittelbarer Auswirkung auf Deutschland/EU

Score 6-7: Interessante aber nicht dringende News, relevante Hintergründe
Score 0-5: Routine-Meldungen, regionale Kleinnachrichten, Wiederholungen, Lifestyle, Werbung, Clickbait

Themen des Nutzers: Wirtschaft & Finanzen, Politik (DE/EU), Geopolitik, Aktienmärkte, Technologie & KI, Sport

Sei SEHR STRENG bei 8+. Maximal 20% der Artikel sollten Score 8+ erhalten.
Artikel die dasselbe Thema wie ein bereits bewerteter Artikel behandeln: maximal Score 5.

WICHTIG – topic-Zuweisung nach INHALT, nicht nach Quelle:
- Weise "Sport" NUR zu wenn der Artikel inhaltlich von einem Sportereignis, Wettkampf, Verein, Athleten, Liga oder sportlicher Leistung handelt (Fußball, Formel 1, Tennis, Olympia, Bundesliga, Champions League, Handball, etc.)
- Die Quelle (z.B. "Kicker", "Sport1") entscheidet NICHT über das Topic. Entscheide ausschließlich nach dem Titel.
- Politische, gesellschaftliche oder Klima-Themen aus Sport-Quellen bekommen ihr inhaltlich passendes Topic (z.B. "Politik DE/EU", "Geopolitik"), NICHT "Sport".
- Beispiel: "Ungarn: Parlament verhindert Wiederwahl von Orbán" → "Geopolitik" (nicht Sport, auch wenn Quelle Kicker ist)
- Sport-Artikel bekommen mindestens Score 6.

Bewerte folgende Artikel:
${JSON.stringify(list)}

ÜBERSETZUNG: Falls ein Artikel "needsTranslation": true hat, füge ein Feld "title" mit einer natürlich klingenden deutschen Übersetzung des Titels hinzu. Fachbegriffe wie "AI", "Cloud", "App" dürfen auf Englisch bleiben. Bei deutschen Artikeln wird kein "title"-Feld benötigt.

Antworte ausschließlich als JSON-Array ohne weiteren Text:
[{"id":"...","score":8,"topic":"Technologie & KI","title":"Optionale deutsche Übersetzung"}]

Mögliche Themen: ${TOPICS.join(', ')}`,
        },
      ],
    });

    const text = msg.content[0].type === 'text' ? msg.content[0].text : '';
    const match = text.match(/\[[\s\S]*\]/);
    if (!match) return articles.map((a) => ({ id: a.id, score: 5, topic: 'Allgemein' }));
    const parsed = JSON.parse(match[0]) as ScoreResult[];
    return parsed.filter((r) => r.id && typeof r.score === 'number');
  } catch (e) {
    console.error('Scoring batch error:', e);
    return articles.map((a) => ({ id: a.id, score: 5, topic: 'Allgemein' }));
  }
}

// Cluster-ID assignment only needs titles, not scores — split out from the
// score-based representative pick below so it can run concurrently with
// scoreAndAssignTopics() instead of waiting for scores first. That parallel
// run is what actually matters: two ~2-5s Haiku calls in sequence added up
// to a large chunk of the /api/feeds worst case.
export async function computeClusterIds(articles: Article[]): Promise<Map<number, string>> {
  if (articles.length === 0 || !process.env.ANTHROPIC_API_KEY) return new Map();

  const client = new Anthropic();
  const prompt = `Du bekommst eine Liste von Nachrichtenartikeln. Identifiziere Artikel die dasselbe Ereignis oder Thema behandeln (auch wenn die Titel unterschiedlich formuliert sind). Gib für jeden Artikel eine Cluster-ID zurück.

Artikel:
${articles.map((a, i) => `${i}: ${a.title}`).join('\n')}

Antworte NUR als JSON-Array:
[{ "index": 0, "clusterId": "ezb-zinsen" }, { "index": 1, "clusterId": "ezb-zinsen" }]`;

  try {
    const msg = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      // This now runs concurrently with scoring on the full pre-filter list
      // (up to MAX_ARTICLES_TOTAL articles), not the smaller post-filter
      // list — 1000 tokens isn't enough to return an entry per article.
      max_tokens: 4096,
      messages: [{ role: 'user', content: prompt }],
    });

    const text = msg.content[0].type === 'text' ? msg.content[0].text : '';
    const match = text.match(/\[[\s\S]*\]/);
    if (!match) return new Map();

    const clusters = JSON.parse(match[0]) as Array<{ index: number; clusterId: string }>;
    return new Map(clusters.map(({ index, clusterId }) => [index, clusterId]));
  } catch (e) {
    console.error('Clustering error:', e);
    return new Map();
  }
}

// Applies previously computed cluster IDs to a (now scored) article list,
// keeping only the highest-scored article per cluster.
export function applyClusters(articles: Article[], clusterIds: Map<number, string>): Article[] {
  if (clusterIds.size === 0) return articles;
  const clusterMap = new Map<string, Article>();
  const unclustered: Article[] = [];
  articles.forEach((article, index) => {
    const clusterId = clusterIds.get(index);
    if (!clusterId) {
      unclustered.push(article);
      return;
    }
    const existing = clusterMap.get(clusterId);
    if (!existing || article.score > existing.score) {
      clusterMap.set(clusterId, article);
    }
  });
  return [...unclustered, ...Array.from(clusterMap.values())];
}

// Only unambiguous sport terms — no source-based override to avoid misclassification
const SPORT_KEYWORDS = /\b(bundesliga|champions league|dfb-pokal|formel 1|formula 1|\bnba\b|olympia\b|olympische|weltmeister|torschütze|tabellenführer|abstiegskampf|transfermarkt|spieltag|bundesliga-|cl-finale|ucl|dfl)\b/i;

// Articles curated from local/community feeds (see lib/feeds.ts) can never win on
// "national importance" under the strict scoring rubric above — without this floor
// they'd always score below the 6-point publish threshold and never appear at all.
const GUARANTEED_TOPICS = new Set(['Münster & Region', 'Badbergen & Osnabrücker Land']);

export async function scoreAndAssignTopics(articles: Article[]): Promise<Article[]> {
  if (articles.length === 0) return [];

  const BATCH = 20;
  const batches: Article[][] = [];
  for (let i = 0; i < articles.length; i += BATCH) {
    batches.push(articles.slice(i, i + BATCH));
  }

  const results = await Promise.all(batches.map(scoreBatch));
  const map = new Map(results.flat().map((r) => [r.id, r]));

  return articles.map((a) => {
    const r = map.get(a.id);
    const presetTopic = a.topic !== 'Allgemein' ? a.topic : undefined;
    let scored = r
      ? { ...a, title: r.title ?? a.title, score: r.score, topic: presetTopic ?? r.topic }
      : { ...a, score: 4 };
    // Only boost clearly sport-specific titles — never override based on source alone
    if (SPORT_KEYWORDS.test(a.title)) {
      scored = { ...scored, topic: 'Sport', score: Math.max(scored.score, 6) };
    }
    // Local/community feeds are curated by topic, not by national importance
    if (presetTopic && GUARANTEED_TOPICS.has(presetTopic)) {
      scored = { ...scored, score: Math.max(scored.score, 6) };
    }
    return scored;
  });
}
