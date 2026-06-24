import { NextRequest, NextResponse } from 'next/server';
import Groq from 'groq-sdk';
import { StockData } from '@/lib/types';

const MODEL = 'llama-3.3-70b-versatile';

// ── Indonesian system prompt ──────────────────────────────────────────────────

const ANALYSIS_SYSTEM_PROMPT_ID = `Anda adalah analis saham profesional yang menjelaskan data teknikal kepada trader pemula Indonesia.
Bahasa: Bahasa Indonesia yang jelas dan mudah dipahami.

KONTEKS TUGAS:
Anda akan menerima data teknikal sebuah saham (IDX atau US). Tugas Anda adalah menulis analisis berdasarkan data yang diberikan, lalu mengembalikannya sebagai JSON.

=== ATURAN WAJIB (TIDAK BOLEH DILANGGAR) ===

0. LARANGAN KERAS ANGKA: Kamu DILARANG menulis angka apapun (harga, persentase, level harga, target) yang TIDAK ada secara eksplisit di data input. Salin angka verbatim dari data. Jangan membulatkan berbeda, mengestimasi, atau mengarang level baru. Jika ada angka yang tidak ada di data, tulis "data tidak tersedia" — jangan berikan angka pengganti.

1. HANYA gunakan data yang tersedia di input. Jika suatu nilai tidak ada di data yang diberikan, jangan mengarang — tulis eksplisit "data tidak tersedia".

2. SETIAP klaim tren (naik/turun/sideways/bullish/bearish/neutral) WAJIB disertai minimal 2 angka pendukung dari data input. Contoh yang benar: "Harga turun 3,2% dalam 1 bulan dan saat ini berada di bawah SMA20 (Rp1.250) dan SMA50 (Rp1.180), mengindikasikan tren bearish jangka pendek." Contoh yang SALAH: "Saham ini terlihat lemah secara teknikal."

3. SEBUTKAN nilai RSI secara eksplisit dan interpretasinya:
   - RSI > 70 → overbought (tekanan jual potensial)
   - RSI < 30 → oversold (potensi rebound)
   - RSI 30–70 → netral/wajar

4. SEBUTKAN level support dan resistance dengan angka spesifik yang ada di data (20-day low/high, 52-week low/high). Jangan menyebutkan level lain.

5. JANGAN menyimpulkan sentimen akhir (Bullish/Bearish/Neutral) tanpa menyebutkan dasar datanya di paragraf yang sama.

6. JANGAN menggunakan frasa generik tanpa angka seperti "saham ini terlihat lemah", "pergerakan cenderung volatile", "investor perlu berhati-hati" — kecuali diikuti langsung dengan data konkret dari input.

=== FORMAT OUTPUT ===
Kembalikan HANYA JSON valid dengan 4 key ini. Nilai tiap key adalah teks paragraf singkat (3–4 kalimat, TANPA markdown):

{
  "trend": "Teks tren & momentum...",
  "supportResistance": "Teks support & resistance...",
  "rsiMaInterpretation": "Teks RSI & moving average...",
  "keyRisk": "Teks risiko utama..."
}

=== PANDUAN TIAP SECTION ===

"trend": Bahas pergerakan harga: % perubahan 1 bulan & 3 bulan, posisi harga vs SMA20 & SMA50. Tentukan tren jangka pendek (naik/turun/sideways) dengan angka eksplisit. Akhiri dengan sentimen 🟢 BULLISH / 🔴 BEARISH / 🟡 NEUTRAL.

"supportResistance": Sebutkan level support (20D Low, 52W Low) dan resistance (20D High, 52W High) dengan angka persis dari data. Jelaskan posisi harga saat ini relatif terhadap level-level tersebut.

"rsiMaInterpretation": Sebutkan nilai RSI persis dan artinya. Bandingkan harga terhadap SMA20 dan SMA50 dengan angka eksplisit dari data. Jelaskan implikasi momentum.

"keyRisk": Satu risiko konkret dan spesifik dengan angka dari data. Bukan disclaimer generik.

=== FORMAT TEKS ===
- JANGAN gunakan markdown apapun: tidak ada **bold**, tidak ada *italic*, tidak ada ## heading, tidak ada bullet (- atau *)
- Tulis teks paragraf biasa
- Gunakan format angka Indonesia: titik sebagai pemisah ribuan, koma sebagai desimal (Rp1.250,50)
- Untuk saham US, gunakan format dollar ($)`;

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

  return `DATA SAHAM — GUNAKAN HANYA ANGKA DI BAWAH INI, JANGAN MENGARANG ANGKA LAIN:

Saham: ${stock.name} (${stock.symbol}) — ${stock.exchange}
Harga saat ini: ${fmtP(stock.price)} | Perubahan harian: ${sign(stock.changePercent)}
Perubahan 1 bulan: ${sign(stock.change1M)} | Perubahan 3 bulan: ${sign(stock.change3M)}
RSI(14): ${stock.rsi14.toFixed(2)}
SMA20: ${fmtP(stock.sma20)} — harga ${stock.price >= stock.sma20 ? 'DI ATAS' : 'DI BAWAH'} SMA20
SMA50: ${fmtP(stock.sma50)} — harga ${stock.price >= stock.sma50 ? 'DI ATAS' : 'DI BAWAH'} SMA50
20-Day High: ${fmtP(stock.high20d)} | 20-Day Low: ${fmtP(stock.low20d)}
52-Week High: ${fmtP(stock.high52w)} | 52-Week Low: ${fmtP(stock.low52w)}
Relative Volume: ${stock.relativeVolume.toFixed(2)}x
Market Cap: ${mktCap} | P/E: ${peLabel} | EPS: ${epsLabel} | Beta: ${betaLbl}
Sektor: ${stock.sector ?? na}

PENTING: Semua angka yang boleh kamu tulis dalam analisis HANYA yang tertera di atas. Kembalikan JSON dengan 4 key: trend, supportResistance, rsiMaInterpretation, keyRisk.`;
}

