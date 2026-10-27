import { useEffect, useState } from 'react';
import { Briefcase, Calendar, Clock, ExternalLink, Plus, User, X } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import TechLifecycleActions, { type LifecycleTech } from '../WorkOrders/TechLifecycleActions';
import type { Lead } from './types';

interface Employee {
  id: string;
  first_name: string;
  last_name: string;
}

interface SalesCallRow {
  id: string;
  wo_number: string;
  title: string;
  status: string;
  scheduled_date: string | null;
  scheduled_time: string | null;
  description: string | null;
  work_order_technicians: {
    id: string;
    employee_id: string;
    status: string;
    enroute_at: string | null;
    onsite_at: string | null;
    paused_at: string | null;
    total_paused_minutes: number | null;
    employees: { first_name: string; last_name: string } | null;
  }[];
}

interface Props {
  lead: Lead;
  readOnly: boolean;
  onOpenWorkOrder?: (workOrderId: string) => void;
  onChanged: () => void;
}

const STATUS_STYLES: Record<string, string> = {
  assigned: 'bg-blue-50 text-blue-700 border-blue-200',
  scheduled: 'bg-blue-50 text-blue-700 border-blue-200',
  enroute: 'bg-amber-50 text-amber-700 border-amber-200',
  onsite: 'bg-teal-50 text-teal-700 border-teal-200',
  working: 'bg-teal-50 text-teal-700 border-teal-200',
  on_break: 'bg-gray-100 text-gray-700 border-gray-200',
  completed: 'bg-green-50 text-green-700 border-green-200',
};

const STATUS_LABELS: Record<string, string> = {
  assigned: 'Scheduled',
  scheduled: 'Scheduled',
  enroute: 'En Route',
  onsite: 'On Site',
  working: 'In Progress',
  on_break: 'On Break',
  completed: 'Completed',
};

