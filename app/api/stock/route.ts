import { NextRequest, NextResponse } from 'next/server';
import { StockData, PricePoint } from '@/lib/types';

// ── IDX ticker list for auto-detection ──────────────────────────────────────

const IDX_TICKERS = new Set([
  'BBCA','BBRI','BMRI','BBNI','BRIS','BREN','DCII','TPIA','AMMN',
  'GOTO','BUKA','TLKM','EXCL','ISAT','ANTM','ADRO','PTBA','ITMG',
  'PTRO','BRPT','ASII','UNVR','ICBP','INDF','KLBF','MIKA','BSDE',
  'SMRA','CTRA','JSMR','INKP','TKIM','MNCN','LPKR','MAPI','MDKA',
  'INCO','HRUM','NISP','BNGA','MAYA','MYOR','HEAL','SIDO','PWON',
  'EMTK','MTDL','ASGR','SMGR','INTP','BRMS','AVIA','PGAS','MPMX',
  'MORA','WSKT','WIKA','PTPP',
]);

// ── Shared helpers ───────────────────────────────────────────────────────────

function calcRSI(closes: number[], period = 14): number {
  if (closes.length < period + 1) return 50;
  const changes: number[] = [];
  for (let i = 1; i < closes.length; i++) changes.push(closes[i] - closes[i - 1]);
  const gains  = changes.map(c => (c > 0 ? c : 0));
  const losses = changes.map(c => (c < 0 ? Math.abs(c) : 0));
  let avgGain = gains.slice(0, period).reduce((a, b) => a + b, 0) / period;
  let avgLoss = losses.slice(0, period).reduce((a, b) => a + b, 0) / period;
  for (let i = period; i < changes.length; i++) {
    avgGain = (avgGain * (period - 1) + gains[i]) / period;
    avgLoss = (avgLoss * (period - 1) + losses[i]) / period;
  }
  if (avgLoss === 0) return 100;
  return 100 - 100 / (1 + avgGain / avgLoss);
}

function smaAt(closes: number[], i: number, period: number): number | null {
  if (i < period - 1) return null;
  return closes.slice(i - period + 1, i + 1).reduce((a, b) => a + b, 0) / period;
}

function round2(n: number) { return Math.round(n * 100) / 100; }

function parseNum(v: unknown): number | null {
  if (v === null || v === undefined) return null;
  const n = parseFloat(String(v));
  return isNaN(n) ? null : n;
}


function buildHistory(closes: number[], dates: string[]): PricePoint[] {
  return dates.map((date, i) => ({
    date,
    close: round2(closes[i]),
    sma20: (() => { const v = smaAt(closes, i, 20); return v !== null ? round2(v) : null; })(),
    sma50: (() => { const v = smaAt(closes, i, 50); return v !== null ? round2(v) : null; })(),
  }));
}

function calcChanges(closes: number[], currentPrice: number, n: number) {
  const idx1M = Math.max(0, n - 22);
  const idx3M = Math.max(0, n - 64);
  return {
    change1M: closes[idx1M] ? round2(((currentPrice - closes[idx1M]) / closes[idx1M]) * 100) : 0,
    change3M: closes[idx3M] ? round2(((currentPrice - closes[idx3M]) / closes[idx3M]) * 100) : 0,
  };
}

function calcVolMetrics(volumes: number[], currentVolume: number) {
  const recentVols = volumes.slice(-21, -1);
  const avgVolume20 = recentVols.length
    ? recentVols.reduce((a, b) => a + b, 0) / recentVols.length
    : currentVolume;
  return {
    avgVolume20: Math.round(avgVolume20),
    relativeVolume: round2(avgVolume20 > 0 ? currentVolume / avgVolume20 : 1),
  };
}

// ── FMP (Financial Modeling Prep) fundamentals ───────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function fetchFMPProfile(symbol: string): Promise<Record<string, any> | null> {
  const apiKey = process.env.FMP_API_KEY;
  if (!apiKey) return null;

  // Strip any suffix (.JK, :IDX) — FMP uses bare tickers for all exchanges
  const sym = symbol.toUpperCase().replace(/:IDX$/i, '').replace(/\.JK$/i, '');

  try {
    const res = await fetch(
      `https://financialmodelingprep.com/stable/profile?symbol=${encodeURIComponent(sym)}&apikey=${apiKey}`,
      { signal: AbortSignal.timeout(6000) },
    );
    if (!res.ok) return null;
    const data = await res.json();
    const profile = Array.isArray(data) ? data[0] : null;
    if (!profile || !profile.symbol) return null;
    return profile;
  } catch {
    return null;
  }
}

