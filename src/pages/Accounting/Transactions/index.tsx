import { useMemo } from 'react';
import { AlertCircle, Loader2, RefreshCw } from 'lucide-react';
import DateRangePicker from '../../../components/DateRangePicker';
import { inRange, useDateRange } from '../../../lib/dateRange';
import TransactionStats from './TransactionStats';
import TransactionsTable from './TransactionsTable';
import { summarize, useTransactions } from './useTransactions';

export default function Transactions({ onOpenInvoice }: { onOpenInvoice?: (invoiceId: string) => void }) {
  const { transactions, loading, error, refetch } = useTransactions();
  const { selection, setSelection, range, previous } = useDateRange('transactions');

  const current = useMemo(() => summarize(transactions, range), [transactions, range]);
  const prior = useMemo(() => (previous ? summarize(transactions, previous) : null), [transactions, previous]);
  const inPeriod = useMemo(() => transactions.filter((t) => inRange(t.date, range)), [transactions, range]);

  return (
    <div className="p-4 sm:p-6 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Transactions</h1>
          <p className="text-gray-500 mt-1">Payments received and refunds issued</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={refetch}
            className="p-2 rounded-xl border border-gray-200 bg-white text-gray-500 hover:text-gray-900 hover:border-gray-300 transition-colors"
            aria-label="Refresh"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <DateRangePicker selection={selection} range={range} onChange={setSelection} />
        </div>
      </div>

      {error ? (
        <div className="flex items-center gap-3 p-4 rounded-2xl bg-red-50 border border-red-100 text-red-700 text-sm">
          <AlertCircle className="h-5 w-5 shrink-0" />
          <span className="flex-1">We couldn't load your transactions. Please try again.</span>
          <button onClick={refetch} className="font-semibold hover:underline">Retry</button>
        </div>
      ) : loading && transactions.length === 0 ? (
        <div className="flex items-center justify-center py-32 text-gray-400">
          <Loader2 className="h-6 w-6 animate-spin" />
        </div>
      ) : (
        <div className="space-y-6 animate-fade-in">
          <TransactionStats current={current} previous={prior} previousLabel={previous?.label ?? null} />
          <TransactionsTable transactions={inPeriod} onOpenInvoice={onOpenInvoice} />
        </div>
      )}
    </div>
  );
}
