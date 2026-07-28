'use client'

// Shared by both the permission-prompt banner (components/PushManager.tsx) and
// the Settings toggle — both need to reflect the same underlying browser
// subscription, so the logic to read/change it lives in one place instead of
// being duplicated (and drifting) across two components.

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const rawData = window.atob(base64)
  return Uint8Array.from([...rawData].map(char => char.charCodeAt(0)))
}

export function isPushSupported(): boolean {
  return typeof window !== 'undefined' && 'Notification' in window && 'serviceWorker' in navigator && 'PushManager' in window
}

export interface PushStatus {
  permission: NotificationPermission
  isSubscribed: boolean
}

export async function getPushStatus(): Promise<PushStatus> {
  if (!isPushSupported()) return { permission: 'denied', isSubscribed: false }
  const permission = Notification.permission
  try {
    const reg = await navigator.serviceWorker.getRegistration('/sw.js')
    const sub = await reg?.pushManager.getSubscription()
    return { permission, isSubscribed: !!sub }
  } catch {
    return { permission, isSubscribed: false }
  }
}

export async function subscribeToPush(): Promise<boolean> {
  if (!isPushSupported()) return false
  const vapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
  if (!vapidKey) {
    console.warn('NEXT_PUBLIC_VAPID_PUBLIC_KEY is not set — push notifications are disabled')
    return false
  }
  try {
    await navigator.serviceWorker.register('/sw.js')
    const reg = await navigator.serviceWorker.ready
    const sub = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(vapidKey) as BufferSource,
    })
    await fetch('/api/push/subscribe', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(sub),
    })
    return true
  } catch (err) {
    console.error('Push subscribe failed:', err)
    return false
  }
}

export async function unsubscribeFromPush(): Promise<void> {
  if (!isPushSupported()) return
  try {
    const reg = await navigator.serviceWorker.getRegistration('/sw.js')
    const sub = await reg?.pushManager.getSubscription()
    if (sub) {
      const endpoint = sub.endpoint
      await sub.unsubscribe()
      await fetch('/api/push/subscribe', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ endpoint }),
      })
    }
  } catch (err) {
    console.error('Push unsubscribe failed:', err)
  }
}
