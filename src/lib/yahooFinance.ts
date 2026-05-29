/**
 * Utility to fetch real-time and historical stock data from Yahoo Finance directly in the browser
 * using free, public, high-availability CORS proxies.
 * This enables fully real-time stock tracking even on serverless static hosting such as GitHub Pages!
 */

const CORS_PROXIES = [
  (url: string) => `https://corsproxy.io/?url=${encodeURIComponent(url)}`,
  (url: string) => `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`,
];

/**
 * Trims and maps common placeholder index symbols to Yahoo-compatible tickers.
 */
function cleanSymbolName(symbol: string): string {
  let s = symbol.trim().toUpperCase();
  if (s === 'HSI') return '^HSI';
  if (s === '.IXIC') return '^IXIC';
  if (s === '.DJI') return '^DJI';
  return s;
}

/**
 * Fetches real-time price quotation for list of symbols via browser CORS proxy.
 */
export async function clientSideFetchYahooQuotes(symbols: string[]): Promise<any[]> {
  const results: any[] = [];
  
  for (const sym of symbols) {
    const cleanSym = cleanSymbolName(sym);
    const targetUrl = `https://query1.finance.yahoo.com/v8/finance/chart/${cleanSym}?range=1d&interval=5m`;
    
    let success = false;
    let fallbackData: any = null;
    
    for (const proxyFn of CORS_PROXIES) {
      try {
        const url = proxyFn(targetUrl);
        const res = await fetch(url);
        if (!res.ok) continue;
        
        const json = await res.json();
        const result = json?.chart?.result?.[0];
        if (!result) continue;
        
        const meta = result.meta;
        const price = meta.regularMarketPrice;
        const prevClose = meta.previousClose !== undefined ? meta.previousClose : (meta.chartPreviousClose !== undefined ? meta.chartPreviousClose : price);
        const change = price - prevClose;
        const changePercent = prevClose !== 0 ? (change / prevClose) * 100 : 0;
        
        const indicators = result.indicators?.quote?.[0] || {};
        const highs = (indicators.high || []).filter((h: any) => typeof h === 'number' && h !== null);
        const lows = (indicators.low || []).filter((l: any) => typeof l === 'number' && l !== null);
        const closes = (indicators.close || []).filter((c: any) => typeof c === 'number' && c !== null);
        const volumes = (indicators.volume || []).filter((v: any) => typeof v === 'number' && v !== null);
        
        const high = highs.length ? Math.max(...highs) : (meta.regularMarketDayHigh || price);
        const low = lows.length ? Math.min(...lows) : (meta.regularMarketDayLow || price);
        const sumVolume = volumes.length ? volumes.reduce((acc: number, val: number) => acc + val, 0) : 0;
        const history = closes.slice(-20);
        
        let volumeStr = 'N/A';
        if (sumVolume > 1000000) {
          volumeStr = `${(sumVolume / 1000000).toFixed(1)}M`;
        } else if (sumVolume > 1000) {
          volumeStr = `${(sumVolume / 1000).toFixed(0)}K`;
        }
        
        fallbackData = {
          symbol: sym,
          success: true,
          data: {
            price: Number(price.toFixed(2)),
            change: Number(change.toFixed(2)),
            changePercent: Number(changePercent.toFixed(2)),
            high: Number(high.toFixed(2)),
            low: Number(low.toFixed(2)),
            volume: volumeStr,
            history: history.length >= 3 ? history : [price * 0.99, price * 1.01, price]
          }
        };
        success = true;
        break; // break the proxy loop for this symbol
      } catch (err) {
        console.warn(`[Proxy Fallback Warn] symbol ${sym} failed to load from proxy:`, err);
      }
    }
    
    if (success && fallbackData) {
      results.push(fallbackData);
    } else {
      results.push({ symbol: sym, success: false, error: 'Failed to retrieve via any CORS proxy' });
    }
  }
  
  return results;
}

/**
 * Fetches historical multi-day chart points for a specific ticker symbol.
 */
export async function clientSideFetchHistoricalChart(symbol: string, range: string): Promise<any[]> {
  const cleanSym = cleanSymbolName(symbol);
  
  let interval = '1d';
  if (range === '1d') interval = '5m';
  else if (range === '5d') interval = '15m';
  else if (range === '1mo') interval = '1d';
  else if (range === '1y') interval = '1d';
  else if (range === '3y') interval = '1wk';
  
  const targetUrl = `https://query1.finance.yahoo.com/v8/finance/chart/${cleanSym}?range=${range}&interval=${interval}`;
  
  for (const proxyFn of CORS_PROXIES) {
    try {
      const url = proxyFn(targetUrl);
      const res = await fetch(url);
      if (!res.ok) continue;
      
      const json = await res.json();
      const result = json?.chart?.result?.[0];
      if (!result) continue;
      
      const timestamps = result.timestamp || [];
      const quote = result.indicators?.quote?.[0] || {};
      const closes = quote.close || [];
      const volumes = quote.volume || [];
      
      const dataPoints: any[] = [];
      let lastPrice = result.meta?.regularMarketPrice || 100;
      
      for (let i = 0; i < timestamps.length; i++) {
        const time = timestamps[i] * 1000;
        let price = closes[i];
        let volume = volumes[i];
        
        if (price === null || price === undefined || isNaN(price)) {
          price = lastPrice;
        } else {
          lastPrice = price;
        }
        
        if (volume === null || volume === undefined || isNaN(volume)) {
          volume = 0;
        }
        
        dataPoints.push({
          time,
          price: Number(price.toFixed(2)),
          volume: Number(volume)
        });
      }
      
      if (dataPoints.length > 0) {
        return dataPoints;
      }
    } catch (err) {
      console.warn(`[Proxy Chart Fail] range ${range} for ${symbol}:`, err);
    }
  }
  
  throw new Error("Could not pull historical data from Yahoo via CORS proxies");
}
