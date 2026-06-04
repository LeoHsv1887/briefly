import Anthropic from '@anthropic-ai/sdk'
import { NextResponse } from 'next/server'
import { put } from '@vercel/blob'

export const dynamic = 'force-dynamic'
export const maxDuration = 90

function cleanScriptForTTS(text: string): string {
  return text
    .replace(/\*\*(.*?)\*\*/g, '$1')
    .replace(/\*(.*?)\*/g, '$1')
    .replace(/_{1,2}(.*?)_{1,2}/g, '$1')
    .replace(/#{1,6}\s/g, '')
    .replace(/\[([^\]]+)\]\([^\)]+\)/g, '$1')
    .replace(/`{1,3}[^`]*`{1,3}/g, '')
    .replace(/^[-–—]\s/gm, '')
    .replace(/^[•·]\s/gm, '')
    .replace(/\n{3,}/g, '\n\n')
    .replace(/[<>]/g, '')
    .replace(/&[a-z]+;/g, '')
    .trim()
}

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
      const feedRes = await fetch(`${baseUrl}/api/feeds`, { next: { revalidate: 0 } })
      const feedData = await feedRes.json()
      topArticles = (feedData.articles ?? [])
        .sort((a: any, b: any) => b.score - a.score)
        .slice(0, 8)
    } catch (e) {
      console.error('[Podcast] Feed error:', e)
    }

    try {
      const tickerRes = await fetch(`${baseUrl}/api/tickers`, { next: { revalidate: 0 } })
      const tickerData = await tickerRes.json()
      tickers = tickerData.tickers ?? []
    } catch (e) {
      console.error('[Podcast] Ticker error:', e)
    }

    // Wetterdaten für Warendorf
    let weatherDesc = 'wechselhaft'
    let weatherTemp = '18'
    try {
      const weatherRes = await fetch(
        'https://api.open-meteo.com/v1/forecast?latitude=51.9427&longitude=7.9827&current=temperature_2m,weathercode&timezone=Europe/Berlin',
        { next: { revalidate: 0 } }
      )
      const weatherData = await weatherRes.json()
      weatherTemp = Math.round(weatherData.current?.temperature_2m ?? 18).toString()
      const code = weatherData.current?.weathercode ?? 0
      if (code === 0) weatherDesc = 'sonnig'
      else if (code <= 3) weatherDesc = 'leicht bewölkt'
      else if (code <= 48) weatherDesc = 'bewölkt'
      else if (code <= 67) weatherDesc = 'regnerisch'
      else if (code <= 77) weatherDesc = 'Schnee möglich'
      else weatherDesc = 'stürmisch'
    } catch (e) {
      console.error('[Podcast] Weather fetch failed:', e)
    }

    const isHoliday = false
    const holidayName = ''
    const morningForecast: string | null = null

    const tickerLine = tickers
      .map((t: any) => `${t.label}: ${t.value} (${t.changePercent >= 0 ? '+' : ''}${t.changePercent}%)`)
      .join(' · ')

    const articleList = topArticles
      .map((a: any, i: number) => `${i + 1}. [${a.topic ?? 'News'}] ${a.title} · ${a.source}`)
      .join('\n')

    const morningPrompt = `Du bist Alex, der Sprecher des persönlichen News-Podcasts "Briefly". Du klingst wie ein gut informierter, sympathischer Kollege der einem morgens beim Kaffee die wichtigsten Dinge des Tages erklärt. Kein Nachrichtensprecher-Ton. Direkt, präzise, auf Augenhöhe.

DATUM: ${today}
WETTER: ${weatherDesc} in Warendorf, ${weatherTemp}°C
${isHoliday ? `FEIERTAG: ${holidayName}` : ''}

VERFÜGBARE ARTIKEL:
${articleList}

MARKTDATEN:
${tickerLine}

---

AUFGABE: Schreibe das Morning Briefing. Exakt 800-1000 Wörter. Orientiere dich am Stil des Handelsblatt Morning Briefing – professionell aber persönlich, präzise aber verständlich.

STRUKTUR (halte dich exakt daran):

[INTRO - 60-80 Wörter]
"Guten Morgen Leonard, heute ist [Wochentag], der [Datum]."
Kurzer persönlicher Einstieg über das Wetter in Warendorf. 1-2 Sätze Smalltalk – locker, nicht aufgesetzt.
Falls heute ein Feiertag ist: kurz erwähnen.
Dann: "Hier sind die wichtigsten Themen die du heute kennen solltest." – und direkt einsteigen.

[POLITIK - 200-250 Wörter]
Wähle 2-3 politische Top-Themen aus den Artikeln.
Pro Thema: 2-4 Sätze. Was ist passiert? Wie ist es einzuordnen? Was bedeutet es?
Kein tiefes Erklären von Grundlagen – Leonard kennt sich aus. Fokus auf Neuigkeiten und Einordnung.
Übergänge zwischen Themen natürlich gestalten.

[WIRTSCHAFT - 200-250 Wörter]
Wähle 2-3 Wirtschafts-Themen.
Gleiche Tiefe wie Politik. Zahlen nennen wenn relevant. Konkrete Einordnung.
Auch hier: keine Grundlagenerklärungen, sondern Einordnung der aktuellen Entwicklung.

