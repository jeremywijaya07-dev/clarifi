'use client';
import { useState, useEffect } from 'react';
import { Loader2 } from 'lucide-react';
import {
  LineChart, Line, XAxis, YAxis, Tooltip,
  ResponsiveContainer, CartesianGrid, ReferenceLine,
} from 'recharts';

type Period = '1M' | '3M' | '6M' | '1Y';
const PERIODS: Period[] = ['1M', '3M', '6M', '1Y'];

const S1_COLOR = '#3B82F6';
const S2_COLOR = '#A855F7';

interface ChartPoint {
  date: string;
  s1: number | null;
  s2: number | null;
}

interface CompareChartProps {
  symbol1: string;
  symbol2: string;
}

function normalize(points: { date: string; close: number }[]): { date: string; pct: number }[] {
  if (!points.length) return [];
  const base = points[0].close;
  if (!base) return [];
  return points.map(p => ({
    date: p.date,
    pct: Math.round(((p.close - base) / base) * 10000) / 100,
  }));
}

function fmtTickDate(dateStr: string, period: Period): string {
  try {
    const d = new Date(dateStr);
    if (period === '1M') {
      return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    }
    return d.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
  } catch { return dateStr; }
}

function fmtTooltipDate(dateStr: string): string {
  try {
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
  } catch { return dateStr; }
}

function fmtPct(v: number | null): string {
  if (v == null) return 'N/A';
  return `${v >= 0 ? '+' : ''}${v.toFixed(2)}%`;
}

interface TooltipEntry {
  dataKey: string;
  value: number | null;
  color: string;
}

function CustomTooltip({
  active,
  payload,
  label,
  symbol1,
  symbol2,
}: {
  active?: boolean;
  payload?: TooltipEntry[];
  label?: string;
  symbol1: string;
  symbol2: string;
}) {
  if (!active || !payload?.length) return null;
  const s1Entry = payload.find(p => p.dataKey === 's1');
  const s2Entry = payload.find(p => p.dataKey === 's2');
  return (
    <div className="bg-white dark:bg-[#111827] border border-gray-200 dark:border-[#1F2937] rounded-lg p-2.5 shadow-lg text-xs min-w-[170px]">
      <p className="text-gray-400 dark:text-gray-500 mb-1.5 font-medium">
        {label ? fmtTooltipDate(label) : ''}
      </p>
      {([{ entry: s1Entry, sym: symbol1 }, { entry: s2Entry, sym: symbol2 }] as const).map(
        ({ entry, sym }) =>
          entry ? (
            <div key={sym} className="flex items-center justify-between gap-3 mb-0.5">
              <div className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color }} />
                <span className="text-gray-500 dark:text-gray-400">{sym}</span>
              </div>
              <span
                className={`font-semibold ${
                  entry.value != null && entry.value >= 0
                    ? 'text-[#1D9E75]'
                    : 'text-[#EF4444]'
                }`}
              >
                {fmtPct(entry.value)}
              </span>
            </div>
          ) : null,
      )}
    </div>
  );
}

