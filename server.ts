import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI, Type } from '@google/genai';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const PORT = 3000;

// JSON request body parser
app.use(express.json());

// Initialize Gemini client dynamically or lazily
function getGeminiClient(customApiKey?: string): GoogleGenAI | null {
  const apiKey = customApiKey || process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.warn("⚠️ [GEMINI] No GEMINI_API_KEY available (neither passed nor configured in server environment).");
    return null;
  }
  try {
    return new GoogleGenAI({
      apiKey: apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        }
      }
    });
  } catch (error) {
    console.error("❌ Failed to initialize GoogleGenAI client:", error);
    return null;
  }
}

// Helper to determine request authorization and mode
function determineAuth(req: any) {
  const customKey = req.headers['x-gemini-api-key'] as string | undefined;
  const adminPasscode = req.headers['x-admin-passcode'] as string | undefined;

  // Let client use their own local browser-stored key
  if (customKey && customKey.trim().length > 10) {
    return {
      authorized: true,
      mode: 'Client-Key',
      apiKey: customKey.trim()
    };
  }

  // Check master admin passcode
  const masterPasscode = process.env.ADMIN_PASSCODE || 'admin';
  const hasServerKey = !!process.env.GEMINI_API_KEY;

  if (adminPasscode === masterPasscode && hasServerKey) {
    return {
      authorized: true,
      mode: 'Server-Key-Authorized',
      apiKey: process.env.GEMINI_API_KEY
    };
  }

  return {
    authorized: false,
    mode: 'Protected-Local-Simulation'
  };
}

// Helper to generate dynamic, smart offline responses
function generateLocalChatResponse(message: string, watchlist: string[]): string {
  const msg = message.toLowerCase();
  const stocksStr = watchlist && watchlist.length > 0 ? watchlist.join(', ') : 'None';
  
  let reply = `👋 Hello! I am operating in **Protected Local Simulator Mode** to reduce Gemini API consumption and protect private keys. 

I can see your active watchlist symbols: **${stocksStr}**. `;

  if (msg.includes('hello') || msg.includes('hi') || msg.includes('hey')) {
    reply += `How can I help you analyze your portfolio today? You can ask me about recent trends, setting price threshold triggers, or general trading strategies. 

To unlock active high-premium real-time searches via Gemini, click the **Settings & Keys** button on the top right to configure either the Master Passcode or your own personal API key!`;
  } else if (msg.includes('buy') || msg.includes('sell') || msg.includes('trade')) {
    reply += `When drafting custom entry or exit triggers, retail capital inflows remain critical:
- **Technical Analysis**: Consider placing alerts ±2% near the 20-day moving average to secure momentum entry.
- **Risk Control**: A strict 1.5% capital stop-loss per transaction is recommended on volatilized tickers.

If you unlock real-time Gemini Search Grounding, I can scrape active market order streams to search for real institutional sentiment!`;
  } else if (msg.includes('apple') || msg.includes('aapl')) {
    reply += `Apple Inc. (AAPL) is showing long-term stability near local support boundaries. Institutional inflow is solid at ~58%. Investors are looking ahead to future device refresh cycles and AI service integrations.`;
  } else if (msg.includes('tesla') || msg.includes('tsla')) {
    reply += `Tesla Inc. (TSLA) maintains high volatility driven by global retail sentiment. Chart levels demonstrate active fight around support. PE remains elevated (~58.9), recommending tight alert rules on below-breakouts.`;
  } else if (msg.includes('nvda') || msg.includes('nvidia')) {
    reply += `NVIDIA Corp. (NVDA) is consolidating after an aggressive uptrend cycle. Institutional net inflow is very strong at ~74%. It is highly responsive to tech sector volume spikes.`;
  } else if (msg.includes('pe') || msg.includes('ratio')) {
    reply += `A company's P/E (Price-to-Earnings) ratio serves as a primary relative valuation tool. For our watchlist:
- Growth sectors like Tech (e.g., NVDA, PE: 74.2) command extreme multipliers due to projected earnings growth.
- Value sectors show more consolidated multipliers (e.g., Alibaba, PE: 14.2). 
Always combine PE ratios with active day highs/lows for local momentum evaluation!`;
  } else if (msg.includes('alert') || msg.includes('bell') || msg.includes('alarm')) {
    reply += `Setting local price alerts is the best way to monitor markets passively! You can click on any stock row, select "Price Rises Above" or "Price Drops Below", enter a target threshold, and tap "Add Rule". When that price is crossed in our live feed, our alert system will fire a real-time header distress alarm!`;
  } else {
    reply += `To evaluate **"${message}"** with full real-time web searches, configure your private credentials under the settings widget. 

In the meantime, local charts indicate that tracking tech sector indices (.IXIC) is highly useful to determine the day's trend before allocating capital to active watchlist tickers! Let me know if you would like me to discuss portfolio management basics.`;
  }

  return reply;
}


