'use client';
import { useState, useEffect } from 'react';
import { Sparkles, ChevronDown, ChevronUp, TrendingUp, TrendingDown } from 'lucide-react';
import type { MarketSummaryData } from '@/app/api/market-summary/route';

function timeAgo(iso: string): string {
  const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (diff < 1) return 'baru saja';
  if (diff < 60) return `${diff} menit lalu`;
  return `${Math.floor(diff / 60)} jam lalu`;
}

function SkeletonCard() {
  return (
    <div className="max-w-[680px] mx-auto mb-4">
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
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    fetch('/api/market-summary')
      .then(r => { if (!r.ok) throw new Error('fetch failed'); return r.json(); })
      .then((d: MarketSummaryData) => setData(d))
      .catch(() => { /* hide card silently */ })
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <SkeletonCard />;
  if (!data) return null;

  const up = data.ihsg_change >= 0;

  return (
    <div className="max-w-[680px] mx-auto mb-4">
      <div className="bg-white dark:bg-[#1E293B] border border-gray-200 dark:border-[#2D3748] rounded-xl shadow-sm overflow-hidden">

        {/* ── Header ── */}
        <div className="flex items-center justify-between px-4 py-2.5 border-b border-gray-100 dark:border-[#2D3748]">
          <div className="flex items-center gap-2 flex-wrap min-w-0">
            <Sparkles className="w-3.5 h-3.5 text-[#0EA5E9] shrink-0" />
            <span className="text-[11px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider shrink-0">
              Ringkasan Pasar IDX
            </span>
            {/* IHSG inline */}
            <span className="flex items-center gap-1 shrink-0">
              <span className="text-[12px] font-bold text-gray-800 dark:text-gray-200">
                {data.ihsg_price.toLocaleString('id-ID', { maximumFractionDigits: 0 })}
              </span>
              <span className={`text-[11px] font-semibold ${up ? 'text-[#10B981]' : 'text-[#EF4444]'}`}>
                {up ? '+' : ''}{data.ihsg_change.toFixed(2)}%
              </span>
            </span>
            <span className="hidden sm:inline-flex items-center gap-1 text-[10px] font-semibold text-[#0EA5E9] bg-[#0EA5E9]/10 px-1.5 py-0.5 rounded shrink-0">
              <Sparkles className="w-2.5 h-2.5" />
              AI
            </span>
          </div>
          <div className="flex items-center gap-2 shrink-0 ml-2">
            <span className="hidden sm:block text-[10px] text-gray-400 dark:text-gray-500">
              {timeAgo(data.generated_at)}
            </span>
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

          </div>
        )}
      </div>
    </div>
  );
}
