'use client';
import { useState } from 'react';
import { Search, Loader2, Sparkles, ArrowUp, Trophy, Info } from 'lucide-react';
import { StockData } from '@/lib/types';
import {
  formatCurrency,
  formatLargeNumber,
  formatPercent,
  getTrendSignal,
} from '@/lib/utils';


function numWinner(a: number | null, b: number | null, higherIsBetter = true): 1 | 2 | 0 {
  if (a == null || b == null) return 0;
  const diff = Math.abs(a - b);
  if (diff < 0.01) return 0;
  return higherIsBetter ? (a > b ? 1 : 2) : (a < b ? 1 : 2);
}

function StockSearchInput({
  label,
  color,
  onLoad,
}: {
  label: string;
  color: string;
  onLoad: (s: StockData) => void;
}) {
  const [sym, setSym] = useState('');
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const load = async () => {
    const s = sym.trim().toUpperCase();
    if (!s) return;
    setLoading(true);
    setErr(null);
    try {
      const res = await fetch(`/api/stock?symbol=${encodeURIComponent(s)}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Not found');
      onLoad(data as StockData);
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : 'Error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <p className={`text-xs font-semibold mb-1.5 ${color}`}>{label}</p>
      <div className="flex gap-2">
        <input
          type="text"
          value={sym}
          onChange={e => setSym(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && load()}
          placeholder="AAPL or BBRI:IDX"
          className="flex-1 px-3 py-2 text-sm bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1D9E75]/30 focus:border-[#1D9E75] dark:text-white"
        />
        <button
          onClick={load}
          disabled={loading || !sym.trim()}
          className="px-3 py-2 bg-[#1D9E75] hover:bg-[#178a65] disabled:opacity-50 text-white text-sm rounded-lg transition-colors"
        >
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
        </button>
      </div>
      {err && <p className="text-xs text-[#E24B4A] mt-1">{err}</p>}
    </div>
  );
}

function StockHeader({ stock, colorClass }: { stock: StockData; colorClass: string }) {
  const trend = getTrendSignal(stock.change1M);
  return (
    <div className="text-center">
      <p className={`text-lg font-bold ${colorClass}`}>{stock.symbol}</p>
      <p className="text-xs text-gray-500 dark:text-gray-400 truncate max-w-[140px] mx-auto">
        {stock.name}
      </p>
      <p className="text-xl font-bold text-gray-900 dark:text-white mt-1">
        {formatCurrency(stock.price, stock.currency)}
      </p>
      <p
        className={`text-sm font-semibold ${
          stock.changePercent >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-[#E24B4A]'
        }`}
      >
        {formatPercent(stock.changePercent)}
      </p>
      <span
        className={`inline-block mt-1 text-[10px] px-2 py-0.5 rounded-full font-semibold ${
          trend === 'bullish'
            ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400'
            : trend === 'bearish'
            ? 'bg-red-100 dark:bg-red-900/30 text-[#E24B4A]'
            : 'bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400'
        }`}
      >
        {trend}
      </span>
    </div>
  );
}

interface Row {
  label: string;
  v1: string;
  v2: string;
  winner: 1 | 2 | 0;
}

function buildRows(s1: StockData, s2: StockData): Row[] {
  return [
    {
      label: '1-Month Change',
      v1: formatPercent(s1.change1M),
      v2: formatPercent(s2.change1M),
      winner: numWinner(s1.change1M, s2.change1M),
    },
    {
      label: '3-Month Change',
      v1: formatPercent(s1.change3M),
      v2: formatPercent(s2.change3M),
      winner: numWinner(s1.change3M, s2.change3M),
    },
    {
      label: 'RSI (14)',
      v1: s1.rsi14.toFixed(1),
      v2: s2.rsi14.toFixed(1),
      winner: (() => {
        // Closer to 50 = more neutral/healthy
        const d1 = Math.abs(s1.rsi14 - 50);
        const d2 = Math.abs(s2.rsi14 - 50);
        return numWinner(d1, d2, false);
      })(),
    },
    {
      label: 'Rel. Volume',
      v1: `${s1.relativeVolume}x`,
      v2: `${s2.relativeVolume}x`,
      winner: numWinner(s1.relativeVolume, s2.relativeVolume),
    },
    {
      label: 'Market Cap',
      v1: formatLargeNumber(s1.marketCap, s1.currency),
      v2: formatLargeNumber(s2.marketCap, s2.currency),
      winner: numWinner(s1.marketCap, s2.marketCap),
    },
    {
      label: 'P/E Ratio',
      v1: s1.peRatio?.toFixed(2) ?? 'N/A',
      v2: s2.peRatio?.toFixed(2) ?? 'N/A',
      // Lower P/E = more value (winner = lower, so higherIsBetter=false)
      winner: numWinner(s1.peRatio, s2.peRatio, false),
    },
    {
      label: 'EPS (TTM)',
      v1: s1.eps != null ? `${s1.currency === 'IDR' ? 'Rp' : '$'}${s1.eps.toFixed(2)}` : 'N/A',
      v2: s2.eps != null ? `${s2.currency === 'IDR' ? 'Rp' : '$'}${s2.eps.toFixed(2)}` : 'N/A',
      winner: numWinner(s1.eps, s2.eps),
    },
    {
      label: 'Beta',
      v1: s1.beta?.toFixed(2) ?? 'N/A',
      v2: s2.beta?.toFixed(2) ?? 'N/A',
      winner: 0,
    },
    {
      label: '52-Week High',
      v1: formatCurrency(s1.high52w, s1.currency),
      v2: formatCurrency(s2.high52w, s2.currency),
      winner: 0,
    },
    {
      label: '52-Week Low',
      v1: formatCurrency(s1.low52w, s1.currency),
      v2: formatCurrency(s2.low52w, s2.currency),
      winner: 0,
    },
    {
      label: 'vs SMA 20',
      v1: s1.price >= s1.sma20 ? '▲ Above' : '▼ Below',
      v2: s2.price >= s2.sma20 ? '▲ Above' : '▼ Below',
      winner: (() => {
        const a = s1.price >= s1.sma20 ? 1 : 0;
        const b = s2.price >= s2.sma20 ? 1 : 0;
        return a > b ? 1 : b > a ? 2 : 0;
      })(),
    },
    {
      label: 'vs SMA 50',
      v1: s1.price >= s1.sma50 ? '▲ Above' : '▼ Below',
      v2: s2.price >= s2.sma50 ? '▲ Above' : '▼ Below',
      winner: (() => {
        const a = s1.price >= s1.sma50 ? 1 : 0;
        const b = s2.price >= s2.sma50 ? 1 : 0;
        return a > b ? 1 : b > a ? 2 : 0;
      })(),
    },
  ];
}

export default function ComparePage() {
  const [stock1, setStock1] = useState<StockData | null>(null);
  const [stock2, setStock2] = useState<StockData | null>(null);
  const [verdict, setVerdict] = useState<string | null>(null);
  const [verdictLoading, setVerdictLoading] = useState(false);

  const fetchVerdict = async () => {
    if (!stock1 || !stock2) return;
    setVerdictLoading(true);
    setVerdict(null);
    try {
      const res = await fetch('/api/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'compare', stock1Data: stock1, stock2Data: stock2 }),
      });
      const data = await res.json();
      setVerdict(data.verdict ?? '');
    } catch {
      setVerdict('Failed to get verdict. Please try again.');
    } finally {
      setVerdictLoading(false);
    }
  };

  const allRows = stock1 && stock2 ? buildRows(stock1, stock2) : [];
  // Hide rows where both values are unavailable (e.g., IDX stocks without P/E, EPS, Beta)
  const rows = allRows.filter(r => !(r.v1 === 'N/A' && r.v2 === 'N/A'));
  const s1Wins = rows.filter(r => r.winner === 1).length;
  const s2Wins = rows.filter(r => r.winner === 2).length;

  return (
    <div className="min-h-screen bg-[#F8FAFC] dark:bg-[#0A0F1E]">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6">
        <h1 className="text-xl font-bold text-gray-900 dark:text-white mb-1">Compare Stocks</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
          Load two stocks to compare metrics side by side.
        </p>

        {/* Search inputs */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
          <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-4">
            <StockSearchInput
              label="Stock 1"
              color="text-blue-600 dark:text-blue-400"
              onLoad={setStock1}
            />
            {stock1 && (
              <div className="mt-3 pt-3 border-t border-gray-100 dark:border-gray-800">
                <StockHeader stock={stock1} colorClass="text-blue-600 dark:text-blue-400" />
              </div>
            )}
          </div>
          <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-4">
            <StockSearchInput
              label="Stock 2"
              color="text-purple-600 dark:text-purple-400"
              onLoad={setStock2}
            />
            {stock2 && (
              <div className="mt-3 pt-3 border-t border-gray-100 dark:border-gray-800">
                <StockHeader stock={stock2} colorClass="text-purple-600 dark:text-purple-400" />
              </div>
            )}
          </div>
        </div>

        {/* Comparison table */}
        {stock1 && stock2 && (
          <>
            {/* Score banner */}
            <div className="flex flex-col items-center gap-2 mb-4">
              <div className="flex items-center justify-center gap-6">
                <div className="flex items-center gap-2">
                  <span className="text-3xl font-bold text-blue-600 dark:text-blue-400">{s1Wins}</span>
                  <span className="text-sm text-gray-500 dark:text-gray-400">{stock1.symbol}</span>
                </div>
                <Trophy className="w-5 h-5 text-amber-400" />
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-500 dark:text-gray-400">{stock2.symbol}</span>
                  <span className="text-3xl font-bold text-purple-600 dark:text-purple-400">{s2Wins}</span>
                </div>
              </div>
              {/* Score explanation tooltip */}
              <div className="relative group flex items-center gap-1 cursor-default">
                <Info className="w-3.5 h-3.5 text-gray-400" />
                <span className="text-[11px] text-gray-400 dark:text-gray-500">
                  Cara skor dihitung
                </span>
                <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-20 w-64 p-3 text-[11px] leading-relaxed bg-[#1E293B] text-gray-200 rounded-xl shadow-2xl opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none border border-gray-700">
                  <p className="font-semibold text-white mb-1.5">Cara Perhitungan Skor</p>
                  <ul className="space-y-0.5 text-gray-300">
                    <li>• 1M & 3M Change: nilai lebih tinggi = poin</li>
                    <li>• RSI: lebih dekat ke 50 = lebih sehat</li>
                    <li>• Rel. Volume: lebih tinggi = poin</li>
                    <li>• Market Cap: lebih besar = poin</li>
                    <li>• P/E Ratio: lebih rendah = nilai lebih baik</li>
                    <li>• EPS: lebih tinggi = poin</li>
                    <li>• vs SMA20/50: di atas = poin</li>
                  </ul>
                  <p className="mt-2 text-gray-400 text-[10px]">Skor membandingkan metrik, bukan rekomendasi beli/jual.</p>
                </div>
              </div>
              <p className="text-[10px] text-[#6B7280] text-center">
                Skor membandingkan metrik teknikal — bukan rekomendasi investasi
              </p>
            </div>

            <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 overflow-hidden mb-4">
              {/* Table header */}
              <div className="grid grid-cols-[1fr_auto_1fr_auto_1fr] items-center px-4 py-2 bg-gray-50 dark:bg-gray-800/50 border-b border-gray-100 dark:border-gray-800 text-xs font-semibold">
                <span className="text-blue-600 dark:text-blue-400">{stock1.symbol}</span>
                <span className="text-center w-8" />
                <span className="text-center text-gray-400 dark:text-gray-500">Metric</span>
                <span className="text-center w-8" />
                <span className="text-right text-purple-600 dark:text-purple-400">{stock2.symbol}</span>
              </div>

              <div className="divide-y divide-gray-100 dark:divide-gray-800">
                {rows.map(row => (
                  <div
                    key={row.label}
                    className="grid grid-cols-[1fr_auto_1fr_auto_1fr] items-center px-4 py-2.5 hover:bg-gray-50 dark:hover:bg-gray-800/30 transition-colors"
                  >
                    <span
                      className={`text-sm font-medium ${
                        row.winner === 1
                          ? 'text-blue-700 dark:text-blue-300'
                          : 'text-gray-700 dark:text-gray-300'
                      }`}
                    >
                      {row.v1}
                    </span>
                    <div className="flex justify-center w-8">
                      {row.winner === 1 ? (
                        <ArrowUp className="w-3.5 h-3.5 text-blue-500" />
                      ) : (
                        <span />
                      )}
                    </div>
                    <span className="text-center text-[11px] text-gray-400 dark:text-gray-500 font-medium">
                      {row.label}
                    </span>
                    <div className="flex justify-center w-8">
                      {row.winner === 2 ? (
                        <ArrowUp className="w-3.5 h-3.5 text-purple-500" />
                      ) : (
                        <span />
                      )}
                    </div>
                    <span
                      className={`text-right text-sm font-medium ${
                        row.winner === 2
                          ? 'text-purple-700 dark:text-purple-300'
                          : 'text-gray-700 dark:text-gray-300'
                      }`}
                    >
                      {row.v2}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* AI Verdict */}
            <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 overflow-hidden">
              <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 dark:border-gray-800">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-[#1D9E75]" />
                  <span className="font-semibold text-sm text-gray-900 dark:text-white">
                    AI Verdict
                  </span>
                </div>
                <button
                  onClick={fetchVerdict}
                  disabled={verdictLoading}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-[#1D9E75] hover:bg-[#178a65] disabled:opacity-60 text-white text-xs font-semibold rounded-lg transition-colors"
                >
                  {verdictLoading ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      Analyzing…
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-3.5 h-3.5" />
                      {verdict ? 'Refresh' : 'Get Verdict'}
                    </>
                  )}
                </button>
              </div>

              {verdict ? (
                <div className="px-4 py-4">
                  {verdict.split(/\n\n+/).map((para, i) => (
                    <p
                      key={i}
                      className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed mb-3 last:mb-0"
                    >
                      {para.trim()}
                    </p>
                  ))}
                </div>
              ) : !verdictLoading ? (
                <div className="px-4 py-8 text-center text-sm text-gray-400 dark:text-gray-500">
                  Click <strong>Get Verdict</strong> for AI analysis comparing both stocks
                </div>
              ) : null}
            </div>
          </>
        )}

        {/* Prompt if not both loaded */}
        {(!stock1 || !stock2) && (
          <div className="text-center py-12 text-sm text-gray-400 dark:text-gray-500">
            Load both stocks above to see the comparison
          </div>
        )}
      </div>
    </div>
  );
}