// Helper to provide realistic mocked fallback stock responses in case AI is offline or key is empty
function getMockDataFallback(symbol: string, market: string) {
  const sym = symbol.toUpperCase();
  let basePrice = 150;
  let name = symbol;
  let cap = '$200B';
  let pe = '25.4';
  let vol = '12.4M';

  if (sym.includes('AAPL')) {
    basePrice = 189.84;
    name = "Apple Inc.";
    cap = '$2.94T';
    pe = '28.4';
    vol = '45.1M';
  } else if (sym.includes('TSLA')) {
    basePrice = 179.24;
    name = "Tesla Inc.";
    cap = '$571.3B';
    pe = '58.9';
    vol = '82.5M';
  } else if (sym.includes('NVDA')) {
    basePrice = 948.90;
    name = "NVIDIA Corporation";
    cap = '$2.37T';
    pe = '74.2';
    vol = '41.8M';
  } else if (sym.includes('0700')) {
    basePrice = 382.40;
    name = "Tencent Holdings Ltd / 騰訊控股";
    cap = 'HK$3.61T';
    pe = '21.5';
    vol = '18.4M';
  } else if (sym.includes('9988')) {
    basePrice = 78.65;
    name = "Alibaba Group / 阿里巴巴-W";
    cap = 'HK$1.52T';
    pe = '14.2';
    vol = '29.3M';
  } else {
    // Arbitrary ticker fallback
    basePrice = Math.floor(Math.random() * 300) + 10;
    cap = `$${(Math.random() * 500 + 10).toFixed(1)}B`;
    pe = (Math.random() * 40 + 5).toFixed(1);
    vol = `${(Math.random() * 20 + 1).toFixed(1)}M`;
  }

  const change = (Math.random() * 8 - 4);
  const changePercent = (change / basePrice) * 100;
  const isUp = change >= 0;

  return {
    price: Number((basePrice + change).toFixed(2)),
    change: Number(change.toFixed(2)),
    changePercent: Number(changePercent.toFixed(2)),
    marketCap: cap,
    peRatio: pe,
    volume: vol,
    high: Number((basePrice + Math.abs(change) * 1.2).toFixed(2)),
    low: Number((basePrice - Math.abs(change) * 0.9).toFixed(2)),
    summary: `Based on historical tracking, ${name} (${sym}) is currently exhibiting a ${isUp ? 'positive' : 'subdued'} price corrective wave in the ${market} stock exchange. Capital flow indicators suggest strong institutional consolidation.`,
    sentiment: isUp ? 'BULLISH' : 'BEARISH',
    capitalFlow: `${isUp ? 'Main Institutional Inflow' : 'Retail Distribution Outlet'} +${(Math.random() * 30 + 40).toFixed(1)}%`,
    inflowPercentage: Math.floor(Math.random() * 40) + 45,
    news: [
      {
        title: `${name} (${sym}) displays robust trading activity in afternoon session`,
        source: 'Global Market News',
        snippet: 'Trading volume spikes as heavy blocks cross the market ticker. Sentiment stays firm amid long-term support levels.'
      },
      {
        title: `Macro economic policies shift trends in ${market} indices`,
        source: 'Fintech Daily',
        snippet: 'Investors rebalance multi-asset portfolios setting strict stop levels across major corporate index drivers.'
      }
    ]
  };
}

interface CacheEntry {
  data: any;
  timestamp: number;
}

const evaluationCache: Record<string, CacheEntry> = {};
const CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutes cache to optimize Gemini API usage

const requestTracker = {
  minuteWindowStart: Date.now(),
  minuteRequestCount: 0,
  dailyRequestCount: 0,
  maxRpm: 15,
  maxRpd: 1500
};

