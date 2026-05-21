import { useState, useEffect, useCallback, useRef } from 'react';
import {
  ChevronLeft, ChevronRight, Phone, ExternalLink, Clock,
  AlertCircle, CheckCircle2, CircleDot, Pause, RotateCcw,
  ChevronDown, ChevronUp, UserPlus, Wrench,
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import WorkOrderSlideOver from '../WorkOrders/WorkOrderSlideOver';
import AssignmentModal from '../WorkOrders/AssignmentModal';

interface TechAssignment {
  id: string;
  employee_id: string;
  work_order_id: string;
  scheduled_start_time: string | null;
  scheduled_end_time: string | null;
  estimated_duration_minutes: number;
  is_lead: boolean;
  wo_number: string;
  wo_title: string;
  wo_status: string;
  wo_billing_status: string;
  company_name: string | null;
  company_phone: string | null;
  site_name: string | null;
  site_phone: string | null;
  description: string | null;
}

interface Technician {
  id: string;
  first_name: string;
  last_name: string;
  assignments: TechAssignment[];
}

interface UnassignedWO {
  id: string;
  wo_number: string;
  title: string;
  status: string;
  priority: string;
  company_name: string | null;
  scheduled_date: string | null;
}

const HOUR_START = 6;
const HOUR_END = 20;
const SLOT_WIDTH = 100;
const ROW_HEIGHT = 88;
const TOTAL_SLOTS = (HOUR_END - HOUR_START) * 2;

function timeToSlot(time: string): number {
  const [h, m] = time.split(':').map(Number);
  return (h - HOUR_START) * 2 + Math.floor(m / 30);
}

function slotSpan(start: string | null, end: string | null, duration: number): { startSlot: number; span: number } {
  if (!start) return { startSlot: 4, span: 2 };
  const startSlot = Math.max(0, timeToSlot(start));
  if (end) {
    const endSlot = Math.max(startSlot + 1, timeToSlot(end));
    return { startSlot, span: endSlot - startSlot };
  }
  const slots = Math.max(1, Math.ceil(duration / 30));
  return { startSlot, span: slots };
}

function formatTime(time: string | null): string {
  if (!time) return '';
  const [h, m] = time.split(':').map(Number);
  const ampm = h >= 12 ? 'PM' : 'AM';
  const hh = h % 12 || 12;
  return `${hh}:${String(m).padStart(2, '0')} ${ampm}`;
}

function statusColor(status: string, billingStatus: string): { bg: string; border: string; text: string; label: string } {
  if (status === 'completed' && billingStatus === 'paid') {
    return { bg: 'bg-emerald-100', border: 'border-emerald-400', text: 'text-emerald-800', label: 'Paid' };
  }
  if (status === 'completed') {
    return { bg: 'bg-green-100', border: 'border-green-300', text: 'text-green-800', label: 'Completed' };
  }
  if (status === 'in_progress') {
    return { bg: 'bg-amber-100', border: 'border-amber-400', text: 'text-amber-800', label: 'In Progress' };
  }
  if (status === 'on_hold' || status === 'go_back') {
    return { bg: 'bg-rose-100', border: 'border-rose-400', text: 'text-rose-800', label: status === 'go_back' ? 'Go Back' : 'On Hold' };
  }
  return { bg: 'bg-blue-100', border: 'border-blue-300', text: 'text-blue-800', label: 'Scheduled' };
}

function StatusIcon({ status, billingStatus }: { status: string; billingStatus: string }) {
  if (status === 'completed' && billingStatus === 'paid') return <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />;
  if (status === 'completed') return <CheckCircle2 className="h-3.5 w-3.5 text-green-600" />;
  if (status === 'in_progress') return <CircleDot className="h-3.5 w-3.5 text-amber-600" />;
  if (status === 'on_hold') return <Pause className="h-3.5 w-3.5 text-rose-600" />;
  if (status === 'go_back') return <RotateCcw className="h-3.5 w-3.5 text-rose-600" />;
  return <Clock className="h-3.5 w-3.5 text-blue-600" />;
}

export default function DailyDispatchView() {
  const [selectedDate, setSelectedDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [technicians, setTechnicians] = useState<Technician[]>([]);
  const [unassigned, setUnassigned] = useState<UnassignedWO[]>([]);
  const [loading, setLoading] = useState(true);
  const [openWorkOrderId, setOpenWorkOrderId] = useState<string | null>(null);
  const [assignWorkOrderId, setAssignWorkOrderId] = useState<string | null>(null);
  const [unassignedOpen, setUnassignedOpen] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);
  const scrollRef = useRef<HTMLDivElement>(null);

  const loadData = useCallback(async () => {
    setLoading(true);

    const [empRes, wotRes, unassignedRes] = await Promise.all([
      supabase
        .from('employees')
        .select('id, first_name, last_name, role, status')
        .eq('status', 'active')
        .order('first_name'),
      supabase
        .from('work_order_technicians')
        .select(`
          id, employee_id, work_order_id, scheduled_start_time, scheduled_end_time,
          estimated_duration_minutes, is_lead,
          work_orders(id, wo_number, title, status, billing_status, reason_for_visit, scope_of_work,
            companies(name, phone),
            sites(name, phone)
          )
        `)
        .eq('scheduled_date', selectedDate)
        .not('work_orders.status', 'eq', 'cancelled'),
      supabase
        .from('work_orders')
        .select(`
          id, wo_number, title, status, priority, scheduled_date,
          companies(name)
        `)
        .in('status', ['unassigned', 'scheduled'])
        .is('assigned_to', null),
    ]);

    const employees = (empRes.data as any[]) || [];
    const wotRows = (wotRes.data as any[]) || [];
    const unassignedRows = (unassignedRes.data as any[]) || [];

    const assignmentsByEmp: Record<string, TechAssignment[]> = {};
    for (const row of wotRows) {
      if (!row.work_orders) continue;
      const wo = row.work_orders;
      const assignment: TechAssignment = {
        id: row.id,
        employee_id: row.employee_id,
        work_order_id: row.work_order_id,
        scheduled_start_time: row.scheduled_start_time,
        scheduled_end_time: row.scheduled_end_time,
        estimated_duration_minutes: row.estimated_duration_minutes || 60,
        is_lead: row.is_lead,
        wo_number: wo.wo_number,
        wo_title: wo.title,
        wo_status: wo.status,
        wo_billing_status: wo.billing_status || 'unbilled',
        company_name: wo.companies?.name || null,
        company_phone: wo.companies?.phone || wo.sites?.phone || null,
        site_name: wo.sites?.name || null,
        description: wo.reason_for_visit || wo.scope_of_work || wo.title,
      };
      if (!assignmentsByEmp[row.employee_id]) assignmentsByEmp[row.employee_id] = [];
      assignmentsByEmp[row.employee_id].push(assignment);
    }

    const techs: Technician[] = employees
      .filter(e => e.role && (e.role.toLowerCase().includes('tech') || e.role.toLowerCase().includes('field') || e.role.toLowerCase().includes('lead')))
      .map(e => ({
        id: e.id,
        first_name: e.first_name,
        last_name: e.last_name,
        assignments: (assignmentsByEmp[e.id] || []).sort((a, b) =>
          (a.scheduled_start_time || '').localeCompare(b.scheduled_start_time || '')
        ),
      }));

    const techsWithJobs = techs.filter(t => t.assignments.length > 0);
    const techsWithoutJobs = techs.filter(t => t.assignments.length === 0);

    setTechnicians([...techsWithJobs, ...techsWithoutJobs]);
    setUnassigned(unassignedRows.map(r => ({
      id: r.id,
      wo_number: r.wo_number,
      title: r.title,
      status: r.status,
      priority: r.priority || 'normal',
      company_name: r.companies?.name || null,
      scheduled_date: r.scheduled_date,
    })));
    setLoading(false);
  }, [selectedDate, refreshKey]);

  useEffect(() => { loadData(); }, [loadData]);

  useEffect(() => {
    if (!loading && scrollRef.current) {
      const slot8am = (8 - HOUR_START) * 2;
      scrollRef.current.scrollLeft = slot8am * SLOT_WIDTH;
    }
  }, [loading, selectedDate]);

  function prevDay() {
    setSelectedDate(d => {
      const dt = new Date(d + 'T00:00:00');
      dt.setDate(dt.getDate() - 1);
      return dt.toISOString().slice(0, 10);
    });
  }

  function nextDay() {
    setSelectedDate(d => {
      const dt = new Date(d + 'T00:00:00');
      dt.setDate(dt.getDate() + 1);
      return dt.toISOString().slice(0, 10);
    });
  }

  function goToday() {
    setSelectedDate(new Date().toISOString().slice(0, 10));
  }

  const dateLabel = new Date(selectedDate + 'T00:00:00').toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });

  const isToday = selectedDate === new Date().toISOString().slice(0, 10);

  const timeSlots: string[] = [];
  for (let h = HOUR_START; h < HOUR_END; h++) {
    timeSlots.push(`${h}:00`);
    timeSlots.push(`${h}:30`);
  }

  return (
    <div className="flex gap-4 h-[calc(100vh-160px)] min-h-[600px]">
      {/* Main Timeline Area */}
      <div className="flex-1 flex flex-col bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden min-w-0">
        {/* Header: Date Nav + Legend */}
        <div className="px-5 py-4 border-b border-gray-100 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <button onClick={prevDay} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
              <ChevronLeft className="h-5 w-5 text-gray-600" />
            </button>
            <div className="text-center min-w-[220px]">
              <h2 className="text-lg font-bold text-gray-900">{dateLabel}</h2>
            </div>
            <button onClick={nextDay} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
              <ChevronRight className="h-5 w-5 text-gray-600" />
            </button>
            <button
              onClick={goToday}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
                isToday
                  ? 'bg-blue-600 text-white'
                  : 'text-blue-600 border border-blue-200 hover:bg-blue-50'
              }`}
            >
              Today
            </button>
          </div>

          {/* Legend */}
          <div className="flex items-center gap-4 text-xs">
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded bg-blue-200 border border-blue-300" />
              <span className="text-gray-600">Scheduled</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded bg-amber-200 border border-amber-400" />
              <span className="text-gray-600">In Progress</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded bg-rose-200 border border-rose-400" />
              <span className="text-gray-600">Hold / Go Back</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded bg-green-200 border border-green-300" />
              <span className="text-gray-600">Completed</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded bg-emerald-200 border border-emerald-400" />
              <CheckCircle2 className="h-3 w-3 text-emerald-600" />
              <span className="text-gray-600">Paid</span>
            </div>
          </div>
        </div>

        {/* Timeline Grid */}
        {loading ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <div className="flex-1 flex overflow-hidden">
            {/* Fixed tech name column */}
            <div className="flex-shrink-0 w-44 border-r border-gray-200 bg-gray-50">
              {/* Header spacer */}
              <div className="h-10 border-b border-gray-200 flex items-center px-3">
                <span className="text-xs font-bold uppercase tracking-wider text-gray-400">Technician</span>
              </div>
              {/* Tech names */}
              <div className="overflow-hidden">
                {technicians.map(tech => (
                  <div
                    key={tech.id}
                    className="flex items-center gap-2 px-3 border-b border-gray-100"
                    style={{ height: ROW_HEIGHT }}
                  >
                    <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                      {tech.first_name[0]}{tech.last_name[0]}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-gray-900 truncate">
                        {tech.first_name} {tech.last_name}
                      </p>
                      <p className="text-xs text-gray-500">
                        {tech.assignments.length} {tech.assignments.length === 1 ? 'job' : 'jobs'}
                      </p>
                    </div>
                  </div>
                ))}
                {technicians.length === 0 && (
                  <div className="p-4 text-sm text-gray-400 text-center">No technicians</div>
                )}
              </div>
            </div>

            {/* Scrollable timeline */}
            <div ref={scrollRef} className="flex-1 overflow-x-auto overflow-y-auto">
              <div style={{ width: TOTAL_SLOTS * SLOT_WIDTH, minHeight: '100%' }}>
                {/* Time header */}
                <div className="h-10 border-b border-gray-200 flex sticky top-0 bg-white z-10">
                  {timeSlots.map((slot, i) => {
                    const [h, m] = slot.split(':').map(Number);
                    const isHour = m === 0;
                    return (
                      <div
                        key={i}
                        className={`flex-shrink-0 border-r flex items-end pb-1.5 px-1 ${
                          isHour ? 'border-gray-300' : 'border-gray-100'
                        }`}
                        style={{ width: SLOT_WIDTH }}
                      >
                        {isHour && (
                          <span className="text-xs font-semibold text-gray-500">
                            {h > 12 ? h - 12 : h === 0 ? 12 : h}:00 {h >= 12 ? 'PM' : 'AM'}
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* Swim lanes */}
                {technicians.map(tech => (
                  <div
                    key={tech.id}
                    className="relative border-b border-gray-100"
                    style={{ height: ROW_HEIGHT }}
                  >
                    {/* Grid lines */}
                    <div className="absolute inset-0 flex pointer-events-none">
                      {timeSlots.map((slot, i) => {
                        const [, m] = slot.split(':').map(Number);
                        const isHour = m === 0;
                        return (
                          <div
                            key={i}
                            className={`flex-shrink-0 border-r ${isHour ? 'border-gray-200' : 'border-gray-50'}`}
                            style={{ width: SLOT_WIDTH }}
                          />
                        );
                      })}
                    </div>

                    {/* Work order cards */}
                    {tech.assignments.map(assignment => {
                      const { startSlot, span } = slotSpan(
                        assignment.scheduled_start_time,
                        assignment.scheduled_end_time,
                        assignment.estimated_duration_minutes
                      );
                      const color = statusColor(assignment.wo_status, assignment.wo_billing_status);
                      const left = startSlot * SLOT_WIDTH + 2;
                      const width = span * SLOT_WIDTH - 4;
                      const phone = assignment.company_phone || assignment.site_phone;

                      return (
                        <div
                          key={assignment.id}
                          className={`absolute top-2 rounded-lg border-l-4 ${color.bg} ${color.border} shadow-sm hover:shadow-md transition-shadow cursor-pointer group`}
                          style={{ left, width, height: ROW_HEIGHT - 16 }}
                          onClick={() => setOpenWorkOrderId(assignment.work_order_id)}
                        >
                          <div className="px-2.5 py-1.5 h-full flex flex-col justify-between overflow-hidden">
                            <div className="min-w-0">
                              <div className="flex items-center gap-1.5">
                                <StatusIcon status={assignment.wo_status} billingStatus={assignment.wo_billing_status} />
                                <span className={`text-xs font-bold ${color.text} truncate`}>
                                  {assignment.company_name || assignment.wo_number}
                                </span>
                              </div>
                              <p className="text-xs text-gray-600 truncate mt-0.5 leading-tight">
                                {assignment.description || assignment.wo_title}
                              </p>
                            </div>
                            <div className="flex items-center justify-between">
                              {phone && (
                                <a
                                  href={`tel:${phone}`}
                                  onClick={e => e.stopPropagation()}
                                  className="flex items-center gap-1 text-[10px] text-gray-500 hover:text-blue-600 transition-colors"
                                >
                                  <Phone className="h-3 w-3" />
                                  <span>{phone}</span>
                                </a>
                              )}
                              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                <span className="text-[10px] text-gray-400">
                                  {formatTime(assignment.scheduled_start_time)}
                                </span>
                                <ExternalLink className="h-3 w-3 text-gray-400" />
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}

                    {tech.assignments.length === 0 && (
                      <div className="absolute inset-0 flex items-center justify-center">
                        <span className="text-xs text-gray-300 italic">No jobs scheduled</span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Unassigned Work Orders Sidebar */}
      <div className={`flex-shrink-0 transition-all ${unassignedOpen ? 'w-72' : 'w-12'}`}>
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 h-full flex flex-col overflow-hidden">
          {/* Sidebar Header */}
          <button
            onClick={() => setUnassignedOpen(!unassignedOpen)}
            className="flex items-center gap-2 px-3 py-3 border-b border-gray-100 hover:bg-gray-50 transition-colors w-full text-left"
          >
            {unassignedOpen ? (
              <>
                <AlertCircle className="h-4 w-4 text-orange-500 flex-shrink-0" />
                <span className="text-sm font-bold text-gray-900 flex-1">Unassigned</span>
                <span className="text-xs font-bold bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full">
                  {unassigned.length}
                </span>
                <ChevronDown className="h-4 w-4 text-gray-400" />
              </>
            ) : (
              <div className="flex flex-col items-center w-full gap-1">
                <AlertCircle className="h-4 w-4 text-orange-500" />
                <span className="text-[10px] font-bold text-orange-700">{unassigned.length}</span>
                <ChevronUp className="h-3 w-3 text-gray-400" />
              </div>
            )}
          </button>

          {/* Sidebar Content */}
          {unassignedOpen && (
            <div className="flex-1 overflow-y-auto p-2 space-y-2">
              {unassigned.length === 0 ? (
                <div className="text-center py-8">
                  <CheckCircle2 className="h-8 w-8 text-green-300 mx-auto mb-2" />
                  <p className="text-sm text-gray-400">All work orders assigned</p>
                </div>
              ) : (
                unassigned.map(wo => (
                  <div
                    key={wo.id}
                    className="p-3 rounded-xl border border-gray-200 hover:border-blue-200 hover:shadow-sm transition-all bg-gray-50 hover:bg-blue-50/30"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5">
                          <Wrench className="h-3 w-3 text-gray-400 flex-shrink-0" />
                          <span className="text-xs font-mono text-gray-500">{wo.wo_number}</span>
                        </div>
                        <p className="text-sm font-semibold text-gray-900 mt-1 truncate">{wo.title}</p>
                        {wo.company_name && (
                          <p className="text-xs text-gray-500 truncate mt-0.5">{wo.company_name}</p>
                        )}
                      </div>
                      {wo.priority === 'high' || wo.priority === 'emergency' ? (
                        <span className="text-[9px] font-bold uppercase px-1.5 py-0.5 bg-red-100 text-red-700 rounded flex-shrink-0">
                          {wo.priority}
                        </span>
                      ) : null}
                    </div>
                    <div className="mt-2 flex items-center gap-2">
                      <button
                        onClick={() => setAssignWorkOrderId(wo.id)}
                        className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold text-blue-700 bg-blue-100 hover:bg-blue-200 rounded-lg transition-colors"
                      >
                        <UserPlus className="h-3 w-3" />
                        Assign
                      </button>
                      <button
                        onClick={() => setOpenWorkOrderId(wo.id)}
                        className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                      >
                        <ExternalLink className="h-3 w-3" />
                        View
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </div>

      {/* Work Order SlideOver */}
      {openWorkOrderId && (
        <WorkOrderSlideOver
          workOrderId={openWorkOrderId}
          onClose={() => { setOpenWorkOrderId(null); setRefreshKey(k => k + 1); }}
        />
      )}

      {/* Assignment Modal */}
      {assignWorkOrderId && (
        <AssignmentModal
          workOrderId={assignWorkOrderId}
          defaultDate={selectedDate}
          onClose={() => setAssignWorkOrderId(null)}
          onSaved={() => { setAssignWorkOrderId(null); setRefreshKey(k => k + 1); }}
        />
      )}
    </div>
  );
}
