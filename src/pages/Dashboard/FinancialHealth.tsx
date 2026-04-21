import { Wallet, Receipt } from 'lucide-react';
import { AgingBucket, TransactionRow } from './useDashboardData';

interface Props {
  aging: AgingBucket[];
  transactions: TransactionRow[];
}

const BUCKET_COLORS = ['bg-emerald-500', 'bg-amber-400', 'bg-orange-500', 'bg-rose-500', 'bg-red-600'];

const timeAgo = (iso: string) => {
  const d = new Date(iso);
  const diffMs = Date.now() - d.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffH = Math.floor(diffMin / 60);
  if (diffH < 24) return `${diffH}h ago`;
  const diffD = Math.floor(diffH / 24);
  return `${diffD}d ago`;
};

export default function FinancialHealth({ aging, transactions }: Props) {
  const total = aging.reduce((s, b) => s + b.amount, 0);

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100">
      <div className="p-5 border-b border-gray-100 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Wallet className="h-4 w-4 text-emerald-600" />
          <h3 className="text-sm font-semibold text-gray-900">A/R Aging</h3>
        </div>
        <span className="text-sm font-semibold text-gray-900">
          ${total.toLocaleString('en-US', { maximumFractionDigits: 0 })}
        </span>
      </div>

      <div className="p-5">
        <div className="flex h-3 rounded-full overflow-hidden bg-gray-100 mb-3">
          {aging.map((b, i) => {
            const w = total > 0 ? (b.amount / total) * 100 : 0;
            if (w === 0) return null;
            return (
              <div
                key={b.label}
                className={`${BUCKET_COLORS[i]} transition-all`}
                style={{ width: `${w}%` }}
                title={`${b.label}: $${b.amount.toFixed(0)}`}
              />
            );
          })}
        </div>

        <div className="grid grid-cols-5 gap-2">
          {aging.map((b, i) => (
            <div key={b.label} className="text-center">
              <div className={`w-2 h-2 rounded-full ${BUCKET_COLORS[i]} mx-auto mb-1`} />
              <p className="text-xs text-gray-500">{b.label}</p>
              <p className="text-sm font-semibold text-gray-900 mt-0.5">
                ${b.amount >= 1000 ? `${(b.amount / 1000).toFixed(1)}k` : b.amount.toFixed(0)}
              </p>
              <p className="text-xs text-gray-400">{b.count}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="border-t border-gray-100 p-5">
        <div className="flex items-center gap-2 mb-3">
          <Receipt className="h-3.5 w-3.5 text-gray-500" />
          <h4 className="text-xs font-semibold text-gray-700 uppercase tracking-wide">
            Recent Transactions
          </h4>
        </div>
        {transactions.length === 0 ? (
          <p className="text-sm text-gray-500 text-center py-2">No recent transactions</p>
        ) : (
          <div className="space-y-2">
            {transactions.slice(0, 5).map((t) => {
              const isPayment = (t.transaction_type || '').toLowerCase() === 'payment';
              return (
                <div key={t.id} className="flex items-center justify-between text-sm">
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-gray-900 truncate">
                      {t.company || t.transaction_number}
                    </p>
                    <p className="text-xs text-gray-500 capitalize">
                      {t.transaction_type} {t.payment_method ? `• ${t.payment_method}` : ''}
                    </p>
                  </div>
                  <div className="text-right ml-3">
                    <p className={`font-semibold ${isPayment ? 'text-emerald-600' : 'text-gray-900'}`}>
                      {isPayment ? '+' : ''}${t.amount.toLocaleString('en-US', { maximumFractionDigits: 0 })}
                    </p>
                    <p className="text-xs text-gray-400">{timeAgo(t.transaction_date)}</p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