function recordApiCall() {
  const now = Date.now();
  if (now - requestTracker.minuteWindowStart > 60 * 1000) {
    requestTracker.minuteWindowStart = now;
    requestTracker.minuteRequestCount = 0;
  }
  requestTracker.minuteRequestCount++;
  requestTracker.dailyRequestCount++;
}

// Helper to fetch live quote from public Yahoo Finance API without any API keys
async function fetchYahooQuote(symbol: string): Promise<any> {
  let cleanSymbol = symbol.trim().toUpperCase();
  if (cleanSymbol === 'HSI') cleanSymbol = '^HSI';
  if (cleanSymbol === '.IXIC') cleanSymbol = '^IXIC';
  if (cleanSymbol === '.DJI') cleanSymbol = '^DJI';
  
  // Standard format matching: AAPL, or HK stocks like 0700.HK, or SS stocks, etc.
  // Yahoo Finance chart endpoint is publicly open and extremely fast
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${cleanSymbol}?range=1d&interval=5m`;
  
  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'application/json'
      }
    });
    
    if (!res.ok) {
      throw new Error(`HTTP status ${res.status}`);
    }
    
    const json = await res.json() as any;
    const result = json?.chart?.result?.[0];
    if (!result) {
      throw new Error("No quotation result found");
    }
    
    const meta = result.meta;
    const price = meta.regularMarketPrice;
    
    // Fallback previous close calculation using chartPreviousClose property
    const prevClose = meta.previousClose !== undefined ? meta.previousClose : (meta.chartPreviousClose !== undefined ? meta.chartPreviousClose : price);
    const change = price - prevClose;
    const changePercent = prevClose !== 0 ? (change / prevClose) * 100 : 0;
    
    const indicators = result.indicators?.quote?.[0] || {};
    const highs = (indicators.high || []).filter((h: any) => typeof h === 'number' && h !== null);
    const lows = (indicators.low || []).filter((l: any) => typeof l === 'number' && l !== null);
    const volumes = (indicators.volume || []).filter((v: any) => typeof v === 'number' && v !== null);
    const closes = (indicators.close || []).filter((c: any) => typeof c === 'number' && c !== null);
    
    const high = highs.length ? Math.max(...highs) : (meta.regularMarketDayHigh || price);
    const low = lows.length ? Math.min(...lows) : (meta.regularMarketDayLow || price);
    const sumVolume = volumes.length ? volumes.reduce((acc: number, val: number) => acc + val, 0) : 0;
    
    let volumeStr = 'N/A';
    if (sumVolume > 1000000) {
      volumeStr = `${(sumVolume / 1000000).toFixed(1)}M`;
    } else if (sumVolume > 1000) {
      volumeStr = `${(sumVolume / 1000).toFixed(0)}K`;
    }
    
    const history = closes.slice(-20);
    
    return {
      price: Number(price.toFixed(2)),
      change: Number(change.toFixed(2)),
      changePercent: Number(changePercent.toFixed(2)),
      high: Number(high.toFixed(2)),
      low: Number(low.toFixed(2)),
      volume: volumeStr,
      history: history.length >= 3 ? history : [price * 0.99, price * 1.01, price]
    };
  } catch (error) {
    console.error(`⚠️ [YAHOO FINANCE FETCH FAIL] for ${cleanSymbol}:`, error);
    throw error;
  }
}

// API Route: Get multiple real-time stock quotes from Yahoo Finance directly (Free, 0 limits)
app.post('/api/stocks/quotes', async (req, res) => {
  const { symbols } = req.body;
  if (!symbols || !Array.isArray(symbols)) {
    return res.status(400).json({ error: 'Array of symbols is required under "symbols" field' });
  }
  
  const promises = symbols.map(async (sym: string) => {
    try {
      const data = await fetchYahooQuote(sym);
      return { symbol: sym, success: true, data };
    } catch (err: any) {
      return { symbol: sym, success: false, error: err.message || String(err) };
    }
  });
  
  const results = await Promise.all(promises);
  res.json({ success: true, results });
});

// Helper to construct simulated historical numbers for fallback robust operation
function getSimulatedHistoricalData(symbol: string, range: string): any[] {
  const dataPoints: any[] = [];
  let numPoints = 20;
  let timeInterval = 24 * 60 * 60 * 1000; // day in ms
  
  if (range === '1d') {
    numPoints = 48; // 30-min steps
    timeInterval = 30 * 60 * 1000;
  } else if (range === '5d') {
    numPoints = 40; // 2-hr steps
    timeInterval = 2 * 60 * 60 * 1000;
  } else if (range === '1mo') {
    numPoints = 30; // 1-day steps
    timeInterval = 24 * 60 * 60 * 1000;
  } else if (range === '1y') {
    numPoints = 52; // weekly steps
    timeInterval = 7 * 24 * 60 * 60 * 1000;
  } else if (range === '3y') {
    numPoints = 36; // 1-month steps
    timeInterval = 30 * 24 * 60 * 60 * 1000;
  }
  
  const sym = symbol.toUpperCase();
  let basePrice = 150;
  if (sym.includes('AAPL')) basePrice = 189.84;
  else if (sym.includes('TSLA')) basePrice = 179.24;
  else if (sym.includes('NVDA')) basePrice = 948.90;
  else if (sym.includes('0700')) basePrice = 382.40;
  else if (sym.includes('9988')) basePrice = 78.65;
  else basePrice = 100 + Math.random() * 150;
  
  let currentPrice = basePrice * (0.8 + Math.random() * 0.15); // Start lower to create a nice upward/downward simulation
  const trendStep = (basePrice - currentPrice) / numPoints;
  const now = Date.now();
  
  for (let i = 0; i < numPoints; i++) {
    const time = now - (numPoints - i) * timeInterval;
    const noise = (Math.random() - 0.48) * (basePrice * 0.04);
    currentPrice += trendStep + noise;
    if (currentPrice < 1) currentPrice = 1;
    
    // Volume generation matches general size of ticker
    const volume = Math.floor((Math.random() * 0.6 + 0.4) * (sym.includes('HK') ? 8000000 : 25000000) / (numPoints / 10));
    
    dataPoints.push({
      time,
      price: Number(currentPrice.toFixed(2)),
      volume: Number(volume)
    });
  }
  return dataPoints;
}

// Function to pull live chart data from Yahoo Finance
async function fetchHistoricalChart(symbol: string, range: string): Promise<any[]> {
  let cleanSymbol = symbol.trim().toUpperCase();
  if (cleanSymbol === 'HSI') cleanSymbol = '^HSI';
  if (cleanSymbol === '.IXIC') cleanSymbol = '^IXIC';
  if (cleanSymbol === '.DJI') cleanSymbol = '^DJI';
  
  let interval = '1d';
  if (range === '1d') interval = '5m';
  else if (range === '5d') interval = '15m';
  else if (range === '1mo') interval = '1d';
  else if (range === '1y') interval = '1d';
  else if (range === '3y') interval = '1wk';
  
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${cleanSymbol}?range=${range}&interval=${interval}`;
  
  const res = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Accept': 'application/json'
    }
  });
  
  if (!res.ok) {
    throw new Error(`HTTP status ${res.status}`);
  }
  
  const json = await res.json() as any;
  const result = json?.chart?.result?.[0];
  if (!result) {
    throw new Error("No chart result found");
  }
  
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
  
  if (dataPoints.length === 0) {
    throw new Error("Empty chart datapoints returned");
  }
  
  return dataPoints;
}

