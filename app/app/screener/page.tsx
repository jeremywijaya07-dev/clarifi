'use client';
import { useState, useMemo } from 'react';
import Link from 'next/link';
import { Filter, RefreshCw, ArrowUp, ArrowDown, ChevronsUpDown } from 'lucide-react';
import { StockData } from '@/lib/types';
import { formatCurrency, formatPercent } from '@/lib/utils';

// ── Universe ─────────────────────────────────────────────────────────────────

const IDX_UNIVERSE = [
  'BBCA', 'BBRI', 'BMRI', 'BNGA', 'BBNI', 'MEGA',
  'TLKM', 'EXCL', 'ISAT',
  'ASII', 'AALI', 'UNTR',
  'GOTO', 'BUKA', 'EMTK',
  'ADRO', 'PTBA', 'ITMG', 'INCO', 'ANTM', 'MDKA', 'AMMN',
  'UNVR', 'ICBP', 'INDF', 'MYOR', 'AMRT', 'CPIN',
  'SMGR', 'INTP', 'PGAS', 'AKRA', 'KLBF', 'SIDO', 'MIKA',
  'BMTR', 'SCMA', 'PWON', 'BSDE', 'CTRA', 'SMRA',
  'CUAN', 'WIFI', 'PGEO', 'BREN', 'BRPT', 'TPIA',
  'DSSA', 'INKP', 'TKIM', 'BUMI', 'BRMS', 'DCII',
  'JSMR', 'MAPI', 'ARTO', 'HRUM', 'MEDC', 'BULL',
  'BJBR', 'BJTM', 'BTPS', 'HEAL', 'PRDA', 'ESSA',
  'LPKR', 'KIJA', 'DMAS', 'MBMA', 'NCKL',
];

const BATCH_SIZE = 10;

// ── Types ─────────────────────────────────────────────────────────────────────

interface Filters {
  rsi:    'oversold' | 'neutral' | 'overbought' | null;
  sma20:  'above' | 'below' | null;
  sma50:  'above' | 'below' | null;
  perf1M: 'up' | 'flat' | 'down' | null;
  perf3M: 'up' | 'down' | null;
  vol:    'high' | 'low' | null;
}

type SortKey = 'symbol' | 'price' | 'changePercent' | 'change1M' | 'change3M' | 'rsi14' | 'relativeVolume';

const EMPTY_FILTERS: Filters = {
  rsi: null, sma20: null, sma50: null, perf1M: null, perf3M: null, vol: null,
};

// ── Filter logic ──────────────────────────────────────────────────────────────

function passesFilters(s: StockData, f: Filters): boolean {
  if (f.rsi === 'oversold'   && s.rsi14 >= 30) return false;
  if (f.rsi === 'overbought' && s.rsi14 <= 70) return false;
  if (f.rsi === 'neutral'    && (s.rsi14 < 30 || s.rsi14 > 70)) return false;
  if (f.sma20 === 'above'    && s.price < s.sma20) return false;
  if (f.sma20 === 'below'    && s.price >= s.sma20) return false;
  if (f.sma50 === 'above'    && s.price < s.sma50) return false;
  if (f.sma50 === 'below'    && s.price >= s.sma50) return false;
  if (f.perf1M === 'up'      && s.change1M <= 5) return false;
  if (f.perf1M === 'down'    && s.change1M >= -5) return false;
  if (f.perf1M === 'flat'    && (s.change1M > 5 || s.change1M < -5)) return false;
  if (f.perf3M === 'up'      && s.change3M <= 10) return false;
  if (f.perf3M === 'down'    && s.change3M >= -10) return false;
  if (f.vol === 'high'       && s.relativeVolume <= 1.5) return false;
  if (f.vol === 'low'        && s.relativeVolume >= 0.5) return false;
  return true;
}

function sortResults(data: StockData[], key: SortKey, dir: 'asc' | 'desc'): StockData[] {
  return [...data].sort((a, b) => {
    const av = key === 'symbol' ? a.symbol : (a[key] as number);
    const bv = key === 'symbol' ? b.symbol : (b[key] as number);
    if (av < bv) return dir === 'asc' ? -1 : 1;
    if (av > bv) return dir === 'asc' ? 1 : -1;
    return 0;
  });
}

// ── Sub-components ────────────────────────────────────────────────────────────

