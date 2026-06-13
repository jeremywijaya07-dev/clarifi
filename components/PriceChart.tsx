'use client';
import { useState, useEffect } from 'react';
import { Loader2 } from 'lucide-react';
import {
  ComposedChart, Bar, Line, XAxis, YAxis, Tooltip,
  ResponsiveContainer, CartesianGrid, Cell,
} from 'recharts';
import { PricePoint } from '@/lib/types';
import { formatChartPrice } from '@/lib/utils';

type Timeframe = '1m' | '5m' | '15m' | '1H' | '1D' | '1W' | '1M';

const TABS: Timeframe[] = ['1m', '5m', '15m', '1H', '1D', '1W', '1M'];

interface Props {
  data: PricePoint[];
  currency?: string;
  symbol: string;
}

interface TooltipPayload { dataKey: string; value: number | null; color: string; }
interface CustomTooltipProps {
  active?: boolean;
  payload?: TooltipPayload[];
  label?: string;
  currency?: string;
  timeframe?: Timeframe;
}

function fmtTickDate(dateStr: string, tf: Timeframe): string {
  try {
    const d = new Date(dateStr);
    if (tf === '1m' || tf === '5m' || tf === '15m' || tf === '1H') {
      return d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false });
    }
    if (tf === '1D') {
      return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    }
    return d.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
  } catch { return dateStr; }
}

function fmtTooltipDate(dateStr: string, tf: Timeframe): string {
  try {
    const d = new Date(dateStr);
    if (tf === '1m' || tf === '5m' || tf === '15m' || tf === '1H') {
      return d.toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false });
    }
    return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
  } catch { return dateStr; }
}

function CustomTooltip({ active, payload, label, currency = 'USD', timeframe = '1D' }: CustomTooltipProps) {
  if (!active || !payload?.length) return null;
  const KEYS = [
    { key: 'close', label: 'Price',  color: '#00A86B' },
    { key: 'sma20', label: 'SMA 20', color: '#f59e0b' },
    { key: 'sma50', label: 'SMA 50', color: '#6366f1' },
  ];
  return (
    <div className="bg-white dark:bg-[#111827] border border-gray-200 dark:border-[#1F2937] rounded-lg p-2.5 shadow-lg text-xs min-w-[140px]">
      <p className="text-gray-400 dark:text-[#6B7280] mb-1.5 font-medium">
        {label ? fmtTooltipDate(label, timeframe) : ''}
      </p>
      {KEYS.map(({ key, label: lbl, color }) => {
        const p = payload.find(x => x.dataKey === key);
        if (!p || p.value == null) return null;
        return (
          <div key={key} className="flex items-center justify-between gap-3 mb-0.5">
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full" style={{ backgroundColor: color }} />
              <span className="text-gray-500 dark:text-[#9CA3AF]">{lbl}</span>
            </div>
            <span className="font-semibold text-gray-900 dark:text-white">
              {formatChartPrice(p.value, currency)}
            </span>
          </div>
        );
      })}
    </div>
  );
}

type FetchedChart = { points: PricePoint[]; showSMA: boolean };

