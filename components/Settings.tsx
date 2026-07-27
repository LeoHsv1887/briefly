'use client'
import type { Settings } from '@/lib/types'
import { TOPICS, resetInterestProfile } from '@/lib/profile'
import { getTopicShortLabel } from '@/lib/topicColors'

interface SettingsProps {
  settings: Settings
  onChange: (s: Settings) => void
  onOpenBookmarks?: () => void
  bookmarkCount?: number
}

function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <div onClick={() => onChange(!checked)} role="switch" aria-checked={checked} style={{
      position: 'relative', flexShrink: 0, width: 40, height: 24, borderRadius: 100, cursor: 'pointer',
      background: checked ? 'var(--up)' : 'var(--bg3)', transition: 'background 0.15s ease',
    }}>
      <span style={{
        position: 'absolute', top: 2, left: checked ? 18 : 2, width: 20, height: 20, borderRadius: '50%',
        background: '#fff', boxShadow: '0 1px 3px rgba(0,0,0,0.3)', transition: 'left 0.15s ease',
      }} />
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 22 }}>
      <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--t4)', letterSpacing: '0.09em', textTransform: 'uppercase', padding: '0 20px 8px' }}>
        {title}
      </div>
      <div style={{ margin: '0 14px', background: 'var(--bg1)', border: '0.5px solid var(--line)', borderRadius: 16, overflow: 'hidden' }}>
        {children}
      </div>
    </div>
  )
}

function Row({ label, children, isLast, onClick }: { label: string; children?: React.ReactNode; isLast?: boolean; onClick?: () => void }) {
  return (
    <div onClick={onClick} style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '13px 16px', borderBottom: isLast ? 'none' : '0.5px solid var(--line)',
      cursor: onClick ? 'pointer' : 'default',
    }}>
      <span style={{ fontSize: 14, color: 'var(--t1)' }}>{label}</span>
      {children}
    </div>
  )
}

export default function SettingsPanel({ settings, onChange, onOpenBookmarks, bookmarkCount = 0 }: SettingsProps) {
  const update = (patch: Partial<Settings>) => onChange({ ...settings, ...patch })

  const toggleTopic = (topic: string) => {
    const has = settings.enabledTopics.includes(topic)
    update({
      enabledTopics: has
        ? settings.enabledTopics.filter(t => t !== topic)
        : [...settings.enabledTopics, topic],
    })
  }

  return (
    <div>
      <div style={{ padding: '16px 20px 18px' }}>
        <div style={{ fontSize: 28, fontWeight: 800, color: 'var(--t1)', letterSpacing: '-0.03em' }}>Einstellungen</div>
      </div>

      <Section title="Profil">
        <div style={{ padding: '13px 16px' }}>
          <label style={{ fontSize: 11, color: 'var(--t4)', display: 'block', marginBottom: 6 }}>Name</label>
          <input
            type="text"
            value={settings.username}
            onChange={e => update({ username: e.target.value })}
            placeholder="Dein Name"
            style={{
              width: '100%', background: 'var(--bg2)', border: '0.5px solid var(--line)', borderRadius: 10,
              padding: '9px 12px', fontSize: 14, color: 'var(--t1)', outline: 'none',
            }}
          />
        </div>
      </Section>

      <Section title="Gespeichert">
        <Row label={`Deine Artikel${bookmarkCount ? ` (${bookmarkCount})` : ''}`} isLast onClick={onOpenBookmarks}>
          <i className="ti ti-chevron-right" style={{ fontSize: 15, color: 'var(--t4)' }} />
        </Row>
      </Section>

      <Section title="Themen">
        {TOPICS.map((topic, i) => (
          <Row key={topic} label={getTopicShortLabel(topic)} isLast={i === TOPICS.length - 1}>
            <Toggle checked={settings.enabledTopics.includes(topic)} onChange={() => toggleTopic(topic)} />
          </Row>
        ))}
      </Section>

      <Section title="Feed">
        <div style={{ padding: '13px 16px', borderBottom: '0.5px solid var(--line)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
            <span style={{ fontSize: 14, color: 'var(--t1)' }}>Relevanz-Schwelle</span>
            <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--t1)' }}>{settings.minScore}</span>
          </div>
          <input
            type="range" min={5} max={9} step={1} value={settings.minScore}
            onChange={e => update({ minScore: Number(e.target.value) })}
            style={{ width: '100%' }}
          />
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4 }}>
            <span style={{ fontSize: 10, color: 'var(--t4)' }}>5 – Mehr Artikel</span>
            <span style={{ fontSize: 10, color: 'var(--t4)' }}>9 – Nur Top-Artikel</span>
          </div>
        </div>
        <Row label="Zusammenfassungen auf Deutsch" isLast>
          <Toggle checked={settings.summariesInGerman} onChange={v => update({ summariesInGerman: v })} />
        </Row>
      </Section>

      <Section title="Interesse-Profil">
        <div style={{ padding: '14px 16px' }}>
          <p style={{ fontSize: 12, color: 'var(--t3)', lineHeight: 1.6, marginBottom: 12 }}>
            Briefly lernt aus deinen Klicks, welche Themen dir wichtig sind. Das beeinflusst die Sortierung deines Feeds.
          </p>
          <div
            onClick={() => { resetInterestProfile(); alert('Interesse-Profil wurde zurückgesetzt.') }}
            style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 13, color: 'var(--dn)', cursor: 'pointer' }}
          >
            <i className="ti ti-refresh" style={{ fontSize: 14 }} />
            Profil zurücksetzen
          </div>
        </div>
      </Section>

      <div style={{ padding: '0 20px 32px', textAlign: 'center' }}>
        <span style={{ fontSize: 11, color: 'var(--t5)' }}>Briefly · Powered by Claude AI</span>
      </div>
    </div>
  )
}
