'use client';
import { useState, useEffect, useRef, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import {
  Bookmark, BookmarkCheck, TrendingUp, TrendingDown, Minus, BarChart2, Info, Zap,
  Maximize2, X, Bell, Share2, Activity, DollarSign,
} from 'lucide-react';
import TradingViewChart from '@/components/TradingViewChart';
import AIAnalysis from '@/components/AIAnalysis';
import StockChat from '@/components/StockChat';
import NewsSection from '@/components/NewsSection';
import TickerAutocomplete from '@/components/TickerAutocomplete';
import MarketSummary from '@/components/MarketSummary';
import { StockData } from '@/lib/types';
import {
  formatCurrency, formatLargeNumber, formatPercent, formatVolume,
  getTrendSignal, getRSISignal,
} from '@/lib/utils';

// ── Quick-pick tabs ──────────────────────────────────────────────────────────

const TABS = [
  { id: 'us',           label: 'US Trending',     picks: ['AAPL', 'NVDA', 'MSFT', 'TSLA', 'GOOGL', 'AMZN', 'META', 'AMD', 'PLTR', 'ARM'] },
  { id: 'idx-top',      label: 'IDX Top',          picks: ['BBCA', 'BBRI', 'BMRI', 'BBNI', 'BREN', 'DCII', 'TPIA', 'AMMN'] },
  { id: 'idx-bank',     label: 'IDX Banking',      picks: ['BBCA', 'BBRI', 'BMRI', 'BBNI', 'BRIS', 'NISP', 'BNGA', 'MAYA'] },
  { id: 'idx-energy',   label: 'IDX Energy',       picks: ['BREN', 'ADRO', 'PTBA', 'ITMG', 'ANTM', 'AMMN', 'MDKA', 'INCO', 'HRUM'] },
  { id: 'idx-tech',     label: 'IDX Tech',         picks: ['GOTO', 'BUKA', 'EMTK', 'DCII', 'TLKM', 'EXCL', 'ISAT'] },
  { id: 'idx-consumer', label: 'IDX Consumer',     picks: ['UNVR', 'ICBP', 'INDF', 'MYOR', 'KLBF', 'MIKA', 'HEAL', 'SIDO'] },
  { id: 'idx-kong',     label: 'IDX Konglomerat',  picks: ['ASII', 'TPIA', 'BRPT', 'INKP', 'TKIM', 'MNCN', 'LPKR', 'MAPI', 'PTRO'] },
  { id: 'idx-property', label: 'IDX Property',     picks: ['BSDE', 'SMRA', 'CTRA', 'PWON', 'JSMR'] },
];

// ── Fair Value ───────────────────────────────────────────────────────────────

type FVSignal = 'undervalued' | 'overvalued' | 'fair' | 'na';

interface FVMethod {
  label: string;
  description: string;
  value: number | null;
  signal: FVSignal;
  upside: number | null;
  message?: string;
}

function getSectorPE(sector: string | null): number {
  const s = (sector ?? '').toLowerCase();
  if (s.includes('bank') || s.includes('financ') || s.includes('insurance')) return 12;
  if (s.includes('tech') || s.includes('software') || s.includes('semiconductor') || s.includes('internet')) return 25;
  if (s.includes('consumer') || s.includes('retail') || s.includes('staple') || s.includes('beverage') || s.includes('food')) return 18;
  if (s.includes('energy') || s.includes('mining') || s.includes('oil') || s.includes('coal') || s.includes('metal')) return 10;
  if (s.includes('telecom') || s.includes('communication') || s.includes('wireless')) return 14;
  if (s.includes('health') || s.includes('pharma') || s.includes('medical') || s.includes('biotech')) return 20;
  if (s.includes('real estate') || s.includes('property') || s.includes('reit')) return 15;
  if (s.includes('industrial') || s.includes('manufactur')) return 14;
  return 15;
}

function computeFV(stock: StockData): FVMethod[] | null {
  if (stock.eps === null) return null;
  const { eps, bookValue, sector, price } = stock;

  function build(label: string, description: string, raw: number | null, naMsg?: string): FVMethod {
    if (eps !== null && eps <= 0) {
      return { label, description, value: null, signal: 'na', upside: null, message: 'N/A — negative earnings' };
    }
    if (raw === null) {
      return { label, description, value: null, signal: 'na', upside: null, message: naMsg ?? 'Insufficient data' };
    }
    const upside = ((raw - price) / price) * 100;
    const signal: FVSignal = upside > 10 ? 'undervalued' : upside < -10 ? 'overvalued' : 'fair';
    return { label, description, value: raw, signal, upside };
  }

  const pe = getSectorPE(sector);
  const grahamVal =
    eps !== null && eps > 0 && bookValue != null && bookValue > 0
      ? Math.sqrt(22.5 * eps * bookValue)
      : null;
  const peVal  = eps !== null && eps > 0 ? eps * pe : null;
  const pegVal = eps !== null && eps > 0 ? eps * 10 : null;

  return [
    build('Graham Number',  "Graham's intrinsic value formula", grahamVal, 'Book value per share unavailable'),
    build(`P/E Fair Value`, `Sector avg P/E: ${pe}x`,           peVal),
    build('PEG Value',      'Growth-adjusted (10% rate)',        pegVal),
  ];
}

const FV_CFG: Record<FVSignal, { label: string; bg: string; text: string }> = {
  undervalued: { label: 'Undervalued', bg: 'bg-[#10B981]/15', text: 'text-[#10B981]' },
  overvalued:  { label: 'Overvalued',  bg: 'bg-red-500/10',   text: 'text-red-500'   },
  fair:        { label: 'Fair',        bg: 'bg-yellow-500/10', text: 'text-yellow-500'},
  na:          { label: 'N/A',         bg: 'bg-gray-500/10',   text: 'text-[#6B7280]' },
};

function FairValueCard({ stock }: { stock: StockData }) {
  const methods = computeFV(stock);
  if (!methods) return null;

  const validSignals = methods.filter(m => m.signal !== 'na').map(m => m.signal);
  const under = validSignals.filter(s => s === 'undervalued').length;
  const over  = validSignals.filter(s => s === 'overvalued').length;
  const consensus: { label: string; signal: FVSignal } =
    under >= 2 ? { label: 'Potentially Undervalued', signal: 'undervalued' } :
    over  >= 2 ? { label: 'Potentially Overvalued',  signal: 'overvalued'  } :
                 { label: 'Fairly Valued',            signal: 'fair'        };
  const cc = FV_CFG[consensus.signal];

  return (
    <div className="card overflow-hidden animate-fade-in">
      <div className="card-header">
        <div className="flex items-center gap-2">
          <span className="card-title">Fair Value Estimate</span>
          <div className="relative group">
            <Info className="w-3.5 h-3.5 text-[#6B7280] cursor-help" />
            <div className="absolute left-0 top-5 z-20 w-52 p-2 text-[11px] leading-relaxed bg-[#1E293B] dark:bg-gray-800 text-white rounded-lg shadow-2xl opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
              Estimates based on fundamental data. Not financial advice.
            </div>
          </div>
        </div>
      </div>

      <div className="p-4 space-y-2.5">
        {methods.map(m => {
          const cfg = FV_CFG[m.signal];
          return (
            <div key={m.label} className="flex items-start justify-between gap-3 px-3 py-2.5 rounded-lg bg-gray-50 dark:bg-gray-800/40">
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-gray-700 dark:text-[#F9FAFB]">{m.label}</p>
                <p className="text-[10px] text-gray-400 dark:text-[#6B7280] mt-0.5">{m.description}</p>
              </div>
              <div className="text-right shrink-0">
                {m.value != null ? (
                  <>
                    <p className="text-sm font-bold text-gray-900 dark:text-white">
                      {formatCurrency(m.value, stock.currency)}
                    </p>
                    <p className={`text-[10px] font-semibold ${m.upside! >= 0 ? 'text-[#10B981]' : 'text-red-500'}`}>
                      {m.upside! >= 0 ? '+' : ''}{m.upside!.toFixed(1)}%
                    </p>
                  </>
                ) : (
                  <p className="text-[10px] text-[#6B7280] max-w-[120px] text-right">{m.message}</p>
                )}
                <span className={`inline-block text-[10px] font-semibold px-1.5 py-0.5 rounded-full mt-1 ${cfg.bg} ${cfg.text}`}>
                  {cfg.label}
                </span>
              </div>
            </div>
          );
        })}

        <div className={`flex items-center justify-between px-3 py-2 rounded-lg ${cc.bg}`}>
          <span className="text-xs text-gray-500 dark:text-[#9CA3AF]">Consensus</span>
          <span className={`text-xs font-bold ${cc.text}`}>{consensus.label}</span>
        </div>

        <p className="text-[10px] text-[#6B7280] text-center pt-1">
          For educational purposes only. Not financial advice.
        </p>
      </div>
    </div>
  );
}

// ── B2: Computed signal strip ────────────────────────────────────────────────

function computeTechnicalSignal(stock: StockData): 'bullish' | 'bearish' | 'neutral' {
  let score = 0;
  if (stock.change1M > 5) score += 2;
  else if (stock.change1M < -5) score -= 2;
  else if (stock.change1M > 0) score += 1;
  else score -= 1;
  if (stock.price >= stock.sma20) score += 1; else score -= 1;
  if (stock.price >= stock.sma50) score += 1; else score -= 1;
  if (stock.rsi14 < 30) score += 1;
  else if (stock.rsi14 > 70) score -= 1;
  return score >= 2 ? 'bullish' : score <= -2 ? 'bearish' : 'neutral';
}

const TECH_CFG = {
  bullish: { bg: 'bg-[#10B981]/10', border: 'border-[#10B981]/30', text: 'text-[#10B981]', Icon: TrendingUp,  label: 'BULLISH' },
  bearish: { bg: 'bg-red-500/8',    border: 'border-red-500/25',    text: 'text-red-500',   Icon: TrendingDown, label: 'BEARISH' },
  neutral: { bg: 'bg-gray-100 dark:bg-gray-800/50', border: 'border-gray-200 dark:border-gray-700', text: 'text-gray-500 dark:text-gray-400', Icon: Minus, label: 'NEUTRAL' },
};

const RSI_CFG = {
  overbought: { bg: 'bg-red-500/8',    border: 'border-red-500/25',    text: 'text-red-500',   label: 'Overbought' },
  oversold:   { bg: 'bg-[#10B981]/10', border: 'border-[#10B981]/30', text: 'text-[#10B981]', label: 'Oversold'   },
  neutral:    { bg: 'bg-gray-100 dark:bg-gray-800/50', border: 'border-gray-200 dark:border-gray-700', text: 'text-gray-500 dark:text-gray-400', label: 'Neutral' },
};

function SignalStrip({ stock }: { stock: StockData }) {
  const techSignal  = computeTechnicalSignal(stock);
  const techCfg     = TECH_CFG[techSignal];
  const { Icon: TechIcon } = techCfg;

  const rsiKey   = stock.rsi14 > 70 ? 'overbought' : stock.rsi14 < 30 ? 'oversold' : 'neutral';
  const rsiCfg   = RSI_CFG[rsiKey];

  const fvMethods = computeFV(stock);
  let fvSignal: FVSignal | null = null;
  let fvLabel = '';
  if (fvMethods) {
    const valid = fvMethods.filter(m => m.signal !== 'na').map(m => m.signal);
    const under = valid.filter(s => s === 'undervalued').length;
    const over  = valid.filter(s => s === 'overvalued').length;
    if (under >= 2)     { fvSignal = 'undervalued'; fvLabel = 'Undervalued'; }
    else if (over >= 2) { fvSignal = 'overvalued';  fvLabel = 'Overvalued';  }
    else if (valid.length > 0) { fvSignal = 'fair'; fvLabel = 'Fair Value';  }
  }
  const fvCfg = fvSignal ? FV_CFG[fvSignal] : null;

  const aboveSMA = [stock.price >= stock.sma20, stock.price >= stock.sma50].filter(Boolean).length;
  const smaSub = aboveSMA === 2 ? 'Di atas SMA20/50' : aboveSMA === 1 ? 'SMA campuran' : 'Di bawah SMA20/50';

  return (
    <div className="mt-3 pt-3 border-t border-gray-100 dark:border-[#1F2937]">
      {/* Header with methodology tooltip */}
      <div className="flex items-center gap-1.5 mb-2">
        <span className="text-[10px] font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">
          Sinyal Teknikal
        </span>
        <div className="relative group">
          <Info className="w-3 h-3 text-[#6B7280] cursor-help" />
          <div className="absolute left-0 top-4 z-30 w-64 p-2.5 text-[11px] leading-relaxed bg-[#1E293B] text-gray-200 rounded-lg shadow-2xl opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
            <p className="font-semibold text-white mb-1.5">Cara menghitung sinyal:</p>
            <p className="mb-1.5">
              <span className="font-medium text-[#10B981]">Arah Teknikal</span>
              {' '}— Skor dari perubahan 1 bulan (±2 poin jika {'>'} 5%), posisi vs SMA20 &amp; SMA50 (±1 masing-masing), kondisi RSI (±1). Skor ≥ 2 = BULLISH, ≤ −2 = BEARISH.
            </p>
            <p className="mb-1.5">
              <span className="font-medium text-[#38BDF8]">RSI(14)</span>
              {' '}— Di atas 70 = overbought (tekanan jual potensial). Di bawah 30 = oversold (potensi rebound).
            </p>
            <p>
              <span className="font-medium text-[#FCD34D]">Valuasi</span>
              {' '}— Konsensus dari Graham Number, P/E Fair Value, dan PEG Value. Minimal 2 dari 3 metode harus sepakat.
            </p>
          </div>
        </div>
      </div>

      {/* Signal badges */}
      <div className="flex flex-wrap gap-2">
        {/* Technical direction */}
        <div className={`flex items-center gap-2 px-3 py-2.5 rounded-xl border flex-1 min-w-[130px] ${techCfg.bg} ${techCfg.border}`}>
          <TechIcon className={`w-4 h-4 shrink-0 ${techCfg.text}`} />
          <div>
            <p className={`text-sm font-bold tracking-wide ${techCfg.text}`}>{techCfg.label}</p>
            <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-0.5">{smaSub} · 1M {stock.change1M >= 0 ? '+' : ''}{stock.change1M.toFixed(1)}%</p>
          </div>
        </div>

        {/* RSI */}
        <div className={`flex items-center gap-2 px-3 py-2.5 rounded-xl border flex-1 min-w-[110px] ${rsiCfg.bg} ${rsiCfg.border}`}>
          <Activity className={`w-4 h-4 shrink-0 ${rsiCfg.text}`} />
          <div>
            <p className={`text-sm font-bold ${rsiCfg.text}`}>RSI {stock.rsi14.toFixed(1)}</p>
            <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-0.5">{rsiCfg.label}</p>
          </div>
        </div>

        {/* Valuation (only if we have EPS data) */}
        {fvSignal && fvCfg && (
          <div className={`flex items-center gap-2 px-3 py-2.5 rounded-xl border flex-1 min-w-[120px] ${fvCfg.bg} border-current/20`}>
            <DollarSign className={`w-4 h-4 shrink-0 ${fvCfg.text}`} />
            <div>
              <p className={`text-sm font-bold ${fvCfg.text}`}>{fvLabel}</p>
              <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-0.5">Fair Value est.</p>
            </div>
          </div>
        )}
      </div>

      {/* Disclaimer */}
      <p className="text-[10px] text-[#6B7280] mt-2">
        Sinyal dihitung dari data teknikal, bukan rekomendasi investasi.
      </p>
    </div>
  );
}

// ── Shared UI pieces ─────────────────────────────────────────────────────────

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

function isIDXStock(stock: StockData): boolean {
  return stock.currency === 'IDR' ||
    stock.exchange === 'JKT' ||
    stock.exchange?.toLowerCase().includes('indonesia');
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

function LoadingSkeleton() {
  return (
    <div className="animate-fade-in">
      <div className="lg:grid lg:grid-cols-[62%_38%] lg:gap-4 space-y-4 lg:space-y-0">
        <div className="space-y-4">
          <div className="card p-4">
            <div className="skeleton h-8 rounded w-48 mb-2" />
            <div className="skeleton h-4 rounded w-72 mb-4" />
            <div className="flex gap-2">
              {[1, 2, 3].map(i => <div key={i} className="skeleton h-12 rounded-lg w-20" />)}
            </div>
          </div>
          <div className="card p-4">
            <div className="skeleton h-4 rounded w-36 mb-3" />
            <div className="skeleton h-60 rounded w-full" />
          </div>
          <div className="card p-4">
            <div className="skeleton h-4 rounded w-36 mb-3" />
            <div className="grid grid-cols-2 gap-2">
              {[1, 2, 3, 4].map(i => <div key={i} className="skeleton h-16 rounded-lg" />)}
            </div>
          </div>
        </div>
        <div className="space-y-4">
          <div className="card p-4">
            <div className="skeleton h-4 rounded w-28 mb-3" />
            <div className="grid grid-cols-2 gap-2">
              {[1, 2, 3, 4].map(i => <div key={i} className="skeleton h-16 rounded-lg" />)}
            </div>
          </div>
          <div className="card p-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="py-3 border-b border-gray-100 dark:border-[#1F2937] last:border-0">
                <div className="skeleton h-3.5 rounded w-full mb-2" />
                <div className="skeleton h-3 rounded w-4/5" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}


// ── Main component ───────────────────────────────────────────────────────────

function StockAnalysis() {
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [stock, setStock] = useState<StockData | null>(null);
  const [watchlist, setWatchlist] = useState<string[]>([]);
  const [activeTab, setActiveTab] = useState('us');
  const [chartFullscreen, setChartFullscreen] = useState(false);
  const [alertModal, setAlertModal] = useState(false);
  const [alertCondition, setAlertCondition] = useState<'above' | 'below'>('above');
  const [alertTarget, setAlertTarget] = useState('');
  const [alertSaved, setAlertSaved] = useState(false);
  const [shareCopied, setShareCopied] = useState(false);

  const searchInputRef = useRef<HTMLInputElement>(null);
  const searchParams = useSearchParams();

  useEffect(() => {
    try {
      const raw = localStorage.getItem('watchlist');
      if (raw) setWatchlist(JSON.parse(raw));
    } catch { /* ignore */ }
    const sym = searchParams.get('symbol');
    if (sym) fetchStock(sym);
    // Autofocus from "/" shortcut cross-page navigation
    if (searchParams.get('autofocus') === '1') {
      searchInputRef.current?.focus();
      const url = new URL(window.location.href);
      url.searchParams.delete('autofocus');
      window.history.replaceState({}, '', url.toString());
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // "/" shortcut — dispatched by Navbar when already on /app
  useEffect(() => {
    const handler = () => searchInputRef.current?.focus();
    window.addEventListener('clarifi:focus-search', handler);
    return () => window.removeEventListener('clarifi:focus-search', handler);
  }, []);

  // Close fullscreen on ESC
  useEffect(() => {
    if (!chartFullscreen) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setChartFullscreen(false); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [chartFullscreen]);

  const fetchStock = async (sym: string) => {
    const s = sym.trim().toUpperCase();
    if (!s) return;
    setLoading(true);
    setError(null);
    setStock(null);
    try {
      const res = await fetch(`/api/stock?symbol=${encodeURIComponent(s)}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Failed to load stock');
      setStock(data as StockData);
      setQuery(s);
      // Save to search history (max 5, deduplicated)
      try {
        const hist: string[] = JSON.parse(localStorage.getItem('search_history') ?? '[]');
        localStorage.setItem('search_history', JSON.stringify([s, ...hist.filter(h => h !== s)].slice(0, 5)));
      } catch { /* ignore */ }
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchStock(query);
  };

  const toggleWatch = () => {
    if (!stock) return;
    const sym = stock.symbol;
    const next = watchlist.includes(sym) ? watchlist.filter(s => s !== sym) : [...watchlist, sym];
    setWatchlist(next);
    localStorage.setItem('watchlist', JSON.stringify(next));
  };

  const handleSetAlert = () => {
    if (!stock) return;
    if (typeof Notification !== 'undefined' && Notification.permission === 'default') {
      Notification.requestPermission();
    }
    setAlertTarget(String(stock.price));
    setAlertCondition('above');
    setAlertSaved(false);
    setAlertModal(true);
  };

  const handleShare = async () => {
    if (!stock) return;
    const url = `https://clarifi-gray.vercel.app/analysis/${stock.symbol}`;
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

  const saveAlert = () => {
    if (!stock) return;
    const target = parseFloat(alertTarget);
    if (!target || target <= 0) return;
    const newAlert = {
      id: Date.now().toString(),
      symbol: stock.symbol,
      name: stock.name,
      currency: stock.currency,
      condition: alertCondition,
      targetPrice: target,
      basePrice: stock.price,
      triggered: false,
      createdAt: new Date().toISOString(),
    };
    const raw = localStorage.getItem('price_alerts');
    const existing = raw ? JSON.parse(raw) : [];
    localStorage.setItem('price_alerts', JSON.stringify([...existing, newAlert]));
    setAlertSaved(true);
    setTimeout(() => setAlertModal(false), 1200);
  };

  const isWatching = stock ? watchlist.includes(stock.symbol) : false;
  const trend = stock ? getTrendSignal(stock.change1M) : null;
  const rsiSignal = stock ? getRSISignal(stock.rsi14) : null;
  const activePicks = TABS.find(t => t.id === activeTab)?.picks ?? [];
  const hasFundamentals = stock && (
    stock.marketCap != null || stock.peRatio != null || stock.eps != null ||
    stock.beta != null || stock.dividendYield != null || stock.sector != null
  );

  return (
    <div className="min-h-screen bg-[#F0F4F8] dark:bg-[#0F172A]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">

        {/* AI Market Summary */}
        <MarketSummary />

        {/* Search — own card */}
        <div className="mb-4">
          <div className="bg-white dark:bg-[#1E293B] border border-gray-200 dark:border-[#2D3748] rounded-xl px-4 py-3 shadow-sm">
            <form onSubmit={handleSubmit} className="flex gap-2">
              <TickerAutocomplete
                value={query}
                onChange={setQuery}
                onSelect={sym => { setQuery(sym); fetchStock(sym); }}
                placeholder="Search ticker... (e.g. AAPL, BBRI, PTRO, NVDA)"
                showIcon
                showHistory
                inputRef={searchInputRef}
                inputClassName="w-full pl-9 pr-3 py-2.5 text-sm bg-transparent border border-gray-200 dark:border-[#1F2937] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0EA5E9]/30 focus:border-[#0EA5E9] dark:text-[#F9FAFB] placeholder:text-[#6B7280]"
              />
              <button type="submit" disabled={loading} className="btn-primary shrink-0">
                {loading ? '…' : 'Search'}
              </button>
            </form>
            <p className="mt-1.5 text-[11px] text-[#6B7280] text-center">
              US stocks &amp; IDX auto-detected · Data ~15 menit tertunda · Bukan nasihat investasi
            </p>
          </div>
        </div>


        {/* Quick Picks — separate card */}
        <div className="mb-5 bg-white dark:bg-[#1E293B] border border-gray-200 dark:border-[#2D3748] rounded-xl px-4 py-3 shadow-sm">
          <div className="flex items-center gap-1.5 mb-2.5">
            <Zap className="w-3 h-3 text-[#0EA5E9]" />
            <span className="text-[10px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider">
              Quick Picks
            </span>
          </div>
          <div className="flex gap-1 overflow-x-auto pb-1 scrollbar-hide">
            {TABS.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`shrink-0 px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                  activeTab === tab.id
                    ? 'bg-[#0EA5E9] text-white'
                    : 'bg-gray-50 dark:bg-[#0F172A] border border-gray-200 dark:border-[#1F2937] text-gray-500 dark:text-[#9CA3AF] hover:bg-[#0EA5E9]/10 dark:hover:bg-[#0EA5E9]/20 hover:border-[#0EA5E9] hover:text-[#0EA5E9]'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {activePicks.map(s => (
              <button
                key={s}
                onClick={() => fetchStock(s)}
                className="px-2.5 py-1 text-xs font-medium bg-gray-50 dark:bg-[#0F172A] border border-gray-200 dark:border-[#1F2937] text-gray-600 dark:text-[#9CA3AF] rounded-md hover:bg-[#0EA5E9]/10 dark:hover:bg-[#0EA5E9]/20 hover:border-[#0EA5E9] hover:text-[#0EA5E9] transition-colors"
              >
                {s.replace(':IDX', '')}
              </button>
            ))}
          </div>
        </div>

        {/* Error */}
        {error && !loading && (
          <div className="rounded-xl border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/10 px-4 py-3 text-sm text-red-600 dark:text-red-400 mb-4">
            {error}
          </div>
        )}

        {loading && <LoadingSkeleton />}

        {!stock && !loading && !error && (
          <div className="flex flex-col items-center justify-center py-24 gap-3 text-center">
            <BarChart2 className="w-10 h-10 text-gray-200 dark:text-gray-800" />
            <p className="text-[#9CA3AF] text-sm">Search for any stock symbol to get started</p>
            <p className="text-[#6B7280] text-xs">IDX stocks auto-detected — type BBRI, PTRO, BREN without any suffix</p>
          </div>
        )}

        {/* Two-column layout */}
        {stock && !loading && (
          <div className="animate-fade-in lg:grid lg:grid-cols-[62%_38%] lg:gap-4 space-y-4 lg:space-y-0">

            {/* ── Left 62% ── */}
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
                      onClick={handleSetAlert}
                      title="Set price alert"
                      className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg border transition-colors bg-white dark:bg-[#1E293B] border-gray-200 dark:border-[#1F2937] text-gray-600 dark:text-[#9CA3AF] hover:border-[#0EA5E9] hover:text-[#0EA5E9]"
                    >
                      <Bell className="w-3.5 h-3.5" />
                      Alert
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

                {/* B2: Computed signal strip — shows technical direction + RSI + valuation */}
                <SignalStrip stock={stock} />
              </div>

              {/* Chart — TradingView Advanced Chart Widget */}
              <div className="card overflow-hidden">
                <div className="px-4 pt-4 pb-1 flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <h2 className="card-title">Price Chart</h2>
                    <p className="text-[10px] text-[#6B7280] mt-0.5 truncate">
                      {(() => {
                        const sym = stock.symbol.replace(/:IDX$/i, '');
                        const tvSym = stock.currency === 'IDR' || stock.exchange === 'JKT' || stock.exchange?.toUpperCase() === 'IDX'
                          ? `IDX:${sym}`
                          : stock.exchange?.toUpperCase().includes('NASDAQ')
                          ? `NASDAQ:${sym}`
                          : stock.exchange?.toUpperCase().includes('NYSE')
                          ? `NYSE:${sym}`
                          : sym;
                        return `TradingView · ${tvSym} · candlestick + volume + drawing tools`;
                      })()}
                    </p>
                  </div>
                  <button
                    onClick={() => setChartFullscreen(true)}
                    title="Fullscreen (ESC to exit)"
                    className="shrink-0 p-1.5 text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
                  >
                    <Maximize2 className="w-4 h-4" />
                  </button>
                </div>
                <TradingViewChart
                  symbol={stock.symbol}
                  exchange={stock.exchange}
                  currency={stock.currency}
                  height={420}
                />
              </div>

              {/* Fullscreen chart overlay — chart fills full viewport, close button floats above */}
              {chartFullscreen && (
                <div className="fixed inset-0 z-50">
                  {/* Chart covers entire viewport — no header so TradingView toolbar is unobstructed */}
                  <TradingViewChart
                    symbol={stock.symbol}
                    exchange={stock.exchange}
                    currency={stock.currency}
                    height="100%"
                  />
                  {/* Floating close affordance — sits above the iframe via z-index */}
                  <div className="absolute top-2 right-2 z-10 flex items-center gap-1.5 pointer-events-none">
                    <span className="hidden sm:inline text-[10px] text-gray-400/80 bg-black/50 backdrop-blur-sm px-2 py-1 rounded-full select-none">
                      ESC to exit
                    </span>
                    <button
                      onClick={() => setChartFullscreen(false)}
                      title="Exit fullscreen (ESC)"
                      className="pointer-events-auto p-1.5 bg-black/60 backdrop-blur-sm text-gray-300 hover:text-white hover:bg-black/80 rounded-lg border border-white/10 transition-colors"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}
              {/* AI Analysis */}
              <AIAnalysis stockData={stock} />

              {/* AI Chat */}
              <StockChat stockData={stock} />
            </div>

            {/* ── Right 38% ── */}
            <div className="space-y-4">

              {/* Technical Indicators — moved here (B3) to give left column more space for chart + AI */}
              <div className="card p-4">
                <h2 className="card-title mb-3">Technical Indicators</h2>
                <div className="grid grid-cols-2 gap-2">
                  <MetricBox
                    label="RSI (14)"
                    value={stock.rsi14.toFixed(1)}
                    sub={rsiSignal === 'overbought' ? 'Overbought' : rsiSignal === 'oversold' ? 'Oversold' : 'Neutral zone'}
                    subColor={rsiSignal === 'overbought' ? 'text-red-500' : rsiSignal === 'oversold' ? 'text-[#10B981]' : 'text-[#6B7280]'}
                  />
                  <MetricBox
                    label="Rel. Volume"
                    value={`${stock.relativeVolume.toFixed(2)}x`}
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

              {/* Key Levels */}
              <div className="card p-4">
                <h2 className="card-title mb-3">Key Levels</h2>
                <div className="grid grid-cols-2 gap-2">
                  <MetricBox label="20-Day High" value={formatCurrency(stock.high20d, stock.currency)} />
                  <MetricBox label="20-Day Low"  value={formatCurrency(stock.low20d,  stock.currency)} />
                  <MetricBox label="52-Week High" value={formatCurrency(stock.high52w, stock.currency)} />
                  <MetricBox label="52-Week Low"  value={formatCurrency(stock.low52w,  stock.currency)} />
                </div>
              </div>

              {/* Fundamentals */}
              {hasFundamentals && (() => {
                const isIDX = isIDXStock(stock);
                const missingFundamentals = isIDX && (stock.peRatio == null || stock.eps == null || stock.beta == null);
                return (
                  <div className="card p-4">
                    <div className="flex items-center justify-between mb-3">
                      <h2 className="card-title">Fundamentals</h2>
                      <span className="text-[10px] text-[#6B7280]">~15 min delay</span>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                      {stock.marketCap != null && (
                        <MetricBox label="Market Cap" value={formatLargeNumber(stock.marketCap, stock.currency)} />
                      )}
                      {stock.peRatio != null && (
                        <MetricBox label="P/E Ratio" value={stock.peRatio.toFixed(2)} />
                      )}
                      {stock.eps != null && (
                        <MetricBox
                          label="EPS (TTM)"
                          value={`${stock.currency === 'IDR' ? 'Rp' : '$'}${stock.eps.toFixed(2)}`}
                        />
                      )}
                      {stock.beta != null && (
                        <MetricBox label="Beta" value={stock.beta.toFixed(2)} />
                      )}
                      {stock.dividendYield != null && (
                        <MetricBox
                          label="Div. Yield"
                          value={`${(stock.dividendYield * 100).toFixed(2)}%`}
                        />
                      )}
                      {stock.sector != null && (
                        <MetricBox label="Sector" value={stock.sector} />
                      )}
                    </div>
                    {missingFundamentals && (
                      <p className="text-[10px] text-[#9CA3AF] mt-2">
                        * P/E, EPS &amp; Beta belum tersedia untuk saham IDX — lihat laporan keuangan emiten.
                      </p>
                    )}
                  </div>
                );
              })()}

              {/* Fair Value */}
              <FairValueCard stock={stock} />

              {/* News */}
              <NewsSection symbol={stock.symbol} name={stock.name} />
            </div>
          </div>
        )}
      </div>

      {/* Share toast */}
      {shareCopied && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 px-4 py-2.5 bg-[#0EA5E9] text-white text-sm font-semibold rounded-full shadow-lg animate-fade-in">
          Link disalin! 🔗
        </div>
      )}

      {/* Price Alert modal */}
      {alertModal && stock && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setAlertModal(false)} />
          <div className="relative bg-white dark:bg-[#1E293B] rounded-2xl border border-gray-200 dark:border-[#2D3748] shadow-2xl p-5 w-full max-w-sm z-10">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-bold text-gray-900 dark:text-white">Set Price Alert</h3>
              <button onClick={() => setAlertModal(false)} className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Current price reference */}
            <div className="mb-4 p-3 bg-gray-50 dark:bg-gray-800/60 rounded-lg">
              <p className="text-[10px] text-gray-400 dark:text-gray-500 mb-0.5">{stock.symbol} · Current Price</p>
              <p className="text-lg font-bold text-gray-900 dark:text-white">{formatCurrency(stock.price, stock.currency)}</p>
            </div>

            {/* Condition toggle */}
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">Alert when price goes:</p>
            <div className="flex gap-2 mb-4">
              <button
                onClick={() => setAlertCondition('above')}
                className={`flex-1 py-2 text-sm font-semibold rounded-lg border transition-colors ${
                  alertCondition === 'above'
                    ? 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-400 text-emerald-600 dark:text-emerald-400'
                    : 'border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400 hover:border-gray-300 dark:hover:border-gray-600'
                }`}
              >
                ▲ Above
              </button>
              <button
                onClick={() => setAlertCondition('below')}
                className={`flex-1 py-2 text-sm font-semibold rounded-lg border transition-colors ${
                  alertCondition === 'below'
                    ? 'bg-red-50 dark:bg-red-900/20 border-red-400 text-[#E24B4A]'
                    : 'border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400 hover:border-gray-300 dark:hover:border-gray-600'
                }`}
              >
                ▼ Below
              </button>
            </div>

            {/* Target price input */}
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-1.5">Target price ({stock.currency}):</p>
            <input
              type="number"
              value={alertTarget}
              onChange={e => setAlertTarget(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && saveAlert()}
              min="0"
              step="any"
              autoFocus
              className="w-full px-3 py-2.5 mb-4 text-sm bg-gray-50 dark:bg-gray-800/60 border border-gray-200 dark:border-gray-700 rounded-lg text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:border-[#0EA5E9] transition-colors"
            />

            {/* Notification blocked warning */}
            {typeof Notification !== 'undefined' && Notification.permission === 'denied' && (
              <p className="text-[11px] text-amber-600 dark:text-amber-400 mb-3">
                ⚠ Notifikasi diblokir browser — aktifkan di pengaturan untuk menerima alert.
              </p>
            )}

            {/* Success state */}
            {alertSaved ? (
              <p className="text-sm text-emerald-600 dark:text-emerald-400 font-semibold text-center py-2.5">
                ✓ Alert disimpan!
              </p>
            ) : (
              <button
                onClick={saveAlert}
                className="w-full py-2.5 bg-[#0EA5E9] hover:bg-[#0284C7] text-white text-sm font-semibold rounded-lg transition-colors"
              >
                Set Alert
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default function AppPage() {
  return (
    <Suspense>
      <StockAnalysis />
    </Suspense>
  );
}
