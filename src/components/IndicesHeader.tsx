import React, { useState, useEffect, useRef, Dispatch, SetStateAction } from 'react';
import { MarketIndex } from '../types';
import { Plus, X } from 'lucide-react';

interface IndicesHeaderProps {
  indices: MarketIndex[];
  setIndices: Dispatch<SetStateAction<MarketIndex[]>>;
}

const generateDummyHistory = (base: number = 10000, count: number = 12) => {
  const result: number[] = [];
  let curr = base;
  for (let i = 0; i < count; i++) {
    const change = (Math.random() - 0.48) * 0.005;
    curr = curr * (1 + change);
    result.push(Number(curr.toFixed(2)));
  }
  return result;
};

interface IndexCardProps {
  idx: MarketIndex;
  onRemove: () => void;
  key?: string;
}

function IndexCard({ idx, onRemove }: IndexCardProps) {
  const [flashClass, setFlashClass] = useState<'flash-up' | 'flash-down' | null>(null);
  const [showConfirm, setShowConfirm] = useState(false);
  const prevPriceRef = useRef<number>(idx.price);

  useEffect(() => {
    if (idx.price > prevPriceRef.current) {
      setFlashClass('flash-up');
      const timer = setTimeout(() => setFlashClass(null), 1000);
      return () => clearTimeout(timer);
    } else if (idx.price < prevPriceRef.current) {
      setFlashClass('flash-down');
      const timer = setTimeout(() => setFlashClass(null), 1000);
      return () => clearTimeout(timer);
    }
    prevPriceRef.current = idx.price;
  }, [idx.price]);

  const isPositive = idx.change >= 0;
  const historyPath = idx.history && idx.history.length > 0
    ? idx.history
        .map((val, i) => `${(i / (idx.history.length - 1)) * 100},${50 - ((val - Math.min(...idx.history)) / (Math.max(...idx.history) - Math.min(...idx.history) || 1)) * 40}`)
        .join(' ')
    : '';

  if (showConfirm) {
    return (
      <div
        id={`idx-card-confirm-${idx.symbol.replace('.', '')}`}
        className="bg-rose-50/90 border border-rose-200 rounded-xl p-5 shadow-sm transition-all flex flex-col justify-between min-h-[140px] animate-fade-in"
      >
        <div>
          <h4 className="text-xs font-bold text-rose-800 uppercase tracking-wider mb-1">Remove Index</h4>
          <p className="text-xs text-rose-700 leading-snug">
            Are you sure you want to remove <span className="font-semibold text-slate-900">{idx.name}</span> from top tracking header?
          </p>
        </div>
        <div className="flex gap-2 justify-end mt-4">
          <button
            type="button"
            onClick={() => setShowConfirm(false)}
            className="px-2.5 py-1 text-[11px] font-bold bg-white border border-gray-200 hover:bg-gray-100 text-gray-700 rounded-lg cursor-pointer transition-all"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => {
              setShowConfirm(false);
              onRemove();
            }}
            className="px-2.5 py-1 text-[11px] font-bold bg-rose-650 hover:bg-rose-700 text-white rounded-lg cursor-pointer transition-all shadow-xs"
          >
            Yes, Remove
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      key={idx.symbol}
      id={`idx-card-${idx.symbol.replace('.', '')}`}
      className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm transition-all hover:border-slate-300 hover:shadow-md relative group flex flex-col justify-between"
    >
      {/* Visible minus delete button */}
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setShowConfirm(true);
        }}
        className="absolute top-2.5 right-2.5 w-5 h-5 flex items-center justify-center bg-gray-50 text-gray-400 rounded-full border border-gray-150 hover:bg-rose-600 hover:text-white hover:border-rose-700 transition-all cursor-pointer z-10"
        title="Remove index feed"
      >
        <span className="text-xs font-bold font-mono leading-none">-</span>
      </button>

      <div className="flex justify-between items-start mb-2">
        <div className="pr-6">
          <h4 className="text-sm font-semibold text-slate-900 mt-0.5 truncate max-w-[160px] sm:max-w-[200px]" title={idx.name}>
            {idx.name}
          </h4>
          <span className="text-[10px] font-mono font-medium text-slate-400 mt-0.5 block tracking-wide">
            {idx.symbol}
          </span>
        </div>
        <div className="w-16 h-8 overflow-visible shrink-0 select-none">
          {historyPath && (
            <svg viewBox="0 0 100 50" className="w-full h-full">
              <polyline
                fill="none"
                stroke={isPositive ? '#10b981' : '#f43f5e'}
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
                points={historyPath}
              />
            </svg>
          )}
        </div>
      </div>

      <div>
        <div className="flex justify-between items-baseline mt-2">
          <span className={`text-2xl font-semibold tracking-tight font-mono transition-all duration-300 rounded px-1 py-0.5 ${
            flashClass === 'flash-up'
              ? 'text-emerald-700 bg-emerald-500/10 scale-102 ring-1 ring-emerald-500/20'
              : flashClass === 'flash-down'
              ? 'text-rose-700 bg-rose-500/10 scale-102 ring-1 ring-rose-500/20'
              : 'text-slate-900'
          }`}>
            {idx.price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </span>
          <div className="flex items-center gap-1 shrink-0">
            <span className={`text-xs font-mono font-semibold px-2 py-0.5 rounded-sm ${isPositive ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' : 'bg-red-50 text-red-700 border border-red-100'}`}>
              {isPositive ? '▲' : '▼'}{' '}
              {Math.abs(idx.changePercent).toFixed(2)}%
            </span>
          </div>
        </div>
        <div className="text-[10px] font-mono text-gray-400 mt-1 uppercase font-semibold tracking-wider">
          {isPositive ? '+' : ''}{idx.change.toFixed(2)} pts
        </div>
      </div>
    </div>
  );
}

