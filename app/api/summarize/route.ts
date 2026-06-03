import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';

export async function POST(request: NextRequest) {
  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json({ error: 'API key not configured' }, { status: 503 });
  }

  let body: { title?: string; url?: string; content?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  const { title, content } = body;
  if (!title) return NextResponse.json({ error: 'title required' }, { status: 400 });

  const client = new Anthropic();

  try {
    const msg = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 512,
      messages: [
        {
          role: 'user',
          content: `Erstelle eine präzise Zusammenfassung des folgenden Nachrichtenartikels auf Deutsch in 3–5 Sätzen. Ton: informativ, klar, ohne Füllwörter. Kein "Der Artikel beschreibt" oder ähnliche Meta-Kommentare – direkt zur Sache.

Titel: ${title}
${content ? `\nInhalt: ${content}` : ''}`,
        },
      ],
    });

    const summary = msg.content[0].type === 'text' ? msg.content[0].text.trim() : '';
    return NextResponse.json({ summary });
  } catch (err) {
    console.error('Summarize error:', err);
    return NextResponse.json({ error: 'Summarization failed' }, { status: 500 });
  }
}
