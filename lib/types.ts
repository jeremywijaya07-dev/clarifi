export interface PricePoint {
  date: string;
  close: number;
  sma20: number | null;
  sma50: number | null;
}

export interface StockData {
  symbol: string;
  name: string;
  exchange: string;
  currency: string;
  price: number;
  change: number;
  changePercent: number;
  change1M: number;
  change3M: number;
  rsi14: number;
  sma20: number;
  sma50: number;
  volume: number;
  avgVolume20: number;
  relativeVolume: number;
  marketCap: number | null;
  peRatio: number | null;
  eps: number | null;
  beta: number | null;
  dividendYield: number | null;
  sector: string | null;
  industry: string | null;
  high52w: number;
  low52w: number;
  high20d: number;
  low20d: number;
  bookValue: number | null;
  priceHistory: PricePoint[];
}

export interface NewsItem {
  id: string;
  title: string;
  url: string;
  source: string;
  publishedAt: string;
  summary?: string;
}

export interface AIAnalysis {
  trend: string;
  supportResistance: string;
  rsiMaInterpretation: string;
  keyRisk: string;
}
