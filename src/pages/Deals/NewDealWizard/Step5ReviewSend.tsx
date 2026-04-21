import { useState } from 'react';
import { Mail, MessageSquare, FileDown, MapPin, Building2, Phone, AtSign, Shield, Package, CheckCircle2, Info, X } from 'lucide-react';
import type { WizardState } from './types';

interface Props {
  state: WizardState;
  onChange: (updates: Partial<WizardState>) => void;
  onCreateDeal: (sendMode: 'email' | 'sms' | null) => Promise<void>;
  saving: boolean;
  proposalToken: string;
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      <div className="px-5 py-3 bg-gray-50 border-b border-gray-100">
        <p className="text-xs font-bold text-gray-700 uppercase tracking-wider">{title}</p>
      </div>
      <div className="p-5">{children}</div>
    </div>
  );
}

export default function Step5ReviewSend({ state, onChange, onCreateDeal, saving, proposalToken }: Props) {
  const [pdfToast, setPdfToast] = useState(false);
  const [sendMode, setSendMode] = useState<'email' | 'sms' | null>(null);
  const [emailSubject, setEmailSubject] = useState(`Your Proposal from WorkHorse Security`);
  const [emailBody, setEmailBody] = useState(`Hello,\n\nPlease review your security system proposal at the link below.\n\nProposal ID: ${proposalToken}\n\nWe look forward to working with you!`);
  const [smsBody, setSmsBody] = useState(`Hi, your WorkHorse Security proposal is ready! Proposal ID: ${proposalToken}. Reply to this message with any questions.`);

  const totalRevenue = state.lineItems.reduce((s, i) => s + i.quantity * i.unit_price, 0);
  const totalCost = state.lineItems.reduce((s, i) => s + i.quantity * i.unit_cost, 0);
  const overallMargin = totalRevenue > 0 ? ((totalRevenue - totalCost) / totalRevenue) * 100 : 0;

  const customerName = state.customerMode === 'existing' ? state.existingCompanyName : state.newCompanyName;
  const siteDisplay = state.siteMode === 'existing' && state.existingSiteName
    ? state.existingSiteName
    : [state.siteAddress, state.siteCity, state.siteState].filter(Boolean).join(', ');

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h2 className="text-xl font-bold text-gray-900 mb-1">Review & Send</h2>
        <p className="text-sm text-gray-500">Review the proposal details below, then create the deal and optionally send the proposal.</p>
      </div>

      <Section title="Customer">
        <div className="grid grid-cols-2 gap-4">
          <div className="flex items-start gap-2.5">
            <Building2 className="h-4 w-4 text-gray-400 mt-0.5 shrink-0" />
            <div>
              <p className="text-xs text-gray-500">Customer</p>
              <p className="text-sm font-semibold text-gray-900">{customerName || '—'}</p>
            </div>
          </div>
          {state.billingAddress && (
            <div className="flex items-start gap-2.5">
              <MapPin className="h-4 w-4 text-gray-400 mt-0.5 shrink-0" />
              <div>
                <p className="text-xs text-gray-500">Billing Address</p>
                <p className="text-sm text-gray-700">{state.billingAddress}, {state.billingCity}, {state.billingState} {state.billingZip}</p>
              </div>
            </div>
          )}
          {state.customerMode === 'new' && state.newPhones.length > 0 && (
            <div className="flex items-start gap-2.5">
              <Phone className="h-4 w-4 text-gray-400 mt-0.5 shrink-0" />
              <div>
                <p className="text-xs text-gray-500">Phones</p>
                {state.newPhones.map(p => (
                  <p key={p.id} className="text-sm text-gray-700">{p.label}: {p.phone_number}</p>
                ))}
              </div>
            </div>
          )}
          {state.customerMode === 'new' && state.newEmails.length > 0 && (
            <div className="flex items-start gap-2.5">
              <AtSign className="h-4 w-4 text-gray-400 mt-0.5 shrink-0" />
              <div>
                <p className="text-xs text-gray-500">Emails</p>
                {state.newEmails.map(e => (
                  <p key={e.id} className="text-sm text-gray-700">{e.label}: {e.email_address}</p>
                ))}
              </div>
            </div>
          )}
          {siteDisplay && (
            <div className="flex items-start gap-2.5">
              <MapPin className="h-4 w-4 text-blue-500 mt-0.5 shrink-0" />
              <div>
                <p className="text-xs text-gray-500">Installation Site</p>
                <p className="text-sm text-gray-700">{siteDisplay}</p>
              </div>
            </div>
          )}
        </div>
      </Section>

      <Section title="Systems">
        {state.systems.length === 0 ? (
          <p className="text-sm text-gray-400">No systems selected.</p>
        ) : (
          <div className="space-y-2">
            {state.systems.map(s => (
              <div key={s.id} className="flex items-center gap-3">
                <Shield className="h-4 w-4 text-gray-400" />
                <span className="text-sm font-semibold text-gray-900">{s.name}</span>
                {s.package_name && (
                  <span className="flex items-center gap-1 text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">
                    <Package className="h-3 w-3" />{s.package_name}
                  </span>
                )}
              </div>
            ))}
          </div>
        )}
      </Section>

      <Section title="Line Items">
        {state.lineItems.length === 0 ? (
          <p className="text-sm text-gray-400">No line items added.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="text-left py-2 text-xs font-semibold text-gray-500">Description</th>
                  <th className="text-right py-2 text-xs font-semibold text-gray-500 w-12">Qty</th>
                  <th className="text-right py-2 text-xs font-semibold text-gray-500 w-20">Price</th>
                  <th className="text-right py-2 text-xs font-semibold text-gray-500 w-20">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {state.lineItems.map(item => (
                  <tr key={item.id}>
                    <td className="py-2 text-gray-800">{item.description || <span className="text-gray-400 italic">Unnamed item</span>}</td>
                    <td className="py-2 text-right text-gray-600">{item.quantity}</td>
                    <td className="py-2 text-right text-gray-600">${item.unit_price.toFixed(2)}</td>
                    <td className="py-2 text-right font-semibold text-gray-900">${(item.quantity * item.unit_price).toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="border-t-2 border-gray-200">
                <tr>
                  <td colSpan={3} className="pt-3 text-right text-sm font-bold text-gray-900">Total Revenue</td>
                  <td className="pt-3 text-right text-base font-bold text-gray-900">${totalRevenue.toFixed(2)}</td>
                </tr>
                <tr>
                  <td colSpan={3} className="text-right text-xs text-gray-500">Overall Margin</td>
                  <td className={`text-right text-sm font-bold ${overallMargin >= state.marginThreshold ? 'text-emerald-600' : 'text-red-600'}`}>
                    {overallMargin.toFixed(1)}%
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </Section>

      {state.scopeOfWork && (
        <Section title="Scope of Work">
          <p className="text-sm text-gray-700 whitespace-pre-wrap">{state.scopeOfWork}</p>
        </Section>
      )}

      <Section title="Deposit">
        <label className="flex items-center gap-2.5 cursor-pointer mb-4">
          <input
            type="checkbox"
            checked={state.depositRequested}
            onChange={e => onChange({ depositRequested: e.target.checked })}
            className="w-4 h-4 rounded accent-blue-600"
          />
          <span className="text-sm font-medium text-gray-700">Request a deposit from the customer</span>
        </label>

        {state.depositRequested && (
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Deposit Amount</label>
              <div className="flex items-center gap-1">
                <span className="text-gray-500">$</span>
                <input
                  type="number"
                  min={0}
                  step={0.01}
                  placeholder="0.00"
                  value={state.depositAmount}
                  onChange={e => onChange({ depositAmount: e.target.value })}
                  className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Payment Method</label>
              <select
                value={state.depositMethod}
                onChange={e => onChange({ depositMethod: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
              >
                <option value="">Select method…</option>
                <option value="Check">Check</option>
                <option value="Credit Card">Credit Card</option>
                <option value="ACH">ACH / Bank Transfer</option>
                <option value="Other">Other</option>
              </select>
            </div>
          </div>
        )}
      </Section>

      <Section title="Send Proposal">
        <div className="grid grid-cols-3 gap-4">
          <button
            onClick={() => setSendMode(sendMode === 'email' ? null : 'email')}
            className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all ${
              sendMode === 'email'
                ? 'border-blue-600 bg-blue-50'
                : 'border-gray-200 hover:border-gray-300'
            }`}
          >
            <Mail className={`h-6 w-6 ${sendMode === 'email' ? 'text-blue-600' : 'text-gray-400'}`} />
            <span className={`text-sm font-semibold ${sendMode === 'email' ? 'text-blue-700' : 'text-gray-700'}`}>Email Proposal</span>
          </button>

          <button
            onClick={() => setSendMode(sendMode === 'sms' ? null : 'sms')}
            className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all ${
              sendMode === 'sms'
                ? 'border-blue-600 bg-blue-50'
                : 'border-gray-200 hover:border-gray-300'
            }`}
          >
            <MessageSquare className={`h-6 w-6 ${sendMode === 'sms' ? 'text-blue-600' : 'text-gray-400'}`} />
            <span className={`text-sm font-semibold ${sendMode === 'sms' ? 'text-blue-700' : 'text-gray-700'}`}>Text Proposal</span>
          </button>

          <button
            onClick={() => { setPdfToast(true); setTimeout(() => setPdfToast(false), 3000); }}
            className="flex flex-col items-center gap-2 p-4 rounded-xl border-2 border-gray-200 hover:border-gray-300 transition-all"
          >
            <FileDown className="h-6 w-6 text-gray-400" />
            <span className="text-sm font-semibold text-gray-700">Download PDF</span>
          </button>
        </div>

        {pdfToast && (
          <div className="mt-3 flex items-center gap-2 text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-4 py-2.5">
            <Info className="h-4 w-4 shrink-0" /> PDF generation is coming in a future update.
            <button onClick={() => setPdfToast(false)} className="ml-auto"><X className="h-4 w-4" /></button>
          </div>
        )}

        {sendMode === 'email' && (
          <div className="mt-4 bg-blue-50 border border-blue-200 rounded-xl p-4 space-y-3">
            <p className="text-xs font-bold text-blue-700 uppercase tracking-wider">Email Details</p>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Subject</label>
              <input
                type="text"
                value={emailSubject}
                onChange={e => setEmailSubject(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Message</label>
              <textarea
                rows={4}
                value={emailBody}
                onChange={e => setEmailBody(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              />
            </div>
            <p className="text-xs text-blue-600">
              Sending will mark the deal as "Proposal Sent" and update the estimate status.
            </p>
          </div>
        )}

        {sendMode === 'sms' && (
          <div className="mt-4 bg-blue-50 border border-blue-200 rounded-xl p-4 space-y-3">
            <p className="text-xs font-bold text-blue-700 uppercase tracking-wider">SMS Details</p>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Message</label>
              <textarea
                rows={3}
                value={smsBody}
                onChange={e => setSmsBody(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              />
            </div>
            <p className="text-xs text-blue-600">
              Sending will mark the deal as "Proposal Sent" and update the estimate status.
            </p>
          </div>
        )}
      </Section>

      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <p className="text-sm font-bold text-gray-900 mb-4">Ready to create this deal?</p>
        <div className="flex gap-4">
          <button
            disabled={saving}
            onClick={() => onCreateDeal(sendMode)}
            className="flex items-center gap-2 px-8 py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 disabled:opacity-50 transition-colors shadow-sm"
          >
            <CheckCircle2 className="h-5 w-5" />
            {saving ? 'Creating Deal…' : sendMode ? `Create Deal & ${sendMode === 'email' ? 'Email' : 'Text'} Proposal` : 'Create Deal'}
          </button>
          <div className="text-xs text-gray-500 flex flex-col justify-center">
            <p>A deal, estimate, and proposal will be created.</p>
            {sendMode && <p className="text-blue-600">Deal will be moved to "Proposal Sent" stage.</p>}
          </div>
        </div>
      </div>
    </div>
  );
}
