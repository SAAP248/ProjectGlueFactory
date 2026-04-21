import { CreditCard } from 'lucide-react';
import type { PortalPayment } from './types';

const METHOD_LABELS: Record<string, string> = {
  credit_card: 'Credit Card',
  ach: 'ACH Transfer',
  check: 'Check',
  cash: 'Cash',
  other: 'Other',
};

interface Props {
  payments: PortalPayment[];
  loading: boolean;
}

export default function PaymentsTab({ payments, loading }: Props) {
  if (loading) return <div className="flex justify-center py-16"><div className="animate-spin rounded-full h-7 w-7 border-2 border-blue-600 border-t-transparent" /></div>;

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-4">
      <div>
        <h2 className="text-xl font-bold text-gray-900">Payment History</h2>
        <p className="text-sm text-gray-500 mt-0.5">{payments.length} payment{payments.length !== 1 ? 's' : ''}</p>
      </div>

      {payments.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-200 p-12 text-center">
          <div className="w-14 h-14 rounded-2xl bg-gray-100 flex items-center justify-center mx-auto mb-4">
            <CreditCard className="h-7 w-7 text-gray-400" />
          </div>
          <p className="text-gray-600 font-semibold">No payments on record</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50">
                  <th className="text-left px-5 py-3 font-semibold text-gray-600">Date</th>
                  <th className="text-left px-5 py-3 font-semibold text-gray-600">Invoice</th>
                  <th className="text-left px-5 py-3 font-semibold text-gray-600">Method</th>
                  <th className="text-left px-5 py-3 font-semibold text-gray-600">Reference</th>
                  <th className="text-right px-5 py-3 font-semibold text-gray-600">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {payments.map(p => (
                  <tr key={p.id} className="hover:bg-gray-50">
                    <td className="px-5 py-3.5 text-gray-600">
                      {new Date(p.paid_at).toLocaleDateString()}
                    </td>
                    <td className="px-5 py-3.5 text-gray-600">
                      {p.invoices?.invoice_number || '—'}
                    </td>
                    <td className="px-5 py-3.5 text-gray-600">
                      {METHOD_LABELS[p.payment_method] || p.payment_method}
                    </td>
                    <td className="px-5 py-3.5 text-gray-500">{p.reference_number || '—'}</td>
                    <td className="px-5 py-3.5 text-right font-bold text-emerald-700">
                      ${p.amount.toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
