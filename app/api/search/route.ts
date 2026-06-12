import { NextRequest, NextResponse } from 'next/server';

interface YahooQuote {
  symbol: string;
  shortname?: string;
  longname?: string;
  exchange: string;
  quoteType: string;
}

const SKIP_TYPES = new Set([
  'CURRENCY', 'CRYPTOCURRENCY', 'INDEX', 'MUTUALFUND', 'FUTURE', 'OPTION',
]);

const US_EXCHANGES = new Set([
  'NMS', 'NYQ', 'NGM', 'PCX', 'ASE', 'BTS', 'OTC', 'PNK',
]);

export async function GET(request: NextRequest) {
  const q = request.nextUrl.searchParams.get('q');
  if (!q || q.trim().length < 1) return NextResponse.json([]);

  try {
    const url =
      `https://query1.finance.yahoo.com/v1/finance/search` +
      `?q=${encodeURIComponent(q)}&quotesCount=10&newsCount=0&enableFuzzyQuery=false`;

    const res = await fetch(url, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'application/json',
      },
      cache: 'no-store',
    });

    if (!res.ok) return NextResponse.json([]);

    const data = await res.json();
    const quotes: YahooQuote[] =
      data.quotes ?? data.finance?.result?.[0]?.quotes ?? [];

    const results = quotes
      .filter((q) => !SKIP_TYPES.has(q.quoteType))
      .map((q) => {
        const name = (q.shortname || q.longname || q.symbol).trim();

        if (q.symbol.endsWith('.JK')) {
          return {
            symbol: q.symbol.replace('.JK', ':IDX'),
            name,
            exchange: 'IDX',
          };
        }

        const exchangeLabel = US_EXCHANGES.has(q.exchange) ? 'US' : q.exchange;
        return {
          symbol: q.symbol,
          name,
          exchange: exchangeLabel,
        };
      });

    return NextResponse.json(results);
  } catch {
    return NextResponse.json([]);
  }
}
