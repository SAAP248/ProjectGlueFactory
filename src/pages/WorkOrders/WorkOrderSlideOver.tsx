import { useState, useEffect, useCallback } from 'react';
import { X, Wrench, MapPin, Clock, User, Building2, Star, Phone, FileText, AlertCircle } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import TechLifecycleActions, { type LifecycleTech } from './TechLifecycleActions';

interface Props {
  workOrderId: string;
  onClose: () => void;
}

interface WoDetail {
  id: string;
  wo_number: string;
  title: string;
  status: string;
  priority: string;
  work_order_type: string;
  scheduled_date: string | null;
  scheduled_time: string | null;
  reason_for_visit: string | null;
  scope_of_work: string | null;
  technician_notes: string | null;
  is_go_back: boolean | null;
  companies?: { name: string; phone: string | null } | null;
  sites?: { name: string; address: string | null } | null;
  work_order_technicians?: Array<{
    id: string;
    employee_id: string;
    is_lead: boolean;
    status: string;
    enroute_at: string | null;
    onsite_at: string | null;
    completed_at: string | null;
    paused_at: string | null;
    total_paused_minutes: number | null;
    scheduled_date: string | null;
    scheduled_start_time: string | null;
    scheduled_end_time: string | null;
    employees?: { first_name: string; last_name: string; role: string | null };
  }>;
}

const STATUS_BADGE: Record<string, string> = {
  unassigned: 'bg-gray-100 text-gray-700',
  scheduled: 'bg-blue-100 text-blue-700',
  in_progress: 'bg-amber-100 text-amber-800',
  on_hold: 'bg-orange-100 text-orange-700',
  completed: 'bg-emerald-100 text-emerald-700',
  go_back: 'bg-orange-100 text-orange-700',
  cancelled: 'bg-red-100 text-red-700',
  unbilled: 'bg-blue-100 text-blue-700',
};

const PRIORITY_COLOR: Record<string, string> = {
  low: 'text-gray-500',
  normal: 'text-blue-600',
  high: 'text-orange-600',
  emergency: 'text-red-600',
};

function formatTime12(time: string | null): string {
  if (!time) return '';
  const [h, m] = time.split(':').map(Number);
  const ampm = h >= 12 ? 'PM' : 'AM';
  return `${h % 12 || 12}:${String(m).padStart(2, '0')} ${ampm}`;
}

