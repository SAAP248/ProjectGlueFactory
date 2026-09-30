import { useState, useEffect } from 'react';
import {
  TrendingUp, TrendingDown, DollarSign, FileText, CreditCard,
  AlertTriangle, CheckCircle, Clock, ExternalLink, Plus, X as XIcon,
  Receipt, ArrowUpRight, ArrowDownRight, Minus
} from 'lucide-react';
import { supabase } from '../../lib/supabase';

interface Invoice {
  id: string;
  invoice_number: string;
  status: string;
  invoice_date: string;
  due_date: string;
  subtotal: number;
  tax: number;
  total: number;
  amount_paid: number;
  balance_due: number;
}

interface Transaction {
  id: string;
  transaction_number: string;
  transaction_type: string;
  payment_method: string;
  amount: number;
  transaction_date: string;
  reference_number: string | null;
  invoice_id: string | null;
}

interface Props {
  workOrder: any;
  lineItemsTotal: number;
  onPaymentRecorded: () => void;
}

const INVOICE_STATUS_STYLES: Record<string, { bg: string; text: string; label: string }> = {
  draft: { bg: 'bg-gray-100', text: 'text-gray-600', label: 'Draft' },
  sent: { bg: 'bg-blue-100', text: 'text-blue-700', label: 'Sent' },
  viewed: { bg: 'bg-blue-100', text: 'text-blue-700', label: 'Viewed' },
  partial: { bg: 'bg-amber-100', text: 'text-amber-700', label: 'Partial' },
  paid: { bg: 'bg-emerald-100', text: 'text-emerald-700', label: 'Paid' },
  overdue: { bg: 'bg-red-100', text: 'text-red-700', label: 'Overdue' },
  void: { bg: 'bg-gray-100', text: 'text-gray-500', label: 'Void' },
};

