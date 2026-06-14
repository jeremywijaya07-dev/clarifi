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
  height?: number;
}

export default function TradingViewChart({ symbol, exchange, currency = 'USD', height = 520 }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
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

    const tvSymbol   = toTVSymbol(symbol, exchange, currency);
    const containerId = `tv_${symbol.replace(/[^a-zA-Z0-9]/g, '_')}_${Date.now()}`;

    el.innerHTML = '';
    el.id = containerId;

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
      if (containerRef.current) containerRef.current.innerHTML = '';
    };
  }, [symbol, exchange, currency, theme]);

  return (
    <div ref={containerRef} style={{ height }} className="w-full rounded overflow-hidden" />
  );
}
