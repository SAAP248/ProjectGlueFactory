import { useMemo } from 'react';
import { Trophy } from 'lucide-react';
import { inRange, type DateRange } from '../../../lib/dateRange';
import { formatMoney, type Txn } from './useTransactions';

export default function TopCustomers({ transactions, range }: { transactions: Txn[]; range: DateRange }) {
  const top = useMemo(() => {
    const map = new Map<string, { name: string; total: number; count: number }>();
    for (const t of transactions) {
      if (!inRange(t.date, range)) continue;
      const key = t.companyId || t.companyName;
      const entry = map.get(key) || { name: t.companyName, total: 0, count: 0 };
      if (t.type === 'refund') entry.total -= t.amount;
      else {
        entry.total += t.amount;
        entry.count++;
      }
      map.set(key, entry);
    }
    return [...map.values()].sort((a, b) => b.total - a.total).slice(0, 6);
  }, [transactions, range]);

  const max = top[0]?.total || 0;

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 sm:p-6 h-full">
      <div className="flex items-center gap-2 mb-5">
        <Trophy className="h-4 w-4 text-amber-500" />
        <h2 className="text-base font-semibold text-gray-900">Top paying customers</h2>
      </div>
      {top.length === 0 ? (
        <p className="text-sm text-gray-400 py-10 text-center">No payments in this period</p>
      ) : (
        <ol className="space-y-4">
          {top.map((c, i) => (
            <li key={c.name + i}>
              <div className="flex items-center justify-between gap-3 text-sm">
                <span className="flex items-center gap-2.5 min-w-0">
                  <span className={`w-6 h-6 shrink-0 rounded-full text-[11px] font-bold flex items-center justify-center ${i === 0 ? 'bg-amber-100 text-amber-700' : 'bg-gray-100 text-gray-600'}`}>
                    {i + 1}
                  </span>
                  <span className="font-medium text-gray-900 truncate">{c.name}</span>
                </span>
                <span className="font-semibold text-gray-900 tabular-nums">{formatMoney(c.total)}</span>
              </div>
              <div className="flex items-center gap-2 mt-1.5 pl-8">
                <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                  <div className="h-full bg-emerald-500 rounded-full transition-all duration-500" style={{ width: `${max ? Math.max(2, (c.total / max) * 100) : 0}%` }} />
                </div>
                <span className="text-[11px] text-gray-500 w-16 text-right">{c.count} pmt{c.count === 1 ? '' : 's'}</span>
              </div>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
