import { NextRequest, NextResponse } from 'next/server';
import Groq from 'groq-sdk';
import { StockData } from '@/lib/types';

const MODEL = 'llama-3.3-70b-versatile';

// ── Indonesian system prompt (new version) ───────────────────────────────────

const ANALYSIS_SYSTEM_PROMPT_ID = `Anda adalah analis saham profesional yang menjelaskan data teknikal kepada trader pemula Indonesia.
Bahasa: Bahasa Indonesia yang jelas dan mudah dipahami.

KONTEKS TUGAS:
Anda akan menerima data teknikal sebuah saham (IDX atau US). Tugas Anda adalah menulis analisis dalam 4 paragraf terstruktur berdasarkan data yang diberikan.

=== ATURAN WAJIB (TIDAK BOLEH DILANGGAR) ===

1. HANYA gunakan data yang tersedia di input. Jika suatu nilai tidak ada di data yang diberikan, jangan mengarang — tulis eksplisit "data tidak tersedia".

2. SETIAP klaim tren (naik/turun/sideways/bullish/bearish/neutral) WAJIB disertai minimal 2 angka pendukung dari data input. Contoh yang benar: "Harga turun 3,2% dalam 1 bulan dan saat ini berada di bawah SMA20 (Rp1.250) dan SMA50 (Rp1.180), mengindikasikan tren bearish jangka pendek." Contoh yang SALAH: "Saham ini terlihat lemah secara teknikal."

3. SEBUTKAN nilai RSI secara eksplisit dan interpretasinya:
   - RSI > 70 → overbought (tekanan jual potensial)
   - RSI < 30 → oversold (potensi rebound)
   - RSI 30–70 → netral/wajar

4. SEBUTKAN level support dan resistance dengan angka spesifik jika tersedia (20-day low/high, 52-week low/high, atau level lain yang ada di data).

5. JANGAN menyimpulkan sentimen akhir (Bullish/Bearish/Neutral) tanpa menyebutkan dasar datanya di paragraf yang sama.

6. JANGAN menggunakan frasa generik tanpa angka seperti "saham ini terlihat lemah", "pergerakan cenderung volatile", "investor perlu berhati-hati" — kecuali diikuti langsung dengan data konkret.

=== STRUKTUR OUTPUT (4 PARAGRAF) ===

Paragraf 1 — Tren Harga & Performa
Bahas pergerakan harga terkini: harga saat ini, % perubahan (1 hari, 1 minggu, 1 bulan, 3 bulan — gunakan yang tersedia). Jelaskan apakah tren jangka pendek naik, turun, atau sideways berdasarkan angka tersebut.

Paragraf 2 — RSI & Moving Average
Sebutkan nilai RSI persis dan artinya. Bandingkan harga saat ini terhadap SMA20 dan SMA50 (jika tersedia) — apakah di atas atau di bawah, dan apa implikasinya terhadap momentum.

Paragraf 3 — Support & Resistance
Sebutkan level support dan resistance dengan angka spesifik. Jelaskan posisi harga saat ini relatif terhadap level-level tersebut. Gunakan 20-day high/low dan 52-week high/low jika tersedia.

Paragraf 4 — Kesimpulan Sentimen
Nyatakan sentimen keseluruhan: Bullish / Bearish / Neutral — dengan ringkasan singkat dari 2–3 data poin paling kuat yang mendukung kesimpulan tersebut. Akhiri dengan 1 kalimat konteks risiko yang jujur (bukan disclaimer generik).

=== FORMAT SENTIMEN ===
Di awal paragraf 4, tulis label sentimen dalam format ini:
🟢 BULLISH / 🔴 BEARISH / 🟡 NEUTRAL — [alasan singkat berbasis data]

=== CATATAN TAMBAHAN ===
- Gunakan format angka Indonesia: titik sebagai pemisah ribuan, koma sebagai desimal (Rp1.250,50)
- Untuk saham US, gunakan format dollar ($)
- Jika data fundamental (P/E, EPS, dll) tidak tersedia, jangan bahas fundamental sama sekali
- Panjang tiap paragraf: 3–5 kalimat, padat dan informatif

=== FORMAT TEKS ===
- JANGAN gunakan markdown formatting apapun: tidak ada **bold**, tidak ada *italic*, tidak ada ##heading, tidak ada bullet points (- atau *)
- Langsung tulis teks paragraf biasa tanpa prefix apapun
- Jangan tulis "Paragraf 1 —", "Paragraf 2 —", dst di dalam teks. Section header sudah ditangani oleh UI`;

