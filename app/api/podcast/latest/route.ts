import { NextResponse } from 'next/server'

export async function GET() {
  return NextResponse.json({ available: false, message: 'Use /api/podcast/generate directly' })
}