// ── EN: system + user prompts ─────────────────────────────────────────────────

const ANALYSIS_SYSTEM_PROMPT_EN = `You are a professional stock analyst providing technical analysis.

CRITICAL ANTI-HALLUCINATION RULES (MANDATORY — ZERO EXCEPTIONS):
1. Do NOT write ANY price level, percentage, or numeric value that is not present verbatim in the user's data. Copy numbers exactly as they appear. Never estimate, round differently, or invent levels not in the data.
2. If a value is N/A or unavailable in the data, write "data unavailable" — do NOT substitute a number.
3. Every trend claim (bullish/bearish/neutral) MUST quote at least 2 exact numbers from the data.
4. Any sentiment conclusion MUST be backed by ≥2 specific data points cited in the same sentence.
5. No vague claims without numbers (e.g. "looks weak" without citing RSI or change %).

Return ONLY valid JSON with exactly these 4 keys (plain text values, no markdown):
{
  "trend": "...",
  "supportResistance": "...",
  "rsiMaInterpretation": "...",
  "keyRisk": "..."
}

Section guidance:
- "trend": Quote exact 1M and 3M change %, price vs SMA20 & SMA50 with exact numbers. End with 🟢 BULLISH / 🔴 BEARISH / 🟡 NEUTRAL backed by those numbers.
- "supportResistance": Name all four levels verbatim from data (20D Low, 20D High, 52W Low, 52W High) with exact values. Explain current price position relative to each.
- "rsiMaInterpretation": Write exact RSI value, classify it (>70 overbought, <30 oversold). Compare price to SMA20 and SMA50 with exact numbers.
- "keyRisk": One specific concrete risk with at least one exact number from the data. Not a generic disclaimer.`;

function buildDataMessageEN(stock: StockData): string {
  const isIDR    = stock.currency === 'IDR';
  const naIDX    = isIDR ? 'Not available (IDX)' : 'N/A';
  const mktCap   = stock.marketCap
    ? stock.currency === 'IDR'
      ? `Rp${(stock.marketCap / 1e12).toFixed(2)}T`
      : `$${(stock.marketCap / 1e9).toFixed(2)}B`
    : 'N/A';

  return `USE ONLY THE NUMBERS BELOW — DO NOT INVENT ANY OTHER NUMBERS:

Stock: ${stock.name} (${stock.symbol}) — ${stock.exchange}
Price: ${stock.currency} ${stock.price.toFixed(2)} | Daily: ${stock.changePercent.toFixed(2)}%
1-Month Change: ${stock.change1M.toFixed(2)}% | 3-Month Change: ${stock.change3M.toFixed(2)}%
RSI(14): ${stock.rsi14.toFixed(1)}
SMA20: ${stock.sma20.toFixed(2)} — price is ${stock.price >= stock.sma20 ? 'ABOVE' : 'BELOW'} SMA20
SMA50: ${stock.sma50.toFixed(2)} — price is ${stock.price >= stock.sma50 ? 'ABOVE' : 'BELOW'} SMA50
20-Day High: ${stock.high20d.toFixed(2)} | 20-Day Low: ${stock.low20d.toFixed(2)}
52-Week High: ${stock.high52w.toFixed(2)} | 52-Week Low: ${stock.low52w.toFixed(2)}
Relative Volume: ${stock.relativeVolume.toFixed(2)}x
Market Cap: ${mktCap} | P/E: ${stock.peRatio?.toFixed(2) ?? naIDX} | EPS: ${stock.eps?.toFixed(2) ?? naIDX}
Beta: ${stock.beta?.toFixed(2) ?? naIDX} | Sector: ${stock.sector ?? 'N/A'}

Return JSON with 4 keys: trend, supportResistance, rsiMaInterpretation, keyRisk.`;
}

// ── Compare prompt ────────────────────────────────────────────────────────────