// Extract fundamentals from an FMP profile object (null-safe)
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function parseFMPFundamentals(profile: Record<string, any> | null) {
  if (!profile) return { eps: null, beta: null, sector: null, industry: null, dividendYield: null, marketCap: null, peRatio: null, bookValue: null };
  return {
    eps:           parseNum(profile.eps)              ?? null,
    beta:          parseNum(profile.beta)             ?? null,
    sector:        (profile.sector  as string | undefined) || null,
    industry:      (profile.industry as string | undefined) || null,
    dividendYield: parseNum(profile.lastDiv)          ?? null,
    marketCap:     parseNum(profile.mktCap)           ?? null,
    peRatio:       parseNum(profile.pe)               ?? null,
    bookValue:     parseNum(profile.bookValuePerShare) ?? null,
  };
}

// ── Yahoo Finance helpers ─────────────────────────────────────────────────────

const YAHOO_FETCH_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Accept': 'application/json',
  'Accept-Language': 'en-US,en;q=0.9',
  'Referer': 'https://finance.yahoo.com',
};

const YAHOO_CHART_HEADERS = {
  ...YAHOO_FETCH_HEADERS,
  'Accept': 'application/json, */*',
};

const MODULES = 'summaryDetail,defaultKeyStatistics,financialData,assetProfile';

// Try query2 → query1 v10 → query1 v11 until we get a valid result
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function fetchQuoteSummary(symbol: string): Promise<Record<string, any> | null> {
  const enc = encodeURIComponent(symbol);
  const urls = [
    `https://query2.finance.yahoo.com/v10/finance/quoteSummary/${enc}?modules=${MODULES}`,
    `https://query1.finance.yahoo.com/v10/finance/quoteSummary/${enc}?modules=${MODULES}`,
    `https://query1.finance.yahoo.com/v11/finance/quoteSummary/${enc}?modules=${MODULES}`,
  ];

  for (const url of urls) {
    try {
      const res = await fetch(url, {
        headers: YAHOO_FETCH_HEADERS,
        signal: AbortSignal.timeout(6000),
      });
      if (!res.ok) continue;
      const json = await res.json();
      const result = json?.quoteSummary?.result?.[0];
      if (result && Object.keys(result).length > 0) return result;
    } catch {
      // try next URL
    }
  }
  return null;
}

// Convert any IDX format (BBRI:IDX or bare BBRI) to Yahoo .JK symbol
function toYahooSym(symbol: string): string {
  return symbol.toUpperCase().replace(/:IDX$/i, '') + '.JK';
}

// ── Yahoo Finance (IDX stocks) ────────────────────────────────────────────────

