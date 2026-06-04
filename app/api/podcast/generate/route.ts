import Anthropic from '@anthropic-ai/sdk'
import { NextResponse } from 'next/server'

export const maxDuration = 90

function splitTextForTTS(text: string): string[] {
  const chunks: string[] = []
  const paragraphs = text.split(/\n\n+/)
  let current = ''

  for (const para of paragraphs) {
    if ((current + '\n\n' + para).length > 4000) {
      if (current) chunks.push(current.trim())
      current = para
    } else {
      current = current ? current + '\n\n' + para : para
    }
  }
  if (current) chunks.push(current.trim())
  return chunks.filter(c => c.length > 0)
}

export async function GET() {
  try {
    const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

    const hour = new Date().getHours()
    const isMorning = hour < 12
    const today = new Date().toLocaleDateString('de-DE', {
      weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
    })

    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ?? 'http://localhost:3000'

    // Artikel fetchen
    let topArticles: any[] = []
    let tickers: any[] = []
    try {
      const feedRes = await fetch(`${baseUrl}/api/feeds`, { cache: 'no-store' })
      const feedData = await feedRes.json()
      topArticles = (feedData.articles ?? [])
        .sort((a: any, b: any) => b.score - a.score)
        .slice(0, 8)
    } catch (e) {
      console.error('[Podcast] Feed error:', e)
    }

    try {
      const tickerRes = await fetch(`${baseUrl}/api/tickers`, { cache: 'no-store' })
      const tickerData = await tickerRes.json()
      tickers = tickerData.tickers ?? []
    } catch (e) {
      console.error('[Podcast] Ticker error:', e)
    }

    // Skript generieren
    const scriptPrompt = `Du bist Alex, der Sprecher des persönlichen News-Podcasts "Briefly". Du sprichst wie ein erfahrener Journalist der gleichzeitig ein guter Freund ist – klug, direkt, einordnend. Kein Nachrichtensprecher-Ton, keine Moderatoren-Floskeln.

DATUM & KONTEXT:
Heute ist ${today}. Es ist ${isMorning ? 'Morgen' : 'Abend'}.

VERFÜGBARE ARTIKEL (nach Relevanz sortiert):
${topArticles.map((a: any, i: number) => `${i + 1}. [${a.topic ?? 'News'}] ${a.title}\n   Quelle: ${a.source}`).join('\n\n')}

MARKTDATEN VON HEUTE:
${tickers.map((t: any) => `${t.label}: ${t.value} (${t.changePercent >= 0 ? '+' : ''}${t.changePercent}%)`).join(' · ')}

DEINE AUFGABE:
Schreibe ein Podcast-Skript von exakt 900-1100 Wörtern (entspricht 7-9 Minuten Sprechzeit).

AUSWAHLPRINZIP:
Wähle NUR die 3-4 Storys die heute wirklich wichtig sind. Lieber wenige Themen tief behandeln als viele oberflächlich. Eine Story ist wichtig wenn sie: große Auswirkungen hat, viele Menschen betrifft, einen Wendepunkt darstellt oder ein Thema ist das man unbedingt verstanden haben muss.

AUFBAU DES SKRIPTS:

[INTRO - ca. 80 Wörter]
Persönliche Begrüßung mit Namen, Datum. Kurzer "Was erwartet dich heute" - Teaser der neugierig macht. Nicht "Willkommen bei Briefly" - sondern direkt und persönlich.

[MÄRKTE - ca. 150 Wörter]
Erkläre was heute an den Märkten passiert ist und WARUM. Verbinde Zahlen mit echten Ereignissen. "Der DAX ist heute um X% gefallen, und das hat einen konkreten Grund..." Mach die Zahlen greifbar.

[STORY 1 - ca. 250 Wörter - Die wichtigste Story des Tages]
Beginne mit dem Kern: Was ist passiert? Dann: Warum ist das wichtig? Was sind die Hintergründe? Was bedeutet das für den Hörer? Verwende konkrete Details, Zahlen, Namen. Kein "Experten sagen" - sondern echte Einordnung.

[STORY 2 - ca. 200 Wörter]
Zweite wichtige Story, gleiche Tiefe.

[STORY 3 - ca. 200 Wörter]
Dritte Story - kann auch ein Thema sein das interessant ist ohne akut wichtig zu sein.

[OUTRO - ca. 80 Wörter]
Kurzes Fazit was heute der rote Faden war. ${isMorning ? 'Motivierender Abschluss für den Tag.' : 'Ruhiger, reflektierender Abschluss.'} Kein generisches "Tschüss bis morgen".

STILREGELN - SEHR WICHTIG:
- Schreibe wie gesprochen, nicht wie gelesen. Kurze Sätze. Gelegentlich Satzfragmente.
- Keine Aufzählungen, keine Bulletpoints - nur fließender Text
- Übergänge müssen natürlich sein: "Was mich dabei besonders beschäftigt...", "Das hängt direkt zusammen mit...", "Und dann ist da noch etwas..."
- Zahlen ausschreiben: nicht "3,2%" sondern "drei Komma zwei Prozent"
- Konkret statt vage: nicht "viele Menschen" sondern "rund 40 Millionen Haushalte"
- Erkläre Fachbegriffe kurz wenn du sie nutzt
- Gelegentlich eine pointierte Einschätzung: "Das ist meiner Meinung nach das wichtigste Signal der Woche"
- Keine Sätze die mit "Also," oder "Nun," beginnen
- Kein "Bleib informiert" oder ähnliche Radio-Floskeln am Ende

Schreibe NUR den reinen Sprechtext. Keine Anmerkungen, keine Formatierung, keine Kapitelüberschriften.`

    const scriptResponse = await anthropic.messages.create({
      model: 'claude-haiku-4-5',
      max_tokens: 2500,
      messages: [{ role: 'user', content: scriptPrompt }]
    })

    const script = scriptResponse.content[0].type === 'text'
      ? scriptResponse.content[0].text
      : ''

    console.log('[Podcast] Script generated:', script.length, 'chars,', script.split(' ').length, 'words')

    // Text in Sinnabschnitte aufteilen (max 4000 Zeichen pro Request)
    const chunks = splitTextForTTS(script)
    console.log(`[Podcast] Splitting into ${chunks.length} TTS chunks`)

    const audioBuffers: string[] = []

    for (const chunk of chunks) {
      const ttsRes = await fetch(
        `https://texttospeech.googleapis.com/v1/text:synthesize?key=${process.env.GOOGLE_TTS_API_KEY}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            input: { text: chunk },
            voice: {
              languageCode: 'de-DE',
              name: 'de-DE-Journey-D',
              ssmlGender: 'MALE'
            },
            audioConfig: {
              audioEncoding: 'MP3',
              speakingRate: 0.92,
              pitch: -1.5,
              volumeGainDb: 1.0,
              effectsProfileId: ['headphone-class-device']
            }
          })
        }
      )

      const ttsData = await ttsRes.json()

      if (ttsData.audioContent) {
        audioBuffers.push(ttsData.audioContent)
        console.log(`[Podcast] Chunk ${audioBuffers.length}/${chunks.length} generated`)
      } else {
        console.error('[Podcast] TTS chunk failed:', JSON.stringify(ttsData))
        // Fallback: andere Stimme versuchen
        const fallbackRes = await fetch(
          `https://texttospeech.googleapis.com/v1/text:synthesize?key=${process.env.GOOGLE_TTS_API_KEY}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              input: { text: chunk },
              voice: { languageCode: 'de-DE', name: 'de-DE-Neural2-D', ssmlGender: 'MALE' },
              audioConfig: { audioEncoding: 'MP3', speakingRate: 0.92, pitch: -1.5 }
            })
          }
        )
        const fallbackData = await fallbackRes.json()
        if (fallbackData.audioContent) audioBuffers.push(fallbackData.audioContent)
      }
    }

    if (audioBuffers.length === 0) {
      return NextResponse.json({ success: false, error: 'TTS failed for all chunks' }, { status: 500 })
    }

    // Alle Base64-Chunks kombinieren (MP3-Dateien können einfach konkateniert werden)
    const combinedBase64 = audioBuffers.join('')

    console.log('[Podcast] Audio generated successfully,', audioBuffers.length, 'chunks')

    return NextResponse.json({
      success: true,
      audioBase64: combinedBase64,
      title: `${isMorning ? '☀️ Morning Brief' : '🌙 Evening Brief'} · ${today}`,
      duration: Math.round(script.split(' ').length / 130),
      generatedAt: new Date().toISOString(),
      type: isMorning ? 'morning' : 'evening',
      script: script.slice(0, 200) + '...'
    })

  } catch (error: any) {
    console.error('[Podcast] Fatal error:', error)
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}
