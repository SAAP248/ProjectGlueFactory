import { useEffect, useState } from 'react';
import { CalendarPlus, Trash2, Sun, Moon, Clock, Users, RotateCcw } from 'lucide-react';
import { supabase } from '../../lib/supabase';

export type VisitTimeBlock = 'am' | 'pm' | 'specific';

export interface ExtraVisit {
  key: string;
  date: string;
  time_block: VisitTimeBlock;
  time: string;
  duration: string;
  crew: string[] | null;
}

interface CrewMember {
  id: string;
  first_name: string;
  last_name: string;
}

interface Booking {
  employee_id: string;
  scheduled_date: string;
  scheduled_start_time: string | null;
  scheduled_end_time: string | null;
  work_order_id: string;
}

interface Props {
  visits: ExtraVisit[];
  onChange: (visits: ExtraVisit[]) => void;
  mainCrew: string[];
  mainDate: string;
  employees: CrewMember[];
  excludeWorkOrderId?: string;
}

export function computeEndTime(start: string | null, minutes: number): string | null {
  if (!start) return null;
  const [h, m] = start.split(':').map(Number);
  const total = h * 60 + m + minutes;
  return `${String(Math.floor(total / 60) % 24).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`;
}

export function visitStartTime(v: Pick<ExtraVisit, 'time_block' | 'time'>): string | null {
  if (v.time_block === 'am') return '08:00';
  if (v.time_block === 'pm') return '12:00';
  return v.time || null;
}

function nextDay(date: string): string {
  if (!date) return '';
  const d = new Date(date + 'T12:00:00');
  d.setDate(d.getDate() + 1);
  return d.toISOString().slice(0, 10);
}

function toMinutes(t: string) {
  const [h, m] = t.split(':').map(Number);
  return h * 60 + m;
}

const DURATIONS = [
  ['60', '1 hour'], ['120', '2 hours'], ['180', '3 hours'], ['240', '4 hours'], ['360', '6 hours'], ['480', '8 hours (full day)'],
];

