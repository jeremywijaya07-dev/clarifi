'use client';
import { useState, useEffect, useCallback, useRef } from 'react';
import Link from 'next/link';
import { Trash2, RefreshCw, PieChart, Plus, Loader2, LogIn } from 'lucide-react';
import { StockData } from '@/lib/types';
import { formatCurrency, formatPercent } from '@/lib/utils';
import TickerAutocomplete from '@/components/TickerAutocomplete';
import { createClient } from '@/lib/supabase/client';
import type { User } from '@supabase/supabase-js';

interface StoredPosition {
  id: string;
  symbol: string;
  lots: number;
  buyPrice: number;
  lotSize: number;
}

interface PortfolioItem extends StoredPosition {
  data: StockData | null;
  loading: boolean;
  error: boolean;
}

const LOCAL_KEY = 'portfolio';

function saveLocal(positions: StoredPosition[]) {
  localStorage.setItem(LOCAL_KEY, JSON.stringify(positions));
}

function getLocal(): StoredPosition[] {
  try {
    const raw = localStorage.getItem(LOCAL_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

function clearLocal() {
  localStorage.removeItem(LOCAL_KEY);
}

function toStored({ id, symbol, lots, buyPrice, lotSize }: PortfolioItem): StoredPosition {
  return { id, symbol, lots, buyPrice, lotSize };
}

function market(symbol: string): string {
  return symbol.includes(':') || symbol.length <= 4 ? 'IDX' : 'US';
}

// ── component ─────────────────────────────────────────────────────────────────

export default function PortfolioPage() {
  const [items, setItems] = useState<PortfolioItem[]>([]);
  const [initialized, setInitialized] = useState(false);
  const [user, setUser] = useState<User | null>(null);

  const [sym, setSym] = useState('');
  const [lots, setLots] = useState('');
  const [buyPrice, setBuyPrice] = useState('');
  const [formErr, setFormErr] = useState('');
  const [adding, setAdding] = useState(false);
  const lotsRef = useRef<HTMLInputElement>(null);

  const supabase = createClient();

  const loadItem = useCallback((item: PortfolioItem) => {
    fetch(`/api/stock?symbol=${encodeURIComponent(item.symbol)}`)
      .then(r => r.json())
      .then(data => {
        setItems(prev =>
          prev.map(it => it.id === item.id ? { ...it, data: data as StockData, loading: false } : it),
        );
      })
      .catch(() => {
        setItems(prev =>
          prev.map(it => it.id === item.id ? { ...it, loading: false, error: true } : it),
        );
      });
  }, []);

  const buildItems = useCallback((positions: StoredPosition[]): PortfolioItem[] =>
    positions.map(p => ({ ...p, data: null, loading: true, error: false })), []);

  const loadFromDB = useCallback(async (uid: string): Promise<StoredPosition[]> => {
    const { data } = await supabase
      .from('portfolio')
      .select('*')
      .eq('user_id', uid)
      .order('created_at', { ascending: true });

    return (data ?? []).map((r: {
      id: string; ticker: string; shares: number; avg_price: number; lot_size: number;
    }) => ({
      id: r.id,
      symbol: r.ticker,
      lots: r.lot_size > 0 ? r.shares / r.lot_size : r.shares,
      buyPrice: r.avg_price,
      lotSize: r.lot_size,
    }));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Migrate localStorage portfolio to Supabase on first login
  const migrateIfNeeded = useCallback(async (uid: string) => {
    const local = getLocal();
    if (!local.length) return;
    const rows = local.map(p => ({
      user_id: uid,
      ticker: p.symbol,
      market: market(p.symbol),
      shares: p.lots * p.lotSize,
      avg_price: p.buyPrice,
      lot_size: p.lotSize,
    }));
    await supabase.from('portfolio').upsert(rows, { onConflict: 'user_id,ticker' });
    clearLocal();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data }) => {
      const u = data.user ?? null;
      setUser(u);
      let positions: StoredPosition[];
      if (u) {
        await migrateIfNeeded(u.id);
        positions = await loadFromDB(u.id);
      } else {
        positions = getLocal();
      }
      const initial = buildItems(positions);
      setItems(initial);
      setInitialized(true);
      initial.forEach(loadItem);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      const u = session?.user ?? null;
      setUser(u);
      let positions: StoredPosition[];
      if (u) {
        await migrateIfNeeded(u.id);
        positions = await loadFromDB(u.id);
      } else {
        positions = getLocal();
      }
      const initial = buildItems(positions);
      setItems(initial);
      initial.forEach(loadItem);
    });

    return () => subscription.unsubscribe();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleAdd = async () => {
    setFormErr('');
    const symbol = sym.trim().toUpperCase();
    const lotsNum = parseFloat(lots);
    const buyPriceNum = parseFloat(buyPrice);

    if (!symbol) return setFormErr('Masukkan simbol saham');
    if (!lotsNum || lotsNum <= 0) return setFormErr('Lots harus lebih dari 0');
    if (!buyPriceNum || buyPriceNum <= 0) return setFormErr('Harga beli harus lebih dari 0');

    setAdding(true);
    try {
      const res = await fetch(`/api/stock?symbol=${encodeURIComponent(symbol)}`);
      if (!res.ok) throw new Error('Saham tidak ditemukan');
      const data: StockData = await res.json();
      if (!data.symbol) throw new Error('Saham tidak ditemukan');

      const lotSize = data.currency === 'IDR' ? 100 : 1;

      if (user) {
        const { data: inserted, error } = await supabase
          .from('portfolio')
          .upsert(
            {
              user_id: user.id,
              ticker: data.symbol,
              market: market(data.symbol),
              shares: lotsNum * lotSize,
              avg_price: buyPriceNum,
              lot_size: lotSize,
            },
            { onConflict: 'user_id,ticker' },
          )
          .select()
          .single();

        if (error) throw new Error('Gagal menyimpan ke database');

        const newItem: PortfolioItem = {
          id: (inserted as { id: string }).id,
          symbol: data.symbol,
          lots: lotsNum,
          buyPrice: buyPriceNum,
          lotSize,
          data,
          loading: false,
          error: false,
        };
        setItems(prev => [...prev, newItem]);
      } else {
        const newItem: PortfolioItem = {
          id: Date.now().toString(),
          symbol: data.symbol,
          lots: lotsNum,
          buyPrice: buyPriceNum,
          lotSize,
          data,
          loading: false,
          error: false,
        };
        setItems(prev => {
          const next = [...prev, newItem];
          saveLocal(next.map(toStored));
          return next;
        });
      }

      setSym('');
      setLots('');
      setBuyPrice('');
    } catch (e) {
      setFormErr(e instanceof Error ? e.message : 'Ticker tidak valid');
    } finally {
      setAdding(false);
    }
  };

  const remove = async (id: string) => {
    if (user) {
      await supabase.from('portfolio').delete().eq('id', id).eq('user_id', user.id);
    } else {
      setItems(prev => {
        const next = prev.filter(it => it.id !== id);
        saveLocal(next.map(toStored));
        return next;
      });
    }
    setItems(prev => prev.filter(it => it.id !== id));
  };

  const refreshAll = () => {
    setItems(prev => {
      const refreshed = prev.map(it => ({ ...it, loading: true, error: false, data: null }));
      refreshed.forEach(loadItem);
      return refreshed;
    });
  };

  const currencyTotals: Record<string, { value: number; cost: number }> = {};
  for (const it of items) {
    if (!it.data) continue;
    const cur = it.data.currency ?? 'IDR';
    if (!currencyTotals[cur]) currencyTotals[cur] = { value: 0, cost: 0 };
    const shares = it.lots * it.lotSize;
    currencyTotals[cur].value += shares * it.data.price;
    currencyTotals[cur].cost += shares * it.buyPrice;
  }
  const hasLoaded = Object.keys(currencyTotals).length > 0;

  if (!initialized) return null;

  return (
    <div className="min-h-screen bg-[#F0F4F8] dark:bg-[#0F172A]">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6 space-y-4">

        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-gray-900 dark:text-white">Portfolio</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {items.length} position{items.length !== 1 ? 's' : ''}
              {user && <span className="text-[#0EA5E9] ml-1">· tersinkron</span>}
            </p>
          </div>
          {items.length > 0 && (
            <button
              onClick={refreshAll}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 text-xs font-medium rounded-lg hover:border-[#0EA5E9] hover:text-[#0EA5E9] transition-colors"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Refresh
            </button>
          )}
        </div>

        {/* CTA when logged out */}
        {!user && (
          <div className="flex items-center gap-3 px-4 py-3 bg-[#0EA5E9]/5 border border-[#0EA5E9]/20 rounded-xl">
            <LogIn className="w-4 h-4 text-[#0EA5E9] shrink-0" />
            <p className="text-xs text-gray-600 dark:text-gray-400 flex-1">
              Masuk untuk menyimpan &amp; sinkron portfolio lintas perangkat.
            </p>
          </div>
        )}

        {/* Summary card */}
        {hasLoaded && (
          <div className="bg-white dark:bg-[#1E293B] rounded-xl border border-gray-200 dark:border-[#1F2937] p-4">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-400 dark:text-gray-500 mb-3">
              Portfolio Summary
            </p>
            <div className="flex flex-wrap gap-x-8 gap-y-4">
              {Object.entries(currencyTotals).map(([cur, { value, cost }]) => {
                const pl = value - cost;
                const plPct = cost > 0 ? (pl / cost) * 100 : 0;
                const sign = pl >= 0 ? '+' : '-';
                return (
                  <div key={cur}>
                    <p className="text-[10px] text-gray-400 dark:text-gray-500 mb-0.5">
                      {cur} Total Value
                    </p>
                    <p className="text-2xl font-bold text-gray-900 dark:text-white">
                      {formatCurrency(value, cur)}
                    </p>
                    <p className={`text-sm font-semibold mt-0.5 ${pl >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-[#E24B4A]'}`}>
                      {sign}{formatCurrency(Math.abs(pl), cur)}&nbsp;({formatPercent(plPct)})
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Add position form */}
        <div className="bg-white dark:bg-[#1E293B] rounded-xl border border-gray-200 dark:border-[#1F2937] p-4">
          <p className="text-sm font-semibold text-gray-900 dark:text-white mb-3">Add Position</p>
          <div className="flex flex-wrap gap-2">
            <TickerAutocomplete
              value={sym}
              onChange={val => setSym(val.toUpperCase())}
              onSelect={val => { setSym(val); setTimeout(() => lotsRef.current?.focus(), 50); }}
              onEnterPress={handleAdd}
              placeholder="Ticker (e.g. BBRI:IDX)"
              showIcon={false}
              inputClassName="w-full px-3 py-2 text-sm bg-gray-50 dark:bg-gray-800/60 border border-gray-200 dark:border-gray-700 rounded-lg text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-600 focus:outline-none focus:border-[#0EA5E9] transition-colors"
            />
            <input
              ref={lotsRef}
              type="number"
              placeholder="Lots"
              value={lots}
              min="1"
              step="1"
              onChange={e => setLots(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleAdd()}
              className="w-24 px-3 py-2 text-sm bg-gray-50 dark:bg-gray-800/60 border border-gray-200 dark:border-gray-700 rounded-lg text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-600 focus:outline-none focus:border-[#0EA5E9] transition-colors"
            />
            <input
              type="number"
              placeholder="Buy price"
              value={buyPrice}
              min="0"
              step="any"
              onChange={e => setBuyPrice(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleAdd()}
              className="w-32 px-3 py-2 text-sm bg-gray-50 dark:bg-gray-800/60 border border-gray-200 dark:border-gray-700 rounded-lg text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-600 focus:outline-none focus:border-[#0EA5E9] transition-colors"
            />
            <button
              onClick={handleAdd}
              disabled={adding}
              className="flex items-center gap-1.5 px-4 py-2 bg-[#0EA5E9] hover:bg-[#0284C7] disabled:opacity-50 text-white text-sm font-semibold rounded-lg transition-colors"
            >
              {adding ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
              Add
            </button>
          </div>
          {formErr && <p className="text-xs text-[#E24B4A] mt-2">{formErr}</p>}
          <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-2">
            IDX: 1 lot = 100 shares &nbsp;·&nbsp; US: masukkan jumlah shares sebagai lots
          </p>
        </div>

        {/* Empty state */}
        {items.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 gap-3 text-center">
            <PieChart className="w-10 h-10 text-gray-200 dark:text-gray-800" />
            <p className="text-gray-500 dark:text-gray-400 text-sm">Belum ada posisi</p>
            <p className="text-xs text-gray-400 dark:text-gray-500">
              Tambahkan posisi pertama kamu menggunakan form di atas
            </p>
          </div>
        )}

        {/* Position list */}
        {items.length > 0 && (
          <div className="space-y-2">
            {items.map(item => (
              <PositionCard key={item.id} item={item} onRemove={() => remove(item.id)} />
            ))}
          </div>
        )}

      </div>
    </div>
  );
}

function PositionCard({ item, onRemove }: { item: PortfolioItem; onRemove: () => void }) {
  const { symbol, lots, buyPrice, lotSize, data, loading, error } = item;
  const shares = lots * lotSize;

  if (loading) {
    return (
      <div className="bg-white dark:bg-[#1E293B] rounded-xl border border-gray-200 dark:border-[#1F2937] p-4 animate-pulse">
        <div className="flex justify-between">
          <div>
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-20 mb-1.5" />
            <div className="h-3 bg-gray-100 dark:bg-gray-800 rounded w-48 mb-3" />
            <div className="flex gap-4">
              <div className="h-8 bg-gray-100 dark:bg-gray-800 rounded w-20" />
              <div className="h-8 bg-gray-100 dark:bg-gray-800 rounded w-20" />
              <div className="h-8 bg-gray-100 dark:bg-gray-800 rounded w-20" />
            </div>
          </div>
          <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-6 shrink-0" />
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="bg-white dark:bg-[#1E293B] rounded-xl border border-gray-200 dark:border-[#1F2937] p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="font-semibold text-gray-900 dark:text-white">{symbol}</p>
            <p className="text-xs text-[#E24B4A] mt-0.5">Gagal memuat data harga</p>
          </div>
          <button onClick={onRemove} className="p-1.5 text-gray-400 hover:text-[#E24B4A] transition-colors" title="Hapus posisi">
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>
    );
  }

  const currency = data.currency ?? 'IDR';
  const currentValue = shares * data.price;
  const totalCost = shares * buyPrice;
  const pl = currentValue - totalCost;
  const plPct = totalCost > 0 ? (pl / totalCost) * 100 : 0;
  const plSign = pl >= 0 ? '+' : '-';

  return (
    <div className="bg-white dark:bg-[#1E293B] rounded-xl border border-gray-200 dark:border-[#1F2937] p-4 hover:border-gray-300 dark:hover:border-gray-700 transition-colors">
      <div className="flex items-start justify-between gap-3">
        <Link href={`/app?symbol=${encodeURIComponent(data.symbol)}`} className="flex-1 min-w-0 group">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <span className="font-bold text-gray-900 dark:text-white group-hover:text-[#0EA5E9] transition-colors">
              {data.symbol}
            </span>
            <span className="text-xs text-gray-400 dark:text-gray-500 truncate max-w-[200px]">
              {data.name}
            </span>
            <span className="text-[10px] bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 px-1.5 py-0.5 rounded">
              {data.exchange}
            </span>
          </div>
          <p className="text-xs text-gray-400 dark:text-gray-500 mb-2.5">
            {lots} lot{lots !== 1 ? 's' : ''} &nbsp;·&nbsp; {shares.toLocaleString()} shares &nbsp;·&nbsp; Buy: {formatCurrency(buyPrice, currency)}/share
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-x-4 gap-y-1.5">
            <div>
              <p className="text-[10px] text-gray-400 dark:text-gray-500">Harga Sekarang</p>
              <p className="text-sm font-semibold text-gray-900 dark:text-white">{formatCurrency(data.price, currency)}</p>
            </div>
            <div>
              <p className="text-[10px] text-gray-400 dark:text-gray-500">Nilai Sekarang</p>
              <p className="text-sm font-semibold text-gray-900 dark:text-white">{formatCurrency(currentValue, currency)}</p>
            </div>
            <div>
              <p className="text-[10px] text-gray-400 dark:text-gray-500">Modal</p>
              <p className="text-sm font-semibold text-gray-900 dark:text-white">{formatCurrency(totalCost, currency)}</p>
            </div>
            <div>
              <p className="text-[10px] text-gray-400 dark:text-gray-500">P/L</p>
              <p className={`text-sm font-semibold ${pl >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-[#E24B4A]'}`}>
                {plSign}{formatCurrency(Math.abs(pl), currency)}&nbsp;({formatPercent(plPct)})
              </p>
            </div>
          </div>
        </Link>
        <button
          onClick={onRemove}
          className="p-1.5 text-gray-400 hover:text-[#E24B4A] transition-colors shrink-0 mt-0.5"
          title="Hapus posisi"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
