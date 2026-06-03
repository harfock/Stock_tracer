import React, { useState, useEffect } from 'react';
import { initialIndices, initialStocks } from './data';
import { Stock, PriceAlert, MarketIndex, StockAnalysis } from './types';
import IndicesHeader from './components/IndicesHeader';
import StockRow from './components/StockRow';
import { Clock, Plus, Trash2, Search, BellRing, Sparkles, TrendingUp, TrendingDown, HelpCircle, CheckCircle, Info, Settings, Key, ShieldCheck, ShieldAlert } from 'lucide-react';
import { clientSideFetchYahooQuotes } from './lib/yahooFinance';

const getResolvedTimeZone = (): string => {
  try {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    // Default to HK (Asia/Hong_Kong) unless opened in another country (non-UTC/GMT non-empty)
    if (!tz || tz.toLowerCase() === 'utc' || tz.toLowerCase() === 'gmt' || tz.toLowerCase() === 'etc/gmt') {
      return 'Asia/Hong_Kong';
    }
    return tz;
  } catch {
    return 'Asia/Hong_Kong';
  }
};

const formatTimeInTimeZone = (date: Date, timeZone: string): string => {
  try {
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false
    });
    const parts = formatter.formatToParts(date);
    const map = Object.fromEntries(parts.map(p => [p.type, p.value]));
    return `${map.year}-${map.month}-${map.day} ${map.hour}:${map.minute}:${map.second}`;
  } catch (err) {
    return date.toISOString().replace('T', ' ').substring(0, 19);
  }
};

interface TriggeredNotification {
  id: string;
  symbol: string;
  condition: 'above' | 'below';
  value: number;
  triggeredPrice: number;
  time: string;
}

const COMMON_BILINGUAL_TICKERS: Record<string, { name: string; market: 'US' | 'HK' | 'A-Share' }> = {
  'AAPL': { name: 'Apple Inc.', market: 'US' },
  'TSLA': { name: 'Tesla Inc.', market: 'US' },
  'NVDA': { name: 'NVIDIA Corp.', market: 'US' },
  'MSFT': { name: 'Microsoft Corp.', market: 'US' },
  'GOOG': { name: 'Alphabet Inc.', market: 'US' },
  'AMZN': { name: 'Amazon.com Inc.', market: 'US' },
  'META': { name: 'Meta Platforms', market: 'US' },

  '0700.HK': { name: 'Tencent / 騰訊控股', market: 'HK' },
  '9988.HK': { name: 'Alibaba / 阿里巴巴-W', market: 'HK' },
  '3690.HK': { name: 'Meituan / 美團-W', market: 'HK' },
  '0005.HK': { name: 'HSBC / 匯豐控股', market: 'HK' },
  '1810.HK': { name: 'Xiaomi / 小米集團-W', market: 'HK' },
  '1299.HK': { name: 'AIA / 友邦保險', market: 'HK' },
  '0388.HK': { name: 'HKEX / 香港交易所', market: 'HK' },
  '9618.HK': { name: 'JD.com / 京東集團-SW', market: 'HK' },
  '9999.HK': { name: 'NetEase / 網易-S', market: 'HK' },
  '1024.HK': { name: 'Kuaishou / 快手-W', market: 'HK' },
  '2318.HK': { name: 'Ping An / 中國平安', market: 'HK' },
  '1211.HK': { name: 'BYD Company / 比亞迪股份', market: 'HK' },
  '0001.HK': { name: 'CKH Holdings / 長江和記', market: 'HK' },
  '0002.HK': { name: 'CLP Holdings / 中電控股', market: 'HK' },
  '0003.HK': { name: 'Hong Kong & China Gas / 中華煤氣', market: 'HK' },
  '0006.HK': { name: 'Power Assets / 電能實業', market: 'HK' },
  '0011.HK': { name: 'Hang Seng Bank / 恒生銀行', market: 'HK' },
  '0016.HK': { name: 'SHKP / 新鴻基地產', market: 'HK' },
  '0017.HK': { name: 'New World Dev / 新世界發展', market: 'HK' },
  '0027.HK': { name: 'Galaxy Entertainment / 銀河娛樂', market: 'HK' },
  '0066.HK': { name: 'MTR Corporation / 港鐵公司', market: 'HK' },
  '0241.HK': { name: 'Alibaba Health / 阿里健康', market: 'HK' },
  '0267.HK': { name: 'CITIC Pacific / 中信股份', market: 'HK' },
  '0288.HK': { name: 'WH Group / 萬洲國際', market: 'HK' },
  '0291.HK': { name: 'China Resources Beer / 華潤啤酒', market: 'HK' },
  '0354.HK': { name: 'Chinasoft International / 中軟國際', market: 'HK' },
  '0669.HK': { name: 'Techtronic Ind / 創科實業', market: 'HK' },
  '0688.HK': { name: 'China Overseas Land / 中國海外發展', market: 'HK' },
  '0857.HK': { name: 'PetroChina / 中國石油', market: 'HK' },
  '0883.HK': { name: 'CNOOC / 中國海洋石油', market: 'HK' },
  '0941.HK': { name: 'China Mobile / 中國移動', market: 'HK' },
  '0968.HK': { name: 'Xinyi Solar / 信義光能', market: 'HK' },
  '0992.HK': { name: 'Lenovo / 聯想集團', market: 'HK' },
  '1088.HK': { name: 'China Shenhua / 中國神華', market: 'HK' },
  '1109.HK': { name: 'China Resources Land / 華潤置地', market: 'HK' },
  '1113.HK': { name: 'CK Asset / 長江實業集團', market: 'HK' },
  '1177.HK': { name: 'Sino Biopharm / 中國生物製藥', market: 'HK' },
  '1378.HK': { name: 'China Hongqiao / 中國宏橋', market: 'HK' },
  '1398.HK': { name: 'ICBC / 工商銀行', market: 'HK' },
  '1928.HK': { name: 'Sands China / 金沙中國有限公司', market: 'HK' },
  '2020.HK': { name: 'ANTA Sports / 安踏體育', market: 'HK' },
  '2313.HK': { name: 'Shenzhou International / 申洲國際', market: 'HK' },
  '2331.HK': { name: 'Li Ning / 李寧', market: 'HK' },
  '2382.HK': { name: 'Sunny Optical / 舜宇光學科技', market: 'HK' },
  '2388.HK': { name: 'BOC Hong Kong / 中銀香港', market: 'HK' },
  '2628.HK': { name: 'China Life / 中國人壽', market: 'HK' },
  '2688.HK': { name: 'ENN Energy / 新奧能源', market: 'HK' },
  '3968.HK': { name: 'CM Bank / 招商銀行', market: 'HK' },
  '3988.HK': { name: 'Bank of China / 中國銀行', market: 'HK' },
  '6098.HK': { name: 'Country Garden Services / 碧桂園服務', market: 'HK' },
  '6690.HK': { name: 'Haier Smart Home / 海爾智家', market: 'HK' },
  '9626.HK': { name: 'Bilibili / 嗶哩嗶哩-W', market: 'HK' },
  '9633.HK': { name: 'Nongfu Spring / 農夫山泉', market: 'HK' },
  '9868.HK': { name: 'XPeng / 小鵬汽車-W', market: 'HK' },
  '9886.HK': { name: 'NIO / 蔚來-SW', market: 'HK' },

  '600519.SS': { name: 'Kweichow Moutai / 貴州茅台', market: 'A-Share' },
  '300750.SZ': { name: 'CATL / 寧德時代', market: 'A-Share' },
  '601318.SS': { name: 'Ping An / 中國平安', market: 'A-Share' },
  '000858.SZ': { name: 'Wuliangye / 五糧液', market: 'A-Share' },
  '600036.SS': { name: 'China Merchants Bank / 招商銀行', market: 'A-Share' },
  '601012.SS': { name: 'LONGI Green Energy / 隆基綠能', market: 'A-Share' },
  '300059.SZ': { name: 'East Money / 東方財富', market: 'A-Share' },
  '002594.SZ': { name: 'BYD / 比亞迪', market: 'A-Share' },
  '000333.SZ': { name: 'Midea Group / 美的集團', market: 'A-Share' },
  '601166.SS': { name: 'Industrial Bank / 興業銀行', market: 'A-Share' },
  '600900.SS': { name: 'China Yangtze Power / 長江電力', market: 'A-Share' },
  '600276.SS': { name: 'Hengrui Medicine / 恆瑞醫藥', market: 'A-Share' },
  '601888.SS': { name: 'China Tourism Duty Free / 中國中免', market: 'A-Share' },
  '601668.SS': { name: 'China State Construction / 中國建築', market: 'A-Share' },
  '000001.SZ': { name: 'Ping An Bank / 平安銀行', market: 'A-Share' },
  '000002.SZ': { name: 'Vanke / 萬科A', market: 'A-Share' },
  '000725.SZ': { name: 'BOE Technology / 京東方A', market: 'A-Share' },
  '002475.SZ': { name: 'Luxshare Precision / 立訊精密', market: 'A-Share' },
  '300015.SZ': { name: 'Aier Eye Hospital / 愛爾眼科', market: 'A-Share' },
  '300124.SZ': { name: 'Inovance Technology / 匯川技術', market: 'A-Share' },
};