async function fetchYahooStock(origSymbol: string): Promise<StockData> {
  const yahooSym   = toYahooSym(origSymbol);
  const displaySym = origSymbol.toUpperCase();

  // For IDX stocks: Yahoo Finance handles both price chart AND fundamentals.
  // FMP does not carry Indonesian exchange data, so we skip it here.
  const [chartRes, qs] = await Promise.all([
    fetch(
      `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(yahooSym)}?interval=1d&range=3mo`,
      { headers: YAHOO_CHART_HEADERS },
    ),
    fetchQuoteSummary(yahooSym),
  ]);

  if (!chartRes.ok) throw new Error(`Yahoo Finance returned ${chartRes.status} for ${yahooSym}`);

  const chartJson = await chartRes.json();
  const result = chartJson?.chart?.result?.[0];
  if (!result) {
    throw new Error(chartJson?.chart?.error?.description ?? `No data for ${origSymbol}`);
  }

  const meta     = result.meta ?? {};
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const rawQuote = result.indicators?.quote?.[0] as Record<string, any[]>;
  const timestamps: number[] = result.timestamp ?? [];

  const rawCloses:  (number | null)[] = rawQuote?.close  ?? [];
  const rawVolumes: (number | null)[] = rawQuote?.volume ?? [];

  const validIdxs = rawCloses
    .map((c, i) => (c != null && c > 0 && timestamps[i] != null ? i : -1))
    .filter(i => i >= 0);

  if (validIdxs.length === 0) throw new Error(`No valid price data for ${origSymbol}`);

  const closes  = validIdxs.map(i => rawCloses[i] as number);
  const volumes = validIdxs.map(i => (rawVolumes[i] as number | null) ?? 0);
  const dates   = validIdxs.map(i => new Date(timestamps[i] * 1000).toISOString().slice(0, 10));

  const n             = closes.length;
  const currentPrice  = round2(meta.regularMarketPrice ?? closes[n - 1]);
  const todayDate     = new Date().toISOString().slice(0, 10);
  const prevClose     = dates[n - 1] === todayDate
    ? (closes[n - 2] ?? currentPrice)
    : (closes[n - 1] ?? currentPrice);
  const dailyChange   = round2(currentPrice - prevClose);
  const changePercent = round2(prevClose > 0 ? ((currentPrice - prevClose) / prevClose) * 100 : 0);
  const currentVolume = Math.round(meta.regularMarketVolume ?? volumes[n - 1] ?? 0);

  const rsi14    = round2(calcRSI(closes));
  const sma20val = smaAt(closes, n - 1, 20) ?? currentPrice;
  const sma50val = smaAt(closes, n - 1, 50) ?? currentPrice;

  const priceHistory               = buildHistory(closes, dates);
  const { change1M, change3M }     = calcChanges(closes, currentPrice, n);
  const { avgVolume20, relativeVolume } = calcVolMetrics(volumes, currentVolume);

  const last20  = closes.slice(-20);
  const high20d = round2(Math.max(...last20));
  const low20d  = round2(Math.min(...last20));

  // Yahoo quoteSummary is the sole fundamentals source for IDX stocks.
  // Values come back as { raw: number, fmt: string } objects — use .raw directly.
  const eps          = qs?.financialData?.epsTrailingTwelveMonths?.raw       ?? parseNum(meta.epsTrailingTwelveMonths) ?? null;
  const beta         = qs?.defaultKeyStatistics?.beta?.raw                   ?? null;
  const sector       = (qs?.assetProfile?.sector as string | undefined)      ?? null;
  const industry     = (qs?.assetProfile?.industry as string | undefined)    ?? null;
  const dividendYield= qs?.summaryDetail?.trailingAnnualDividendYield?.raw   ?? qs?.summaryDetail?.dividendYield?.raw ?? null;
  const marketCap    = qs?.summaryDetail?.marketCap?.raw                     ?? parseNum(meta.marketCap) ?? null;
  const peRatio      = qs?.summaryDetail?.trailingPE?.raw                    ?? qs?.defaultKeyStatistics?.trailingPE?.raw ?? parseNum(meta.trailingPE) ?? null;
  const bookValue    = qs?.defaultKeyStatistics?.bookValue?.raw              ?? null;

  console.log('Fundamentals parsed (IDX):', { source: qs ? 'Yahoo quoteSummary' : 'chart meta only', eps, beta, sector, dividendYield, bookValue });

  return {
    symbol:        displaySym,
    name:          meta.shortName ?? meta.longName ?? yahooSym,
    exchange:      meta.fullExchangeName ?? meta.exchangeName ?? 'IDX',
    currency:      meta.currency ?? 'IDR',
    price:         currentPrice,
    change:        dailyChange,
    changePercent,
    change1M,
    change3M,
    rsi14,
    sma20:         round2(sma20val),
    sma50:         round2(sma50val),
    volume:        currentVolume,
    avgVolume20,
    relativeVolume,
    marketCap,
    peRatio,
    eps,
    beta,
    dividendYield,
    sector,
    industry,
    high52w:       round2(qs?.summaryDetail?.fiftyTwoWeekHigh?.raw ?? meta.fiftyTwoWeekHigh ?? 0),
    low52w:        round2(qs?.summaryDetail?.fiftyTwoWeekLow?.raw  ?? meta.fiftyTwoWeekLow  ?? 0),
    high20d,
    low20d,
    bookValue,
    priceHistory,
  };
}

// ── Twelve Data (US stocks) ───────────────────────────────────────────────────

