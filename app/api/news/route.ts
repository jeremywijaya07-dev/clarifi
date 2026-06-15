import { NextRequest, NextResponse } from 'next/server';
import xml2js from 'xml2js';
import { NewsItem } from '@/lib/types';

const HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Accept': 'application/rss+xml, application/xml, text/xml, */*',
};

const SECTOR_QUERIES: Record<string, { en: string; id: string }> = {
  all:      { en: 'IHSG Indonesia stock market today',                         id: 'IHSG saham Indonesia hari ini bursa efek' },
  banking:  { en: 'Indonesia bank stocks BCA BRI Mandiri BBNI finance',        id: 'saham perbankan Indonesia BCA BRI Mandiri BBNI' },
  tech:     { en: 'Indonesia technology digital stocks GOTO DCII BUKA',        id: 'saham teknologi digital Indonesia GOTO DCII Bukalapak' },
  energy:   { en: 'Indonesia mining coal energy ADRO ITMG PTBA ANTM nickel',   id: 'saham tambang energi batubara Indonesia ADRO ITMG PTBA nikel' },
  consumer: { en: 'Indonesia consumer goods retail UNVR MYOR ICBP INDF',       id: 'saham consumer retail Indonesia UNVR Mayora Indofood ICBP' },
  property: { en: 'Indonesia property real estate BSDE SMRA CTRA PWON',        id: 'saham properti Indonesia BSDE Summarecon Ciputra PWON' },
  health:   { en: 'Indonesia healthcare hospital MIKA KLBF HEAL Kalbe',        id: 'saham kesehatan rumah sakit Indonesia Kalbe Mika HEAL' },
  telecom:  { en: 'Indonesia telecom TLKM EXCL ISAT telecommunications',       id: 'saham telekomunikasi Indonesia Telkom XL Indosat ISAT' },
  industry: { en: 'Indonesia industrial manufacturing ASII SMGR INTP Astra',   id: 'saham industri manufaktur Indonesia Astra Semen SMGR INTP' },
};

function isIDX(symbol: string) {
  return symbol.toUpperCase().endsWith(':IDX');
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function parseItem(item: any, index: number): NewsItem {
  const rawTitle = String(item.title ?? '');
  // Google News format: "Article Title - Source Name"
  const lastDash = rawTitle.lastIndexOf(' - ');
  const title = lastDash > 0 ? rawTitle.slice(0, lastDash).trim() : rawTitle;
  const sourceFromTitle = lastDash > 0 ? rawTitle.slice(lastDash + 3).trim() : '';
  const sourceEl = item.source;
  const source =
    typeof sourceEl === 'object' && sourceEl !== null
      ? String(sourceEl._ ?? sourceEl['$']?.url ?? sourceFromTitle)
      : String((sourceEl ?? sourceFromTitle) || 'Google News');

  return {
    id: String(index),
    title,
    url: String(item.link ?? '#'),
    source: source.slice(0, 40),
    publishedAt: String(item.pubDate ?? ''),
    summary: '',
  };
}

async function fetchRSS(query: string, lang: string, country: string): Promise<NewsItem[]> {
  try {
    const url = `https://news.google.com/rss/search?q=${encodeURIComponent(query)}&hl=${lang}&gl=${country}&ceid=${country}:${lang}`;
    const res = await fetch(url, { headers: HEADERS, signal: AbortSignal.timeout(8000) });
    if (!res.ok) return [];
    const xml = await res.text();

    const parsed = await xml2js.parseStringPromise(xml, {
      explicitArray: false,
      trim: true,
    });

    const rawItems = parsed?.rss?.channel?.item;
    if (!rawItems) return [];
    const items = Array.isArray(rawItems) ? rawItems : [rawItems];
    return items.slice(0, 8).map(parseItem);
  } catch {
    return [];
  }
}

export async function GET(request: NextRequest) {
  const symbol = request.nextUrl.searchParams.get('symbol') ?? '';
  const sector = request.nextUrl.searchParams.get('sector') ?? '';

  // ── Sector news mode ────────────────────────────────────────────────────────
  if (sector && !symbol) {
    const queries = SECTOR_QUERIES[sector];
    if (!queries) return NextResponse.json({ news: [] });

    try {
      const [enItems, idItems] = await Promise.all([
        fetchRSS(queries.en, 'en', 'US'),
        fetchRSS(queries.id, 'id', 'ID'),
      ]);

      const seen = new Set<string>();
      const news: NewsItem[] = [...enItems, ...idItems]
        .filter(item => {
          const key = item.title.slice(0, 50);
          if (seen.has(key)) return false;
          seen.add(key);
          return true;
        })
        .sort((a, b) => {
          const ta = a.publishedAt ? new Date(a.publishedAt).getTime() : 0;
          const tb = b.publishedAt ? new Date(b.publishedAt).getTime() : 0;
          return tb - ta;
        })
        .slice(0, 15);

      return NextResponse.json({ news });
    } catch (err) {
      console.error('Sector news error:', err);
      return NextResponse.json({ news: [] });
    }
  }

  // ── Per-stock news mode (existing) ──────────────────────────────────────────
  const name = request.nextUrl.searchParams.get('name') ?? symbol.replace(/:IDX$/i, '');
  const shortName = name.split(' ').slice(0, 3).join(' ');

  try {
    let news: NewsItem[];

    if (isIDX(symbol)) {
      const [enItems, idItems] = await Promise.all([
        fetchRSS(`${shortName} stock`, 'en', 'US'),
        fetchRSS(`${shortName} saham`, 'id', 'ID'),
      ]);

      const seen = new Set<string>();
      news = [...enItems, ...idItems]
        .filter(item => {
          const key = item.title.slice(0, 50);
          if (seen.has(key)) return false;
          seen.add(key);
          return true;
        })
        .sort((a, b) => {
          const ta = a.publishedAt ? new Date(a.publishedAt).getTime() : 0;
          const tb = b.publishedAt ? new Date(b.publishedAt).getTime() : 0;
          return tb - ta;
        })
        .slice(0, 5);
    } else {
      news = (await fetchRSS(`${shortName} stock market`, 'en', 'US')).slice(0, 5);
    }

    return NextResponse.json({ news });
  } catch (err) {
    console.error('News API error:', err);
    return NextResponse.json({ news: [] });
  }
}
