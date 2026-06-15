'use client';
import { useState } from 'react';
import { Loader2, Sparkles, ArrowUp, Trophy } from 'lucide-react';
import { StockData } from '@/lib/types';
import {
  formatCurrency,
  formatLargeNumber,
  formatPercent,
  getRSISignal,
} from '@/lib/utils';
import TickerAutocomplete from '@/components/TickerAutocomplete';
import { useLanguage } from '@/lib/useLanguage';
import CompareChart from '@/components/CompareChart';


function isIDXStock(stock: StockData): boolean {
  return stock.currency === 'IDR' ||
    stock.exchange === 'JKT' ||
    stock.exchange?.toLowerCase().includes('indonesia');
}

function fmtFundamental(
  value: number | null,
  stock: StockData,
  formatter: (n: number) => string,
): string {
  if (value != null) return formatter(value);
  return isIDXStock(stock) ? 'Tdk tersedia (IDX)' : 'N/A';
}

function numWinner(a: number | null, b: number | null, higherIsBetter = true): 1 | 2 | 0 {
  if (a == null || b == null) return 0;
  const diff = Math.abs(a - b);
  if (diff < 0.01) return 0;
  return higherIsBetter ? (a > b ? 1 : 2) : (a < b ? 1 : 2);
}

const BULLISH_WORDS = [
  'bullish', 'positive', 'upside', 'outperform', 'strong momentum', 'uptrend',
  'opportunity', 'growth', 'recommend', 'worth considering', 'buy', 'better opportunity',
  'positif', 'naik', 'kuat', 'peluang', 'tumbuh', 'direkomendasikan', 'layak',
  'tren naik', 'momentum naik', 'meningkat',
];
const BEARISH_WORDS = [
  'bearish', 'negative', 'downside', 'underperform', 'weak', 'downtrend',
  'caution', 'deteriorating', 'avoid', 'concerning',
  'negatif', 'turun', 'lemah', 'risiko', 'waspada', 'hati-hati',
  'melemah', 'tren turun', 'tekanan jual', 'koreksi',
];

function parseSentiment(text: string): 'bullish' | 'bearish' | 'neutral' {
  const lower = text.toLowerCase();
  const bull = BULLISH_WORDS.filter(w => lower.includes(w)).length;
  const bear = BEARISH_WORDS.filter(w => lower.includes(w)).length;
  if (bull > bear) return 'bullish';
  if (bear > bull) return 'bearish';
  return 'neutral';
}

const SENTIMENT_CFG = {
  bullish: { bg: 'bg-[#1D9E75]/10', text: 'text-[#1D9E75]', border: 'border-[#1D9E75]/30' },
  bearish: { bg: 'bg-[#EF4444]/10', text: 'text-[#EF4444]', border: 'border-[#EF4444]/30' },
  neutral: { bg: 'bg-yellow-500/10', text: 'text-yellow-500', border: 'border-yellow-500/30' },
};

const VERDICT_T = {
  en: {
    title: 'AI Verdict',
    get: 'Get Verdict',
    refresh: 'Refresh',
    analyzing: 'Analyzing…',
    empty: 'Click Get Verdict for AI analysis comparing both stocks',
    badge: { bullish: 'Worth Considering', bearish: 'Caution', neutral: 'Neutral' },
    langBtn: '🇺🇸 EN',
  },
  id: {
    title: 'Verdict AI',
    get: 'Dapatkan Verdict',
    refresh: 'Refresh',
    analyzing: 'Menganalisis…',
    empty: 'Klik Dapatkan Verdict untuk analisis AI perbandingan kedua saham',
    badge: { bullish: 'Layak Dipertimbangkan', bearish: 'Hati-hati', neutral: 'Netral' },
    langBtn: '🇮🇩 ID',
  },
};

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

  const load = async (overrideSym?: string) => {
    const s = (overrideSym ?? sym).trim().toUpperCase();
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
        <TickerAutocomplete
          value={sym}
          onChange={setSym}
          onSelect={ticker => { setSym(ticker); load(ticker); }}
          onEnterPress={() => load()}
          placeholder="AAPL or BBRI"
          showIcon={false}
          inputClassName="w-full px-3 py-2 text-sm bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1D9E75]/30 focus:border-[#1D9E75] dark:text-white"
        />
        <button
          onClick={() => load()}
          disabled={loading || !sym.trim()}
          className="px-3 py-2 bg-[#1D9E75] hover:bg-[#178a65] disabled:opacity-50 text-white text-sm rounded-lg transition-colors shrink-0"
        >
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Go'}
        </button>
      </div>
      {err && <p className="text-xs text-[#EF4444] mt-1">{err}</p>}
    </div>
  );
}

