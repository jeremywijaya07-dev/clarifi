'use client';
import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import {
  Bookmark, BookmarkCheck, TrendingUp, TrendingDown, Minus, BarChart2, Share2,
} from 'lucide-react';
import Navbar from '@/components/Navbar';
import TradingViewChart from '@/components/TradingViewChart';
import AIAnalysis from '@/components/AIAnalysis';
import { StockData } from '@/lib/types';
import {
  formatCurrency, formatPercent, formatVolume, formatLargeNumber,
  getTrendSignal, getRSISignal,
} from '@/lib/utils';

function ChangeChip({ value, label }: { value: number; label: string }) {
  const pos = value >= 0;
  return (
    <div className={`flex flex-col items-center px-3 py-2 rounded-lg min-w-[70px] ${pos ? 'bg-[#10B981]/15' : 'bg-red-500/10'}`}>
      <span className="text-[10px] text-[#9CA3AF] font-medium">{label}</span>
      <span className={`text-sm font-bold ${pos ? 'text-[#10B981]' : 'text-red-500'}`}>
        {formatPercent(value)}
      </span>
    </div>
  );
}

function MetricBox({ label, value, sub, subColor }: { label: string; value: string | number; sub?: string; subColor?: string }) {
  return (
    <div className="bg-gray-50 dark:bg-gray-800/60 rounded-lg p-3">
      <p className="metric-label mb-0.5">{label}</p>
      <p className="metric-value truncate">{value}</p>
      {sub && <p className={`text-[11px] mt-0.5 ${subColor ?? 'text-[#6B7280]'}`}>{sub}</p>}
    </div>
  );
}

