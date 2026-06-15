'use client';
import { useState } from 'react';
import { Sparkles, RefreshCw, Loader2, ChevronDown, ChevronUp } from 'lucide-react';
import { StockData, AIAnalysis as AIAnalysisType } from '@/lib/types';
import { useLanguage } from '@/lib/useLanguage';

function fmtBadgePrice(n: number, currency: string): string {
  if (!n || n <= 0) return 'N/A';
  if (currency === 'IDR') return `Rp${Math.round(n).toLocaleString('id-ID')}`;
  return `$${n.toFixed(2)}`;
}

function fmtBadgePct(n: number): string {
  return `${n >= 0 ? '+' : ''}${n.toFixed(2)}%`;
}

function getSectionBadges(key: typeof SECTION_KEYS[number], stock: StockData): string[] {
  const p = (n: number) => fmtBadgePrice(n, stock.currency);
  switch (key) {
    case 'trend':
      return [
        `1M: ${fmtBadgePct(stock.change1M)}`,
        `3M: ${fmtBadgePct(stock.change3M)}`,
        `SMA20: ${p(stock.sma20)}`,
        `SMA50: ${p(stock.sma50)}`,
      ];
    case 'supportResistance':
      return [
        `Support 20D: ${p(stock.low20d)}`,
        `Resistance 20D: ${p(stock.high20d)}`,
        `52W Low: ${p(stock.low52w)}`,
        `52W High: ${p(stock.high52w)}`,
      ];
    case 'rsiMaInterpretation':
      return [
        `RSI: ${stock.rsi14.toFixed(1)}`,
        `SMA20: ${p(stock.sma20)}`,
        `SMA50: ${p(stock.sma50)}`,
      ];
    case 'keyRisk':
      return [
        `RSI: ${stock.rsi14.toFixed(1)}`,
        `RelVol: ${stock.relativeVolume.toFixed(2)}x`,
        ...(stock.beta != null ? [`Beta: ${stock.beta.toFixed(2)}`] : []),
      ];
  }
}

interface Props { stockData: StockData; }

const BULLISH_WORDS = [
  'bullish', 'positive', 'upside', 'outperform', 'strong momentum', 'uptrend',
  'opportunity', 'growth', 'recommend', 'worth considering', 'buy',
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
  bullish: { bg: 'bg-[#10B981]/15', text: 'text-[#10B981]', border: 'border-[#10B981]/30' },
  bearish: { bg: 'bg-[#EF4444]/10', text: 'text-[#EF4444]', border: 'border-[#EF4444]/30' },
  neutral: { bg: 'bg-yellow-500/10', text: 'text-yellow-500', border: 'border-yellow-500/30' },
};

const T = {
  en: {
    title: 'AI Analysis',
    analyze: 'Analyze',
    analyzing: 'Analyzing…',
    refresh: 'Refresh',
    empty: (sym: string) => <>Click <strong>Analyze</strong> for AI-powered technical insights on <span className="font-semibold text-gray-600 dark:text-gray-400">{sym}</span></>,
    sections: {
      trend:               'Trend & Momentum',
      supportResistance:   'Support & Resistance',
      rsiMaInterpretation: 'RSI & Moving Averages',
      keyRisk:             'Key Risk',
    },
    badge: { bullish: 'Worth Considering', bearish: 'Caution', neutral: 'Neutral' },
    dataUsed: 'Data used',
    langBtn: '🇺🇸 EN',
  },
  id: {
    title: 'Analisis AI',
    analyze: 'Analisis',
    analyzing: 'Menganalisis…',
    refresh: 'Refresh',
    empty: (sym: string) => <>Klik <strong>Analisis</strong> untuk insight teknikal AI pada <span className="font-semibold text-gray-600 dark:text-gray-400">{sym}</span></>,
    sections: {
      trend:               'Tren & Momentum',
      supportResistance:   'Support & Resistance',
      rsiMaInterpretation: 'RSI & Moving Average',
      keyRisk:             'Risiko Utama',
    },
    badge: { bullish: 'Layak Dipertimbangkan', bearish: 'Hati-hati', neutral: 'Netral' },
    dataUsed: 'Data digunakan',
    langBtn: '🇮🇩 ID',
  },
};

const SECTION_KEYS = [
  'trend', 'supportResistance', 'rsiMaInterpretation', 'keyRisk',
] as const;

export default function AIAnalysis({ stockData }: Props) {
  const [analysis, setAnalysis] = useState<AIAnalysisType | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [collapsed, setCollapsed] = useState(false);
  const [lang, setLang] = useLanguage();

  const t = T[lang];

  const run = async () => {
    setLoading(true);
    setError(null);
    setCollapsed(false);
    try {
      const res = await fetch('/api/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ stockData, language: lang }),
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

  const sentiment = analysis
    ? parseSentiment(`${analysis.trend} ${analysis.supportResistance} ${analysis.rsiMaInterpretation} ${analysis.keyRisk}`)
    : null;
  const sentimentCfg = sentiment ? SENTIMENT_CFG[sentiment] : null;
  const badgeLabel   = sentiment ? t.badge[sentiment] : null;

  return (
    <div className="card overflow-hidden">
      <div className="card-header">
        <div className="flex items-center gap-2 flex-wrap">
          <Sparkles className="w-4 h-4 text-[#0EA5E9]" />
          <span className="card-title">{t.title}</span>
          <span className="hidden sm:inline text-[10px] font-medium text-gray-400 bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded">
            Llama 3.3
          </span>
          {sentimentCfg && badgeLabel && !loading && (
            <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${sentimentCfg.bg} ${sentimentCfg.text} ${sentimentCfg.border}`}>
              {badgeLabel}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {/* Language toggle */}
          <button
            onClick={() => setLang(lang === 'id' ? 'en' : 'id')}
            title={lang === 'id' ? 'Switch to English' : 'Ganti ke Indonesia'}
            className="text-[11px] font-semibold px-2 py-1 rounded-lg border border-gray-200 dark:border-[#2D3748] text-gray-500 dark:text-gray-400 hover:border-[#0EA5E9] hover:text-[#0EA5E9] transition-colors"
          >
            {t.langBtn}
          </button>
          {analysis && !loading && (
            <button
              onClick={() => setCollapsed(c => !c)}
              className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
            >
              {collapsed ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
            </button>
          )}
          <button
            onClick={run}
            disabled={loading}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-[#0EA5E9] hover:bg-[#0284C7] disabled:opacity-60 text-white text-xs font-semibold rounded-lg transition-colors"
          >
            {loading ? (
              <><Loader2 className="w-3.5 h-3.5 animate-spin" />{t.analyzing}</>
            ) : analysis ? (
              <><RefreshCw className="w-3.5 h-3.5" />{t.refresh}</>
            ) : (
              <><Sparkles className="w-3.5 h-3.5" />{t.analyze}</>
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
          {t.empty(stockData.symbol)}
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
          {SECTION_KEYS.map(key => {
            const badges = getSectionBadges(key, stockData);
            return (
              <div key={key} className="px-4 py-3">
                <p className="metric-label mb-1.5">{t.sections[key]}</p>
                <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">{analysis[key]}</p>
                <div className="mt-2 flex flex-wrap items-center gap-1">
                  <span className="text-[10px] text-gray-400 dark:text-gray-500 mr-0.5">{t.dataUsed}:</span>
                  {badges.map((badge, i) => (
                    <span key={i} className="inline-flex items-center text-[10px] font-mono px-1.5 py-0.5 rounded bg-gray-100 dark:bg-gray-700/60 text-gray-500 dark:text-gray-400">
                      {badge}
                    </span>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
