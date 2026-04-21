import { useState } from 'react';
import { Plus, CheckCircle, XCircle, Clock, FileText, ChevronDown, ChevronUp, Send } from 'lucide-react';
import type { ChangeOrder } from './types';
import { getCOStatusColor } from './types';
import { supabase } from '../../lib/supabase';

interface Props {
  projectId: string;
  changeOrders: ChangeOrder[];
  onRefetch: () => void;
}

export default function ChangeOrdersTab({ projectId, changeOrders, onRefetch }: Props) {
  const [expanded, setExpanded] = useState<string | null>(null);
  const [showNew, setShowNew] = useState(false);
  const [approvingId, setApprovingId] = useState<string | null>(null);
  const [approvedBy, setApprovedBy] = useState('');

  const approvedTotal = changeOrders
    .filter(co => co.status === 'approved')
    .reduce((s, co) => s + co.total, 0);

  const pendingTotal = changeOrders
    .filter(co => co.status === 'submitted')
    .reduce((s, co) => s + co.total, 0);

  async function handleApprove(coId: string) {
    await supabase.from('change_orders').update({
      status: 'approved',
      approved_date: new Date().toISOString().split('T')[0],
      approved_by: approvedBy || 'Customer',
      updated_at: new Date().toISOString(),
    }).eq('id', coId);

    const co = changeOrders.find(c => c.id === coId);
    if (co) {
      const { data: proj } = await supabase.from('projects').select('approved_co_value').eq('id', projectId).maybeSingle();
      if (proj) {
        await supabase.from('projects').update({
          approved_co_value: (proj.approved_co_value || 0) + co.total,
          updated_at: new Date().toISOString(),
        }).eq('id', projectId);
      }
    }
    setApprovingId(null);
    setApprovedBy('');
    onRefetch();
  }

  async function handleReject(coId: string) {
    await supabase.from('change_orders').update({
      status: 'rejected',
      rejected_date: new Date().toISOString().split('T')[0],
      updated_at: new Date().toISOString(),
    }).eq('id', coId);
    onRefetch();
  }

  async function handleSubmit(coId: string) {
    await supabase.from('change_orders').update({
      status: 'submitted',
      submitted_date: new Date().toISOString().split('T')[0],
      updated_at: new Date().toISOString(),
    }).eq('id', coId);
    onRefetch();
  }

  return (
    <div>
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-white border border-gray-100 rounded-xl p-4 shadow-sm">
          <div className="text-xs text-gray-500 mb-1">Total Change Orders</div>
          <div className="text-2xl font-bold text-gray-900">{changeOrders.length}</div>
        </div>
        <div className="bg-green-50 border border-green-100 rounded-xl p-4">
          <div className="text-xs text-green-600 mb-1 font-medium">Approved Value</div>
          <div className="text-2xl font-bold text-green-700">${approvedTotal.toLocaleString()}</div>
        </div>
        <div className="bg-amber-50 border border-amber-100 rounded-xl p-4">
          <div className="text-xs text-amber-600 mb-1 font-medium">Pending Approval</div>
          <div className="text-2xl font-bold text-amber-700">${pendingTotal.toLocaleString()}</div>
        </div>
      </div>

      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-gray-700">Change Order Log</h3>
        <button
          onClick={() => setShowNew(true)}
          className="flex items-center gap-2 px-3 py-1.5 bg-blue-600 text-white text-xs font-semibold rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus className="h-3.5 w-3.5" />
          New Change Order
        </button>
      </div>

      {changeOrders.length === 0 ? (
        <div className="text-center py-12 text-gray-400 text-sm bg-gray-50 rounded-xl border border-dashed border-gray-200">
          No change orders yet. Click "New Change Order" to add one.
        </div>
      ) : (
        <div className="space-y-3">
          {changeOrders.map(co => (
            <div key={co.id} className="bg-white border border-gray-100 rounded-xl overflow-hidden shadow-sm">
              <div
                className="flex items-center gap-4 p-4 cursor-pointer"
                onClick={() => setExpanded(expanded === co.id ? null : co.id)}
              >
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
                  co.status === 'approved' ? 'bg-green-100' :
                  co.status === 'submitted' ? 'bg-amber-100' :
                  co.status === 'rejected' ? 'bg-red-100' : 'bg-gray-100'
                }`}>
                  {co.status === 'approved' ? <CheckCircle className="h-4 w-4 text-green-600" /> :
                   co.status === 'submitted' ? <Clock className="h-4 w-4 text-amber-600" /> :
                   co.status === 'rejected' ? <XCircle className="h-4 w-4 text-red-600" /> :
                   <FileText className="h-4 w-4 text-gray-500" />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-semibold text-gray-400">{co.co_number}</span>
                    <span className="font-semibold text-gray-900 text-sm">{co.title}</span>
                  </div>
                  <div className="flex items-center gap-3 mt-0.5 flex-wrap">
                    <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${getCOStatusColor(co.status)}`}>
                      {co.status}
                    </span>
                    {co.submitted_date && (
                      <span className="text-xs text-gray-400">Submitted {new Date(co.submitted_date).toLocaleDateString()}</span>
                    )}
                    {co.approved_date && (
                      <span className="text-xs text-gray-400">Approved by {co.approved_by}</span>
                    )}
                    {co.impact_schedule_days > 0 && (
                      <span className="text-xs text-amber-600 font-medium">+{co.impact_schedule_days} days schedule impact</span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-4 flex-shrink-0">
                  <div className="text-right">
                    <div className="font-bold text-gray-900">${co.total.toLocaleString()}</div>
                    {co.tax > 0 && <div className="text-xs text-gray-400">incl. ${co.tax.toLocaleString()} tax</div>}
                  </div>
                  {expanded === co.id ? <ChevronUp className="h-4 w-4 text-gray-400" /> : <ChevronDown className="h-4 w-4 text-gray-400" />}
                </div>
              </div>

              {expanded === co.id && (
                <div className="border-t border-gray-50 p-4">
                  {co.description && (
                    <p className="text-sm text-gray-600 mb-4">{co.description}</p>
                  )}

                  {co.line_items && co.line_items.length > 0 && (
                    <div className="mb-4">
                      <div className="text-xs font-semibold text-gray-500 mb-2 uppercase tracking-wider">Line Items</div>
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="text-xs text-gray-400 border-b border-gray-100">
                            <th className="pb-2 text-left font-medium">Description</th>
                            <th className="pb-2 text-left font-medium">Type</th>
                            <th className="pb-2 text-right font-medium">Qty</th>
                            <th className="pb-2 text-right font-medium">Unit Price</th>
                            <th className="pb-2 text-right font-medium">Total</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                          {co.line_items.map(li => (
                            <tr key={li.id}>
                              <td className="py-2 text-gray-900">{li.description}</td>
                              <td className="py-2 text-gray-500 capitalize">{li.cost_type}</td>
                              <td className="py-2 text-right text-gray-700">{li.quantity}</td>
                              <td className="py-2 text-right text-gray-700">${li.unit_price.toLocaleString()}</td>
                              <td className="py-2 text-right font-semibold text-gray-900">${li.total.toLocaleString()}</td>
                            </tr>
                          ))}
                        </tbody>
                        <tfoot>
                          <tr className="border-t-2 border-gray-100">
                            <td colSpan={4} className="pt-2 text-right text-sm font-semibold text-gray-700">Subtotal</td>
                            <td className="pt-2 text-right font-bold text-gray-900">${co.subtotal.toLocaleString()}</td>
                          </tr>
                          {co.tax > 0 && (
                            <tr>
                              <td colSpan={4} className="text-right text-xs text-gray-500">Tax</td>
                              <td className="text-right text-sm text-gray-700">${co.tax.toLocaleString()}</td>
                            </tr>
                          )}
                          <tr>
                            <td colSpan={4} className="text-right text-sm font-bold text-gray-900">Total</td>
                            <td className="text-right text-lg font-bold text-gray-900">${co.total.toLocaleString()}</td>
                          </tr>
                        </tfoot>
                      </table>
                    </div>
                  )}

                  {co.status === 'draft' && (
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleSubmit(co.id)}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 text-white text-xs font-semibold rounded-lg hover:bg-blue-700"
                      >
                        <Send className="h-3.5 w-3.5" />
                        Submit to Customer
                      </button>
                    </div>
                  )}

                  {co.status === 'submitted' && (
                    <div className="flex items-center gap-3 mt-2 p-3 bg-amber-50 rounded-lg">
                      <div className="flex-1">
                        <div className="text-xs font-semibold text-amber-800 mb-1">Awaiting Customer Approval</div>
                        <input
                          type="text"
                          placeholder="Approved by (name)..."
                          value={approvingId === co.id ? approvedBy : ''}
                          onFocus={() => setApprovingId(co.id)}
                          onChange={e => setApprovedBy(e.target.value)}
                          className="w-full px-2 py-1.5 text-xs border border-amber-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-amber-400 bg-white"
                        />
                      </div>
                      <button
                        onClick={() => handleApprove(co.id)}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-green-600 text-white text-xs font-semibold rounded-lg hover:bg-green-700"
                      >
                        <CheckCircle className="h-3.5 w-3.5" />
                        Approve
                      </button>
                      <button
                        onClick={() => handleReject(co.id)}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-red-100 text-red-700 text-xs font-semibold rounded-lg hover:bg-red-200"
                      >
                        <XCircle className="h-3.5 w-3.5" />
                        Reject
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {showNew && (
        <NewChangeOrderModal
          projectId={projectId}
          onClose={() => setShowNew(false)}
          onSaved={() => { setShowNew(false); onRefetch(); }}
        />
      )}
    </div>
  );
}

interface NewCOProps {
  projectId: string;
  onClose: () => void;
  onSaved: () => void;
}

function NewChangeOrderModal({ projectId, onClose, onSaved }: NewCOProps) {
  const [saving, setSaving] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [reason, setReason] = useState('customer_request');
  const [scheduleDays, setScheduleDays] = useState('0');
  const [lines, setLines] = useState([
    { description: '', cost_type: 'labor', quantity: 1, unit_price: 0, unit_cost: 0 },
  ]);

  function addLine() {
    setLines(l => [...l, { description: '', cost_type: 'labor', quantity: 1, unit_price: 0, unit_cost: 0 }]);
  }

  function removeLine(i: number) {
    setLines(l => l.filter((_, idx) => idx !== i));
  }

  function updateLine(i: number, key: string, value: string | number) {
    setLines(l => l.map((li, idx) => idx === i ? { ...li, [key]: value } : li));
  }

  const subtotal = lines.reduce((s, l) => s + l.quantity * l.unit_price, 0);
  const tax = subtotal * 0.0;
  const total = subtotal + tax;

  async function handleSave() {
    if (!title) return;
    setSaving(true);

    const coCount = await supabase.from('change_orders').select('id').eq('project_id', projectId);
    const coNum = `CO-${String((coCount.data?.length || 0) + 1).padStart(3, '0')}`;

    const { data: co } = await supabase.from('change_orders').insert({
      project_id: projectId,
      co_number: coNum,
      title,
      description: description || null,
      reason,
      status: 'draft',
      subtotal,
      tax,
      total,
      impact_schedule_days: parseInt(scheduleDays) || 0,
    }).select().maybeSingle();

    if (co) {
      const lineRows = lines
        .filter(l => l.description)
        .map(l => ({
          change_order_id: co.id,
          description: l.description,
          cost_type: l.cost_type,
          quantity: l.quantity,
          unit_price: l.unit_price,
          unit_cost: l.unit_cost,
          total: l.quantity * l.unit_price,
        }));
      if (lineRows.length) await supabase.from('change_order_line_items').insert(lineRows);
    }

    setSaving(false);
    onSaved();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-gray-100">
          <h2 className="text-lg font-bold text-gray-900">New Change Order</h2>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-gray-100 text-gray-400 text-xl font-light">×</button>
        </div>
        <div className="p-6 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1.5">Change Order Title *</label>
            <input type="text" value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g. Add 4 cameras in lobby" className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1.5">Reason</label>
              <select value={reason} onChange={e => setReason(e.target.value)} className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option value="customer_request">Customer Request</option>
                <option value="unforeseen_conditions">Unforeseen Conditions</option>
                <option value="design_change">Design Change</option>
                <option value="code_compliance">Code Compliance</option>
                <option value="scope_clarification">Scope Clarification</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1.5">Schedule Impact (days)</label>
              <input type="number" value={scheduleDays} onChange={e => setScheduleDays(e.target.value)} className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1.5">Description</label>
            <textarea value={description} onChange={e => setDescription(e.target.value)} rows={2} className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" />
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-semibold text-gray-600">Line Items</label>
              <button onClick={addLine} className="text-xs text-blue-600 hover:text-blue-700 font-medium">+ Add Line</button>
            </div>
            <div className="space-y-2">
              {lines.map((line, i) => (
                <div key={i} className="grid grid-cols-12 gap-2 items-center">
                  <input
                    type="text"
                    value={line.description}
                    onChange={e => updateLine(i, 'description', e.target.value)}
                    placeholder="Description"
                    className="col-span-4 px-2.5 py-2 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                  <select
                    value={line.cost_type}
                    onChange={e => updateLine(i, 'cost_type', e.target.value)}
                    className="col-span-2 px-2 py-2 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500"
                  >
                    <option value="labor">Labor</option>
                    <option value="materials">Materials</option>
                    <option value="subcontract">Subcontract</option>
                    <option value="other">Other</option>
                  </select>
                  <input
                    type="number"
                    value={line.quantity}
                    onChange={e => updateLine(i, 'quantity', parseFloat(e.target.value) || 1)}
                    placeholder="Qty"
                    className="col-span-2 px-2.5 py-2 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                  <input
                    type="number"
                    value={line.unit_price}
                    onChange={e => updateLine(i, 'unit_price', parseFloat(e.target.value) || 0)}
                    placeholder="Unit $"
                    className="col-span-2 px-2.5 py-2 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                  <div className="col-span-1 text-right text-xs font-semibold text-gray-700">
                    ${(line.quantity * line.unit_price).toLocaleString()}
                  </div>
                  {lines.length > 1 && (
                    <button onClick={() => removeLine(i)} className="text-gray-300 hover:text-red-400 text-lg font-light">×</button>
                  )}
                </div>
              ))}
            </div>
            <div className="flex justify-end mt-3 pt-3 border-t border-gray-100">
              <div className="text-sm">
                <span className="text-gray-600">Total: </span>
                <span className="font-bold text-gray-900">${total.toLocaleString()}</span>
              </div>
            </div>
          </div>
        </div>
        <div className="flex justify-end gap-3 p-6 border-t border-gray-100">
          <button onClick={onClose} className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg">Cancel</button>
          <button
            onClick={handleSave}
            disabled={saving || !title}
            className="px-5 py-2 bg-blue-600 text-white text-sm font-semibold rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            {saving ? 'Saving...' : 'Create Change Order'}
          </button>
        </div>
      </div>
    </div>
  );
}
