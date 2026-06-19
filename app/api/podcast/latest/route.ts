import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const type = searchParams.get('type') ?? 'morning'
  const todayKey = new Date()
    .toLocaleDateString('de-DE', { timeZone: 'Europe/Berlin', day: '2-digit', month: '2-digit', year: 'numeric' })
    .replace(/\./g, '-')
  const blobKey = `briefing-${type}-${todayKey}.json`

  try {
    const res = await fetch(`${process.env.NEXT_PUBLIC_BLOB_URL}/${blobKey}`, { cache: 'no-store' })
    if (res.ok) {
      const data = await res.json()
      return NextResponse.json({ available: true, ...data })
    }
  } catch {}

  return NextResponse.json({ available: false })
}
