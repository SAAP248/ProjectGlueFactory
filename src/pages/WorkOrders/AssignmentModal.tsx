import { useState, useEffect } from 'react';
import { X, Search, Star, AlertTriangle, Calendar, Clock } from 'lucide-react';
import { supabase } from '../../lib/supabase';

export interface AssignmentRecord {
  id?: string;
  work_order_id: string;
  employee_id: string;
  is_lead: boolean;
  scheduled_date: string | null;
  scheduled_start_time: string | null;
  scheduled_end_time: string | null;
  estimated_duration_minutes: number;
  assignment_notes: string | null;
  visit_sequence: number;
}

interface Employee {
  id: string;
  first_name: string;
  last_name: string;
  role: string;
}

interface Props {
  workOrderId: string;
  editing?: AssignmentRecord | null;
  defaultDate?: string | null;
  defaultStartTime?: string | null;
  defaultDuration?: number;
  onClose: () => void;
  onSaved: () => void;
}

function addMinutes(time: string | null, minutes: number): string | null {
  if (!time) return null;
  const [h, m] = time.split(':').map(Number);
  const total = h * 60 + m + minutes;
  const nh = Math.floor(total / 60) % 24;
  const nm = total % 60;
  return `${String(nh).padStart(2, '0')}:${String(nm).padStart(2, '0')}`;
}

function diffMinutes(start: string | null, end: string | null): number | null {
  if (!start || !end) return null;
  const [sh, sm] = start.split(':').map(Number);
  const [eh, em] = end.split(':').map(Number);
  return (eh * 60 + em) - (sh * 60 + sm);
}

