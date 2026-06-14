'use client';
import { useEffect } from 'react';
import { formatCurrency } from '@/lib/utils';

interface PriceAlert {
  id: string;
  symbol: string;
  name: string;
  currency: string;
  condition: 'above' | 'below';
  targetPrice: number;
  triggered: boolean;
}

async function checkAlerts() {
  if (typeof window === 'undefined') return;
  const raw = localStorage.getItem('price_alerts');
  if (!raw) return;

  let alerts: PriceAlert[];
  try { alerts = JSON.parse(raw); } catch { return; }

  const active = alerts.filter(a => !a.triggered);
  if (!active.length) return;

  let changed = false;
  for (const alert of active) {
    try {
      const res = await fetch(`/api/stock?symbol=${encodeURIComponent(alert.symbol)}`);
      if (!res.ok) continue;
      const data = await res.json();
      const price: number = data.price;
      if (!price) continue;

      const fired = alert.condition === 'above'
        ? price >= alert.targetPrice
        : price <= alert.targetPrice;
      if (!fired) continue;

      if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
        const dir = alert.condition === 'above' ? 'melewati' : 'turun ke';
        new Notification(`Clarifi Alert — ${alert.symbol}`, {
          body: `${alert.name} ${dir} ${formatCurrency(price, alert.currency)} (target: ${formatCurrency(alert.targetPrice, alert.currency)})`,
          icon: '/favicon.ico',
        });
      }

      const idx = alerts.findIndex(a => a.id === alert.id);
      if (idx !== -1) { alerts[idx] = { ...alerts[idx], triggered: true }; changed = true; }
    } catch { /* skip on network error */ }
  }

  if (changed) localStorage.setItem('price_alerts', JSON.stringify(alerts));
}

export default function PriceAlertPoller() {
  useEffect(() => {
    checkAlerts();
    const id = setInterval(checkAlerts, 60_000);
    return () => clearInterval(id);
  }, []);
  return null;
}
