import { Trash2, Layers } from 'lucide-react';
import { groupLines } from '../../lib/workOrderSource';
import type { WorkOrderLine } from '../../lib/workOrderSource';

interface Props {
  parts: WorkOrderLine[];
  onUpdate: (key: string, field: keyof WorkOrderLine, value: string | number) => void;
  onRemove: (key: string) => void;
}

const money = (n: number) => `$${n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export default function GroupedPartsEditor({ parts, onUpdate, onRemove }: Props) {
  const groups = groupLines(parts);
  const showHeaders = groups.length > 1 || groups.some(g => g.label);
  const total = parts.reduce((s, p) => s + p.quantity * p.unit_price, 0);

  return (
    <div className="space-y-4">
      {groups.map(group => {
        const subtotal = group.items.reduce((s, p) => s + p.quantity * p.unit_price, 0);
        return (
          <div key={group.key || 'none'} className={showHeaders ? 'rounded-xl border border-gray-200 overflow-hidden' : ''}>
            {showHeaders && (
              <div className="flex items-center justify-between px-3 py-2 bg-gray-50 border-b border-gray-200">
                <span className="flex items-center gap-1.5 text-xs font-semibold text-gray-700 uppercase tracking-wide">
                  <Layers className="h-3.5 w-3.5 text-blue-500" /> {group.label || 'Added Items'}
                </span>
                <span className="text-xs text-gray-500">{group.items.length} item{group.items.length !== 1 ? 's' : ''}</span>
              </div>
            )}
            <div className={showHeaders ? 'p-2 space-y-2' : 'space-y-2'}>
              {group.items.map(part => (
                <div key={part.key} className="flex items-center gap-2 p-2.5 bg-white border border-gray-200 rounded-lg hover:border-gray-300 transition-colors">
                  <input
                    type="text"
                    value={part.description}
                    onChange={e => onUpdate(part.key, 'description', e.target.value)}
                    placeholder="Part description"
                    className="flex-1 min-w-0 px-2 py-1.5 border border-gray-200 rounded text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                  <input
                    type="number"
                    min="1"
                    value={part.quantity}
                    onChange={e => onUpdate(part.key, 'quantity', parseFloat(e.target.value) || 1)}
                    className="w-16 px-2 py-1.5 border border-gray-200 rounded text-sm text-center focus:outline-none focus:ring-1 focus:ring-blue-500"
                    aria-label="Quantity"
                  />
                  <div className="relative w-24">
                    <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs text-gray-400">$</span>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={part.unit_price}
                      onChange={e => onUpdate(part.key, 'unit_price', parseFloat(e.target.value) || 0)}
                      className="w-full pl-5 pr-2 py-1.5 border border-gray-200 rounded text-sm text-right focus:outline-none focus:ring-1 focus:ring-blue-500"
                      aria-label="Unit price"
                    />
                  </div>
                  <span className="text-xs font-semibold text-gray-600 w-20 text-right">{money(part.quantity * part.unit_price)}</span>
                  <button onClick={() => onRemove(part.key)} className="p-1 text-gray-400 hover:text-red-500 transition-colors" aria-label="Remove item">
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
            </div>
            {showHeaders && (
              <div className="flex justify-end px-3 py-2 border-t border-gray-100 bg-gray-50/60">
                <span className="text-xs text-gray-600">Subtotal <span className="font-semibold text-gray-900 ml-1">{money(subtotal)}</span></span>
              </div>
            )}
          </div>
        );
      })}
      <div className="flex justify-end pt-2 border-t border-gray-100">
        <p className="text-sm font-semibold text-gray-700">Parts Total: <span className="text-blue-700">{money(total)}</span></p>
      </div>
    </div>
  );
}
