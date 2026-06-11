'use client';
import { useState } from 'react';
import { Sparkles, RefreshCw, Loader2, ChevronDown, ChevronUp } from 'lucide-react';
import { StockData, AIAnalysis as AIAnalysisType } from '@/lib/types';

interface Props { stockData: StockData; }

const SECTIONS = [
  { key: 'trend' as const,               label: 'Trend & Momentum' },
  { key: 'supportResistance' as const,    label: 'Support & Resistance' },
  { key: 'rsiMaInterpretation' as const,  label: 'RSI & Moving Averages' },
  { key: 'keyRisk' as const,              label: 'Key Risk' },
];

export default function AIAnalysis({ stockData }: Props) {
  const [analysis, setAnalysis] = useState<AIAnalysisType | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [collapsed, setCollapsed] = useState(false);

  const run = async () => {
    setLoading(true);
    setError(null);
    setCollapsed(false);
    try {
      const res = await fetch('/api/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ stockData }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Failed');
      setAnalysis(data as AIAnalysisType);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="card overflow-hidden">
      <div className="card-header">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-[#00A86B]" />
          <span className="card-title">AI Analysis</span>
          <span className="hidden sm:inline text-[10px] font-medium text-gray-400 bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded">
            Llama 3.3
          </span>
        </div>
        <div className="flex items-center gap-2">
          {analysis && !loading && (
            <button onClick={() => setCollapsed(c => !c)} className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors">
              {collapsed ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
            </button>
          )}
          <button
            onClick={run}
            disabled={loading}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-[#00A86B] hover:bg-[#009060] disabled:opacity-60 text-white text-xs font-semibold rounded-lg transition-colors"
          >
            {loading ? (
              <><Loader2 className="w-3.5 h-3.5 animate-spin" />Analyzing…</>
            ) : analysis ? (
              <><RefreshCw className="w-3.5 h-3.5" />Refresh</>
            ) : (
              <><Sparkles className="w-3.5 h-3.5" />Analyze</>
            )}
          </button>
        </div>
      </div>

      {error && (
        <div className="px-4 py-3 text-xs text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/10 border-b border-red-100 dark:border-red-800">
          {error}
        </div>
      )}

      {!analysis && !loading && !error && (
        <div className="px-4 py-8 text-center text-sm text-gray-400 dark:text-gray-500">
          Click <strong>Analyze</strong> for AI-powered technical insights on{' '}
          <span className="font-semibold text-gray-600 dark:text-gray-400">{stockData.symbol}</span>
        </div>
      )}

      {loading && (
        <div className="p-4 space-y-3">
          {[80, 95, 70, 85].map((w, i) => (
            <div key={i} className="space-y-1.5">
              <div className="skeleton h-2.5 rounded w-20" />
              <div className={`skeleton h-3 rounded w-[${w}%]`} />
              <div className="skeleton h-3 rounded w-full" />
              <div className="skeleton h-3 rounded w-3/4" />
            </div>
          ))}
        </div>
      )}

      {analysis && !collapsed && !loading && (
        <div className="divide-y divide-gray-100 dark:divide-gray-800 animate-fade-in">
          {SECTIONS.map(({ key, label }) => (
            <div key={key} className="px-4 py-3">
              <p className="metric-label mb-1.5">{label}</p>
              <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">{analysis[key]}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
