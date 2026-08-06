import { useState, useEffect, useRef, useCallback } from 'react';
import {
  Send,
  ChevronDown,
  CreditCard,
  MoreHorizontal,
  DollarSign,
  Calendar,
  Percent,
  FileText,
  Trash2,
  ExternalLink,
  RefreshCw,
  AlertTriangle,
  Check,
  Copy,
  X,
  Tag,
  Clock,
  Receipt,
  Link,
} from 'lucide-react';
import {
  updateInvoice,
  recordPayment,
  addLineItem,
  recalculateInvoiceTotals,
} from './useInvoices';
import { supabase } from '../../lib/supabase';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface Props {
  invoice: {
    id: string;
    invoice_number: string;
    status: string;
    invoice_date: string;
    due_date: string;
    balance_due: number;
    total: number;
    payment_token: string | null;
    discount: number;
    discount_type: string;
    company_id: string;
  };
  onRefresh: () => void;
  onDelete: () => void;
}

// ---------------------------------------------------------------------------
// Status helpers
// ---------------------------------------------------------------------------

const STATUSES = ['draft', 'sent', 'paid', 'partial', 'overdue', 'void'] as const;

const STATUS_DOT_COLOR: Record<string, string> = {
  draft: 'bg-gray-400',
  sent: 'bg-blue-500',
  paid: 'bg-emerald-500',
  partial: 'bg-amber-500',
  overdue: 'bg-red-500',
  void: 'bg-slate-400',
};

const STATUS_LABEL: Record<string, string> = {
  draft: 'Draft',
  sent: 'Sent',
  paid: 'Paid',
  partial: 'Partial',
  overdue: 'Overdue',
  void: 'Void',
};

// ---------------------------------------------------------------------------
// Generic hooks
// ---------------------------------------------------------------------------

/** Close a dropdown/popover when clicking outside the container ref. */
function useClickOutside(
  ref: React.RefObject<HTMLElement | null>,
  handler: () => void,
) {
  useEffect(() => {
    function onPointerDown(e: PointerEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        handler();
      }
    }
    document.addEventListener('pointerdown', onPointerDown);
    return () => document.removeEventListener('pointerdown', onPointerDown);
  }, [ref, handler]);
}

// ---------------------------------------------------------------------------
// Reusable tiny components
// ---------------------------------------------------------------------------

function Backdrop({ onClick }: { onClick: () => void }) {
  return (
    <div
      className="fixed inset-0 bg-black/40 z-[60]"
      onClick={onClick}
    />
  );
}

function ModalShell({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <>
      <Backdrop onClick={onClose} />
      <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 pointer-events-none">
        <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 pointer-events-auto">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
            <button
              onClick={onClose}
              className="p-1 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <X className="h-5 w-5 text-gray-500" />
            </button>
          </div>
          {children}
        </div>
      </div>
    </>
  );
}

function Toast({ message }: { message: string }) {
  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[70] flex items-center gap-2 bg-gray-900 text-white text-sm font-medium px-4 py-2.5 rounded-xl shadow-lg animate-[fadeIn_150ms_ease]">
      <Check className="h-4 w-4 text-emerald-400" />
      {message}
    </div>
  );
}

// ---------------------------------------------------------------------------
// InvoiceActions component
// ---------------------------------------------------------------------------

