import Anthropic from '@anthropic-ai/sdk'
import { NextResponse } from 'next/server'
import { put } from '@vercel/blob'

export const maxDuration = 60

export async function GET() {
  try {
    const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

    const hour = new Date().getHours()
    const isMorning = hour < 12
    const today = new Date().toLocaleDateString('de-DE', {
      weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
    })

    // 1. Top-Artikel fetchen – mit absolutem URL
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ?? 'http://localhost:3000'
    let topArticles: any[] = []
    let tickers: any[] = []

    try {
      const feedRes = await fetch(`${baseUrl}/api/feeds`, { next: { revalidate: 0 } })
      const feedData = await feedRes.json()
      topArticles = (feedData.articles ?? [])
        .sort((a: any, b: any) => b.score - a.score)
        .slice(0, 8)
    } catch (e) {
      console.error('[Podcast] Feed fetch failed:', e)
    }

    try {
      const tickerRes = await fetch(`${baseUrl}/api/tickers`, { next: { revalidate: 0 } })
      const tickerData = await tickerRes.json()
      tickers = tickerData.tickers ?? []
    } catch (e) {
      console.error('[Podcast] Ticker fetch failed:', e)
    }

    // 2. Skript generieren
    const scriptPrompt = `Du bist der Sprecher eines persönlichen News-Podcasts namens "Briefly". Dein Name ist Alex. Du sprichst Deutsch und klingst wie ein kluger, gut informierter Freund – nicht wie ein Nachrichtensprecher. Erkläre Zusammenhänge verständlich, gib Kontext und klinge dabei immer menschlich und lebendig.

Heute ist ${today}. Es ist ${isMorning ? 'Morgen' : 'Abend'}.

Aktuelle Top-Artikel:
${topArticles.map((a: any, i: number) => `${i + 1}. [${a.topic ?? 'News'}] ${a.title} (${a.source})`).join('\n')}

Marktdaten:
${tickers.map((t: any) => `${t.label}: ${t.value} (${t.changePercent >= 0 ? '+' : ''}${t.changePercent}%)`).join(', ')}

Schreibe ein Podcast-Skript für die ${isMorning ? 'Morgen' : 'Abend'}-Episode.

REGELN:
- Genau 500-600 Wörter (für ca. 4-5 Minuten Audio)
- Wähle die 4-5 wichtigsten Themen aus
- Erkläre WARUM etwas wichtig ist
- Natürliche Übergänge, kein steifes Vorlesen
- Kein JSON, keine Formatierung, nur reiner Sprechtext
- Beginne direkt mit der Begrüßung

STRUKTUR: Intro → Märkte (kurz) → Top-News (2-3 Themen) → Outro`

    const scriptResponse = await anthropic.messages.create({
      model: 'claude-haiku-4-5',
      max_tokens: 1500,
      messages: [{ role: 'user', content: scriptPrompt }]
    })

    const script = scriptResponse.content[0].type === 'text'
      ? scriptResponse.content[0].text
      : 'Fehler beim Generieren des Skripts.'

    console.log('[Podcast] Script generated, length:', script.length)

    // 3. Google TTS – nur einen einzigen Request mit max 4500 Zeichen
    const truncatedScript = script.slice(0, 4500)

    const ttsRes = await fetch(
      `https://texttospeech.googleapis.com/v1/text:synthesize?key=${process.env.GOOGLE_TTS_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          input: { text: truncatedScript },
          voice: {
            languageCode: 'de-DE',
            name: 'de-DE-Neural2-B',
            ssmlGender: 'MALE'
          },
          audioConfig: {
            audioEncoding: 'MP3',
            speakingRate: 1.0,
            pitch: 0
          }
        })
      }
    )

    const ttsData = await ttsRes.json()

    if (!ttsData.audioContent) {
      console.error('[Podcast] TTS Error:', JSON.stringify(ttsData))
      return NextResponse.json({
        success: false,
        error: 'TTS failed',
        details: ttsData
      }, { status: 500 })
    }

    console.log('[Podcast] Audio generated successfully')

    // 4. In Vercel Blob speichern
    const audioBuffer = Buffer.from(ttsData.audioContent, 'base64')
    const filename = `podcast-${isMorning ? 'morning' : 'evening'}.mp3`

    const blobToken = process.env.BLOB_READ_WRITE_TOKEN
    const blob = await put(filename, audioBuffer, {
      access: 'public',
      contentType: 'audio/mpeg',
      addRandomSuffix: false,
      token: blobToken
    })

    // 5. Metadaten speichern
    const metadata = {
      url: blob.url,
      title: `${isMorning ? '☀️ Morning Brief' : '🌙 Evening Brief'} · ${today}`,
      duration: Math.round(script.split(' ').length / 130),
      generatedAt: new Date().toISOString(),
      type: isMorning ? 'morning' : 'evening'
    }

    await put(
      `podcast-meta-${isMorning ? 'morning' : 'evening'}.json`,
      JSON.stringify(metadata),
      {
        access: 'public',
        contentType: 'application/json',
        addRandomSuffix: false,
        token: blobToken
      }
    )

    return NextResponse.json({ success: true, ...metadata })

  } catch (error: any) {
    console.error('[Podcast] Fatal error:', error)
    return NextResponse.json({
      success: false,
      error: error.message ?? 'Unknown error'
    }, { status: 500 })
  }
}
