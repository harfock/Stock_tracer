import { MarketIndex } from '../types';

interface IndicesHeaderProps {
  indices: MarketIndex[];
}

export default function IndicesHeader({ indices }: IndicesHeaderProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-2">
      {indices.map((idx) => {
        const isPositive = idx.change >= 0;
        const historyPath = idx.history
          .map((val, i) => `${(i / (idx.history.length - 1)) * 100},${50 - ((val - Math.min(...idx.history)) / (Math.max(...idx.history) - Math.min(...idx.history) || 1)) * 40}`)
          .join(' ');

        return (
          <div
            key={idx.symbol}
            id={`idx-card-${idx.symbol.replace('.', '')}`}
            className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm transition-all hover:border-slate-300 hover:shadow-md"
          >
            <div className="flex justify-between items-start mb-2">
              <div>
                <span className="text-[10px] font-mono font-bold text-gray-400 bg-gray-50 border border-gray-100 px-2 py-0.5 rounded-sm uppercase tracking-wider">
                  {idx.market}
                </span>
                <h4 className="text-sm font-semibold text-slate-900 mt-2.5 truncate max-w-[140px]" title={idx.name}>
                  {idx.name}
                </h4>
              </div>
              <div className="w-16 h-8 overflow-visible">
                <svg viewBox="0 0 100 50" className="w-full h-full">
                  <path
                    d={`M 0,25 ${historyPath}`}
                    fill="none"
                    stroke={isPositive ? '#10b981' : '#f43f5e'}
                    strokeWidth="1.8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </div>
            </div>

            <div className="flex justify-between items-baseline mt-4">
              <span className="text-2xl font-light tracking-tight text-slate-900 font-mono">
                {idx.price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
              <div className="flex items-center gap-1">
                <span className={`text-xs font-mono font-semibold px-2 py-0.5 rounded-sm ${isPositive ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' : 'bg-red-50 text-red-700 border border-red-100'}`}>
                  {isPositive ? '▲' : '▼'}{' '}
                  {Math.abs(idx.changePercent).toFixed(2)}%
                </span>
              </div>
            </div>
            <div className="text-[10px] font-mono text-gray-400 mt-1.5 uppercase font-semibold tracking-wider">
              {isPositive ? '+' : ''}{idx.change.toFixed(2)} pts
            </div>
          </div>
        );
      })}
    </div>
  );
}