// API Route: Fetch multi-period historical prices & volumes free
app.post('/api/stock/historic-chart', async (req, res) => {
  const { symbol, range } = req.body;
  if (!symbol) {
    return res.status(400).json({ error: 'Ticker symbol is required' });
  }
  
  const validRanges = ['1d', '5d', '1mo', '1y', '3y'];
  const cleanRange = validRanges.includes(range) ? range : '1d';
  
  try {
    const data = await fetchHistoricalChart(symbol, cleanRange);
    return res.json({ success: true, isMock: false, data });
  } catch (err) {
    console.warn(`[HISTORIC FALLBACK ACTIVE] Fetch failed for ${symbol} range ${cleanRange}: reverting to high-end simulation.`);
    const fallbackData = getSimulatedHistoricalData(symbol, cleanRange);
    return res.json({ success: true, isMock: true, data: fallbackData });
  }
});

function isQuotaOrLimitError(error: any): boolean {
  const errStr = String(error?.message || error || '');
  return errStr.toLowerCase().includes("quota") || 
         errStr.toLowerCase().includes("exhausted") || 
         errStr.toLowerCase().includes("429") || 
         errStr.toLowerCase().includes("limit");
}

// API Route: Get real-time Gemini API limit counts and status
app.get('/api/api-limit', (req, res) => {
  const now = Date.now();
  if (now - requestTracker.minuteWindowStart > 60 * 1000) {
    requestTracker.minuteWindowStart = now;
    requestTracker.minuteRequestCount = 0;
  }

  res.json({
    rpmUsed: requestTracker.minuteRequestCount,
    rpmMax: requestTracker.maxRpm,
    rpmRemaining: Math.max(0, requestTracker.maxRpm - requestTracker.minuteRequestCount),
    rpdUsed: requestTracker.dailyRequestCount,
    rpdMax: requestTracker.maxRpd,
    rpdRemaining: Math.max(0, requestTracker.maxRpd - requestTracker.dailyRequestCount),
    cacheCount: Object.keys(evaluationCache).length,
    hasServerKey: !!process.env.GEMINI_API_KEY
  });
});

