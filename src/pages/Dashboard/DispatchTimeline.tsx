import { useState, useEffect, useMemo } from 'react';
import { ChevronLeft, ChevronRight, Calendar, Loader2, MapPin, Truck, Wrench, Coffee, CheckCircle2 } from 'lucide-react';
import { supabase } from '../../lib/supabase';

interface TechAssignment {
  id: string;
  employee_id: string;
  tech_name: string;
  wo_number: string;
  title: string;
  company_name: string;
  priority: string;
  work_order_type: string;
  status: string;
  scheduled_start_time: string | null;
  estimated_duration_minutes: number;
}

interface TechColumn {
  id: string;
  name: string;
  initials: string;
}

const HOUR_START = 6;
const HOUR_END = 19;
const HOURS = Array.from({ length: HOUR_END - HOUR_START }, (_, i) => HOUR_START + i);
const HOUR_HEIGHT_PX = 72;

const STATUS_STYLES: Record<string, { bg: string; border: string; text: string; icon: typeof MapPin }> = {
  assigned: { bg: 'bg-gray-50', border: 'border-gray-300', text: 'text-gray-700', icon: Calendar },
  enroute: { bg: 'bg-blue-50', border: 'border-blue-300', text: 'text-blue-700', icon: Truck },
  onsite: { bg: 'bg-teal-50', border: 'border-teal-300', text: 'text-teal-700', icon: MapPin },
  working: { bg: 'bg-emerald-50', border: 'border-emerald-400', text: 'text-emerald-700', icon: Wrench },
  on_break: { bg: 'bg-amber-50', border: 'border-amber-300', text: 'text-amber-700', icon: Coffee },
  completed: { bg: 'bg-green-50', border: 'border-green-300', text: 'text-green-700', icon: CheckCircle2 },
};

const PRIORITY_DOT: Record<string, string> = {
  emergency: 'bg-red-500',
  urgent: 'bg-red-400',
  high: 'bg-orange-400',
  normal: 'bg-blue-400',
  low: 'bg-gray-400',
};

function timeToMinutes(time: string | null): number {
  if (!time) return HOUR_START * 60;
  const [h, m] = time.split(':').map(Number);
  return h * 60 + (m || 0);
}

function formatTime12(time: string | null): string {
  if (!time) return '';
  const [h, m] = time.split(':').map(Number);
  const ampm = h >= 12 ? 'PM' : 'AM';
  return `${h % 12 || 12}:${String(m).padStart(2, '0')} ${ampm}`;
}

function formatDateLabel(dateStr: string): string {
  const d = new Date(dateStr + 'T12:00:00');
  return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
}

function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

