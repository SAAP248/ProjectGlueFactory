import { useEffect, useState } from 'react';
import { Package, Truck, Loader2 } from 'lucide-react';
import { loadChecklist } from '../TechnicianPortal/partsChecklistData';
import type { ChecklistData, UsedPart } from '../TechnicianPortal/partsChecklistData';

const money = (n: number) => n.toLocaleString('en-US', { style: 'currency', currency: 'USD' });

export default function WorkOrderPartsSummary({ workOrderId }: { workOrderId: string }) {
  const [data, setData] = useState<ChecklistData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    setLoading(true);
    loadChecklist(workOrderId).then(res => {
      if (!active) return;
      setData(res.data);
      setError(res.error);
      setLoading(false);
    });
    return () => { active = false; };
  }, [workOrderId]);

  const who = (id: string | null) => data?.crew.find(c => c.id === id)?.name || 'Technician';
  const where = (id: string | null) => data?.locations.find(l => l.id === id)?.name || 'No truck set';

  const lines = data?.lines || [];
  const parts = data?.parts || [];
  const byLine = new Map<string, UsedPart[]>();
  for (const p of parts) if (p.work_order_line_item_id) byLine.set(p.work_order_line_item_id, [...(byLine.get(p.work_order_line_item_id) || []), p]);
  const lineIds = new Set(lines.map(l => l.id));
  const extras = parts.filter(p => !p.work_order_line_item_id || !lineIds.has(p.work_order_line_item_id));

  const totalUnits = lines.reduce((s, l) => s + l.quantity, 0);
  const installed = lines.reduce((s, l) => s + Math.min(l.quantity, (byLine.get(l.id) || []).reduce((a, p) => a + Number(p.quantity || 0), 0)), 0);
  const pct = totalUnits > 0 ? Math.round((installed / totalUnits) * 100) : 0;
  const usedCost = parts.reduce((s, p) => s + Number(p.total_cost || 0), 0);

  const groups: { key: string; label: string | null; ids: string[] }[] = [];
  for (const l of lines) {
    const key = l.group_key || '__none';
    let g = groups.find(x => x.key === key);
    if (!g) { g = { key, label: l.group_label, ids: [] }; groups.push(g); }
    g.ids.push(l.id);
  }
  const showHeaders = groups.some(g => g.label);

  return (
    <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
      <div className="px-4 py-3 border-b border-gray-100 flex items-center gap-2">
        <Package className="h-4 w-4 text-gray-400" />
        <h3 className="text-sm font-semibold text-gray-900">Parts Used</h3>
        {!loading && totalUnits > 0 && <span className="text-xs text-gray-500 ml-auto">{installed} of {totalUnits} items installed</span>}
      </div>
      {loading ? (
        <div className="py-8 flex justify-center"><Loader2 className="h-5 w-5 animate-spin text-gray-300" /></div>
      ) : error ? (
        <p className="px-4 py-6 text-sm text-red-600">{error}</p>
      ) : lines.length === 0 && extras.length === 0 ? (
        <p className="px-4 py-8 text-center text-sm text-gray-500">No parts on this work order yet.</p>
      ) : (
        <div className="p-4 space-y-4">
          {totalUnits > 0 && (
            <div className="h-1.5 rounded-full bg-gray-100 overflow-hidden">
              <div className="h-full rounded-full bg-emerald-500 transition-all duration-500" style={{ width: `${pct}%` }} />
            </div>
          )}
          {groups.map(g => (
            <div key={g.key}>
              {showHeaders && <p className="mb-1.5 text-[11px] font-bold uppercase tracking-wide text-gray-500">{g.label || 'Other Items'}</p>}
              <ul className="divide-y divide-gray-100 rounded-lg border border-gray-100">
                {g.ids.map(id => {
                  const line = lines.find(l => l.id === id)!;
                  const used = byLine.get(id) || [];
                  const qtyUsed = used.reduce((s, p) => s + Number(p.quantity || 0), 0);
                  const remaining = Math.max(0, line.quantity - qtyUsed);
                  return (
                    <li key={id} className="px-3 py-2.5">
                      <div className="flex items-center gap-3">
                        <p className="flex-1 min-w-0 truncate text-sm text-gray-900">{line.description}</p>
                        <span className={`text-xs font-semibold ${remaining === 0 && line.quantity > 0 ? 'text-emerald-600' : 'text-gray-600'}`}>
                          {qtyUsed} / {line.quantity}
                        </span>
                        {remaining > 0 && <span className="text-[11px] text-amber-700">{remaining} left</span>}
                      </div>
                      {used.map(p => <PartLine key={p.id} part={p} who={who} where={where} />)}
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
          {extras.length > 0 && (
            <div>
              <p className="mb-1.5 text-[11px] font-bold uppercase tracking-wide text-gray-500">Extra Parts</p>
              <ul className="divide-y divide-gray-100 rounded-lg border border-gray-100">
                {extras.map(p => (
                  <li key={p.id} className="px-3 py-2.5">
                    <div className="flex items-center gap-3">
                      <p className="flex-1 min-w-0 truncate text-sm text-gray-900">{p.part_name}</p>
                      <span className="text-xs font-semibold text-gray-600">{Number(p.quantity)}</span>
                    </div>
                    <PartLine part={p} who={who} where={where} />
                  </li>
                ))}
              </ul>
            </div>
          )}
          <div className="flex justify-between border-t border-gray-100 pt-3 text-sm">
            <span className="text-gray-500">Parts cost so far</span>
            <span className="font-semibold text-gray-900">{money(usedCost)}</span>
          </div>
        </div>
      )}
    </div>
  );
}

function PartLine({ part, who, where }: { part: UsedPart; who: (id: string | null) => string; where: (id: string | null) => string }) {
  return (
    <p className="mt-1 flex flex-wrap items-center gap-x-1.5 text-[11px] text-gray-500">
      <Truck className="h-3 w-3 text-gray-400" />
      {who(part.used_by_employee_id)} used {Number(part.quantity)} from {where(part.source_warehouse_id)}
      {part.serial_number && <span className="font-mono text-gray-400">· S/N {part.serial_number}</span>}
      {part.installed_location && <span className="text-gray-400">· {part.installed_location}</span>}
    </p>
  );
}
