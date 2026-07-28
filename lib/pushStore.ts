import { put } from '@vercel/blob'

// Same storage pattern as the existing podcast episodes (see app/api/podcast/*):
// plain JSON files in the project's Blob store, read via the public
// NEXT_PUBLIC_BLOB_URL and written via the server-only @vercel/blob SDK.

export interface StoredPushSubscription {
  endpoint: string
  expirationTime: number | null
  keys: { p256dh: string; auth: string }
}

const SUBSCRIPTIONS_BLOB = 'push-subscriptions.json'
const SENT_IDS_BLOB = 'push-sent-ids.json'
const MAX_SENT_IDS = 500

async function readJsonBlob<T>(filename: string, fallback: T): Promise<T> {
  if (!process.env.NEXT_PUBLIC_BLOB_URL) return fallback
  try {
    const res = await fetch(`${process.env.NEXT_PUBLIC_BLOB_URL}/${filename}`, { cache: 'no-store' })
    if (!res.ok) return fallback
    return (await res.json()) as T
  } catch {
    return fallback
  }
}

async function writeJsonBlob(filename: string, data: unknown): Promise<void> {
  await put(filename, JSON.stringify(data), {
    access: 'public',
    contentType: 'application/json',
    addRandomSuffix: false,
    allowOverwrite: true,
  })
}

export function getSubscriptions(): Promise<StoredPushSubscription[]> {
  return readJsonBlob<StoredPushSubscription[]>(SUBSCRIPTIONS_BLOB, [])
}

export async function addSubscription(sub: StoredPushSubscription): Promise<void> {
  const subs = (await getSubscriptions()).filter((s) => s.endpoint !== sub.endpoint)
  subs.push(sub)
  await writeJsonBlob(SUBSCRIPTIONS_BLOB, subs)
}

export async function removeSubscription(endpoint: string): Promise<void> {
  const subs = (await getSubscriptions()).filter((s) => s.endpoint !== endpoint)
  await writeJsonBlob(SUBSCRIPTIONS_BLOB, subs)
}

// Called when a push actually fails to deliver (e.g. 404/410 = the browser
// dropped the subscription) so dead endpoints don't pile up forever.
export async function removeSubscriptions(endpoints: string[]): Promise<void> {
  if (!endpoints.length) return
  const subs = (await getSubscriptions()).filter((s) => !endpoints.includes(s.endpoint))
  await writeJsonBlob(SUBSCRIPTIONS_BLOB, subs)
}

export function getSentArticleIds(): Promise<string[]> {
  return readJsonBlob<string[]>(SENT_IDS_BLOB, [])
}

export async function saveSentArticleIds(ids: string[]): Promise<void> {
  await writeJsonBlob(SENT_IDS_BLOB, ids.slice(-MAX_SENT_IDS))
}
