'use client';
import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { Trash2, RefreshCw, BookmarkCheck, ExternalLink, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { StockData } from '@/lib/types';
import { formatCurrency, formatPercent, getTrendSignal, getRSISignal } from '@/lib/utils';

interface WatchItem {
  symbol: string;
  data: StockData | null;
  loading: boolean;
  error: boolean;
}

export default function WatchlistPage() {
  const [items, setItems] = useState<WatchItem[]>([]);
  const [initialized, setInitialized] = useState(false);

  const loadSymbols = useCallback((symbols: string[]) => {
    const initial: WatchItem[] = symbols.map(s => ({
      symbol: s,
      data: null,
      loading: true,
      error: false,
    }));
    setItems(initial);

    symbols.forEach(sym => {
      fetch(`/api/stock?symbol=${encodeURIComponent(sym)}`)
        .then(r => r.json())
        .then(data => {
          setItems(prev =>
            prev.map(it =>
              it.symbol === sym ? { ...it, data: data as StockData, loading: false } : it,
            ),
          );
        })
        .catch(() => {
          setItems(prev =>
            prev.map(it =>
              it.symbol === sym ? { ...it, loading: false, error: true } : it,
            ),
          );
        });
    });
  }, []);

  useEffect(() => {
    const raw = localStorage.getItem('watchlist');
    const symbols: string[] = raw ? JSON.parse(raw) : [];
    setInitialized(true);
    if (symbols.length) loadSymbols(symbols);
  }, [loadSymbols]);

  const remove = (sym: string) => {
    const next = items.filter(i => i.symbol !== sym).map(i => i.symbol);
    localStorage.setItem('watchlist', JSON.stringify(next));
    setItems(prev => prev.filter(i => i.symbol !== sym));
  };

  const refreshAll = () => {
    const syms = items.map(i => i.symbol);
    loadSymbols(syms);
  };

  if (!initialized) return null;

  if (items.length === 0) {
    return (
      <div className="min-h-screen bg-[#F0F4F8] dark:bg-[#0F172A]">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6">
          <h1 className="text-xl font-bold text-gray-900 dark:text-white mb-1">Watchlist</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-8">
            Your saved stocks appear here.
          </p>
          <div className="flex flex-col items-center justify-center py-20 gap-3 text-center">
            <BookmarkCheck className="w-10 h-10 text-gray-200 dark:text-gray-800" />
            <p className="text-gray-500 dark:text-gray-400 text-sm">Your watchlist is empty</p>
            <Link
              href="/app"
              className="text-[#0EA5E9] hover:underline text-sm font-medium"
            >
              Search for stocks to add
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F0F4F8] dark:bg-[#0F172A]">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-xl font-bold text-gray-900 dark:text-white">Watchlist</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {items.length} stock{items.length !== 1 ? 's' : ''}
            </p>
          </div>
          <button
            onClick={refreshAll}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 text-xs font-medium rounded-lg hover:border-[#0EA5E9] hover:text-[#0EA5E9] transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Refresh All
          </button>
        </div>

        <div className="space-y-2">
          {items.map(item => (
            <WatchCard key={item.symbol} item={item} onRemove={() => remove(item.symbol)} />
          ))}
        </div>
      </div>
    </div>
  );
}

function WatchCard({ item, onRemove }: { item: WatchItem; onRemove: () => void }) {
  const { symbol, data, loading, error } = item;

  if (loading) {
    return (
      <div className="bg-white dark:bg-[#1E293B] rounded-xl border border-gray-200 dark:border-[#1F2937] p-4 animate-pulse">
        <div className="flex items-center justify-between">
          <div>
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-16 mb-1.5" />
            <div className="h-3 bg-gray-100 dark:bg-gray-800 rounded w-32" />
          </div>
          <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-20" />
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="bg-white dark:bg-[#1E293B] rounded-xl border border-gray-200 dark:border-[#1F2937] p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="font-semibold text-gray-900 dark:text-white">{symbol}</p>
            <p className="text-xs text-red-500 dark:text-red-400">Failed to load</p>
          </div>
          <button
            onClick={onRemove}
            className="p-1.5 text-gray-400 hover:text-[#E24B4A] transition-colors"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>
    );
  }

  const trend = getTrendSignal(data.change1M);
  const rsiSignal = getRSISignal(data.rsi14);
  const aboveSMA20 = data.sma20 > 0 && data.price >= data.sma20;

  return (
    <div className="bg-white dark:bg-[#1E293B] rounded-xl border border-gray-200 dark:border-[#1F2937] p-4 hover:border-gray-300 dark:hover:border-gray-700 transition-colors">
      <div className="flex items-center justify-between gap-3">
        <Link href={`/app?symbol=${encodeURIComponent(data.symbol)}`} className="flex-1 min-w-0 group">
          <div className="flex items-center gap-2 mb-0.5 flex-wrap">
            <span className="font-bold text-gray-900 dark:text-white group-hover:text-[#0EA5E9] transition-colors">
              {data.symbol}
            </span>
            <span className="text-xs text-gray-400 dark:text-gray-500 truncate max-w-[180px]">
              {data.name}
            </span>
            <span className="text-[10px] bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 px-1.5 py-0.5 rounded">
              {data.exchange}
            </span>
          </div>
          <div className="flex items-center gap-3 flex-wrap">
            <span className="font-semibold text-gray-900 dark:text-white">
              {formatCurrency(data.price, data.currency)}
            </span>
            <span
              className={`text-sm font-semibold ${
                data.changePercent >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-[#E24B4A]'
              }`}
            >
              {formatPercent(data.changePercent)} today
            </span>
            <span
              className={`text-xs ${
                data.change1M >= 0 ? 'text-emerald-500 dark:text-emerald-400' : 'text-[#E24B4A]'
              }`}
            >
              {formatPercent(data.change1M)} 1M
            </span>
            {trend === 'bullish' && <TrendingUp className="w-3.5 h-3.5 text-emerald-500" />}
            {trend === 'bearish' && <TrendingDown className="w-3.5 h-3.5 text-[#E24B4A]" />}
            {trend === 'neutral' && <Minus className="w-3.5 h-3.5 text-gray-400" />}
            {data.sma20 > 0 && (
              <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${
                aboveSMA20
                  ? 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400'
                  : 'bg-red-50 dark:bg-red-900/20 text-red-500 dark:text-red-400'
              }`}>
                {aboveSMA20 ? '▲ Above SMA20' : '▼ Below SMA20'}
              </span>
            )}
          </div>
        </Link>

        <div className="flex items-center gap-1.5 shrink-0">
          <div className="text-right hidden sm:block">
            <p className="text-[10px] text-gray-400 dark:text-gray-500">RSI</p>
            <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">{data.rsi14}</p>
            <p className={`text-[9px] font-medium mt-0.5 ${
              rsiSignal === 'overbought' ? 'text-[#E24B4A]' :
              rsiSignal === 'oversold'   ? 'text-blue-500 dark:text-blue-400' :
                                          'text-gray-400 dark:text-gray-500'
            }`}>
              {rsiSignal === 'overbought' ? 'Overbought' : rsiSignal === 'oversold' ? 'Oversold' : 'Neutral'}
            </p>
          </div>
          <Link
            href={`/app?symbol=${encodeURIComponent(data.symbol)}`}
            className="p-1.5 text-gray-400 hover:text-[#0EA5E9] transition-colors"
            title="View analysis"
          >
            <ExternalLink className="w-4 h-4" />
          </Link>
          <button
            onClick={onRemove}
            className="p-1.5 text-gray-400 hover:text-[#E24B4A] transition-colors"
            title="Remove from watchlist"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
