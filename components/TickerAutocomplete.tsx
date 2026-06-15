'use client';
import { useState, useRef, useEffect, useCallback } from 'react';
import { Search, Loader2, Clock } from 'lucide-react';
import { searchTickers } from '@/lib/tickers';

interface DropdownItem {
  symbol: string;
  name: string;
  exchange: string;
}

const normalize = (sym: string) => sym.replace(/:IDX$/i, '');

function mergeResults(staticR: DropdownItem[], liveR: DropdownItem[], limit = 8): DropdownItem[] {
  const seen = new Set(staticR.map(r => normalize(r.symbol)));
  const out = [...staticR];
  for (const r of liveR) {
    if (!seen.has(normalize(r.symbol)) && out.length < limit) {
      out.push(r);
      seen.add(normalize(r.symbol));
    }
  }
  return out;
}

interface Props {
  value: string;
  onChange: (val: string) => void;
  onSelect: (ticker: string) => void;
  onEnterPress?: () => void;
  placeholder?: string;
  inputClassName?: string;
  showIcon?: boolean;
  showHistory?: boolean;
  inputRef?: React.RefObject<HTMLInputElement>;
}

export default function TickerAutocomplete({
  value,
  onChange,
  onSelect,
  onEnterPress,
  placeholder = 'Search ticker...',
  inputClassName = '',
  showIcon = true,
  showHistory = false,
  inputRef,
}: Props) {
  const [results, setResults] = useState<DropdownItem[]>([]);
  const [open, setOpen] = useState(false);
  const [liveLoading, setLiveLoading] = useState(false);
  const [focusedIdx, setFocusedIdx] = useState(-1);
  const [isHistory, setIsHistory] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const isFocusedRef = useRef(false);

  const loadHistoryItems = useCallback((): DropdownItem[] => {
    try {
      const hist: string[] = JSON.parse(localStorage.getItem('search_history') ?? '[]');
      return hist.map(sym => {
        const matches = searchTickers(sym);
        const t = matches.find(m => m.symbol.toUpperCase() === sym.toUpperCase()) ?? matches[0];
        return { symbol: sym, name: t?.name ?? sym, exchange: (t?.exchange ?? '') as string };
      });
    } catch { return []; }
  }, []);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);

    if (value.length < 2) {
      abortRef.current?.abort();
      setLiveLoading(false);
      setFocusedIdx(-1);

      // When input is focused and empty, show recent searches
      if (showHistory && isFocusedRef.current && value.length === 0) {
        const hist = loadHistoryItems();
        if (hist.length > 0) {
          setResults(hist);
          setIsHistory(true);
          setOpen(true);
          return;
        }
      }

      setResults([]);
      setIsHistory(false);
      setOpen(false);
      return;
    }

    setIsHistory(false);
    const staticR: DropdownItem[] = searchTickers(value).map(t => ({
      symbol: t.symbol,
      name: t.name,
      exchange: t.exchange as string,
    }));
    setResults(staticR);
    setOpen(true);
    setFocusedIdx(-1);
    setLiveLoading(true);

    debounceRef.current = setTimeout(async () => {
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(value)}`, {
          signal: controller.signal,
        });
        if (!res.ok) throw new Error('Search failed');
        const liveR: DropdownItem[] = await res.json();
        setResults(mergeResults(staticR, liveR));
        setOpen(true);
      } catch (e) {
        if ((e as Error).name === 'AbortError') return;
        // keep static results on network failure
      } finally {
        if (!controller.signal.aborted) setLiveLoading(false);
      }
    }, 300);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      abortRef.current?.abort();
    };
  }, [value, showHistory, loadHistoryItems]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleSelect = useCallback((item: DropdownItem) => {
    onChange(item.symbol);
    onSelect(item.symbol);
    setOpen(false);
    setIsHistory(false);
    setFocusedIdx(-1);
  }, [onChange, onSelect]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown') {
      if (!open) return;
      e.preventDefault();
      setFocusedIdx(i => Math.min(i + 1, results.length - 1));
    } else if (e.key === 'ArrowUp') {
      if (!open) return;
      e.preventDefault();
      setFocusedIdx(i => Math.max(i - 1, 0));
    } else if (e.key === 'Escape') {
      setOpen(false);
      setIsHistory(false);
      setFocusedIdx(-1);
    } else if (e.key === 'Enter') {
      if (open && focusedIdx >= 0 && results[focusedIdx]) {
        e.preventDefault();
        handleSelect(results[focusedIdx]);
      } else {
        setOpen(false);
        setIsHistory(false);
        setFocusedIdx(-1);
        onEnterPress?.();
      }
    }
  }, [open, results, focusedIdx, handleSelect, onEnterPress]);

  const handleFocus = () => {
    isFocusedRef.current = true;
    if (value.length === 0 && showHistory) {
      const hist = loadHistoryItems();
      if (hist.length > 0) {
        setResults(hist);
        setIsHistory(true);
        setOpen(true);
        return;
      }
    }
    if (results.length > 0 || liveLoading) setOpen(true);
  };

  const showDropdown = open && (results.length > 0 || liveLoading);

  return (
    <div ref={containerRef} className="relative flex-1 min-w-0">
      {showIcon && (
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none z-10" />
      )}
      <input
        ref={inputRef}
        type="text"
        value={value}
        onChange={e => onChange(e.target.value)}
        onKeyDown={handleKeyDown}
        onFocus={handleFocus}
        onBlur={() => { isFocusedRef.current = false; }}
        placeholder={placeholder}
        className={inputClassName}
        autoComplete="off"
        spellCheck={false}
      />
      {showDropdown && (
        <div className="absolute top-full left-0 right-0 mt-1 z-50 bg-white dark:bg-[#1E293B] border border-gray-200 dark:border-[#2D3748] rounded-xl shadow-2xl overflow-hidden">
          {isHistory && (
            <div className="flex items-center gap-1.5 px-3 py-1.5 border-b border-gray-100 dark:border-[#1F2937]">
              <Clock className="w-3 h-3 text-gray-400" />
              <span className="text-[10px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider">Recent</span>
            </div>
          )}
          {results.map((t, i) => (
            <button
              key={t.symbol}
              type="button"
              onMouseDown={e => { e.preventDefault(); handleSelect(t); }}
              className={`w-full flex items-center justify-between px-3 py-2.5 text-left transition-colors ${
                i === focusedIdx
                  ? 'bg-[#0EA5E9]/10 dark:bg-[#0EA5E9]/15'
                  : 'hover:bg-gray-50 dark:hover:bg-[#1F2937]'
              }`}
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <span className="text-sm font-bold text-gray-900 dark:text-white shrink-0">
                  {t.symbol}
                </span>
                <span className="text-xs text-gray-500 dark:text-gray-400 truncate">
                  {t.name}
                </span>
              </div>
              <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded shrink-0 ml-2 ${
                t.exchange === 'IDX'
                  ? 'bg-[#0EA5E9]/15 text-[#0EA5E9]'
                  : t.exchange === 'US'
                  ? 'bg-blue-500/15 text-blue-500'
                  : 'bg-gray-500/15 text-gray-500'
              }`}>
                {t.exchange || '—'}
              </span>
            </button>
          ))}
          {liveLoading && !isHistory && (
            <div className={`flex items-center justify-center gap-1.5 py-2 ${
              results.length > 0 ? 'border-t border-gray-100 dark:border-[#1F2937]' : ''
            }`}>
              <Loader2 className="w-3 h-3 animate-spin text-gray-400" />
              <span className="text-[11px] text-gray-400">Searching live…</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
