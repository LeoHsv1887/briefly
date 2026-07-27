'use client'

export type Tab = 'feed' | 'news' | 'briefing' | 'maerkte' | 'settings'

const tabs: { id: Tab; icon: string; label: string }[] = [
  { id: 'feed',     icon: 'ti-home',        label: 'Feed' },
  { id: 'news',     icon: 'ti-news',        label: 'News' },
  { id: 'briefing', icon: 'ti-microphone',  label: 'Briefing' },
  { id: 'maerkte',  icon: 'ti-trending-up', label: 'Märkte' },
  { id: 'settings', icon: 'ti-settings',    label: 'Settings' },
]

interface Props {
  activeTab: Tab
  onTabChange: (tab: Tab) => void
}

export function BottomNav({ activeTab, onTabChange }: Props) {
  return (
    <div style={{
      position: 'fixed', bottom: 0, left: '50%', transform: 'translateX(-50%)',
      width: '100%', maxWidth: 480,
      display: 'flex', justifyContent: 'space-around', alignItems: 'center',
      padding: '14px 16px calc(14px + env(safe-area-inset-bottom, 0px))',
      background: 'rgba(var(--bg0-rgb), 0.95)',
      backdropFilter: 'blur(24px)', WebkitBackdropFilter: 'blur(24px)',
      borderTop: '0.5px solid var(--line)',
      zIndex: 100,
    }}>
      {tabs.map((tab, i) => {
        const isActive = activeTab === tab.id
        const isMid = i === 2
        return (
          <div
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            role="button"
            aria-label={tab.label}
            style={{
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
              padding: isMid ? '9px 20px' : '7px 14px',
              borderRadius: isMid ? 18 : 14,
              background: isMid
                ? (isActive ? 'rgba(37,99,235,0.9)' : 'rgba(37,99,235,0.15)')
                : (isActive ? 'var(--bg2)' : 'transparent'),
              color: isMid
                ? (isActive ? '#ffffff' : 'rgba(147,197,253,0.7)')
                : (isActive ? 'var(--t1)' : 'var(--t4)'),
              transform: isMid ? 'translateY(-5px)' : 'none',
              boxShadow: isMid && isActive ? '0 4px 20px rgba(37,99,235,0.35)' : 'none',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
            }}
          >
            <i className={`ti ${tab.icon}`} style={{ fontSize: isMid ? 22 : 20 }} />
            <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.03em' }}>{tab.label}</span>
          </div>
        )
      })}
    </div>
  )
}
