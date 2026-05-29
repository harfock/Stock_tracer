export interface NewsItem {
  title: string;
  source: string;
  snippet: string;
}

export interface StockAnalysis {
  summary: string;
  sentiment: 'BULLISH' | 'BEARISH' | 'NEUTRAL';
  capitalFlow: string;
  inflowPercentage: number; // e.g. 64 for 64% main inflow
  news: NewsItem[];
  high: number;
  low: number;
  peRatio: string;
  marketCap: string;
  volume: string;
  price?: number;
  change?: number;
  changePercent?: number;
}

export interface Stock {
  symbol: string;
  name: string;
  price: number;
  change: number;
  changePercent: number;
  market: 'US' | 'HK' | 'A-Share';
  marketCap: string;
  peRatio: string;
  volume: string;
  high: number;
  low: number;
  history: number[]; // Array of last 20 price points
  analysis?: StockAnalysis;
}

export interface PriceAlert {
  id: string;
  symbol: string;
  condition: 'above' | 'below';
  value: number;
  active: boolean;
  triggeredAt?: string;
}

export interface MarketIndex {
  symbol: string;
  name: string;
  price: number;
  change: number;
  changePercent: number;
  market: 'US' | 'HK' | 'A-Share';
  history: number[];
}
