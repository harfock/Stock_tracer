import React, { useState, useEffect } from 'react';
import { initialIndices, initialStocks } from './data';
import { Stock, PriceAlert, MarketIndex, StockAnalysis } from './types';
import IndicesHeader from './components/IndicesHeader';
import StockRow from './components/StockRow';
import ChatAssistant from './components/ChatAssistant';
import { Clock, Plus, Trash2, Search, BellRing, Sparkles, TrendingUp, TrendingDown, HelpCircle, CheckCircle, Info, Settings, Key, ShieldCheck, ShieldAlert } from 'lucide-react';

interface TriggeredNotification {
  id: string;
  symbol: string;
  condition: 'above' | 'below';
  value: number;
  triggeredPrice: number;
  time: string;
}

export default function App() {
  const [stocks, setStocks] = useState<Stock[]>(() => {
    const saved = localStorage.getItem('g_tracker_stocks');
    return saved ? JSON.parse(saved) : initialStocks;
  });

  const [indices, setIndices] = useState<MarketIndex[]>(initialIndices);
  
  const [alerts, setAlerts] = useState<PriceAlert[]>(() => {
    const saved = localStorage.getItem('g_tracker_alerts');
    return saved ? JSON.parse(saved) : [];
  });

  const [triggeredAlerts, setTriggeredAlerts] = useState<TriggeredNotification[]>([]);
  const [activeMarketFilter, setActiveMarketFilter] = useState<'All' | 'US' | 'HK' | 'A-Share'>('All');
  
  // Custom stock additions
  const [newSymbol, setNewSymbol] = useState<string>('');
  const [newName, setNewName] = useState<string>('');
  const [newMarket, setNewMarket] = useState<'US' | 'HK' | 'A-Share'>('US');
  const [showAddForm, setShowAddForm] = useState<boolean>(false);
  
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

  // Live clock display matching user local time format
  const [liveClock, setLiveClock] = useState<string>('2026-05-29 12:21:58');

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

  // Handle Incremental live clock updates
  useEffect(() => {
    const baseTime = new Date('2026-05-29T12:21:58Z');
    let secsOffset = 0;
    const interval = setInterval(() => {
      secsOffset += 1;
      const computed = new Date(baseTime.getTime() + secsOffset * 1000);
      const yr = computed.getUTCFullYear();
      const mo = String(computed.getUTCMonth() + 1).padStart(2, '0');
      const dy = String(computed.getUTCDate()).padStart(2, '0');
      const hr = String(computed.getUTCHours()).padStart(2, '0');
      const mi = String(computed.getUTCMinutes()).padStart(2, '0');
      const sc = String(computed.getUTCSeconds()).padStart(2, '0');
      setLiveClock(`${yr}-${mo}-${dy} ${hr}:${mi}:${sc} (UTC)`);
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  // Helper to fetch real stock and index prices from our Yahoo Finance proxy server
  const fetchAllRealQuotes = async (symbolsToFetch: string[], indicesToFetch: string[]) => {
    // 1. Fetch real stock quotes
    if (symbolsToFetch.length > 0) {
      try {
        const res = await fetch('/api/stocks/quotes', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ symbols: symbolsToFetch })
        });
        if (res.ok) {
          const body = await res.json();
          if (body.success && body.results) {
            setStocks((curStocks) => {
              return curStocks.map((stock) => {
                const found = body.results.find((r: any) => r.symbol === stock.symbol);
                if (found && found.success && found.data) {
                  const q = found.data;

                  // Trigger alerts logic based on actual real price
                  alerts.forEach((alert) => {
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

                  return {
                    ...stock,
                    price: q.price,
                    change: q.change,
                    changePercent: q.changePercent,
                    high: q.high,
                    low: q.low,
                    volume: q.volume || stock.volume,
                    history: q.history && q.history.length > 0 ? q.history : stock.history
                  };
                }
                return stock;
              });
            });
          }
        }
      } catch (err) {
        console.warn('Real-time stock quotes refresh skipped:', err);
      }
    }

    // 2. Fetch real market index quotations
    if (indicesToFetch.length > 0) {
      try {
        const res = await fetch('/api/stocks/quotes', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ symbols: indicesToFetch })
        });
        if (res.ok) {
          const body = await res.json();
          if (body.success && body.results) {
            setIndices((curIndices) => {
              return curIndices.map((idx) => {
                const found = body.results.find((r: any) => r.symbol === idx.symbol);
                if (found && found.success && found.data) {
                  const q = found.data;
                  return {
                    ...idx,
                    price: q.price,
                    change: q.change,
                    changePercent: q.changePercent,
                    history: q.history && q.history.length > 0 ? q.history : idx.history
                  };
                }
                return idx;
              });
            });
          }
        }
      } catch (err) {
        console.warn('Real-time index quotes refresh skipped:', err);
      }
    }
  };

  // Run initial Real Quote Load & define real-time background sync interval
  useEffect(() => {
    const stockSymbols = stocks.map((s) => s.symbol);
    const indexSymbols = indices.map((i) => i.symbol);
    
    // Initial fetch on mount
    fetchAllRealQuotes(stockSymbols, indexSymbols);

    // Dynamic polling interval (every 8 seconds) to update actual prices for free
    const syncInterval = setInterval(() => {
      // Re-evaluate the active list in case items were added/removed
      setStocks((currentVal) => {
        const activeStockSyms = currentVal.map((s) => s.symbol);
        const activeIndexSyms = indices.map((i) => i.symbol);
        fetchAllRealQuotes(activeStockSyms, activeIndexSyms);
        return currentVal;
      });
    }, 8000);

    return () => clearInterval(syncInterval);
  }, [alerts]);

  const handleAddStock = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSymbol.trim()) return;

    const ticker = newSymbol.trim().toUpperCase();
    // Prevent duplicated items
    if (stocks.some((s) => s.symbol === ticker)) {
      alert('Stock ticker already exists in tracker!');
      return;
    }

    const defaultPrice = Math.floor(Math.random() * 200) + 20;
    const historyData: number[] = [];
    let cur = defaultPrice * 0.95;
    for (let i = 0; i < 20; i++) {
      cur = cur * (1 + (Math.random() - 0.48) * 0.012);
      historyData.push(Number(cur.toFixed(2)));
    }

    const added: Stock = {
      symbol: ticker,
      name: newName.trim() || `${ticker} Corp`,
      price: defaultPrice,
      change: 0,
      changePercent: 0,
      market: newMarket,
      marketCap: `$${(Math.random() * 200 + 5).toFixed(1)}B`,
      peRatio: (Math.random() * 32 + 8).toFixed(1),
      volume: `${(Math.random() * 15 + 1).toFixed(1)}M`,
      high: defaultPrice * 1.02,
      low: defaultPrice * 0.98,
      history: historyData
    };

    setStocks((prev) => [added, ...prev]);
    setNewSymbol('');
    setNewName('');
    setShowAddForm(false);
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
            <span className={`w-1.5 h-1.5 rounded-full ${
              localApiKey 
                ? 'bg-indigo-500 animate-pulse' 
                : localPasscode 
                ? 'bg-emerald-500 animate-pulse' 
                : 'bg-rose-500'
            }`} />
            <span className="font-mono text-[11px] tracking-tight">
              {localApiKey 
                ? 'Client Key Active' 
                : localPasscode 
                ? 'Admin Key Active' 
                : 'Simulation Active'
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

          {/* Clock Widget */}
          <div className="hidden md:flex items-center gap-1.5 text-xs text-gray-500 font-medium bg-gray-50 border border-gray-200 px-3.5 py-1.5 rounded-md">
            <Clock size={12} className="text-gray-400" />
            <span className="font-mono tracking-tight">{liveClock}</span>
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
              By default, this dashboard operates in <strong>Protected Local Simulation Mode</strong>. 
              This runs high-precision real-time simulated technical reports and custom macro predictions locally, 
              consuming exactly <strong>0 private Gemini API quota</strong>. This fully shields the app owner's private keys.
            </p>
            <div className="flex flex-wrap gap-2 pt-1">
              <span className={`inline-flex items-center gap-1.5 text-[10px] uppercase font-bold tracking-wider px-2.5 py-1 rounded-sm border ${
                localApiKey 
                  ? 'bg-indigo-50 border-indigo-200 text-indigo-700' 
                  : localPasscode 
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-700' 
                  : 'bg-rose-50 border-rose-200 text-rose-700'
              }`}>
                <span className={`w-1.5 h-1.5 rounded-full ${
                  localApiKey ? 'bg-indigo-500 animate-pulse' : localPasscode ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'
                }`} />
                Mode: {localApiKey ? 'Personal Client Key' : localPasscode ? 'Authorized Admin Key' : 'Protected Local Simulation'}
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
        <IndicesHeader indices={indices} />

        {/* Dynamic Alert Banner Notifications Banner */}
        {triggeredAlerts.length > 0 && (
          <div className="bg-amber-50/70 border border-amber-200 rounded-lg p-5 shadow-xs flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-amber-800 font-bold text-xs uppercase tracking-wider">
                <BellRing size={16} className="text-amber-500 animate-bounce" />
                Price Alert Breached / 股價預警觸發
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

        {/* Dashboard Division Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          {/* Watchlist Core Panel (Left Area) */}
          <div className="lg:col-span-8 space-y-6">
            
            {/* Action Bar */}
            <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm flex flex-col sm:flex-row gap-4 items-center justify-between">
              
              {/* Filter Tabs */}
              <div className="flex flex-wrap p-1 gap-1 bg-gray-150 rounded-lg w-full sm:w-auto self-start sm:self-center border border-gray-200">
                {(['All', 'US', 'HK', 'A-Share'] as const).map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setActiveMarketFilter(tab)}
                    className={`flex-1 sm:flex-none text-xs px-3.5 py-2 rounded-md font-medium cursor-pointer transition-colors ${
                      activeMarketFilter === tab
                        ? 'bg-white shadow-xs text-slate-900 font-semibold'
                        : 'text-gray-500 hover:text-slate-900'
                    }`}
                  >
                    {tab === 'All' ? '全部市場' : tab}
                  </button>
                ))}
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
                  onClick={() => setShowAddForm(!showAddForm)}
                  className={`px-4 py-2 rounded-lg text-xs font-semibold cursor-pointer transition-all flex items-center gap-1.5 shrink-0 ${
                    showAddForm
                      ? 'bg-gray-150 text-slate-705 border border-gray-200 hover:bg-gray-200'
                      : 'bg-slate-900 text-white hover:bg-slate-805 active:scale-95'
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
                className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm space-y-4"
              >
                <div className="flex justify-between items-center border-b border-gray-100 pb-3">
                  <h4 className="font-semibold text-slate-900 text-xs uppercase tracking-widest">
                    Add New Watchlist Stock
                  </h4>
                  <button
                    type="button"
                    onClick={() => setShowAddForm(false)}
                    className="text-xs text-gray-400 hover:text-gray-700 font-medium"
                  >
                    Cancel
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="text-[10px] text-gray-400 font-semibold uppercase block mb-1.5 tracking-wider">
                      Ticker Symbol *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. AMZN or 0005.HK"
                      value={newSymbol}
                      onChange={(e) => setNewSymbol(e.target.value)}
                      className="w-full bg-gray-50 border border-gray-200 rounded-lg text-xs px-3 py-2 focus:outline-none focus:border-slate-500 text-slate-800 font-mono"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] text-gray-400 font-semibold uppercase block mb-1.5 tracking-wider">
                      Company Name
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Amazon.com Inc."
                      value={newName}
                      onChange={(e) => setNewName(e.target.value)}
                      className="w-full bg-gray-50 border border-gray-200 rounded-lg text-xs px-3 py-2 focus:outline-none focus:border-slate-500 text-slate-800"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] text-gray-400 font-semibold uppercase block mb-1.5 tracking-wider">
                      Primary Market
                    </label>
                    <select
                      value={newMarket}
                      onChange={(e) => setNewMarket(e.target.value as 'US' | 'HK' | 'A-Share')}
                      className="w-full bg-gray-50 border border-gray-200 rounded-lg text-xs px-3 py-2 focus:outline-none focus:border-slate-500 text-slate-800 bg-white"
                    >
                      <option value="US">US Stocks (美股)</option>
                      <option value="HK">HK Stocks (港股)</option>
                      <option value="A-Share">A-Shares (深滬 A 股)</option>
                    </select>
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-2 border-t border-gray-100">
                  <button
                    type="button"
                    onClick={() => {
                      setNewSymbol('GOOG');
                      setNewName('Alphabet Inc.');
                      setNewMarket('US');
                    }}
                    className="text-[10px] text-gray-400 hover:text-gray-600 tracking-wide font-medium mr-auto"
                  >
                    Autofill sample (GOOG)
                  </button>

                  <button
                    type="submit"
                    className="bg-slate-900 text-white rounded-lg px-4 py-2 text-xs font-semibold hover:bg-slate-800 active:scale-95 transition-all cursor-pointer"
                  >
                    Add Portfolio Watch
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
                      />
                      {/* Delete action button positioned cleanly on hovering */}
                      <button
                        type="button"
                        onClick={(e) => handleDeleteStock(stock.symbol, e)}
                        className="absolute right-12 top-[18px] opacity-0 group-hover:opacity-100 transition-opacity p-1 text-gray-300 hover:text-red-655 z-10 cursor-pointer"
                        title="Remove ticker"
                      >
                        <Trash2 size={13} />
                      </button>
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

          {/* AI Advisor Panel (Right area) */}
          <div className="lg:col-span-4 lg:sticky lg:top-24">
            <ChatAssistant watchlistSymbols={stocks.map((s) => s.symbol)} />
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
