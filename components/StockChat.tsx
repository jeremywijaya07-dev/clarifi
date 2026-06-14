'use client';
import { useState, useEffect, useRef, useCallback } from 'react';
import { Send, Trash2, Bot } from 'lucide-react';
import { StockData } from '@/lib/types';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

const SUGGESTIONS = [
  'Bagaimana momentum saham ini?',
  'Apakah ini saat yang tepat untuk beli?',
  'Di mana level support terdekat?',
  'Jelaskan RSI saham ini',
];

export default function StockChat({ stockData }: { stockData: StockData }) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Reset chat when stock changes
  useEffect(() => {
    setMessages([]);
    setInput('');
  }, [stockData.symbol]);

  // Scroll to latest message
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  const send = useCallback(async () => {
    const text = input.trim();
    if (!text || loading) return;

    const userMsg: Message = { role: 'user', content: text };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    if (inputRef.current) inputRef.current.style.height = 'auto';
    setLoading(true);

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: text,
          stockData,
          history: messages,
        }),
      });
      const data = await res.json();
      const reply: string = data.reply ?? data.error ?? 'Tidak ada respons dari AI.';
      setMessages(prev => [...prev, { role: 'assistant', content: reply }]);
    } catch {
      setMessages(prev => [...prev, { role: 'assistant', content: 'Koneksi gagal. Silakan coba lagi.' }]);
    } finally {
      setLoading(false);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [input, loading, messages, stockData]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
    e.target.style.height = 'auto';
    e.target.style.height = Math.min(e.target.scrollHeight, 96) + 'px';
  };

  const displayMessages = messages.slice(-10);
  const hasHidden = messages.length > 10;

  return (
    <div className="card flex flex-col overflow-hidden" style={{ height: '480px' }}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 dark:border-gray-800 shrink-0">
        <div className="flex items-center gap-2">
          <Bot className="w-4 h-4 text-[#00A86B]" />
          <h2 className="card-title">Chat dengan AI</h2>
          <span className="text-[10px] text-gray-400 dark:text-gray-600 hidden sm:inline">
            · konteks {stockData.symbol}
          </span>
        </div>
        {messages.length > 0 && (
          <button
            onClick={() => setMessages([])}
            className="flex items-center gap-1 text-xs text-gray-400 hover:text-[#E24B4A] transition-colors"
          >
            <Trash2 className="w-3 h-3" />
            Clear
          </button>
        )}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
        {messages.length === 0 && (
          <div className="h-full flex flex-col items-center justify-center gap-3 text-center">
            <Bot className="w-8 h-8 text-gray-200 dark:text-gray-700" />
            <p className="text-sm text-gray-400 dark:text-gray-500">
              Tanya apa saja tentang{' '}
              <span className="font-semibold text-gray-600 dark:text-gray-300">{stockData.symbol}</span>
            </p>
            <div className="flex flex-wrap justify-center gap-1.5 mt-1 max-w-xs">
              {SUGGESTIONS.map(q => (
                <button
                  key={q}
                  onClick={() => { setInput(q); setTimeout(() => inputRef.current?.focus(), 50); }}
                  className="text-[11px] px-2.5 py-1 bg-gray-100 dark:bg-gray-800 hover:bg-[#00A86B]/10 hover:text-[#00A86B] text-gray-500 dark:text-gray-400 rounded-full transition-colors text-left"
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
        )}

        {hasHidden && (
          <p className="text-[10px] text-center text-gray-400 dark:text-gray-600 pb-1">
            Menampilkan 10 pesan terakhir
          </p>
        )}

        {displayMessages.map((msg, i) => (
          <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div
              className={`max-w-[85%] px-3.5 py-2.5 text-sm leading-relaxed whitespace-pre-wrap break-words ${
                msg.role === 'user'
                  ? 'bg-[#00A86B] text-white rounded-2xl rounded-br-sm'
                  : 'bg-gray-100 dark:bg-[#1F2937] text-gray-900 dark:text-gray-100 rounded-2xl rounded-bl-sm'
              }`}
            >
              {msg.content}
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex justify-start">
            <div className="bg-gray-100 dark:bg-[#1F2937] px-4 py-3 rounded-2xl rounded-bl-sm">
              <div className="flex gap-1 items-center">
                {[0, 150, 300].map(delay => (
                  <span
                    key={delay}
                    className="w-1.5 h-1.5 bg-gray-400 dark:bg-gray-500 rounded-full animate-bounce"
                    style={{ animationDelay: `${delay}ms` }}
                  />
                ))}
              </div>
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="shrink-0 border-t border-gray-100 dark:border-gray-800 px-4 py-3">
        <div className="flex gap-2 items-end">
          <textarea
            ref={inputRef}
            value={input}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            disabled={loading}
            placeholder={`Tanya tentang ${stockData.symbol}...`}
            rows={1}
            className="flex-1 resize-none px-3 py-2 text-sm bg-gray-50 dark:bg-gray-800/60 border border-gray-200 dark:border-gray-700 rounded-xl text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-600 focus:outline-none focus:border-[#00A86B] transition-colors disabled:opacity-50 overflow-y-auto"
            style={{ lineHeight: '1.5rem', maxHeight: '96px' }}
          />
          <button
            onClick={send}
            disabled={loading || !input.trim()}
            className="p-2.5 bg-[#00A86B] hover:bg-[#009060] disabled:opacity-40 text-white rounded-xl transition-colors shrink-0"
            title="Kirim (Enter)"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
        <p className="text-[10px] text-gray-400 dark:text-gray-600 mt-1.5">
          Enter untuk kirim · Shift+Enter untuk baris baru
        </p>
      </div>
    </div>
  );
}