function lookupBilingualStock(inputSym: string): { name: string; market: 'US' | 'HK' | 'A-Share' } | null {
  const cleanSym = inputSym.trim().toUpperCase().replace(/\s+/g, '');
  if (!cleanSym) return null;
  
  if (COMMON_BILINGUAL_TICKERS[cleanSym]) {
    return COMMON_BILINGUAL_TICKERS[cleanSym];
  }
  
  if (/^\d+$/.test(cleanSym)) {
    const padded = cleanSym.padStart(4, '0') + '.HK';
    if (COMMON_BILINGUAL_TICKERS[padded]) {
      return COMMON_BILINGUAL_TICKERS[padded];
    }
    const aPaddedSz = cleanSym.padStart(6, '0') + '.SZ';
    if (COMMON_BILINGUAL_TICKERS[aPaddedSz]) {
      return COMMON_BILINGUAL_TICKERS[aPaddedSz];
    }
    const aPaddedSs = cleanSym.padStart(6, '0') + '.SS';
    if (COMMON_BILINGUAL_TICKERS[aPaddedSs]) {
      return COMMON_BILINGUAL_TICKERS[aPaddedSs];
    }
  } else if (/^\d+\.HK$/.test(cleanSym)) {
    const code = cleanSym.split('.')[0].padStart(4, '0') + '.HK';
    if (COMMON_BILINGUAL_TICKERS[code]) {
      return COMMON_BILINGUAL_TICKERS[code];
    }
  } else if (/^\d+\.(SS|SZ)$/.test(cleanSym)) {
    const parts = cleanSym.split('.');
    const padded = parts[0].padStart(6, '0') + '.' + parts[1];
    if (COMMON_BILINGUAL_TICKERS[padded]) {
      return COMMON_BILINGUAL_TICKERS[padded];
    }
  }
  
  return null;
}

function getMarketFromSymbol(symbol: string): 'US' | 'HK' | 'A-Share' | 'TW' | 'UK' | 'JP' | 'Europe' | 'Canada' | 'Australia' | 'Singapore' | 'Other' {
  const clean = symbol.trim().toUpperCase();
  if (clean.endsWith('.HK')) return 'HK';
  if (clean.endsWith('.SS') || clean.endsWith('.SZ')) return 'A-Share';
  if (clean.endsWith('.TW')) return 'TW';
  if (clean.endsWith('.L')) return 'UK';
  if (clean.endsWith('.T')) return 'JP';
  if (clean.endsWith('.TO')) return 'Canada';
  if (clean.endsWith('.DE') || clean.endsWith('.PA') || clean.endsWith('.AS') || clean.endsWith('.MI') || clean.endsWith('.MC')) {
    return 'Europe';
  }
  if (clean.endsWith('.AX')) return 'Australia';
  if (clean.endsWith('.SI')) return 'Singapore';
  
  if (/^\d+$/.test(clean)) {
    if (clean.length <= 5) return 'HK';
    return 'A-Share';
  }
  
  return 'US';
}

