import { NextResponse } from 'next/server'
import { addSubscription, removeSubscription, type StoredPushSubscription } from '@/lib/pushStore'

function isValidSubscription(body: unknown): body is StoredPushSubscription {
  if (!body || typeof body !== 'object') return false
  const sub = body as Record<string, unknown>
  return typeof sub.endpoint === 'string' && sub.endpoint.length > 0
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    if (!isValidSubscription(body)) {
      return NextResponse.json({ error: 'Invalid subscription' }, { status: 400 })
    }
    await addSubscription(body)
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Push subscribe error:', error)
    return NextResponse.json({ error: 'Failed to subscribe' }, { status: 500 })
  }
}

export async function DELETE(request: Request) {
  try {
    const { endpoint } = await request.json()
    if (typeof endpoint !== 'string' || !endpoint) {
      return NextResponse.json({ error: 'Invalid endpoint' }, { status: 400 })
    }
    await removeSubscription(endpoint)
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Push unsubscribe error:', error)
    return NextResponse.json({ error: 'Failed to unsubscribe' }, { status: 500 })
  }
}
