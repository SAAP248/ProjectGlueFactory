import { useState } from 'react';
import { Plus, CheckCircle, Clock, Send, DollarSign } from 'lucide-react';
import type { ProgressInvoice, ProjectPhase } from './types';
import { getPIStatusColor } from './types';
import { supabase } from '../../lib/supabase';

interface Props {
  projectId: string;
  contractValue: number;
  approvedCOValue: number;
  progressInvoices: ProgressInvoice[];
  phases: ProjectPhase[];
  onRefetch: () => void;
}

export default function ProgressBillingTab({ projectId, contractValue, approvedCOValue, progressInvoices, phases, onRefetch }: Props) {
  const [showNew, setShowNew] = useState(false);

  const totalContract = contractValue + approvedCOValue;
  const totalBilled = progressInvoices.filter(pi => pi.status !== 'void').reduce((s, pi) => s + pi.current_payment_due, 0);
  const totalPaid = progressInvoices.filter(pi => pi.status === 'paid').reduce((s, pi) => s + pi.current_payment_due, 0);
  const remaining = totalContract - totalBilled;
  const billedPct = totalContract > 0 ? Math.round((totalBilled / totalContract) * 100) : 0;

  function statusIcon(status: string) {
    if (status === 'paid') return <CheckCircle className="h-4 w-4 text-green-500" />;
    if (status === 'sent') return <Send className="h-4 w-4 text-blue-500" />;
    if (status === 'overdue') return <Clock className="h-4 w-4 text-red-500" />;
    return <DollarSign className="h-4 w-4 text-gray-400" />;
  }

  async function markSent(piId: string) {
    await supabase.from('progress_invoices').update({
      status: 'sent',
      sent_date: new Date().toISOString().split('T')[0],
      invoice_date: new Date().toISOString().split('T')[0],
      updated_at: new Date().toISOString(),
    }).eq('id', piId);
    onRefetch();
  }

  async function markPaid(piId: string) {
    await supabase.from('progress_invoices').update({
      status: 'paid',
      paid_date: new Date().toISOString().split('T')[0],
      updated_at: new Date().toISOString(),
    }).eq('id', piId);
    onRefetch();
  }

  return (
    <div>
      {/* Financial Summary */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        <div className="bg-white border border-gray-100 rounded-xl p-4 shadow-sm">
          <div className="text-xs text-gray-500 mb-1">Contract Value</div>
          <div className="text-xl font-bold text-gray-900">${totalContract.toLocaleString()}</div>
          {approvedCOValue > 0 && <div className="text-xs text-green-600 mt-0.5">+${approvedCOValue.toLocaleString()} COs</div>}
        </div>
        <div className="bg-blue-50 border border-blue-100 rounded-xl p-4">
          <div className="text-xs text-blue-600 mb-1 font-medium">Total Billed</div>
          <div className="text-xl font-bold text-blue-800">${totalBilled.toLocaleString()}</div>
          <div className="text-xs text-blue-500">{billedPct}% of contract</div>
        </div>
        <div className="bg-green-50 border border-green-100 rounded-xl p-4">
          <div className="text-xs text-green-600 mb-1 font-medium">Collected</div>
          <div className="text-xl font-bold text-green-800">${totalPaid.toLocaleString()}</div>
        </div>
        <div className="bg-gray-50 border border-gray-100 rounded-xl p-4">
          <div className="text-xs text-gray-500 mb-1 font-medium">Remaining to Bill</div>
          <div className="text-xl font-bold text-gray-800">${remaining.toLocaleString()}</div>
        </div>
      </div>

      {/* Billing Progress Bar */}
      <div className="bg-white border border-gray-100 rounded-xl p-5 mb-6 shadow-sm">
        <div className="flex justify-between text-xs text-gray-500 mb-2">
          <span>Billing Progress</span>
          <span className="font-semibold text-gray-900">{billedPct}% billed</span>
        </div>
        <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
          <div
            className="h-3 bg-gradient-to-r from-blue-500 to-blue-400 rounded-full transition-all"
            style={{ width: `${Math.min(billedPct, 100)}%` }}
          />
        </div>
        <div className="flex mt-3 gap-0.5">
          {progressInvoices.map(pi => (
            <div
              key={pi.id}
              title={`${pi.title}: $${pi.current_payment_due.toLocaleString()}`}
              className={`h-1.5 rounded-full flex-1 ${
                pi.status === 'paid' ? 'bg-green-400' :
                pi.status === 'sent' ? 'bg-blue-400' :
                pi.status === 'overdue' ? 'bg-red-400' : 'bg-gray-200'
              }`}
            />
          ))}
        </div>
        <div className="flex items-center gap-4 mt-2 text-xs text-gray-400">
          <div className="flex items-center gap-1"><div className="w-3 h-1.5 rounded-full bg-green-400" /> Paid</div>
          <div className="flex items-center gap-1"><div className="w-3 h-1.5 rounded-full bg-blue-400" /> Sent</div>
          <div className="flex items-center gap-1"><div className="w-3 h-1.5 rounded-full bg-gray-200" /> Scheduled</div>
        </div>
      </div>

      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-gray-700">Billing Schedule</h3>
        <button
          onClick={() => setShowNew(true)}
          className="flex items-center gap-2 px-3 py-1.5 bg-blue-600 text-white text-xs font-semibold rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus className="h-3.5 w-3.5" />
          Add Milestone
        </button>
      </div>

      {progressInvoices.length === 0 ? (
        <div className="text-center py-12 text-gray-400 text-sm bg-gray-50 rounded-xl border border-dashed border-gray-200">
          No billing milestones defined yet.
        </div>
      ) : (
        <div className="bg-white border border-gray-100 rounded-xl shadow-sm overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Milestone</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Phase</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase">Scheduled Value</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase">Payment Due</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Status</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Dates</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {progressInvoices.map((pi, index) => {
                const cumulative = progressInvoices
                  .slice(0, index + 1)
                  .filter(p => p.status !== 'void')
                  .reduce((s, p) => s + p.current_payment_due, 0);

                return (
                  <tr key={pi.id} className={`${pi.status === 'paid' ? 'bg-green-50/30' : pi.status === 'overdue' ? 'bg-red-50/30' : ''}`}>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        {statusIcon(pi.status)}
                        <div>
                          <div className="text-sm font-semibold text-gray-900">{pi.title}</div>
                          <div className="text-xs text-gray-400">{pi.pi_number}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-600">
                      {(pi.phases as { name: string } | null)?.name || pi.milestone_name || '—'}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="text-sm font-medium text-gray-900">${pi.scheduled_value.toLocaleString()}</div>
                      <div className="text-xs text-gray-400">{pi.percent_complete}% complete</div>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="text-sm font-bold text-gray-900">${pi.current_payment_due.toLocaleString()}</div>
                      <div className="text-xs text-gray-400">Cumul: ${cumulative.toLocaleString()}</div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${getPIStatusColor(pi.status)}`}>
                        {pi.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-500">
                      {pi.invoice_date && <div>Inv: {new Date(pi.invoice_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</div>}
                      {pi.paid_date && <div className="text-green-600">Paid: {new Date(pi.paid_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</div>}
                      {pi.due_date && !pi.paid_date && <div>Due: {new Date(pi.due_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</div>}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        {pi.status === 'draft' && (
                          <button onClick={() => markSent(pi.id)} className="text-xs text-blue-600 hover:text-blue-700 font-medium whitespace-nowrap">Send Invoice</button>
                        )}
                        {pi.status === 'sent' && (
                          <button onClick={() => markPaid(pi.id)} className="text-xs text-green-600 hover:text-green-700 font-medium whitespace-nowrap">Mark Paid</button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {showNew && (
        <NewMilestoneModal
          projectId={projectId}
          phases={phases}
          piCount={progressInvoices.length}
          onClose={() => setShowNew(false)}
          onSaved={() => { setShowNew(false); onRefetch(); }}
        />
      )}
    </div>
  );
}

interface NewMilestoneProps {
  projectId: string;
  phases: ProjectPhase[];
  piCount: number;
  onClose: () => void;
  onSaved: () => void;
}

function NewMilestoneModal({ projectId, phases, piCount, onClose, onSaved }: NewMilestoneProps) {
  const [saving, setSaving] = useState(false);
  const [title, setTitle] = useState('');
  const [phaseId, setPhaseId] = useState('');
  const [percentComplete, setPercentComplete] = useState('');
  const [scheduledValue, setScheduledValue] = useState('');
  const [dueDate, setDueDate] = useState('');

  async function handleSave() {
    if (!title || !scheduledValue) return;
    setSaving(true);
    const sv = parseFloat(scheduledValue) || 0;
    await supabase.from('progress_invoices').insert({
      project_id: projectId,
      pi_number: `PI-${String(piCount + 1).padStart(2, '0')}`,
      title,
      billing_type: 'milestone',
      phase_id: phaseId || null,
      percent_complete: parseFloat(percentComplete) || 0,
      scheduled_value: sv,
      work_completed: 0,
      materials_stored: 0,
      total_earned: 0,
      less_previous_billed: 0,
      current_payment_due: sv,
      retainage_amount: 0,
      status: 'draft',
      due_date: dueDate || null,
    });
    setSaving(false);
    onSaved();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
        <div className="flex items-center justify-between p-6 border-b border-gray-100">
          <h2 className="text-lg font-bold text-gray-900">Add Billing Milestone</h2>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-gray-100 text-gray-400 text-xl font-light">×</button>
        </div>
        <div className="p-6 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1.5">Milestone Title *</label>
            <input type="text" value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g. Rough-In Complete" className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1.5">Linked Phase</label>
            <select value={phaseId} onChange={e => setPhaseId(e.target.value)} className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500">
              <option value="">Not linked to a phase</option>
              {phases.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1.5">% Complete at Billing</label>
              <input type="number" value={percentComplete} onChange={e => setPercentComplete(e.target.value)} placeholder="e.g. 30" className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1.5">Invoice Amount ($) *</label>
              <input type="number" value={scheduledValue} onChange={e => setScheduledValue(e.target.value)} placeholder="0.00" className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1.5">Due Date</label>
            <input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
        </div>
        <div className="flex justify-end gap-3 p-6 border-t border-gray-100">
          <button onClick={onClose} className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg">Cancel</button>
          <button onClick={handleSave} disabled={saving || !title || !scheduledValue} className="px-5 py-2 bg-blue-600 text-white text-sm font-semibold rounded-lg hover:bg-blue-700 disabled:opacity-50">
            {saving ? 'Saving...' : 'Add Milestone'}
          </button>
        </div>
      </div>
    </div>
  );
}
