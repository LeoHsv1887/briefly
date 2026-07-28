'use client'
import { useEffect, useState } from 'react'
import { getPushStatus, isPushSupported, subscribeToPush } from '@/lib/push'

const PROMPT_DELAY_MS = 30_000

export function PushManager() {
  const [permission, setPermission] = useState<NotificationPermission>('default')
  const [showPrompt, setShowPrompt] = useState(false)
  const [subscribing, setSubscribing] = useState(false)

  useEffect(() => {
    if (!isPushSupported()) return
    getPushStatus().then(({ permission }) => setPermission(permission))

    if (Notification.permission === 'default') {
      const timer = setTimeout(() => setShowPrompt(true), PROMPT_DELAY_MS)
      return () => clearTimeout(timer)
    }
  }, [])

  async function handleSubscribe() {
    setSubscribing(true)
    const ok = await subscribeToPush()
    setSubscribing(false)
    setShowPrompt(false)
    if (ok) setPermission('granted')
  }

  if (!showPrompt || permission !== 'default') return null

  return (
    <div style={{
      position: 'fixed', bottom: 100, left: 16, right: 16, maxWidth: 448, margin: '0 auto', zIndex: 200,
      background: 'var(--bg1)', border: '0.5px solid var(--line)',
      borderRadius: 20, padding: '16px 18px',
      boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
    }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
        <div style={{
          width: 40, height: 40, borderRadius: 12, background: 'var(--bg2)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
        }}>
          <i className="ti ti-bell" style={{ fontSize: 18, color: 'var(--t2)' }} />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--t1)', marginBottom: 4 }}>
            Breaking News sofort erhalten?
          </div>
          <div style={{ fontSize: 12, color: 'var(--t3)', lineHeight: 1.5, marginBottom: 14 }}>
            Wir benachrichtigen dich bei wichtigen Nachrichten – maximal 3x täglich.
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <div onClick={handleSubscribe} style={{
              flex: 1, padding: '9px', borderRadius: 12,
              background: 'var(--acc)', color: '#fff',
              fontSize: 13, fontWeight: 700, textAlign: 'center',
              cursor: subscribing ? 'default' : 'pointer', opacity: subscribing ? 0.7 : 1,
            }}>
              {subscribing ? 'Aktiviert…' : 'Aktivieren'}
            </div>
            <div onClick={() => setShowPrompt(false)} style={{
              flex: 1, padding: '9px', borderRadius: 12,
              background: 'var(--bg2)', border: '0.5px solid var(--line)',
              color: 'var(--t3)', fontSize: 13, fontWeight: 600, textAlign: 'center', cursor: 'pointer',
            }}>
              Nicht jetzt
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