function toDateStr(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function addDaysToStr(dateStr: string | null, days: number): string {
  const base = dateStr ? new Date(dateStr + 'T00:00:00') : new Date();
  base.setDate(base.getDate() + days);
  return toDateStr(base);
}

export default function AssignmentModal({
  workOrderId,
  editing,
  defaultDate,
  defaultStartTime,
  defaultDuration,
  onClose,
  onSaved,
}: Props) {
  const isEdit = !!editing?.id;
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [search, setSearch] = useState('');
  const [employeeId, setEmployeeId] = useState(editing?.employee_id || '');
  const [scheduledDate, setScheduledDate] = useState(
    editing?.scheduled_date || defaultDate || toDateStr(new Date())
  );
  const [startTime, setStartTime] = useState(
    editing?.scheduled_start_time || defaultStartTime || '09:00'
  );
  const initialDuration =
    editing?.estimated_duration_minutes ||
    defaultDuration ||
    60;
  const [duration, setDuration] = useState<number>(initialDuration);
  const [endTime, setEndTime] = useState(
    editing?.scheduled_end_time || addMinutes(
      editing?.scheduled_start_time || defaultStartTime || '09:00',
      initialDuration
    ) || '10:00'
  );
  const [isLead, setIsLead] = useState(editing?.is_lead ?? false);
  const [notes, setNotes] = useState(editing?.assignment_notes || '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [conflict, setConflict] = useState<string | null>(null);
  const [spanDays, setSpanDays] = useState(1);

  useEffect(() => {
    supabase
      .from('employees')
      .select('id, first_name, last_name, role')
      .eq('status', 'active')
      .order('first_name')
      .then(({ data }) => setEmployees(data || []));
  }, []);

  useEffect(() => {
    if (!employeeId || !scheduledDate || !startTime || !endTime) {
      setConflict(null);
      return;
    }
    let cancelled = false;
    supabase
      .from('work_order_technicians')
      .select('id, work_order_id, scheduled_start_time, scheduled_end_time, work_orders(wo_number)')
      .eq('employee_id', employeeId)
      .eq('scheduled_date', scheduledDate)
      .then(({ data }) => {
        if (cancelled) return;
        const overlaps = (data || []).filter(row => {
          if (editing?.id && row.id === editing.id) return false;
          if (row.work_order_id === workOrderId && !editing?.id) return false;
          const rs = row.scheduled_start_time;
          const re = row.scheduled_end_time;
          if (!rs || !re) return false;
          return !(endTime <= rs || startTime >= re);
        });
        if (overlaps.length > 0) {
          const ref = (overlaps[0] as any).work_orders?.wo_number || 'another WO';
          setConflict(`Heads up: this tech has an overlapping assignment on ${ref} at the same time.`);
        } else {
          setConflict(null);
        }
      });
    return () => { cancelled = true; };
  }, [employeeId, scheduledDate, startTime, endTime, editing?.id, workOrderId]);

  function handleStartTimeChange(v: string) {
    setStartTime(v);
    const newEnd = addMinutes(v, duration);
    if (newEnd) setEndTime(newEnd);
  }

  function handleEndTimeChange(v: string) {
    setEndTime(v);
    const d = diffMinutes(startTime, v);
    if (d && d > 0) setDuration(d);
  }

  function handleDurationChange(v: number) {
    setDuration(v);
    const newEnd = addMinutes(startTime, v);
    if (newEnd) setEndTime(newEnd);
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
    if (first) {
      await supabase
        .from('work_orders')
        .update({
          scheduled_date: first.scheduled_date,
          scheduled_time: first.scheduled_start_time,
          updated_at: new Date().toISOString(),
        })
        .eq('id', workOrderId);
    }
  }

  async function handleSave() {
    if (!employeeId) { setError('Please select a technician'); return; }
    if (!scheduledDate) { setError('Please pick a date'); return; }
    setError(null);
    setSaving(true);
    try {
      if (isLead) {
        await supabase
          .from('work_order_technicians')
          .update({ is_lead: false })
          .eq('work_order_id', workOrderId)
          .neq('id', editing?.id || '00000000-0000-0000-0000-000000000000');
      }

      if (isEdit && editing?.id) {
        const { error: upErr } = await supabase
          .from('work_order_technicians')
          .update({
            employee_id: employeeId,
            is_lead: isLead,
            scheduled_date: scheduledDate,
            scheduled_start_time: startTime,
            scheduled_end_time: endTime,
            estimated_duration_minutes: duration,
            assignment_notes: notes || null,
          })
          .eq('id', editing.id);
        if (upErr) throw upErr;
      } else {
        const rows = [];
        for (let i = 0; i < spanDays; i++) {
          rows.push({
            work_order_id: workOrderId,
            employee_id: employeeId,
            is_lead: isLead && i === 0,
            scheduled_date: addDaysToStr(scheduledDate, i),
            scheduled_start_time: startTime,
            scheduled_end_time: endTime,
            estimated_duration_minutes: duration,
            assignment_notes: notes || null,
            visit_sequence: i + 1,
          });
        }
        const { error: insErr } = await supabase
          .from('work_order_technicians')
          .insert(rows);
        if (insErr) throw insErr;
      }

      if (isLead && employeeId) {
        await supabase
          .from('work_orders')
          .update({ assigned_to: employeeId })
          .eq('id', workOrderId);
      }

      await syncWorkOrderHeader();
      onSaved();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to save assignment');
    } finally {
      setSaving(false);
    }
  }

  const filteredEmployees = employees.filter(e => {
    if (!search) return true;
    const s = search.toLowerCase();
    return `${e.first_name} ${e.last_name}`.toLowerCase().includes(s) || e.role.toLowerCase().includes(s);
  });

  const selectedEmployee = employees.find(e => e.id === employeeId);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-xl max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 flex-shrink-0">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">
              {isEdit ? 'Edit Assignment' : 'Add Technician'}
            </h3>
            <p className="text-xs text-gray-500 mt-0.5">
              {isEdit ? 'Update this technician\'s schedule' : 'Schedule a tech for this work order'}
            </p>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-gray-100">
            <X className="h-5 w-5 text-gray-500" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg">
              {error}
            </div>
          )}

          {!isEdit && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Technician</label>
              <div className="relative mb-2">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder="Search by name or role..."
                  className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="max-h-48 overflow-y-auto space-y-1.5 border border-gray-100 rounded-lg p-1.5 bg-gray-50">
                {filteredEmployees.map(emp => (
                  <button
                    key={emp.id}
                    onClick={() => setEmployeeId(emp.id)}
                    className={`w-full flex items-center gap-3 p-2 rounded-md text-left transition-all ${
                      employeeId === emp.id ? 'bg-blue-50 ring-2 ring-blue-500' : 'bg-white hover:bg-gray-100'
                    }`}
                  >
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${
                      employeeId === emp.id ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-600'
                    }`}>
                      {emp.first_name[0]}{emp.last_name[0]}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {emp.first_name} {emp.last_name}
                      </p>
                      <p className="text-xs text-gray-500 capitalize truncate">{emp.role}</p>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {isEdit && selectedEmployee && (
            <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
              <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-sm font-bold text-blue-700">
                {selectedEmployee.first_name[0]}{selectedEmployee.last_name[0]}
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-900">
                  {selectedEmployee.first_name} {selectedEmployee.last_name}
                </p>
                <p className="text-xs text-gray-500 capitalize">{selectedEmployee.role}</p>
              </div>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5 flex items-center gap-1.5">
              <Calendar className="h-4 w-4 text-gray-400" />
              Date
            </label>
            <input
              type="date"
              value={scheduledDate}
              onChange={e => setScheduledDate(e.target.value)}
              className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <div className="flex flex-wrap gap-1.5 mt-2">
              {[
                { label: 'Today', d: 0 },
                { label: 'Tomorrow', d: 1 },
                { label: '+2 days', d: 2 },
                { label: '+3 days', d: 3 },
                { label: 'Next week', d: 7 },
              ].map(q => (
                <button
                  key={q.label}
                  type="button"
                  onClick={() => setScheduledDate(addDaysToStr(toDateStr(new Date()), q.d))}
                  className="text-xs px-2.5 py-1 rounded-full border border-gray-200 text-gray-600 hover:bg-gray-50 hover:border-gray-300 transition-colors"
                >
                  {q.label}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5 flex items-center gap-1.5">
                <Clock className="h-4 w-4 text-gray-400" />
                Start
              </label>
              <input
                type="time"
                value={startTime}
                onChange={e => handleStartTimeChange(e.target.value)}
                className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">End</label>
              <input
                type="time"
                value={endTime}
                onChange={e => handleEndTimeChange(e.target.value)}
                className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Duration</label>
              <select
                value={duration}
                onChange={e => handleDurationChange(parseInt(e.target.value))}
                className="w-full px-2 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none"
              >
                {[30, 60, 90, 120, 180, 240, 360, 480].map(m => (
                  <option key={m} value={m}>
                    {m < 60 ? `${m}m` : m % 60 === 0 ? `${m / 60}h` : `${Math.floor(m / 60)}h ${m % 60}m`}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {!isEdit && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Span Multiple Days</label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min={1}
                  max={14}
                  value={spanDays}
                  onChange={e => setSpanDays(Math.max(1, Math.min(14, parseInt(e.target.value) || 1)))}
                  className="w-20 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <span className="text-sm text-gray-500">
                  {spanDays === 1 ? 'single day' : `consecutive days starting ${new Date(scheduledDate + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`}
                </span>
              </div>
              {spanDays > 1 && (
                <p className="text-xs text-gray-500 mt-1.5">
                  Creates {spanDays} separate assignments at the same time each day.
                </p>
              )}
            </div>
          )}

          <label className="flex items-center gap-3 cursor-pointer select-none">
            <div
              onClick={() => setIsLead(!isLead)}
              className={`w-11 h-6 rounded-full transition-colors flex items-center flex-shrink-0 ${isLead ? 'bg-blue-500' : 'bg-gray-200'}`}
            >
              <div className={`w-5 h-5 bg-white rounded-full shadow transition-transform mx-0.5 ${isLead ? 'translate-x-5' : 'translate-x-0'}`} />
            </div>
            <div className="flex items-center gap-1.5">
              <Star className={`h-4 w-4 ${isLead ? 'text-blue-500 fill-blue-500' : 'text-gray-400'}`} />
              <span className="text-sm font-medium text-gray-700">Lead Technician</span>
            </div>
          </label>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Assignment Notes (optional)</label>
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              rows={2}
              placeholder="Notes specific to this tech / visit..."
              className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            />
          </div>

          {conflict && (
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg flex items-start gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-600 flex-shrink-0 mt-0.5" />
              <p className="text-xs text-amber-800">{conflict}</p>
            </div>
          )}
        </div>

        <div className="px-6 py-4 border-t border-gray-100 bg-gray-50 flex items-center justify-end gap-3 flex-shrink-0">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving || !employeeId}
            className="px-5 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-60"
          >
            {saving ? 'Saving...' : isEdit ? 'Save Changes' : 'Add Assignment'}
          </button>
        </div>
      </div>
    </div>
  );
}
