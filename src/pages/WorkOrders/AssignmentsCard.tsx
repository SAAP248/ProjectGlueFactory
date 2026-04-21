import { useState } from 'react';
import { Plus, Pencil, Trash2, Star, Calendar, Clock, Copy, Users, AlertCircle } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import AssignmentModal, { AssignmentRecord } from './AssignmentModal';
import TechLifecycleActions, { type LifecycleTech } from './TechLifecycleActions';

export interface TechAssignment {
  id: string;
  employee_id: string;
  is_lead: boolean;
  scheduled_date: string | null;
  scheduled_start_time: string | null;
  scheduled_end_time: string | null;
  estimated_duration_minutes: number;
  assignment_notes: string | null;
  visit_sequence: number;
  enroute_at: string | null;
  onsite_at: string | null;
  completed_at: string | null;
  paused_at?: string | null;
  total_paused_minutes?: number | null;
  status?: string | null;
  employees?: { first_name: string; last_name: string; role: string };
}

interface Props {
  workOrderId: string;
  assignments: TechAssignment[];
  defaultDate: string | null;
  defaultStartTime: string | null;
  defaultDuration: number;
  onChanged: () => void;
}

function formatDateLabel(dateStr: string | null): string {
  if (!dateStr) return 'Unscheduled';
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
}

function formatTimeLabel(time: string | null): string {
  if (!time) return '';
  const [h, m] = time.split(':').map(Number);
  const period = h >= 12 ? 'PM' : 'AM';
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:${String(m).padStart(2, '0')} ${period}`;
}

function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes}m`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m === 0 ? `${h}h` : `${h}h ${m}m`;
}