const PRESET_INDICES: { symbol: string; name: string; market: 'US' | 'HK' | 'A-Share' }[] = [
  { symbol: '.IXIC', name: 'NASDAQ Composite', market: 'US' },
  { symbol: '.DJI', name: 'Dow Jones Ind.', market: 'US' },
  { symbol: '^GSPC', name: 'S&P 500 Index', market: 'US' },
  { symbol: 'HSI', name: 'Hang Seng Index', market: 'HK' },
  { symbol: '000001.SS', name: 'SSE Composite', market: 'A-Share' },
  { symbol: '399001.SZ', name: 'SZSE Component', market: 'A-Share' },
  { symbol: '^N225', name: 'Nikkei 225', market: 'US' },
  { symbol: '^FTSE', name: 'FTSE 100', market: 'US' },
  { symbol: '^GDAXI', name: 'DAX Performance Index', market: 'US' },
  { symbol: '^FCHI', name: 'CAC 40', market: 'US' },
  { symbol: '^KS11', name: 'KOSPI Index', market: 'US' },
  { symbol: '^TWII', name: 'TAIEX Index', market: 'US' },
  { symbol: '^AXJO', name: 'S&P/ASX 200', market: 'US' },
];

function AddIndexCard({ 
  indices, 
  onAdd 
}: { 
  indices: MarketIndex[];
  onAdd: (index: Omit<MarketIndex, 'price' | 'change' | 'changePercent' | 'history'>) => boolean;
}) {
  const [isAdding, setIsAdding] = useState(false);
  const [selectedSymbol, setSelectedSymbol] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  // Filter out indices already in the user's active indices list
  const availablePresets = PRESET_INDICES.filter(
    (preset) => !indices.some((idx) => idx.symbol === preset.symbol)
  );

  // Set first available symbol as selected by default when opening addition UI
  useEffect(() => {
    if (isAdding && availablePresets.length > 0 && !selectedSymbol) {
      setSelectedSymbol(availablePresets[0].symbol);
    }
  }, [isAdding, availablePresets, selectedSymbol]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (!selectedSymbol) {
      setErrorMsg('Please select an index');
      return;
    }

    const matchedPreset = PRESET_INDICES.find((p) => p.symbol === selectedSymbol);
    if (!matchedPreset) {
      setErrorMsg('Selected index configuration not found');
      return;
    }

    const success = onAdd({
      symbol: matchedPreset.symbol,
      name: matchedPreset.name,
      market: matchedPreset.market,
    });

    if (success) {
      setSelectedSymbol('');
      setIsAdding(false);
    } else {
      setErrorMsg('Index symbol already exists!');
    }
  };

  if (!isAdding) {
    return (
      <div
        onClick={() => setIsAdding(true)}
        className="bg-gray-50/30 border-2 border-dashed border-gray-200 hover:border-slate-355 hover:bg-gray-50/70 cursor-pointer flex flex-col items-center justify-center min-h-[140px] rounded-xl text-gray-400 hover:text-slate-800 transition-all p-5 shadow-sm group select-none"
      >
        <span className="p-2 bg-white border border-gray-100 rounded-full shadow-xs text-gray-400 group-hover:text-slate-600 mb-2 transition-all">
          <Plus size={14} />
        </span>
        <span className="text-[11px] font-bold tracking-wider uppercase">Add Index Track</span>
        <span className="text-[8px] text-gray-400 mt-0.5">Subject to Yahoo Finance source</span>
      </div>
    );
  }

  // If there are no more preset indexes to add
  if (availablePresets.length === 0) {
    return (
      <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm flex flex-col justify-between min-h-[140px]">
        <div className="flex justify-between items-center pb-1.5 border-b border-gray-100">
          <h5 className="text-[10px] font-black uppercase tracking-wider text-slate-800">Add Global Index</h5>
          <button
            type="button"
            onClick={() => setIsAdding(false)}
            className="text-gray-450 hover:text-slate-700 cursor-pointer"
          >
            <X size={12} />
          </button>
        </div>
        <div className="text-center py-4">
          <p className="text-xs text-gray-450 font-medium font-sans">
            All supported public indices have already been added to your tracking header!
          </p>
        </div>
        <button
          type="button"
          onClick={() => setIsAdding(false)}
          className="w-full py-1.5 bg-gray-50 border border-gray-200 text-gray-500 rounded-lg text-[11px] font-bold hover:bg-gray-100 transition-all cursor-pointer"
        >
          Close
        </button>
      </div>
    );
  }

  const currentSelection = PRESET_INDICES.find((p) => p.symbol === selectedSymbol);

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm flex flex-col justify-between min-h-[140px]">
      <form onSubmit={handleSubmit} className="space-y-3">
        <div className="flex justify-between items-center pb-1.5 border-b border-gray-100">
          <h5 className="text-[10px] font-black uppercase tracking-wider text-slate-800">Add Global Index</h5>
          <button
            type="button"
            onClick={() => {
              setIsAdding(false);
              setErrorMsg('');
            }}
            className="text-gray-450 hover:text-slate-700 cursor-pointer"
          >
            <X size={12} />
          </button>
        </div>

        {errorMsg && (
          <div className="text-[9px] text-rose-600 bg-rose-50 border border-rose-100 px-2 py-0.5 rounded-sm font-medium">
            {errorMsg}
          </div>
        )}

        <div>
          <label className="text-[8px] font-bold text-gray-400 uppercase tracking-wider block mb-1">Select Global Benchmark</label>
          <select
            value={selectedSymbol}
            onChange={(e) => {
              setSelectedSymbol(e.target.value);
              setErrorMsg('');
            }}
            className="w-full border border-gray-250/70 rounded-lg p-2 font-sans text-xs bg-white text-slate-800 focus:outline-none focus:border-slate-500 cursor-pointer"
          >
            {availablePresets.map((preset) => (
              <option key={preset.symbol} value={preset.symbol}>
                {preset.name} ({preset.symbol})
              </option>
            ))}
          </select>
        </div>

        {currentSelection && (
          <div className="bg-gray-50 p-2 rounded-lg border border-gray-150 flex items-center justify-between text-[10px]">
            <div>
              <span className="text-[8px] font-bold text-gray-400 uppercase block tracking-wider">Auto Market</span>
              <span className="font-semibold text-slate-800 mt-0.5 block">{currentSelection.market}</span>
            </div>
            <div className="text-right">
              <span className="text-[8px] font-bold text-gray-400 uppercase block tracking-wider">Ticker Symbol</span>
              <span className="font-mono text-slate-800 font-semibold mt-0.5 block">{currentSelection.symbol}</span>
            </div>
          </div>
        )}

        <div className="flex justify-end pt-1">
          <button
            type="submit"
            className="px-4 py-1.5 bg-slate-900 border border-slate-900 text-white rounded-lg text-xs font-bold hover:bg-slate-800 transition-all cursor-pointer shadow-xs"
          >
            Add Index
          </button>
        </div>
      </form>
    </div>
  );
}

export default function IndicesHeader({ indices, setIndices }: IndicesHeaderProps) {
  const handleRemoveIndex = (symbol: string) => {
    setIndices((prev) => prev.filter((idx) => idx.symbol !== symbol));
  };

  const handleAddIndex = (newIdx: Omit<MarketIndex, 'price' | 'change' | 'changePercent' | 'history'>) => {
    const exists = indices.some((idx) => idx.symbol === newIdx.symbol);
    if (exists) {
      return false;
    }

    const defaultPrice = 10000 + Math.floor(Math.random() * 5000);
    const resolvedIndex: MarketIndex = {
      ...newIdx,
      price: defaultPrice,
      change: 0,
      changePercent: 0,
      history: generateDummyHistory(defaultPrice, 12)
    };

    setIndices((prev) => [...prev, resolvedIndex]);
    return true;
  };

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 mb-2">
      {indices.map((idx) => (
        <IndexCard key={idx.symbol} idx={idx} onRemove={() => handleRemoveIndex(idx.symbol)} />
      ))}
      
      {indices.length < 8 && (
        <AddIndexCard indices={indices} onAdd={handleAddIndex} />
      )}
    </div>
  );
}
