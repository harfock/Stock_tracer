import { Stock, MarketIndex } from './types';

// Helper to generate a baseline history curve
function generateHistory(base: number, count: number = 20, volatility: number = 0.015): number[] {
  const result: number[] = [];
  let curr = base * 0.95;
  for (let i = 0; i < count; i++) {
    const change = (Math.random() - 0.48) * volatility;
    curr = curr * (1 + change);
    result.push(Number(curr.toFixed(2)));
  }
  return result;
}

export const initialIndices: MarketIndex[] = [
  {
    symbol: '.IXIC',
    name: 'NASDAQ Composite',
    price: 18237.42,
    change: 124.60,
    changePercent: 0.69,
    market: 'US',
    history: generateHistory(18237.42, 12, 0.005)
  },
  {
    symbol: '.DJI',
    name: 'Dow Jones Ind.',
    price: 39127.14,
    change: -45.12,
    changePercent: -0.12,
    market: 'US',
    history: generateHistory(39127.14, 12, 0.004)
  },
  {
    symbol: 'HSI',
    name: 'Hang Seng Index / 恒生指數',
    price: 18451.25,
    change: 342.18,
    changePercent: 1.89,
    market: 'HK',
    history: generateHistory(18451.25, 12, 0.008)
  },
  {
    symbol: '000001.SS',
    name: 'SSE Composite / 上證指數',
    price: 3110.42,
    change: 14.53,
    changePercent: 0.47,
    market: 'A-Share',
    history: generateHistory(3110.42, 12, 0.005)
  }
];

export const initialStocks: Stock[] = [
  {
    symbol: 'AAPL',
    name: 'Apple Inc.',
    price: 189.84,
    change: 2.15,
    changePercent: 1.15,
    market: 'US',
    marketCap: '$2.94T',
    peRatio: '28.4',
    volume: '52.4M',
    high: 191.20,
    low: 186.40,
    history: generateHistory(189.84, 20, 0.01)
  },
  {
    symbol: 'TSLA',
    name: 'Tesla Inc.',
    price: 179.24,
    change: -4.82,
    changePercent: -2.62,
    market: 'US',
    marketCap: '$571.3B',
    peRatio: '58.9',
    volume: '88.1M',
    high: 185.34,
    low: 176.01,
    history: generateHistory(179.24, 20, 0.02)
  },
  {
    symbol: 'NVDA',
    name: 'NVIDIA Corp.',
    price: 948.90,
    change: 24.18,
    changePercent: 2.61,
    market: 'US',
    marketCap: '$2.37T',
    peRatio: '74.2',
    volume: '41.8M',
    high: 955.00,
    low: 916.20,
    history: generateHistory(948.90, 20, 0.025)
  },
  {
    symbol: 'MSFT',
    name: 'Microsoft Corp.',
    price: 415.62,
    change: 1.42,
    changePercent: 0.34,
    market: 'US',
    marketCap: '$3.09T',
    peRatio: '35.6',
    volume: '23.1M',
    high: 418.20,
    low: 412.10,
    history: generateHistory(415.63, 20, 0.008)
  },
  {
    symbol: '0700.HK',
    name: 'Tencent / 騰訊控股',
    price: 382.40,
    change: 11.20,
    changePercent: 3.02,
    market: 'HK',
    marketCap: 'HK$3.61T',
    peRatio: '21.5',
    volume: '18.4M',
    high: 385.00,
    low: 371.40,
    history: generateHistory(382.40, 20, 0.012)
  },
  {
    symbol: '9988.HK',
    name: 'Alibaba / 阿里巴巴-W',
    price: 78.65,
    change: 1.45,
    changePercent: 1.88,
    market: 'HK',
    marketCap: 'HK$1.52T',
    peRatio: '14.2',
    volume: '29.3M',
    high: 79.40,
    low: 76.80,
    history: generateHistory(78.65, 20, 0.015)
  },
  {
    symbol: '3690.HK',
    name: 'Meituan / 美團-W',
    price: 118.90,
    change: -2.30,
    changePercent: -1.90,
    market: 'HK',
    marketCap: 'HK$741.5B',
    peRatio: '32.1',
    volume: '22.9M',
    high: 122.30,
    low: 116.50,
    history: generateHistory(118.90, 20, 0.02)
  },
  {
    symbol: '600519.SS',
    name: 'Kweichow Moutai / 貴州茅台',
    price: 1684.50,
    change: 18.50,
    changePercent: 1.11,
    market: 'A-Share',
    marketCap: '¥2.12T',
    peRatio: '28.1',
    volume: '3.1M',
    high: 1698.00,
    low: 1662.00,
    history: generateHistory(1684.50, 20, 0.007)
  },
  {
    symbol: '300750.SZ',
    name: 'CATL / 寧德時代',
    price: 198.80,
    change: -1.20,
    changePercent: -0.60,
    market: 'A-Share',
    marketCap: '¥874.5B',
    peRatio: '19.4',
    volume: '12.4M',
    high: 202.40,
    low: 195.60,
    history: generateHistory(198.80, 20, 0.018)
  }
];
