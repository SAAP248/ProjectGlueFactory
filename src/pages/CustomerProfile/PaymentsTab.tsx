import { Plus, CreditCard, Gift } from 'lucide-react';
import type { Transaction, Credit } from './types';

interface Props {
  transactions: Transaction[];
  credits: Credit[];
}

const methodLabel: Record<string, string> = {
  ACH: 'ACH Transfer',
  ach: 'ACH Transfer',
  check: 'Check',
  wire: 'Wire Transfer',
  credit_card: 'Credit Card',
  cash: 'Cash',
};

const creditStatusStyle: Record<string, string> = {
  unapplied: 'bg-blue-100 text-blue-700',
  applied: 'bg-gray-100 text-gray-500',
  expired: 'bg-red-100 text-red-600',
};

export default function PaymentsTab({ transactions, credits }: Props) {
  const totalPaid = transactions.reduce((sum, t) => sum + Number(t.amount), 0);
  const availableCredits = credits.filter(c => c.status === 'unapplied').reduce((sum, c) => sum + Number(c.amount), 0);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-white rounded-xl border border-gray-100 p-5">
          <p className="text-sm font-medium text-gray-500 mb-1">Total Payments Received</p>
          <p className="text-2xl font-bold text-emerald-600">${totalPaid.toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-100 p-5">
          <p className="text-sm font-medium text-gray-500 mb-1">Available Credits</p>
          <p className="text-2xl font-bold text-blue-600">${availableCredits.toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CreditCard className="h-5 w-5 text-gray-400" />
            <h3 className="font-semibold text-gray-900">Payment History</h3>
          </div>
          <button className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors">
            <Plus className="h-4 w-4" />
            Add Payment
          </button>
        </div>
        {transactions.length === 0 ? (
          <div className="py-10 text-center text-sm text-gray-400">No payments recorded</div>
        ) : (
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Transaction #</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Date</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Method</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Amount</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Reference</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Notes</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {transactions.map(txn => (
                <tr key={txn.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 font-mono text-sm font-medium text-gray-700">{txn.transaction_number}</td>
                  <td className="px-6 py-4 text-sm text-gray-700">
                    {new Date(txn.transaction_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600">
                    {methodLabel[txn.payment_method] || txn.payment_method}
                  </td>
                  <td className="px-6 py-4 text-sm font-semibold text-emerald-700">
                    ${Number(txn.amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </td>
                  <td className="px-6 py-4 font-mono text-xs text-gray-400">{txn.reference_number || '—'}</td>
                  <td className="px-6 py-4 text-sm text-gray-500 max-w-xs truncate">{txn.notes || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Gift className="h-5 w-5 text-gray-400" />
            <h3 className="font-semibold text-gray-900">Account Credits</h3>
          </div>
          <button className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors">
            <Plus className="h-4 w-4" />
            Add Credit
          </button>
        </div>
        {credits.length === 0 ? (
          <div className="py-10 text-center text-sm text-gray-400">No credits on account</div>
        ) : (
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Issued Date</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Amount</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Reason</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Expires</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {credits.map(credit => (
                <tr key={credit.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 text-sm text-gray-700">
                    {new Date(credit.issued_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                  </td>
                  <td className="px-6 py-4 text-sm font-semibold text-blue-700">
                    ${Number(credit.amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600">{credit.reason}</td>
                  <td className="px-6 py-4 text-sm text-gray-400">
                    {credit.expiration_date
                      ? new Date(credit.expiration_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
                      : 'No expiration'}
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-2.5 py-1 text-xs font-medium rounded-full capitalize ${creditStatusStyle[credit.status] || 'bg-gray-100 text-gray-600'}`}>
                      {credit.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