export default function DispatchTimeline() {
  const [selectedDate, setSelectedDate] = useState(todayISO);
  const [assignments, setAssignments] = useState<TechAssignment[]>([]);
  const [techs, setTechs] = useState<TechColumn[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      const [techRes, assignRes] = await Promise.all([
        supabase.from('employees').select('id,first_name,last_name').eq('status', 'active').eq('role', 'technician'),
        supabase
          .from('work_order_technicians')
          .select('id,employee_id,status,scheduled_start_time,estimated_duration_minutes,work_order_id,work_orders(wo_number,title,priority,work_order_type,company_id,companies(name))')
          .eq('scheduled_date', selectedDate)
          .order('scheduled_start_time', { ascending: true }),
      ]);

      if (cancelled) return;

      const techList: TechColumn[] = (techRes.data || []).map((e: any) => ({
        id: e.id,
        name: `${e.first_name} ${e.last_name}`.trim(),
        initials: `${(e.first_name || '')[0] || ''}${(e.last_name || '')[0] || ''}`.toUpperCase(),
      }));

      const items: TechAssignment[] = (assignRes.data || []).map((a: any) => ({
        id: a.id,
        employee_id: a.employee_id,
        tech_name: '',
        wo_number: a.work_orders?.wo_number || '',
        title: a.work_orders?.title || '',
        company_name: a.work_orders?.companies?.name || '',
        priority: a.work_orders?.priority || 'normal',
        work_order_type: a.work_orders?.work_order_type || '',
        status: a.status || 'assigned',
        scheduled_start_time: a.scheduled_start_time,
        estimated_duration_minutes: a.estimated_duration_minutes || 60,
      }));

      setTechs(techList);
      setAssignments(items);
      setLoading(false);
    }

    load();
    return () => { cancelled = true; };
  }, [selectedDate]);

  const assignmentsByTech = useMemo(() => {
    const map = new Map<string, TechAssignment[]>();
    techs.forEach(t => map.set(t.id, []));
    assignments.forEach(a => {
      const list = map.get(a.employee_id);
      if (list) list.push(a);
    });
    return map;
  }, [assignments, techs]);

  const nowMinutes = useMemo(() => {
    const n = new Date();
    return n.getHours() * 60 + n.getMinutes();
  }, []);

  const isToday = selectedDate === todayISO();
  const totalHeight = HOURS.length * HOUR_HEIGHT_PX;

  const shiftDate = (delta: number) => {
    const d = new Date(selectedDate + 'T12:00:00');
    d.setDate(d.getDate() + delta);
    setSelectedDate(d.toISOString().slice(0, 10));
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100">
        <div className="flex items-center gap-3">
          <Calendar className="h-4 w-4 text-gray-500" />
          <h3 className="text-sm font-semibold text-gray-900">Tech Schedule</h3>
          <span className="text-xs text-gray-500">{assignments.length} jobs</span>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => shiftDate(-1)}
            className="p-1.5 rounded-md hover:bg-gray-100 text-gray-500 transition-colors"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button
            onClick={() => setSelectedDate(todayISO())}
            className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${
              isToday ? 'bg-blue-100 text-blue-700' : 'hover:bg-gray-100 text-gray-700'
            }`}
          >
            Today
          </button>
          <span className="text-sm font-medium text-gray-700 min-w-[100px] text-center">
            {formatDateLabel(selectedDate)}
          </span>
          <button
            onClick={() => shiftDate(1)}
            className="p-1.5 rounded-md hover:bg-gray-100 text-gray-500 transition-colors"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16 text-gray-500">
          <Loader2 className="h-5 w-5 animate-spin mr-2" />
          <span className="text-sm">Loading schedule...</span>
        </div>
      ) : techs.length === 0 ? (
        <div className="py-16 text-center text-sm text-gray-500">No active technicians found.</div>
      ) : (
        <div className="overflow-x-auto">
          <div className="min-w-[600px]">
            {/* Tech columns header */}
            <div className="flex border-b border-gray-100 sticky top-0 bg-white z-10">
              <div className="w-16 flex-shrink-0" />
              {techs.map(t => (
                <div key={t.id} className="flex-1 min-w-[160px] px-2 py-2.5 text-center border-l border-gray-100">
                  <div className="flex items-center justify-center gap-2">
                    <div className="w-7 h-7 rounded-full bg-slate-600 flex items-center justify-center">
                      <span className="text-[10px] font-bold text-white">{t.initials}</span>
                    </div>
                    <span className="text-xs font-semibold text-gray-800 truncate">{t.name}</span>
                  </div>
                  <span className="text-[10px] text-gray-400 mt-0.5 block">
                    {(assignmentsByTech.get(t.id) || []).length} jobs
                  </span>
                </div>
              ))}
            </div>

            {/* Timeline body */}
            <div className="relative overflow-y-auto max-h-[420px]" style={{ height: Math.min(totalHeight, 420) }}>
              <div className="flex relative" style={{ height: totalHeight }}>
                {/* Hour labels */}
                <div className="w-16 flex-shrink-0 relative">
                  {HOURS.map((h) => (
                    <div
                      key={h}
                      className="absolute left-0 right-0 flex items-start justify-end pr-2 text-[10px] text-gray-400 font-medium"
                      style={{ top: (h - HOUR_START) * HOUR_HEIGHT_PX }}
                    >
                      {h === 0 ? '12 AM' : h < 12 ? `${h} AM` : h === 12 ? '12 PM' : `${h - 12} PM`}
                    </div>
                  ))}
                </div>

                {/* Grid lines + tech columns */}
                <div className="flex-1 relative">
                  {/* Horizontal hour lines */}
                  {HOURS.map((h) => (
                    <div
                      key={h}
                      className="absolute left-0 right-0 border-t border-gray-100"
                      style={{ top: (h - HOUR_START) * HOUR_HEIGHT_PX }}
                    />
                  ))}

                  {/* Current time indicator */}
                  {isToday && nowMinutes >= HOUR_START * 60 && nowMinutes <= HOUR_END * 60 && (
                    <div
                      className="absolute left-0 right-0 z-20 pointer-events-none"
                      style={{ top: ((nowMinutes - HOUR_START * 60) / 60) * HOUR_HEIGHT_PX }}
                    >
                      <div className="flex items-center">
                        <div className="w-2 h-2 rounded-full bg-red-500 -ml-1" />
                        <div className="flex-1 h-[2px] bg-red-500 opacity-70" />
                      </div>
                    </div>
                  )}

                  {/* Tech columns with jobs */}
                  <div className="flex h-full relative">
                    {techs.map((tech) => {
                      const techJobs = assignmentsByTech.get(tech.id) || [];
                      return (
                        <div key={tech.id} className="flex-1 min-w-[160px] relative border-l border-gray-100">
                          {techJobs.map((job) => {
                            const startMin = timeToMinutes(job.scheduled_start_time);
                            const duration = job.estimated_duration_minutes || 60;
                            const topPx = ((startMin - HOUR_START * 60) / 60) * HOUR_HEIGHT_PX;
                            const heightPx = Math.max((duration / 60) * HOUR_HEIGHT_PX - 4, 28);
                            const style = STATUS_STYLES[job.status] || STATUS_STYLES.assigned;
                            const StatusIcon = style.icon;
                            const dotColor = PRIORITY_DOT[job.priority] || PRIORITY_DOT.normal;

                            return (
                              <div
                                key={job.id}
                                className={`absolute left-1 right-1 rounded-lg border ${style.bg} ${style.border} px-2 py-1.5 overflow-hidden cursor-default hover:shadow-md transition-shadow group`}
                                style={{ top: topPx, height: heightPx }}
                                title={`${job.wo_number} - ${job.title}\n${job.company_name}\n${formatTime12(job.scheduled_start_time)} (${duration}min)`}
                              >
                                <div className="flex items-center gap-1.5 mb-0.5">
                                  <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${dotColor}`} />
                                  <span className={`text-[10px] font-bold ${style.text} truncate`}>{job.wo_number}</span>
                                  <StatusIcon className={`h-3 w-3 flex-shrink-0 ${style.text} ml-auto opacity-70`} />
                                </div>
                                {heightPx > 40 && (
                                  <p className="text-[10px] text-gray-700 truncate leading-tight">{job.title}</p>
                                )}
                                {heightPx > 56 && (
                                  <p className="text-[10px] text-gray-500 truncate leading-tight">{job.company_name}</p>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Legend */}
      <div className="flex items-center gap-4 px-5 py-2.5 border-t border-gray-100 bg-gray-50 flex-wrap">
        {Object.entries(STATUS_STYLES).map(([key, s]) => {
          const Icon = s.icon;
          return (
            <div key={key} className="flex items-center gap-1.5">
              <div className={`w-3 h-3 rounded border ${s.bg} ${s.border}`} />
              <Icon className={`h-3 w-3 ${s.text}`} />
              <span className="text-[10px] text-gray-600 capitalize">{key.replace('_', ' ')}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
