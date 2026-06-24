import { NextResponse } from 'next/server';
import Groq from 'groq-sdk';

const MODEL = 'llama-3.3-70b-versatile';

const IDX_STOCKS = [
  { symbol: 'BBCA',  name: 'Bank BCA',           sector: 'Perbankan' },
  { symbol: 'BBRI',  name: 'Bank BRI',            sector: 'Perbankan' },
  { symbol: 'BMRI',  name: 'Bank Mandiri',         sector: 'Perbankan' },
  { symbol: 'TLKM',  name: 'Telkom Indonesia',     sector: 'Telekomunikasi' },
  { symbol: 'ASII',  name: 'Astra International',  sector: 'Otomotif & Industri' },
  { symbol: 'GOTO',  name: 'GoTo Group',           sector: 'Teknologi' },
  { symbol: 'ADRO',  name: 'Adaro Energy',         sector: 'Energi Batu Bara' },
  { symbol: 'ANTM',  name: 'Aneka Tambang',        sector: 'Pertambangan' },
  { symbol: 'MDKA',  name: 'Merdeka Copper Gold',  sector: 'Pertambangan' },
  { symbol: 'AMMN',  name: 'Amman Mineral',        sector: 'Pertambangan' },
  { symbol: 'BREN',  name: 'Barito Renewables',    sector: 'Energi Terbarukan' },
  { symbol: 'TPIA',  name: 'Chandra Asri',         sector: 'Kimia' },
  { symbol: 'UNVR',  name: 'Unilever Indonesia',   sector: 'Konsumer' },
  { symbol: 'ICBP',  name: 'Indofood CBP',         sector: 'Konsumer' },
  { symbol: 'BSDE',  name: 'BSD City',             sector: 'Properti' },
  { symbol: 'CTRA',  name: 'Ciputra Development',  sector: 'Properti' },
  { symbol: 'KLBF',  name: 'Kalbe Farma',          sector: 'Kesehatan' },
  { symbol: 'PGAS',  name: 'Perusahaan Gas Negara', sector: 'Energi' },
  { symbol: 'SMGR',  name: 'Semen Indonesia',      sector: 'Industri' },
  { symbol: 'INDF',  name: 'Indofood Sukses',      sector: 'Konsumer' },
];

const YAHOO_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Accept': 'application/json, */*',
  'Accept-Language': 'en-US,en;q=0.9',
  'Referer': 'https://finance.yahoo.com',
};

export interface StockQuote {
  symbol: string;
  name: string;
  sector: string;
  price: number;
  changePercent: number;
}

export interface MarketSummaryData {
  summary: string;
  ihsg_price: number;
  ihsg_change: number;
  top_gainers: StockQuote[];
  top_losers: StockQuote[];
  generated_at: string;
}

// Module-level in-memory cache
let _cache: { data: MarketSummaryData; expiresAt: number } | null = null;

async function fetchYahooQuote(yahooSym: string): Promise<{ price: number; changePercent: number } | null> {
  try {
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(yahooSym)}?interval=1d&range=5d`;
    const res = await fetch(url, {
      headers: YAHOO_HEADERS,
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return null;

    const json = await res.json();
    const meta = json?.chart?.result?.[0]?.meta;
    if (!meta?.regularMarketPrice) return null;

    // Prefer Yahoo's own daily change percent; fall back to close-diff calculation
    let changePercent: number = meta.regularMarketChangePercent ?? 0;

    if (meta.regularMarketChangePercent == null) {
      const closes: (number | null)[] = json?.chart?.result?.[0]?.indicators?.quote?.[0]?.close ?? [];
      const valid = closes.filter((c): c is number => c != null && c > 0);
      if (valid.length >= 2) {
        const prev = valid[valid.length - 2];
        changePercent = ((meta.regularMarketPrice - prev) / prev) * 100;
      }
    }

    return {
      price: meta.regularMarketPrice,
      changePercent: Math.round(changePercent * 100) / 100,
    };
  } catch {
    return null;
  }
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const forceRefresh = searchParams.get('force') === '1';

  // Serve from cache if still fresh (unless force-refresh requested)
  if (!forceRefresh && _cache && _cache.expiresAt > Date.now()) {
    return NextResponse.json(_cache.data);
  }

  try {
    // Fetch IHSG and all 20 stocks in parallel
    const [ihsgResult, ...stockResults] = await Promise.all([
      fetchYahooQuote('^JKSE'),
      ...IDX_STOCKS.map(s => fetchYahooQuote(`${s.symbol}.JK`)),
    ]);

    if (!ihsgResult) {
      return NextResponse.json({ error: 'IHSG data unavailable' }, { status: 502 });
    }

    // Build valid quotes array
    const quotes: StockQuote[] = IDX_STOCKS.flatMap((s, i) => {
      const q = stockResults[i];
      if (!q) return [];
      return [{ symbol: s.symbol, name: s.name, sector: s.sector, price: q.price, changePercent: q.changePercent }];
    });

    const sorted = [...quotes].sort((a, b) => b.changePercent - a.changePercent);
    const top_gainers = sorted.slice(0, 3);
    const top_losers  = sorted.slice(-3).reverse();

    // Build Groq prompt
    const fmt = (s: StockQuote) =>
      `${s.symbol} (${s.sector}): ${s.changePercent >= 0 ? '+' : ''}${s.changePercent.toFixed(2)}%`;

    const prompt = [
      `Data pasar IDX hari ini (${new Date().toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}):`,
      `IHSG: ${ihsgResult.price.toLocaleString('id-ID', { maximumFractionDigits: 0 })} (${ihsgResult.changePercent >= 0 ? '+' : ''}${ihsgResult.changePercent.toFixed(2)}%)`,
      `Top Gainers: ${top_gainers.map(fmt).join(' | ')}`,
      `Top Losers:  ${top_losers.map(fmt).join(' | ')}`,
      `Semua data: ${quotes.map(fmt).join(', ')}`,
    ].join('\n');

    const apiKey = process.env.GROQ_API_KEY;
    let summary = '';

    if (apiKey) {
      const client = new Groq({ apiKey });
      const completion = await client.chat.completions.create({
        model: MODEL,
        messages: [
          {
            role: 'system',
            content:
              'Kamu adalah analis pasar modal Indonesia. Buat ringkasan kondisi pasar IDX hari ini dalam 2-3 paragraf singkat dalam Bahasa Indonesia. Gunakan data yang diberikan — sebutkan level IHSG, % change, top gainers dan losers dengan angka konkret, dan berikan insight singkat tentang sentimen pasar. Jangan mengarang data yang tidak ada. Tulis teks biasa tanpa bullet point atau markdown.',
          },
          { role: 'user', content: prompt },
        ],
        max_tokens: 600,
        temperature: 0.3,
      });
      summary = (completion.choices[0]?.message?.content ?? '').trim();
    }

    const data: MarketSummaryData = {
      summary,
      ihsg_price:  ihsgResult.price,
      ihsg_change: ihsgResult.changePercent,
      top_gainers,
      top_losers,
      generated_at: new Date().toISOString(),
    };

    // Cache for 60 minutes
    _cache = { data, expiresAt: Date.now() + 60 * 60 * 1000 };

    return NextResponse.json(data);
  } catch (err) {
    console.error('[market-summary]', err);
    return NextResponse.json({ error: 'Failed to generate market summary' }, { status: 500 });
  }
}