export default function InvoiceActions({ invoice, onRefresh, onDelete }: Props) {
  // ---- dropdown visibility ----
  const [sendOpen, setSendOpen] = useState(false);
  const [statusOpen, setStatusOpen] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);

  // ---- modals ----
  const [paymentModal, setPaymentModal] = useState(false);
  const [discountModal, setDiscountModal] = useState(false);
  const [invoiceDateModal, setInvoiceDateModal] = useState(false);
  const [dueDateModal, setDueDateModal] = useState(false);
  const [invoiceNumberModal, setInvoiceNumberModal] = useState(false);
  const [writeOffConfirm, setWriteOffConfirm] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(false);

  // ---- toast ----
  const [toast, setToast] = useState<string | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout>>();
  function flash(msg: string) {
    setToast(msg);
    clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 2000);
  }

  // ---- busy state ----
  const [busy, setBusy] = useState(false);

  // ---- click-outside refs ----
  const sendRef = useRef<HTMLDivElement>(null);
  const statusRef = useRef<HTMLDivElement>(null);
  const moreRef = useRef<HTMLDivElement>(null);
  useClickOutside(sendRef, useCallback(() => setSendOpen(false), []));
  useClickOutside(statusRef, useCallback(() => setStatusOpen(false), []));
  useClickOutside(moreRef, useCallback(() => setMoreOpen(false), []));

  // ---- helpers ----
  function closeAll() {
    setSendOpen(false);
    setStatusOpen(false);
    setMoreOpen(false);
  }

  // ======== SEND dropdown ========
  function handleEmailInvoice() {
    closeAll();
    alert('Email sending coming soon');
  }

  async function handleCopyPaymentLink() {
    closeAll();
    if (!invoice.payment_token) {
      flash('No payment token available');
      return;
    }
    const url = `${window.location.origin}/#/pay/${invoice.payment_token}`;
    try {
      await navigator.clipboard.writeText(url);
      flash('Copied!');
    } catch {
      flash('Failed to copy');
    }
  }

  // ======== STATUS change ========
  async function handleStatusChange(status: string) {
    closeAll();
    setBusy(true);
    const { error } = await updateInvoice(invoice.id, { status });
    setBusy(false);
    if (error) {
      flash(`Error: ${error}`);
    } else {
      flash(`Status → ${STATUS_LABEL[status] || status}`);
      onRefresh();
    }
  }

  // ======== PAYMENT ========
  const [payAmount, setPayAmount] = useState('');
  const [payMethod, setPayMethod] = useState('check');
  const [payRef, setPayRef] = useState('');

  function openPaymentModal() {
    setPayAmount(String(invoice.balance_due));
    setPayMethod('check');
    setPayRef('');
    setPaymentModal(true);
  }

  async function handleRecordPayment() {
    const amt = parseFloat(payAmount);
    if (isNaN(amt) || amt <= 0) {
      flash('Enter a valid amount');
      return;
    }
    setBusy(true);
    const { error } = await recordPayment(invoice.id, amt, payMethod, payRef);
    setBusy(false);
    setPaymentModal(false);
    if (error) {
      flash(`Error: ${error}`);
    } else {
      flash('Payment recorded');
      onRefresh();
    }
  }

  // ======== DISCOUNT ========
  const [discountAmt, setDiscountAmt] = useState('');
  const [discountType, setDiscountType] = useState<'flat' | 'percentage'>('flat');

  function openDiscountModal() {
    closeAll();
    setDiscountAmt(String(invoice.discount || ''));
    setDiscountType((invoice.discount_type as 'flat' | 'percentage') || 'flat');
    setDiscountModal(true);
  }

  async function handleUpdateDiscount() {
    const amt = parseFloat(discountAmt);
    if (isNaN(amt) || amt < 0) {
      flash('Enter a valid discount');
      return;
    }
    setBusy(true);
    const { error } = await updateInvoice(invoice.id, {
      discount: amt,
      discount_type: discountType,
    });
    if (!error) {
      await recalculateInvoiceTotals(invoice.id);
    }
    setBusy(false);
    setDiscountModal(false);
    if (error) {
      flash(`Error: ${error}`);
    } else {
      flash('Discount updated');
      onRefresh();
    }
  }

  // ======== INVOICE DATE ========
  const [newInvoiceDate, setNewInvoiceDate] = useState('');

  function openInvoiceDateModal() {
    closeAll();
    setNewInvoiceDate(invoice.invoice_date || '');
    setInvoiceDateModal(true);
  }

  async function handleUpdateInvoiceDate() {
    if (!newInvoiceDate) {
      flash('Select a date');
      return;
    }
    setBusy(true);
    const { error } = await updateInvoice(invoice.id, {
      invoice_date: newInvoiceDate,
    });
    setBusy(false);
    setInvoiceDateModal(false);
    if (error) {
      flash(`Error: ${error}`);
    } else {
      flash('Invoice date updated');
      onRefresh();
    }
  }

  // ======== DUE DATE ========
  const [newDueDate, setNewDueDate] = useState('');

  function openDueDateModal() {
    closeAll();
    setNewDueDate(invoice.due_date || '');
    setDueDateModal(true);
  }

  async function handleUpdateDueDate() {
    if (!newDueDate) {
      flash('Select a date');
      return;
    }
    setBusy(true);
    const { error } = await updateInvoice(invoice.id, {
      due_date: newDueDate,
    });
    setBusy(false);
    setDueDateModal(false);
    if (error) {
      flash(`Error: ${error}`);
    } else {
      flash('Due date updated');
      onRefresh();
    }
  }

  // ======== ADD CC FEE ========
  async function handleAddCCFee() {
    closeAll();
    const feeAmount = Math.round(invoice.total * 0.03 * 100) / 100;
    setBusy(true);
    const { error } = await addLineItem(invoice.id, {
      product_id: null,
      description: 'Credit Card Processing Fee',
      quantity: 1,
      unit_price: feeAmount,
      total: feeAmount,
    });
    setBusy(false);
    if (error) {
      flash(`Error: ${error}`);
    } else {
      flash('CC fee added');
      onRefresh();
    }
  }

  // ======== ADD LATE FEE ========
  async function handleAddLateFee() {
    closeAll();
    setBusy(true);
    const { error } = await addLineItem(invoice.id, {
      product_id: null,
      description: 'Late Fee',
      quantity: 1,
      unit_price: 25,
      total: 25,
    });
    setBusy(false);
    if (error) {
      flash(`Error: ${error}`);
    } else {
      flash('Late fee added');
      onRefresh();
    }
  }

  // ======== ASSIGN NEW INVOICE NUMBER ========
  const [newInvoiceNumber, setNewInvoiceNumber] = useState('');

  function openInvoiceNumberModal() {
    closeAll();
    setNewInvoiceNumber(invoice.invoice_number || '');
    setInvoiceNumberModal(true);
  }

  async function handleUpdateInvoiceNumber() {
    if (!newInvoiceNumber.trim()) {
      flash('Enter a valid number');
      return;
    }
    setBusy(true);
    // updateInvoice omits invoice_number from its type, so we call supabase directly
    const { error } = await supabase
      .from('invoices')
      .update({
        invoice_number: newInvoiceNumber.trim(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', invoice.id);
    setBusy(false);
    setInvoiceNumberModal(false);
    if (error) {
      flash(`Error: ${error.message}`);
    } else {
      flash('Invoice number updated');
      onRefresh();
    }
  }

  // ======== WRITE OFF ========
  function openWriteOff() {
    closeAll();
    setWriteOffConfirm(true);
  }

  async function handleWriteOff() {
    setBusy(true);
    const { error } = await updateInvoice(invoice.id, {
      balance_due: 0,
      status: 'void',
    });
    setBusy(false);
    setWriteOffConfirm(false);
    if (error) {
      flash(`Error: ${error}`);
    } else {
      flash('Invoice written off');
      onRefresh();
    }
  }

  // ======== DELETE ========
  function openDeleteConfirm() {
    closeAll();
    setDeleteConfirm(true);
  }

  function handleConfirmDelete() {
    setDeleteConfirm(false);
    onDelete();
  }

  // =========================================================================
  // Render
  // =========================================================================

  return (
    <>
      <div className="flex items-center gap-2 flex-wrap">
        {/* ──────────── 1. Send Invoice ──────────── */}
        <div ref={sendRef} className="relative">
          <button
            onClick={() => {
              setStatusOpen(false);
              setMoreOpen(false);
              setSendOpen((v) => !v);
            }}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 shadow-sm transition-colors"
          >
            <Send className="h-4 w-4" />
            Send Invoice
            <ChevronDown className="h-3.5 w-3.5 ml-0.5" />
          </button>

          {sendOpen && (
            <div className="absolute left-0 top-full mt-1 w-52 bg-white border border-gray-200 rounded-xl shadow-xl z-50 py-1 animate-[fadeIn_100ms_ease]">
              <button
                onClick={handleEmailInvoice}
                className="w-full flex items-center gap-2.5 px-3.5 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
              >
                <Send className="h-4 w-4 text-gray-400" />
                Email Invoice
              </button>
              <button
                onClick={handleCopyPaymentLink}
                className="w-full flex items-center gap-2.5 px-3.5 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
              >
                <Copy className="h-4 w-4 text-gray-400" />
                Copy Payment Link
              </button>
            </div>
          )}
        </div>

        {/* ──────────── 2. Status ──────────── */}
        <div ref={statusRef} className="relative">
          <button
            onClick={() => {
              setSendOpen(false);
              setMoreOpen(false);
              setStatusOpen((v) => !v);
            }}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg text-sm font-medium text-gray-700 bg-white border border-gray-300 hover:bg-gray-50 shadow-sm transition-colors"
          >
            <span
              className={`inline-block h-2.5 w-2.5 rounded-full ${STATUS_DOT_COLOR[invoice.status] || 'bg-gray-400'}`}
            />
            {STATUS_LABEL[invoice.status] || invoice.status}
            <ChevronDown className="h-3.5 w-3.5 text-gray-400" />
          </button>

          {statusOpen && (
            <div className="absolute left-0 top-full mt-1 w-44 bg-white border border-gray-200 rounded-xl shadow-xl z-50 py-1 animate-[fadeIn_100ms_ease]">
              {STATUSES.map((s) => (
                <button
                  key={s}
                  onClick={() => handleStatusChange(s)}
                  className={`w-full flex items-center gap-2.5 px-3.5 py-2 text-sm transition-colors ${
                    invoice.status === s
                      ? 'bg-blue-50 text-blue-700 font-medium'
                      : 'text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  <span
                    className={`inline-block h-2.5 w-2.5 rounded-full ${STATUS_DOT_COLOR[s]}`}
                  />
                  {STATUS_LABEL[s]}
                  {invoice.status === s && (
                    <Check className="h-3.5 w-3.5 ml-auto text-blue-600" />
                  )}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* ──────────── 3. Make a Payment ──────────── */}
        <button
          onClick={openPaymentModal}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-sm font-medium text-gray-700 bg-white border border-gray-300 hover:bg-gray-50 shadow-sm transition-colors"
        >
          <DollarSign className="h-4 w-4 text-emerald-600" />
          Make a Payment
        </button>

        {/* ──────────── 4. More Actions ──────────── */}
        <div ref={moreRef} className="relative">
          <button
            onClick={() => {
              setSendOpen(false);
              setStatusOpen(false);
              setMoreOpen((v) => !v);
            }}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium text-gray-700 bg-white border border-gray-300 hover:bg-gray-50 shadow-sm transition-colors"
          >
            <MoreHorizontal className="h-4 w-4" />
          </button>

          {moreOpen && (
            <div className="absolute right-0 top-full mt-1 w-56 bg-white border border-gray-200 rounded-xl shadow-xl z-50 py-1 animate-[fadeIn_100ms_ease] max-h-[70vh] overflow-y-auto">
              {/* Update Discount */}
              <button
                onClick={openDiscountModal}
                className="w-full flex items-center gap-2.5 px-3.5 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
              >
                <Percent className="h-4 w-4 text-gray-400" />
                Update Discount
              </button>
              {/* Update Invoice Date */}
              <button
                onClick={openInvoiceDateModal}
                className="w-full flex items-center gap-2.5 px-3.5 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
              >
                <Calendar className="h-4 w-4 text-gray-400" />
                Update Invoice Date
              </button>
              {/* Update Due Date */}
              <button
                onClick={openDueDateModal}
                className="w-full flex items-center gap-2.5 px-3.5 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
              >
                <Clock className="h-4 w-4 text-gray-400" />
                Update Due Date
              </button>
              {/* Add CC Fee */}
              <button
                onClick={handleAddCCFee}
                className="w-full flex items-center gap-2.5 px-3.5 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
              >
                <CreditCard className="h-4 w-4 text-gray-400" />
                Add CC Fee
              </button>
              {/* Add Late Fee */}
              <button
                onClick={handleAddLateFee}
                className="w-full flex items-center gap-2.5 px-3.5 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
              >
                <Receipt className="h-4 w-4 text-gray-400" />
                Add Late Fee
              </button>
              {/* Assign New Invoice Number */}
              <button
                onClick={openInvoiceNumberModal}
                className="w-full flex items-center gap-2.5 px-3.5 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
              >
                <Tag className="h-4 w-4 text-gray-400" />
                Assign New Invoice Number
              </button>
              {/* Write Off */}
              <button
                onClick={openWriteOff}
                className="w-full flex items-center gap-2.5 px-3.5 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
              >
                <AlertTriangle className="h-4 w-4 text-gray-400" />
                Write Off
              </button>

              {/* ── separator ── */}
              <div className="border-t border-gray-100 my-1" />

              {/* Grayed-out placeholders */}
              <button
                disabled
                className="w-full flex items-center gap-2.5 px-3.5 py-2.5 text-sm text-gray-300 cursor-not-allowed"
              >
                <FileText className="h-4 w-4" />
                Create PO
              </button>
              <button
                disabled
                className="w-full flex items-center gap-2.5 px-3.5 py-2.5 text-sm text-gray-300 cursor-not-allowed"
              >
                <RefreshCw className="h-4 w-4" />
                Go to Subscription
              </button>
              <button
                disabled
                className="w-full flex items-center gap-2.5 px-3.5 py-2.5 text-sm text-gray-300 cursor-not-allowed"
              >
                <ExternalLink className="h-4 w-4" />
                Sync w/ QBO
              </button>
              <button
                disabled
                className="w-full flex items-center gap-2.5 px-3.5 py-2.5 text-sm text-gray-300 cursor-not-allowed"
              >
                <Link className="h-4 w-4" />
                QBO Details
              </button>

              {/* ── separator ── */}
              <div className="border-t border-gray-100 my-1" />

              {/* Delete Invoice */}
              <button
                onClick={openDeleteConfirm}
                className="w-full flex items-center gap-2.5 px-3.5 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors"
              >
                <Trash2 className="h-4 w-4" />
                Delete Invoice
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ==================================================================
          MODALS
      ================================================================== */}

      {/* ── Payment Modal ── */}
      {paymentModal && (
        <ModalShell title="Record a Payment" onClose={() => setPaymentModal(false)}>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Amount
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">
                  $
                </span>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={payAmount}
                  onChange={(e) => setPayAmount(e.target.value)}
                  className="w-full pl-7 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Payment Method
              </label>
              <select
                value={payMethod}
                onChange={(e) => setPayMethod(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
              >
                <option value="credit_card">Credit Card</option>
                <option value="ach">ACH</option>
                <option value="check">Check</option>
                <option value="cash">Cash</option>
                <option value="other">Other</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Reference Number
              </label>
              <input
                type="text"
                value={payRef}
                onChange={(e) => setPayRef(e.target.value)}
                placeholder="e.g. check #, confirmation code"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div className="flex gap-3 mt-6">
            <button
              onClick={() => setPaymentModal(false)}
              disabled={busy}
              className="flex-1 px-4 py-2.5 text-sm font-medium text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-60"
            >
              Cancel
            </button>
            <button
              onClick={handleRecordPayment}
              disabled={busy}
              className="flex-1 px-4 py-2.5 text-sm font-medium text-white bg-emerald-600 rounded-lg hover:bg-emerald-700 disabled:opacity-60 flex items-center justify-center gap-2"
            >
              <DollarSign className="h-4 w-4" />
              {busy ? 'Saving...' : 'Record Payment'}
            </button>
          </div>
        </ModalShell>
      )}

      {/* ── Discount Modal ── */}
      {discountModal && (
        <ModalShell title="Update Discount" onClose={() => setDiscountModal(false)}>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Discount Amount
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={discountAmt}
                onChange={(e) => setDiscountAmt(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Type
              </label>
              <div className="flex rounded-lg border border-gray-300 overflow-hidden">
                <button
                  onClick={() => setDiscountType('flat')}
                  className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 text-sm font-medium transition-colors ${
                    discountType === 'flat'
                      ? 'bg-blue-600 text-white'
                      : 'bg-white text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  <DollarSign className="h-3.5 w-3.5" />
                  Flat ($)
                </button>
                <button
                  onClick={() => setDiscountType('percentage')}
                  className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 text-sm font-medium transition-colors ${
                    discountType === 'percentage'
                      ? 'bg-blue-600 text-white'
                      : 'bg-white text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  <Percent className="h-3.5 w-3.5" />
                  Percentage (%)
                </button>
              </div>
            </div>
          </div>

          <div className="flex gap-3 mt-6">
            <button
              onClick={() => setDiscountModal(false)}
              disabled={busy}
              className="flex-1 px-4 py-2.5 text-sm font-medium text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-60"
            >
              Cancel
            </button>
            <button
              onClick={handleUpdateDiscount}
              disabled={busy}
              className="flex-1 px-4 py-2.5 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-60 flex items-center justify-center gap-2"
            >
              {busy ? 'Saving...' : 'Update Discount'}
            </button>
          </div>
        </ModalShell>
      )}

      {/* ── Invoice Date Modal ── */}
      {invoiceDateModal && (
        <ModalShell
          title="Update Invoice Date"
          onClose={() => setInvoiceDateModal(false)}
        >
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Invoice Date
            </label>
            <input
              type="date"
              value={newInvoiceDate}
              onChange={(e) => setNewInvoiceDate(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="flex gap-3 mt-6">
            <button
              onClick={() => setInvoiceDateModal(false)}
              disabled={busy}
              className="flex-1 px-4 py-2.5 text-sm font-medium text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-60"
            >
              Cancel
            </button>
            <button
              onClick={handleUpdateInvoiceDate}
              disabled={busy}
              className="flex-1 px-4 py-2.5 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-60 flex items-center justify-center gap-2"
            >
              <Calendar className="h-4 w-4" />
              {busy ? 'Saving...' : 'Update Date'}
            </button>
          </div>
        </ModalShell>
      )}

      {/* ── Due Date Modal ── */}
      {dueDateModal && (
        <ModalShell
          title="Update Due Date"
          onClose={() => setDueDateModal(false)}
        >
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Due Date
            </label>
            <input
              type="date"
              value={newDueDate}
              onChange={(e) => setNewDueDate(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="flex gap-3 mt-6">
            <button
              onClick={() => setDueDateModal(false)}
              disabled={busy}
              className="flex-1 px-4 py-2.5 text-sm font-medium text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-60"
            >
              Cancel
            </button>
            <button
              onClick={handleUpdateDueDate}
              disabled={busy}
              className="flex-1 px-4 py-2.5 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-60 flex items-center justify-center gap-2"
            >
              <Clock className="h-4 w-4" />
              {busy ? 'Saving...' : 'Update Date'}
            </button>
          </div>
        </ModalShell>
      )}

      {/* ── Invoice Number Modal ── */}
      {invoiceNumberModal && (
        <ModalShell
          title="Assign New Invoice Number"
          onClose={() => setInvoiceNumberModal(false)}
        >
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Invoice Number
            </label>
            <input
              type="text"
              value={newInvoiceNumber}
              onChange={(e) => setNewInvoiceNumber(e.target.value)}
              placeholder="e.g. INV-2001"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="flex gap-3 mt-6">
            <button
              onClick={() => setInvoiceNumberModal(false)}
              disabled={busy}
              className="flex-1 px-4 py-2.5 text-sm font-medium text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-60"
            >
              Cancel
            </button>
            <button
              onClick={handleUpdateInvoiceNumber}
              disabled={busy}
              className="flex-1 px-4 py-2.5 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-60 flex items-center justify-center gap-2"
            >
              <Tag className="h-4 w-4" />
              {busy ? 'Saving...' : 'Update Number'}
            </button>
          </div>
        </ModalShell>
      )}

      {/* ── Write-Off Confirmation ── */}
      {writeOffConfirm && (
        <ModalShell
          title="Write Off Invoice"
          onClose={() => setWriteOffConfirm(false)}
        >
          <div className="flex items-start gap-3 p-3 bg-amber-50 border border-amber-200 rounded-lg mb-4">
            <AlertTriangle className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-amber-800">
              This will set the balance to $0.00 and mark the invoice as{' '}
              <strong>void</strong>. This action cannot be easily undone.
            </p>
          </div>

          <div className="flex gap-3">
            <button
              onClick={() => setWriteOffConfirm(false)}
              disabled={busy}
              className="flex-1 px-4 py-2.5 text-sm font-medium text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-60"
            >
              Cancel
            </button>
            <button
              onClick={handleWriteOff}
              disabled={busy}
              className="flex-1 px-4 py-2.5 text-sm font-medium text-white bg-amber-600 rounded-lg hover:bg-amber-700 disabled:opacity-60 flex items-center justify-center gap-2"
            >
              <AlertTriangle className="h-4 w-4" />
              {busy ? 'Processing...' : 'Write Off'}
            </button>
          </div>
        </ModalShell>
      )}

      {/* ── Delete Confirmation ── */}
      {deleteConfirm && (
        <ModalShell
          title="Delete Invoice"
          onClose={() => setDeleteConfirm(false)}
        >
          <div className="flex items-start gap-3 p-3 bg-red-50 border border-red-200 rounded-lg mb-4">
            <Trash2 className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-red-800">
              Are you sure you want to delete invoice{' '}
              <strong>{invoice.invoice_number}</strong>? This action cannot be
              undone and all associated line items and transactions will be
              removed.
            </p>
          </div>

          <div className="flex gap-3">
            <button
              onClick={() => setDeleteConfirm(false)}
              className="flex-1 px-4 py-2.5 text-sm font-medium text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              onClick={handleConfirmDelete}
              className="flex-1 px-4 py-2.5 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 flex items-center justify-center gap-2"
            >
              <Trash2 className="h-4 w-4" />
              Delete Invoice
            </button>
          </div>
        </ModalShell>
      )}

      {/* ── Toast ── */}
      {toast && <Toast message={toast} />}
    </>
  );
}