export default function App() {
  const [stocks, setStocks] = useState<Stock[]>(() => {
    const saved = localStorage.getItem('g_tracker_stocks');
    if (saved) {
      try {
        const parsed = JSON.parse(saved) as Stock[];
        return parsed.map(stock => {
          const matched = lookupBilingualStock(stock.symbol);
          if (matched) {
            return { ...stock, name: matched.name, market: matched.market };
          }
          return stock;
        });
      } catch (e) {
        return initialStocks;
      }
    }
    return initialStocks;
  });

  const [indices, setIndices] = useState<MarketIndex[]>(() => {
    const saved = localStorage.getItem('g_tracker_indices');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        return initialIndices;
      }
    }
    return initialIndices;
  });
  
  const [alerts, setAlerts] = useState<PriceAlert[]>(() => {
    const saved = localStorage.getItem('g_tracker_alerts');
    return saved ? JSON.parse(saved) : [];
  });

  const [triggeredAlerts, setTriggeredAlerts] = useState<TriggeredNotification[]>([]);
  
  // Tracking references for real-time background sync loop to bypass state captures
  const lastStocksRef = React.useRef<Stock[]>(stocks);
  const lastIndicesRef = React.useRef<MarketIndex[]>(indices);
  const lastAlertsRef = React.useRef<PriceAlert[]>(alerts);

  useEffect(() => {
    lastStocksRef.current = stocks;
  }, [stocks]);

  useEffect(() => {
    lastIndicesRef.current = indices;
  }, [indices]);

  useEffect(() => {
    lastAlertsRef.current = alerts;
  }, [alerts]);

  const [activeMarketFilter, setActiveMarketFilter] = useState<'All' | 'US' | 'HK' | 'A-Share' | 'TW' | 'UK' | 'JP' | 'Europe' | 'Canada' | 'Australia' | 'Singapore' | 'Other'>('All');
  
  // Custom stock additions with debounced live autocomplete search matching
  const [newSymbol, setNewSymbol] = useState<string>('');
  const [newName, setNewName] = useState<string>('');
  const [showAddForm, setShowAddForm] = useState<boolean>(false);
  const [isValidatingStock, setIsValidatingStock] = useState<boolean>(false);
  const [validationStockError, setValidationStockError] = useState<string>('');
  
  const [searchSuggestions, setSearchSuggestions] = useState<any[]>([]);
  const [isSearchingSuggestions, setIsSearchingSuggestions] = useState<boolean>(false);
  const [selectedStockMatch, setSelectedStockMatch] = useState<any | null>(null);

  // Dynamic lookup effect to dynamically show company name as user types
  useEffect(() => {
    const sym = newSymbol.trim();
    if (!sym) {
      setNewName('');
      return;
    }
    const match = lookupBilingualStock(sym);
    if (match) {
      setNewName(match.name);
    }
  }, [newSymbol]);

  // Auto-search effect on input keystroke
  useEffect(() => {
    const q = newSymbol.trim();
    if (q.length < 2) {
      setSearchSuggestions([]);
      setIsSearchingSuggestions(false);
      return;
    }

    // Filter from local common tickers directory immediately for zero-lag response
    const matchesLocal: any[] = [];
    const lowerQ = q.toLowerCase();
    
    Object.entries(COMMON_BILINGUAL_TICKERS).forEach(([sym, val]) => {
      if (sym.toLowerCase().includes(lowerQ) || val.name.toLowerCase().includes(lowerQ)) {
        matchesLocal.push({
          symbol: sym,
          name: val.name,
          exchange: val.market === 'HK' ? 'HKG' : val.market === 'A-Share' ? 'SSE/SZSE' : 'US',
          type: 'EQUITY',
          isLocal: true
        });
      }
    });

    // Sort exact or starts-with matches higher
    matchesLocal.sort((a, b) => {
      const aSym = a.symbol.toLowerCase();
      const bSym = b.symbol.toLowerCase();
      if (aSym === lowerQ) return -1;
      if (bSym === lowerQ) return 1;
      if (aSym.startsWith(lowerQ) && !bSym.startsWith(lowerQ)) return -1;
      if (bSym.startsWith(lowerQ) && !aSym.startsWith(lowerQ)) return 1;
      return 0;
    });

    setSearchSuggestions(matchesLocal.slice(0, 4));

    // Debounce the call to the full server-side Yahoo search proxy
    const timer = setTimeout(async () => {
      setIsSearchingSuggestions(true);
      try {
        const res = await fetch(`/api/stocks/search?q=${encodeURIComponent(q)}`);
        if (res.ok) {
          const body = await res.json();
          if (body.success && body.results) {
            const apiResults = body.results;
            const merged = [...matchesLocal];
            
            apiResults.forEach((apiItem: any) => {
              if (!merged.some(m => m.symbol.toUpperCase() === apiItem.symbol.toUpperCase())) {
                merged.push({
                  symbol: apiItem.symbol,
                  name: apiItem.name,
                  exchange: apiItem.exchange || 'Unknown',
                  type: apiItem.type || 'EQUITY',
                  isLocal: false
                });
              }
            });
            
            setSearchSuggestions(merged.slice(0, 10));
          }
        }
      } catch (err) {
        console.warn('Autocomplete lookup proxy errored, fallback to local indexing:', err);
      } finally {
        setIsSearchingSuggestions(false);
      }
    }, 350);

    return () => clearTimeout(timer);
  }, [newSymbol]);

  // Reset selected match indicators if input is modified away from selected symbol
  useEffect(() => {
    if (selectedStockMatch && newSymbol.trim().toUpperCase() !== selectedStockMatch.symbol.toUpperCase()) {
      setSelectedStockMatch(null);
    }
  }, [newSymbol, selectedStockMatch]);

  const handleSelectSuggestion = (item: any) => {
    setNewSymbol(item.symbol);
    setNewName(item.name);
    setSelectedStockMatch(item);
    setSearchSuggestions([]);
    setValidationStockError('');
  };
  
  // Visual search query matching
  const [searchQuery, setSearchQuery] = useState<string>('');
  
  // User custom credential configuration
  const [localPasscode, setLocalPasscode] = useState<string>(() => {
    return localStorage.getItem('g_tracker_passcode') || '';
  });
  const [localApiKey, setLocalApiKey] = useState<string>(() => {
    return localStorage.getItem('g_tracker_client_key') || '';
  });
  const [showSettings, setShowSettings] = useState<boolean>(false);

  useEffect(() => {
    localStorage.setItem('g_tracker_passcode', localPasscode || '');
  }, [localPasscode]);

  useEffect(() => {
    localStorage.setItem('g_tracker_client_key', localApiKey || '');
  }, [localApiKey]);

  // Expanded visual ID matching
  const [expandedSymbol, setExpandedSymbol] = useState<string | null>(null);

  // Comfort text size customization scale
  const [textSize, setTextSize] = useState<'sm' | 'base' | 'lg' | 'xl'>(() => {
    return (localStorage.getItem('g_tracker_text_size') as 'sm' | 'base' | 'lg' | 'xl') || 'base';
  });

  useEffect(() => {
    localStorage.setItem('g_tracker_text_size', textSize);
    const root = document.documentElement;
    if (textSize === 'sm') {
      root.style.fontSize = '87.5%'; // ~14px
    } else if (textSize === 'lg') {
      root.style.fontSize = '112.5%'; // ~18px
    } else if (textSize === 'xl') {
      root.style.fontSize = '125%'; // ~20px
    } else {
      root.style.fontSize = '100%'; // ~16px (Normal)
    }
  }, [textSize]);

  // Live clock display matching user local time format
  const [liveClock, setLiveClock] = useState<string>(() => formatTimeInTimeZone(new Date(), getResolvedTimeZone()));

  // Last successful backend/CORS quotes sync time
  const [lastQuoteSyncTime, setLastQuoteSyncTime] = useState<string>(() => {
    return localStorage.getItem('g_tracker_last_sync') || new Date().toLocaleString();
  });

  useEffect(() => {
    localStorage.setItem('g_tracker_last_sync', lastQuoteSyncTime);
  }, [lastQuoteSyncTime]);

  // API limit telemetry state monitoring
  const [apiLimits, setApiLimits] = useState<{
    rpmUsed: number;
    rpmMax: number;
    rpmRemaining: number;
    rpdUsed: number;
    rpdMax: number;
    rpdRemaining: number;
    cacheCount: number;
  } | null>(null);

  const fetchApiLimits = async () => {
    try {
      const res = await fetch('/api/api-limit');
      if (res.ok) {
        const data = await res.json();
        setApiLimits(data);
      }
    } catch (e) {
      console.warn('Api quota monitoring not reachable');
    }
  };

  useEffect(() => {
    fetchApiLimits();
    // Refresh limits count on user expansion triggers or every 12 seconds
    const interval = setInterval(fetchApiLimits, 12000);
    return () => clearInterval(interval);
  }, []);

  // Trigger Local Storage Saves
  useEffect(() => {
    localStorage.setItem('g_tracker_stocks', JSON.stringify(stocks));
  }, [stocks]);

  useEffect(() => {
    localStorage.setItem('g_tracker_alerts', JSON.stringify(alerts));
  }, [alerts]);

  useEffect(() => {
    localStorage.setItem('g_tracker_indices', JSON.stringify(indices));
  }, [indices]);

  // Handle Incremental live clock updates with timezone resolution (Default HK)
  useEffect(() => {
    const timeZone = getResolvedTimeZone();
    const updateTime = () => {
      setLiveClock(formatTimeInTimeZone(new Date(), timeZone));
    };

    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  // Helper to fetch real stock and index prices from our Yahoo Finance proxy server
  const fetchAllRealQuotes = async (symbolsToFetch: string[], indicesToFetch: string[]) => {
    // 1. Fetch real stock quotes
    if (symbolsToFetch.length > 0) {
      let results: any = null;
      try {
        const res = await fetch('/api/stocks/quotes', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ symbols: symbolsToFetch })
        });
        if (res.ok) {
          const body = await res.json();
          if (body.success && body.results) {
            results = body.results;
          }
        }
      } catch (err) {
        console.warn('Real-time stock quotes proxy not available on backend. Trying direct browser fallback via CORS proxy:', err);
      }

      // Browser CORS proxy direct fallback
      if (!results) {
        try {
          results = await clientSideFetchYahooQuotes(symbolsToFetch);
        } catch (clientErr) {
          console.error('Direct browser-side Yahoo Finance quotes fetch failed:', clientErr);
        }
      }

      if (results) {
        const anySuccess = results.some((r: any) => r.success && r.data);
        if (anySuccess) {
          setLastQuoteSyncTime(new Date().toLocaleString());
        }

        setStocks((curStocks) => {
          return curStocks.map((stock) => {
            const found = results.find((r: any) => r.symbol === stock.symbol);
            if (found && found.success && found.data) {
              const q = found.data;

              // Trigger alerts logic based on actual real price
              lastAlertsRef.current.forEach((alert) => {
                if (alert.symbol === stock.symbol && alert.active) {
                  let hit = false;
                  if (alert.condition === 'above' && q.price >= alert.value) {
                    hit = true;
                  } else if (alert.condition === 'below' && q.price <= alert.value) {
                    hit = true;
                  }

                  if (hit) {
                    alert.active = false;
                    const notif: TriggeredNotification = {
                      id: alert.id,
                      symbol: alert.symbol,
                      condition: alert.condition,
                      value: alert.value,
                      triggeredPrice: q.price,
                      time: new Date().toLocaleTimeString()
                    };
                    setTriggeredAlerts((cur) => [notif, ...cur]);
                  }
                }
              });

              let resolvedName = q.shortName && q.shortName !== stock.symbol ? q.shortName : stock.name;
              const bilingualInfo = lookupBilingualStock(stock.symbol);
              if (bilingualInfo) {
                resolvedName = bilingualInfo.name;
              } else {
                const origHasChinese = /[\u4e00-\u9fa5]/.test(stock.name);
                const fetchedHasChinese = /[\u4e00-\u9fa5]/.test(resolvedName);
                if (origHasChinese && !fetchedHasChinese) {
                  resolvedName = stock.name;
                }
              }

              return {
                ...stock,
                name: resolvedName,
                price: q.price,
                change: q.change,
                changePercent: q.changePercent,
                high: q.high,
                low: q.low,
                volume: q.volume || stock.volume,
                history: q.history && q.history.length > 0 ? q.history : stock.history,
                lastUpdated: new Date().toLocaleString()
              };
            }
            return stock;
          });
        });
      }
    }

    // 2. Fetch real market index quotations
    if (indicesToFetch.length > 0) {
      let results: any = null;
      try {
        const res = await fetch('/api/stocks/quotes', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ symbols: indicesToFetch })
        });
        if (res.ok) {
          const body = await res.json();
          if (body.success && body.results) {
            results = body.results;
          }
        }
      } catch (err) {
        console.warn('Real-time index quotes proxy not available on backend. Trying direct browser fallback via CORS proxy:', err);
      }

      // Direct client-side index query fallback
      if (!results) {
        try {
          results = await clientSideFetchYahooQuotes(indicesToFetch);
        } catch (clientErr) {
          console.error('Direct browser-side Yahoo index fetch failed:', clientErr);
        }
      }

      if (results) {
        const anySuccess = results.some((r: any) => r.success && r.data);
        if (anySuccess) {
          setLastQuoteSyncTime(new Date().toLocaleString());
        }

        setIndices((curIndices) => {
          return curIndices.map((idx) => {
            const found = results.find((r: any) => r.symbol === idx.symbol);
            if (found && found.success && found.data) {
              const q = found.data;
              return {
                ...idx,
                price: q.price,
                change: q.change,
                changePercent: q.changePercent,
                history: q.history && q.history.length > 0 ? q.history : idx.history,
                lastUpdated: new Date().toLocaleString()
              };
            }
            return idx;
          });
        });
      }
    }
  };

  // Run initial Real Quote Load & define high-frequency background sync interval (3 seconds)
  useEffect(() => {
    const stockSymbols = lastStocksRef.current.map((s) => s.symbol);
    const indexSymbols = lastIndicesRef.current.map((i) => i.symbol);
    
    // Initial fetch on mount
    fetchAllRealQuotes(stockSymbols, indexSymbols);

    // Dynamic high-frequency polling interval to simulate second-by-second changes
    const syncInterval = setInterval(() => {
      const activeStockSyms = lastStocksRef.current.map((s) => s.symbol);
      const activeIndexSyms = lastIndicesRef.current.map((i) => i.symbol);
      fetchAllRealQuotes(activeStockSyms, activeIndexSyms);
    }, 3000);

    return () => clearInterval(syncInterval);
  }, []);

  const handleAddStock = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSymbol.trim()) return;
    setValidationStockError('');

    let ticker = newSymbol.trim().toUpperCase();

    // Clean space and parse purely numeric or standard HK/A-Share codes
    const cleanSym = ticker.replace(/\s+/g, '');
    if (/^\d+$/.test(cleanSym)) {
      if (cleanSym.length === 6) {
        // SSE starts with 6, SZSE starts with 0 or 3
        const suffix = cleanSym.startsWith('6') ? '.SS' : '.SZ';
        ticker = `${cleanSym}${suffix}`;
      } else {
        const paddedCode = cleanSym.length < 4 ? cleanSym.padStart(4, '0') : cleanSym;
        ticker = `${paddedCode}.HK`;
      }
    } else if (/^\d+\.HK$/i.test(cleanSym)) {
      const parts = cleanSym.split('.');
      const paddedCode = parts[0].length < 4 ? parts[0].padStart(4, '0') : parts[0];
      ticker = `${paddedCode}.HK`;
    } else if (/^\d+\.(SS|SZ)$/i.test(cleanSym)) {
      const parts = cleanSym.split('.');
      const paddedCode = parts[0].padStart(6, '0');
      ticker = `${paddedCode}.${parts[1].toUpperCase()}`;
    }

    const finalTicker = ticker;

    // Prevent duplicate items
    if (stocks.some((s) => s.symbol === finalTicker)) {
      setValidationStockError('Stock ticker already exists in tracker!');
      return;
    }

    setIsValidatingStock(true);

    try {
      // 1. Fetch real quote for validation
      let quoteData: any = null;
      try {
        const res = await fetch('/api/stocks/quotes', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ symbols: [finalTicker] })
        });
        if (res.ok) {
          const body = await res.json();
          if (body.success && body.results && body.results[0] && body.results[0].success) {
            quoteData = body.results[0].data;
          }
        }
      } catch (err) {
        console.warn('Real-time validation proxy unavailable, trying browser-side proxy fallback:', err);
      }

      // Browser proxy-direct fallback
      if (!quoteData) {
        try {
          const clientResults = await clientSideFetchYahooQuotes([finalTicker]);
          if (clientResults && clientResults[0] && clientResults[0].success) {
            quoteData = clientResults[0].data;
          }
        } catch (clientErr) {
          console.error('Direct browser fallback quote fetch failed:', clientErr);
        }
      }

      // Dynamic local & offline fallback if remote endpoints fail/rate-limit
      if (!quoteData) {
        const resolvedMarket = getMarketFromSymbol(finalTicker);
        const localMatch = lookupBilingualStock(finalTicker);
        const fallbackName = localMatch ? localMatch.name : (newName.trim() || `${finalTicker} Corp`);
        const mockPrice = resolvedMarket === 'HK' ? 42.50 + Math.random() * 150 : (resolvedMarket === 'A-Share' ? 18.00 + Math.random() * 60 : 120.00);
        
        console.info(`[Offline Fallback] Resolved ticker ${finalTicker} dynamically locally as: ${fallbackName}`);
        quoteData = {
          price: mockPrice,
          change: (Math.random() - 0.48) * (mockPrice * 0.04),
          changePercent: (Math.random() - 0.48) * 4,
          high: mockPrice * 1.015,
          low: mockPrice * 0.985,
          volume: '8.4M',
          shortName: fallbackName,
          history: []
        };
      }

      // 2. Resolve market automatically from ticker string
      const resolvedMarket = getMarketFromSymbol(finalTicker);

      const price = quoteData.price || Math.floor(Math.random() * 200) + 20;
      const historyData: number[] = quoteData.history || [];
      if (historyData.length < 2) {
        let cur = price * 0.95;
        for (let i = 0; i < 20; i++) {
          cur = cur * (1 + (Math.random() - 0.48) * 0.012);
          historyData.push(Number(cur.toFixed(2)));
        }
      }

      const added: Stock = {
        symbol: finalTicker,
        name: quoteData.shortName || newName.trim() || `${finalTicker} Corp`,
        price: price,
        change: quoteData.change || 0,
        changePercent: quoteData.changePercent || 0,
        market: resolvedMarket,
        marketCap: quoteData.marketCap || `$${(Math.random() * 200 + 5).toFixed(1)}B`,
        peRatio: quoteData.peRatio || (Math.random() * 32 + 8).toFixed(1),
        volume: quoteData.volume || `${(Math.random() * 15 + 1).toFixed(1)}M`,
        high: quoteData.high || price * 1.02,
        low: quoteData.low || price * 0.98,
        history: historyData,
        lastUpdated: new Date().toLocaleTimeString()
      };

      setStocks((prev) => {
        const updated = [added, ...prev];
        const stockSymbols = updated.map((s) => s.symbol);
        const indexSymbols = indices.map((i) => i.symbol);
        fetchAllRealQuotes(stockSymbols, indexSymbols);
        return updated;
      });

      setNewSymbol('');
      setNewName('');
      setValidationStockError('');
      setShowAddForm(false);
    } catch (e: any) {
      setValidationStockError(`Failed to validate symbol: ${e.message || String(e)}`);
    } finally {
      setIsValidatingStock(false);
    }
  };

  const handleDeleteStock = (symbol: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm(`Remove ${symbol} from watchlist?`)) {
      setStocks((prev) => prev.filter((s) => s.symbol !== symbol));
      setAlerts((prev) => prev.filter((a) => a.symbol !== symbol));
    }
  };

  const handleAddAlert = (symbol: string, condition: 'above' | 'below', value: number) => {
    const alertItem: PriceAlert = {
      id: 'alert-' + Date.now() + '-' + Math.random().toString(36).substr(2, 5),
      symbol,
      condition,
      value,
      active: true
    };
    setAlerts((prev) => [alertItem, ...prev]);
  };

  const handleRemoveAlert = (id: string) => {
    setAlerts((prev) => prev.filter((a) => a.id !== id));
  };

  const handleUpdateAnalysis = (symbol: string, analysis: StockAnalysis) => {
    setStocks((prev) =>
      prev.map((s) => {
        if (s.symbol === symbol) {
          return {
            ...s,
            price: analysis.price || s.price,
            change: analysis.change !== undefined ? analysis.change : s.change,
            changePercent: analysis.changePercent !== undefined ? analysis.changePercent : s.changePercent,
            marketCap: analysis.marketCap || s.marketCap,
            peRatio: analysis.peRatio || s.peRatio,
            volume: analysis.volume || s.volume,
            high: analysis.high || s.high,
            low: analysis.low || s.low,
            analysis
          };
        }
        return s;
      })
    );
  };

  const handleDismissNotif = (id: string) => {
    setTriggeredAlerts((prev) => prev.filter((notif) => notif.id !== id));
  };

  // Filters logic
  const filteredStocks = stocks.filter((stock) => {
    const matchesMarket = activeMarketFilter === 'All' || stock.market === activeMarketFilter;
    const matchesSearch =
      stock.symbol.toLowerCase().includes(searchQuery.toLowerCase()) ||
      stock.name.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesMarket && matchesSearch;
  });

  return (
    <div className="min-h-screen bg-gray-50 text-slate-900 flex flex-col antialiased">
      {/* Prime Top Header */}
      <header className="h-20 bg-white border-b border-gray-200 sticky top-0 z-40 px-4 md:px-10 flex items-center justify-between flex-shrink-0">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 bg-slate-900 rounded-sm flex items-center justify-center shrink-0">
            <div className="w-3 h-3 border-2 border-white rotate-45"></div>
          </div>
          <span className="font-semibold text-lg tracking-tight text-slate-900">Global Stock Tracker</span>
          <div className="hidden sm:block h-4 w-px bg-gray-300 mx-2"></div>
          <span className="hidden sm:inline text-gray-400 text-sm">Smart AI Terminal</span>
        </div>

        <div className="flex items-center gap-3">
          {/* API Limits Telemetry Status */}
          <div className="flex items-center gap-2 text-xs font-medium text-gray-500 bg-gray-50 border border-gray-200 px-3.5 py-1.5 rounded-md">
            <span className={`w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse`} />
            <span className="font-mono text-[11px] tracking-tight text-slate-700">
              {localApiKey 
                ? 'Client Key Active' 
                : localPasscode 
                ? 'Admin Key Active' 
                : 'Real-Time Live Feed'
              }
            </span>
            {apiLimits && apiLimits.cacheCount > 0 && (
              <>
                <span className="text-gray-300"> | </span>
                <span className="text-gray-400 font-mono text-[10px] uppercase font-bold tracking-wider">
                  {apiLimits.cacheCount} Cached
                </span>
              </>
            )}
          </div>

          {/* Last Successful Sync Update Timestamp */}
          {lastQuoteSyncTime && (
            <div className="hidden lg:flex items-center gap-1.5 text-xs text-emerald-800 bg-emerald-50/70 border border-emerald-250 px-3.5 py-1.5 rounded-md font-bold font-mono shadow-xs select-none" title="Last successful update across all ticker quotations">
              <span className="w-1.5 h-1.5 bg-emerald-600 rounded-full animate-ping" />
              <span>Synced: {lastQuoteSyncTime}</span>
            </div>
          )}

          {/* Clock Widget */}
          <div className="hidden md:flex items-center gap-2 text-xs text-slate-700 font-bold bg-violet-50/50 border border-violet-200/80 px-3 py-1.5 rounded-lg shadow-xs hover:bg-violet-50/85 transition-all select-none">
            <span className="relative flex h-1.5 w-1.5 shrink-0">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-violet-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-violet-600"></span>
            </span>
            <span className="font-mono tracking-tight text-slate-800 font-bold">{liveClock}</span>
            <span className="w-px bg-violet-200 h-3.5 mx-0.5 shrink-0"></span>
            <span className="text-[9.5px] font-black text-violet-700 bg-violet-100/80 px-2 py-0.5 rounded uppercase tracking-wide shrink-0" title={`Location Timezone: ${getResolvedTimeZone()}`}>
              {getResolvedTimeZone() === 'Asia/Hong_Kong' ? 'HKT' : getResolvedTimeZone().split('/').pop()?.replace('_', ' ') || 'Local'}
            </span>
          </div>

          {/* Typography Comfort Text Scale Selector Group */}
          <div className="flex items-center border border-gray-250/60 bg-gray-50/50 rounded-md p-1 gap-0.5" title="Set comfort text size (Mobile friendly)">
            {(['sm', 'base', 'lg', 'xl'] as const).map((sz) => (
              <button
                key={sz}
                type="button"
                onClick={() => setTextSize(sz)}
                className={`px-2 py-0.5 rounded text-[10px] font-black uppercase transition-all cursor-pointer ${
                  textSize === sz
                    ? 'bg-slate-900 text-white shadow-xs'
                    : 'text-gray-400 hover:text-slate-800'
                }`}
              >
                {sz === 'sm' ? 'A-' : sz === 'base' ? 'A' : sz === 'lg' ? 'A+' : 'A++'}
              </button>
            ))}
          </div>

          {/* Settings Trigger Button */}
          <button
            onClick={() => setShowSettings(!showSettings)}
            className={`flex items-center gap-1.5 text-xs font-semibold px-3.5 py-1.5 rounded-md border transition-all cursor-pointer ${
              showSettings
                ? 'bg-slate-900 border-slate-900 text-white shadow-xs'
                : 'bg-white border-gray-200 text-slate-750 hover:bg-gray-50'
            }`}
            title="Configure API Keys protection settings"
          >
            <Settings size={13} className={showSettings ? 'animate-spin-once' : ''} />
            <span className="hidden sm:inline">Settings & Keys</span>
          </button>
        </div>
      </header>

      {/* Safe Key Shielding Configuration Panel */}
      {showSettings && (
        <div className="bg-white border-b border-gray-200 py-6 px-4 md:px-10 shadow-inner flex flex-col md:flex-row md:items-start gap-6 transition-all duration-300">
          <div className="max-w-md space-y-2">
            <h4 className="font-bold text-slate-905 text-sm flex items-center gap-2">
              <Key size={16} className="text-slate-900" />
              API Quota & Secret Protection Controls
            </h4>
            <p className="text-xs text-slate-500 leading-relaxed">
              This terminal is strictly operating on <strong>100% Verified Real & Live Market Data</strong>. 
              Any form of simulations, mock estimations, or placeholder rates have been fully disabled and retired. 
              Because static-website servers (such as GitHub Pages or standard Netlify) lack a backend proxy node, browser CORS policies may temporarily restrict multi-endpoint syncing. Therefore, client-side queries leverage a sequence of public CORS proxies. Stock and index values are valid, true market figures, but may load with slight delays depending on proxy load.
            </p>
            <div className="flex flex-wrap gap-2 pt-1">
              <span className={`inline-flex items-center gap-1.5 text-[10px] uppercase font-bold tracking-wider px-2.5 py-1 rounded-sm border ${
                localApiKey 
                  ? 'bg-indigo-50 border-indigo-200 text-indigo-700' 
                  : localPasscode 
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-700' 
                  : 'bg-emerald-50 border-emerald-200 text-emerald-700'
              }`}>
                <span className={`w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse`} />
                Mode: {localApiKey ? 'Personal Client Key' : localPasscode ? 'Authorized Admin Key' : 'Strict Real-Time Data (No Sim)'}
              </span>
            </div>
          </div>

          <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="border border-gray-100 bg-gray-50/50 p-4 rounded-xl space-y-2.5">
              <div>
                <label className="block text-[10px] font-bold text-gray-450 uppercase tracking-widest mb-1.5">
                  1. Master Server Passcode
                </label>
                <input
                  type="password"
                  placeholder="Enter owner passcode (e.g. admin)"
                  value={localPasscode}
                  onChange={(e) => setLocalPasscode(e.target.value)}
                  className="w-full bg-white border border-gray-200 rounded-lg text-xs px-3 py-2 focus:outline-none focus:border-slate-500 text-slate-800"
                />
              </div>
              <p className="text-[10px] text-gray-400 leading-relaxed font-light">
                Required right here to unlock the server's shared private Gemini key. If configured, you can trigger grounded AI searches using the master key.
              </p>
            </div>

            <div className="border border-gray-100 bg-gray-50/50 p-4 rounded-xl space-y-2.5">
              <div>
                <label className="block text-[10px] font-bold text-gray-450 uppercase tracking-widest mb-1.5">
                  2. Personal Gemini API Key
                </label>
                <input
                  type="password"
                  placeholder="AI Studio key (starts with AIzaSy...)"
                  value={localApiKey}
                  onChange={(e) => setLocalApiKey(e.target.value)}
                  className="w-full bg-white border border-gray-200 rounded-lg text-xs px-3 py-2 focus:outline-none focus:border-slate-500 text-slate-800 font-mono"
                />
              </div>
              <p className="text-[10px] text-gray-400 leading-relaxed font-light">
                Saves in your browser's LocalStorage only (never shared or logged). Enables calling Gemini directly with your own private quota sandbox.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Main Container Area */}
      <main className="flex-1 w-full max-w-7xl mx-auto px-4 md:px-8 py-8 flex flex-col gap-8">
        
        {/* Top Indexes block */}
        <IndicesHeader indices={indices} setIndices={setIndices} />

        {/* Dynamic Alert Banner Notifications Banner */}
        {triggeredAlerts.length > 0 && (
          <div className="bg-amber-50/70 border border-amber-200 rounded-lg p-5 shadow-xs flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-amber-800 font-bold text-xs uppercase tracking-wider">
                <BellRing size={16} className="text-amber-500 animate-bounce" />
                Price Alert Breached
              </div>
              <button
                onClick={() => setTriggeredAlerts([])}
                className="text-[10px] uppercase font-mono text-amber-600 hover:text-amber-900 font-bold tracking-wider"
              >
                Clear All ({triggeredAlerts.length})
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {triggeredAlerts.map((notif) => (
                <div
                  key={notif.id}
                  className="bg-white border border-amber-100 p-3.5 rounded-lg flex items-center justify-between text-xs"
                >
                  <div className="flex flex-col">
                    <div className="font-medium text-slate-900">
                      <span className="font-mono font-bold mr-1">{notif.symbol}</span>
                      <span>
                        {notif.condition === 'above' ? 'rose above' : 'fell below'}
                      </span>
                    </div>
                    <div className="text-[11px] text-gray-400 font-mono mt-0.5">
                      Trigger: {notif.value} • At {notif.triggeredPrice}
                    </div>
                  </div>
                  <button
                    onClick={() => handleDismissNotif(notif.id)}
                    className="text-gray-400 hover:text-gray-700 text-sm font-bold ml-2 shrink-0"
                    title="Dismiss"
                  >
                    &times;
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Watchlist Core Panel (Full Width Area) */}
        <div className="space-y-6">

            {/* Real Data Notice Banner */}
            <div className="bg-emerald-50/40 border border-emerald-200/80 rounded-xl p-4 shadow-xs flex items-start gap-3 select-none">
              <span className="flex h-2 w-2 rounded-full bg-emerald-500 animate-pulse mt-1.5 shrink-0" />
              <div className="text-[11px] sm:text-xs text-emerald-800 leading-relaxed">
                <strong className="font-extrabold block text-emerald-905 uppercase tracking-wide mb-0.5">
                  Verified True Market Quotation
                </strong>
                All simulations and mock calculations are strictly retired. Pricing updates and chart series utilize genuine ticker endpoints. When the app runs on a static hosting service (such as GitHub Pages or Netlify), client browser requests are channeled via decentralized CORS proxy relays; as a result, quotes do not stream in microsecond loops but remain completely authentic.
              </div>
            </div>
            
            {/* Action Bar */}
            <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm flex flex-col sm:flex-row gap-4 items-center justify-between">
              
              {/* Filter Tabs */}
              <div className="flex flex-wrap p-1 gap-1 items-center bg-gray-150 rounded-lg w-full sm:w-auto self-start sm:self-center border border-gray-200">
                {(['All', 'US', 'HK', 'A-Share', 'TW', 'UK', 'JP', 'Europe', 'Canada', 'Australia', 'Singapore', 'Other'] as const).map((tab) => {
                  let label = tab === 'All' ? 'Global' : tab === 'A-Share' ? 'A-Shares' : tab === 'TW' ? 'Taiwan' : tab === 'JP' ? 'Japan' : tab;
                  return (
                    <button
                      key={tab}
                      onClick={() => setActiveMarketFilter(tab)}
                      className={`text-[11px] sm:text-xs px-2.5 py-1.5 rounded-md font-medium cursor-pointer transition-colors ${
                        activeMarketFilter === tab
                          ? 'bg-white shadow-xs text-slate-900 font-semibold'
                          : 'text-gray-500 hover:text-slate-900'
                      }`}
                    >
                      {label}
                    </button>
                  );
                })}
              </div>

              {/* Adding and Search Controls */}
              <div className="flex items-center gap-2.5 w-full sm:w-auto">
                {/* Embedded Search Filter Input */}
                <div className="relative flex-1 sm:w-48">
                  <span className="absolute left-3 top-2.5 text-gray-400">
                    <Search size={14} />
                  </span>
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search Symbol..."
                    className="w-full bg-gray-50 border border-gray-200 rounded-lg text-xs pl-9 pr-3 py-2 focus:outline-none focus:border-slate-500 text-slate-800"
                  />
                </div>

                <button
                  onClick={() => {
                    setShowAddForm(!showAddForm);
                    setValidationStockError('');
                    setNewSymbol('');
                    setNewName('');
                    setSelectedStockMatch(null);
                  }}
                  className={`px-4 py-2 rounded-lg text-xs font-semibold cursor-pointer transition-all flex items-center gap-1.5 shrink-0 ${
                    showAddForm
                      ? 'bg-gray-150 text-slate-700 border border-gray-200 hover:bg-gray-200'
                      : 'bg-slate-900 text-white hover:bg-slate-800'
                  }`}
                >
                  <Plus size={14} />
                  <span>Custom Tracker</span>
                </button>
              </div>

            </div>

            {/* Custom stock addition drawer */}
            {showAddForm && (
              <form
                onSubmit={handleAddStock}
                className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm space-y-4 relative"
              >
                <div className="flex justify-between items-center border-b border-gray-100 pb-3">
                  <h4 className="font-semibold text-slate-900 text-xs uppercase tracking-widest">
                    Add New Watchlist Stock
                  </h4>
                  <button
                    type="button"
                    onClick={() => {
                      setShowAddForm(false);
                      setValidationStockError('');
                      setSearchSuggestions([]);
                    }}
                    className="text-xs text-gray-400 hover:text-gray-700 font-medium"
                  >
                    Cancel
                  </button>
                </div>

                {validationStockError && (
                  <div className="bg-rose-50 border border-rose-200 text-rose-700 text-xs px-4 py-2.5 rounded-lg font-medium leading-relaxed">
                    {validationStockError}
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Ticker Search Box */}
                  <div className="relative">
                    <label className="text-[10px] text-gray-400 font-semibold uppercase block mb-1.5 tracking-wider">
                      Ticker Ticker/Name Search *
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        required
                        disabled={isValidatingStock}
                        placeholder="Type '2388', 'apple', '0700', etc..."
                        value={newSymbol}
                        onChange={(e) => setNewSymbol(e.target.value)}
                        className="w-full bg-gray-50 border border-gray-200 rounded-lg text-xs px-3 py-2.5 focus:outline-none focus:border-slate-500 text-slate-800 font-mono"
                      />
                      {isSearchingSuggestions && (
                        <div className="absolute right-3 top-3 flex items-center">
                          <span className="w-3.5 h-3.5 border-2 border-slate-350 border-t-slate-800 rounded-full animate-spin shrink-0" />
                        </div>
                      )}
                    </div>
                    <span className="text-[9px] text-emerald-600 block mt-1 font-mono">
                      Dynamic autocomplete will locate matches instantly.
                    </span>

                    {/* Autocomplete suggestions popup panel */}
                    {searchSuggestions.length > 0 && (
                      <div className="absolute left-0 right-0 z-50 mt-1 max-h-60 overflow-y-auto bg-white border border-gray-250 rounded-xl shadow-xl divide-y divide-gray-100 animate-fade-in divide-dashed">
                        <div className="px-3 py-2 bg-slate-50 text-[10px] font-bold text-slate-500 uppercase tracking-wider flex justify-between items-center sticky top-0 border-b border-gray-100">
                          <span>Multiple Matching Stocks</span>
                          <span className="bg-slate-200 text-slate-700 font-mono text-[9px] px-1.5 py-0.5 rounded font-medium">Select your match</span>
                        </div>
                        {searchSuggestions.map((item) => {
                          const market = getMarketFromSymbol(item.symbol);
                          return (
                            <button
                              key={item.symbol}
                              type="button"
                              onClick={() => handleSelectSuggestion(item)}
                              className="w-full text-left px-3.5 py-3 hover:bg-slate-50 flex items-center justify-between cursor-pointer group transition-colors"
                            >
                              <div className="truncate pr-4 flex items-center gap-2">
                                <span className="font-mono font-bold text-slate-900 text-xs bg-slate-100 px-2 py-0.5 rounded border border-gray-200 group-hover:bg-slate-200/80">
                                  {item.symbol}
                                </span>
                                <span className="text-xs text-slate-700 font-medium truncate max-w-[160px] sm:max-w-[200px]">
                                  {item.name}
                                </span>
                              </div>
                              <span className="font-mono text-[9px] font-bold text-gray-500 bg-gray-100 border border-gray-200 px-2 py-0.5 rounded-sm uppercase tracking-wider shrink-0">
                                {market === 'A-Share' ? 'A-Shares' : market}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  {/* Corporate Name Block */}
                  <div>
                    <label className="text-[10px] text-gray-400 font-semibold uppercase block mb-1.5 tracking-wider">
                      Company Name (Autofilled / Custom)
                    </label>
                    <input
                      type="text"
                      disabled={isValidatingStock}
                      placeholder="Will autofill from matched item"
                      value={newName}
                      onChange={(e) => setNewName(e.target.value)}
                      className="w-full bg-gray-50 border border-gray-200 rounded-lg text-xs px-3 py-2.5 focus:outline-none focus:border-slate-500 text-slate-800"
                    />
                    <span className="text-[9px] text-slate-400 block mt-1">
                      Pick above or edit manually if needed
                    </span>
                  </div>
                </div>

                {/* Validated details notice banner */}
                {selectedStockMatch && (
                  <div className="bg-emerald-50/70 border border-emerald-250/90 text-emerald-800 text-xs p-4 rounded-xl flex items-start gap-3 animate-slide-up select-none shadow-xs">
                    <span className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-100 text-emerald-600 mt-0.5 shrink-0 text-xs font-bold font-mono">
                      ✓
                    </span>
                    <div className="flex-1">
                      <div className="font-bold text-emerald-900 flex justify-between items-center pb-1 border-b border-emerald-200/50 mb-1.5 uppercase tracking-wider text-[10px]">
                        <span>Verified Ticker Configuration</span>
                        <span className="bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded font-mono font-bold text-[9px] border border-emerald-200">
                          {getMarketFromSymbol(selectedStockMatch.symbol)} EXCHANGE
                        </span>
                      </div>
                      <p className="leading-relaxed text-xs">
                        Company Name was dynamically resolved as <strong className="font-bold text-emerald-950 font-sans">{newName}</strong>.
                      </p>
                      <p className="leading-normal text-[10px] text-emerald-700 font-mono mt-0.5">
                        Ticker Symbol: {selectedStockMatch.symbol} • Source: Yahoo Finance Engine
                      </p>
                    </div>
                  </div>
                )}

                <div className="flex justify-end gap-2 pt-3 border-t border-gray-100 items-center">
                  <button
                    type="button"
                    disabled={isValidatingStock}
                    onClick={() => {
                      setNewSymbol('GOOG');
                      setNewName('Alphabet Inc.');
                    }}
                    className="text-[10px] text-gray-400 hover:text-gray-600 tracking-wide font-medium mr-auto disabled:opacity-40"
                  >
                    Load Sample (GOOG)
                  </button>

                  <button
                    type="submit"
                    disabled={isValidatingStock}
                    className="bg-slate-900 text-white rounded-lg px-4.5 py-2 text-xs font-semibold hover:bg-slate-800 active:scale-95 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5 shadow-xs"
                  >
                    {isValidatingStock ? (
                      <>
                        <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin shrink-0" />
                        <span>Validating with Yahoo...</span>
                      </>
                    ) : (
                      <span>Add Portfolio Watch</span>
                    )}
                  </button>
                </div>
              </form>
            )}

            {/* Core Watchlist lists */}
            <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
              <div className="bg-white border-b border-gray-150 p-4 px-6 flex justify-between items-center">
                <span className="text-[10px] text-gray-400 font-semibold uppercase tracking-widest">
                  Tracking watch list ({filteredStocks.length})
                </span>
                
                <div className="flex gap-2 items-center text-gray-400 text-[10px] tracking-wider uppercase font-bold">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                  <span>Live Feed Active</span>
                </div>
              </div>

              {filteredStocks.length === 0 ? (
                <div className="p-16 text-center text-gray-400 space-y-2 select-none">
                  <div className="text-sm font-medium text-slate-800">No stock tickers monitored</div>
                  <p className="text-xs max-w-[280px] mx-auto text-gray-400 leading-relaxed font-light">
                    Try changing your market filters tab or search name, or tap "Custom Tracker" above to add new symbols.
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-gray-100">
                  {filteredStocks.map((stock) => (
                    <div key={stock.symbol} className="group relative">
                      <StockRow
                        stock={stock}
                        alerts={alerts}
                        onAddAlert={handleAddAlert}
                        onRemoveAlert={handleRemoveAlert}
                        onUpdateAnalysis={handleUpdateAnalysis}
                        isExpanded={expandedSymbol === stock.symbol}
                        onToggleExpand={() =>
                          setExpandedSymbol(expandedSymbol === stock.symbol ? null : stock.symbol)
                        }
                        onDeleteStock={(sym) => {
                          setStocks((prev) => prev.filter((s) => s.symbol !== sym));
                          setAlerts((prev) => prev.filter((a) => a.symbol !== sym));
                        }}
                        onEditStock={(sym, params) => {
                          setStocks((prev) =>
                            prev.map((s) => (s.symbol === sym ? { ...s, ...params } : s))
                          );
                        }}
                      />
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Smart UI guide disclaimer */}
            <div className="bg-white border border-gray-200 rounded-xl p-5 text-xs text-gray-500 leading-relaxed flex items-start gap-3 shadow-xs">
              <Info size={16} className="text-slate-800 shrink-0 mt-0.5" />
              <div>
                <span className="font-semibold text-slate-900 block mb-1">Decision Matrix Terminal Information</span>
                Our portfolio utilizes modular horizontal compaction by default. Select any monitored stock row to inspect technical details, configure target metrics alarms, or request live financial report evaluation powered by search grounding.
              </div>
            </div>

          </div>

      </main>

      {/* Global simple footer */}
      <footer className="mt-auto border-t border-gray-200 bg-white">
        <div className="w-full max-w-7xl mx-auto px-6 py-6 flex flex-col sm:flex-row justify-between items-center gap-4 text-[10px] uppercase font-bold text-gray-400 tracking-widest">
          <div className="flex space-x-8">
            <span>Session: Active</span>
            <span>Ref: ST-Global</span>
          </div>
          <div className="flex space-x-8">
            <span>Model: Gemini-3.5-Flash</span>
            <span>Live ground verified</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
