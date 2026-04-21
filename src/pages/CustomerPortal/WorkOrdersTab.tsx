import { useState } from 'react';
import { ClipboardList, Plus, X, CheckCircle, Clock, AlertCircle, Calendar, ChevronRight } from 'lucide-react';
import type { PortalWorkOrder, WORequest, PortalUser } from './types';
import { supabase } from '../../lib/supabase';

const STATUS_COLORS: Record<string, string> = {
  scheduled: 'bg-blue-100 text-blue-700',
  unassigned: 'bg-gray-100 text-gray-600',
  in_progress: 'bg-amber-100 text-amber-700',
  completed: 'bg-emerald-100 text-emerald-700',
  on_hold: 'bg-orange-100 text-orange-700',
  cancelled: 'bg-gray-100 text-gray-500',
  go_back: 'bg-red-100 text-red-700',
};

interface Props {
  workOrders: PortalWorkOrder[];
  requests: WORequest[];
  user: PortalUser;
  sites: { id: string; name: string }[];
  loading: boolean;
  onRefresh: () => void;
}

export default function WorkOrdersTab({ workOrders, requests, user, sites, loading, onRefresh }: Props) {
  const [view, setView] = useState<'open' | 'completed' | 'requests'>('open');
  const [showRequestForm, setShowRequestForm] = useState(false);
  const [form, setForm] = useState({ title: '', description: '', priority: 'normal', preferred_date: '', preferred_time: '', site_id: '' });
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const openWOs = workOrders.filter(w => !['completed', 'cancelled'].includes(w.status));
  const completedWOs = workOrders.filter(w => w.status === 'completed');

  async function submitRequest() {
    if (!form.title.trim()) return;
    setSubmitting(true);
    await supabase.from('portal_wo_requests').insert({
      company_id: user.company_id,
      portal_user_id: user.id,
      title: form.title,
      description: form.description,
      priority: form.priority,
      preferred_date: form.preferred_date || null,
      preferred_time: form.preferred_time || null,
      site_id: form.site_id || null,
      status: 'pending',
    });
    setSubmitting(false);
    setSubmitted(true);
    setForm({ title: '', description: '', priority: 'normal', preferred_date: '', preferred_time: '', site_id: '' });
    setTimeout(() => {
      setSubmitted(false);
      setShowRequestForm(false);
      setView('requests');
      onRefresh();
    }, 1800);
  }

  if (loading) return <div className="flex justify-center py-16"><div className="animate-spin rounded-full h-7 w-7 border-2 border-blue-600 border-t-transparent" /></div>;

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Work Orders</h2>
          <p className="text-sm text-gray-500 mt-0.5">{workOrders.length} work order{workOrders.length !== 1 ? 's' : ''}</p>
        </div>
        <button
          onClick={() => setShowRequestForm(true)}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm px-4 py-2.5 rounded-xl transition-colors"
        >
          <Plus className="h-4 w-4" />
          Request Service
        </button>
      </div>

      {/* Tab selector */}
      <div className="flex gap-1 border-b border-gray-200">
        {[
          { id: 'open' as const, label: `Open (${openWOs.length})` },
          { id: 'completed' as const, label: `Completed (${completedWOs.length})` },
          { id: 'requests' as const, label: `My Requests (${requests.length})` },
        ].map(t => (
          <button
            key={t.id}
            onClick={() => setView(t.id)}
            className={`px-4 py-2.5 text-sm font-semibold border-b-2 transition-colors whitespace-nowrap ${
              view === t.id ? 'border-blue-600 text-blue-700' : 'border-transparent text-gray-500 hover:text-gray-800'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Open WOs */}
      {view === 'open' && (
        openWOs.length === 0 ? (
          <div className="bg-white rounded-2xl border border-gray-200 p-10 text-center">
            <CheckCircle className="h-12 w-12 text-emerald-300 mx-auto mb-3" />
            <p className="font-semibold text-gray-700">No open work orders</p>
            <p className="text-sm text-gray-400 mt-1">All caught up! Use "Request Service" to schedule new work.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {openWOs.map(wo => <WOCard key={wo.id} wo={wo} />)}
          </div>
        )
      )}

      {/* Completed WOs */}
      {view === 'completed' && (
        completedWOs.length === 0 ? (
          <div className="bg-white rounded-2xl border border-gray-200 p-10 text-center">
            <ClipboardList className="h-12 w-12 text-gray-300 mx-auto mb-3" />
            <p className="font-semibold text-gray-700">No completed work orders yet</p>
          </div>
        ) : (
          <div className="space-y-3">
            {completedWOs.map(wo => <WOCard key={wo.id} wo={wo} />)}
          </div>
        )
      )}

      {/* Requests */}
      {view === 'requests' && (
        requests.length === 0 ? (
          <div className="bg-white rounded-2xl border border-gray-200 p-10 text-center">
            <ClipboardList className="h-12 w-12 text-gray-300 mx-auto mb-3" />
            <p className="font-semibold text-gray-700">No service requests yet</p>
            <p className="text-sm text-gray-400 mt-1">Use "Request Service" to submit a new request.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {requests.map(r => (
              <div key={r.id} className="bg-white rounded-2xl border border-gray-200 p-5">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <p className="font-bold text-gray-900">{r.title}</p>
                      <span className={`text-xs font-semibold px-2.5 py-0.5 rounded-full ${
                        r.status === 'pending' ? 'bg-amber-100 text-amber-700' :
                        r.status === 'approved' ? 'bg-blue-100 text-blue-700' :
                        r.status === 'converted' ? 'bg-emerald-100 text-emerald-700' :
                        'bg-gray-100 text-gray-600'
                      }`}>
                        {r.status}
                      </span>
                    </div>
                    {r.description && <p className="text-sm text-gray-600 mt-1">{r.description}</p>}
                    <div className="flex gap-3 text-xs text-gray-400 mt-2">
                      <span>Submitted: {new Date(r.created_at).toLocaleDateString()}</span>
                      {r.preferred_date && <span>Preferred: {new Date(r.preferred_date + 'T00:00:00').toLocaleDateString()}</span>}
                      {r.sites && <span>Site: {r.sites.name}</span>}
                    </div>
                  </div>
                  <span className={`text-xs font-semibold px-2 py-0.5 rounded-full flex-shrink-0 ${
                    r.priority === 'high' ? 'bg-orange-100 text-orange-700' :
                    r.priority === 'emergency' ? 'bg-red-100 text-red-700' :
                    'bg-gray-100 text-gray-600'
                  }`}>
                    {r.priority}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )
      )}

      {/* Request Form Modal */}
      {showRequestForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
            {submitted ? (
              <div className="p-10 text-center flex-1 flex flex-col items-center justify-center">
                <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center mb-4">
                  <CheckCircle className="h-8 w-8 text-emerald-600" />
                </div>
                <h3 className="text-xl font-bold text-gray-900">Request Submitted</h3>
                <p className="text-sm text-gray-500 mt-1">We'll be in touch to schedule your service.</p>
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 flex-shrink-0">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-blue-100 flex items-center justify-center">
                      <ClipboardList className="h-5 w-5 text-blue-600" />
                    </div>
                    <div>
                      <h3 className="font-bold text-gray-900">Request Service</h3>
                      <p className="text-xs text-gray-500">We'll contact you to schedule</p>
                    </div>
                  </div>
                  <button onClick={() => setShowRequestForm(false)} className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center hover:bg-gray-200">
                    <X className="h-4 w-4" />
                  </button>
                </div>
                <div className="p-6 space-y-4 overflow-y-auto">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1.5">What do you need? *</label>
                    <input
                      type="text"
                      value={form.title}
                      onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                      placeholder="e.g., Alarm not communicating, new camera install..."
                      className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1.5">Description</label>
                    <textarea
                      value={form.description}
                      onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                      rows={3}
                      placeholder="Please describe the issue or request in detail..."
                      className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-1.5">Priority</label>
                      <select value={form.priority} onChange={e => setForm(f => ({ ...f, priority: e.target.value }))} className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white">
                        <option value="low">Low</option>
                        <option value="normal">Normal</option>
                        <option value="high">High</option>
                        <option value="emergency">Emergency</option>
                      </select>
                    </div>
                    {sites.length > 0 && (
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-1.5">Site</label>
                        <select value={form.site_id} onChange={e => setForm(f => ({ ...f, site_id: e.target.value }))} className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white">
                          <option value="">Any site</option>
                          {sites.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                        </select>
                      </div>
                    )}
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-1.5">Preferred Date</label>
                      <input type="date" value={form.preferred_date} onChange={e => setForm(f => ({ ...f, preferred_date: e.target.value }))} className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-1.5">Preferred Time</label>
                      <select value={form.preferred_time} onChange={e => setForm(f => ({ ...f, preferred_time: e.target.value }))} className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white">
                        <option value="">Any time</option>
                        <option value="morning">Morning (8am–12pm)</option>
                        <option value="afternoon">Afternoon (12pm–5pm)</option>
                        <option value="evening">Evening (5pm–8pm)</option>
                      </select>
                    </div>
                  </div>
                  <button
                    onClick={submitRequest}
                    disabled={submitting || !form.title.trim()}
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-4 rounded-2xl text-sm transition-colors disabled:opacity-60"
                  >
                    {submitting ? 'Submitting...' : 'Submit Service Request'}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function WOCard({ wo }: { wo: PortalWorkOrder }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-200 p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <span className="text-xs font-mono font-bold text-gray-400">{wo.wo_number}</span>
            <span className={`text-xs font-semibold px-2.5 py-0.5 rounded-full ${STATUS_COLORS[wo.status] || 'bg-gray-100 text-gray-600'}`}>
              {wo.status.replace(/_/g, ' ')}
            </span>
            <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
              wo.priority === 'high' ? 'bg-orange-100 text-orange-700' :
              wo.priority === 'emergency' ? 'bg-red-100 text-red-700' :
              'bg-gray-100 text-gray-600'
            }`}>
              {wo.priority}
            </span>
          </div>
          <p className="font-bold text-gray-900">{wo.title}</p>
          {wo.sites && <p className="text-sm text-gray-500 mt-0.5">{wo.sites.name}</p>}
          <div className="flex gap-3 text-xs text-gray-400 mt-2">
            {wo.scheduled_date && (
              <span className="flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                {new Date(wo.scheduled_date + 'T00:00:00').toLocaleDateString()}
              </span>
            )}
            <span className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {new Date(wo.created_at).toLocaleDateString()}
            </span>
          </div>
          {wo.resolution_notes && (
            <div className="mt-3 bg-emerald-50 rounded-xl p-3 text-sm text-emerald-800 border border-emerald-200">
              <span className="font-semibold">Resolution: </span>{wo.resolution_notes}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
