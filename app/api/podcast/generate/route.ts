import Anthropic from '@anthropic-ai/sdk';
import { put } from '@vercel/blob';
import { NextResponse } from 'next/server';

function splitIntoChunks(text: string, maxLength: number): string[] {
  const sentences = text.match(/[^.!?]+[.!?]+/g) ?? [text];
  const chunks: string[] = [];
  let current = '';
  for (const sentence of sentences) {
    if ((current + sentence).length > maxLength) {
      if (current) chunks.push(current.trim());
      current = sentence;
    } else {
      current += sentence;
    }
  }
  if (current) chunks.push(current.trim());
  return chunks;
}

function estimateDuration(script: string): number {
  return Math.round(script.split(' ').length / 130);
}

export async function GET() {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ?? 'http://localhost:3000';

  // DE local time (UTC+1, ignoring DST – close enough for cron scheduling)
  const hour = new Date().getUTCHours() + 1;
  const isMorning = hour < 12;
  const timeLabel = isMorning ? 'Morgen' : 'Abend';
  const today = new Date().toLocaleDateString('de-DE', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  // 1. Top articles
  let topArticles: Array<{ topic: string; title: string; source: string; score: number }> = [];
  try {
    const feedRes = await fetch(`${baseUrl}/api/feeds`);
    const { articles } = await feedRes.json();
    topArticles = (articles ?? [])
      .sort((a: { score: number }, b: { score: number }) => b.score - a.score)
      .slice(0, 12);
  } catch {}

  // 2. Market tickers
  let tickerLines = '';
  try {
    const tickerRes = await fetch(`${baseUrl}/api/tickers`);
    const { tickers } = await tickerRes.json();
    tickerLines = (tickers ?? [])
      .map((t: { label: string; value: string; changePercent: number }) =>
        `${t.label}: ${t.value} (${t.changePercent >= 0 ? '+' : ''}${t.changePercent}%)`,
      )
      .join(', ');
  } catch {}

  // 3. Generate script with Claude
  const scriptPrompt = `Du bist der Sprecher eines persönlichen News-Podcasts namens "Briefly". Dein Name ist Alex. Du sprichst Deutsch und klingst wie ein kluger, gut informierter Freund – nicht wie ein Nachrichtensprecher. Du erklärst Dinge verständlich, gibst Kontext und Hintergründe, machst natürliche Übergänge zwischen Themen und klingst dabei immer menschlich und lebendig.

Heute ist ${today}. Es ist ${isMorning ? 'Morgen' : 'Abend'}.

Hier sind die wichtigsten Artikel des Tages (nach Relevanz sortiert):
${topArticles.map((a, i) => `${i + 1}. [${a.topic}] ${a.title} (Quelle: ${a.source})`).join('\n')}

Aktuelle Marktdaten:
${tickerLines || '(keine Marktdaten verfügbar)'}

Schreibe jetzt das vollständige Podcast-Skript für die ${timeLabel}s-Episode.

WICHTIGE REGELN:
- Das Skript muss MINDESTENS 1.000 Wörter lang sein, besser 1.200-1.500 Wörter
- Wähle die 5-7 wichtigsten und interessantesten Themen aus – nicht alle
- Erkläre WARUM etwas wichtig ist, nicht nur WAS passiert ist
- Nutze natürliche Übergänge: "Was mich dabei besonders interessiert...", "Das hängt übrigens zusammen mit...", "Und dann war da noch..."
- Keine Bulletpoints, keine Aufzählungen – nur fließender, gesprochener Text
- Keine Anweisungen wie [Pause] oder [Musik] – nur reiner Sprechtext
- Fang direkt mit dem Intro an, kein Vorwort

STRUKTUR:
- Intro (persönliche Begrüßung, Datum, kurzer Ausblick was kommt)
- Märkte (2-3 Minuten: was ist heute passiert und warum – verknüpfe mit echten Ereignissen)
- Top-News Block 1: Wirtschaft & Politik (3-4 Minuten: die wichtigsten 2-3 Storys mit Kontext)
- Top-News Block 2: weitere relevante Themen (2-3 Minuten)
- Outro (kurz, persönlich, motivierend – nicht generisch)

${
  isMorning
    ? 'Morgen-Ton: frisch, energetisch, gibt dem Hörer das Gefühl gut informiert in den Tag zu starten.'
    : 'Abend-Ton: ruhiger, reflektierend, fasst den Tag zusammen und ordnet ein was wichtig war.'
}

Schreibe NUR den Sprechtext – kein JSON, keine Formatierung, keine Anmerkungen.`;

  let script = '';
  if (process.env.ANTHROPIC_API_KEY) {
    const anthropic = new Anthropic();
    const scriptResponse = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 4000,
      messages: [{ role: 'user', content: scriptPrompt }],
    });
    script = scriptResponse.content[0].type === 'text' ? scriptResponse.content[0].text : '';
  }

  if (!script) {
    return NextResponse.json({ success: false, error: 'Script generation failed' }, { status: 500 });
  }

  // 4. Google Cloud TTS – chunk and synthesize
  const chunks = splitIntoChunks(script, 4500);
  const audioBuffers: Buffer[] = [];

  for (const chunk of chunks) {
    try {
      const ttsRes = await fetch(
        `https://texttospeech.googleapis.com/v1/text:synthesize?key=${process.env.GOOGLE_TTS_API_KEY}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            input: { text: chunk },
            voice: {
              languageCode: 'de-DE',
              name: 'de-DE-Neural2-B',
              ssmlGender: 'MALE',
            },
            audioConfig: {
              audioEncoding: 'MP3',
              speakingRate: 1.0,
              pitch: 0,
              volumeGainDb: 0,
            },
          }),
        },
      );
      const ttsData = await ttsRes.json();
      if (ttsData.audioContent) {
        audioBuffers.push(Buffer.from(ttsData.audioContent, 'base64'));
      }
    } catch {}
  }

  if (!audioBuffers.length) {
    return NextResponse.json({ success: false, error: 'TTS failed' }, { status: 500 });
  }

  // 5. Combine and upload to Vercel Blob
  const combinedAudio = Buffer.concat(audioBuffers);
  const dateStr = new Date().toISOString().split('T')[0];
  const filename = `podcast-${isMorning ? 'morning' : 'evening'}-${dateStr}.mp3`;

  const blob = await put(filename, combinedAudio, {
    access: 'public',
    contentType: 'audio/mpeg',
  });

  // 6. Save metadata as JSON (overwrite so /latest always finds the newest)
  const metadata = {
    url: blob.url,
    title: `${isMorning ? '☀️ Morning Brief' : '🌙 Evening Brief'} · ${today}`,
    duration: estimateDuration(script),
    generatedAt: new Date().toISOString(),
    type: isMorning ? 'morning' : 'evening',
    wordCount: script.split(' ').length,
  };

  const metaFilename = `podcast-meta-${isMorning ? 'morning' : 'evening'}.json`;
  await put(metaFilename, JSON.stringify(metadata), {
    access: 'public',
    contentType: 'application/json',
    addRandomSuffix: false,
  });

  return NextResponse.json({ success: true, ...metadata });
}
