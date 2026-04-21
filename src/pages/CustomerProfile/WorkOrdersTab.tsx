import { useState, useEffect, useCallback } from 'react';
import { Plus, Wrench, AlertCircle, DollarSign, Calendar } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import type { WorkOrder } from './types';
import WorkOrderModal from '../WorkOrders/WorkOrderModal';
import WorkOrderDetail from '../WorkOrders/WorkOrderDetail';

interface Props {
  companyId: string;
}

const STATUS_STYLES: Record<string, string> = {
  unassigned: 'bg-gray-100 text-gray-600',
  scheduled: 'bg-blue-100 text-blue-700',
  in_progress: 'bg-amber-100 text-amber-800',
  completed: 'bg-emerald-100 text-emerald-700',
  cancelled: 'bg-gray-100 text-gray-400',
  on_hold: 'bg-orange-100 text-orange-700',
};

const PRIORITY_STYLES: Record<string, string> = {
  low: 'text-gray-400',
  normal: 'text-blue-600',
  high: 'text-orange-600',
  emergency: 'text-red-600',
};

const TYPE_LABELS: Record<string, string> = {
  installation: 'Install',
  service: 'Service',
  maintenance: 'Maint.',
  inspection: 'Inspect',
};

const BILLING_LABELS: Record<string, string> = {
  not_billable: 'Not Billable',
  hourly: 'Hourly',
  fixed: 'Fixed',
};

export default function WorkOrdersTab({ companyId }: Props) {
  const [workOrders, setWorkOrders] = useState<WorkOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [detailId, setDetailId] = useState<string | null>(null);
  const [editId, setEditId] = useState<string | null>(null);

  const loadWorkOrders = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from('work_orders')
      .select(`
        id, wo_number, title, work_order_type, status, priority, billing_type,
        scheduled_date, scheduled_time, labor_cost, parts_cost, fixed_amount,
        sites(name),
        work_order_technicians(is_lead, employees(first_name, last_name))
      `)
      .eq('company_id', companyId)
      .order('created_at', { ascending: false });

    setWorkOrders((data as WorkOrder[]) || []);
    setLoading(false);
  }, [companyId]);

  useEffect(() => {
    loadWorkOrders();
  }, [loadWorkOrders]);

  function getLeadTech(wo: WorkOrder): string {
    const techs = wo.work_order_technicians || [];
    const lead = techs.find((t: any) => t.is_lead) || techs[0];
    if (!lead) return '';
    const emp = (lead as any).employees;
    if (!emp) return '';
    return `${emp.first_name} ${emp.last_name}`;
  }

  if (detailId) {
    return (
      <WorkOrderDetail
        workOrderId={detailId}
        onBack={() => { setDetailId(null); loadWorkOrders(); }}
        onEdit={(id) => { setEditId(id); }}
      />
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-500">
          {loading ? 'Loading...' : `${workOrders.length} work order${workOrders.length !== 1 ? 's' : ''}`}
        </p>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors"
        >
          <Plus className="h-4 w-4" />
          New Work Order
        </button>
      </div>

      <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
        {loading ? (
          <div className="py-12 flex items-center justify-center">
            <div className="animate-spin rounded-full h-6 w-6 border-2 border-blue-600 border-t-transparent" />
          </div>
        ) : workOrders.length === 0 ? (
          <div className="py-16 text-center">
            <Wrench className="h-10 w-10 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500 font-medium">No work orders yet</p>
            <p className="text-sm text-gray-400 mt-1">Create the first work order for this customer</p>
            <button
              onClick={() => setShowModal(true)}
              className="mt-4 px-4 py-2 text-sm font-medium text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors"
            >
              New Work Order
            </button>
          </div>
        ) : (
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">WO #</th>
                <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Title</th>
                <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Type</th>
                <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Site</th>
                <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Priority</th>
                <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Status</th>
                <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Tech</th>
                <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Scheduled</th>
                <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Billing</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {workOrders.map(wo => {
                const leadTech = getLeadTech(wo);
                return (
                  <tr
                    key={wo.id}
                    onClick={() => setDetailId(wo.id)}
                    className="hover:bg-gray-50 cursor-pointer transition-colors"
                  >
                    <td className="px-5 py-3.5 font-mono text-sm font-semibold text-blue-700">{wo.wo_number}</td>
                    <td className="px-5 py-3.5">
                      <p className="text-sm font-medium text-gray-900 max-w-xs truncate">{wo.title}</p>
                    </td>
                    <td className="px-5 py-3.5">
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                        wo.work_order_type === 'installation' ? 'bg-blue-100 text-blue-700' :
                        wo.work_order_type === 'service' ? 'bg-teal-100 text-teal-700' :
                        wo.work_order_type === 'maintenance' ? 'bg-amber-100 text-amber-700' :
                        'bg-gray-100 text-gray-600'
                      }`}>
                        {TYPE_LABELS[wo.work_order_type] || wo.work_order_type}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-sm text-gray-600">
                      {(wo.sites as any)?.name || '—'}
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-1">
                        <AlertCircle className={`h-3.5 w-3.5 ${PRIORITY_STYLES[wo.priority] || 'text-gray-400'}`} />
                        <span className={`text-xs font-medium capitalize ${PRIORITY_STYLES[wo.priority] || 'text-gray-500'}`}>
                          {wo.priority}
                        </span>
                      </div>
                    </td>
                    <td className="px-5 py-3.5">
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full capitalize ${STATUS_STYLES[wo.status] || 'bg-gray-100 text-gray-600'}`}>
                        {wo.status.replace(/_/g, ' ')}
                      </span>
                    </td>
                    <td className="px-5 py-3.5">
                      {leadTech ? (
                        <div className="flex items-center gap-1.5">
                          <div className="w-5 h-5 rounded-full bg-blue-100 flex items-center justify-center text-xs font-bold text-blue-700">
                            {leadTech.split(' ').map((n: string) => n[0]).join('')}
                          </div>
                          <span className="text-xs text-gray-700">{leadTech.split(' ')[0]}</span>
                        </div>
                      ) : (
                        <span className="text-xs text-gray-400 italic">—</span>
                      )}
                    </td>
                    <td className="px-5 py-3.5">
                      {wo.scheduled_date ? (
                        <div className="flex items-center gap-1">
                          <Calendar className="h-3.5 w-3.5 text-gray-400" />
                          <span className="text-xs text-gray-700">
                            {new Date(wo.scheduled_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                          </span>
                        </div>
                      ) : (
                        <span className="text-xs text-gray-400">—</span>
                      )}
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-1">
                        <DollarSign className={`h-3.5 w-3.5 ${wo.billing_type === 'not_billable' ? 'text-gray-300' : 'text-emerald-500'}`} />
                        <span className={`text-xs ${wo.billing_type === 'not_billable' ? 'text-gray-400' : 'text-emerald-700 font-medium'}`}>
                          {BILLING_LABELS[wo.billing_type] || '—'}
                        </span>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {showModal && (
        <WorkOrderModal
          prefilledCompanyId={companyId}
          onClose={() => setShowModal(false)}
          onSaved={loadWorkOrders}
        />
      )}

      {editId && (
        <WorkOrderModal
          editWorkOrderId={editId}
          onClose={() => setEditId(null)}
          onSaved={loadWorkOrders}
        />
      )}
    </div>
  );
}
