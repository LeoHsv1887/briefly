import Anthropic from '@anthropic-ai/sdk'
import { NextResponse } from 'next/server'

export const maxDuration = 60

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
    const scriptResponse = await anthropic.messages.create({
      model: 'claude-haiku-4-5',
      max_tokens: 1500,
      messages: [{
        role: 'user',
        content: `Du bist der Sprecher eines persönlichen News-Podcasts namens "Briefly". Dein Name ist Alex. Du sprichst Deutsch und klingst wie ein kluger, gut informierter Freund – nicht wie ein Nachrichtensprecher.

Heute ist ${today}. Es ist ${isMorning ? 'Morgen' : 'Abend'}.

Top-Artikel:
${topArticles.map((a: any, i: number) => `${i + 1}. [${a.topic ?? 'News'}] ${a.title} (${a.source})`).join('\n')}

Marktdaten:
${tickers.map((t: any) => `${t.label}: ${t.value} (${t.changePercent >= 0 ? '+' : ''}${t.changePercent}%)`).join(', ')}

Schreibe ein Podcast-Skript für die ${isMorning ? 'Morgen' : 'Abend'}-Episode. 500-600 Wörter. Wähle 4-5 wichtigste Themen. Erkläre WARUM etwas wichtig ist. Natürliche Übergänge. Nur reiner Sprechtext, beginne direkt mit der Begrüßung.`
      }]
    })

    const script = scriptResponse.content[0].type === 'text'
      ? scriptResponse.content[0].text
      : ''

    console.log('[Podcast] Script generated:', script.length, 'chars')

    // Google TTS
    const ttsRes = await fetch(
      `https://texttospeech.googleapis.com/v1/text:synthesize?key=${process.env.GOOGLE_TTS_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          input: { text: script.slice(0, 4500) },
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
      console.error('[Podcast] TTS failed:', JSON.stringify(ttsData))
      return NextResponse.json({ success: false, error: 'TTS failed', details: ttsData }, { status: 500 })
    }

    console.log('[Podcast] Audio generated successfully')

    // Audio als Base64 direkt zurückgeben – kein Blob Storage nötig
    return NextResponse.json({
      success: true,
      audioBase64: ttsData.audioContent,
      title: `${isMorning ? '☀️ Morning Brief' : '🌙 Evening Brief'} · ${today}`,
      duration: Math.round(script.split(' ').length / 130),
      generatedAt: new Date().toISOString(),
      type: isMorning ? 'morning' : 'evening',
      script: script.slice(0, 200) + '...' // Preview
    })

  } catch (error: any) {
    console.error('[Podcast] Fatal error:', error)
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}
