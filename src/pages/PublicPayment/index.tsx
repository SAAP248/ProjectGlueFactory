import { useState, useEffect } from 'react';
import {
  Shield, CreditCard, Building2, Download, CheckCircle2,
  FileText, Calendar, Clock, AlertTriangle, Printer, Lock,
  ChevronDown, ChevronUp, RefreshCw,
} from 'lucide-react';
import { supabase } from '../../lib/supabase';

interface InvoiceData {
  invoice: any;
  company: any;
  lineItems: any[];
}

type PaymentMethod = 'card' | 'ach';

function toNum(v: unknown): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

function formatCurrency(v: unknown) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(toNum(v));
}

function formatDate(dateStr: string | null | undefined) {
  if (!dateStr) return '--';
  return new Date(dateStr + 'T00:00:00').toLocaleDateString('en-US', {
    month: 'long', day: 'numeric', year: 'numeric',
  });
}

const STATUS_STYLES: Record<string, { bg: string; text: string; label: string }> = {
  paid: { bg: 'bg-emerald-50', text: 'text-emerald-700', label: 'Paid' },
  partial: { bg: 'bg-amber-50', text: 'text-amber-700', label: 'Partially Paid' },
  sent: { bg: 'bg-blue-50', text: 'text-blue-700', label: 'Open' },
  overdue: { bg: 'bg-red-50', text: 'text-red-700', label: 'Past Due' },
  draft: { bg: 'bg-gray-50', text: 'text-gray-600', label: 'Draft' },
};

