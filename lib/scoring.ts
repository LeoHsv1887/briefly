import Anthropic from '@anthropic-ai/sdk';
import { TOPICS } from './types';
import type { Article } from './types';

type ScoreResult = { id: string; score: number; topic: string };

async function scoreBatch(articles: Article[]): Promise<ScoreResult[]> {
  if (!process.env.ANTHROPIC_API_KEY) {
    return articles.map((a) => ({ id: a.id, score: 5, topic: 'Allgemein' }));
  }

  const client = new Anthropic();
  const list = articles.map((a) => ({ id: a.id, title: a.title, source: a.source }));

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

Bewerte folgende Artikel:
${JSON.stringify(list)}

Antworte ausschließlich als JSON-Array ohne weiteren Text:
[{"id":"...","score":8,"topic":"Technologie & KI"}]

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

export async function clusterAndDeduplicate(articles: Article[]): Promise<Article[]> {
  if (articles.length === 0) return [];
  if (!process.env.ANTHROPIC_API_KEY) return articles;

  const client = new Anthropic();
  const prompt = `Du bekommst eine Liste von Nachrichtenartikeln. Identifiziere Artikel die dasselbe Ereignis oder Thema behandeln (auch wenn die Titel unterschiedlich formuliert sind). Gib für jeden Artikel eine Cluster-ID zurück.

Artikel:
${articles.map((a, i) => `${i}: ${a.title}`).join('\n')}

Antworte NUR als JSON-Array:
[{ "index": 0, "clusterId": "ezb-zinsen" }, { "index": 1, "clusterId": "ezb-zinsen" }]`;

  try {
    const msg = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 1000,
      messages: [{ role: 'user', content: prompt }],
    });

    const text = msg.content[0].type === 'text' ? msg.content[0].text : '';
    const match = text.match(/\[[\s\S]*\]/);
    if (!match) return articles;

    const clusters = JSON.parse(match[0]) as Array<{ index: number; clusterId: string }>;
    const clusterMap = new Map<string, Article>();
    for (const { index, clusterId } of clusters) {
      const article = articles[index];
      if (!article) continue;
      const existing = clusterMap.get(clusterId);
      if (!existing || article.score > existing.score) {
        clusterMap.set(clusterId, article);
      }
    }
    return Array.from(clusterMap.values());
  } catch {
    return articles;
  }
}

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
    return r ? { ...a, score: r.score, topic: r.topic } : { ...a, score: 4 };
  });
}