function StockHeader({ stock, colorClass }: { stock: StockData; colorClass: string }) {
  const rsiSignal = getRSISignal(stock.rsi14);
  const metrics = [
    {
      label: 'RSI (14)',
      value: `${stock.rsi14} — ${rsiSignal === 'overbought' ? 'Overbought' : rsiSignal === 'oversold' ? 'Oversold' : 'Neutral'}`,
      valueClass: rsiSignal === 'overbought' ? 'text-[#EF4444]' : rsiSignal === 'oversold' ? 'text-[#1D9E75]' : 'text-gray-700 dark:text-gray-300',
    },
    {
      label: '1M Change',
      value: formatPercent(stock.change1M),
      valueClass: stock.change1M >= 0 ? 'text-[#1D9E75]' : 'text-[#EF4444]',
    },
    {
      label: '3M Change',
      value: formatPercent(stock.change3M),
      valueClass: stock.change3M >= 0 ? 'text-[#1D9E75]' : 'text-[#EF4444]',
    },
    {
      label: 'vs SMA 20',
      value: stock.price >= stock.sma20 ? '▲ Above' : '▼ Below',
      valueClass: stock.price >= stock.sma20 ? 'text-[#1D9E75]' : 'text-[#EF4444]',
    },
    {
      label: 'vs SMA 50',
      value: stock.price >= stock.sma50 ? '▲ Above' : '▼ Below',
      valueClass: stock.price >= stock.sma50 ? 'text-[#1D9E75]' : 'text-[#EF4444]',
    },
  ];

  return (
    <div className="text-left">
      {/* Ticker + Name */}
      <div className="mb-2">
        <p className={`text-2xl font-bold leading-tight ${colorClass}`}>{stock.symbol}</p>
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 line-clamp-1">{stock.name}</p>
      </div>
      {/* Price + Change badge */}
      <div className="flex items-center gap-2 flex-wrap mb-3">
        <p className="text-xl font-bold text-gray-900 dark:text-white">
          {formatCurrency(stock.price, stock.currency)}
        </p>
        <span className={`text-sm font-semibold px-2 py-0.5 rounded-full ${
          stock.changePercent >= 0 ? 'bg-[#1D9E75]/10 text-[#1D9E75]' : 'bg-[#EF4444]/10 text-[#EF4444]'
        }`}>
          {formatPercent(stock.changePercent)}
        </span>
      </div>
      {/* Metrics list */}
      <div className="space-y-1.5">
        {metrics.map(m => (
          <div key={m.label} className="flex items-center justify-between gap-2">
            <span className="text-[11px] text-gray-400 dark:text-gray-500 shrink-0">{m.label}</span>
            <span className={`text-xs font-semibold ${m.valueClass}`}>{m.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

interface Row {
  label: string;
  v1: string;
  v2: string;
  winner: 1 | 2 | 0;
  rawNum1?: number | null;
  rawNum2?: number | null;
}

function buildRows(s1: StockData, s2: StockData): Row[] {
  return [
    {
      label: '1-Month Change',
      v1: formatPercent(s1.change1M),
      v2: formatPercent(s2.change1M),
      winner: numWinner(s1.change1M, s2.change1M),
      rawNum1: s1.change1M,
      rawNum2: s2.change1M,
    },
    {
      label: '3-Month Change',
      v1: formatPercent(s1.change3M),
      v2: formatPercent(s2.change3M),
      winner: numWinner(s1.change3M, s2.change3M),
      rawNum1: s1.change3M,
      rawNum2: s2.change3M,
    },
    {
      label: 'Today Change',
      v1: formatPercent(s1.changePercent),
      v2: formatPercent(s2.changePercent),
      winner: numWinner(s1.changePercent, s2.changePercent),
      rawNum1: s1.changePercent,
      rawNum2: s2.changePercent,
    },
    {
      label: 'RSI (14)',
      v1: String(s1.rsi14),
      v2: String(s2.rsi14),
      winner: (() => {
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
      label: 'Sector',
      v1: s1.sector ?? 'N/A',
      v2: s2.sector ?? 'N/A',
      winner: 0,
    },
    {
      label: 'Industry',
      v1: s1.industry ?? 'N/A',
      v2: s2.industry ?? 'N/A',
      winner: 0,
    },
    {
      label: 'P/E Ratio',
      v1: fmtFundamental(s1.peRatio, s1, n => n.toFixed(2)),
      v2: fmtFundamental(s2.peRatio, s2, n => n.toFixed(2)),
      winner: numWinner(s1.peRatio, s2.peRatio, false),
    },
    {
      label: 'EPS (TTM)',
      v1: fmtFundamental(s1.eps, s1, n => `${s1.currency === 'IDR' ? 'Rp' : '$'}${n.toFixed(2)}`),
      v2: fmtFundamental(s2.eps, s2, n => `${s2.currency === 'IDR' ? 'Rp' : '$'}${n.toFixed(2)}`),
      winner: numWinner(s1.eps, s2.eps),
    },
    {
      label: 'Beta',
      v1: fmtFundamental(s1.beta, s1, n => n.toFixed(2)),
      v2: fmtFundamental(s2.beta, s2, n => n.toFixed(2)),
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

function rowValueClass(row: Row, side: 1 | 2): string {
  const raw = side === 1 ? row.rawNum1 : row.rawNum2;
  if (raw != null) {
    return raw >= 0 ? 'text-[#1D9E75]' : 'text-[#EF4444]';
  }
  const isWinner = row.winner === side;
  return isWinner
    ? (side === 1 ? 'text-blue-700 dark:text-blue-300' : 'text-purple-700 dark:text-purple-300')
    : 'text-gray-700 dark:text-gray-300';
}

export default function ComparePage() {
  const [stock1, setStock1] = useState<StockData | null>(null);
  const [stock2, setStock2] = useState<StockData | null>(null);
  const [verdict, setVerdict] = useState<string | null>(null);
  const [verdictLoading, setVerdictLoading] = useState(false);
  const [lang, setLang] = useLanguage();

  const vt = VERDICT_T[lang];

  const fetchVerdict = async () => {
    if (!stock1 || !stock2) return;
    setVerdictLoading(true);
    setVerdict(null);
    try {
      const res = await fetch('/api/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'compare', stock1Data: stock1, stock2Data: stock2, language: lang }),
      });
      const data = await res.json();
      setVerdict(data.verdict ?? '');
    } catch {
      setVerdict('Failed to get verdict. Please try again.');
    } finally {
      setVerdictLoading(false);
    }
  };

  const rows = stock1 && stock2 ? buildRows(stock1, stock2) : [];
  const s1Wins = rows.filter(r => r.winner === 1).length;
  const s2Wins = rows.filter(r => r.winner === 2).length;

  const verdictSentiment = verdict ? parseSentiment(verdict) : null;
  const verdictBadgeCfg   = verdictSentiment ? SENTIMENT_CFG[verdictSentiment] : null;
  const verdictBadgeLabel = verdictSentiment ? vt.badge[verdictSentiment] : null;

  return (
    <div className="min-h-screen bg-[#F8FAFC] dark:bg-[#0A0F1E]">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6">
        <h1 className="text-xl font-bold text-gray-900 dark:text-white mb-1">Compare Stocks</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
          Load two stocks to compare metrics side by side.
        </p>

        {/* Search inputs */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
          <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-[#2D3748] p-4">
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
          <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-[#2D3748] p-4">
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
            {/* Chart overlay */}
            <CompareChart symbol1={stock1.symbol} symbol2={stock2.symbol} />

            {/* Score banner */}
            <div className="flex items-center justify-center gap-6 mb-4">
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

            <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-[#2D3748] overflow-hidden mb-4">
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
                    <span className={`text-sm font-medium ${rowValueClass(row, 1)}`}>
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
                    <span className={`text-right text-sm font-medium ${rowValueClass(row, 2)}`}>
                      {row.v2}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* AI Verdict */}
            <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-[#2D3748] overflow-hidden">
              <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 dark:border-gray-800">
                <div className="flex items-center gap-2 flex-wrap">
                  <Sparkles className="w-4 h-4 text-[#1D9E75]" />
                  <span className="font-semibold text-sm text-gray-900 dark:text-white">
                    {vt.title}
                  </span>
                  {verdictBadgeCfg && verdictBadgeLabel && !verdictLoading && (
                    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${verdictBadgeCfg.bg} ${verdictBadgeCfg.text} ${verdictBadgeCfg.border}`}>
                      {verdictBadgeLabel}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setLang(lang === 'id' ? 'en' : 'id')}
                    title={lang === 'id' ? 'Switch to English' : 'Ganti ke Indonesia'}
                    className="text-[11px] font-semibold px-2 py-1 rounded-lg border border-gray-200 dark:border-[#2D3748] text-gray-500 dark:text-gray-400 hover:border-[#1D9E75] hover:text-[#1D9E75] transition-colors"
                  >
                    {vt.langBtn}
                  </button>
                  <button
                    onClick={fetchVerdict}
                    disabled={verdictLoading}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-[#1D9E75] hover:bg-[#178a65] disabled:opacity-60 text-white text-xs font-semibold rounded-lg transition-colors"
                  >
                    {verdictLoading ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        {vt.analyzing}
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-3.5 h-3.5" />
                        {verdict ? vt.refresh : vt.get}
                      </>
                    )}
                  </button>
                </div>
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
                  {vt.empty}
                </div>
              ) : null}
            </div>
          </>
        )}

        {(!stock1 || !stock2) && (
          <div className="text-center py-12 text-sm text-gray-400 dark:text-gray-500">
            Load both stocks above to see the comparison
          </div>
        )}
      </div>
    </div>
  );
}
