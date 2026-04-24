import { useState, useEffect } from 'react';
import { Briefcase, Wrench, CheckCircle } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { getLocalTodayISO } from '../../lib/dateUtils';
import { runLifecycleAction } from '../../lib/workOrderLifecycle';
import type { TechWO, TechAction, Employee } from './types';
import JobCard from './JobCard';
import JobDetail from './JobDetail';

export default function TechnicianPortal() {
  const [jobs, setJobs] = useState<TechWO[]>([]);
  const [loading, setLoading] = useState(true);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [selectedTechId, setSelectedTechId] = useState<string>('');
  const [selectedJob, setSelectedJob] = useState<TechWO | null>(null);

  useEffect(() => {
    loadEmployees();
  }, []);

  useEffect(() => {
    if (selectedTechId) loadJobs();
  }, [selectedTechId]);

  async function loadEmployees() {
    const { data } = await supabase
      .from('employees')
      .select('id, first_name, last_name')
      .in('role', ['technician', 'tech', 'field_tech', 'lead_tech', 'admin'])
      .order('first_name');
    if (data && data.length > 0) {
      setEmployees(data);
      setSelectedTechId(data[0].id);
    }
    setLoading(false);
  }

  async function loadJobs() {
    if (!selectedTechId) return;

    const today = getLocalTodayISO();

    const { data } = await supabase
      .from('work_order_technicians')
      .select(`
        id,
        status,
        enroute_at,
        onsite_at,
        completed_at,
        paused_at,
        total_paused_minutes,
        current_pause_reason,
        current_pause_notes,
        scheduled_date,
        scheduled_start_time,
        scheduled_end_time,
        estimated_duration_minutes,
        assignment_notes,
        is_lead,
        work_orders(
          id, wo_number, title, priority, work_order_type,
          scheduled_date, scheduled_time, status,
          description, reason_for_visit, scope_of_work,
          technician_notes, resolution_notes, work_performed,
          billing_type, billing_rate, fixed_amount,
          payment_collected, payment_method, customer_signature,
          company_id, site_id, system_id,
          total_parts_cost, total_labor_cost, total_revenue,
          profit_amount, profit_margin_pct,
          companies(name),
          sites(name, address),
          customer_systems(
            id, name, panel_make, panel_model, monitoring_account_number,
            cs_name, cs_number, comm_partner_name, comm_account_id,
            is_on_test, is_out_of_service,
            system_types(id, name, icon_name, color)
          )
        )
      `)
      .eq('employee_id', selectedTechId)
      .order('scheduled_date', { ascending: true, nullsFirst: false })
      .order('scheduled_start_time', { ascending: true, nullsFirst: false });

    if (data) {
      const mapped: TechWO[] = (data as any[])
        .filter(row => row.work_orders)
        .filter(row => {
          const effectiveDate = row.scheduled_date || row.work_orders.scheduled_date;
          const status = row.work_orders.status;
          const wotStatus = row.status;
          const activeStates = ['enroute', 'onsite', 'working', 'on_break'];
          return effectiveDate === today
            || activeStates.includes(wotStatus)
            || ['go_back', 'on_hold'].includes(status);
        })
        .map(row => ({
          id: row.work_orders.id,
          wo_number: row.work_orders.wo_number,
          title: row.work_orders.title,
          priority: row.work_orders.priority,
          work_order_type: row.work_orders.work_order_type,
          scheduled_date: row.scheduled_date || row.work_orders.scheduled_date,
          scheduled_time: row.scheduled_start_time || row.work_orders.scheduled_time,
          status: row.work_orders.status,
          description: row.work_orders.description,
          reason_for_visit: row.work_orders.reason_for_visit,
          scope_of_work: row.work_orders.scope_of_work,
          technician_notes: row.work_orders.technician_notes,
          resolution_notes: row.work_orders.resolution_notes,
          billing_type: row.work_orders.billing_type,
          billing_rate: row.work_orders.billing_rate,
          fixed_amount: row.work_orders.fixed_amount,
          payment_collected: row.work_orders.payment_collected,
          payment_method: row.work_orders.payment_method,
          customer_signature: row.work_orders.customer_signature,
          work_performed: row.work_orders.work_performed,
          company_id: row.work_orders.company_id,
          site_id: row.work_orders.site_id,
          system_id: row.work_orders.system_id,
          total_parts_cost: row.work_orders.total_parts_cost,
          total_labor_cost: row.work_orders.total_labor_cost,
          total_revenue: row.work_orders.total_revenue,
          profit_amount: row.work_orders.profit_amount,
          profit_margin_pct: row.work_orders.profit_margin_pct,
          companies: row.work_orders.companies,
          sites: row.work_orders.sites,
          customer_systems: row.work_orders.customer_systems,
          wot_id: row.id,
          wot_status: row.status || 'assigned',
          wot_enroute_at: row.enroute_at,
          wot_onsite_at: row.onsite_at,
          wot_completed_at: row.completed_at,
          wot_drive_minutes: row.enroute_at && row.onsite_at
            ? Math.round((new Date(row.onsite_at).getTime() - new Date(row.enroute_at).getTime()) / 60000)
            : null,
          wot_paused_at: row.paused_at,
          wot_total_paused_minutes: row.total_paused_minutes,
          wot_current_pause_reason: row.current_pause_reason,
          wot_current_pause_notes: row.current_pause_notes,
          wot_scheduled_date: row.scheduled_date,
          wot_scheduled_start_time: row.scheduled_start_time,
          wot_scheduled_end_time: row.scheduled_end_time,
          wot_estimated_duration_minutes: row.estimated_duration_minutes,
          wot_assignment_notes: row.assignment_notes,
          wot_is_lead: !!row.is_lead,
        }));
      setJobs(mapped);

      // Refresh selected job if open
      if (selectedJob) {
        const refreshed = mapped.find(j => j.wot_id === selectedJob.wot_id);
        if (refreshed) setSelectedJob(refreshed);
      }
    }
  }

  async function handleAction(
    job: TechWO,
    action: TechAction,
    extraData?: {
      resolutionNotes?: string;
      signature?: string | null;
      paymentCollected?: number | null;
      paymentMethod?: string | null;
      pauseReason?: string | null;
      pauseNotes?: string | null;
    }
  ) {
    await runLifecycleAction(
      {
        wotId: job.wot_id,
        workOrderId: job.id,
        employeeId: selectedTechId,
        currentStatus: job.wot_status,
        enrouteAt: job.wot_enroute_at,
        onsiteAt: job.wot_onsite_at,
        pausedAt: job.wot_paused_at,
        totalPausedMinutes: job.wot_total_paused_minutes,
      },
      action,
      extraData
    );
    await loadJobs();
  }

  async function handleSaveNotes(jobId: string, _wotId: string, notes: string) {
    await supabase
      .from('work_orders')
      .update({ technician_notes: notes, updated_at: new Date().toISOString() })
      .eq('id', jobId);
    await loadJobs();
  }

  const completedCount = jobs.filter(j => j.wot_status === 'completed').length;
  const inProgressCount = jobs.filter(j => ['enroute', 'onsite', 'working', 'on_break'].includes(j.wot_status)).length;
  const pendingCount = jobs.filter(j => j.wot_status === 'assigned').length;
  const activeTech = employees.find(e => e.id === selectedTechId);

  // Job detail view
  if (selectedJob) {
    const liveJob = jobs.find(j => j.wot_id === selectedJob.wot_id) || selectedJob;
    return (
      <JobDetail
        job={liveJob}
        onBack={() => setSelectedJob(null)}
        onAction={handleAction}
        onSaveNotes={handleSaveNotes}
      />
    );
  }

  return (
    <div className="min-h-full bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-20">
        <div className="max-w-2xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-lg font-bold text-gray-900">Tech Portal</h1>
              <p className="text-xs text-gray-500">
                {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
              </p>
            </div>
            {employees.length > 0 && (
              <select
                value={selectedTechId}
                onChange={e => { setSelectedTechId(e.target.value); setSelectedJob(null); }}
                className="text-sm border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
              >
                {employees.map(e => (
                  <option key={e.id} value={e.id}>{e.first_name} {e.last_name}</option>
                ))}
              </select>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-4">
        {/* Day Summary */}
        <div className="grid grid-cols-3 gap-3 mb-5">
          <div className="bg-white rounded-2xl border border-gray-200 p-4 text-center">
            <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center mx-auto mb-2">
              <Briefcase className="h-5 w-5 text-blue-600" />
            </div>
            <p className="text-2xl font-bold text-gray-900">{jobs.length}</p>
            <p className="text-xs text-gray-500 font-medium mt-0.5">Today's Jobs</p>
          </div>
          <div className="bg-white rounded-2xl border border-gray-200 p-4 text-center">
            <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center mx-auto mb-2">
              <Wrench className="h-5 w-5 text-amber-600" />
            </div>
            <p className="text-2xl font-bold text-gray-900">{inProgressCount}</p>
            <p className="text-xs text-gray-500 font-medium mt-0.5">In Progress</p>
          </div>
          <div className="bg-white rounded-2xl border border-gray-200 p-4 text-center">
            <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center mx-auto mb-2">
              <CheckCircle className="h-5 w-5 text-emerald-600" />
            </div>
            <p className="text-2xl font-bold text-gray-900">{completedCount}</p>
            <p className="text-xs text-gray-500 font-medium mt-0.5">Completed</p>
          </div>
        </div>

        {/* Jobs List */}
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="animate-spin rounded-full h-8 w-8 border-2 border-blue-600 border-t-transparent" />
          </div>
        ) : jobs.length === 0 ? (
          <div className="bg-white rounded-2xl border border-gray-200 p-10 text-center">
            <div className="w-16 h-16 rounded-2xl bg-gray-100 flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="h-8 w-8 text-gray-400" />
            </div>
            <h3 className="text-lg font-bold text-gray-900 mb-1">No jobs today</h3>
            <p className="text-sm text-gray-500">
              {activeTech ? `${activeTech.first_name} has no work orders scheduled for today.` : 'No work orders scheduled for today.'}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {jobs
              .sort((a, b) => {
                const order: Record<string, number> = { working: 0, enroute: 1, onsite: 2, on_break: 3, assigned: 4, completed: 5 };
                const so = (order[a.wot_status] ?? 9) - (order[b.wot_status] ?? 9);
                if (so !== 0) return so;
                const at = a.wot_scheduled_start_time || a.scheduled_time || '';
                const bt = b.wot_scheduled_start_time || b.scheduled_time || '';
                return at.localeCompare(bt);
              })
              .map(job => (
                <JobCard
                  key={job.wot_id}
                  job={job}
                  onAction={(j, a) => handleAction(j, a)}
                  onOpenDetail={setSelectedJob}
                />
              ))
            }
          </div>
        )}

        {pendingCount > 0 && jobs.length > 0 && (
          <p className="text-center text-xs text-gray-400 mt-4">
            {pendingCount} job{pendingCount !== 1 ? 's' : ''} still pending
          </p>
        )}
      </div>
    </div>
  );
}