function addDaysToStr(dateStr: string | null, days: number): string {
  const base = dateStr ? new Date(dateStr + 'T00:00:00') : new Date();
  base.setDate(base.getDate() + days);
  const y = base.getFullYear();
  const m = String(base.getMonth() + 1).padStart(2, '0');
  const d = String(base.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export default function AssignmentsCard({
  workOrderId,
  assignments,
  defaultDate,
  defaultStartTime,
  defaultDuration,
  onChanged,
}: Props) {
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<AssignmentRecord | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  function openNew() {
    setEditing(null);
    setModalOpen(true);
  }

  function openEdit(a: TechAssignment) {
    setEditing({
      id: a.id,
      work_order_id: workOrderId,
      employee_id: a.employee_id,
      is_lead: a.is_lead,
      scheduled_date: a.scheduled_date,
      scheduled_start_time: a.scheduled_start_time,
      scheduled_end_time: a.scheduled_end_time,
      estimated_duration_minutes: a.estimated_duration_minutes,
      assignment_notes: a.assignment_notes,
      visit_sequence: a.visit_sequence,
    });
    setModalOpen(true);
  }

  async function syncWorkOrderHeader() {
    const { data } = await supabase
      .from('work_order_technicians')
      .select('scheduled_date, scheduled_start_time')
      .eq('work_order_id', workOrderId)
      .not('scheduled_date', 'is', null)
      .order('scheduled_date', { ascending: true })
      .order('scheduled_start_time', { ascending: true })
      .limit(1);
    const first = data?.[0];
    await supabase
      .from('work_orders')
      .update({
        scheduled_date: first?.scheduled_date || null,
        scheduled_time: first?.scheduled_start_time || null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', workOrderId);
  }

  async function deleteAssignment(id: string) {
    setBusyId(id);
    await supabase.from('work_order_technicians').delete().eq('id', id);
    await syncWorkOrderHeader();
    setBusyId(null);
    setConfirmDelete(null);
    onChanged();
  }

  async function duplicateToNextDay(a: TechAssignment) {
    setBusyId(a.id);
    const nextDate = addDaysToStr(a.scheduled_date, 1);
    await supabase.from('work_order_technicians').insert({
      work_order_id: workOrderId,
      employee_id: a.employee_id,
      is_lead: false,
      scheduled_date: nextDate,
      scheduled_start_time: a.scheduled_start_time,
      scheduled_end_time: a.scheduled_end_time,
      estimated_duration_minutes: a.estimated_duration_minutes,
      assignment_notes: a.assignment_notes,
      visit_sequence: a.visit_sequence + 1,
    });
    setBusyId(null);
    onChanged();
  }

  async function promoteLead(id: string) {
    setBusyId(id);
    const target = assignments.find(a => a.id === id);
    await supabase
      .from('work_order_technicians')
      .update({ is_lead: false })
      .eq('work_order_id', workOrderId);
    await supabase
      .from('work_order_technicians')
      .update({ is_lead: true })
      .eq('id', id);
    if (target) {
      await supabase
        .from('work_orders')
        .update({ assigned_to: target.employee_id })
        .eq('id', workOrderId);
    }
    setBusyId(null);
    onChanged();
  }

  const grouped = assignments.reduce<Record<string, TechAssignment[]>>((acc, a) => {
    const key = a.scheduled_date || 'unscheduled';
    if (!acc[key]) acc[key] = [];
    acc[key].push(a);
    return acc;
  }, {});

  const sortedKeys = Object.keys(grouped).sort((a, b) => {
    if (a === 'unscheduled') return 1;
    if (b === 'unscheduled') return -1;
    return a.localeCompare(b);
  });

  sortedKeys.forEach(k => {
    grouped[k].sort((a, b) => (a.scheduled_start_time || '').localeCompare(b.scheduled_start_time || ''));
  });

  const totalMinutes = assignments.reduce((s, a) => s + (a.estimated_duration_minutes || 0), 0);
  const distinctDates = new Set(assignments.map(a => a.scheduled_date).filter(Boolean)).size;
  const distinctTechs = new Set(assignments.map(a => a.employee_id)).size;

  return (
    <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
      <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-blue-50 flex items-center justify-center">
            <Users className="h-4 w-4 text-blue-600" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-gray-900">Technicians &amp; Schedule</h3>
            {assignments.length > 0 && (
              <p className="text-xs text-gray-500 mt-0.5">
                {distinctTechs} tech{distinctTechs !== 1 ? 's' : ''} · {distinctDates || 0} day{distinctDates !== 1 ? 's' : ''} · {formatDuration(totalMinutes)} scheduled
              </p>
            )}
          </div>
        </div>
        <button
          onClick={openNew}
          className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-blue-700 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors"
        >
          <Plus className="h-4 w-4" />
          Add Technician
        </button>
      </div>

      {assignments.length === 0 ? (
        <div className="px-5 py-10 text-center">
          <Users className="h-8 w-8 text-gray-300 mx-auto mb-2" />
          <p className="text-sm text-gray-500">No technicians assigned yet</p>
          <p className="text-xs text-gray-400 mt-0.5">Add a tech to schedule this job</p>
        </div>
      ) : (
        <div className="divide-y divide-gray-100">
          {sortedKeys.map(dateKey => (
            <div key={dateKey} className="px-5 py-3">
              <div className="flex items-center gap-2 mb-2.5">
                <Calendar className="h-3.5 w-3.5 text-gray-400" />
                <span className="text-xs font-semibold text-gray-700 uppercase tracking-wide">
                  {formatDateLabel(dateKey === 'unscheduled' ? null : dateKey)}
                </span>
                {dateKey !== 'unscheduled' && (
                  <span className="text-xs text-gray-400">
                    · {grouped[dateKey].length} assignment{grouped[dateKey].length !== 1 ? 's' : ''}
                  </span>
                )}
              </div>
              <div className="space-y-2">
                {grouped[dateKey].map(a => {
                  const hasStarted = !!a.enroute_at || !!a.onsite_at;
                  const isDone = !!a.completed_at;
                  return (
                    <div
                      key={a.id}
                      className={`group flex items-center gap-3 p-3 rounded-lg border transition-colors ${
                        isDone ? 'border-emerald-100 bg-emerald-50/40' :
                        hasStarted ? 'border-amber-100 bg-amber-50/40' :
                        'border-gray-100 bg-gray-50/40 hover:bg-white hover:border-gray-200'
                      }`}
                    >
                      <div className="w-9 h-9 rounded-full bg-blue-100 flex items-center justify-center text-xs font-bold text-blue-700 flex-shrink-0">
                        {a.employees?.first_name?.[0]}{a.employees?.last_name?.[0]}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="text-sm font-medium text-gray-900 truncate">
                            {a.employees?.first_name} {a.employees?.last_name}
                          </p>
                          {a.is_lead ? (
                            <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-blue-700 bg-blue-100 px-1.5 py-0.5 rounded-full">
                              <Star className="h-2.5 w-2.5 fill-blue-600 text-blue-600" />
                              LEAD
                            </span>
                          ) : (
                            <button
                              onClick={() => promoteLead(a.id)}
                              disabled={busyId === a.id}
                              className="opacity-0 group-hover:opacity-100 text-[10px] font-semibold text-gray-500 hover:text-blue-600 border border-gray-200 hover:border-blue-300 px-1.5 py-0.5 rounded-full transition-all"
                            >
                              Set Lead
                            </button>
                          )}
                          {isDone && (
                            <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-100 px-1.5 py-0.5 rounded-full">
                              COMPLETED
                            </span>
                          )}
                          {!isDone && hasStarted && (
                            <span className="text-[10px] font-semibold text-amber-700 bg-amber-100 px-1.5 py-0.5 rounded-full">
                              IN PROGRESS
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-3 mt-0.5 text-xs text-gray-500">
                          <span className="capitalize">{a.employees?.role}</span>
                          {a.scheduled_start_time && (
                            <span className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {formatTimeLabel(a.scheduled_start_time)}
                              {a.scheduled_end_time && ` – ${formatTimeLabel(a.scheduled_end_time)}`}
                            </span>
                          )}
                          <span className="text-gray-400">
                            {formatDuration(a.estimated_duration_minutes || 0)}
                          </span>
                        </div>
                        {a.assignment_notes && (
                          <p className="text-xs text-gray-500 italic mt-1 truncate">
                            "{a.assignment_notes}"
                          </p>
                        )}
                        <div className="mt-2">
                          <TechLifecycleActions
                            tech={{
                              wotId: a.id,
                              workOrderId,
                              employeeId: a.employee_id,
                              wotStatus: a.status || (a.completed_at ? 'completed' : a.onsite_at ? 'onsite' : a.enroute_at ? 'enroute' : 'assigned'),
                              enrouteAt: a.enroute_at,
                              onsiteAt: a.onsite_at,
                              pausedAt: a.paused_at ?? null,
                              totalPausedMinutes: a.total_paused_minutes ?? null,
                              employeeName: `${a.employees?.first_name ?? ''} ${a.employees?.last_name ?? ''}`.trim(),
                            } satisfies LifecycleTech}
                            onChanged={onChanged}
                            size="sm"
                          />
                        </div>
                      </div>
                      <div className="flex items-center gap-1 flex-shrink-0">
                        <button
                          onClick={() => duplicateToNextDay(a)}
                          disabled={busyId === a.id}
                          title="Duplicate to next day"
                          className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-colors"
                        >
                          <Copy className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={() => openEdit(a)}
                          title="Edit assignment"
                          className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-md transition-colors"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={() => setConfirmDelete(a.id)}
                          disabled={busyId === a.id}
                          title="Remove assignment"
                          className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      {modalOpen && (
        <AssignmentModal
          workOrderId={workOrderId}
          editing={editing}
          defaultDate={defaultDate}
          defaultStartTime={defaultStartTime}
          defaultDuration={defaultDuration}
          onClose={() => setModalOpen(false)}
          onSaved={onChanged}
        />
      )}

      {confirmDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40" onClick={() => setConfirmDelete(null)} />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6">
            <div className="flex items-start gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0">
                <AlertCircle className="h-5 w-5 text-red-600" />
              </div>
              <div>
                <h3 className="text-base font-semibold text-gray-900">Remove assignment?</h3>
                <p className="text-sm text-gray-500 mt-1">
                  This will unassign this technician for this scheduled visit. Time tracking records will be kept.
                </p>
              </div>
            </div>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setConfirmDelete(null)}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={() => deleteAssignment(confirmDelete)}
                disabled={busyId === confirmDelete}
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 disabled:opacity-60"
              >
                {busyId === confirmDelete ? 'Removing...' : 'Remove'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
