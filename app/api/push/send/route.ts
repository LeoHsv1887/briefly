import webpush, { WebPushError } from 'web-push'
import { NextResponse } from 'next/server'
import { getSubscriptions, removeSubscriptions } from '@/lib/pushStore'

export async function POST(request: Request) {
  try {
    const { title, body, url, secret } = await request.json()

    // Simple shared-secret check so only authorized calls (this app's own
    // check-breaking cron) can trigger a push to every subscriber.
    if (!process.env.PUSH_SECRET || secret !== process.env.PUSH_SECRET) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    if (!title || typeof title !== 'string') {
      return NextResponse.json({ error: 'Missing title' }, { status: 400 })
    }
    if (!process.env.VAPID_EMAIL || !process.env.VAPID_PUBLIC_KEY || !process.env.VAPID_PRIVATE_KEY) {
      return NextResponse.json({ error: 'VAPID keys not configured' }, { status: 500 })
    }

    webpush.setVapidDetails(process.env.VAPID_EMAIL, process.env.VAPID_PUBLIC_KEY, process.env.VAPID_PRIVATE_KEY)

    const subscriptions = await getSubscriptions()
    if (subscriptions.length === 0) {
      return NextResponse.json({ sent: 0, message: 'No subscriptions' })
    }

    const payload = JSON.stringify({ title, body, url })

    const results = await Promise.allSettled(
      subscriptions.map((sub) => webpush.sendNotification(sub, payload)),
    )

    const dead: string[] = []
    let sent = 0
    results.forEach((r, i) => {
      if (r.status === 'fulfilled') {
        sent++
      } else if (r.reason instanceof WebPushError && (r.reason.statusCode === 404 || r.reason.statusCode === 410)) {
        // Browser dropped this subscription — stop trying to send to it.
        dead.push(subscriptions[i].endpoint)
      }
    })
    if (dead.length) await removeSubscriptions(dead)

    return NextResponse.json({ sent, failed: results.length - sent, removed: dead.length })
  } catch (error) {
    console.error('Push send error:', error)
    return NextResponse.json({ error: 'Failed to send' }, { status: 500 })
  }
}