function formatDateLabel(dateStr: string | null): string {
  if (!dateStr) return 'Unscheduled';
  return new Date(dateStr + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
}

export default function WorkOrderSlideOver({ workOrderId, onClose }: Props) {
  const [wo, setWo] = useState<WoDetail | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const { data } = await supabase
      .from('work_orders')
      .select(`
        id, wo_number, title, status, priority, work_order_type,
        scheduled_date, scheduled_time, reason_for_visit, scope_of_work, technician_notes, is_go_back,
        companies(name, phone),
        sites(name, address),
        work_order_technicians(
          id, employee_id, is_lead, status, enroute_at, onsite_at, completed_at,
          paused_at, total_paused_minutes,
          scheduled_date, scheduled_start_time, scheduled_end_time,
          employees(first_name, last_name, role)
        )
      `)
      .eq('id', workOrderId)
      .maybeSingle();
    if (data) setWo(data as unknown as WoDetail);
    setLoading(false);
  }, [workOrderId]);

  useEffect(() => { load(); }, [load]);

  const techs = wo?.work_order_technicians ?? [];
  const sortedTechs = [...techs].sort((a, b) => {
    if (a.is_lead !== b.is_lead) return a.is_lead ? -1 : 1;
    return (a.scheduled_start_time || '').localeCompare(b.scheduled_start_time || '');
  });

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/30" onClick={onClose} />
      <div className="fixed inset-y-0 right-0 z-50 w-full max-w-2xl bg-gray-50 shadow-2xl flex flex-col">
        {/* Header */}
        <div className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center flex-shrink-0">
              <Wrench className="h-5 w-5 text-blue-600" />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-mono text-gray-500">{wo?.wo_number || '—'}</p>
              <h2 className="text-lg font-bold text-gray-900 truncate">{wo?.title || 'Work Order'}</h2>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
            <X className="h-5 w-5 text-gray-500" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <div className="animate-spin rounded-full h-8 w-8 border-2 border-blue-600 border-t-transparent" />
            </div>
          ) : !wo ? (
            <p className="text-center text-gray-400 py-20">Work order not found.</p>
          ) : (
            <>
              {/* Meta Row */}
              <div className="flex items-center gap-2 flex-wrap">
                <span className={`inline-flex items-center px-2.5 py-1 text-xs font-semibold rounded-full ${STATUS_BADGE[wo.status] || 'bg-gray-100 text-gray-700'}`}>
                  {wo.status.replace('_', ' ')}
                </span>
                <span className={`text-xs font-semibold uppercase tracking-wide ${PRIORITY_COLOR[wo.priority] || 'text-gray-500'}`}>
                  {wo.priority === 'emergency' && '! '}{wo.priority} priority
                </span>
                {wo.is_go_back && (
                  <span className="inline-flex items-center gap-1 text-xs font-semibold text-orange-700 bg-orange-100 px-2 py-1 rounded-full">
                    Go-Back
                  </span>
                )}
                <span className="text-xs text-gray-500 capitalize">{wo.work_order_type}</span>
              </div>

              {/* Customer / Site */}
              <div className="bg-white rounded-xl border border-gray-100 p-4 space-y-2.5">
                {wo.companies && (
                  <div className="flex items-center gap-2.5 text-sm">
                    <User className="h-4 w-4 text-gray-400 flex-shrink-0" />
                    <span className="font-medium text-gray-900">{wo.companies.name}</span>
                    {wo.companies.phone && (
                      <a href={`tel:${wo.companies.phone}`} className="ml-auto flex items-center gap-1 text-blue-600 hover:text-blue-700 text-xs font-medium">
                        <Phone className="h-3 w-3" />
                        {wo.companies.phone}
                      </a>
                    )}
                  </div>
                )}
                {wo.sites && (
                  <div className="flex items-start gap-2.5 text-sm">
                    <MapPin className="h-4 w-4 text-gray-400 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="font-medium text-gray-900">{wo.sites.name}</p>
                      {wo.sites.address && <p className="text-xs text-gray-500">{wo.sites.address}</p>}
                    </div>
                  </div>
                )}
                {wo.scheduled_date && (
                  <div className="flex items-center gap-2.5 text-sm">
                    <Clock className="h-4 w-4 text-gray-400 flex-shrink-0" />
                    <span className="text-gray-700">
                      {formatDateLabel(wo.scheduled_date)}
                      {wo.scheduled_time && ` at ${formatTime12(wo.scheduled_time)}`}
                    </span>
                  </div>
                )}
              </div>

              {/* Notes */}
              {(wo.reason_for_visit || wo.scope_of_work) && (
                <div className="bg-white rounded-xl border border-gray-100 p-4 space-y-3">
                  {wo.reason_for_visit && (
                    <div>
                      <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Reason for Visit</h4>
                      <p className="text-sm text-gray-800 leading-relaxed">{wo.reason_for_visit}</p>
                    </div>
                  )}
                  {wo.scope_of_work && (
                    <div>
                      <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Scope of Work</h4>
                      <p className="text-sm text-gray-800 leading-relaxed">{wo.scope_of_work}</p>
                    </div>
                  )}
                </div>
              )}

              {/* Per-Tech Lifecycle */}
              <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
                <div className="px-4 py-3 border-b border-gray-100 flex items-center gap-2">
                  <Building2 className="h-4 w-4 text-gray-400" />
                  <h3 className="text-sm font-semibold text-gray-900">Technician Actions</h3>
                  <span className="text-xs text-gray-400 ml-auto">{techs.length} assigned</span>
                </div>
                {sortedTechs.length === 0 ? (
                  <div className="py-10 text-center">
                    <AlertCircle className="h-6 w-6 text-gray-300 mx-auto mb-2" />
                    <p className="text-sm text-gray-500">No technicians assigned yet.</p>
                  </div>
                ) : (
                  <div className="divide-y divide-gray-100">
                    {sortedTechs.map(t => {
                      const name = t.employees ? `${t.employees.first_name} ${t.employees.last_name}` : 'Unknown';
                      const lifecycleTech: LifecycleTech = {
                        wotId: t.id,
                        workOrderId: wo.id,
                        employeeId: t.employee_id,
                        wotStatus: t.status || 'assigned',
                        enrouteAt: t.enroute_at,
                        onsiteAt: t.onsite_at,
                        pausedAt: t.paused_at,
                        totalPausedMinutes: t.total_paused_minutes,
                        employeeName: name,
                      };
                      return (
                        <div key={t.id} className="px-4 py-4">
                          <div className="flex items-center gap-3 mb-2.5">
                            <div className="w-9 h-9 rounded-full bg-blue-100 flex items-center justify-center text-xs font-bold text-blue-700 flex-shrink-0">
                              {t.employees?.first_name?.[0]}{t.employees?.last_name?.[0]}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <p className="text-sm font-semibold text-gray-900 truncate">{name}</p>
                                {t.is_lead && (
                                  <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-blue-700 bg-blue-100 px-1.5 py-0.5 rounded-full">
                                    <Star className="h-2.5 w-2.5 fill-blue-600 text-blue-600" />
                                    LEAD
                                  </span>
                                )}
                              </div>
                              <div className="flex items-center gap-3 text-xs text-gray-500 mt-0.5">
                                {t.employees?.role && <span className="capitalize">{t.employees.role}</span>}
                                {t.scheduled_start_time && (
                                  <span>
                                    {formatTime12(t.scheduled_start_time)}
                                    {t.scheduled_end_time && ` – ${formatTime12(t.scheduled_end_time)}`}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                          <TechLifecycleActions
                            tech={lifecycleTech}
                            onChanged={load}
                          />
                          {(t.enroute_at || t.onsite_at || t.completed_at) && (
                            <div className="mt-2.5 flex flex-wrap gap-3 text-[11px] text-gray-500">
                              {t.enroute_at && (
                                <span>Enroute: {new Date(t.enroute_at).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}</span>
                              )}
                              {t.onsite_at && (
                                <span>On site: {new Date(t.onsite_at).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}</span>
                              )}
                              {t.completed_at && (
                                <span className="text-emerald-600 font-medium">
                                  Done: {new Date(t.completed_at).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {wo.technician_notes && (
                <div className="bg-white rounded-xl border border-gray-100 p-4">
                  <div className="flex items-center gap-2 mb-1.5">
                    <FileText className="h-4 w-4 text-gray-400" />
                    <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Technician Notes</h4>
                  </div>
                  <p className="text-sm text-gray-800 leading-relaxed">{wo.technician_notes}</p>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </>
  );
}