export default function CompareChart({ symbol1, symbol2 }: CompareChartProps) {
  const [period, setPeriod] = useState<Period>('3M');
  const [chartData, setChartData] = useState<ChartPoint[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [returns, setReturns] = useState<{ s1: number | null; s2: number | null }>({
    s1: null,
    s2: null,
  });

  useEffect(() => {
    let cancelled = false;

    async function fetchData() {
      setLoading(true);
      setError(null);
      try {
        const [r1, r2] = await Promise.all([
          fetch(`/api/chart?symbol=${encodeURIComponent(symbol1)}&period=${period}`),
          fetch(`/api/chart?symbol=${encodeURIComponent(symbol2)}&period=${period}`),
        ]);
        const [d1, d2] = await Promise.all([r1.json(), r2.json()]);
        if (cancelled) return;
        if (!r1.ok) throw new Error(d1.error ?? `Failed to load ${symbol1}`);
        if (!r2.ok) throw new Error(d2.error ?? `Failed to load ${symbol2}`);

        const norm1 = normalize(d1.points ?? []);
        const norm2 = normalize(d2.points ?? []);

        const map1 = new Map(norm1.map(p => [p.date, p.pct]));
        const map2 = new Map(norm2.map(p => [p.date, p.pct]));
        const allDates = Array.from(
          new Set([...norm1.map(p => p.date), ...norm2.map(p => p.date)]),
        ).sort();

        setChartData(
          allDates.map(date => ({
            date,
            s1: map1.has(date) ? (map1.get(date) as number) : null,
            s2: map2.has(date) ? (map2.get(date) as number) : null,
          })),
        );
        setReturns({
          s1: norm1.length ? norm1[norm1.length - 1].pct : null,
          s2: norm2.length ? norm2[norm2.length - 1].pct : null,
        });
      } catch (e) {
        if (!cancelled)
          setError(e instanceof Error ? e.message : 'Failed to load chart data');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    fetchData();
    return () => {
      cancelled = true;
    };
  }, [symbol1, symbol2, period]);

  const tickInterval = Math.max(1, Math.floor(chartData.length / 5));

  return (
    <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-[#2D3748] p-4 mb-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs font-semibold text-gray-500 dark:text-gray-400">
          Price Performance (%)
        </span>
        <div className="flex items-center gap-1">
          {PERIODS.map(p => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              disabled={loading}
              className={`px-2.5 py-1 text-[11px] font-semibold rounded transition-colors disabled:opacity-50 ${
                period === p
                  ? 'bg-[#1D9E75] text-white'
                  : 'bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 hover:bg-[#1D9E75]/10 hover:text-[#1D9E75] dark:hover:text-[#1D9E75]'
              }`}
            >
              {p}
            </button>
          ))}
          {loading && (
            <Loader2 className="w-3.5 h-3.5 animate-spin text-[#1D9E75] ml-1" />
          )}
        </div>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-5 mb-3">
        {(
          [
            { sym: symbol1, color: S1_COLOR, ret: returns.s1 },
            { sym: symbol2, color: S2_COLOR, ret: returns.s2 },
          ] as const
        ).map(({ sym, color, ret }) => (
          <div key={sym} className="flex items-center gap-1.5 text-xs">
            <div className="w-4 h-0.5 rounded-full" style={{ backgroundColor: color }} />
            <span className="font-bold" style={{ color }}>
              {sym}
            </span>
            {ret != null && (
              <span
                className={`font-semibold ${ret >= 0 ? 'text-[#1D9E75]' : 'text-[#EF4444]'}`}
              >
                — {fmtPct(ret)}
              </span>
            )}
          </div>
        ))}
      </div>

      {/* Error */}
      {error && (
        <div className="text-xs text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-800 px-3 py-2 rounded mb-2">
          {error}
        </div>
      )}

      {/* Chart */}
      <div className="relative w-full h-56">
        {loading && (
          <div className="absolute inset-0 bg-white/60 dark:bg-gray-900/60 flex items-center justify-center rounded z-10">
            <Loader2 className="w-5 h-5 animate-spin text-[#1D9E75]" />
          </div>
        )}
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData} margin={{ top: 4, right: 4, left: 0, bottom: 4 }}>
            <CartesianGrid
              strokeDasharray="3 3"
              stroke="#1F2937"
              opacity={0.3}
              vertical={false}
            />
            <XAxis
              dataKey="date"
              tickFormatter={d => fmtTickDate(d, period)}
              tick={{ fontSize: 10, fill: '#6B7280' }}
              tickLine={false}
              axisLine={false}
              interval={tickInterval}
            />
            <YAxis
              tickFormatter={v => `${v >= 0 ? '+' : ''}${(v as number).toFixed(1)}%`}
              tick={{ fontSize: 10, fill: '#6B7280' }}
              tickLine={false}
              axisLine={false}
              width={56}
            />
            <ReferenceLine
              y={0}
              stroke="#6B7280"
              strokeDasharray="4 2"
              strokeOpacity={0.5}
            />
            <Tooltip
              content={({ active, payload, label }) => (
                <CustomTooltip
                  active={active}
                  payload={payload as TooltipEntry[] | undefined}
                  label={label as string | undefined}
                  symbol1={symbol1}
                  symbol2={symbol2}
                />
              )}
            />
            <Line
              type="monotone"
              dataKey="s1"
              stroke={S1_COLOR}
              strokeWidth={2}
              dot={false}
              connectNulls
            />
            <Line
              type="monotone"
              dataKey="s2"
              stroke={S2_COLOR}
              strokeWidth={2}
              dot={false}
              connectNulls
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