export default function ExtraVisitsEditor({ visits, onChange, mainCrew, mainDate, employees, excludeWorkOrderId }: Props) {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const dates = visits.map(v => v.date).filter(Boolean);
  const dateKey = [...new Set(dates)].sort().join(',');

  useEffect(() => {
    if (!dateKey) { setBookings([]); return; }
    supabase
      .from('work_order_technicians')
      .select('employee_id, scheduled_date, scheduled_start_time, scheduled_end_time, work_order_id')
      .in('scheduled_date', dateKey.split(','))
      .then(({ data }) => setBookings(((data || []) as Booking[]).filter(b => b.work_order_id !== excludeWorkOrderId)));
  }, [dateKey, excludeWorkOrderId]);

  function update(key: string, patch: Partial<ExtraVisit>) {
    onChange(visits.map(v => (v.key === key ? { ...v, ...patch } : v)));
  }

  function addDay() {
    const last = visits.length > 0 ? visits[visits.length - 1].date : mainDate;
    onChange([...visits, { key: crypto.randomUUID(), date: nextDay(last), time_block: 'am', time: '08:00', duration: '480', crew: null }]);
  }

  function toggleCrew(v: ExtraVisit, empId: string) {
    const current = v.crew ?? mainCrew;
    const next = current.includes(empId) ? current.filter(id => id !== empId) : [...current, empId];
    update(v.key, { crew: next });
  }

  function crewStatus(v: ExtraVisit, empId: string): 'free' | 'busy' | 'conflict' {
    const theirs = bookings.filter(b => b.employee_id === empId && b.scheduled_date === v.date);
    if (theirs.length === 0) return 'free';
    const start = visitStartTime(v);
    if (!start) return 'busy';
    const s = toMinutes(start);
    const e = s + (parseInt(v.duration) || 240);
    const clash = theirs.some(b => {
      if (!b.scheduled_start_time) return false;
      const bs = toMinutes(b.scheduled_start_time);
      const be = b.scheduled_end_time ? toMinutes(b.scheduled_end_time) : bs + 60;
      return s < be && e > bs;
    });
    return clash ? 'conflict' : 'busy';
  }

  return (
    <div className="border-t border-gray-100 pt-5">
      <div className="flex items-center justify-between mb-3">
        <div>
          <p className="text-sm font-semibold text-gray-800">Additional Days</p>
          <p className="text-xs text-gray-500">For jobs that span more than one day. Each day appears on the dispatch board.</p>
        </div>
        <button
          type="button"
          onClick={addDay}
          disabled={!mainDate}
          title={mainDate ? '' : 'Pick the first day above'}
          className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg border border-blue-300 text-blue-700 hover:bg-blue-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          <CalendarPlus className="h-3.5 w-3.5" /> Add another day
        </button>
      </div>

      <div className="space-y-3">
        {visits.map((v, idx) => {
          const crew = v.crew ?? mainCrew;
          const overridden = v.crew !== null;
          return (
            <div key={v.key} className="rounded-xl border border-gray-200 bg-white p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-gray-500">Day {idx + 2}</span>
                <button type="button" onClick={() => onChange(visits.filter(x => x.key !== v.key))} className="p-1 text-gray-400 hover:text-red-500 transition-colors" aria-label="Remove day">
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <input type="date" value={v.date} onChange={e => update(v.key, { date: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                <div className="grid grid-cols-3 gap-1.5">
                  {([['am', 'AM', Sun], ['pm', 'PM', Moon], ['specific', 'Time', Clock]] as const).map(([val, label, Icon]) => (
                    <button
                      key={val}
                      type="button"
                      onClick={() => update(v.key, { time_block: val, time: val === 'am' ? '08:00' : val === 'pm' ? '12:00' : v.time, duration: val === 'specific' ? v.duration : '240' })}
                      className={`flex items-center justify-center gap-1 rounded-lg border-2 text-xs font-semibold transition-all ${v.time_block === val ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-gray-200 text-gray-600 hover:border-gray-300'}`}
                    >
                      <Icon className="h-3.5 w-3.5" /> {label}
                    </button>
                  ))}
                </div>
              </div>

              {v.time_block === 'specific' && (
                <div className="grid grid-cols-2 gap-3">
                  <input type="time" value={v.time} onChange={e => update(v.key, { time: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                  <select value={v.duration} onChange={e => update(v.key, { duration: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                    {DURATIONS.map(([val, label]) => <option key={val} value={val}>{label}</option>)}
                  </select>
                </div>
              )}

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <p className="flex items-center gap-1.5 text-xs font-medium text-gray-600">
                    <Users className="h-3.5 w-3.5" /> Crew {overridden ? '(custom for this day)' : '(same as main crew)'}
                  </p>
                  {overridden && (
                    <button type="button" onClick={() => update(v.key, { crew: null })} className="flex items-center gap-1 text-[11px] font-medium text-blue-600 hover:text-blue-800">
                      <RotateCcw className="h-3 w-3" /> Use main crew
                    </button>
                  )}
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {employees.map(emp => {
                    const on = crew.includes(emp.id);
                    const status = v.date ? crewStatus(v, emp.id) : 'free';
                    return (
                      <button
                        key={emp.id}
                        type="button"
                        onClick={() => toggleCrew(v, emp.id)}
                        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-xs font-medium transition-all ${
                          on ? (status === 'conflict' ? 'bg-red-50 border-red-300 text-red-700' : 'bg-blue-600 border-blue-600 text-white') : 'bg-white border-gray-200 text-gray-600 hover:border-gray-300'
                        }`}
                        title={status === 'conflict' ? 'Time conflict with another job' : status === 'busy' ? 'Has other jobs this day' : 'Available'}
                      >
                        <span className={`w-1.5 h-1.5 rounded-full ${status === 'conflict' ? 'bg-red-500' : status === 'busy' ? 'bg-amber-400' : 'bg-emerald-400'}`} />
                        {emp.first_name} {emp.last_name[0]}.
                      </button>
                    );
                  })}
                </div>
                {crew.length === 0 && <p className="text-[11px] text-amber-600 mt-1.5">No one is assigned to this day yet.</p>}
              </div>
            </div>
          );
        })}
        {visits.length === 0 && (
          <p className="text-xs text-gray-400">Single-day job. Add another day if the work will take longer.</p>
        )}
      </div>
    </div>
  );
}
