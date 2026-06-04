import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const type = searchParams.get('type') ?? 'morning'

  try {
    const blobUrl = `${process.env.NEXT_PUBLIC_BLOB_URL}/podcast-meta-${type}.json`
    const res = await fetch(blobUrl, { cache: 'no-store' })
    if (!res.ok) return NextResponse.json({ available: false })
    const data = await res.json()
    return NextResponse.json({ available: true, ...data })
  } catch {
    return NextResponse.json({ available: false })
  }
}