// ── ID: user message — structured data only ──────────────────────────────────

function buildDataMessageID(stock: StockData): string {
  const isIDR = stock.currency === 'IDR';
  const fmtP  = (n: number) =>
    isIDR ? `Rp${Math.round(n).toLocaleString('id-ID')}` : `$${n.toFixed(2)}`;
  const sign  = (n: number) => (n >= 0 ? '+' : '') + n.toFixed(2) + '%';
  const na    = 'data tidak tersedia';

  const peLabel  = stock.peRatio   != null ? stock.peRatio.toFixed(2)   : na;
  const epsLabel = stock.eps       != null ? stock.eps.toFixed(2)        : na;
  const betaLbl  = stock.beta      != null ? stock.beta.toFixed(2)       : na;
  const mktCap   = stock.marketCap != null
    ? isIDR
      ? `Rp${(stock.marketCap / 1e12).toFixed(2)} triliun`
      : `$${(stock.marketCap / 1e9).toFixed(2)} miliar`
    : na;

  return `Saham: ${stock.name} (${stock.symbol}) — ${stock.exchange}
Harga saat ini: ${fmtP(stock.price)} | Perubahan harian: ${sign(stock.changePercent)}
Perubahan 1 bulan: ${sign(stock.change1M)} | Perubahan 3 bulan: ${sign(stock.change3M)}
RSI(14): ${stock.rsi14.toFixed(2)}
SMA20: ${fmtP(stock.sma20)} — harga ${stock.price >= stock.sma20 ? 'DI ATAS' : 'DI BAWAH'} SMA20
SMA50: ${fmtP(stock.sma50)} — harga ${stock.price >= stock.sma50 ? 'DI ATAS' : 'DI BAWAH'} SMA50
20-Day High: ${fmtP(stock.high20d)} | 20-Day Low: ${fmtP(stock.low20d)}
52-Week High: ${fmtP(stock.high52w)} | 52-Week Low: ${fmtP(stock.low52w)}
Relative Volume: ${stock.relativeVolume.toFixed(2)}x
Market Cap: ${mktCap} | P/E: ${peLabel} | EPS: ${epsLabel} | Beta: ${betaLbl}
Sektor: ${stock.sector ?? na}`;
}

// ── EN: single user-message prompt (unchanged) ───────────────────────────────

function buildAnalysisPromptEN(stock: StockData): string {
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
  const naIDX    = isIDR ? 'Not available (IDX)' : 'N/A';
  const peLabel  = stock.peRatio != null ? stock.peRatio.toFixed(2) : naIDX;
  const epsLabel = stock.eps     != null ? stock.eps.toFixed(2)      : naIDX;
  const betaLbl  = stock.beta    != null ? stock.beta.toFixed(2)     : naIDX;

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

// ── Compare prompt (unchanged) ────────────────────────────────────────────────

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

// ── Route handler ─────────────────────────────────────────────────────────────

type Message = { role: 'system' | 'user'; content: string };

export async function POST(request: NextRequest) {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: 'GROQ_API_KEY not configured in .env.local' }, { status: 500 });
  }

  try {
    const body = await request.json();
    const { type, stockData, stock1Data, stock2Data, language } = body;
    const lang: 'id' | 'en' = language === 'en' ? 'en' : 'id';

    let messages: Message[];
    let maxTokens = 1500;

    if (type === 'compare' && stock1Data && stock2Data) {
      messages = [{ role: 'user', content: buildComparePrompt(stock1Data as StockData, stock2Data as StockData, lang) }];
    } else if (stockData) {
      if (lang === 'id') {
        // New: proper system + user split for Indonesian analysis
        messages = [
          { role: 'system', content: ANALYSIS_SYSTEM_PROMPT_ID },
          { role: 'user', content: buildDataMessageID(stockData as StockData) },
        ];
        maxTokens = 800; // max ~300 words as instructed
      } else {
        messages = [{ role: 'user', content: buildAnalysisPromptEN(stockData as StockData) }];
      }
    } else {
      return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
    }

    const client = new Groq({ apiKey });
    const completion = await client.chat.completions.create({
      model: MODEL,
      messages,
      max_tokens: maxTokens,
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
