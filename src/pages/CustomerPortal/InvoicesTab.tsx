import { useState } from 'react';
import { FileText, AlertTriangle, CreditCard, X, CheckCircle, DollarSign } from 'lucide-react';
import type { PortalInvoice, PortalUser } from './types';
import { supabase } from '../../lib/supabase';

const STATUS_COLORS: Record<string, string> = {
  draft: 'bg-gray-100 text-gray-600',
  sent: 'bg-blue-100 text-blue-700',
  open: 'bg-blue-100 text-blue-700',
  partial: 'bg-amber-100 text-amber-700',
  paid: 'bg-emerald-100 text-emerald-700',
  overdue: 'bg-red-100 text-red-700',
  void: 'bg-gray-100 text-gray-500',
};

interface Props {
  invoices: PortalInvoice[];
  user: PortalUser;
  loading: boolean;
  onPaymentMade: () => void;
}

interface PaymentModal {
  invoice: PortalInvoice;
}

export default function InvoicesTab({ invoices, user, loading, onPaymentMade }: Props) {
  const [paymentModal, setPaymentModal] = useState<PaymentModal | null>(null);
  const [payAmount, setPayAmount] = useState('');
  const [payMethod, setPayMethod] = useState('credit_card');
  const [payRef, setPayRef] = useState('');
  const [paying, setPaying] = useState(false);
  const [paidSuccess, setPaidSuccess] = useState(false);

  const openInvoices = invoices.filter(i => ['open', 'sent', 'partial'].includes(i.status));
  const otherInvoices = invoices.filter(i => !['open', 'sent', 'partial'].includes(i.status));

  function openPay(inv: PortalInvoice) {
    setPayAmount(inv.balance_due.toFixed(2));
    setPayRef('');
    setPayMethod('credit_card');
    setPaidSuccess(false);
    setPaymentModal({ invoice: inv });
  }

  async function submitPayment() {
    if (!paymentModal || !payAmount) return;
    setPaying(true);
    const amt = parseFloat(payAmount);

    await supabase.from('portal_payments').insert({
      company_id: user.company_id,
      invoice_id: paymentModal.invoice.id,
      portal_user_id: user.id,
      amount: amt,
      payment_method: payMethod,
      reference_number: payRef || null,
    });

    const newAmtPaid = (paymentModal.invoice.amount_paid || 0) + amt;
    const newBalance = Math.max(0, paymentModal.invoice.total - newAmtPaid);
    await supabase.from('invoices').update({
      amount_paid: newAmtPaid,
      balance_due: newBalance,
      status: newBalance <= 0 ? 'paid' : 'partial',
      updated_at: new Date().toISOString(),
    }).eq('id', paymentModal.invoice.id);

    setPaying(false);
    setPaidSuccess(true);
    setTimeout(() => {
      setPaymentModal(null);
      setPaidSuccess(false);
      onPaymentMade();
    }, 1800);
  }

  if (loading) return <div className="flex justify-center py-16"><div className="animate-spin rounded-full h-7 w-7 border-2 border-blue-600 border-t-transparent" /></div>;

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <div>
        <h2 className="text-xl font-bold text-gray-900">Invoices</h2>
        <p className="text-sm text-gray-500 mt-0.5">{invoices.length} total</p>
      </div>

      {/* Open Invoices */}
      {openInvoices.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm font-bold text-gray-700 uppercase tracking-wide">Open — Payment Due</h3>
          {openInvoices.map(inv => {
            const isOverdue = inv.due_date && new Date(inv.due_date) < new Date();
            return (
              <div key={inv.id} className={`bg-white rounded-2xl border-2 p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${isOverdue ? 'border-red-200 bg-red-50/30' : 'border-gray-200'}`}>
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-1">
                    <p className="font-bold text-gray-900">{inv.invoice_number}</p>
                    {isOverdue && (
                      <span className="flex items-center gap-1 text-xs font-bold text-red-600 bg-red-100 px-2 py-0.5 rounded-full">
                        <AlertTriangle className="h-3 w-3" />
                        Overdue
                      </span>
                    )}
                    <span className={`text-xs font-semibold px-2.5 py-0.5 rounded-full capitalize ${STATUS_COLORS[inv.status] || 'bg-gray-100 text-gray-600'}`}>
                      {inv.status}
                    </span>
                  </div>
                  <div className="flex gap-4 text-sm text-gray-500">
                    <span>Invoice: {new Date(inv.invoice_date).toLocaleDateString()}</span>
                    {inv.due_date && <span className={isOverdue ? 'text-red-600 font-semibold' : ''}>Due: {new Date(inv.due_date).toLocaleDateString()}</span>}
                  </div>
                  <div className="flex gap-4 text-sm mt-1">
                    <span className="text-gray-500">Total: <span className="font-semibold text-gray-900">${inv.total.toFixed(2)}</span></span>
                    {inv.amount_paid > 0 && <span className="text-emerald-600">Paid: ${inv.amount_paid.toFixed(2)}</span>}
                    <span className="font-bold text-gray-900">Due: ${inv.balance_due.toFixed(2)}</span>
                  </div>
                </div>
                <button
                  onClick={() => openPay(inv)}
                  className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm px-5 py-2.5 rounded-xl transition-colors flex-shrink-0"
                >
                  <CreditCard className="h-4 w-4" />
                  Pay Now
                </button>
              </div>
            );
          })}
        </div>
      )}

      {/* Paid / Other */}
      {otherInvoices.length > 0 && (
        <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100">
            <h3 className="text-sm font-bold text-gray-700">Invoice History</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50">
                  <th className="text-left px-5 py-3 font-semibold text-gray-600">Invoice #</th>
                  <th className="text-left px-5 py-3 font-semibold text-gray-600">Date</th>
                  <th className="text-left px-5 py-3 font-semibold text-gray-600">Status</th>
                  <th className="text-right px-5 py-3 font-semibold text-gray-600">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {otherInvoices.map(inv => (
                  <tr key={inv.id} className="hover:bg-gray-50">
                    <td className="px-5 py-3.5 font-semibold text-gray-900">{inv.invoice_number}</td>
                    <td className="px-5 py-3.5 text-gray-600">{new Date(inv.invoice_date).toLocaleDateString()}</td>
                    <td className="px-5 py-3.5">
                      <span className={`text-xs font-semibold px-2.5 py-0.5 rounded-full capitalize ${STATUS_COLORS[inv.status] || 'bg-gray-100 text-gray-600'}`}>
                        {inv.status}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-right font-bold text-gray-900">${inv.total.toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {invoices.length === 0 && (
        <div className="bg-white rounded-2xl border border-gray-200 p-12 text-center">
          <div className="w-14 h-14 rounded-2xl bg-gray-100 flex items-center justify-center mx-auto mb-4">
            <FileText className="h-7 w-7 text-gray-400" />
          </div>
          <p className="text-gray-600 font-semibold">No invoices yet</p>
        </div>
      )}

      {/* Payment Modal */}
      {paymentModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl overflow-hidden">
            {paidSuccess ? (
              <div className="p-10 text-center">
                <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center mx-auto mb-4">
                  <CheckCircle className="h-8 w-8 text-emerald-600" />
                </div>
                <h3 className="text-xl font-bold text-gray-900">Payment Submitted</h3>
                <p className="text-gray-500 text-sm mt-1">Thank you for your payment.</p>
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-blue-100 flex items-center justify-center">
                      <DollarSign className="h-5 w-5 text-blue-600" />
                    </div>
                    <div>
                      <h3 className="font-bold text-gray-900">Make a Payment</h3>
                      <p className="text-xs text-gray-500">{paymentModal.invoice.invoice_number}</p>
                    </div>
                  </div>
                  <button onClick={() => setPaymentModal(null)} className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center hover:bg-gray-200 transition-colors">
                    <X className="h-4 w-4" />
                  </button>
                </div>
                <div className="p-6 space-y-4">
                  <div className="bg-gray-50 rounded-2xl p-4 space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">Invoice Total</span>
                      <span className="font-semibold">${paymentModal.invoice.total.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">Amount Paid</span>
                      <span className="font-semibold text-emerald-600">${paymentModal.invoice.amount_paid.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-sm font-bold border-t border-gray-200 pt-2 mt-2">
                      <span>Balance Due</span>
                      <span>${paymentModal.invoice.balance_due.toFixed(2)}</span>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1.5">Payment Amount</label>
                    <div className="relative">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 font-semibold">$</span>
                      <input
                        type="number"
                        min="0.01"
                        step="0.01"
                        max={paymentModal.invoice.balance_due}
                        value={payAmount}
                        onChange={e => setPayAmount(e.target.value)}
                        className="w-full border border-gray-300 rounded-xl pl-8 pr-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1.5">Payment Method</label>
                    <select
                      value={payMethod}
                      onChange={e => setPayMethod(e.target.value)}
                      className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                    >
                      <option value="credit_card">Credit Card</option>
                      <option value="ach">ACH / Bank Transfer</option>
                      <option value="check">Check</option>
                      <option value="cash">Cash</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1.5">Reference / Check # <span className="font-normal text-gray-400">(optional)</span></label>
                    <input
                      type="text"
                      value={payRef}
                      onChange={e => setPayRef(e.target.value)}
                      placeholder="e.g., check #1234"
                      className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <button
                    onClick={submitPayment}
                    disabled={paying || !payAmount || parseFloat(payAmount) <= 0}
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-4 rounded-2xl text-sm transition-colors disabled:opacity-60 flex items-center justify-center gap-2"
                  >
                    <CreditCard className="h-4 w-4" />
                    {paying ? 'Processing...' : `Submit Payment of $${parseFloat(payAmount || '0').toFixed(2)}`}
                  </button>
                  <p className="text-xs text-gray-400 text-center">By submitting, you authorize this payment on your account.</p>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
