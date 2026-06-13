import { NextRequest, NextResponse } from 'next/server';
import Groq from 'groq-sdk';
import { StockData } from '@/lib/types';

const MODEL = 'llama-3.3-70b-versatile';

function buildAnalysisPrompt(stock: StockData, lang: 'id' | 'en'): string {
  const trendLabel = stock.change1M > 5 ? 'BULLISH' : stock.change1M < -5 ? 'BEARISH' : 'NEUTRAL';
  const rsiLabel   = stock.rsi14 > 70 ? 'OVERBOUGHT' : stock.rsi14 < 30 ? 'OVERSOLD' : 'NEUTRAL';
  const vsMA20     = stock.price >= stock.sma20 ? 'above' : 'below';
  const vsMA50     = stock.price >= stock.sma50 ? 'above' : 'below';
  const mktCap     = stock.marketCap
    ? stock.currency === 'IDR'
      ? `Rp${(stock.marketCap / 1e12).toFixed(2)}T`
      : `$${(stock.marketCap / 1e9).toFixed(2)}B`
    : 'N/A';

  const isIDR    = stock.currency === 'IDR';
  const naIDX    = isIDR ? 'Tidak tersedia (IDX)' : 'N/A';
  const peLabel  = stock.peRatio != null ? stock.peRatio.toFixed(2)  : naIDX;
  const epsLabel = stock.eps     != null ? stock.eps.toFixed(2)       : naIDX;
  const betaLbl  = stock.beta    != null ? stock.beta.toFixed(2)      : naIDX;

  const data = `Stock: ${stock.name} (${stock.symbol}) — ${stock.exchange}
Price: ${stock.currency} ${stock.price.toFixed(2)} | Daily: ${stock.changePercent.toFixed(2)}%
1-Month Change: ${stock.change1M.toFixed(2)}% (${trendLabel}) | 3-Month Change: ${stock.change3M.toFixed(2)}%
RSI(14): ${stock.rsi14.toFixed(1)} (${rsiLabel})
SMA20: ${stock.sma20.toFixed(2)} — price is ${vsMA20} SMA20
SMA50: ${stock.sma50.toFixed(2)} — price is ${vsMA50} SMA50
Relative Volume: ${stock.relativeVolume}x
20-Day High: ${stock.high20d.toFixed(2)} | 20-Day Low: ${stock.low20d.toFixed(2)}
52-Week High: ${stock.high52w.toFixed(2)} | 52-Week Low: ${stock.low52w.toFixed(2)}
Market Cap: ${mktCap} | P/E: ${peLabel} | EPS: ${epsLabel}
Beta: ${betaLbl} | Sector: ${stock.sector ?? 'N/A'}`;

  if (lang === 'id') {
    return `Kamu adalah analis saham profesional. Analisis data berikut dan tulis tepat 4 paragraf ringkas — tanpa header, tanpa bullet point, tanpa markdown, hanya 4 paragraf teks biasa yang dipisahkan baris kosong. Gunakan bahasa Indonesia dengan terminologi trading yang lazim (boleh campur istilah teknikal Inggris seperti support, resistance, bullish, bearish, dll).

${data}

ATURAN GROUNDING (WAJIB DIIKUTI — TANPA PENGECUALIAN):
- Setiap klaim tren (naik/turun/sideways) WAJIB menyebutkan angka persentase persis dari data di atas
- Jika suatu nilai data adalah N/A atau 0, tulis "data tidak tersedia" — JANGAN mengarang angka
- JANGAN menulis klaim vague tanpa angka (contoh DILARANG: "saham terlihat lemah" tanpa menyebut RSI atau persentase)
- Kesimpulan sentimen (BULLISH/BEARISH/NEUTRAL) WAJIB disertai minimal 2 data poin numerik sebagai dasar di kalimat yang sama

Tulis tepat 4 paragraf:
Paragraf 1 (Tren & Momentum): Sebutkan perubahan 1 bulan PERSIS (${stock.change1M.toFixed(2)}%) dan perubahan 3 bulan PERSIS (${stock.change3M.toFixed(2)}%). Nyatakan posisi harga saat ini (${stock.price.toFixed(2)}) terhadap SMA20 (${stock.sma20.toFixed(2)}) dan SMA50 (${stock.sma50.toFixed(2)}) dengan angka tepat tersebut. Akhiri paragraf ini dengan kesimpulan sentimen (BULLISH/BEARISH/NEUTRAL) yang disertai 2 data poin numerik sebagai dasar.
Paragraf 2 (Support & Resistance): WAJIB sebutkan keempat level harga ini secara eksplisit: 20-Day Low ${stock.low20d.toFixed(2)}, 20-Day High ${stock.high20d.toFixed(2)}, 52-Week Low ${stock.low52w.toFixed(2)}, 52-Week High ${stock.high52w.toFixed(2)}. Jelaskan implikasinya terhadap harga saat ini (${stock.price.toFixed(2)}).
Paragraf 3 (RSI & Moving Average): WAJIB tulis nilai RSI persis: "RSI(14) saat ini berada di ${stock.rsi14.toFixed(1)}" dan klasifikasikan (overbought >70, oversold <30, netral di antara). Bandingkan harga (${stock.price.toFixed(2)}) vs SMA20 (${stock.sma20.toFixed(2)}) dan SMA50 (${stock.sma50.toFixed(2)}) dengan angka tepat dan jelaskan implikasinya.
Paragraf 4 (Risiko Utama): Satu risiko spesifik dan konkret untuk saham ini, dengan minimal satu angka dari data di atas sebagai dasar. Bukan pernyataan umum.`;
  }

  return `You are a professional stock analyst. Analyze the following data and write exactly 4 concise paragraphs — no headers, no bullet points, no markdown, just 4 plain paragraphs separated by a blank line.

${data}

GROUNDING REQUIREMENTS (MANDATORY — NO EXCEPTIONS):
- Every trend claim MUST quote the exact percentage from the data above
- If any data value is N/A or 0, write "data unavailable" — do NOT fabricate numbers
- NEVER write vague claims without numbers (example FORBIDDEN: "the stock looks weak" without citing RSI or change %)
- Any sentiment conclusion (BULLISH/BEARISH/NEUTRAL) MUST be backed by at least 2 specific numerical data points in the same sentence

Write exactly 4 paragraphs:
Paragraph 1 (Trend & Momentum): Quote the exact 1M change (${stock.change1M.toFixed(2)}%) and exact 3M change (${stock.change3M.toFixed(2)}%). State the current price (${stock.price.toFixed(2)}) vs SMA20 (${stock.sma20.toFixed(2)}) and SMA50 (${stock.sma50.toFixed(2)}) with those exact numbers. End this paragraph with a sentiment conclusion (BULLISH/BEARISH/NEUTRAL) backed by those 2 specific numerical data points.
Paragraph 2 (Support & Resistance): MUST explicitly name all four levels: 20-Day Low ${stock.low20d.toFixed(2)}, 20-Day High ${stock.high20d.toFixed(2)}, 52-Week Low ${stock.low52w.toFixed(2)}, 52-Week High ${stock.high52w.toFixed(2)}. Explain what each implies for the current price (${stock.price.toFixed(2)}).
Paragraph 3 (RSI & Moving Averages): MUST write the exact RSI value: "RSI(14) is currently at ${stock.rsi14.toFixed(1)}" and classify it (overbought >70, oversold <30, neutral otherwise). Compare price (${stock.price.toFixed(2)}) to SMA20 (${stock.sma20.toFixed(2)}) and SMA50 (${stock.sma50.toFixed(2)}) with exact numbers and explain the near-term implication.
Paragraph 4 (Key Risk): One specific, concrete risk for this stock backed by at least one exact number from the data above. Not a generic statement.`;
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