// API Route: Evaluate stock ticker via Real-time Google Search Grounding with Gemini
app.post('/api/stock/evaluate', async (req, res) => {
  const { symbol, market } = req.body;
  if (!symbol) {
    return res.status(400).json({ error: 'Ticker symbol is required' });
  }

  const auth = determineAuth(req);

  // If unauthorized to use Gemini (no client key, no correct admin passcode):
  // Gracefully serve high-fidelity live simulation right away and completely bypass Gemini.
  if (!auth.authorized) {
    const mock = getMockDataFallback(symbol, market || 'US');
    return res.json({
      success: true,
      isMock: true,
      authMode: auth.mode,
      data: mock
    });
  }

  const cacheKey = `${symbol.toUpperCase()}_${(market || 'US').toUpperCase()}`;
  const now = Date.now();
  const cached = evaluationCache[cacheKey];

  if (cached && (now - cached.timestamp < CACHE_TTL_MS)) {
    console.log(`⚡ [STORED CACHE HIT] Returning cached evaluation for "${symbol}"`);
    return res.json({
      success: true,
      isMock: cached.data.isMock || false,
      isCached: true,
      authMode: auth.mode,
      data: cached.data
    });
  }

  // Pre-emptive safeguard against rate limit exhaustion
  const currentMinute = Date.now();
  if (currentMinute - requestTracker.minuteWindowStart > 60 * 1000) {
    requestTracker.minuteWindowStart = currentMinute;
    requestTracker.minuteRequestCount = 0;
  }

  if (requestTracker.minuteRequestCount >= requestTracker.maxRpm) {
    console.warn(`⏳ [RATE LIMIT PRE-EMPTIVE FALLBACK] RPM threshold reached (${requestTracker.minuteRequestCount}/${requestTracker.maxRpm}). Serving rich offline forecast.`);
    const mock = getMockDataFallback(symbol, market || 'US');
    return res.json({
      success: true,
      isMock: true,
      isCached: false,
      isRateLimited: true,
      authMode: auth.mode,
      data: mock
    });
  }

  console.log(`🔍 [API REQ] Evaluating stock ticker "${symbol}" for market "${market || 'US'}" via '${auth.mode}' authorized session...`);

  // Record active call block
  recordApiCall();

  const client = getGeminiClient(auth.apiKey);
  if (!client) {
    // Graceful mock fallback response
    const mock = getMockDataFallback(symbol, market || 'US');
    return res.json({
      success: true,
      isMock: true,
      authMode: auth.mode,
      data: mock
    });
  }

  try {
    const prompt = `
      Perform an up-to-date financial evaluation and find the current real-time stock price for the stock ticker "${symbol}" in the market "${market || 'US'}".
      Utilize Google Search to ground your answers in the latest real-world market information today.
      If the market is currently closed, fetch the latest close statistics.
      Extract accurate metrics such as:
      - Latest stock price (numeric float)
      - Daily high & low (numeric float)
      - Today's price absolute change (numeric float, positive if up, negative if down)
      - Today's price percentage change (numeric float, positive if up, negative if down, e.g., 1.45 for +1.45% or -2.40 for -2.40%)
      - Capital market capitalization (e.g., $2.94T, HK$1.22T, etc.)
      - P/E ratio (e.g., "28.4" or "N/A" )
      - Daily trade volume (e.g., "45.1M" or "250K")
      - Main institutional flow sentiment (e.g. estimate capital flow in or out)
      - 2 latest relevant news headlines with publication sources and bullet points.
      - A concise summary evaluating whether the recent trend is bullish, bearish or neutral.
    `;

    const response = await client.models.generateContent({
      model: 'gemini-3.5-flash',
      contents: prompt,
      config: {
        tools: [{ googleSearch: {} }],
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            price: { type: Type.NUMBER, description: 'Latest stock price as a raw number' },
            change: { type: Type.NUMBER, description: 'Absolute point change' },
            changePercent: { type: Type.NUMBER, description: 'Percentage change, e.g., 2.3 or -1.42' },
            marketCap: { type: Type.STRING, description: 'Capitalization string' },
            peRatio: { type: Type.STRING, description: 'Price-to-Earnings ratio string' },
            volume: { type: Type.STRING, description: 'Volume traded' },
            high: { type: Type.NUMBER, description: 'Daily high price' },
            low: { type: Type.NUMBER, description: 'Daily low price' },
            summary: { type: Type.STRING, description: 'A detailed 2-3 sentence financial assessment' },
            sentiment: { type: Type.STRING, description: 'Current outlook: BULLISH, BEARISH, or NEUTRAL' },
            capitalFlow: { type: Type.STRING, description: 'Description of the institutional flows' },
            inflowPercentage: { type: Type.INTEGER, description: 'Integer score of net inflow (30 to 90)' },
            news: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  title: { type: Type.STRING, description: 'Short headlines' },
                  source: { type: Type.STRING, description: 'News source name' },
                  snippet: { type: Type.STRING, description: 'Headline summary bullet text' }
                },
                required: ['title', 'source', 'snippet']
              }
            }
          },
          required: [
            'price', 'change', 'changePercent', 'marketCap', 'peRatio', 'volume',
            'high', 'low', 'summary', 'sentiment', 'capitalFlow', 'inflowPercentage', 'news'
          ]
        }
      }
    });

    const text = response.text;
    if (!text) {
      throw new Error("Empty response from Gemini GenAI");
    }

    const payload = JSON.parse(text);
    console.log(`✅ [GEMINI API SUCCESS] Fetched evaluation for ${symbol}:`, payload.price, `${payload.changePercent}%`);
    
    // Save to the memory cache so consecutive requests save API quota
    evaluationCache[cacheKey] = {
      data: payload,
      timestamp: Date.now()
    };

    return res.json({
      success: true,
      isMock: false,
      authMode: auth.mode,
      data: payload
    });

  } catch (error: any) {
    const errStr = error.message || String(error);
    const isQuotaOrLimit = isQuotaOrLimitError(error);
    
    if (isQuotaOrLimit) {
      console.warn(`⚠️ [GEMINI EVALUATE RATE LIMIT] Could not fetch live statistics for ${symbol} due to API Rate limits. Engaging seamless mock fallback.`);
    } else {
      console.error(`❌ [GEMINI API ERROR] Failed to fetch live data for ${symbol}:`, errStr);
    }

    // Silent failover to mocked results so UI experience remains seamless
    const mock = getMockDataFallback(symbol, market || 'US');
    return res.json({
      success: true,
      isMock: true,
      authMode: auth.mode,
      errorInfo: isQuotaOrLimit ? "API Quota Limit Met" : errStr,
      data: mock
    });
  }
});

