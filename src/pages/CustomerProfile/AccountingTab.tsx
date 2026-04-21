import { useState } from 'react';
import { Plus, FileText, Receipt, CreditCard, Gift } from 'lucide-react';
import type { Estimate, Invoice, Transaction, Credit } from './types';

interface Props {
  estimates: Estimate[];
  invoices: Invoice[];
  transactions: Transaction[];
  credits: Credit[];
}

const estimateStatusStyles: Record<string, string> = {
  draft: 'bg-gray-100 text-gray-600',
  sent: 'bg-blue-100 text-blue-700',
  approved: 'bg-emerald-100 text-emerald-700',
  declined: 'bg-red-100 text-red-700',
  expired: 'bg-orange-100 text-orange-700',
};

const invoiceStatusStyles: Record<string, string> = {
  draft: 'bg-gray-100 text-gray-600',
  sent: 'bg-blue-100 text-blue-700',
  paid: 'bg-emerald-100 text-emerald-700',
  partial: 'bg-amber-100 text-amber-700',
  overdue: 'bg-red-100 text-red-700',
};

const creditStatusStyle: Record<string, string> = {
  unapplied: 'bg-blue-100 text-blue-700',
  applied: 'bg-gray-100 text-gray-500',
  expired: 'bg-red-100 text-red-600',
};

const methodLabel: Record<string, string> = {
  ACH: 'ACH Transfer',
  ach: 'ACH Transfer',
  check: 'Check',
  wire: 'Wire Transfer',
  credit_card: 'Credit Card',
  cash: 'Cash',
};

const SUB_TABS = [
  { id: 'estimates', label: 'Estimates', icon: FileText },
  { id: 'invoices', label: 'Invoices', icon: Receipt },
  { id: 'payments', label: 'Payments', icon: CreditCard },
  { id: 'credits', label: 'Credits', icon: Gift },
];

export default function AccountingTab({ estimates, invoices, transactions, credits }: Props) {
  const [sub, setSub] = useState('estimates');

  const totalPaid = transactions.reduce((sum, t) => sum + Number(t.amount), 0);
  const availableCredits = credits.filter(c => c.status === 'unapplied').reduce((sum, c) => sum + Number(c.amount), 0);
  const overdueCount = invoices.filter(i => i.status === 'overdue').length;
  const totalBilled = invoices.reduce((sum, i) => sum + Number(i.total), 0);
  const totalBalance = invoices.reduce((sum, i) => sum + Number(i.balance_due), 0);

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border border-gray-100 p-4">
          <p className="text-xs font-medium text-gray-500 mb-1">Total Billed</p>
          <p className="text-xl font-bold text-gray-900">${totalBilled.toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-100 p-4">
          <p className="text-xs font-medium text-gray-500 mb-1">Balance Due</p>
          <p className={`text-xl font-bold ${totalBalance > 0 ? 'text-red-600' : 'text-gray-400'}`}>
            ${totalBalance.toLocaleString(undefined, { minimumFractionDigits: 2 })}
          </p>
          {overdueCount > 0 && (
            <p className="text-xs text-red-500 mt-0.5">{overdueCount} overdue</p>
          )}
        </div>
        <div className="bg-white rounded-xl border border-gray-100 p-4">
          <p className="text-xs font-medium text-gray-500 mb-1">Payments Received</p>
          <p className="text-xl font-bold text-emerald-600">${totalPaid.toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-100 p-4">
          <p className="text-xs font-medium text-gray-500 mb-1">Available Credits</p>
          <p className="text-xl font-bold text-blue-600">${availableCredits.toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
        <div className="flex items-center justify-between border-b border-gray-100 px-2">
          <div className="flex">
            {SUB_TABS.map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                onClick={() => setSub(id)}
                className={`flex items-center gap-2 px-4 py-3.5 text-sm font-medium border-b-2 transition-colors ${
                  sub === id
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-800 hover:border-gray-300'
                }`}
              >
                <Icon className="h-4 w-4" />
                {label}
                {id === 'invoices' && overdueCount > 0 && (
                  <span className="bg-red-500 text-white text-xs font-bold rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1">
                    {overdueCount}
                  </span>
                )}
              </button>
            ))}
          </div>
          <div className="pr-4">
            {sub === 'estimates' && (
              <button className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors">
                <Plus className="h-4 w-4" />
                New Estimate
              </button>
            )}
            {sub === 'invoices' && (
              <button className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors">
                <Plus className="h-4 w-4" />
                New Invoice
              </button>
            )}
            {sub === 'payments' && (
              <button className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors">
                <Plus className="h-4 w-4" />
                Add Payment
              </button>
            )}
            {sub === 'credits' && (
              <button className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors">
                <Plus className="h-4 w-4" />
                Add Credit
              </button>
            )}
          </div>
        </div>

        {sub === 'estimates' && (
          <>
            {estimates.length === 0 ? (
              <div className="py-16 text-center">
                <FileText className="h-10 w-10 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500">No estimates for this customer</p>
              </div>
            ) : (
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-100">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Estimate #</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Date</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Expires</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Amount</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Notes</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {estimates.map(est => (
                    <tr key={est.id} className="hover:bg-gray-50 cursor-pointer transition-colors">
                      <td className="px-6 py-4 font-mono text-sm font-medium text-blue-700">{est.estimate_number}</td>
                      <td className="px-6 py-4 text-sm text-gray-700">
                        {new Date(est.estimate_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500">
                        {est.expiration_date
                          ? new Date(est.expiration_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
                          : '—'}
                      </td>
                      <td className="px-6 py-4 text-sm font-semibold text-gray-900">
                        ${Number(est.total).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-2.5 py-1 text-xs font-medium rounded-full capitalize ${estimateStatusStyles[est.status] || 'bg-gray-100 text-gray-600'}`}>
                          {est.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500 max-w-xs truncate">{est.notes || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </>
        )}

        {sub === 'invoices' && (
          <>
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
                        <span className={`px-2.5 py-1 text-xs font-medium rounded-full capitalize ${invoiceStatusStyles[inv.status] || 'bg-gray-100 text-gray-600'}`}>
                          {inv.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </>
        )}

        {sub === 'payments' && (
          <>
            {transactions.length === 0 ? (
              <div className="py-16 text-center">
                <CreditCard className="h-10 w-10 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500">No payments recorded</p>
              </div>
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
          </>
        )}

        {sub === 'credits' && (
          <>
            {credits.length === 0 ? (
              <div className="py-16 text-center">
                <Gift className="h-10 w-10 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500">No credits on account</p>
              </div>
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
          </>
        )}
      </div>
    </div>
  );
}
