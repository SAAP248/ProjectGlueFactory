import { useEffect, useMemo, useState } from 'react';
import { ArrowDown, ArrowUp, ChevronLeft, ChevronRight, Download, Search, X } from 'lucide-react';
import { formatDate } from '../../Estimates/useEstimates';
import { METHODS, formatMoney, methodMeta, type MethodKey, type Txn } from './useTransactions';

type SortKey = 'date' | 'number' | 'customer' | 'amount';
type TypeFilter = 'all' | 'payment' | 'refund';

const PAGE_SIZE = 25;

interface Props {
  transactions: Txn[];
  onOpenInvoice?: (invoiceId: string) => void;
}

function csvCell(v: string | number) {
  const s = String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export default function TransactionsTable({ transactions, onOpenInvoice }: Props) {
  const [search, setSearch] = useState('');
  const [method, setMethod] = useState<MethodKey | ''>('');
  const [type, setType] = useState<TypeFilter>('all');
  const [sort, setSort] = useState<{ key: SortKey; dir: 'asc' | 'desc' }>({ key: 'date', dir: 'desc' });
  const [page, setPage] = useState(0);

  const methodsPresent = useMemo(() => METHODS.filter((m) => transactions.some((t) => t.method === m.key)), [transactions]);

  const rows = useMemo(() => {
    const q = search.trim().toLowerCase();
    const list = transactions.filter((t) => {
      if (method && t.method !== method) return false;
      if (type !== 'all' && t.type !== type) return false;
      if (!q) return true;
      return [t.number, t.companyName, t.invoiceNumber, t.reference, t.notes].some((v) => v?.toLowerCase().includes(q));
    });
    const dir = sort.dir === 'asc' ? 1 : -1;
    return list.sort((a, b) => {
      let c = 0;
      if (sort.key === 'date') c = a.date.localeCompare(b.date) || a.number.localeCompare(b.number);
      else if (sort.key === 'number') c = a.number.localeCompare(b.number, undefined, { numeric: true });
      else if (sort.key === 'customer') c = a.companyName.localeCompare(b.companyName);
      else c = (a.type === 'refund' ? -a.amount : a.amount) - (b.type === 'refund' ? -b.amount : b.amount);
      return c * dir;
    });
  }, [transactions, search, method, type, sort]);

  useEffect(() => setPage(0), [transactions, search, method, type, sort]);

  const pageCount = Math.max(1, Math.ceil(rows.length / PAGE_SIZE));
  const visible = rows.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);
  const filteredTotal = rows.reduce((s, t) => s + (t.type === 'refund' ? -t.amount : t.amount), 0);

  const toggleSort = (key: SortKey) =>
    setSort((s) => (s.key === key ? { key, dir: s.dir === 'asc' ? 'desc' : 'asc' } : { key, dir: key === 'customer' || key === 'number' ? 'asc' : 'desc' }));

  const exportCsv = () => {
    const header = ['Transaction #', 'Date', 'Type', 'Customer', 'Invoice', 'Method', 'Reference', 'Amount'];
    const lines = rows.map((t) =>
      [t.number, t.date, t.type, t.companyName, t.invoiceNumber || '', methodMeta(t.method).label, t.reference || '', (t.type === 'refund' ? -t.amount : t.amount).toFixed(2)]
        .map(csvCell)
        .join(',')
    );
    const blob = new Blob([[header.join(','), ...lines].join('\n')], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'transactions.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  const SortHead = ({ k, children, right = false }: { k: SortKey; children: string; right?: boolean }) => (
    <th className={`px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider ${right ? 'text-right' : 'text-left'}`}>
      <button onClick={() => toggleSort(k)} className={`inline-flex items-center gap-1 hover:text-gray-900 transition-colors ${sort.key === k ? 'text-gray-900' : ''}`}>
        {children}
        {sort.key === k && (sort.dir === 'asc' ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />)}
      </button>
    </th>
  );

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
      <div className="p-5 border-b border-gray-100 space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center gap-3 justify-between">
          <div className="relative w-full lg:max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search customer, invoice, reference..."
              className="pl-9 pr-9 py-2 w-full border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
            />
            {search && (
              <button onClick={() => setSearch('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 p-0.5 rounded text-gray-400 hover:text-gray-700" aria-label="Clear search">
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
          <div className="flex items-center gap-2">
            <div className="flex bg-gray-100 rounded-xl p-1">
              {(['all', 'payment', 'refund'] as TypeFilter[]).map((t) => (
                <button
                  key={t}
                  onClick={() => setType(t)}
                  className={`px-3 py-1 rounded-lg text-xs font-semibold capitalize transition-all ${type === t ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-800'}`}
                >
                  {t === 'all' ? 'All' : `${t}s`}
                </button>
              ))}
            </div>
            <button
              onClick={exportCsv}
              disabled={!rows.length}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-gray-200 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-40 transition-colors"
            >
              <Download className="h-4 w-4" />
              Export
            </button>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setMethod('')}
            className={`px-3 py-1 rounded-full text-xs font-semibold ring-1 transition-all ${method === '' ? 'bg-slate-900 text-white ring-slate-900' : 'bg-white text-gray-600 ring-gray-200 hover:ring-gray-300'}`}
          >
            All methods
          </button>
          {methodsPresent.map((m) => (
            <button
              key={m.key}
              onClick={() => setMethod(method === m.key ? '' : m.key)}
              className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold ring-1 transition-all ${method === m.key ? m.pill : 'bg-white text-gray-600 ring-gray-200 hover:ring-gray-300'}`}
            >
              <span className={`w-1.5 h-1.5 rounded-full ${m.dot}`} />
              {m.label}
            </button>
          ))}
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[820px]">
          <thead className="bg-gray-50/80 border-b border-gray-100">
            <tr>
              <SortHead k="number">Transaction</SortHead>
              <SortHead k="date">Date</SortHead>
              <SortHead k="customer">Customer</SortHead>
              <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Invoice</th>
              <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Method</th>
              <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Reference</th>
              <SortHead k="amount" right>Amount</SortHead>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {visible.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-5 py-16 text-center text-sm text-gray-400">
                  No transactions match these filters
                </td>
              </tr>
            ) : (
              visible.map((t) => {
                const m = methodMeta(t.method);
                const refund = t.type === 'refund';
                return (
                  <tr key={t.id} className="hover:bg-gray-50/70 transition-colors">
                    <td className="px-5 py-3.5">
                      <p className="text-sm font-semibold text-gray-900">{t.number}</p>
                      {refund && <span className="text-[11px] font-semibold text-red-600">Refund</span>}
                    </td>
                    <td className="px-5 py-3.5 text-sm text-gray-700 whitespace-nowrap">{formatDate(t.date)}</td>
                    <td className="px-5 py-3.5 text-sm text-gray-900 max-w-[220px] truncate">{t.companyName}</td>
                    <td className="px-5 py-3.5 text-sm">
                      {t.invoiceId && t.invoiceNumber ? (
                        onOpenInvoice ? (
                          <button onClick={() => onOpenInvoice(t.invoiceId!)} className="font-medium text-blue-600 hover:text-blue-800 hover:underline underline-offset-2">
                            {t.invoiceNumber}
                          </button>
                        ) : (
                          <span className="text-gray-700">{t.invoiceNumber}</span>
                        )
                      ) : (
                        <span className="text-gray-400">—</span>
                      )}
                    </td>
                    <td className="px-5 py-3.5">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 text-xs font-semibold rounded-full ring-1 ${m.pill}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${m.dot}`} />
                        {m.label}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-sm text-gray-500 font-mono">{t.reference || '—'}</td>
                    <td className={`px-5 py-3.5 text-sm font-semibold text-right tabular-nums ${refund ? 'text-red-600' : 'text-emerald-700'}`}>
                      {refund ? '-' : ''}
                      {formatMoney(t.amount)}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-5 py-3.5 border-t border-gray-100 bg-gray-50/50 text-sm">
        <p className="text-gray-500">
          {rows.length ? `${page * PAGE_SIZE + 1}–${Math.min(rows.length, (page + 1) * PAGE_SIZE)} of ${rows.length.toLocaleString()}` : '0 results'}
          <span className="mx-2 text-gray-300">|</span>
          Net <span className="font-semibold text-gray-900 tabular-nums">{formatMoney(filteredTotal)}</span>
        </p>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setPage((p) => Math.max(0, p - 1))}
            disabled={page === 0}
            className="p-1.5 rounded-lg text-gray-600 hover:bg-white hover:shadow-sm disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:shadow-none transition-all"
            aria-label="Previous page"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <span className="px-2 text-gray-600 tabular-nums">
            {page + 1} / {pageCount}
          </span>
          <button
            onClick={() => setPage((p) => Math.min(pageCount - 1, p + 1))}
            disabled={page >= pageCount - 1}
            className="p-1.5 rounded-lg text-gray-600 hover:bg-white hover:shadow-sm disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:shadow-none transition-all"
            aria-label="Next page"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
