'use client';
import { useState, useRef, useEffect, useCallback } from 'react';
import { Search } from 'lucide-react';
import { searchTickers, TickerInfo } from '@/lib/tickers';

interface Props {
  value: string;
  onChange: (val: string) => void;
  onSelect: (ticker: string) => void;
  onEnterPress?: () => void;
  placeholder?: string;
  inputClassName?: string;
  showIcon?: boolean;
}

export default function TickerAutocomplete({
  value,
  onChange,
  onSelect,
  onEnterPress,
  placeholder = 'Search ticker...',
  inputClassName = '',
  showIcon = true,
}: Props) {
  const [results, setResults] = useState<TickerInfo[]>([]);
  const [open, setOpen] = useState(false);
  const [focusedIdx, setFocusedIdx] = useState(-1);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (value.length >= 1) {
      const found = searchTickers(value);
      setResults(found);
      setOpen(found.length > 0);
    } else {
      setResults([]);
      setOpen(false);
    }
    setFocusedIdx(-1);
  }, [value]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleSelect = useCallback((ticker: TickerInfo) => {
    onChange(ticker.symbol);
    onSelect(ticker.symbol);
    setOpen(false);
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
      setFocusedIdx(-1);
    } else if (e.key === 'Enter') {
      if (open && focusedIdx >= 0 && results[focusedIdx]) {
        e.preventDefault();
        handleSelect(results[focusedIdx]);
      } else {
        setOpen(false);
        setFocusedIdx(-1);
        onEnterPress?.();
      }
    }
  }, [open, results, focusedIdx, handleSelect, onEnterPress]);

  return (
    <div ref={containerRef} className="relative flex-1 min-w-0">
      {showIcon && (
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none z-10" />
      )}
      <input
        type="text"
        value={value}
        onChange={e => onChange(e.target.value)}
        onKeyDown={handleKeyDown}
        onFocus={() => { if (results.length > 0) setOpen(true); }}
        placeholder={placeholder}
        className={inputClassName}
        autoComplete="off"
        spellCheck={false}
      />
      {open && results.length > 0 && (
        <div className="absolute top-full left-0 right-0 mt-1 z-50 bg-white dark:bg-[#111827] border border-gray-200 dark:border-[#2D3748] rounded-xl shadow-2xl overflow-hidden">
          {results.map((t, i) => (
            <button
              key={t.symbol}
              type="button"
              onMouseDown={e => { e.preventDefault(); handleSelect(t); }}
              className={`w-full flex items-center justify-between px-3 py-2.5 text-left transition-colors ${
                i === focusedIdx
                  ? 'bg-[#00A86B]/10 dark:bg-[#00A86B]/15'
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
                  ? 'bg-[#00A86B]/15 text-[#00A86B]'
                  : 'bg-blue-500/15 text-blue-500'
              }`}>
                {t.exchange}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
