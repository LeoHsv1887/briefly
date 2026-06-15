const MORNING_EVENING_THRESHOLD_HOUR = 14 // Vor dieser Uhrzeit (deutsche Zeit) gilt "morning"

export function getGermanHour(): number {
  return parseInt(
    new Intl.DateTimeFormat('de-DE', {
      timeZone: 'Europe/Berlin',
      hour: 'numeric',
      hour12: false,
    }).format(new Date()),
    10
  )
}

export function isMorningInGermany(): boolean {
  return getGermanHour() < MORNING_EVENING_THRESHOLD_HOUR
}