export default function PublicPayment({ token }: { token: string }) {
  const [data, setData] = useState<InvoiceData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('card');
  const [payAmount, setPayAmount] = useState('');
  const [processing, setProcessing] = useState(false);
  const [paid, setPaid] = useState(false);
  const [confirmationNumber, setConfirmationNumber] = useState('');
  const [detailsExpanded, setDetailsExpanded] = useState(true);
  const [saveMethod, setSaveMethod] = useState(false);

  // Card fields
  const [cardName, setCardName] = useState('');
  const [cardNumber, setCardNumber] = useState('');
  const [cardExpiry, setCardExpiry] = useState('');
  const [cardCvv, setCardCvv] = useState('');
  const [cardZip, setCardZip] = useState('');

  // ACH fields
  const [achName, setAchName] = useState('');
  const [achRouting, setAchRouting] = useState('');
  const [achAccount, setAchAccount] = useState('');
  const [achType, setAchType] = useState<'checking' | 'savings'>('checking');

  useEffect(() => {
    fetchInvoice();
  }, [token]);

  async function fetchInvoice() {
    setLoading(true);
    setError('');

    const { data: invoice, error: invErr } = await supabase
      .from('invoices')
      .select('*')
      .eq('payment_token', token)
      .maybeSingle();

    if (invErr || !invoice) {
      setError('Invoice not found. Please check the link and try again.');
      setLoading(false);
      return;
    }

    let company: any = null;
    if (invoice.company_id) {
      const { data: companyData } = await supabase
        .from('companies')
        .select('id, name, phone, email, billing_address, billing_city, billing_state, billing_zip')
        .eq('id', invoice.company_id)
        .maybeSingle();
      company = companyData;
    }

    const { data: lineItems } = await supabase
      .from('invoice_line_items')
      .select('*')
      .eq('invoice_id', invoice.id)
      .order('sort_order', { ascending: true });

    setData({
      invoice,
      company,
      lineItems: lineItems || [],
    });
    setPayAmount(toNum(invoice.balance_due).toFixed(2));
    setLoading(false);
  }

  function formatCardNumber(val: string) {
    const digits = val.replace(/\D/g, '').slice(0, 16);
    return digits.replace(/(.{4})/g, '$1 ').trim();
  }

  function formatExpiry(val: string) {
    const digits = val.replace(/\D/g, '').slice(0, 4);
    if (digits.length >= 3) return digits.slice(0, 2) + ' / ' + digits.slice(2);
    return digits;
  }

  function handlePay() {
    setProcessing(true);
    const conf = 'WH-' + Date.now().toString(36).toUpperCase() + Math.random().toString(36).slice(2, 6).toUpperCase();
    setTimeout(() => {
      setConfirmationNumber(conf);
      setProcessing(false);
      setPaid(true);
    }, 2000);
  }

  function canSubmit() {
    const amount = parseFloat(payAmount);
    if (!amount || amount <= 0) return false;
    if (paymentMethod === 'card') {
      return cardName.trim().length > 0
        && cardNumber.replace(/\s/g, '').length >= 15
        && cardExpiry.replace(/\D/g, '').length === 4
        && cardCvv.length >= 3
        && cardZip.length >= 5;
    }
    return achName.trim().length > 0
      && achRouting.replace(/\D/g, '').length === 9
      && achAccount.replace(/\D/g, '').length >= 4;
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-3 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-sm text-gray-500">Loading invoice...</p>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
        <div className="bg-white rounded-2xl shadow-lg p-8 max-w-md w-full text-center">
          <Shield className="h-12 w-12 text-gray-300 mx-auto mb-4" />
          <h1 className="text-xl font-bold text-gray-900 mb-2">Invoice Not Found</h1>
          <p className="text-sm text-gray-500">{error || 'Please check the link and try again.'}</p>
        </div>
      </div>
    );
  }

  const { invoice, company, lineItems } = data;
  const status = STATUS_STYLES[invoice.status] || STATUS_STYLES.sent;
  const balanceDue = toNum(invoice.balance_due);
  const isPaid = invoice.status === 'paid' || balanceDue <= 0;

  if (paid) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-lg w-full text-center">
          <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle2 className="h-8 w-8 text-emerald-600" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Payment Successful</h1>
          <p className="text-gray-500 mb-6">Your payment has been received and is being processed.</p>

          <div className="bg-slate-50 rounded-xl p-5 mb-6 text-left space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Confirmation</span>
              <span className="font-mono font-semibold text-gray-900">{confirmationNumber}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Amount Paid</span>
              <span className="font-semibold text-gray-900">{formatCurrency(payAmount)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Invoice</span>
              <span className="font-semibold text-gray-900">{invoice.invoice_number}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Method</span>
              <span className="font-semibold text-gray-900">
                {paymentMethod === 'card'
                  ? `Card ending in ${cardNumber.replace(/\s/g, '').slice(-4)}`
                  : `Bank account ending in ${achAccount.slice(-4)}`
                }
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Date</span>
              <span className="font-semibold text-gray-900">{new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</span>
            </div>
          </div>

          {saveMethod && (
            <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 mb-6 flex items-start gap-3 text-left">
              <RefreshCw className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-semibold text-blue-900">Payment Method Saved</p>
                <p className="text-xs text-blue-700 mt-0.5">
                  Your {paymentMethod === 'card'
                    ? `card ending in ${cardNumber.replace(/\s/g, '').slice(-4)}`
                    : `bank account ending in ${achAccount.slice(-4)}`
                  } has been saved for automatic subscription payments.
                </p>
              </div>
            </div>
          )}

          <button
            onClick={() => window.print()}
            className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
          >
            <Printer className="h-4 w-4" /> Print Receipt
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Top bar */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-slate-900 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-sm">WH</span>
            </div>
            <div>
              <h1 className="text-sm font-bold text-gray-900">Workhorse Investments, LLC</h1>
              <p className="text-xs text-gray-500">Security &middot; Automation &middot; Integration</p>
            </div>
          </div>
          <div className="flex items-center gap-1.5 text-xs text-gray-400">
            <Lock className="h-3.5 w-3.5" />
            <span>Secure Payment</span>
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 sm:px-6 py-8 space-y-6">

        {/* Invoice summary card */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="p-6 sm:p-8">
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-6">
              <div>
                <div className="flex items-center gap-3 mb-1">
                  <h2 className="text-lg font-bold text-gray-900">Invoice {invoice.invoice_number}</h2>
                  <span className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-semibold ${status.bg} ${status.text}`}>
                    {status.label}
                  </span>
                </div>
                {company && (
                  <p className="text-sm text-gray-500">Billed to <span className="font-medium text-gray-700">{company.name}</span></p>
                )}
              </div>
              {!isPaid && (
                <div className="text-right">
                  <p className="text-xs uppercase tracking-wider text-gray-400 font-medium mb-0.5">Amount Due</p>
                  <p className="text-3xl font-bold text-gray-900">{formatCurrency(balanceDue)}</p>
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
              <div>
                <p className="text-gray-400 text-xs font-medium uppercase tracking-wider mb-0.5">Invoice Date</p>
                <div className="flex items-center gap-1.5 text-gray-800 font-medium">
                  <Calendar className="h-3.5 w-3.5 text-gray-400" />
                  {formatDate(invoice.invoice_date)}
                </div>
              </div>
              <div>
                <p className="text-gray-400 text-xs font-medium uppercase tracking-wider mb-0.5">Due Date</p>
                <div className="flex items-center gap-1.5 text-gray-800 font-medium">
                  <Clock className="h-3.5 w-3.5 text-gray-400" />
                  {formatDate(invoice.due_date)}
                </div>
              </div>
              <div>
                <p className="text-gray-400 text-xs font-medium uppercase tracking-wider mb-0.5">Terms</p>
                <p className="text-gray-800 font-medium">{invoice.terms || 'Net 30'}</p>
              </div>
              <div>
                <p className="text-gray-400 text-xs font-medium uppercase tracking-wider mb-0.5">Invoice Total</p>
                <p className="text-gray-800 font-medium">{formatCurrency(invoice.total)}</p>
              </div>
            </div>
          </div>

          {invoice.status === 'overdue' && (
            <div className="px-6 sm:px-8 py-3 bg-red-50 border-t border-red-100 flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-red-500 flex-shrink-0" />
              <p className="text-xs text-red-700 font-medium">This invoice is past due. Please submit payment at your earliest convenience.</p>
            </div>
          )}
        </div>

        {/* Invoice line items (collapsible) */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <button
            onClick={() => setDetailsExpanded(!detailsExpanded)}
            className="w-full px-6 sm:px-8 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
          >
            <div className="flex items-center gap-2">
              <FileText className="h-4 w-4 text-gray-400" />
              <span className="text-sm font-semibold text-gray-900">Invoice Details</span>
              <span className="text-xs text-gray-400">{lineItems.length} item{lineItems.length !== 1 ? 's' : ''}</span>
            </div>
            {detailsExpanded ? <ChevronUp className="h-4 w-4 text-gray-400" /> : <ChevronDown className="h-4 w-4 text-gray-400" />}
          </button>

          {detailsExpanded && (
            <div className="border-t border-gray-100">
              {lineItems.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-gray-50">
                        <th className="px-6 sm:px-8 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Description</th>
                        <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider w-20">Qty</th>
                        <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider w-28">Unit Price</th>
                        <th className="px-6 sm:px-8 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider w-28">Amount</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {lineItems.map((item: any) => (
                        <tr key={item.id}>
                          <td className="px-6 sm:px-8 py-3.5 text-gray-800 font-medium">{item.description}</td>
                          <td className="px-4 py-3.5 text-right text-gray-600">{toNum(item.quantity)}</td>
                          <td className="px-4 py-3.5 text-right text-gray-600">{formatCurrency(item.unit_price)}</td>
                          <td className="px-6 sm:px-8 py-3.5 text-right font-semibold text-gray-900">{formatCurrency(item.total)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="px-6 sm:px-8 py-6 text-center text-sm text-gray-400">No line items on this invoice.</div>
              )}

              {/* Totals */}
              <div className="border-t border-gray-100 px-6 sm:px-8 py-5">
                <div className="max-w-xs ml-auto space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Subtotal</span>
                    <span className="text-gray-800">{formatCurrency(invoice.subtotal)}</span>
                  </div>
                  {toNum(invoice.tax) > 0 && (
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">Tax</span>
                      <span className="text-gray-800">{formatCurrency(invoice.tax)}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-sm font-semibold pt-2 border-t border-gray-100">
                    <span className="text-gray-700">Total</span>
                    <span className="text-gray-900">{formatCurrency(invoice.total)}</span>
                  </div>
                  {toNum(invoice.amount_paid) > 0 && (
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">Payments Received</span>
                      <span className="text-emerald-600 font-medium">-{formatCurrency(invoice.amount_paid)}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-base font-bold pt-2 border-t border-gray-200">
                    <span className="text-gray-900">Balance Due</span>
                    <span className={balanceDue > 0 ? 'text-gray-900' : 'text-emerald-600'}>{formatCurrency(balanceDue)}</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Download PDF */}
        <div className="flex justify-center">
          <button className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-medium text-gray-600 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 hover:border-gray-300 transition-colors shadow-sm">
            <Download className="h-4 w-4" />
            Download Invoice PDF
          </button>
        </div>

        {/* Payment section */}
        {!isPaid ? (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="px-6 sm:px-8 py-5 border-b border-gray-100">
              <h3 className="text-base font-bold text-gray-900">Make a Payment</h3>
              <p className="text-xs text-gray-500 mt-0.5">Select your preferred payment method below.</p>
            </div>

            {/* Payment method tabs */}
            <div className="px-6 sm:px-8 pt-5">
              <div className="flex gap-3 mb-6">
                <button
                  onClick={() => setPaymentMethod('card')}
                  className={`flex-1 flex items-center justify-center gap-2.5 py-3 px-4 rounded-xl border-2 text-sm font-semibold transition-all ${
                    paymentMethod === 'card'
                      ? 'border-blue-600 bg-blue-50 text-blue-700 shadow-sm'
                      : 'border-gray-200 text-gray-500 hover:border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  <CreditCard className="h-4.5 w-4.5" />
                  Credit / Debit Card
                </button>
                <button
                  onClick={() => setPaymentMethod('ach')}
                  className={`flex-1 flex items-center justify-center gap-2.5 py-3 px-4 rounded-xl border-2 text-sm font-semibold transition-all ${
                    paymentMethod === 'ach'
                      ? 'border-blue-600 bg-blue-50 text-blue-700 shadow-sm'
                      : 'border-gray-200 text-gray-500 hover:border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  <Building2 className="h-4.5 w-4.5" />
                  Bank Transfer (ACH)
                </button>
              </div>

              {/* Payment amount */}
              <div className="mb-5">
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Payment Amount</label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 font-medium">$</span>
                  <input
                    type="text"
                    value={payAmount}
                    onChange={e => {
                      const val = e.target.value.replace(/[^0-9.]/g, '');
                      setPayAmount(val);
                    }}
                    className="w-full pl-8 pr-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-medium"
                  />
                </div>
                {parseFloat(payAmount) > 0 && parseFloat(payAmount) < balanceDue && (
                  <p className="text-xs text-amber-600 mt-1">Partial payment -- {formatCurrency(balanceDue - parseFloat(payAmount))} will remain after this payment.</p>
                )}
              </div>

              {/* Card form */}
              {paymentMethod === 'card' && (
                <div className="space-y-4 pb-6">
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Cardholder Name</label>
                    <input
                      type="text"
                      value={cardName}
                      onChange={e => setCardName(e.target.value)}
                      placeholder="John Smith"
                      className="w-full px-3.5 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Card Number</label>
                    <input
                      type="text"
                      value={cardNumber}
                      onChange={e => setCardNumber(formatCardNumber(e.target.value))}
                      placeholder="4242 4242 4242 4242"
                      maxLength={19}
                      className="w-full px-3.5 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-mono tracking-wider"
                    />
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Expiration</label>
                      <input
                        type="text"
                        value={cardExpiry}
                        onChange={e => setCardExpiry(formatExpiry(e.target.value))}
                        placeholder="MM / YY"
                        maxLength={7}
                        className="w-full px-3.5 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-center font-mono"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">CVV</label>
                      <input
                        type="text"
                        value={cardCvv}
                        onChange={e => setCardCvv(e.target.value.replace(/\D/g, '').slice(0, 4))}
                        placeholder="123"
                        maxLength={4}
                        className="w-full px-3.5 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-center font-mono"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">ZIP Code</label>
                      <input
                        type="text"
                        value={cardZip}
                        onChange={e => setCardZip(e.target.value.replace(/\D/g, '').slice(0, 5))}
                        placeholder="10001"
                        maxLength={5}
                        className="w-full px-3.5 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-center font-mono"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* ACH form */}
              {paymentMethod === 'ach' && (
                <div className="space-y-4 pb-6">
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Account Holder Name</label>
                    <input
                      type="text"
                      value={achName}
                      onChange={e => setAchName(e.target.value)}
                      placeholder="John Smith"
                      className="w-full px-3.5 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Routing Number</label>
                    <input
                      type="text"
                      value={achRouting}
                      onChange={e => setAchRouting(e.target.value.replace(/\D/g, '').slice(0, 9))}
                      placeholder="021000021"
                      maxLength={9}
                      className="w-full px-3.5 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-mono tracking-wider"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Account Number</label>
                    <input
                      type="text"
                      value={achAccount}
                      onChange={e => setAchAccount(e.target.value.replace(/\D/g, '').slice(0, 17))}
                      placeholder="1234567890"
                      className="w-full px-3.5 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-mono tracking-wider"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Account Type</label>
                    <div className="flex gap-3">
                      {(['checking', 'savings'] as const).map(type => (
                        <button
                          key={type}
                          onClick={() => setAchType(type)}
                          className={`flex-1 py-2.5 text-sm font-medium rounded-lg border-2 transition-all ${
                            achType === type
                              ? 'border-blue-600 bg-blue-50 text-blue-700'
                              : 'border-gray-200 text-gray-500 hover:border-gray-300'
                          }`}
                        >
                          {type.charAt(0).toUpperCase() + type.slice(1)}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Save payment method toggle */}
              <div className="pb-5">
                <label className="flex items-start gap-3 cursor-pointer group">
                  <div className="relative mt-0.5 flex-shrink-0">
                    <input
                      type="checkbox"
                      checked={saveMethod}
                      onChange={e => setSaveMethod(e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-5 h-5 rounded border-2 border-gray-300 peer-checked:border-blue-600 peer-checked:bg-blue-600 transition-colors flex items-center justify-center group-hover:border-gray-400 peer-checked:group-hover:border-blue-700">
                      {saveMethod && (
                        <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                      )}
                    </div>
                  </div>
                  <div>
                    <span className="text-sm font-semibold text-gray-800">Save this payment method</span>
                    <p className="text-xs text-gray-500 mt-0.5">
                      Keep this {paymentMethod === 'card' ? 'card' : 'bank account'} on file for automatic subscription and recurring payments.
                    </p>
                  </div>
                </label>
              </div>
            </div>

            {/* Pay button */}
            <div className="px-6 sm:px-8 py-5 bg-gray-50 border-t border-gray-100">
              <button
                onClick={handlePay}
                disabled={!canSubmit() || processing}
                className="w-full py-3.5 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white text-sm font-bold rounded-xl transition-colors flex items-center justify-center gap-2 shadow-sm"
              >
                {processing ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    <Lock className="h-4 w-4" />
                    Pay {payAmount ? formatCurrency(payAmount) : ''}
                  </>
                )}
              </button>
              <div className="flex items-center justify-center gap-1.5 mt-3 text-xs text-gray-400">
                <Shield className="h-3 w-3" />
                <span>256-bit SSL encrypted &middot; Your information is secure</span>
              </div>
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 sm:p-8 text-center">
            <div className="w-14 h-14 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle2 className="h-7 w-7 text-emerald-600" />
            </div>
            <h3 className="text-lg font-bold text-gray-900 mb-1">This Invoice Has Been Paid</h3>
            <p className="text-sm text-gray-500">No payment is required at this time. Thank you!</p>
          </div>
        )}

        {/* Footer */}
        <footer className="text-center pb-8 space-y-1">
          <p className="text-xs text-gray-400">Workhorse Investments, LLC</p>
          {company && (
            <p className="text-xs text-gray-400">
              {[company.billing_address, company.billing_city, company.billing_state, company.billing_zip].filter(Boolean).join(', ')}
            </p>
          )}
          {company?.phone && <p className="text-xs text-gray-400">{company.phone} &middot; {company.email}</p>}
        </footer>
      </main>
    </div>
  );
}
