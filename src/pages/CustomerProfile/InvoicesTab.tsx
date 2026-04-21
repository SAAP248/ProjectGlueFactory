import { Plus, Receipt } from 'lucide-react';
import type { Invoice } from './types';

interface Props {
  invoices: Invoice[];
}

const statusStyles: Record<string, string> = {
  draft: 'bg-gray-100 text-gray-600',
  sent: 'bg-blue-100 text-blue-700',
  paid: 'bg-emerald-100 text-emerald-700',
  partial: 'bg-amber-100 text-amber-700',
  overdue: 'bg-red-100 text-red-700',
};

export default function InvoicesTab({ invoices }: Props) {
  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <button className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors">
          <Plus className="h-4 w-4" />
          New Invoice
        </button>
      </div>

      <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
        {invoices.length === 0 ? (
          <div className="py-16 text-center">
            <Receipt className="h-10 w-10 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500">No invoices for this customer</p>
          </div>
        ) : (
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Invoice #</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Invoice Date</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Due Date</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Total</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Paid</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Balance</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {invoices.map(inv => (
                <tr key={inv.id} className={`hover:bg-gray-50 cursor-pointer transition-colors ${inv.status === 'overdue' ? 'bg-red-50/30' : ''}`}>
                  <td className="px-6 py-4 font-mono text-sm font-medium text-blue-700">{inv.invoice_number}</td>
                  <td className="px-6 py-4 text-sm text-gray-700">
                    {new Date(inv.invoice_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                  </td>
                  <td className={`px-6 py-4 text-sm ${inv.status === 'overdue' ? 'text-red-600 font-medium' : 'text-gray-500'}`}>
                    {inv.due_date ? new Date(inv.due_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—'}
                  </td>
                  <td className="px-6 py-4 text-sm font-semibold text-gray-900">
                    ${Number(inv.total).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </td>
                  <td className="px-6 py-4 text-sm text-emerald-700 font-medium">
                    ${Number(inv.amount_paid).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </td>
                  <td className="px-6 py-4 text-sm font-semibold">
                    <span className={Number(inv.balance_due) > 0 ? 'text-red-600' : 'text-gray-400'}>
                      ${Number(inv.balance_due).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-2.5 py-1 text-xs font-medium rounded-full capitalize ${statusStyles[inv.status] || 'bg-gray-100 text-gray-600'}`}>
                      {inv.status}
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