export default function AnalysisSharePage() {
  const params = useParams();
  const ticker = (params.ticker as string).toUpperCase();

  const [stock, setStock] = useState<StockData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [watchlist, setWatchlist] = useState<string[]>([]);
  const [shareCopied, setShareCopied] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem('watchlist');
      if (raw) setWatchlist(JSON.parse(raw));
    } catch { /* ignore */ }
    fetchStock(ticker);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchStock = async (sym: string) => {
    setLoading(true);
    setError(null);
    setStock(null);
    try {
      const res = await fetch(`/api/stock?symbol=${encodeURIComponent(sym)}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Failed to load stock');
      setStock(data as StockData);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  const toggleWatch = () => {
    if (!stock) return;
    const sym = stock.symbol;
    const next = watchlist.includes(sym) ? watchlist.filter(s => s !== sym) : [...watchlist, sym];
    setWatchlist(next);
    localStorage.setItem('watchlist', JSON.stringify(next));
  };

  const handleShare = async () => {
    const url = `https://clarifi-gray.vercel.app/analysis/${ticker}`;
    try {
      await navigator.clipboard.writeText(url);
    } catch {
      const el = document.createElement('textarea');
      el.value = url;
      document.body.appendChild(el);
      el.select();
      document.execCommand('copy');
      document.body.removeChild(el);
    }
    setShareCopied(true);
    setTimeout(() => setShareCopied(false), 2500);
  };

  const isWatching = stock ? watchlist.includes(stock.symbol) : false;
  const trend = stock ? getTrendSignal(stock.change1M) : null;
  const rsiSignal = stock ? getRSISignal(stock.rsi14) : null;
  const isIDX = stock
    ? stock.currency === 'IDR' || stock.exchange === 'JKT' || stock.exchange?.toLowerCase().includes('indonesia')
    : false;
  const hasFundamentals = stock && (
    stock.marketCap != null || stock.peRatio != null || stock.eps != null ||
    stock.beta != null || stock.dividendYield != null || stock.sector != null
  );

  return (
    <div className="flex flex-col min-h-screen bg-[#F0F4F8] dark:bg-[#0F172A]">
      <Navbar />
      <main className="flex-1">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">

          {error && !loading && (
            <div className="rounded-xl border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/10 px-4 py-3 text-sm text-red-600 dark:text-red-400 mb-4">
              {error}
            </div>
          )}

          {loading && (
            <div className="flex items-center justify-center py-24">
              <div className="flex flex-col items-center gap-3">
                <BarChart2 className="w-10 h-10 text-[#0EA5E9] animate-pulse" />
                <p className="text-sm text-[#9CA3AF]">
                  Loading analysis for <span className="font-semibold text-[#0EA5E9]">{ticker}</span>…
                </p>
              </div>
            </div>
          )}

          {stock && !loading && (
            <div className="animate-fade-in lg:grid lg:grid-cols-[62%_38%] lg:gap-4 space-y-4 lg:space-y-0">

              {/* Left 62% */}
              <div className="space-y-4">

                {/* Header card */}
                <div className="card p-4">
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div>
                      <div className="flex items-center gap-2.5 mb-1 flex-wrap">
                        <h1 className="text-[32px] font-bold text-gray-900 dark:text-[#F9FAFB] leading-tight">
                          {formatCurrency(stock.price, stock.currency)}
                        </h1>
                        <span className={`text-sm font-semibold px-2 py-0.5 rounded-full ${
                          stock.changePercent >= 0 ? 'bg-[#10B981]/15 text-[#10B981]' : 'bg-red-500/10 text-red-500'
                        }`}>
                          {formatPercent(stock.changePercent)}
                        </span>
                        {trend === 'bullish' && <TrendingUp className="w-4 h-4 text-[#10B981]" />}
                        {trend === 'bearish' && <TrendingDown className="w-4 h-4 text-red-500" />}
                        {trend === 'neutral' && <Minus className="w-4 h-4 text-[#6B7280]" />}
                      </div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-gray-800 dark:text-[#F9FAFB]">{stock.symbol}</span>
                        <span className="text-sm text-[#9CA3AF] truncate max-w-[220px]">{stock.name}</span>
                        <span className={`text-[11px] px-1.5 py-0.5 rounded font-semibold ${
                          stock.currency === 'IDR' || stock.exchange?.toLowerCase().includes('indonesia') || stock.exchange?.toUpperCase() === 'IDX'
                            ? 'bg-[#0EA5E9]/15 text-[#0EA5E9]'
                            : stock.exchange?.toUpperCase().includes('NASDAQ')
                            ? 'bg-blue-500/15 text-blue-500'
                            : stock.exchange?.toUpperCase().includes('NYSE')
                            ? 'bg-blue-600/15 text-blue-600'
                            : 'bg-gray-100 dark:bg-gray-800 text-[#9CA3AF]'
                        }`}>
                          {stock.exchange}
                        </span>
                        {trend && (
                          <span className={`text-[11px] px-2 py-0.5 rounded-full font-semibold ${
                            trend === 'bullish' ? 'bg-[#10B981]/15 text-[#10B981]'
                            : trend === 'bearish' ? 'bg-red-500/10 text-red-500'
                            : 'bg-gray-100 dark:bg-gray-800 text-[#9CA3AF]'
                          }`}>
                            {trend.charAt(0).toUpperCase() + trend.slice(1)}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        onClick={handleShare}
                        title="Share analysis"
                        className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg border transition-colors bg-white dark:bg-[#1E293B] border-gray-200 dark:border-[#1F2937] text-gray-600 dark:text-[#9CA3AF] hover:border-[#0EA5E9] hover:text-[#0EA5E9]"
                      >
                        <Share2 className="w-3.5 h-3.5" />
                        Share
                      </button>
                      <button
                        onClick={toggleWatch}
                        className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg border transition-colors ${
                          isWatching
                            ? 'bg-[#0EA5E9]/10 border-[#0EA5E9] text-[#0EA5E9]'
                            : 'bg-white dark:bg-[#1E293B] border-gray-200 dark:border-[#1F2937] text-gray-600 dark:text-[#9CA3AF] hover:border-[#0EA5E9] hover:text-[#0EA5E9]'
                        }`}
                      >
                        {isWatching ? <BookmarkCheck className="w-3.5 h-3.5" /> : <Bookmark className="w-3.5 h-3.5" />}
                        {isWatching ? 'Watching' : 'Watch'}
                      </button>
                    </div>
                  </div>
                  <div className="h-px bg-gray-100 dark:bg-[#1F2937] mb-3" />
                  <div className="flex flex-wrap gap-2">
                    <ChangeChip value={stock.changePercent} label="Today" />
                    <ChangeChip value={stock.change1M} label="1 Month" />
                    <ChangeChip value={stock.change3M} label="3 Months" />
                  </div>
                </div>

                {/* Chart */}
                <div className="card overflow-hidden">
                  <div className="px-4 pt-4 pb-1">
                    <h2 className="card-title">Price Chart</h2>
                    <p className="text-[10px] text-[#6B7280] mt-0.5">
                      {(() => {
                        const sym = stock.symbol.replace(/:IDX$/i, '');
                        const tvSym = isIDX ? `IDX:${sym}`
                          : stock.exchange?.toUpperCase().includes('NASDAQ') ? `NASDAQ:${sym}`
                          : stock.exchange?.toUpperCase().includes('NYSE') ? `NYSE:${sym}`
                          : sym;
                        return `TradingView · ${tvSym} · candlestick + volume + drawing tools`;
                      })()}
                    </p>
                  </div>
                  <TradingViewChart
                    symbol={stock.symbol}
                    exchange={stock.exchange}
                    currency={stock.currency}
                    height={520}
                  />
                </div>

                {/* Technical Indicators */}
                <div className="card p-4">
                  <h2 className="card-title mb-3">Technical Indicators</h2>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    <MetricBox
                      label="RSI (14)"
                      value={stock.rsi14}
                      sub={rsiSignal === 'overbought' ? 'Overbought' : rsiSignal === 'oversold' ? 'Oversold' : 'Neutral zone'}
                      subColor={rsiSignal === 'overbought' ? 'text-red-500' : rsiSignal === 'oversold' ? 'text-[#10B981]' : 'text-[#6B7280]'}
                    />
                    <MetricBox
                      label="Rel. Volume"
                      value={`${stock.relativeVolume}x`}
                      sub={`Vol: ${formatVolume(stock.volume)}`}
                    />
                    <MetricBox
                      label="SMA 20"
                      value={formatCurrency(stock.sma20, stock.currency)}
                      sub={stock.price >= stock.sma20 ? '▲ Above' : '▼ Below'}
                      subColor={stock.price >= stock.sma20 ? 'text-[#10B981]' : 'text-red-500'}
                    />
                    <MetricBox
                      label="SMA 50"
                      value={formatCurrency(stock.sma50, stock.currency)}
                      sub={stock.price >= stock.sma50 ? '▲ Above' : '▼ Below'}
                      subColor={stock.price >= stock.sma50 ? 'text-[#10B981]' : 'text-red-500'}
                    />
                  </div>
                </div>

                {/* AI Analysis — auto-triggered */}
                <AIAnalysis stockData={stock} autoRun />
              </div>

              {/* Right 38% */}
              <div className="space-y-4">

                {/* Key Levels */}
                <div className="card p-4">
                  <h2 className="card-title mb-3">Key Levels</h2>
                  <div className="grid grid-cols-2 gap-2">
                    <MetricBox label="20-Day High"  value={formatCurrency(stock.high20d, stock.currency)} />
                    <MetricBox label="20-Day Low"   value={formatCurrency(stock.low20d,  stock.currency)} />
                    <MetricBox label="52-Week High" value={formatCurrency(stock.high52w, stock.currency)} />
                    <MetricBox label="52-Week Low"  value={formatCurrency(stock.low52w,  stock.currency)} />
                  </div>
                </div>

                {/* Fundamentals */}
                {hasFundamentals && (
                  <div className="card p-4">
                    <h2 className="card-title mb-3">Fundamentals</h2>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                      <MetricBox label="Market Cap" value={formatLargeNumber(stock.marketCap, stock.currency)} />
                      <MetricBox label="P/E Ratio"  value={stock.peRatio != null ? stock.peRatio.toFixed(2) : '—'} />
                      <MetricBox
                        label="EPS (TTM)"
                        value={stock.eps != null
                          ? `${stock.currency === 'IDR' ? 'Rp' : '$'}${stock.eps.toFixed(2)}`
                          : '—'}
                      />
                      <MetricBox label="Beta"      value={stock.beta != null ? stock.beta.toFixed(2) : '—'} />
                      <MetricBox
                        label="Div. Yield"
                        value={stock.dividendYield != null ? `${(stock.dividendYield * 100).toFixed(2)}%` : '—'}
                      />
                      <MetricBox label="Sector" value={stock.sector ?? '—'} />
                    </div>
                    {isIDX && (stock.peRatio == null || stock.eps == null || stock.beta == null) && (
                      <p className="text-[10px] text-[#9CA3AF] mt-2">
                        * P/E, EPS &amp; Beta terbatas untuk saham IDX — lihat laporan keuangan emiten.
                      </p>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </main>

      <footer className="border-t border-gray-200 dark:border-[#1F2937] bg-white dark:bg-[#1E293B] py-4 px-4 text-center text-[11px] text-gray-400 dark:text-gray-600">
        © 2025 Clarifi &bull; Data: Yahoo Finance &amp; Twelve Data &bull; News: Google News &bull; AI: Groq GPT-OSS 120B
      </footer>

      {/* Share toast */}
      {shareCopied && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 px-4 py-2.5 bg-[#0EA5E9] text-white text-sm font-semibold rounded-full shadow-lg animate-fade-in">
          Link disalin! 🔗
        </div>
      )}
    </div>
  );
}
