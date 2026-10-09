import { useMemo, useState } from 'react';
import { BarChart3 } from 'lucide-react';
import { daysBetween, inRange, parseISO, toISO, type DateRange } from '../../../lib/dateRange';
import { METHODS, formatMoney, type MethodKey, type Txn } from './useTransactions';

type Grain = 'day' | 'week' | 'month';

interface Bucket {
  key: string;
  start: string;
  label: string;
  tooltip: string;
  total: number;
  count: number;
  byMethod: Partial<Record<MethodKey, number>>;
}

function bucketStart(date: string, grain: Grain): string {
  if (grain === 'day') return date;
  const d = parseISO(date);
  if (grain === 'month') return toISO(new Date(d.getFullYear(), d.getMonth(), 1));
  const dow = (d.getDay() + 6) % 7;
  d.setDate(d.getDate() - dow);
  return toISO(d);
}

function nextStart(start: string, grain: Grain): string {
  const d = parseISO(start);
  if (grain === 'day') d.setDate(d.getDate() + 1);
  else if (grain === 'week') d.setDate(d.getDate() + 7);
  else d.setMonth(d.getMonth() + 1);
  return toISO(d);
}

function labels(start: string, grain: Grain, multiYear: boolean) {
  const d = parseISO(start);
  if (grain === 'month') {
    return {
      label: d.toLocaleDateString('en-US', { month: 'short', ...(multiYear ? { year: '2-digit' } : {}) }),
      tooltip: d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' }),
    };
  }
  const short = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  return {
    label: grain === 'day' ? String(d.getDate()) : short,
    tooltip: grain === 'week' ? `Week of ${d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}` : d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' }),
  };
}

export default function TransactionsChart({ transactions, range }: { transactions: Txn[]; range: DateRange }) {
  const [hover, setHover] = useState<number | null>(null);

  const { buckets, grain, max } = useMemo(() => {
    const payments = transactions.filter((t) => t.type === 'payment' && inRange(t.date, range));
    let from = range.from;
    let to = range.to;
    if (!from || !to) {
      if (!payments.length) return { buckets: [] as Bucket[], grain: 'month' as Grain, max: 0 };
      const dates = payments.map((t) => t.date).sort();
      from = dates[0];
      to = dates[dates.length - 1];
    }
    const span = daysBetween(from, to);
    const g: Grain = span <= 31 ? 'day' : span <= 120 ? 'week' : 'month';
    const multiYear = from.slice(0, 4) !== to.slice(0, 4);
    const list: Bucket[] = [];
    const index = new Map<string, Bucket>();
    for (let s = bucketStart(from, g); s <= to; s = nextStart(s, g)) {
      const b: Bucket = { key: s, start: s, ...labels(s, g, multiYear), total: 0, count: 0, byMethod: {} };
      list.push(b);
      index.set(s, b);
    }
    for (const t of payments) {
      const b = index.get(bucketStart(t.date, g));
      if (!b) continue;
      b.total += t.amount;
      b.count++;
      b.byMethod[t.method] = (b.byMethod[t.method] || 0) + t.amount;
    }
    return { buckets: list, grain: g, max: Math.max(0, ...list.map((b) => b.total)) };
  }, [transactions, range]);

  const labelEvery = Math.max(1, Math.ceil(buckets.length / 12));
  const ticks = [1, 0.75, 0.5, 0.25, 0];
  const active = hover !== null ? buckets[hover] : null;

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3 mb-6">
        <div>
          <h2 className="text-base font-semibold text-gray-900">Payments over time</h2>
          <p className="text-sm text-gray-500 mt-0.5">Grouped by {grain}</p>
        </div>
        <div className="flex flex-wrap gap-x-4 gap-y-1.5">
          {METHODS.filter((m) => m.key !== 'other').map((m) => (
            <span key={m.key} className="flex items-center gap-1.5 text-xs text-gray-600">
              <span className={`w-2.5 h-2.5 rounded-sm ${m.dot}`} />
              {m.label}
            </span>
          ))}
        </div>
      </div>

      {buckets.length === 0 || max === 0 ? (
        <div className="h-56 flex flex-col items-center justify-center text-gray-400">
          <BarChart3 className="h-8 w-8 mb-2" />
          <p className="text-sm">No payments in this period</p>
        </div>
      ) : (
        <div className="relative">
          <div className="flex">
            <div className="hidden sm:flex flex-col justify-between h-56 pr-3 text-[11px] text-gray-400 tabular-nums text-right w-14 shrink-0">
              {ticks.map((t) => (
                <span key={t} className="-translate-y-1/2 first:translate-y-0 last:translate-y-0">{formatMoney(max * t, true)}</span>
              ))}
            </div>
            <div className="relative flex-1 h-56" onMouseLeave={() => setHover(null)}>
              {ticks.map((t) => (
                <div key={t} className="absolute inset-x-0 border-t border-dashed border-gray-100" style={{ bottom: `${t * 100}%` }} />
              ))}
              <div className="absolute inset-0 flex items-end gap-[2px] sm:gap-1">
                {buckets.map((b, i) => (
                  <div
                    key={b.key}
                    className="flex-1 h-full flex flex-col justify-end cursor-default"
                    onMouseEnter={() => setHover(i)}
                  >
                    <div
                      className={`w-full flex flex-col-reverse rounded-t-md overflow-hidden transition-opacity duration-150 ${hover !== null && hover !== i ? 'opacity-40' : ''}`}
                      style={{ height: `${(b.total / max) * 100}%` }}
                    >
                      {METHODS.map((m) =>
                        b.byMethod[m.key] ? (
                          <div key={m.key} className={m.bar} style={{ height: `${(b.byMethod[m.key]! / b.total) * 100}%` }} />
                        ) : null
                      )}
                    </div>
                  </div>
                ))}
              </div>
              {active && hover !== null && (
                <div
                  className="pointer-events-none absolute z-10 -top-2 w-52 bg-slate-900 text-white rounded-xl shadow-xl p-3 text-xs"
                  style={{
                    left: `${((hover + 0.5) / buckets.length) * 100}%`,
                    transform: `translate(${hover > buckets.length / 2 ? '-100%' : '0'}, -100%)`,
                  }}
                >
                  <p className="font-semibold mb-1">{active.tooltip}</p>
                  <p className="text-slate-300 mb-2">
                    {formatMoney(active.total)} · {active.count} payment{active.count === 1 ? '' : 's'}
                  </p>
                  {METHODS.filter((m) => active.byMethod[m.key]).map((m) => (
                    <div key={m.key} className="flex items-center justify-between gap-2 py-0.5">
                      <span className="flex items-center gap-1.5 text-slate-300">
                        <span className={`w-2 h-2 rounded-sm ${m.dot}`} />
                        {m.label}
                      </span>
                      <span className="tabular-nums">{formatMoney(active.byMethod[m.key]!)}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
          <div className="flex sm:pl-14 mt-2 gap-[2px] sm:gap-1">
            {buckets.map((b, i) => (
              <span key={b.key} className="flex-1 text-center text-[10px] sm:text-[11px] text-gray-400 truncate">
                {i % labelEvery === 0 ? b.label : ''}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