function formatDate(d: string | null) {
  if (!d) return 'No date';
  return new Date(d + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
}

function formatClock(t: string | null) {
  if (!t) return null;
  const [h, m] = t.split(':').map(Number);
  return `${h % 12 || 12}:${String(m).padStart(2, '0')} ${h >= 12 ? 'PM' : 'AM'}`;
}

export default function LeadSalesCalls({ lead, readOnly, onOpenWorkOrder, onChanged }: Props) {
  const [calls, setCalls] = useState<SalesCallRow[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [showForm, setShowForm] = useState(false);

  useEffect(() => {
    load();
    supabase.from('employees').select('id, first_name, last_name').order('first_name')
      .then(({ data }) => setEmployees((data as Employee[]) ?? []));
  }, [lead.id]);

  async function load() {
    setLoading(true);
    const { data, error } = await supabase
      .from('work_orders')
      .select('id, wo_number, title, status, scheduled_date, scheduled_time, description, work_order_technicians(id, employee_id, status, enroute_at, onsite_at, paused_at, total_paused_minutes, employees(first_name, last_name))')
      .eq('lead_id', lead.id)
      .order('scheduled_date', { ascending: false, nullsFirst: false });
    if (error) setLoadError('Could not load sales calls.');
    else { setLoadError(''); setCalls((data as unknown as SalesCallRow[]) ?? []); }
    setLoading(false);
  }

  function handleChanged() {
    load();
    onChanged();
  }

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-bold text-gray-900">Sales Calls</h3>
          <p className="text-xs text-gray-500 mt-0.5">Visits assigned to a salesperson for this lead</p>
        </div>
        {!readOnly && (
          <button
            onClick={() => setShowForm(true)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-blue-600 text-white text-xs font-semibold hover:bg-blue-700 transition-colors shadow-sm"
          >
            <Plus className="h-3.5 w-3.5" /> Schedule Call
          </button>
        )}
      </div>

      {loadError && <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl px-4 py-3">{loadError}</div>}

      {loading ? (
        <div className="flex justify-center py-10">
          <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : calls.length === 0 ? (
        <div className="text-center py-10 border-2 border-dashed border-gray-200 rounded-xl">
          <Briefcase className="h-8 w-8 text-gray-300 mx-auto mb-2" />
          <p className="text-sm font-medium text-gray-600">No sales calls yet</p>
          <p className="text-xs text-gray-400 mt-1">Schedule a visit to meet with this lead</p>
        </div>
      ) : (
        <div className="space-y-3">
          {calls.map(call => {
            const tech = call.work_order_technicians[0];
            const techStatus = tech?.status ?? call.status;
            const lifecycle: LifecycleTech | null = tech ? {
              wotId: tech.id,
              workOrderId: call.id,
              employeeId: tech.employee_id,
              wotStatus: tech.status,
              enrouteAt: tech.enroute_at,
              onsiteAt: tech.onsite_at,
              pausedAt: tech.paused_at,
              totalPausedMinutes: tech.total_paused_minutes ?? 0,
              employeeName: tech.employees ? `${tech.employees.first_name} ${tech.employees.last_name}` : 'Salesperson',
            } : null;
            return (
              <div key={call.id} className="border border-gray-200 rounded-xl p-4 hover:border-gray-300 transition-colors">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono text-gray-400">{call.wo_number}</span>
                      <span className={`px-2 py-0.5 rounded-full text-[11px] font-semibold border ${STATUS_STYLES[techStatus] ?? 'bg-gray-50 text-gray-600 border-gray-200'}`}>
                        {STATUS_LABELS[techStatus] ?? techStatus}
                      </span>
                    </div>
                    <p className="text-sm font-semibold text-gray-900 mt-1 truncate">{call.title}</p>
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1.5 text-xs text-gray-500">
                      <span className="flex items-center gap-1"><Calendar className="h-3 w-3" />{formatDate(call.scheduled_date)}</span>
                      {call.scheduled_time && <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{formatClock(call.scheduled_time)}</span>}
                      {lifecycle && <span className="flex items-center gap-1"><User className="h-3 w-3" />{lifecycle.employeeName}</span>}
                    </div>
                    {call.description && <p className="text-xs text-gray-600 mt-2 line-clamp-2">{call.description}</p>}
                  </div>
                  {onOpenWorkOrder && (
                    <button
                      onClick={() => onOpenWorkOrder(call.id)}
                      className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors shrink-0"
                      title="Open work order"
                    >
                      <ExternalLink className="h-4 w-4" />
                    </button>
                  )}
                </div>
                {lifecycle && techStatus !== 'completed' && (
                  <div className="mt-3 pt-3 border-t border-gray-100">
                    <TechLifecycleActions tech={lifecycle} onChanged={handleChanged} size="sm" />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {showForm && (
        <ScheduleCallModal
          lead={lead}
          employees={employees}
          onClose={() => setShowForm(false)}
          onCreated={() => { setShowForm(false); handleChanged(); }}
        />
      )}
    </div>
  );
}

function ScheduleCallModal({ lead, employees, onClose, onCreated }: {
  lead: Lead;
  employees: Employee[];
  onClose: () => void;
  onCreated: () => void;
}) {
  const [employeeId, setEmployeeId] = useState(lead.assigned_employee_id ?? '');
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [time, setTime] = useState('10:00');
  const [duration, setDuration] = useState('60');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  async function handleSave() {
    if (!employeeId) { setError('Choose a salesperson.'); return; }
    if (!date) { setError('Choose a date.'); return; }
    setSaving(true);
    setError('');

    const { data: wo, error: woErr } = await supabase.from('work_orders').insert({
      wo_number: `WO-${Date.now().toString().slice(-6)}`,
      title: `Sales Call - ${lead.contact_name}`,
      description: notes.trim() || null,
      work_order_type: 'sales_call',
      status: 'scheduled',
      source: 'office',
      lead_id: lead.id,
      assigned_to: employeeId,
      scheduled_date: date,
      scheduled_time: time || null,
      estimated_duration: parseInt(duration) || 60,
    }).select('id').maybeSingle();

    if (woErr || !wo) { setError('Could not schedule the sales call. Please try again.'); setSaving(false); return; }

    const { error: techErr } = await supabase.from('work_order_technicians').insert({
      work_order_id: wo.id,
      employee_id: employeeId,
      is_lead: true,
      status: 'assigned',
      scheduled_date: date,
      scheduled_start_time: time || null,
      estimated_duration_minutes: parseInt(duration) || 60,
    });
    if (techErr) { setError('The call was created but the salesperson could not be assigned.'); setSaving(false); return; }

    const emp = employees.find(e => e.id === employeeId);
    await supabase.from('lead_activity_log').insert({
      lead_id: lead.id,
      action: `Sales call scheduled for ${date}${time ? ' at ' + formatClock(time) : ''}${emp ? ' with ' + emp.first_name + ' ' + emp.last_name : ''}`,
    });
    if (lead.status === 'new' || lead.status === 'contacted') {
      await supabase.from('leads').update({ status: 'scheduled', updated_at: new Date().toISOString() }).eq('id', lead.id);
    }
    onCreated();
  }

  const input = 'w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500';

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="font-bold text-gray-900">Schedule Sales Call</h2>
          <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition-colors">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="px-6 py-5 space-y-4">
          {error && <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl px-4 py-3">{error}</div>}
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1.5">Salesperson</label>
            <select value={employeeId} onChange={e => setEmployeeId(e.target.value)} className={input}>
              <option value="">Select salesperson</option>
              {employees.map(e => <option key={e.id} value={e.id}>{e.first_name} {e.last_name}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div className="col-span-1">
              <label className="block text-xs font-semibold text-gray-600 mb-1.5">Date</label>
              <input type="date" value={date} onChange={e => setDate(e.target.value)} className={input} />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1.5">Time</label>
              <input type="time" value={time} onChange={e => setTime(e.target.value)} className={input} />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1.5">Length</label>
              <select value={duration} onChange={e => setDuration(e.target.value)} className={input}>
                <option value="30">30 min</option>
                <option value="60">1 hr</option>
                <option value="90">1.5 hr</option>
                <option value="120">2 hr</option>
              </select>
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1.5">Notes for the salesperson</label>
            <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={3} placeholder="What to discuss, gate codes, best entrance..." className={input + ' resize-none'} />
          </div>
        </div>
        <div className="flex justify-end gap-2 px-6 py-4 border-t border-gray-100">
          <button onClick={onClose} className="px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">Cancel</button>
          <button onClick={handleSave} disabled={saving} className="px-4 py-2 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors disabled:opacity-50">
            {saving ? 'Scheduling...' : 'Schedule Call'}
          </button>
        </div>
      </div>
    </div>
  );
}
