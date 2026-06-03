import { NextResponse } from 'next/server';

export const revalidate = 300;

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const type = searchParams.get('type') ?? 'morning';

  try {
    const blobBase = process.env.NEXT_PUBLIC_BLOB_URL ?? '';
    if (!blobBase) return NextResponse.json({ available: false });

    const metaUrl = `${blobBase}/podcast-meta-${type}.json`;
    const res = await fetch(metaUrl, { next: { revalidate: 300 } });
    if (!res.ok) return NextResponse.json({ available: false });

    const metadata = await res.json();
    return NextResponse.json({ available: true, ...metadata });
  } catch {
    return NextResponse.json({ available: false });
  }
}
