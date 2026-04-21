import { useState } from 'react';
import { CheckCircle, X, DollarSign } from 'lucide-react';
import type { TechWO } from './types';
import SignatureCanvas from './SignatureCanvas';

interface Props {
  job: TechWO;
  onConfirm: (data: {
    resolutionNotes: string;
    workPerformed: string;
    signature: string | null;
    paymentCollected: number | null;
    paymentMethod: string | null;
  }) => Promise<void>;
  onCancel: () => void;
}

const PAYMENT_METHODS = ['Cash', 'Check', 'Credit Card', 'Other'];

export default function CompleteJobModal({ job, onConfirm, onCancel }: Props) {
  const [resolutionNotes, setResolutionNotes] = useState('');
  const [signature, setSignature] = useState<string | null>(null);
  const [paymentCollected, setPaymentCollected] = useState<string>('');
  const [paymentMethod, setPaymentMethod] = useState('');
  const [saving, setSaving] = useState(false);

  const isBillable = job.billing_type !== 'not_billable';
  const suggestedAmount = job.fixed_amount ?? job.billing_rate ?? null;

  async function handleConfirm() {
    setSaving(true);
    await onConfirm({
      resolutionNotes,
      signature,
      paymentCollected: paymentCollected ? parseFloat(paymentCollected) : null,
      paymentMethod: paymentMethod || null,
    });
    setSaving(false);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-white w-full max-w-lg rounded-t-3xl sm:rounded-3xl max-h-[92vh] overflow-y-auto shadow-2xl">
        <div className="sticky top-0 bg-white border-b border-gray-100 px-5 py-4 flex items-center justify-between rounded-t-3xl">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-emerald-100 flex items-center justify-center">
              <CheckCircle className="h-5 w-5 text-emerald-600" />
            </div>
            <div>
              <h2 className="text-base font-bold text-gray-900">Complete Job</h2>
              <p className="text-xs text-gray-500">{job.wo_number} — {job.title}</p>
            </div>
          </div>
          <button onClick={onCancel} className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center hover:bg-gray-200 transition-colors">
            <X className="h-4 w-4 text-gray-600" />
          </button>
        </div>

        <div className="p-5 space-y-5">
          {/* Resolution Notes */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Resolution Notes <span className="text-gray-400 font-normal">(what was done?)</span>
            </label>
            <textarea
              value={resolutionNotes}
              onChange={e => setResolutionNotes(e.target.value)}
              rows={3}
              placeholder="Describe what was repaired, tested, or installed..."
              className="w-full text-sm border border-gray-300 rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-emerald-500 resize-none placeholder-gray-400"
            />
          </div>

          {/* Payment Collection */}
          {isBillable && (
            <div className="bg-blue-50 rounded-2xl p-4 space-y-3">
              <div className="flex items-center gap-2 mb-1">
                <DollarSign className="h-4 w-4 text-blue-600" />
                <p className="text-sm font-semibold text-blue-900">Collect Payment</p>
                {suggestedAmount && (
                  <span className="ml-auto text-xs text-blue-600 font-medium">
                    {job.billing_type === 'fixed' ? `Fixed: $${suggestedAmount}` : `$${suggestedAmount}/hr`}
                  </span>
                )}
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Amount Collected</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-gray-500">$</span>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={paymentCollected}
                      onChange={e => setPaymentCollected(e.target.value)}
                      placeholder="0.00"
                      className="w-full text-sm border border-gray-300 rounded-xl pl-7 pr-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Payment Method</label>
                  <select
                    value={paymentMethod}
                    onChange={e => setPaymentMethod(e.target.value)}
                    className="w-full text-sm border border-gray-300 rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                  >
                    <option value="">Select...</option>
                    {PAYMENT_METHODS.map(m => (
                      <option key={m} value={m.toLowerCase().replace(' ', '_')}>{m}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* Signature */}
          <SignatureCanvas onCapture={setSignature} />

          {/* Confirm Button */}
          <button
            onClick={handleConfirm}
            disabled={saving}
            className="w-full flex items-center justify-center gap-2 py-4 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-base transition-all active:scale-[0.98] disabled:opacity-60"
          >
            <CheckCircle className="h-5 w-5" />
            {saving ? 'Saving...' : 'Confirm Job Complete'}
          </button>
        </div>
      </div>
    </div>
  );
}
