'use client';
import { useState, useEffect, useCallback } from 'react';
import { Newspaper, ExternalLink, RefreshCw, Loader2 } from 'lucide-react';
import { NewsItem } from '@/lib/types';
import { timeAgo } from '@/lib/utils';

type SectorKey =
  | 'all' | 'banking' | 'tech' | 'energy'
  | 'consumer' | 'property' | 'health' | 'telecom' | 'industry';

const SECTORS: { key: SectorKey; label: string; tickers?: string }[] = [
  { key: 'all',      label: 'Semua' },
  { key: 'banking',  label: 'Perbankan & Keuangan', tickers: 'BBCA, BBRI, BMRI' },
  { key: 'tech',     label: 'Teknologi & Digital',  tickers: 'GOTO, BUKA, ARTO' },
  { key: 'energy',   label: 'Energi & Tambang',     tickers: 'ADRO, PTBA, ANTM' },
  { key: 'consumer', label: 'Consumer & Retail',    tickers: 'UNVR, ICBP, AMRT' },
  { key: 'property', label: 'Properti',             tickers: 'BSDE, CTRA, PWON' },
  { key: 'health',   label: 'Kesehatan',            tickers: 'KLBF, MIKA, HEAL' },
  { key: 'telecom',  label: 'Telekomunikasi',       tickers: 'TLKM, EXCL, ISAT' },
  { key: 'industry', label: 'Industri & Manufaktur',tickers: 'ASII, SMGR, INTP' },
];

const AUTO_REFRESH_MS = 5 * 60 * 1000;

function NewsSkeleton() {
  return (
    <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 divide-y divide-gray-100 dark:divide-gray-800">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="px-4 py-3.5 space-y-2 animate-pulse">
          <div className="h-3.5 bg-gray-200 dark:bg-gray-800 rounded w-full" />
          <div className="h-3.5 bg-gray-200 dark:bg-gray-800 rounded w-4/5" />
          <div className="h-2.5 bg-gray-200 dark:bg-gray-800 rounded w-28 mt-1" />
        </div>
      ))}
    </div>
  );
}

export default function NewsPage() {
  const [sector, setSector] = useState<SectorKey>('all');
  const [news, setNews] = useState<NewsItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);

  const load = useCallback(async (s: SectorKey) => {
    setLoading(true);
    setError(false);
    try {
      const res = await fetch(`/api/news?sector=${s}`);
      const data = await res.json();
      setNews(data.news ?? []);
      setLastUpdated(new Date().toISOString());
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load(sector);
    const interval = setInterval(() => load(sector), AUTO_REFRESH_MS);
    return () => clearInterval(interval);
  }, [sector, load]);

  return (
    <div className="min-h-screen bg-[#F8FAFC] dark:bg-[#0A0F1E]">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-6">

        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div>
            <h1 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <Newspaper className="w-5 h-5 text-[#1D9E75]" />
              Market News
            </h1>
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
              {lastUpdated
                ? `Updated ${timeAgo(lastUpdated)} · Auto-refresh setiap 5 menit`
                : 'Berita pasar saham Indonesia'}
            </p>
          </div>
          <button
            onClick={() => load(sector)}
            disabled={loading}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium border border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400 hover:border-[#1D9E75] hover:text-[#1D9E75] dark:hover:text-[#1D9E75] rounded-lg transition-colors disabled:opacity-50 shrink-0"
          >
            {loading
              ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
              : <RefreshCw className="w-3.5 h-3.5" />}
            Refresh
          </button>
        </div>

        {/* Sector chips */}
        <div className="flex gap-2 overflow-x-auto pb-2 mb-1 scrollbar-hide">
          {SECTORS.map(({ key, label, tickers }) => (
            <button
              key={key}
              onClick={() => setSector(key)}
              className={`shrink-0 px-3 py-1.5 text-xs font-semibold rounded-full border transition-colors whitespace-nowrap ${
                sector === key
                  ? 'bg-[#1D9E75] text-white border-[#1D9E75]'
                  : 'bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400 hover:border-[#1D9E75] hover:text-[#1D9E75] dark:hover:text-[#1D9E75]'
              }`}
            >
              {label}
              {tickers && (
                <span className={`ml-1.5 text-[10px] font-normal ${sector === key ? 'text-white/75' : 'text-gray-400 dark:text-gray-500'}`}>
                  {tickers}
                </span>
              )}
            </button>
          ))}
        </div>
        <p className="text-[11px] text-gray-400 dark:text-gray-600 mb-5">
          Berita difilter berdasarkan kata kunci sektor · beberapa artikel mungkin muncul di beberapa tab
        </p>

        {/* Loading (first load) */}
        {loading && news.length === 0 && <NewsSkeleton />}

        {/* Error */}
        {!loading && error && (
          <div className="text-center py-12 text-sm text-gray-400 dark:text-gray-500">
            Gagal memuat berita.{' '}
            <button
              onClick={() => load(sector)}
              className="text-[#1D9E75] hover:underline"
            >
              Coba lagi
            </button>
          </div>
        )}

        {/* Empty */}
        {!loading && !error && news.length === 0 && (
          <div className="text-center py-12 text-sm text-gray-400 dark:text-gray-500">
            Tidak ada berita ditemukan untuk sektor ini.
          </div>
        )}

        {/* News list */}
        {news.length > 0 && (
          <div
            className={`bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 overflow-hidden transition-opacity ${
              loading ? 'opacity-60' : 'opacity-100'
            }`}
          >
            <div className="divide-y divide-gray-100 dark:divide-gray-800">
              {news.map((item, i) => (
                <a
                  key={item.id ?? i}
                  href={item.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-start gap-3 px-4 py-3.5 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors group"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-gray-800 dark:text-gray-200 line-clamp-2 group-hover:text-[#1D9E75] transition-colors leading-snug">
                      {item.title}
                    </p>
                    <div className="flex items-center gap-2 mt-1.5">
                      <span className="text-[11px] font-medium text-[#1D9E75] bg-[#1D9E75]/10 px-1.5 py-0.5 rounded truncate max-w-[150px]">
                        {item.source}
                      </span>
                      <span className="text-[11px] text-gray-400 dark:text-gray-500 whitespace-nowrap">
                        {timeAgo(item.publishedAt)}
                      </span>
                    </div>
                  </div>
                  <ExternalLink className="w-3.5 h-3.5 text-gray-300 dark:text-gray-600 group-hover:text-[#1D9E75] shrink-0 mt-0.5 transition-colors" />
                </a>
              ))}
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
