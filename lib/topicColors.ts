export type Topic = string

export function getTopicColors(topic: Topic) {
  const t = topic?.toLowerCase() ?? ''
  if (t.includes('wirtschaft') || t.includes('finanzen') || t.includes('aktien') || t.includes('investing') || t.includes('markt') || t.includes('märkte'))
    return { color: 'var(--eco)', bg: 'var(--eco-bg)', border: 'var(--eco-border)' }
  if (t.includes('politik') || t.includes('geopolitik') || t.includes('welt') || t.includes('eu'))
    return { color: 'var(--pol)', bg: 'var(--pol-bg)', border: 'var(--pol-border)' }
  if (t.includes('tech') || t.includes(' ki') || t.startsWith('ki') || t.includes('&ki'))
    return { color: 'var(--tec)', bg: 'var(--tec-bg)', border: 'var(--tec-border)' }
  if (t.includes('gründer') || t.includes('startup'))
    return { color: 'var(--sta)', bg: 'var(--sta-bg)', border: 'var(--sta-border)' }
  if (t.includes('münster') || t.includes('lokal') || t.includes('region') || t.includes('badbergen') || t.includes('osnabrück'))
    return { color: 'var(--lok)', bg: 'var(--lok-bg)', border: 'var(--lok-border)' }
  if (t.includes('sport'))
    return { color: 'var(--spo)', bg: 'var(--spo-bg)', border: 'var(--spo-border)' }
  return { color: 'var(--t3)', bg: 'var(--bg2)', border: 'var(--line)' }
}

export function getTopicIcon(topic: Topic): string {
  const t = topic?.toLowerCase() ?? ''
  if (t.includes('wirtschaft') || t.includes('finanzen')) return 'ti-chart-bar'
  if (t.includes('aktien') || t.includes('investing') || t.includes('markt') || t.includes('märkte')) return 'ti-trending-up'
  if (t.includes('politik') || t.includes('eu')) return 'ti-building'
  if (t.includes('geopolitik') || t.includes('welt')) return 'ti-world'
  if (t.includes('tech') || t.includes('ki')) return 'ti-cpu'
  if (t.includes('gründer') || t.includes('startup')) return 'ti-rocket'
  if (t.includes('münster') || t.includes('lokal') || t.includes('badbergen') || t.includes('osnabrück')) return 'ti-map-pin'
  if (t.includes('sport')) return 'ti-ball-football'
  return 'ti-file-text'
}

export function getTopicShortLabel(topic: Topic): string {
  const map: Record<string, string> = {
    'Wirtschaft & Finanzen': 'Wirtschaft',
    'Aktienmärkte': 'Märkte',
    'Aktienmärkte & Investing': 'Märkte',
    'Politik DE/EU': 'Politik',
    'Geopolitik': 'Geopolitik',
    'Geopolitik & Welt': 'Geopolitik',
    'Technologie & KI': 'Tech & KI',
    'Gründer & Startups': 'Startups',
    'Münster & Region': 'Münster',
    'Badbergen & Osnabrücker Land': 'Lokal',
    'Sport': 'Sport',
    'Allgemein': 'Allgemein',
  }
  return map[topic] ?? topic
}