export default function PriceChart({ data, currency = 'USD', symbol }: Props) {
  const [timeframe, setTimeframe] = useState<Timeframe>('1D');
  const [fetched,   setFetched]   = useState<FetchedChart | null>(null);
  const [loading,   setLoading]   = useState(false);
  const [chartErr,  setChartErr]  = useState<string | null>(null);

  // Reset to 1D when a new stock is loaded
  useEffect(() => {
    setTimeframe('1D');
    setFetched(null);
    setChartErr(null);
  }, [symbol]);

  const handleTimeframe = async (tf: Timeframe) => {
    if (loading) return;
    if (tf === '1D') {
      setTimeframe('1D');
      setFetched(null);
      setChartErr(null);
      return;
    }
    setTimeframe(tf);
    setLoading(true);
    setChartErr(null);
    try {
      const res  = await fetch(`/api/chart?symbol=${encodeURIComponent(symbol)}&timeframe=${encodeURIComponent(tf)}`);
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? `Gagal memuat data ${tf}`);
      if (!json.points?.length) throw new Error(`Data ${tf} tidak tersedia untuk ticker ini`);
      setFetched({ points: json.points, showSMA: json.showSMA });
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Gagal memuat data chart';
      setChartErr(`${msg} — kembali ke 1D`);
      setTimeframe('1D');
      setFetched(null);
    } finally {
      setLoading(false);
    }
  };

  const displayData = timeframe === '1D' || !fetched ? data.slice(-90) : fetched.points;
  const showSMA     = timeframe === '1D' || !fetched ? true : fetched.showSMA;

  const prices      = displayData.map(d => d.close).filter(p => p > 0);
  const minP        = prices.length ? Math.min(...prices) * 0.993 : 0;
  const maxP        = prices.length ? Math.max(...prices) * 1.007 : 1;
  const tickInterval = Math.max(1, Math.floor(displayData.length / 5));
  const barSize      = displayData.length > 300 ? 1 : displayData.length > 100 ? 2 : 3;

  return (
    <div>
      {/* Timeframe tabs */}
      <div className="flex items-center gap-1 mb-3">
        {TABS.map(tf => (
          <button
            key={tf}
            onClick={() => handleTimeframe(tf)}
            disabled={loading}
            className={`px-2.5 py-1 text-[11px] font-semibold rounded transition-colors disabled:opacity-50 ${
              timeframe === tf
                ? 'bg-[#00A86B] text-white'
                : 'bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 hover:bg-[#00A86B]/10 hover:text-[#00A86B] dark:hover:text-[#00A86B]'
            }`}
          >
            {tf}
          </button>
        ))}
        {loading && <Loader2 className="w-3.5 h-3.5 animate-spin text-[#00A86B] ml-1" />}
      </div>

      {/* Error banner */}
      {chartErr && (
        <div className="flex items-center justify-between text-[11px] text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-800 px-3 py-1.5 rounded mb-2">
          <span>{chartErr}</span>
          <button onClick={() => setChartErr(null)} className="ml-2 text-amber-400 hover:text-amber-600">✕</button>
        </div>
      )}

      {/* Chart area */}
      <div className="relative w-full h-60">
        {loading && (
          <div className="absolute inset-0 bg-white/60 dark:bg-[#111827]/60 flex items-center justify-center rounded z-10">
            <Loader2 className="w-5 h-5 animate-spin text-[#00A86B]" />
          </div>
        )}
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={displayData} margin={{ top: 4, right: 4, left: 0, bottom: 4 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1F2937" opacity={0.5} vertical={false} />
            <XAxis
              dataKey="date"
              tickFormatter={d => fmtTickDate(d, timeframe)}
              tick={{ fontSize: 10, fill: '#6B7280' }}
              tickLine={false}
              axisLine={false}
              interval={tickInterval}
            />
            <YAxis
              domain={[minP, maxP]}
              tickFormatter={v => formatChartPrice(v, currency)}
              tick={{ fontSize: 10, fill: '#6B7280' }}
              tickLine={false}
              axisLine={false}
              width={60}
            />
            <Tooltip content={<CustomTooltip currency={currency} timeframe={timeframe} />} />
            <Bar dataKey="close" barSize={barSize} radius={[1, 1, 0, 0]}>
              {displayData.map((entry, i) => {
                const prev = i > 0 ? displayData[i - 1].close : entry.close;
                return (
                  <Cell key={`c-${i}`} fill={entry.close >= prev ? '#00A86B' : '#EF4444'} fillOpacity={0.9} />
                );
              })}
            </Bar>
            {showSMA && (
              <>
                <Line type="monotone" dataKey="sma20" stroke="#f59e0b" strokeWidth={1.5} dot={false} strokeDasharray="5 3" connectNulls={false} />
                <Line type="monotone" dataKey="sma50" stroke="#6366f1" strokeWidth={1.5} dot={false} strokeDasharray="5 3" connectNulls={false} />
              </>
            )}
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-5 mt-2 text-[11px] text-[#6B7280]">
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-2 inline-block rounded-sm bg-[#00A86B]" /> Price
        </span>
        {showSMA ? (
          <>
            <span className="flex items-center gap-1.5">
              <span className="w-4 border-t-2 border-dashed border-amber-400 inline-block" /> SMA 20
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-4 border-t-2 border-dashed border-indigo-500 inline-block" /> SMA 50
            </span>
          </>
        ) : (
          <span className="italic text-gray-400 dark:text-gray-600">SMA overlay tidak tersedia untuk timeframe intraday</span>
        )}
      </div>
    </div>
  );
}