[MÄRKTE & PROGNOSE - 150-180 Wörter]
Kurzer Überblick über die aktuellen Stände: DAX, S&P 500, Nasdaq, Bitcoin, Gold, Öl.
Dann: Was sind die wichtigsten Faktoren die den heutigen Handelstag beeinflussen werden?
Welche Termine, Daten oder Ereignisse sollte man heute im Blick haben? (Fed-Entscheid, Quartalszahlen, etc.)
Nicht spekulieren – aber konkrete Einschätzung was heute wichtig wird.

[OUTRO - 50-60 Wörter]
Kurzer, persönlicher Abschluss.
"Das war dein Morning Briefing für heute. Ich wünsche dir einen erfolgreichen [Wochentag] – wir hören uns heute Abend wieder."
Locker, nicht förmlich. Kein Radio-Abschluss.

STILREGELN:
- Zahlen immer ausschreiben: "drei Komma zwei Prozent" nicht "3,2%"
- Kurze, klare Sätze. Gelegentlich Satzfragmente für Dynamik.
- Kein "Experten warnen" oder "Beobachter sagen" – direkte Einordnung
- Keine Bullet-Points oder Aufzählungen im Text
- Fachbegriffe dürfen verwendet werden – Leonard kennt sie
- Übergänge zwischen Abschnitten fließend gestalten
- Ton: wie ein kluger Kollege beim Morgenkaffee

Schreibe NUR den reinen Sprechtext. Keine Kapitelüberschriften, keine Formatierung.`

    const eveningPrompt = `Du bist Alex, der Sprecher des persönlichen News-Podcasts "Briefly". Abend-Ton: ruhiger, reflektierender, wie ein Kollege der den Tag Revue passieren lässt.

DATUM: ${today}
MORGEN-MARKTPROGNOSE: ${morningForecast ?? 'nicht verfügbar'}

VERFÜGBARE ARTIKEL:
${articleList}

MARKTDATEN (Schlusskurse):
${tickerLine}

---

AUFGABE: Schreibe das Evening Briefing. Exakt 800-1000 Wörter.

STRUKTUR:

[INTRO - 60-80 Wörter]
"Guten Abend Leonard, schön dass du wieder reinhörst."
1-2 Sätze lockerer Einstieg – wie war der Tag, kurze persönliche Note.
"Hier ist was heute wichtig war."

[POLITIK - 200-250 Wörter]
Die 2-3 wichtigsten politischen Entwicklungen des heutigen Tages.
Rückblickend formulieren: Was hat sich heute konkret getan?
Einordnung: Was bedeutet das für morgen, diese Woche, langfristig?

[WIRTSCHAFT - 200-250 Wörter]
Die 2-3 wichtigsten Wirtschaftsthemen des Tages.
Gleicher Ansatz: konkret, einordnend, auf Augenhöhe.

[MÄRKTE RÜCKBLICK - 150-180 Wörter]
Wie haben sich die Märkte heute entwickelt?
Falls eine Morgen-Prognose vorliegt: Vergleiche kurz ob die Einschätzung von heute Morgen gestimmt hat.
Was waren die Treiber? Welche Überraschungen gab es?
Kurzer Ausblick: Was könnte morgen relevant sein?

[OUTRO - 50-60 Wörter]
"Das war dein Evening Briefing. Ich wünsche dir einen guten und entspannten Abend – wir hören uns morgen früh wieder."
Ruhig, persönlich, nicht förmlich.

STILREGELN:
- Gleiche Regeln wie Morning Briefing
- Ton etwas ruhiger und reflektierender als morgens
- Abend-Formulierungen: "heute hat sich gezeigt", "der Tag hat bestätigt", "überraschend war"

Schreibe NUR den reinen Sprechtext.`

    const scriptPrompt = isMorning ? morningPrompt : eveningPrompt

    const scriptResponse = await anthropic.messages.create({
      model: 'claude-haiku-4-5',
      max_tokens: 2500,
      messages: [{ role: 'user', content: scriptPrompt }]
    })

    const script = scriptResponse.content[0].type === 'text'
      ? scriptResponse.content[0].text
      : ''

    const cleanScript = cleanScriptForTTS(script)

    console.log('[Podcast] Script generated:', cleanScript.length, 'chars,', cleanScript.split(' ').length, 'words')

    // Text in Sinnabschnitte aufteilen (max 4000 Zeichen pro Request)
    const chunks = splitTextForTTS(cleanScript)
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

    const combinedBase64 = audioBuffers.join('')

    console.log('[Podcast] Audio generated successfully,', audioBuffers.length, 'chunks')

    const metadata = {
      title: `${isMorning ? 'Morning Brief' : 'Evening Brief'} · ${today}`,
      duration: Math.round(cleanScript.split(' ').length / 130),
      generatedAt: new Date().toISOString(),
      type: isMorning ? 'morning' : 'evening',
      audioBase64: combinedBase64,
    }

    try {
      await put(
        `podcast-meta-${isMorning ? 'morning' : 'evening'}.json`,
        JSON.stringify(metadata),
        { access: 'public', contentType: 'application/json', addRandomSuffix: false }
      )
      console.log('[Podcast] Metadata saved to Blob')
    } catch (e) {
      console.error('[Podcast] Blob save failed:', e)
    }

    return NextResponse.json({
      success: true,
      ...metadata,
    })

  } catch (error: any) {
    console.error('[Podcast] Fatal error:', error)
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}
