'use client';
import {
  ComposedChart, Bar, Line, XAxis, YAxis, Tooltip,
  ResponsiveContainer, CartesianGrid, Cell,
} from 'recharts';
import { PricePoint } from '@/lib/types';
import { formatChartPrice, formatDateShort } from '@/lib/utils';

interface Props {
  data: PricePoint[];
  currency?: string;
}

interface TooltipPayload { dataKey: string; value: number | null; color: string; }
interface CustomTooltipProps {
  active?: boolean;
  payload?: TooltipPayload[];
  label?: string;
  currency?: string;
}

function CustomTooltip({ active, payload, label, currency = 'USD' }: CustomTooltipProps) {
  if (!active || !payload?.length) return null;
  const KEYS = [
    { key: 'close', label: 'Price', color: '#00A86B' },
    { key: 'sma20', label: 'SMA 20', color: '#f59e0b' },
    { key: 'sma50', label: 'SMA 50', color: '#6366f1' },
  ];
  return (
    <div className="bg-white dark:bg-[#111827] border border-gray-200 dark:border-[#1F2937] rounded-lg p-2.5 shadow-lg text-xs min-w-[140px]">
      <p className="text-gray-400 dark:text-[#6B7280] mb-1.5 font-medium">
        {label ? formatDateShort(label) : ''}
      </p>
      {KEYS.map(({ key, label: lbl, color }) => {
        const p = payload.find(x => x.dataKey === key);
        if (!p || p.value === null) return null;
        return (
          <div key={key} className="flex items-center justify-between gap-3 mb-0.5">
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full" style={{ backgroundColor: color }} />
              <span className="text-gray-500 dark:text-[#9CA3AF]">{lbl}</span>
            </div>
            <span className="font-semibold text-gray-900 dark:text-white">
              {formatChartPrice(p.value, currency)}
            </span>
          </div>
        );
      })}
    </div>
  );
}

export default function PriceChart({ data, currency = 'USD' }: Props) {
  const chartData = data.slice(-90);
  const prices = chartData.map(d => d.close);
  const minP = Math.min(...prices) * 0.993;
  const maxP = Math.max(...prices) * 1.007;
  const tickInterval = Math.floor(chartData.length / 5);

  return (
    <div>
      <div className="w-full h-60">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={chartData} margin={{ top: 4, right: 4, left: 0, bottom: 4 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1F2937" opacity={0.5} vertical={false} />
            <XAxis
              dataKey="date"
              tickFormatter={formatDateShort}
              tick={{ fontSize: 10, fill: '#6B7280' }}
              tickLine={false}
              axisLine={false}
              interval={tickInterval}
            />
            <YAxis
              domain={[minP, maxP]}
              tickFormatter={v => formatChartPrice(v, currency)}
              tick={{ fontSize: 10, fill: '#6B7280' }}
              tickLine={false}
              axisLine={false}
              width={60}
            />
            <Tooltip content={<CustomTooltip currency={currency} />} />
            <Bar dataKey="close" barSize={3} radius={[1, 1, 0, 0]}>
              {chartData.map((entry, i) => {
                const prev = i > 0 ? chartData[i - 1].close : entry.close;
                return (
                  <Cell key={`c-${i}`} fill={entry.close >= prev ? '#00A86B' : '#EF4444'} fillOpacity={0.9} />
                );
              })}
            </Bar>
            <Line type="monotone" dataKey="sma20" stroke="#f59e0b" strokeWidth={1.5} dot={false} strokeDasharray="5 3" connectNulls={false} />
            <Line type="monotone" dataKey="sma50" stroke="#6366f1" strokeWidth={1.5} dot={false} strokeDasharray="5 3" connectNulls={false} />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
      <div className="flex items-center gap-5 mt-2 text-[11px] text-[#6B7280]">
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-2 inline-block rounded-sm bg-[#00A86B]" /> Price
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-4 border-t-2 border-dashed border-amber-400 inline-block" /> SMA 20
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-4 border-t-2 border-dashed border-indigo-500 inline-block" /> SMA 50
        </span>
      </div>
    </div>
  );
}
