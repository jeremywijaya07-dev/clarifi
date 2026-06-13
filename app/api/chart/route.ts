import { NextRequest, NextResponse } from 'next/server';
import { PricePoint } from '@/lib/types';

type Timeframe = '1m' | '5m' | '15m' | '1H' | '1W' | '1M';

const TF_CONFIG: Record<Timeframe, { interval: string; range: string }> = {
  '1m':  { interval: '1m',  range: '7d'  },
  '5m':  { interval: '5m',  range: '60d' },
  '15m': { interval: '15m', range: '60d' },
  '1H':  { interval: '60m', range: '60d' },
  '1W':  { interval: '1wk', range: '5y'  },
  '1M':  { interval: '1mo', range: 'max' },
};

const INTRADAY = new Set<string>(['1m', '5m', '15m']);

const HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36',
  'Accept': 'application/json, */*',
  'Accept-Language': 'en-US,en;q=0.9',
  'Referer': 'https://finance.yahoo.com',
};

function toYahooSym(symbol: string): string {
  const upper = symbol.toUpperCase();
  if (upper.endsWith('.JK')) return upper;
  if (upper.endsWith(':IDX')) return upper.replace(/:IDX$/i, '') + '.JK';
  return upper;
}

function smaAt(closes: number[], i: number, period: number): number | null {
  if (i < period - 1) return null;
  const sum = closes.slice(i - period + 1, i + 1).reduce((a, b) => a + b, 0);
  return Math.round((sum / period) * 100) / 100;
}

export async function GET(request: NextRequest) {
  const symbol    = request.nextUrl.searchParams.get('symbol') ?? '';
  const timeframe = (request.nextUrl.searchParams.get('timeframe') ?? '') as Timeframe;

  if (!symbol)    return NextResponse.json({ error: 'symbol required' }, { status: 400 });
  if (!TF_CONFIG[timeframe]) {
    return NextResponse.json({ error: `Unknown timeframe: ${timeframe}` }, { status: 400 });
  }

  const { interval, range } = TF_CONFIG[timeframe];
  const yahooSym  = toYahooSym(symbol);
  const showSMA   = !INTRADAY.has(timeframe);
  const isIntraday = INTRADAY.has(timeframe) || timeframe === '1H';

  try {
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(yahooSym)}?interval=${interval}&range=${range}`;
    const res = await fetch(url, { headers: HEADERS, signal: AbortSignal.timeout(12000) });
    if (!res.ok) throw new Error(`Yahoo returned HTTP ${res.status}`);

    const json  = await res.json();
    const result = json?.chart?.result?.[0];
    if (!result) {
      const errMsg = json?.chart?.error?.description ?? `No chart data for ${symbol}`;
      throw new Error(errMsg);
    }

    const meta:       Record<string, unknown> = result.meta ?? {};
    const rawClose:   (number | null)[]       = result.indicators?.quote?.[0]?.close ?? [];
    const timestamps: number[]                = result.timestamp ?? [];

    const validIdx = rawClose
      .map((c, i) => (c != null && c > 0 && timestamps[i] != null ? i : -1))
      .filter(i => i >= 0);

    if (validIdx.length === 0) throw new Error('No valid price data returned');

    const closes = validIdx.map(i => rawClose[i] as number);
    const dates  = validIdx.map(i => {
      const d = new Date(timestamps[i] * 1000);
      return isIntraday ? d.toISOString() : d.toISOString().slice(0, 10);
    });

    const points: PricePoint[] = closes.map((close, i) => ({
      date:  dates[i],
      close: Math.round(close * 100) / 100,
      sma20: showSMA ? smaAt(closes, i, 20) : null,
      sma50: showSMA ? smaAt(closes, i, 50) : null,
    }));

    return NextResponse.json({
      points,
      timeframe,
      showSMA,
      currency: (meta.currency as string | undefined) ?? 'USD',
    });

  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Failed to fetch chart data';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
