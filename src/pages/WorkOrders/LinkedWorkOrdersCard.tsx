import { useCallback, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { ClipboardList, Plus, ChevronRight, Loader2, CalendarDays } from 'lucide-react';
import { fetchLinkedWorkOrders } from '../../lib/workOrderSource';
import type { LinkedWorkOrder, WorkOrderSource } from '../../lib/workOrderSource';
import WorkOrderModal from './WorkOrderModal';
import WorkOrderSlideOver from './WorkOrderSlideOver';

interface Props {
  source: WorkOrderSource;
  onChanged?: () => void;
}

const STATUS_STYLES: Record<string, string> = {
  unassigned: 'bg-gray-100 text-gray-700',
  scheduled: 'bg-blue-100 text-blue-700',
  in_progress: 'bg-amber-100 text-amber-800',
  on_hold: 'bg-orange-100 text-orange-800',
  completed: 'bg-emerald-100 text-emerald-800',
  cancelled: 'bg-red-100 text-red-700',
};

export default function LinkedWorkOrdersCard({ source, onChanged }: Props) {
  const [items, setItems] = useState<LinkedWorkOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [openId, setOpenId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error: err } = await fetchLinkedWorkOrders(source);
    setItems(data);
    setError(err);
    setLoading(false);
  }, [source.type, source.id]);

  useEffect(() => { load(); }, [load]);

  return (
    <section className="rounded-xl border border-gray-200 overflow-hidden">
      <div className="flex items-center justify-between gap-3 px-4 py-3 bg-gray-50 border-b border-gray-200">
        <h3 className="flex items-center gap-2 text-sm font-semibold text-gray-900">
          <ClipboardList className="w-4 h-4 text-blue-600" /> Work Orders
          {items.length > 0 && <span className="text-xs font-medium text-gray-500">({items.length})</span>}
        </h3>
        <button
          onClick={() => setCreating(true)}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 shadow-sm transition-colors"
        >
          <Plus className="w-4 h-4" /> Create Work Order
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-6 text-sm text-gray-500"><Loader2 className="w-4 h-4 animate-spin mr-2" /> Loading...</div>
      ) : error ? (
        <p className="px-4 py-4 text-sm text-red-700 bg-red-50">Could not load work orders. <button onClick={load} className="underline font-medium">Try again</button></p>
      ) : items.length === 0 ? (
        <p className="px-4 py-5 text-sm text-gray-500">No work orders yet. Create one to schedule the job and send every item to the crew.</p>
      ) : (
        <ul className="divide-y divide-gray-100">
          {items.map(wo => {
            const pct = wo.totalUnits > 0 ? Math.round((wo.installedUnits / wo.totalUnits) * 100) : 0;
            return (
              <li key={wo.id}>
                <button onClick={() => setOpenId(wo.id)} className="w-full flex items-center gap-4 px-4 py-3 text-left hover:bg-gray-50 transition-colors group">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-semibold text-blue-700">{wo.wo_number}</span>
                      <span className={`px-2 py-0.5 text-[11px] font-medium rounded-full capitalize ${STATUS_STYLES[wo.status] || 'bg-gray-100 text-gray-700'}`}>{wo.status.replace('_', ' ')}</span>
                    </div>
                    <p className="text-sm text-gray-900 truncate mt-0.5">{wo.title}</p>
                    {wo.totalUnits > 0 && (
                      <div className="mt-2 flex items-center gap-2">
                        <div className="flex-1 h-1.5 rounded-full bg-gray-100 overflow-hidden">
                          <div className="h-full rounded-full bg-emerald-500 transition-all duration-500" style={{ width: `${pct}%` }} />
                        </div>
                        <span className="text-[11px] text-gray-600 whitespace-nowrap">{wo.installedUnits} of {wo.totalUnits} items installed</span>
                      </div>
                    )}
                  </div>
                  {wo.scheduled_date && (
                    <span className="hidden sm:flex items-center gap-1 text-xs text-gray-500">
                      <CalendarDays className="w-3.5 h-3.5" />
                      {new Date(wo.scheduled_date + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    </span>
                  )}
                  <ChevronRight className="w-4 h-4 text-gray-400 group-hover:translate-x-0.5 transition-transform" />
                </button>
              </li>
            );
          })}
        </ul>
      )}

      {(creating || openId) && createPortal(
        <div className="relative z-[60]">
          {creating && (
            <WorkOrderModal
              source={source}
              onClose={() => setCreating(false)}
              onSaved={() => { load(); onChanged?.(); }}
            />
          )}
          {openId && <WorkOrderSlideOver workOrderId={openId} onClose={() => { setOpenId(null); load(); }} />}
        </div>,
        document.body,
      )}
    </section>
  );
}
