import { StockData } from '@/lib/types';

export function getSentiment(s: StockData): 'bullish' | 'bearish' | 'neutral' {
  if (s.rsi14 >= 40 && s.rsi14 <= 70 && s.price >= s.sma20 && s.change1M > 0) return 'bullish';
  if (s.rsi14 < 45  && s.price < s.sma50 && s.change1M < 0)                   return 'bearish';
  return 'neutral';
}