// API Route: AI Financial Chat Assistant with Web Search Grounding
app.post('/api/stock/chat', async (req, res) => {
  const { message, watchlist } = req.body;
  if (!message) {
    return res.status(400).json({ error: 'Message content is required' });
  }

  const auth = determineAuth(req);

  // If unauthorized to use Gemini (no client key, no correct admin passcode):
  // Gracefully serve intelligent simulated offline adviser response and buy-pass server keys.
  if (!auth.authorized) {
    const offlineReply = generateLocalChatResponse(message, watchlist || []);
    return res.json({
      success: true,
      isMock: true,
      authMode: auth.mode,
      text: offlineReply
    });
  }

  // Pre-emptive check against rate limit exhaustion
  const currentMinute = Date.now();
  if (currentMinute - requestTracker.minuteWindowStart > 60 * 1000) {
    requestTracker.minuteWindowStart = currentMinute;
    requestTracker.minuteRequestCount = 0;
  }

  if (requestTracker.minuteRequestCount >= requestTracker.maxRpm) {
    console.warn(`⏳ [RATE LIMIT PRE-EMPTIVE CHAT FALLBACK] RPM threshold reached (${requestTracker.minuteRequestCount}/${requestTracker.maxRpm}). Serving rich offline response.`);
    const mockReply = `Hello! I see that the application sandbox has temporarily reached its Gemini API rate limit or daily quota. No worries! I have switched to Safe Offline Consultant Mode to keep serving you.

Based on your active tracked symbols (${watchlist && watchlist.length > 0 ? watchlist.map((item: string) => `**${item}**`).join(', ') : 'None'}):
- Tech sector equities showing relative strength holding key supportive moving averages.
- Set target price alert rules below to receive immediate alarms if thresholds trigger on future price updates.
- Try reviewing macro indices or resubmitting your query in a moment when the limits reset. I can also help you calculate yields local to your terminal inputs!`;

    return res.json({
      success: true,
      isMock: true,
      authMode: auth.mode,
      text: mockReply
    });
  }

  // Record active call block
  recordApiCall();

  const client = getGeminiClient(auth.apiKey);
  if (!client) {
    const botResponse = generateLocalChatResponse(message, watchlist || []);
    return res.json({
      success: true,
      isMock: true,
      authMode: auth.mode,
      text: botResponse
    });
  }

  try {
    const listString = watchlist && watchlist.length > 0 ? watchlist.join(', ') : 'None';
    const systemPrompt = `
      You are a World-Class AI Financial Strategist and Stock Market Advisor.
      The user is managing their portfolio and watchlist containing: [${listString}].
      Help them analyze market movements, give macro investment guidance, check technical points, or interpret news.
      Always restrict your tone to a professional, objective, yet encouraging advisor. Use appropriate financial vocabulary.
      You can use Google Search tool to check real-time updates and quotes where helpful. Use clear bullet points and markdown.
      Limit your response length to be readable, concise, and focused (approx 200-300 words).
    `;

    const response = await client.models.generateContent({
      model: 'gemini-3.5-flash',
      contents: message,
      config: {
        systemInstruction: systemPrompt,
        tools: [{ googleSearch: {} }]
      }
    });

    const reply = response.text || "I was unable to formulate financial advice for this quote. Please try another query.";
    return res.json({
      success: true,
      isMock: false,
      authMode: auth.mode,
      text: reply,
      sources: response.candidates?.[0]?.groundingMetadata?.groundingChunks || []
    });

  } catch (error: any) {
    const errStr = error.message || String(error);
    const isQuotaOrLimit = isQuotaOrLimitError(error);

    if (isQuotaOrLimit) {
      console.warn(`⚠️ [GEMINI CHAT RATE LIMIT] Chat advisor encountered API quota exhaustion. Engaging smart simulated consultant advice.`);
      const mockReply = `Hello! I see that the application sandbox has temporarily reached its Gemini API rate limit or daily quota. No worries! I have switched to Safe Offline Consultant Mode to keep serving you.

Based on your active tracked symbols (${watchlist && watchlist.length > 0 ? watchlist.map((item: string) => `**${item}**`).join(', ') : 'None'}):
- Tech sector equities showing relative strength holding key supportive moving averages.
- Set target price alert rules below to receive immediate alarms if thresholds trigger on future price updates.
- Try reviewing macro indices or resubmitting your query in a moment when the limits reset. I can also help you calculate yields local to your terminal inputs!`;

      return res.json({
        success: true,
        isMock: true,
        authMode: auth.mode,
        text: mockReply
      });
    }

    console.error("❌ [API CHAT ERROR]:", errStr);

    const friendlyFallback = `I apologize, I experienced a network exception trying to connect to the real-time search engine (${errStr}).

Feel free to continue utilizing the real-time index widgets and setting target alarms. They remain fully interactive locally!`;

    return res.json({
      success: true,
      isMock: true,
      authMode: auth.mode,
      text: friendlyFallback
    });
  }
});

// Vite & Static file configurations
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    // Development mode
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    // Production mode
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 [EXPRESS SERVER] Active on http://0.0.0.0:${PORT} in ${process.env.NODE_ENV || 'development'} mode.`);
  });
}

startServer();
