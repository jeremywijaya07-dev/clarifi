import { NextRequest, NextResponse } from 'next/server';
import Groq from 'groq-sdk';
import { StockData } from '@/lib/types';

const MODEL = 'llama-3.3-70b-versatile';

function buildAnalysisPrompt(stock: StockData, lang: 'id' | 'en'): string {
  const trendLabel = stock.change1M > 5 ? 'BULLISH' : stock.change1M < -5 ? 'BEARISH' : 'NEUTRAL';
  const rsiLabel   = stock.rsi14 > 70 ? 'OVERBOUGHT' : stock.rsi14 < 30 ? 'OVERSOLD' : 'NEUTRAL';
  const vsMA20     = stock.price >= stock.sma20 ? 'above' : 'below';
  const vsMA50     = stock.price >= stock.sma50 ? 'above' : 'below';
  const mktCap     = stock.marketCap ? `$${(stock.marketCap / 1e9).toFixed(2)}B` : 'N/A';

  const data = `Stock: ${stock.name} (${stock.symbol}) — ${stock.exchange}
Price: ${stock.currency} ${stock.price.toFixed(2)} | Daily: ${stock.changePercent.toFixed(2)}%
1-Month Change: ${stock.change1M.toFixed(2)}% (${trendLabel}) | 3-Month Change: ${stock.change3M.toFixed(2)}%
RSI(14): ${stock.rsi14} (${rsiLabel})
SMA20: ${stock.sma20.toFixed(2)} — price is ${vsMA20} SMA20
SMA50: ${stock.sma50.toFixed(2)} — price is ${vsMA50} SMA50
Relative Volume: ${stock.relativeVolume}x
20-Day High: ${stock.high20d.toFixed(2)} | 20-Day Low: ${stock.low20d.toFixed(2)}
52-Week High: ${stock.high52w.toFixed(2)} | 52-Week Low: ${stock.low52w.toFixed(2)}
Market Cap: ${mktCap} | P/E: ${stock.peRatio?.toFixed(2) ?? 'N/A'} | EPS: ${stock.eps?.toFixed(2) ?? 'N/A'}
Beta: ${stock.beta?.toFixed(2) ?? 'N/A'} | Sector: ${stock.sector ?? 'N/A'}`;

  if (lang === 'id') {
    return `Kamu adalah analis saham profesional. Analisis data berikut dan tulis tepat 4 paragraf ringkas — tanpa header, tanpa bullet point, tanpa markdown, hanya 4 paragraf teks biasa yang dipisahkan baris kosong. Gunakan bahasa Indonesia dengan terminologi trading yang lazim (boleh campur istilah teknikal Inggris seperti support, resistance, bullish, bearish, dll).

${data}

Tulis tepat 4 paragraf:
Paragraf 1 (Tren & Momentum): Tren dan momentum saat ini dari performa 1B/3B dan posisi SMA. 3-4 kalimat.
Paragraf 2 (Support & Resistance): Level support dan resistance kunci menggunakan data 20 hari dan 52 minggu. Sebutkan harga spesifik.
Paragraf 3 (RSI & Moving Average): Interpretasikan RSI dan hubungan SMA20/SMA50 serta implikasinya untuk arah jangka pendek.
Paragraf 4 (Risiko Utama): Satu risiko spesifik dan konkret untuk saham ini berdasarkan data saat ini.`;
  }

  return `You are a professional stock analyst. Analyze the following data and write exactly 4 concise paragraphs — no headers, no bullet points, no markdown, just 4 plain paragraphs separated by a blank line.

${data}

Write exactly 4 paragraphs:
Paragraph 1 (Trend & Momentum): Current trend and momentum from 1M/3M performance and SMA positioning. 3-4 sentences.
Paragraph 2 (Support & Resistance): Specific key support and resistance levels using the 20-day and 52-week data. Name exact prices.
Paragraph 3 (RSI & Moving Averages): Interpret the RSI and SMA20/SMA50 relationship and what it implies for near-term direction.
Paragraph 4 (Key Risk): One specific, concrete risk for this stock right now based on the data.`;
}

function buildComparePrompt(s1: StockData, s2: StockData, lang: 'id' | 'en'): string {
  const fmt = (s: StockData) =>
    `${s.name} (${s.symbol}) | Price: ${s.price.toFixed(2)} ${s.currency} | Daily: ${s.changePercent.toFixed(2)}% | 1M: ${s.change1M.toFixed(2)}% | 3M: ${s.change3M.toFixed(2)}% | RSI: ${s.rsi14} | P/E: ${s.peRatio?.toFixed(2) ?? 'N/A'} | Beta: ${s.beta?.toFixed(2) ?? 'N/A'}`;

  if (lang === 'id') {
    return `Kamu adalah analis saham profesional. Bandingkan dua saham ini dalam tepat 3 paragraf teks biasa — tanpa header, tanpa bullet, tanpa markdown. Gunakan bahasa Indonesia dengan terminologi trading yang lazim.

SAHAM 1: ${fmt(s1)}
SAHAM 2: ${fmt(s2)}

Paragraf 1: Bandingkan momentum dan setup teknikal dengan angka spesifik.
Paragraf 2: Bandingkan fundamental dan valuasi.
Paragraf 3: Rekomendasi jelas — mana yang lebih menarik saat ini dan kenapa. Sebutkan kedua ticker.`;
  }

  return `You are a professional stock analyst. Compare these two stocks in exactly 3 plain paragraphs — no headers, no bullets, no markdown.

STOCK 1: ${fmt(s1)}
STOCK 2: ${fmt(s2)}

Paragraph 1: Compare momentum and technical setup with specific numbers.
Paragraph 2: Compare fundamentals and valuation.
Paragraph 3: Clear recommendation — which is the better opportunity right now and why. Name both tickers.`;
}

export async function POST(request: NextRequest) {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: 'GROQ_API_KEY not configured in .env.local' }, { status: 500 });
  }

  try {
    const body = await request.json();
    const { type, stockData, stock1Data, stock2Data, language } = body;
    const lang: 'id' | 'en' = language === 'en' ? 'en' : 'id';

    let prompt: string;
    if (type === 'compare' && stock1Data && stock2Data) {
      prompt = buildComparePrompt(stock1Data as StockData, stock2Data as StockData, lang);
    } else if (stockData) {
      prompt = buildAnalysisPrompt(stockData as StockData, lang);
    } else {
      return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
    }

    const client = new Groq({ apiKey });
    const completion = await client.chat.completions.create({
      model: MODEL,
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 1500,
      temperature: 0.3,
    });

    const text = completion.choices[0]?.message?.content ?? '';

    if (type === 'compare') {
      return NextResponse.json({ verdict: text });
    }

    const paragraphs = text
      .split(/\n\n+/)
      .map((p: string) => p.trim())
      .filter((p: string) => p.length > 20);

    return NextResponse.json({
      trend:               paragraphs[0] ?? '',
      supportResistance:   paragraphs[1] ?? '',
      rsiMaInterpretation: paragraphs[2] ?? '',
      keyRisk:             paragraphs[3] ?? '',
    });
  } catch (err: unknown) {
    const e = err as { status?: number; message?: string };
    console.error('AI API error — status:', e.status, '| message:', e.message);
    const msg = e.message ?? 'Failed to generate analysis';
    return NextResponse.json({ error: msg }, { status: e.status ?? 500 });
  }
}
