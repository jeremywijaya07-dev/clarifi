import { NextRequest, NextResponse } from 'next/server';
import Groq from 'groq-sdk';
import { StockData } from '@/lib/types';

const MODEL = 'llama-3.3-70b-versatile';

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

function buildStockContext(stock: StockData): string {
  const trendLabel = stock.change1M > 5 ? 'BULLISH' : stock.change1M < -5 ? 'BEARISH' : 'NEUTRAL';
  const rsiLabel   = stock.rsi14 > 70 ? 'Overbought (>70)' : stock.rsi14 < 30 ? 'Oversold (<30)' : 'Neutral (30–70)';
  const vsMA20     = stock.price >= stock.sma20 ? 'Di Atas' : 'Di Bawah';
  const vsMA50     = stock.price >= stock.sma50 ? 'Di Atas' : 'Di Bawah';
  const mktCap     = stock.marketCap
    ? stock.currency === 'IDR'
      ? `Rp${(stock.marketCap / 1e12).toFixed(2)}T`
      : `$${(stock.marketCap / 1e9).toFixed(2)}B`
    : 'N/A';

  return [
    `Saham : ${stock.name} (${stock.symbol}) — ${stock.exchange}`,
    `Harga : ${stock.currency} ${stock.price.toFixed(2)}`,
    `Perubahan : Hari ini ${stock.changePercent.toFixed(2)}% | 1 Bulan ${stock.change1M.toFixed(2)}% (${trendLabel}) | 3 Bulan ${stock.change3M.toFixed(2)}%`,
    `RSI(14) : ${stock.rsi14.toFixed(1)} — ${rsiLabel}`,
    `SMA20   : ${stock.sma20.toFixed(2)} — Harga ${vsMA20} SMA20`,
    `SMA50   : ${stock.sma50.toFixed(2)} — Harga ${vsMA50} SMA50`,
    `Support : 20-Day Low ${stock.low20d.toFixed(2)} | 52-Week Low ${stock.low52w.toFixed(2)}`,
    `Resistance : 20-Day High ${stock.high20d.toFixed(2)} | 52-Week High ${stock.high52w.toFixed(2)}`,
    `Volume Relatif : ${stock.relativeVolume}x`,
    `Market Cap : ${mktCap} | Sektor : ${stock.sector ?? 'N/A'}`,
  ].join('\n');
}

function buildSystemPrompt(stock: StockData): string {
  return `Kamu adalah Clarifi AI — asisten analisis saham untuk trader dan investor Indonesia. Bantu pengguna memahami data saham, analisis teknikal, dan keputusan trading berdasarkan data real-time di bawah ini.

DATA SAHAM SAAT INI:
${buildStockContext(stock)}

PANDUAN MENJAWAB:
- Gunakan Bahasa Indonesia yang natural. Istilah teknikal Inggris (RSI, SMA, support, resistance, bullish, bearish) boleh dipakai langsung.
- Setiap klaim tentang harga, tren, atau indikator WAJIB mereferensikan angka konkret dari data di atas.
- Jika data yang ditanya tidak tersedia dalam context, katakan terus terang — jangan mengarang angka.
- Jawaban ringkas dan tajam. Hindari penjelasan yang bertele-tele.
- Jika user tanya perbandingan dengan saham lain, jelaskan bahwa kamu hanya memiliki data ${stock.symbol} saat ini.
- Untuk pertanyaan "apakah bagus untuk beli/jual", berikan analisis objektif berdasarkan data — bukan rekomendasi absolut.`;
}

export async function POST(request: NextRequest) {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: 'GROQ_API_KEY tidak dikonfigurasi' }, { status: 500 });
  }

  try {
    const body = await request.json();
    const { message, stockData, history = [] }: {
      message: string;
      stockData: StockData;
      history: ChatMessage[];
    } = body;

    if (!message?.trim() || !stockData) {
      return NextResponse.json({ error: 'message dan stockData wajib diisi' }, { status: 400 });
    }

    // Cap history at last 10 turns to avoid token overflow
    const trimmedHistory = (history as ChatMessage[]).slice(-10);

    const client = new Groq({ apiKey });
    const completion = await client.chat.completions.create({
      model: MODEL,
      messages: [
        { role: 'system', content: buildSystemPrompt(stockData) },
        ...trimmedHistory.map(m => ({ role: m.role, content: m.content })),
        { role: 'user', content: message.trim() },
      ],
      max_tokens: 600,
      temperature: 0.5,
    });

    const reply = completion.choices[0]?.message?.content ?? 'Maaf, tidak bisa menghasilkan respons.';
    return NextResponse.json({ reply });
  } catch (err: unknown) {
    const e = err as { status?: number; message?: string };
    console.error('Chat API error:', e.status, e.message);
    return NextResponse.json({ error: e.message ?? 'Gagal menghubungi AI' }, { status: e.status ?? 500 });
  }
}
