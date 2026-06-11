'use client';
import { useEffect, useState } from 'react';
import { ExternalLink, Newspaper, RefreshCw, Loader2 } from 'lucide-react';
import { NewsItem } from '@/lib/types';
import { timeAgo } from '@/lib/utils';

interface Props {
  symbol: string;
  name: string;
}

export default function NewsSection({ symbol, name }: Props) {
  const [news, setNews] = useState<NewsItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);

  const load = async () => {
    setLoading(true);
    setError(false);
    try {
      const params = new URLSearchParams({ symbol, name });
      const res = await fetch(`/api/news?${params}`);
      const data = await res.json();
      setNews(data.news ?? []);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (symbol) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [symbol]);

  return (
    <div className="card overflow-hidden">
      <div className="card-header">
        <div className="flex items-center gap-2">
          <Newspaper className="w-4 h-4 text-[#00A86B]" />
          <span className="card-title">Latest News</span>
        </div>
        <button
          onClick={load}
          disabled={loading}
          className="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 disabled:opacity-50 transition-colors rounded-md hover:bg-gray-100 dark:hover:bg-gray-800"
          aria-label="Refresh news"
        >
          {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
        </button>
      </div>

      {loading && (
        <div className="p-4 space-y-4">
          {[1, 2, 3].map(i => (
            <div key={i} className="space-y-2">
              <div className="skeleton h-3.5 rounded w-full" />
              <div className="skeleton h-3.5 rounded w-4/5" />
              <div className="skeleton h-2.5 rounded w-24" />
            </div>
          ))}
        </div>
      )}

      {!loading && error && (
        <div className="px-4 py-6 text-center text-sm text-gray-400 dark:text-gray-500">
          Failed to load news.{' '}
          <button onClick={load} className="text-[#00A86B] hover:underline">Retry</button>
        </div>
      )}

      {!loading && !error && news.length === 0 && (
        <div className="px-4 py-6 text-center text-sm text-gray-400 dark:text-gray-500">
          No news found for {symbol}
        </div>
      )}

      {!loading && news.length > 0 && (
        <div className="divide-y divide-gray-100 dark:divide-gray-800 animate-fade-in">
          {news.map((item, i) => (
            <a
              key={item.id ?? i}
              href={item.url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-start gap-3 px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors group"
            >
              <div className="flex-1 min-w-0">
                <p className="text-sm text-gray-800 dark:text-gray-200 line-clamp-2 group-hover:text-[#00A86B] transition-colors leading-snug">
                  {item.title}
                </p>
                <div className="flex items-center gap-2 mt-1.5">
                  <span className="text-[11px] font-medium text-[#00A86B] bg-[#00A86B]/10 px-1.5 py-0.5 rounded truncate max-w-[120px]">
                    {item.source}
                  </span>
                  <span className="text-[11px] text-gray-400 dark:text-gray-500 whitespace-nowrap">
                    {timeAgo(item.publishedAt)}
                  </span>
                </div>
              </div>
              <ExternalLink className="w-3.5 h-3.5 text-gray-300 dark:text-gray-600 group-hover:text-[#00A86B] shrink-0 mt-0.5 transition-colors" />
            </a>
          ))}
        </div>
      )}
    </div>
  );
}
