# Briefly

Dein persönlicher, KI-kuratierter News-Feed. Eine mobile-optimierte PWA die morgens und abends alle relevanten News auf einen Blick zeigt – kuratiert von Claude AI.

## Features

- **KI-Kuratierung** – Claude Haiku bewertet jeden Artikel und weist ihn einem Thema zu
- **18 News-Quellen** – Spiegel, FAZ, Zeit, Handelsblatt, Reuters + Google News Feeds
- **Live-Ticker** – DAX, S&P 500, BTC/USD, EUR/USD (aktualisiert alle 5 Min.)
- **Wetter** – Aktuelles Wetter für Warendorf via Open-Meteo (kostenlos, kein API-Key)
- **KI-Zusammenfassungen** – On-demand 3–5-Satz-Zusammenfassungen auf Knopfdruck
- **Bookmark-Funktion** – Artikel für später speichern
- **Suchfunktion** – Artikel nach Titel/Quelle durchsuchen
- **Interesse-Tracking** – App lernt aus Klicks, welche Themen dir wichtig sind
- **PWA** – Auf dem iPhone/Android-Homescreen installierbar

## Technologie

- Next.js 15 (App Router) + TypeScript
- Tailwind CSS v4
- Anthropic SDK (claude-haiku-4-5)
- @ducanh2912/next-pwa
- rss-parser

## Lokaler Setup

### 1. Dependencies installieren

```bash
npm install
```

### 2. Umgebungsvariablen setzen

```bash
cp .env.local.example .env.local
```

Trage deinen Anthropic API Key in `.env.local` ein:

```
ANTHROPIC_API_KEY=sk-ant-...
```

> **Ohne API Key** funktioniert die App – Artikel erhalten dann nur Default-Scores (5/10) statt KI-Bewertungen.

### 3. Entwicklungsserver starten

```bash
npm run dev
```

Öffne [http://localhost:3000](http://localhost:3000) im Browser.

## Deployment auf Vercel

```bash
npx vercel deploy
```

Oder verbinde das Repository auf [vercel.com](https://vercel.com) und setze die Environment Variable `ANTHROPIC_API_KEY` in den Vercel Project Settings.

## Benötigte API Keys

| Service | Woher | Kosten |
|---------|-------|--------|
| **Anthropic** | [console.anthropic.com](https://console.anthropic.com) | Pay-as-you-go (~$0.0004/1K Tokens für Haiku) |
| Open-Meteo (Wetter) | Kein Key nötig | Kostenlos |
| Yahoo Finance (Ticker) | Kein Key nötig | Kostenlos (inoffiziell) |

## Konfiguration

### Wetter-Standort ändern

In `app/api/weather/route.ts`:
```typescript
const LAT = 51.9427; // Deine Latitude
const LON = 7.9827;  // Deine Longitude
```

### Eigene RSS-Feeds hinzufügen

In `lib/feeds.ts` das `FEEDS`-Array erweitern:
```typescript
{ url: 'https://dein-feed.de/rss.xml', source: 'Mein Feed' }
```

### Cache-Zeiten anpassen

- Feeds: `app/api/feeds/route.ts` → `revalidate = 1800` (30 Min.)
- Ticker: `app/api/tickers/route.ts` → `revalidate = 300` (5 Min.)
- Wetter: `app/api/weather/route.ts` → `revalidate = 3600` (1 Std.)