function formatCurrency(val: number | null | undefined): string {
  return '$' + (Number(val) || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function formatDate(d: string | null): string {
  if (!d) return '—';
  return new Date(d + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export default function WorkOrderAccountingTab({ workOrder: wo, lineItemsTotal, onPaymentRecorded }: Props) {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [paymentModal, setPaymentModal] = useState(false);
  const [paymentForm, setPaymentForm] = useState({ amount: '', method: 'cash', reference: '' });
  const [savingPayment, setSavingPayment] = useState(false);

  useEffect(() => {
    loadAccountingData();
  }, [wo.id]);

  async function loadAccountingData() {
    setLoading(true);
    const [invRes, txRes] = await Promise.all([
      supabase
        .from('invoices')
        .select('id, invoice_number, status, invoice_date, due_date, subtotal, tax, total, amount_paid, balance_due')
        .eq('work_order_id', wo.id)
        .order('invoice_date', { ascending: false }),
      supabase
        .from('transactions')
        .select('id, transaction_number, transaction_type, payment_method, amount, transaction_date, reference_number, invoice_id')
        .eq('company_id', wo.company_id)
        .order('transaction_date', { ascending: false })
        .limit(100),
    ]);
    const invoiceData = (invRes.data || []) as Invoice[];
    setInvoices(invoiceData);

    const invoiceIds = new Set(invoiceData.map(i => i.id));
    const relevantTx = (txRes.data || []).filter((t: any) => t.invoice_id && invoiceIds.has(t.invoice_id)) as Transaction[];
    setTransactions(relevantTx);
    setLoading(false);
  }

  async function recordPayment() {
    if (!paymentForm.amount) return;
    setSavingPayment(true);
    const amount = parseFloat(paymentForm.amount);
    await supabase
      .from('work_orders')
      .update({
        payment_collected: (wo.payment_collected || 0) + amount,
        payment_method: paymentForm.method,
        updated_at: new Date().toISOString(),
      })
      .eq('id', wo.id);
    setPaymentForm({ amount: '', method: 'cash', reference: '' });
    setPaymentModal(false);
    setSavingPayment(false);
    onPaymentRecorded();
  }

  const revenue = Number(wo.total_revenue) || 0;
  const laborCost = Number(wo.total_labor_cost) || 0;
  const partsCost = Number(wo.total_parts_cost) || 0;
  const travelFee = Number(wo.travel_fee) || 0;
  const profit = Number(wo.profit_amount) || 0;
  const margin = Number(wo.profit_margin_pct) || 0;
  const totalInvoiced = invoices.reduce((s, i) => s + Number(i.total), 0);
  const totalPaid = invoices.reduce((s, i) => s + Number(i.amount_paid), 0);
  const totalBalanceDue = invoices.reduce((s, i) => s + Number(i.balance_due), 0);
  const onSiteCollected = Number(wo.payment_collected) || 0;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="animate-spin rounded-full h-6 w-6 border-2 border-blue-600 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Profitability Overview */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-blue-600" />
            <h3 className="text-sm font-semibold text-gray-900">Profitability</h3>
          </div>
          {profit !== 0 && (
            <span className={`flex items-center gap-1 text-sm font-bold ${profit >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
              {profit >= 0 ? <ArrowUpRight className="h-4 w-4" /> : <ArrowDownRight className="h-4 w-4" />}
              {margin.toFixed(1)}% margin
            </span>
          )}
        </div>
        <div className="p-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="p-4 rounded-xl bg-blue-50 border border-blue-100">
              <p className="text-xs font-semibold text-blue-600 uppercase tracking-wider">Revenue</p>
              <p className="text-xl font-bold text-blue-900 mt-1">{formatCurrency(revenue)}</p>
            </div>
            <div className="p-4 rounded-xl bg-gray-50 border border-gray-100">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Labor Cost</p>
              <p className="text-xl font-bold text-gray-900 mt-1">{formatCurrency(laborCost)}</p>
            </div>
            <div className="p-4 rounded-xl bg-gray-50 border border-gray-100">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Parts Cost</p>
              <p className="text-xl font-bold text-gray-900 mt-1">{formatCurrency(partsCost)}</p>
            </div>
            <div className={`p-4 rounded-xl border ${profit >= 0 ? 'bg-emerald-50 border-emerald-200' : 'bg-red-50 border-red-200'}`}>
              <p className={`text-xs font-semibold uppercase tracking-wider ${profit >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                Profit
              </p>
              <p className={`text-xl font-bold mt-1 ${profit >= 0 ? 'text-emerald-900' : 'text-red-900'}`}>
                {formatCurrency(profit)}
              </p>
            </div>
          </div>

          {/* Cost breakdown bar */}
          {revenue > 0 && (
            <div className="mt-5">
              <div className="flex items-center justify-between text-xs text-gray-500 mb-1.5">
                <span>Cost breakdown</span>
                <span>Revenue: {formatCurrency(revenue)}</span>
              </div>
              <div className="h-3 rounded-full bg-gray-100 overflow-hidden flex">
                {laborCost > 0 && (
                  <div
                    className="h-full bg-blue-400 transition-all"
                    style={{ width: `${Math.min((laborCost / revenue) * 100, 100)}%` }}
                    title={`Labor: ${formatCurrency(laborCost)}`}
                  />
                )}
                {partsCost > 0 && (
                  <div
                    className="h-full bg-teal-400 transition-all"
                    style={{ width: `${Math.min((partsCost / revenue) * 100, 100)}%` }}
                    title={`Parts: ${formatCurrency(partsCost)}`}
                  />
                )}
                {travelFee > 0 && (
                  <div
                    className="h-full bg-amber-400 transition-all"
                    style={{ width: `${Math.min((travelFee / revenue) * 100, 100)}%` }}
                    title={`Travel: ${formatCurrency(travelFee)}`}
                  />
                )}
                {profit > 0 && (
                  <div
                    className="h-full bg-emerald-400 transition-all"
                    style={{ width: `${(profit / revenue) * 100}%` }}
                    title={`Profit: ${formatCurrency(profit)}`}
                  />
                )}
              </div>
              <div className="flex items-center gap-4 mt-2 flex-wrap">
                <span className="flex items-center gap-1.5 text-xs text-gray-500">
                  <span className="w-2.5 h-2.5 rounded-sm bg-blue-400" /> Labor
                </span>
                <span className="flex items-center gap-1.5 text-xs text-gray-500">
                  <span className="w-2.5 h-2.5 rounded-sm bg-teal-400" /> Parts
                </span>
                {travelFee > 0 && (
                  <span className="flex items-center gap-1.5 text-xs text-gray-500">
                    <span className="w-2.5 h-2.5 rounded-sm bg-amber-400" /> Travel
                  </span>
                )}
                <span className="flex items-center gap-1.5 text-xs text-gray-500">
                  <span className="w-2.5 h-2.5 rounded-sm bg-emerald-400" /> Profit
                </span>
              </div>
            </div>
          )}

          {revenue === 0 && laborCost === 0 && partsCost === 0 && (
            <p className="text-sm text-gray-400 mt-4 text-center">
              No profitability data recorded yet. Costs and revenue update as the job progresses.
            </p>
          )}
        </div>
      </div>

      {/* Billing Summary */}
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <h3 className="text-sm font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <Receipt className="h-4 w-4 text-gray-500" />
          Billing Summary
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-y-3 gap-x-6">
          <div className="flex justify-between text-sm">
            <span className="text-gray-500">Type</span>
            <span className={`font-medium ${wo.billing_type === 'not_billable' ? 'text-gray-400' : 'text-gray-900'}`}>
              {wo.billing_type === 'not_billable' ? 'Not Billable' : wo.billing_type === 'hourly' ? 'Hourly' : 'Fixed Price'}
            </span>
          </div>
          {wo.billing_type === 'hourly' && Number(wo.billing_rate) > 0 && (
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Rate</span>
              <span className="font-medium text-gray-900">${wo.billing_rate}/hr</span>
            </div>
          )}
          {wo.billing_type === 'fixed' && Number(wo.fixed_amount) > 0 && (
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Fixed Price</span>
              <span className="font-medium text-gray-900">{formatCurrency(wo.fixed_amount)}</span>
            </div>
          )}
          {travelFee > 0 && (
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Travel Fee</span>
              <span className="font-medium text-gray-900">{formatCurrency(travelFee)}</span>
            </div>
          )}
          <div className="flex justify-between text-sm">
            <span className="text-gray-500">Line Items</span>
            <span className="font-medium text-gray-900">{formatCurrency(lineItemsTotal)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-500">Billing Status</span>
            <span className={`text-xs font-semibold px-2 py-0.5 rounded-full capitalize ${
              wo.billing_status === 'paid' ? 'bg-emerald-100 text-emerald-700' :
              wo.billing_status === 'invoiced' ? 'bg-blue-100 text-blue-700' :
              'bg-gray-100 text-gray-500'
            }`}>
              {wo.billing_status}
            </span>
          </div>
        </div>
      </div>

      {/* Invoices */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FileText className="h-4 w-4 text-blue-600" />
            <h3 className="text-sm font-semibold text-gray-900">Invoices ({invoices.length})</h3>
          </div>
          {invoices.length > 0 && (
            <div className="flex items-center gap-4 text-xs">
              <span className="text-gray-500">Invoiced: <span className="font-semibold text-gray-900">{formatCurrency(totalInvoiced)}</span></span>
              <span className="text-gray-500">Paid: <span className="font-semibold text-emerald-600">{formatCurrency(totalPaid)}</span></span>
              {totalBalanceDue > 0 && (
                <span className="text-gray-500">Due: <span className="font-semibold text-red-600">{formatCurrency(totalBalanceDue)}</span></span>
              )}
            </div>
          )}
        </div>
        {invoices.length === 0 ? (
          <div className="py-10 text-center">
            <FileText className="h-8 w-8 text-gray-300 mx-auto mb-2" />
            <p className="text-sm text-gray-400">No invoices linked to this work order</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Invoice #</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Date</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Due</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Status</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wide">Total</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wide">Paid</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wide">Balance</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {invoices.map(inv => {
                const st = INVOICE_STATUS_STYLES[inv.status] || INVOICE_STATUS_STYLES.draft;
                const isOverdue = inv.due_date && new Date(inv.due_date) < new Date() && Number(inv.balance_due) > 0 && inv.status !== 'paid';
                return (
                  <tr key={inv.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-mono font-semibold text-blue-600">{inv.invoice_number}</td>
                    <td className="px-4 py-3 text-gray-600">{formatDate(inv.invoice_date)}</td>
                    <td className={`px-4 py-3 ${isOverdue ? 'text-red-600 font-medium' : 'text-gray-600'}`}>
                      {formatDate(inv.due_date)}
                      {isOverdue && <AlertTriangle className="inline h-3 w-3 ml-1" />}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${st.bg} ${st.text}`}>
                        {st.label}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right font-medium text-gray-900">{formatCurrency(inv.total)}</td>
                    <td className="px-4 py-3 text-right text-emerald-600">{formatCurrency(inv.amount_paid)}</td>
                    <td className={`px-4 py-3 text-right font-medium ${Number(inv.balance_due) > 0 ? 'text-red-600' : 'text-gray-400'}`}>
                      {formatCurrency(inv.balance_due)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Payments from Transactions */}
      {transactions.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100">
            <div className="flex items-center gap-2">
              <CreditCard className="h-4 w-4 text-emerald-600" />
              <h3 className="text-sm font-semibold text-gray-900">Payment Transactions ({transactions.length})</h3>
            </div>
          </div>
          <div className="divide-y divide-gray-100">
            {transactions.map(tx => (
              <div key={tx.id} className="px-6 py-3 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                    tx.transaction_type === 'payment' ? 'bg-emerald-100' : 'bg-amber-100'
                  }`}>
                    {tx.transaction_type === 'payment'
                      ? <ArrowUpRight className="h-4 w-4 text-emerald-600" />
                      : <Minus className="h-4 w-4 text-amber-600" />
                    }
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">{tx.transaction_number}</p>
                    <p className="text-xs text-gray-500 capitalize">
                      {tx.payment_method}
                      {tx.reference_number && ` \u00b7 Ref: ${tx.reference_number}`}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className={`text-sm font-semibold ${tx.transaction_type === 'payment' ? 'text-emerald-600' : 'text-gray-700'}`}>
                    {formatCurrency(tx.amount)}
                  </p>
                  <p className="text-xs text-gray-400">{formatDate(tx.transaction_date)}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* On-Site Payment */}
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
            <DollarSign className="h-4 w-4 text-emerald-600" />
            On-Site Collection
          </h3>
          {onSiteCollected > 0 && (
            <span className="text-sm font-bold text-emerald-600">{formatCurrency(onSiteCollected)}</span>
          )}
        </div>
        <div className="flex items-center gap-4">
          <div className="flex-1">
            <p className="text-sm text-gray-600">
              {onSiteCollected > 0
                ? `${formatCurrency(onSiteCollected)} collected on-site via ${wo.payment_method || 'cash'}`
                : 'No on-site payment collected yet'
              }
            </p>
          </div>
          {wo.billing_type !== 'not_billable' && (
            <button
              onClick={() => setPaymentModal(true)}
              className="flex items-center gap-2 px-4 py-2.5 text-sm font-semibold text-white bg-emerald-600 rounded-lg hover:bg-emerald-700 transition-colors"
            >
              <Plus className="h-4 w-4" />
              Record Payment
            </button>
          )}
        </div>
        {wo.billing_type === 'not_billable' && (
          <div className="mt-3 p-3 bg-gray-50 rounded-lg border border-gray-200 flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-gray-400 flex-shrink-0" />
            <p className="text-sm text-gray-500">This work order is not billable.</p>
          </div>
        )}
      </div>

      {/* Payment Modal */}
      {paymentModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/40" onClick={() => setPaymentModal(false)} />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-lg font-semibold text-gray-900">Record Payment</h3>
              <button onClick={() => setPaymentModal(false)} className="p-1 hover:bg-gray-100 rounded-lg">
                <XIcon className="h-5 w-5 text-gray-500" />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Amount</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">$</span>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={paymentForm.amount}
                    onChange={e => setPaymentForm(p => ({ ...p, amount: e.target.value }))}
                    className="w-full pl-7 pr-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    autoFocus
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Payment Method</label>
                <div className="grid grid-cols-4 gap-2">
                  {['cash', 'check', 'card', 'other'].map(method => (
                    <button
                      key={method}
                      onClick={() => setPaymentForm(p => ({ ...p, method }))}
                      className={`py-2 text-sm font-medium rounded-lg capitalize transition-all border-2 ${
                        paymentForm.method === method
                          ? 'border-blue-500 bg-blue-50 text-blue-700'
                          : 'border-gray-200 text-gray-600 hover:border-gray-300'
                      }`}
                    >
                      {method}
                    </button>
                  ))}
                </div>
              </div>
              {paymentForm.method !== 'cash' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Reference #</label>
                  <input
                    type="text"
                    value={paymentForm.reference}
                    onChange={e => setPaymentForm(p => ({ ...p, reference: e.target.value }))}
                    placeholder="Check #, transaction ID..."
                    className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              )}
            </div>
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setPaymentModal(false)}
                className="flex-1 px-4 py-2.5 text-sm font-medium text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={recordPayment}
                disabled={savingPayment || !paymentForm.amount}
                className="flex-1 px-4 py-2.5 text-sm font-medium text-white bg-emerald-600 rounded-lg hover:bg-emerald-700 disabled:opacity-60"
              >
                {savingPayment ? 'Saving...' : 'Record Payment'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
