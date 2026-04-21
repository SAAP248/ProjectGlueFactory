import { useState, useEffect, useCallback } from 'react';
import { ChevronLeft, ChevronRight, Plus, Wrench, PhoneCall } from 'lucide-react';
import { supabase } from '../lib/supabase';
import ViewTypeFilter, { type ViewType } from '../components/ViewTypeFilter';
import type { Lead } from './Leads/types';
import LeadSlideOver from './Leads/LeadSlideOver';
import LeadFormModal from './Leads/LeadFormModal';
import NewDealWizard from './Deals/NewDealWizard/index';
import WorkOrderSlideOver from './WorkOrders/WorkOrderSlideOver';

interface Appointment {
  id: string;
  appointment_date: string;
  start_time: string | null;
  end_time: string | null;
  appointment_type: string;
  notes: string | null;
  status: string;
  lead_id: string | null;
  work_order_id: string | null;
  leads?: {
    id: string;
    contact_name: string;
    status: string;
    employees?: { first_name: string; last_name: string } | null;
  } | null;
  work_orders?: { id: string; title: string; customer_name: string } | null;
  // synthetic flag for WO tech assignments
  __woTechAssignment?: {
    workOrderId: string;
    woNumber: string;
    woTitle: string;
    companyName: string | null;
    technicianName: string;
    isLead: boolean;
  };
}

function isSalesCall(appt: Appointment) {
  return appt.appointment_type === 'sales_call' || !!appt.lead_id;
}

function isWorkOrder(appt: Appointment) {
  return !!appt.__woTechAssignment || !!appt.work_order_id;
}

