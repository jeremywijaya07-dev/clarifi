'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Trash2, Bell, BellOff, CheckCircle2 } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';

interface PriceAlert {
  id: string;
  symbol: string;
  name: string;
  currency: string;
  condition: 'above' | 'below';
  targetPrice: number;
  basePrice: number;
  triggered: boolean;
  createdAt: string;
}

export default function AlertsPage() {
  const [alerts, setAlerts] = useState<PriceAlert[]>([]);
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const [initialized, setInitialized] = useState(false);

  useEffect(() => {
    const raw = localStorage.getItem('price_alerts');
    setAlerts(raw ? JSON.parse(raw) : []);
    if (typeof Notification !== 'undefined') setPermission(Notification.permission);
    setInitialized(true);
  }, []);

  const remove = (id: string) => {
    setAlerts(prev => {
      const next = prev.filter(a => a.id !== id);
      localStorage.setItem('price_alerts', JSON.stringify(next));
      return next;
    });
  };

  const clearTriggered = () => {
    setAlerts(prev => {
      const next = prev.filter(a => !a.triggered);
      localStorage.setItem('price_alerts', JSON.stringify(next));
      return next;
    });
  };

  const requestPermission = async () => {
    const p = await Notification.requestPermission();
    setPermission(p);
  };

  if (!initialized) return null;

  const active = alerts.filter(a => !a.triggered);
  const triggered = alerts.filter(a => a.triggered);

  return (
    <div className="min-h-screen bg-[#F0F4F8] dark:bg-[#0F172A]">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6 space-y-4">

        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-gray-900 dark:text-white">Price Alerts</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {active.length} active · dicek setiap 1 menit
            </p>
          </div>
          {triggered.length > 0 && (
            <button
              onClick={clearTriggered}
              className="text-xs text-gray-400 hover:text-[#E24B4A] transition-colors"
            >
              Hapus triggered ({triggered.length})
            </button>
          )}
        </div>

        {/* Permission banner */}
        {permission !== 'granted' && (
          <div className="bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-800 rounded-xl p-4 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 min-w-0">
              <BellOff className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
              <p className="text-sm text-amber-700 dark:text-amber-400">
                {permission === 'denied'
                  ? 'Notifikasi diblokir di browser. Aktifkan secara manual di pengaturan browser.'
                  : 'Izinkan notifikasi supaya Clarifi bisa memberi tahu saat harga target tercapai.'}
              </p>
            </div>
            {permission !== 'denied' && (
              <button
                onClick={requestPermission}
                className="shrink-0 px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold rounded-lg transition-colors"
              >
                Izinkan
              </button>
            )}
          </div>
        )}

        {/* Empty state */}
        {alerts.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 gap-3 text-center">
            <Bell className="w-10 h-10 text-gray-200 dark:text-gray-800" />
            <p className="text-gray-500 dark:text-gray-400 text-sm">Belum ada price alert</p>
            <Link href="/app" className="text-[#0EA5E9] hover:underline text-sm font-medium">
              Set alert dari halaman Analysis
            </Link>
          </div>
        )}

        {/* Active alerts */}
        {active.length > 0 && (
          <div className="space-y-2">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-400 dark:text-gray-500">
              Active ({active.length})
            </p>
            {active.map(alert => (
              <AlertCard key={alert.id} alert={alert} onRemove={() => remove(alert.id)} />
            ))}
          </div>
        )}

        {/* Triggered alerts */}
        {triggered.length > 0 && (
          <div className="space-y-2">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-400 dark:text-gray-500">
              Triggered ({triggered.length})
            </p>
            {triggered.map(alert => (
              <AlertCard key={alert.id} alert={alert} onRemove={() => remove(alert.id)} />
            ))}
          </div>
        )}

      </div>
    </div>
  );
}

function AlertCard({ alert, onRemove }: { alert: PriceAlert; onRemove: () => void }) {
  const created = (() => {
    try {
      return new Date(alert.createdAt).toLocaleString('id-ID', {
        day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
      });
    } catch { return ''; }
  })();

  return (
    <div className={`bg-white dark:bg-[#1E293B] rounded-xl border p-4 transition-colors ${
      alert.triggered
        ? 'border-emerald-200 dark:border-emerald-800/50'
        : 'border-gray-200 dark:border-[#1F2937] hover:border-gray-300 dark:hover:border-gray-700'
    }`}>
      <div className="flex items-start justify-between gap-3">
        <Link href={`/app?symbol=${encodeURIComponent(alert.symbol)}`} className="flex-1 min-w-0 group">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <span className="font-bold text-gray-900 dark:text-white group-hover:text-[#0EA5E9] transition-colors">
              {alert.symbol}
            </span>
            <span className="text-xs text-gray-400 dark:text-gray-500 truncate max-w-[200px]">
              {alert.name}
            </span>
            {alert.triggered && (
              <span className="flex items-center gap-1 text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/20 px-1.5 py-0.5 rounded">
                <CheckCircle2 className="w-3 h-3" /> Triggered
              </span>
            )}
          </div>
          <p className="text-sm text-gray-700 dark:text-gray-300 mb-1">
            Alert when price goes{' '}
            <span className={`font-semibold ${
              alert.condition === 'above' ? 'text-emerald-600 dark:text-emerald-400' : 'text-[#E24B4A]'
            }`}>
              {alert.condition.toUpperCase()}
            </span>{' '}
            <span className="font-semibold text-gray-900 dark:text-white">
              {formatCurrency(alert.targetPrice, alert.currency)}
            </span>
          </p>
          <p className="text-[10px] text-gray-400 dark:text-gray-500">
            Set at {formatCurrency(alert.basePrice, alert.currency)} · {created}
          </p>
        </Link>
        <button
          onClick={onRemove}
          className="p-1.5 text-gray-400 hover:text-[#E24B4A] transition-colors shrink-0"
          title="Hapus alert"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
