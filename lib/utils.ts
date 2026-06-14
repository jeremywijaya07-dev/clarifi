export function formatCurrency(value: number, currency = 'USD'): string {
  if (currency === 'IDR') {
    const fmt = (n: number) => n.toLocaleString('id-ID', { minimumFractionDigits: 0, maximumFractionDigits: 2 });
    if (value >= 1e12) return `Rp${fmt(value / 1e12)} Triliun`;
    if (value >= 1e6)  return `Rp${fmt(value / 1e6)} Juta`;
    if (value >= 1e3)  return `Rp${value.toLocaleString('id-ID')}`;
    return `Rp${value.toFixed(0)}`;
  }
  if (value >= 1000) {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(value);
  }
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2, maximumFractionDigits: 4 }).format(value);
}

export function formatLargeNumber(value: number | null, currency = 'USD'): string {
  if (value === null || value === undefined) return 'N/A';
  const prefix = currency === 'IDR' ? 'Rp' : '$';
  if (value >= 1e12) return `${prefix}${(value / 1e12).toFixed(2)}T`;
  if (value >= 1e9) return `${prefix}${(value / 1e9).toFixed(2)}B`;
  if (value >= 1e6) return `${prefix}${(value / 1e6).toFixed(2)}M`;
  return `${prefix}${value.toLocaleString()}`;
}

export function formatPercent(value: number | null): string {
  if (value === null || value === undefined) return 'N/A';
  const prefix = value >= 0 ? '+' : '';
  return `${prefix}${value.toFixed(2)}%`;
}

export function formatVolume(value: number): string {
  if (value >= 1e9) return `${(value / 1e9).toFixed(2)}B`;
  if (value >= 1e6) return `${(value / 1e6).toFixed(2)}M`;
  if (value >= 1e3) return `${(value / 1e3).toFixed(1)}K`;
  return value.toLocaleString();
}

export function getTrendSignal(change1M: number): 'bullish' | 'bearish' | 'neutral' {
  if (change1M > 5) return 'bullish';
  if (change1M < -5) return 'bearish';
  return 'neutral';
}

export function getRSISignal(rsi: number): 'overbought' | 'oversold' | 'neutral' {
  if (rsi > 70) return 'overbought';
  if (rsi < 30) return 'oversold';
  return 'neutral';
}

export function formatChartPrice(value: number, currency = 'USD'): string {
  if (currency === 'IDR') {
    if (value >= 1_000_000) return `Rp${(value / 1_000_000).toFixed(2)}M`;
    if (value >= 1000) return `Rp${(value / 1000).toFixed(1)}K`;
    return `Rp${value.toFixed(0)}`;
  }
  if (value >= 1000) return `$${(value / 1000).toFixed(1)}K`;
  if (value >= 100) return `$${value.toFixed(1)}`;
  return `$${value.toFixed(2)}`;
}

export function formatDateShort(dateStr: string): string {
  try {
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  } catch {
    return dateStr;
  }
}

export function timeAgo(dateStr: string): string {
  try {
    const date = new Date(dateStr);
    const now = new Date();
    const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);
    if (seconds < 60) return 'just now';
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    if (days < 7) return `${days}d ago`;
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  } catch {
    return '';
  }
}
