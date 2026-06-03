export const TOPICS = [
  'Wirtschaft & Finanzen',
  'Politik DE/EU',
  'Geopolitik',
  'Aktienmärkte',
  'Technologie & KI',
  'Sport',
] as const;

export type Topic = (typeof TOPICS)[number];

export interface Article {
  id: string;
  title: string;
  url: string;
  source: string;
  publishedAt: string;
  topic: string;
  score: number;
  content?: string;
  imageUrl?: string | null;
}

export interface TickerData {
  symbol: string;
  name: string;
  value: number;
  change: number;
  changePercent: number;
  isPositive: boolean;
  formattedValue: string;
  isMarketOpen: boolean;
}

export interface WeatherData {
  temperature: number;
  feelsLike: number;
  weatherCode: number;
  windSpeed: number;
  humidity: number;
  tempMax: number;
  tempMin: number;
}

export interface StockQuote {
  symbol: string;
  price: number;
  change: number;
  changePercent: number;
  open: number;
  high: number;
  low: number;
  volume: number;
  prevClose: number;
  isPositive: boolean;
}

export interface StockSearchResult {
  symbol: string;
  name: string;
  exchange: string;
  currency: string;
}

export interface HistoryPoint {
  date: string;
  close: number;
}

export interface StockNewsItem {
  title: string;
  url: string;
  source: string;
  publishedAt: string;
  symbol: string;
}

export interface FavoriteStock {
  symbol: string;
  name: string;
  exchange: string;
}

export interface Settings {
  username: string;
  minScore: number;
  enabledTopics: string[];
  summariesInGerman: boolean;
}