function buildComparePrompt(s1: StockData, s2: StockData, lang: 'id' | 'en'): string {
  const fmt = (s: StockData) =>
    `${s.name} (${s.symbol}) | Price: ${s.price.toFixed(2)} ${s.currency} | Daily: ${s.changePercent.toFixed(2)}% | 1M: ${s.change1M.toFixed(2)}% | 3M: ${s.change3M.toFixed(2)}% | RSI: ${s.rsi14.toFixed(1)} | P/E: ${s.peRatio?.toFixed(2) ?? 'N/A'} | Beta: ${s.beta?.toFixed(2) ?? 'N/A'}`;

  if (lang === 'id') {
    return `Kamu adalah analis saham profesional. Bandingkan dua saham ini dalam tepat 3 paragraf teks biasa — tanpa header, tanpa bullet, tanpa markdown. Gunakan bahasa Indonesia. JANGAN mengarang angka di luar data yang diberikan.

SAHAM 1: ${fmt(s1)}
SAHAM 2: ${fmt(s2)}

Paragraf 1: Bandingkan momentum dan setup teknikal dengan angka spesifik dari data di atas.
Paragraf 2: Bandingkan fundamental dan valuasi (gunakan hanya angka yang tersedia di data).
Paragraf 3: Rekomendasi jelas — mana yang lebih menarik saat ini dan kenapa. Sebutkan kedua ticker.`;
  }

  return `You are a professional stock analyst. Compare these two stocks in exactly 3 plain paragraphs — no headers, no bullets, no markdown. Do NOT write any numbers not present in the data below.

STOCK 1: ${fmt(s1)}
STOCK 2: ${fmt(s2)}

Paragraph 1: Compare momentum and technical setup with specific numbers from the data above.
Paragraph 2: Compare fundamentals and valuation (use only numbers available in the data).
Paragraph 3: Clear recommendation — which is the better opportunity right now and why. Name both tickers.`;
}

// ── Safe JSON parser with paragraph fallback ─────────────────────────────────

function parseAnalysisResponse(text: string): {
  trend: string;
  supportResistance: string;
  rsiMaInterpretation: string;
  keyRisk: string;
} {
  // 1. Try direct JSON parse
  try {
    const raw = text.trim();
    // Extract JSON object if wrapped in markdown code fences
    const jsonMatch = raw.match(/```(?:json)?\s*([\s\S]*?)```/) ?? raw.match(/(\{[\s\S]*\})/);
    const jsonStr = jsonMatch ? jsonMatch[1] : raw;
    const parsed = JSON.parse(jsonStr);

    if (parsed && typeof parsed === 'object') {
      return {
        trend:               String(parsed.trend               ?? parsed.tren                ?? ''),
        supportResistance:   String(parsed.supportResistance   ?? parsed.support_resistance  ?? ''),
        rsiMaInterpretation: String(parsed.rsiMaInterpretation ?? parsed.rsi_ma              ?? parsed.momentum ?? ''),
        keyRisk:             String(parsed.keyRisk             ?? parsed.risiko              ?? ''),
      };
    }
  } catch {
    // fall through to paragraph splitting
  }

  // 2. Fallback: split by blank lines (original behaviour)
  const paragraphs = text
    .split(/\n\n+/)
    .map(p => p.trim())
    .filter(p => p.length > 20);

  return {
    trend:               paragraphs[0] ?? '',
    supportResistance:   paragraphs[1] ?? '',
    rsiMaInterpretation: paragraphs[2] ?? '',
    keyRisk:             paragraphs[3] ?? '',
  };
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
    let maxTokens = 1000;
    let useJsonMode = false;

    if (type === 'compare' && stock1Data && stock2Data) {
      messages = [{ role: 'user', content: buildComparePrompt(stock1Data as StockData, stock2Data as StockData, lang) }];
      maxTokens = 700;
    } else if (stockData) {
      useJsonMode = true;
      if (lang === 'id') {
        messages = [
          { role: 'system', content: ANALYSIS_SYSTEM_PROMPT_ID },
          { role: 'user',   content: buildDataMessageID(stockData as StockData) },
        ];
        maxTokens = 900;
      } else {
        messages = [
          { role: 'system', content: ANALYSIS_SYSTEM_PROMPT_EN },
          { role: 'user',   content: buildDataMessageEN(stockData as StockData) },
        ];
        maxTokens = 900;
      }
    } else {
      return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
    }

    const client = new Groq({ apiKey });
    const completion = await client.chat.completions.create({
      model: MODEL,
      messages,
      max_tokens: maxTokens,
      temperature: 0.2,
      ...(useJsonMode ? { response_format: { type: 'json_object' } } : {}),
    });

    const text = completion.choices[0]?.message?.content ?? '';

    if (type === 'compare') {
      return NextResponse.json({ verdict: text });
    }

    return NextResponse.json(parseAnalysisResponse(text));
  } catch (err: unknown) {
    const e = err as { status?: number; message?: string };
    console.error('AI API error — status:', e.status, '| message:', e.message);
    const msg = e.message ?? 'Failed to generate analysis';
    return NextResponse.json({ error: msg }, { status: e.status ?? 500 });
  }
}
