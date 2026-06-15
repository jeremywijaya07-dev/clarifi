'use client';
import { useEffect, useRef, useState } from 'react';

declare global {
  interface Window {
    TradingView?: { widget: new (config: Record<string, unknown>) => unknown };
  }
}

function toTVSymbol(symbol: string, exchange: string, currency: string): string {
  // Strip Clarifi's internal :IDX suffix (e.g. "BBRI:IDX" → "BBRI")
  const sym = symbol.replace(/:IDX$/i, '');

  if (
    currency === 'IDR' ||
    exchange === 'JKT' ||
    exchange?.toUpperCase() === 'IDX' ||
    exchange?.toLowerCase().includes('indonesia')
  ) {
    return `IDX:${sym}`;
  }
  const ex = exchange?.toUpperCase() ?? '';
  if (ex.includes('NASDAQ'))                          return `NASDAQ:${sym}`;
  if (ex.includes('NYSE'))                            return `NYSE:${sym}`;
  if (ex.includes('AMEX') || ex.includes('NYSEAMER')) return `AMEX:${sym}`;
  if (ex.includes('TSX')  || ex.includes('TORONTO'))  return `TSX:${sym}`;
  return exchange ? `${ex}:${sym}` : sym;
}

interface Props {
  symbol: string;
  exchange: string;
  currency?: string;
  /** px number or any CSS length string (e.g. "100%", "calc(100vh - 53px)") */
  height?: number | string;
}

const SKEL_BARS = [38,52,44,60,48,68,54,62,50,72,58,66,55,70,63,74,61,78,67,82];

function ChartSkeleton({ height }: { height: number | string }) {
  const h = typeof height === 'number' ? height : 340;
  const barH = Math.round(h * 0.35);
  return (
    <div className="w-full bg-gray-50 dark:bg-gray-800/30 animate-pulse" style={{ height }}>
      {[20, 40, 60, 80].map(p => (
        <div key={p} className="absolute w-full border-t border-gray-200 dark:border-gray-700/40" style={{ top: `${p}%` }} />
      ))}
      <div className="absolute bottom-0 left-0 right-0 flex items-end gap-0.5 px-3 pb-3" style={{ height: barH }}>
        {SKEL_BARS.map((pct, i) => (
          <div key={i} className="flex-1 bg-gray-200 dark:bg-gray-700 rounded-sm" style={{ height: `${pct}%` }} />
        ))}
      </div>
    </div>
  );
}

export default function TradingViewChart({ symbol, exchange, currency = 'USD', height = 520 }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [chartReady, setChartReady] = useState(false);
  // Track Clarifi's dark/light theme reactively via MutationObserver
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');

  useEffect(() => {
    const read = () =>
      document.documentElement.classList.contains('dark') ? 'dark' : 'light';
    setTheme(read());
    const obs = new MutationObserver(() => setTheme(read()));
    obs.observe(document.documentElement, { attributeFilter: ['class'] });
    return () => obs.disconnect();
  }, []);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    setChartReady(false);

    const tvSymbol   = toTVSymbol(symbol, exchange, currency);
    const containerId = `tv_${symbol.replace(/[^a-zA-Z0-9]/g, '_')}_${Date.now()}`;

    el.innerHTML = '';
    el.id = containerId;

    let readyTimer: ReturnType<typeof setTimeout>;

    const buildWidget = () => {
      if (!window.TradingView || !document.getElementById(containerId)) return;
      new window.TradingView.widget({
        autosize:            true,
        symbol:              tvSymbol,
        interval:            'D',
        timezone:            currency === 'IDR' ? 'Asia/Jakarta' : 'Etc/UTC',
        theme,
        style:               '1',
        locale:              'en',
        enable_publishing:   false,
        allow_symbol_change: false,
        withdateranges:      true,
        save_image:          false,
        hide_side_toolbar:   false,
        container_id:        containerId,
      });
      readyTimer = setTimeout(() => setChartReady(true), 1800);
    };

    const TV_SRC = 'https://s3.tradingview.com/tv.js';

    if (window.TradingView) {
      buildWidget();
    } else {
      let script = document.querySelector<HTMLScriptElement>(`script[src="${TV_SRC}"]`);
      if (script) {
        if (window.TradingView) {
          buildWidget();
        } else {
          script.addEventListener('load', buildWidget, { once: true });
        }
      } else {
        script = document.createElement('script');
        script.src   = TV_SRC;
        script.async = true;
        script.addEventListener('load', buildWidget, { once: true });
        document.head.appendChild(script);
      }
    }

    return () => {
      clearTimeout(readyTimer);
      if (containerRef.current) containerRef.current.innerHTML = '';
    };
  }, [symbol, exchange, currency, theme]);

  return (
    <div className="relative w-full" style={{ height }}>
      {!chartReady && <ChartSkeleton height={height} />}
      <div
        ref={containerRef}
        style={{ height }}
        className={`w-full rounded overflow-hidden ${!chartReady ? 'invisible' : ''}`}
      />
    </div>
  );
}