async function fetchTwelveDataStock(symbol: string, apiKey: string): Promise<StockData> {
  const sym = encodeURIComponent(symbol);

  // Fetch price data and FMP fundamentals in parallel; drop Yahoo quoteSummary
  const [quoteRes, tsRes, statsRes, fmpProfile] = await Promise.all([
    fetch(`https://api.twelvedata.com/quote?symbol=${sym}&apikey=${apiKey}`),
    fetch(`https://api.twelvedata.com/time_series?symbol=${sym}&interval=1day&outputsize=90&apikey=${apiKey}`),
    fetch(`https://api.twelvedata.com/statistics?symbol=${sym}&apikey=${apiKey}`),
    fetchFMPProfile(symbol),
  ]);

  const [quote, ts, stats] = await Promise.all([
    quoteRes.json(),
    tsRes.json(),
    statsRes.json(),
  ]);

  if (quote.status === 'error' || !quote.close) {
    throw new Error(quote.message ?? `Symbol not found: ${symbol}`);
  }
  if (!ts.values?.length) throw new Error('No historical data available');

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const values  = [...ts.values].reverse() as any[];
  const closes  = values.map(v => parseFloat(v.close));
  const volumes = values.map(v => parseFloat(v.volume));
  const dates   = values.map(v => (v.datetime as string).slice(0, 10));

  const n            = closes.length;
  const currentPrice = parseFloat(quote.close);

  const rsi14    = round2(calcRSI(closes));
  const sma20val = smaAt(closes, n - 1, 20) ?? currentPrice;
  const sma50val = smaAt(closes, n - 1, 50) ?? currentPrice;

  const priceHistory = buildHistory(closes, dates);
  const { change1M, change3M } = calcChanges(closes, currentPrice, n);

  const currentVolume = volumes[n - 1] || parseFloat(quote.volume ?? '0');
  const { avgVolume20, relativeVolume } = calcVolMetrics(volumes, currentVolume);
  const last20 = closes.slice(-20);

  // FMP is primary; TwelveData stats are fallback
  const fmp      = parseFMPFundamentals(fmpProfile);
  const statsObj = stats?.statistics ?? {};
  const val      = statsObj?.valuations_metrics         ?? {};
  const earn     = statsObj?.earnings_and_dividend_info ?? {};
  const stkStats = statsObj?.stock_statistics           ?? {};
  const tdDivYield = parseNum(earn?.forward_annual_dividend_yield ?? earn?.trailing_annual_dividend_yield ?? null);

  const eps          = fmp.eps           ?? parseNum(earn?.diluted_eps_ttm ?? earn?.basic_eps_ttm) ?? null;
  const beta         = fmp.beta          ?? parseNum(stkStats?.beta)                               ?? null;
  const sector       = fmp.sector        ?? (quote.sector as string | undefined)                   ?? null;
  const industry     = fmp.industry      ?? null;
  const dividendYield= fmp.dividendYield ?? tdDivYield                                             ?? null;
  const bookValue    = fmp.bookValue     ?? null;
  const marketCap    = fmp.marketCap     ?? parseNum(val?.market_capitalization)                   ?? null;
  const peRatio      = fmp.peRatio       ?? parseNum(val?.trailing_pe ?? val?.pe_ratio)            ?? null;

  console.log('Fundamentals parsed (US):', { source: fmpProfile ? 'FMP' : 'TwelveData', eps, beta, sector, dividendYield, bookValue });

  return {
    symbol:        quote.symbol ?? symbol,
    name:          quote.name   ?? symbol,
    exchange:      quote.exchange ?? '',
    currency:      quote.currency ?? 'USD',
    price:         currentPrice,
    change:        parseFloat(quote.change         ?? '0'),
    changePercent: parseFloat(quote.percent_change ?? '0'),
    change1M,
    change3M,
    rsi14,
    sma20:         round2(sma20val),
    sma50:         round2(sma50val),
    volume:        Math.round(currentVolume),
    avgVolume20,
    relativeVolume,
    marketCap,
    peRatio,
    eps,
    beta,
    dividendYield,
    sector,
    industry,
    high52w:       parseNum(quote.fifty_two_week?.high) ?? 0,
    low52w:        parseNum(quote.fifty_two_week?.low)  ?? 0,
    high20d:       round2(Math.max(...last20)),
    low20d:        round2(Math.min(...last20)),
    bookValue,
    priceHistory,
  };
}

// ── Route handler ─────────────────────────────────────────────────────────────

export async function GET(request: NextRequest) {
  const symbol = request.nextUrl.searchParams.get('symbol');
  if (!symbol) return NextResponse.json({ error: 'Symbol is required' }, { status: 400 });

  // Normalize: bare IDX tickers → :IDX suffix
  let normalized = symbol.trim().toUpperCase();
  if (!normalized.endsWith(':IDX') && IDX_TICKERS.has(normalized)) {
    normalized = normalized + ':IDX';
  }

  const isIDX = normalized.endsWith(':IDX');

  if (!isIDX && !process.env.TWELVE_DATA_API_KEY) {
    return NextResponse.json({ error: 'TWELVE_DATA_API_KEY not configured' }, { status: 500 });
  }

  try {
    let stockData: StockData;

    if (isIDX) {
      stockData = await fetchYahooStock(normalized);
    } else {
      // Try US via TwelveData; if that fails, attempt IDX as fallback
      try {
        stockData = await fetchTwelveDataStock(normalized, process.env.TWELVE_DATA_API_KEY ?? '');
      } catch (usErr) {
        try {
          stockData = await fetchYahooStock(normalized + ':IDX');
        } catch {
          throw usErr;
        }
      }
    }

    return NextResponse.json(stockData);
  } catch (err) {
    console.error('Stock API error:', err);
    const msg = err instanceof Error ? err.message : 'Failed to fetch stock data';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
