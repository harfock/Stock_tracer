export interface NewsItem {
  title: string;
  source: string;
  snippet: string;
  url?: string;
}

export interface PolymarketContract {
  id: string;
  question: string;
  outcomes: string[];
  outcomePrices: string[];
  volume: string;
  liquidity: string;
  endDate: string;
  slug: string;
}

export interface BuyPutConsensus {
  hasSignalSources: boolean;
  putCallRatio: number;
  buySignalPercent: number; // scale out of 100
  recommendation: 'STRONG BUY' | 'BUY' | 'NEUTRAL' | 'PUT/SELL' | 'STRONG PUT/SELL';
  supportingWebSources: string[];
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
  polymarketContracts?: PolymarketContract[];
  buyPutConsensus?: BuyPutConsensus;
}

export interface Stock {
  symbol: string;
  name: string;
  price: number;
  change: number;
  changePercent: number;
  market: 'US' | 'HK' | 'A-Share' | 'TW' | 'UK' | 'JP' | 'Europe' | 'Canada' | 'Australia' | 'Singapore' | 'Other';
  marketCap: string;
  peRatio: string;
  volume: string;
  high: number;
  low: number;
  history: number[]; // Array of last 20 price points
  analysis?: StockAnalysis;
  lastUpdated?: string;
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
  market: 'US' | 'HK' | 'A-Share' | 'TW' | 'UK' | 'JP' | 'Europe' | 'Canada' | 'Australia' | 'Singapore' | 'Other';
  history: number[];
  lastUpdated?: string;
}
