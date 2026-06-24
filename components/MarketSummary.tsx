'use client';
import { useState, useEffect, useCallback } from 'react';
import { Sparkles, ChevronDown, ChevronUp, TrendingUp, TrendingDown, RefreshCw, AlertTriangle } from 'lucide-react';
import type { MarketSummaryData } from '@/app/api/market-summary/route';

const STALE_THRESHOLD_MS = 3 * 60 * 60 * 1000; // 3 hours

function formatTimestamp(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) +
      ', ' + d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' });
  } catch {
    return iso;
  }
}

function timeAgo(iso: string): string {
  const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (diff < 1) return 'baru saja';
  if (diff < 60) return `${diff} menit lalu`;
  return `${Math.floor(diff / 60)} jam lalu`;
}

function SkeletonCard() {
  return (
    <div className="mb-4">
      <div className="bg-white dark:bg-[#1E293B] border border-gray-200 dark:border-[#2D3748] rounded-xl px-4 py-3 shadow-sm space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="skeleton w-3.5 h-3.5 rounded" />
            <div className="skeleton h-3 rounded w-36" />
            <div className="skeleton h-3 rounded w-20" />
          </div>
          <div className="skeleton h-3 rounded w-16" />
        </div>
        <div className="space-y-2">
          <div className="skeleton h-3 rounded w-full" />
          <div className="skeleton h-3 rounded w-5/6" />
          <div className="skeleton h-3 rounded w-4/5" />
        </div>
        <div className="flex gap-1.5">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="skeleton h-6 rounded-full w-20" />
          ))}
        </div>
      </div>
    </div>
  );
}

