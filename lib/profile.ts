import { TOPICS } from './types';
import type { Settings } from './types';

export { TOPICS };

export const DEFAULT_SETTINGS: Settings = {
  username: 'Leonard',
  minScore: 6,
  enabledTopics: [
    'Wirtschaft & Finanzen',
    'Politik DE/EU',
    'Geopolitik',
    'Aktienmärkte',
    'Technologie & KI',
    'Sport',
    'Allgemein',
  ],
  summariesInGerman: true,
};

const SETTINGS_KEY = 'briefly_settings';
const PROFILE_KEY = 'briefly_profile';
const SAVED_KEY = 'briefly_saved';

export function getSettings(): Settings {
  if (typeof window === 'undefined') return DEFAULT_SETTINGS;
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    return raw ? { ...DEFAULT_SETTINGS, ...JSON.parse(raw) } : DEFAULT_SETTINGS;
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export function saveSettings(patch: Partial<Settings>): void {
  if (typeof window === 'undefined') return;
  const current = getSettings();
  localStorage.setItem(SETTINGS_KEY, JSON.stringify({ ...current, ...patch }));
}

export function getInterestProfile(): Record<string, number> {
  if (typeof window === 'undefined') return {};
  try {
    const raw = localStorage.getItem(PROFILE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

export function trackInteraction(topic: string): void {
  if (typeof window === 'undefined') return;
  const p = getInterestProfile();
  p[topic] = (p[topic] || 0) + 1;
  localStorage.setItem(PROFILE_KEY, JSON.stringify(p));
}

export function resetInterestProfile(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(PROFILE_KEY);
}

export function getSavedIds(): Set<string> {
  if (typeof window === 'undefined') return new Set();
  try {
    const raw = localStorage.getItem(SAVED_KEY);
    return raw ? new Set(JSON.parse(raw)) : new Set();
  } catch {
    return new Set();
  }
}

export function toggleSaved(id: string): Set<string> {
  const saved = getSavedIds();
  if (saved.has(id)) saved.delete(id);
  else saved.add(id);
  localStorage.setItem(SAVED_KEY, JSON.stringify([...saved]));
  return saved;
}