function FilterChip({
  label, active, onClick, color = 'green',
}: {
  label: string; active: boolean; onClick: () => void; color?: 'green' | 'red' | 'blue' | 'amber';
}) {
  const activeStyle = {
    green: 'bg-[#00A86B]/10 border-[#00A86B] text-[#00A86B]',
    red:   'bg-red-500/10 border-red-400 text-[#E24B4A]',
    blue:  'bg-blue-500/10 border-blue-400 text-blue-600 dark:text-blue-400',
    amber: 'bg-amber-500/10 border-amber-400 text-amber-600 dark:text-amber-400',
  }[color];

  return (
    <button
      onClick={onClick}
      className={`px-3 py-1.5 text-xs font-semibold rounded-lg border transition-colors whitespace-nowrap ${
        active
          ? activeStyle
          : 'bg-gray-50 dark:bg-gray-800/60 border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400 hover:border-gray-300 dark:hover:border-gray-600'
      }`}
    >
      {label}
    </button>
  );
}

function SortHeader({
  label, sortKey, current, dir, onSort,
}: {
  label: string; sortKey: SortKey; current: SortKey; dir: 'asc' | 'desc'; onSort: (k: SortKey) => void;
}) {
  const active = current === sortKey;
  return (
    <button
      onClick={() => onSort(sortKey)}
      className="flex items-center gap-1 text-left hover:text-[#00A86B] transition-colors whitespace-nowrap"
    >
      {label}
      {active ? (
        dir === 'asc' ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />
      ) : (
        <ChevronsUpDown className="w-3 h-3 opacity-40" />
      )}
    </button>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function ScreenerPage() {
  const [allData, setAllData]   = useState<StockData[]>([]);
  const [scanned, setScanned]   = useState(false);
  const [scanning, setScanning] = useState(false);
  const [progress, setProgress] = useState({ done: 0, total: 0 });
  const [filters, setFilters]   = useState<Filters>(EMPTY_FILTERS);
  const [sortKey, setSortKey]   = useState<SortKey>('change1M');
  const [sortDir, setSortDir]   = useState<'asc' | 'desc'>('desc');

  const handleSort = (key: SortKey) => {
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortKey(key); setSortDir('desc'); }
  };

  const toggle = <K extends keyof Filters>(key: K, val: Filters[K]) => {
    setFilters(prev => ({ ...prev, [key]: prev[key] === val ? null : val }));
  };

  const hasFilters = Object.values(filters).some(v => v !== null);

  const results = useMemo(() => {
    const filtered = allData.filter(s => passesFilters(s, filters));
    return sortResults(filtered, sortKey, sortDir);
  }, [allData, filters, sortKey, sortDir]);

  const scan = async () => {
    setScanning(true);
    setAllData([]);
    setScanned(false);
    const total = IDX_UNIVERSE.length;
    setProgress({ done: 0, total });

    const collected: StockData[] = [];

    for (let i = 0; i < IDX_UNIVERSE.length; i += BATCH_SIZE) {
      const batch = IDX_UNIVERSE.slice(i, i + BATCH_SIZE).map(t => `${t}:IDX`);
      const settled = await Promise.allSettled(
        batch.map(sym =>
          fetch(`/api/stock?symbol=${encodeURIComponent(sym)}`).then(r => r.json())
        )
      );
      for (const res of settled) {
        if (res.status === 'fulfilled') {
          const d = res.value as StockData;
          if (d?.symbol && d.price > 0) collected.push(d);
        }
      }
      setProgress({ done: Math.min(i + BATCH_SIZE, total), total });
    }

    setAllData(collected);
    setScanned(true);
    setScanning(false);
  };

  const pct = progress.total > 0 ? Math.round((progress.done / progress.total) * 100) : 0;

  return (
    <div className="min-h-screen bg-[#F8FAFC] dark:bg-[#0A0F1E]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-4">

        {/* Header */}
        <div>
          <h1 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <Filter className="w-5 h-5 text-[#00A86B]" />
            Screener IDX
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
            Filter {IDX_UNIVERSE.length} saham liquid IDX berdasarkan kriteria teknikal
          </p>
        </div>

        {/* Filter card */}
        <div className="bg-white dark:bg-[#111827] rounded-xl border border-gray-200 dark:border-[#1F2937] p-4 space-y-3">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-400 dark:text-gray-500">Filter</p>

          <div className="grid gap-3">
            {/* RSI */}
            <div className="flex items-center gap-3 flex-wrap">
              <span className="text-xs font-medium text-gray-500 dark:text-gray-400 w-24 shrink-0">RSI (14)</span>
              <div className="flex gap-1.5 flex-wrap">
                <FilterChip label="Oversold < 30" active={filters.rsi === 'oversold'}   onClick={() => toggle('rsi', 'oversold')}   color="blue" />
                <FilterChip label="Neutral 30–70" active={filters.rsi === 'neutral'}    onClick={() => toggle('rsi', 'neutral')}    color="green" />
                <FilterChip label="Overbought > 70" active={filters.rsi === 'overbought'} onClick={() => toggle('rsi', 'overbought')} color="red" />
              </div>
            </div>

            {/* SMA20 */}
            <div className="flex items-center gap-3 flex-wrap">
              <span className="text-xs font-medium text-gray-500 dark:text-gray-400 w-24 shrink-0">vs SMA20</span>
              <div className="flex gap-1.5 flex-wrap">
                <FilterChip label="▲ Above SMA20" active={filters.sma20 === 'above'} onClick={() => toggle('sma20', 'above')} color="green" />
                <FilterChip label="▼ Below SMA20" active={filters.sma20 === 'below'} onClick={() => toggle('sma20', 'below')} color="red" />
              </div>
            </div>

            {/* SMA50 */}
            <div className="flex items-center gap-3 flex-wrap">
              <span className="text-xs font-medium text-gray-500 dark:text-gray-400 w-24 shrink-0">vs SMA50</span>
              <div className="flex gap-1.5 flex-wrap">
                <FilterChip label="▲ Above SMA50" active={filters.sma50 === 'above'} onClick={() => toggle('sma50', 'above')} color="green" />
                <FilterChip label="▼ Below SMA50" active={filters.sma50 === 'below'} onClick={() => toggle('sma50', 'below')} color="red" />
              </div>
            </div>

            {/* Perf 1M */}
            <div className="flex items-center gap-3 flex-wrap">
              <span className="text-xs font-medium text-gray-500 dark:text-gray-400 w-24 shrink-0">Perf 1 Bulan</span>
              <div className="flex gap-1.5 flex-wrap">
                <FilterChip label="Naik > 5%"    active={filters.perf1M === 'up'}   onClick={() => toggle('perf1M', 'up')}   color="green" />
                <FilterChip label="Flat ±5%"     active={filters.perf1M === 'flat'} onClick={() => toggle('perf1M', 'flat')} color="amber" />
                <FilterChip label="Turun > 5%"   active={filters.perf1M === 'down'} onClick={() => toggle('perf1M', 'down')} color="red" />
              </div>
            </div>

            {/* Perf 3M */}
            <div className="flex items-center gap-3 flex-wrap">
              <span className="text-xs font-medium text-gray-500 dark:text-gray-400 w-24 shrink-0">Perf 3 Bulan</span>
              <div className="flex gap-1.5 flex-wrap">
                <FilterChip label="Naik > 10%"   active={filters.perf3M === 'up'}   onClick={() => toggle('perf3M', 'up')}   color="green" />
                <FilterChip label="Turun > 10%"  active={filters.perf3M === 'down'} onClick={() => toggle('perf3M', 'down')} color="red" />
              </div>
            </div>

            {/* Volume */}
            <div className="flex items-center gap-3 flex-wrap">
              <span className="text-xs font-medium text-gray-500 dark:text-gray-400 w-24 shrink-0">Volume</span>
              <div className="flex gap-1.5 flex-wrap">
                <FilterChip label="Tinggi > 1.5x" active={filters.vol === 'high'} onClick={() => toggle('vol', 'high')} color="amber" />
                <FilterChip label="Rendah < 0.5x" active={filters.vol === 'low'}  onClick={() => toggle('vol', 'low')}  color="green" />
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2 pt-1 border-t border-gray-100 dark:border-gray-800">
            <button
              onClick={scan}
              disabled={scanning}
              className="flex items-center gap-1.5 px-4 py-2 bg-[#00A86B] hover:bg-[#009060] disabled:opacity-60 text-white text-sm font-semibold rounded-lg transition-colors"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${scanning ? 'animate-spin' : ''}`} />
              {scanning ? `Scanning ${progress.done}/${progress.total}…` : scanned ? 'Scan Ulang' : 'Scan Sekarang'}
            </button>
            {hasFilters && (
              <button
                onClick={() => setFilters(EMPTY_FILTERS)}
                className="px-3 py-2 text-xs font-medium text-gray-500 dark:text-gray-400 hover:text-[#E24B4A] transition-colors"
              >
                Reset Filter
              </button>
            )}
          </div>

          {/* Progress bar */}
          {scanning && (
            <div className="w-full bg-gray-100 dark:bg-gray-800 rounded-full h-1.5 overflow-hidden">
              <div
                className="bg-[#00A86B] h-full rounded-full transition-all duration-300"
                style={{ width: `${pct}%` }}
              />
            </div>
          )}
        </div>

        {/* Results */}
        {scanned && !scanning && (
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="text-sm font-semibold text-gray-900 dark:text-white">
                {results.length} saham ditemukan
              </span>
              {allData.length !== results.length && (
                <span className="text-xs text-gray-400">dari {allData.length} yang berhasil di-scan</span>
              )}
            </div>

            {results.length === 0 ? (
              <div className="bg-white dark:bg-[#111827] rounded-xl border border-gray-200 dark:border-[#1F2937] p-12 text-center">
                <Filter className="w-8 h-8 text-gray-200 dark:text-gray-800 mx-auto mb-3" />
                <p className="text-gray-500 dark:text-gray-400 text-sm">Tidak ada saham yang cocok dengan filter ini</p>
                <button
                  onClick={() => setFilters(EMPTY_FILTERS)}
                  className="mt-3 text-xs text-[#00A86B] hover:underline"
                >
                  Reset semua filter
                </button>
              </div>
            ) : (
              <div className="bg-white dark:bg-[#111827] rounded-xl border border-gray-200 dark:border-[#1F2937] overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/50">
                        <th className="px-3 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wide text-gray-400 dark:text-gray-500">
                          <SortHeader label="Ticker" sortKey="symbol" current={sortKey} dir={sortDir} onSort={handleSort} />
                        </th>
                        <th className="px-3 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wide text-gray-400 dark:text-gray-500 min-w-[140px]">
                          Nama
                        </th>
                        <th className="px-3 py-2.5 text-right text-[11px] font-semibold uppercase tracking-wide text-gray-400 dark:text-gray-500">
                          <SortHeader label="Harga" sortKey="price" current={sortKey} dir={sortDir} onSort={handleSort} />
                        </th>
                        <th className="px-3 py-2.5 text-right text-[11px] font-semibold uppercase tracking-wide text-gray-400 dark:text-gray-500">
                          <SortHeader label="% 1D" sortKey="changePercent" current={sortKey} dir={sortDir} onSort={handleSort} />
                        </th>
                        <th className="px-3 py-2.5 text-right text-[11px] font-semibold uppercase tracking-wide text-gray-400 dark:text-gray-500">
                          <SortHeader label="% 1M" sortKey="change1M" current={sortKey} dir={sortDir} onSort={handleSort} />
                        </th>
                        <th className="px-3 py-2.5 text-right text-[11px] font-semibold uppercase tracking-wide text-gray-400 dark:text-gray-500">
                          <SortHeader label="% 3M" sortKey="change3M" current={sortKey} dir={sortDir} onSort={handleSort} />
                        </th>
                        <th className="px-3 py-2.5 text-right text-[11px] font-semibold uppercase tracking-wide text-gray-400 dark:text-gray-500">
                          <SortHeader label="RSI" sortKey="rsi14" current={sortKey} dir={sortDir} onSort={handleSort} />
                        </th>
                        <th className="px-3 py-2.5 text-center text-[11px] font-semibold uppercase tracking-wide text-gray-400 dark:text-gray-500">
                          SMA20
                        </th>
                        <th className="px-3 py-2.5 text-center text-[11px] font-semibold uppercase tracking-wide text-gray-400 dark:text-gray-500">
                          SMA50
                        </th>
                        <th className="px-3 py-2.5 text-right text-[11px] font-semibold uppercase tracking-wide text-gray-400 dark:text-gray-500">
                          <SortHeader label="Rel. Vol" sortKey="relativeVolume" current={sortKey} dir={sortDir} onSort={handleSort} />
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50 dark:divide-gray-800">
                      {results.map(s => {
                        const aboveSMA20 = s.price >= s.sma20;
                        const aboveSMA50 = s.price >= s.sma50;
                        const rsiColor =
                          s.rsi14 > 70 ? 'text-[#E24B4A]' :
                          s.rsi14 < 30 ? 'text-blue-500 dark:text-blue-400' :
                          'text-gray-700 dark:text-gray-300';

                        return (
                          <Link
                            key={s.symbol}
                            href={`/app?symbol=${encodeURIComponent(s.symbol.replace(/:IDX$/i, ''))}`}
                            className="table-row hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors cursor-pointer"
                          >
                            <td className="px-3 py-2.5">
                              <span className="font-bold text-gray-900 dark:text-white text-[13px]">
                                {s.symbol.replace(/:IDX$/i, '')}
                              </span>
                            </td>
                            <td className="px-3 py-2.5">
                              <span className="text-xs text-gray-500 dark:text-gray-400 line-clamp-1 max-w-[180px]">
                                {s.name}
                              </span>
                            </td>
                            <td className="px-3 py-2.5 text-right font-semibold text-gray-900 dark:text-white text-[13px] whitespace-nowrap">
                              {formatCurrency(s.price, s.currency)}
                            </td>
                            <td className={`px-3 py-2.5 text-right text-[13px] font-semibold whitespace-nowrap ${s.changePercent >= 0 ? 'text-[#00A86B]' : 'text-[#E24B4A]'}`}>
                              {formatPercent(s.changePercent)}
                            </td>
                            <td className={`px-3 py-2.5 text-right text-[13px] font-semibold whitespace-nowrap ${s.change1M >= 0 ? 'text-[#00A86B]' : 'text-[#E24B4A]'}`}>
                              {formatPercent(s.change1M)}
                            </td>
                            <td className={`px-3 py-2.5 text-right text-[13px] font-semibold whitespace-nowrap ${s.change3M >= 0 ? 'text-[#00A86B]' : 'text-[#E24B4A]'}`}>
                              {formatPercent(s.change3M)}
                            </td>
                            <td className={`px-3 py-2.5 text-right font-bold text-[13px] ${rsiColor}`}>
                              {s.rsi14.toFixed(1)}
                            </td>
                            <td className="px-3 py-2.5 text-center">
                              <span className={`text-[11px] font-semibold px-2 py-0.5 rounded ${
                                aboveSMA20
                                  ? 'bg-[#00A86B]/10 text-[#00A86B]'
                                  : 'bg-red-500/10 text-[#E24B4A]'
                              }`}>
                                {aboveSMA20 ? '▲' : '▼'}
                              </span>
                            </td>
                            <td className="px-3 py-2.5 text-center">
                              <span className={`text-[11px] font-semibold px-2 py-0.5 rounded ${
                                aboveSMA50
                                  ? 'bg-[#00A86B]/10 text-[#00A86B]'
                                  : 'bg-red-500/10 text-[#E24B4A]'
                              }`}>
                                {aboveSMA50 ? '▲' : '▼'}
                              </span>
                            </td>
                            <td className="px-3 py-2.5 text-right text-[13px] text-gray-600 dark:text-gray-400 whitespace-nowrap">
                              {s.relativeVolume > 0 ? `${s.relativeVolume.toFixed(2)}x` : '—'}
                            </td>
                          </Link>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Pre-scan placeholder */}
        {!scanned && !scanning && (
          <div className="bg-white dark:bg-[#111827] rounded-xl border border-gray-200 dark:border-[#1F2937] p-12 text-center">
            <Filter className="w-8 h-8 text-gray-200 dark:text-gray-800 mx-auto mb-3" />
            <p className="text-gray-500 dark:text-gray-400 text-sm">
              Klik <span className="font-semibold text-gray-700 dark:text-gray-300">Scan Sekarang</span> untuk mulai screening
            </p>
            <p className="text-xs text-gray-400 dark:text-gray-600 mt-1">
              {IDX_UNIVERSE.length} saham IDX akan di-scan secara paralel
            </p>
          </div>
        )}

      </div>
    </div>
  );
}