export default function DispatchCalendar() {
  const [viewDate, setViewDate] = useState(new Date());
  const [calView, setCalView] = useState<'month' | 'week' | 'day'>('month');
  const [viewType, setViewType] = useState<ViewType>('all');
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);

  const [selectedLeadId, setSelectedLeadId] = useState<string | null>(null);
  const [selectedWorkOrderId, setSelectedWorkOrderId] = useState<string | null>(null);
  const [convertLead, setConvertLead] = useState<Lead | null>(null);
  const [editLead, setEditLead] = useState<Lead | null>(null);
  const [showNewLead, setShowNewLead] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();
  const monthName = viewDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  const today = new Date();

  const loadAppointments = useCallback(async () => {
    setLoading(true);
    const startOfMonth = new Date(year, month, 1).toISOString().slice(0, 10);
    const endOfMonth = new Date(year, month + 1, 0).toISOString().slice(0, 10);

    const [apptRes, wotRes] = await Promise.all([
      supabase
        .from('appointments')
        .select('id, appointment_date, start_time, end_time, appointment_type, notes, status, lead_id, work_order_id, leads(id, contact_name, status, employees(first_name, last_name))')
        .gte('appointment_date', startOfMonth)
        .lte('appointment_date', endOfMonth)
        .order('start_time', { ascending: true }),
      supabase
        .from('work_order_technicians')
        .select(`
          id, scheduled_date, scheduled_start_time, scheduled_end_time, is_lead,
          employees(first_name, last_name),
          work_orders(id, wo_number, title, status, companies(name))
        `)
        .gte('scheduled_date', startOfMonth)
        .lte('scheduled_date', endOfMonth)
        .not('scheduled_date', 'is', null),
    ]);

    const appts = (apptRes.data as Appointment[]) ?? [];
    const wotRows = (wotRes.data as any[]) ?? [];

    const woAppts: Appointment[] = wotRows
      .filter(row => row.work_orders && row.work_orders.status !== 'cancelled')
      .map(row => ({
        id: `wot-${row.id}`,
        appointment_date: row.scheduled_date,
        start_time: row.scheduled_start_time,
        end_time: row.scheduled_end_time,
        appointment_type: 'work_order',
        notes: null,
        status: row.work_orders.status,
        lead_id: null,
        work_order_id: row.work_orders.id,
        __woTechAssignment: {
          workOrderId: row.work_orders.id,
          woNumber: row.work_orders.wo_number,
          woTitle: row.work_orders.title,
          companyName: row.work_orders.companies?.name || null,
          technicianName: row.employees
            ? `${row.employees.first_name} ${row.employees.last_name}`
            : 'Unassigned',
          isLead: !!row.is_lead,
        },
      }));

    setAppointments([...appts, ...woAppts]);
    setLoading(false);
  }, [year, month, refreshKey]);

  useEffect(() => { loadAppointments(); }, [loadAppointments]);

  function prevMonth() { setViewDate(d => new Date(d.getFullYear(), d.getMonth() - 1, 1)); }
  function nextMonth() { setViewDate(d => new Date(d.getFullYear(), d.getMonth() + 1, 1)); }
  function goToday() { setViewDate(new Date()); }

  function filtered(list: Appointment[]) {
    if (viewType === 'all') return list;
    if (viewType === 'work_orders') return list.filter(isWorkOrder);
    if (viewType === 'sales_calls') return list.filter(isSalesCall);
    return list;
  }

  function apptsByDay(day: number) {
    return filtered(appointments).filter(a => {
      const d = new Date(a.appointment_date + 'T00:00:00');
      return d.getFullYear() === year && d.getMonth() === month && d.getDate() === day;
    });
  }

  function apptLabel(a: Appointment) {
    if (a.__woTechAssignment) {
      const { woNumber, technicianName } = a.__woTechAssignment;
      return `${woNumber} · ${technicianName.split(' ')[0]}`;
    }
    if (isSalesCall(a) && a.leads) return a.leads.contact_name;
    if (a.notes) return a.notes.slice(0, 24);
    return 'Appointment';
  }

  function apptTime(a: Appointment) {
    if (!a.start_time) return '';
    const [h, m] = a.start_time.split(':').map(Number);
    const ampm = h >= 12 ? 'PM' : 'AM';
    const hh = h % 12 || 12;
    return `${hh}:${String(m).padStart(2, '0')} ${ampm}`;
  }

  const firstDayOfMonth = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const calCells = firstDayOfMonth + daysInMonth;
  const totalCells = Math.ceil(calCells / 7) * 7;

  const upcomingAppts = filtered(appointments)
    .filter(a => new Date(a.appointment_date + 'T00:00:00') >= new Date(today.getFullYear(), today.getMonth(), today.getDate()))
    .sort((a, b) => a.appointment_date.localeCompare(b.appointment_date))
    .slice(0, 10);

  function handleApptClick(a: Appointment) {
    if (isSalesCall(a) && a.lead_id) {
      setSelectedLeadId(a.lead_id);
      return;
    }
    const woId = a.__woTechAssignment?.workOrderId || a.work_order_id;
    if (woId) {
      setSelectedWorkOrderId(woId);
    }
  }

  return (
    <div className="p-6">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dispatch Calendar</h1>
          <p className="text-gray-600 mt-1">Schedule and manage work orders and sales appointments</p>
        </div>
        <button
          onClick={() => setShowNewLead(true)}
          className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 font-medium text-sm shadow-sm transition-colors"
        >
          <Plus className="h-4 w-4 mr-2" />
          New Lead / Appt
        </button>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100">
        <div className="p-5 border-b border-gray-100 flex flex-wrap items-center gap-4 justify-between">
          <div className="flex items-center gap-3">
            <button onClick={prevMonth} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
              <ChevronLeft className="h-5 w-5 text-gray-600" />
            </button>
            <h2 className="text-lg font-bold text-gray-900 min-w-[160px] text-center">{monthName}</h2>
            <button onClick={nextMonth} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
              <ChevronRight className="h-5 w-5 text-gray-600" />
            </button>
            <button
              onClick={goToday}
              className="px-3 py-1.5 text-xs font-semibold text-blue-600 border border-blue-200 rounded-lg hover:bg-blue-50 transition-colors"
            >
              Today
            </button>
          </div>

          <div className="flex items-center gap-3">
            <ViewTypeFilter value={viewType} onChange={setViewType} />
            <div className="flex items-center bg-gray-100 rounded-lg p-0.5">
              {(['day', 'week', 'month'] as const).map(v => (
                <button
                  key={v}
                  onClick={() => setCalView(v)}
                  className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all capitalize ${
                    calView === v ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  {v}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="p-5">
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : (
            <>
              <div className="grid grid-cols-7 mb-2">
                {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => (
                  <div key={d} className="text-center text-xs font-semibold text-gray-500 py-2 uppercase tracking-wider">{d}</div>
                ))}
              </div>
              <div className="grid grid-cols-7 gap-1">
                {Array.from({ length: totalCells }, (_, i) => {
                  const dayNum = i - firstDayOfMonth + 1;
                  const inMonth = dayNum >= 1 && dayNum <= daysInMonth;
                  const isToday = inMonth && dayNum === today.getDate() && month === today.getMonth() && year === today.getFullYear();
                  const dayAppts = inMonth ? apptsByDay(dayNum) : [];

                  return (
                    <div
                      key={i}
                      className={`min-h-[96px] p-1.5 rounded-xl border transition-colors ${
                        inMonth ? 'bg-white border-gray-100 hover:border-gray-200 hover:bg-gray-50' : 'bg-gray-50 border-gray-50'
                      } ${isToday ? 'ring-2 ring-blue-500 ring-offset-1' : ''}`}
                    >
                      {inMonth && (
                        <>
                          <div className={`text-xs font-semibold mb-1 w-6 h-6 flex items-center justify-center rounded-full ${
                            isToday ? 'bg-blue-600 text-white' : 'text-gray-700'
                          }`}>
                            {dayNum}
                          </div>
                          <div className="space-y-0.5">
                            {dayAppts.slice(0, 3).map(a => (
                              <button
                                key={a.id}
                                onClick={() => handleApptClick(a)}
                                title={a.__woTechAssignment ? `${a.__woTechAssignment.woTitle} — ${a.__woTechAssignment.technicianName}` : undefined}
                                className={`w-full text-left text-xs px-1.5 py-0.5 rounded truncate font-medium transition-colors ${
                                  isSalesCall(a)
                                    ? 'bg-amber-100 text-amber-800 hover:bg-amber-200'
                                    : a.__woTechAssignment
                                    ? 'bg-blue-100 text-blue-800 hover:bg-blue-200'
                                    : 'bg-teal-100 text-teal-800 hover:bg-teal-200'
                                }`}
                              >
                                {apptTime(a) && <span className="opacity-70">{apptTime(a)} </span>}
                                {apptLabel(a)}
                              </button>
                            ))}
                            {dayAppts.length > 3 && (
                              <div className="text-xs text-gray-400 pl-1">+{dayAppts.length - 3} more</div>
                            )}
                          </div>
                        </>
                      )}
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>
      </div>

      <div className="mt-4 flex items-center gap-4 text-xs text-gray-500">
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded bg-blue-200" />
          <Wrench className="h-3 w-3" /> Work Orders
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded bg-amber-200" />
          <PhoneCall className="h-3 w-3" /> Sales Calls
        </div>
      </div>

      <div className="mt-6 bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base font-bold text-gray-900">Upcoming Appointments</h3>
          <span className="text-xs text-gray-400 font-medium">{upcomingAppts.length} shown</span>
        </div>
        {upcomingAppts.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-8">No upcoming appointments</p>
        ) : (
          <div className="space-y-2">
            {upcomingAppts.map(a => {
              const sc = isSalesCall(a);
              const woAssign = a.__woTechAssignment;
              return (
                <button
                  key={a.id}
                  onClick={() => handleApptClick(a)}
                  className="w-full flex items-center justify-between p-3.5 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors text-left group"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${sc ? 'bg-amber-100' : 'bg-blue-100'}`}>
                      {sc ? <PhoneCall className="h-4 w-4 text-amber-600" /> : <Wrench className="h-4 w-4 text-blue-600" />}
                    </div>
                    <div className="min-w-0">
                      {woAssign ? (
                        <>
                          <p className="text-sm font-semibold text-gray-900 truncate">
                            {woAssign.woTitle}
                          </p>
                          <p className="text-xs text-gray-500 truncate">
                            <span className="font-mono">{woAssign.woNumber}</span>
                            {' · '}
                            {woAssign.technicianName}
                            {woAssign.isLead && <span className="ml-1 text-blue-600 font-semibold">LEAD</span>}
                            {woAssign.companyName && ` · ${woAssign.companyName}`}
                          </p>
                        </>
                      ) : (
                        <>
                          <p className="text-sm font-semibold text-gray-900 truncate">{apptLabel(a)}</p>
                          <p className="text-xs text-gray-500 truncate">
                            {sc
                              ? (a.leads?.employees ? `${a.leads.employees.first_name} ${a.leads.employees.last_name}` : 'Unassigned salesperson')
                              : (a.notes ?? 'Work Order')}
                          </p>
                        </>
                      )}
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0 ml-3">
                    <p className="text-sm font-semibold text-gray-700">
                      {new Date(a.appointment_date + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    </p>
                    {a.start_time && <p className="text-xs text-gray-400">{apptTime(a)}</p>}
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {selectedWorkOrderId && (
        <WorkOrderSlideOver
          workOrderId={selectedWorkOrderId}
          onClose={() => { setSelectedWorkOrderId(null); setRefreshKey(k => k + 1); }}
        />
      )}

      {selectedLeadId && !convertLead && (
        <>
          <div className="fixed inset-0 z-40 bg-black/20" onClick={() => setSelectedLeadId(null)} />
          <LeadSlideOver
            leadId={selectedLeadId}
            onClose={() => setSelectedLeadId(null)}
            onEdit={lead => { setEditLead(lead); setSelectedLeadId(null); }}
            onConvertToDeal={lead => { setConvertLead(lead); setSelectedLeadId(null); }}
            onUpdated={() => { setRefreshKey(k => k + 1); setSelectedLeadId(null); }}
          />
        </>
      )}

      {showNewLead && (
        <LeadFormModal
          onClose={() => setShowNewLead(false)}
          onSaved={() => { setRefreshKey(k => k + 1); setShowNewLead(false); }}
        />
      )}

      {editLead && (
        <LeadFormModal
          lead={editLead}
          onClose={() => setEditLead(null)}
          onSaved={() => { setRefreshKey(k => k + 1); setEditLead(null); }}
        />
      )}

      {convertLead && (
        <NewDealWizard
          leadPrefill={{
            leadId: convertLead.id,
            contactName: convertLead.contact_name,
            contactPhone: convertLead.contact_phone ?? undefined,
            contactEmail: convertLead.contact_email ?? undefined,
            address: convertLead.address ?? undefined,
            city: convertLead.city ?? undefined,
            state: convertLead.state ?? undefined,
            zip: convertLead.zip ?? undefined,
            assignedEmployeeId: convertLead.assigned_employee_id ?? undefined,
          }}
          onClose={() => setConvertLead(null)}
          onDealCreated={() => { setRefreshKey(k => k + 1); setConvertLead(null); }}
        />
      )}
    </div>
  );
}
