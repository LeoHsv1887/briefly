import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const url = request.nextUrl.searchParams.get('url');
  if (!url) return NextResponse.json({ imageUrl: null });

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 3000);

    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        Accept: 'text/html,application/xhtml+xml',
      },
      next: { revalidate: 86400 },
    });
    clearTimeout(timeout);

    if (!res.ok) return NextResponse.json({ imageUrl: null });

    // Only read up to 64 KB — og:image is always in <head>
    const reader = res.body?.getReader();
    if (!reader) return NextResponse.json({ imageUrl: null });

    let html = '';
    let bytesRead = 0;
    const MAX = 65536;
    while (bytesRead < MAX) {
      const { done, value } = await reader.read();
      if (done) break;
      html += new TextDecoder().decode(value);
      bytesRead += value.length;
      if (html.includes('</head>')) break;
    }
    reader.cancel();

    const match =
      html.match(/<meta[^>]+property=["']og:image["'][^>]*content=["']([^"']+)["']/i) ??
      html.match(/<meta[^>]+content=["']([^"']+)["'][^>]*property=["']og:image["']/i);

    const imageUrl = match?.[1] ?? null;
    return NextResponse.json({ imageUrl });
  } catch {
    return NextResponse.json({ imageUrl: null });
  }
}