export default function MarketSummary() {
  const [data, setData] = useState<MarketSummaryData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [collapsed, setCollapsed] = useState(false);

  const load = useCallback(async (force = false) => {
    const url = force ? '/api/market-summary?force=1' : '/api/market-summary';
    try {
      const r = await fetch(url);
      if (!r.ok) throw new Error('fetch failed');
      const d: MarketSummaryData = await r.json();
      setData(d);
    } catch {
      /* hide card silently */
    }
  }, []);

  useEffect(() => {
    load(false).finally(() => setLoading(false));
  }, [load]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await load(true);
    setRefreshing(false);
  };

  if (loading) return <SkeletonCard />;
  if (!data) return null;

  const up = data.ihsg_change >= 0;
  const isStale = Date.now() - new Date(data.generated_at).getTime() > STALE_THRESHOLD_MS;
  const isExtreme = Math.abs(data.ihsg_change) > 4;

  return (
    <div className="mb-4">
      <div className="bg-white dark:bg-[#1E293B] border border-gray-200 dark:border-[#2D3748] rounded-xl shadow-sm overflow-hidden">

        {/* ── Header ── */}
        <div className="flex items-center justify-between px-4 py-2.5 border-b border-gray-100 dark:border-[#2D3748]">
          <div className="flex items-center gap-2 flex-wrap min-w-0">
            <Sparkles className="w-3.5 h-3.5 text-[#0EA5E9] shrink-0" />
            <span className="text-[11px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider shrink-0">
              Ringkasan Pasar IDX
            </span>
            {/* IHSG inline */}
            <span className="flex items-center gap-1.5 shrink-0">
              <span className="text-[12px] font-bold text-gray-800 dark:text-gray-200">
                IHSG {data.ihsg_price.toLocaleString('id-ID', { maximumFractionDigits: 0 })}
              </span>
              <span className={`text-[11px] font-semibold ${up ? 'text-[#10B981]' : 'text-[#EF4444]'}`}>
                {up ? '+' : ''}{data.ihsg_change.toFixed(2)}%
              </span>
              <span className="text-[10px] text-gray-400 dark:text-gray-500 bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded">
                Harian
              </span>
            </span>
            {isExtreme && (
              <span className="hidden sm:inline-flex items-center gap-1 text-[10px] font-semibold text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700/40 px-1.5 py-0.5 rounded shrink-0">
                <AlertTriangle className="w-2.5 h-2.5" />
                Pergerakan ekstrem — verifikasi
              </span>
            )}
            <span className="hidden sm:inline-flex items-center gap-1 text-[10px] font-semibold text-[#0EA5E9] bg-[#0EA5E9]/10 px-1.5 py-0.5 rounded shrink-0">
              <Sparkles className="w-2.5 h-2.5" />
              AI
            </span>
          </div>
          <div className="flex items-center gap-2 shrink-0 ml-2">
            {isStale && (
              <span className="hidden sm:inline-flex items-center gap-1 text-[10px] text-amber-600 dark:text-amber-400 font-medium">
                <AlertTriangle className="w-3 h-3" />
                Data tertunda
              </span>
            )}
            <span className="hidden sm:block text-[10px] text-gray-400 dark:text-gray-500" title={formatTimestamp(data.generated_at)}>
              {timeAgo(data.generated_at)}
            </span>
            <button
              onClick={handleRefresh}
              disabled={refreshing}
              title="Perbarui data pasar"
              className="p-1 rounded text-gray-400 hover:text-[#0EA5E9] transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
            </button>
            <button
              onClick={() => setCollapsed(c => !c)}
              aria-label={collapsed ? 'Expand' : 'Collapse'}
              className="p-0.5 rounded text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
            >
              {collapsed ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* ── Body ── */}
        {!collapsed && (
          <div className="px-4 py-3 space-y-3">

            {/* Stale banner (mobile-visible) */}
            {isStale && (
              <div className="flex items-center gap-2 text-[11px] text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700/40 rounded-lg px-3 py-1.5">
                <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                Data mungkin tidak terkini ({timeAgo(data.generated_at)}). Tekan refresh untuk memperbarui.
              </div>
            )}

            {/* Extreme movement sanity note */}
            {isExtreme && (
              <div className="flex items-center gap-2 text-[11px] text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700/40 rounded-lg px-3 py-1.5">
                <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                Pergerakan IHSG {Math.abs(data.ihsg_change).toFixed(2)}% terdeteksi. Pastikan data valid sebelum mengambil keputusan.
              </div>
            )}

            {/* Summary paragraphs */}
            {data.summary && (
              <div className="space-y-2">
                {data.summary
                  .split(/\n\n+/)
                  .map(p => p.trim())
                  .filter(p => p.length > 0)
                  .map((para, i) => (
                    <p key={i} className="text-[13px] text-gray-700 dark:text-gray-300 leading-relaxed">
                      {para}
                    </p>
                  ))}
              </div>
            )}

            {/* Gainers + Losers chips */}
            <div className="flex flex-wrap gap-1.5">
              {data.top_gainers.map(s => (
                <span
                  key={s.symbol}
                  className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-[#10B981]/10 border border-[#10B981]/25 text-[11px] font-semibold"
                >
                  <TrendingUp className="w-2.5 h-2.5 text-[#10B981] shrink-0" />
                  <span className="text-gray-700 dark:text-gray-200">{s.symbol}</span>
                  <span className="text-[#10B981]">+{s.changePercent.toFixed(2)}%</span>
                </span>
              ))}
              {data.top_losers.map(s => (
                <span
                  key={s.symbol}
                  className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-[#EF4444]/10 border border-[#EF4444]/25 text-[11px] font-semibold"
                >
                  <TrendingDown className="w-2.5 h-2.5 text-[#EF4444] shrink-0" />
                  <span className="text-gray-700 dark:text-gray-200">{s.symbol}</span>
                  <span className="text-[#EF4444]">{s.changePercent.toFixed(2)}%</span>
                </span>
              ))}
            </div>

            <p className="text-[10px] text-[#6B7280]">
              Diperbarui: {formatTimestamp(data.generated_at)} · Data pasar ~15 menit tertunda
            </p>

          </div>
        )}
      </div>
    </div>
  );
}
