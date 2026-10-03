import { useState } from 'react';
import { ShieldCheck, Layers, LayoutGrid } from 'lucide-react';
import type { CustomerEstimateData, CustomerLineItem } from './api';
import { addressLines, formatLongDate, formatMoney } from './api';

type Grouping = 'by_system' | 'by_room';

function groupItems(data: CustomerEstimateData, mode: Grouping) {
  const { line_items: items, systems, rooms } = data;
  const source = mode === 'by_room' ? rooms : systems;
  const key: keyof CustomerLineItem = mode === 'by_room' ? 'room_id' : 'system_group_id';
  if (source.length === 0) return [{ id: 'all', name: '', items }];
  const groups = source.map((g) => ({ id: g.id, name: g.name, items: items.filter((i) => i[key] === g.id) }));
  const other = items.filter((i) => !i[key] || !source.some((g) => g.id === i[key]));
  if (other.length) groups.push({ id: 'other', name: 'Additional Items', items: other });
  return groups.filter((g) => g.items.length > 0);
}

export default function EstimateDocument({ data }: { data: CustomerEstimateData }) {
  const { estimate: est, company, site, business } = data;
  const canToggle = data.systems.length > 0 && data.rooms.length > 0;
  const [mode, setMode] = useState<Grouping>(
    est.grouping_mode === 'by_room' && data.rooms.length ? 'by_room' : 'by_system'
  );
  const groups = groupItems(data, mode);
  const billTo = company
    ? addressLines({ address: company.billing_address, city: company.billing_city, state: company.billing_state, zip: company.billing_zip })
    : [];
  const siteLines = addressLines(site);
  const businessLines = addressLines(business);

  return (
    <article className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden print:shadow-none print:border-0 print:rounded-none">
      <div className="h-1.5 bg-gradient-to-r from-blue-700 via-blue-500 to-teal-500 print:hidden" />
      <div className="p-6 sm:p-10">
        <header className="flex flex-col sm:flex-row sm:items-start justify-between gap-6 pb-8 border-b border-slate-200">
          <div className="flex items-start gap-3">
            <div className="w-11 h-11 rounded-xl bg-slate-900 flex items-center justify-center flex-shrink-0">
              <ShieldCheck className="w-6 h-6 text-white" />
            </div>
            <div>
              <p className="text-lg font-semibold text-slate-900 leading-tight">{business?.name || 'Our Company'}</p>
              {businessLines.map((l) => <p key={l} className="text-sm text-slate-500">{l}</p>)}
              {business?.phone && <p className="text-sm text-slate-500">{business.phone}</p>}
              {business?.license_number && <p className="text-xs text-slate-400 mt-1">License #{business.license_number}</p>}
            </div>
          </div>
          <div className="sm:text-right">
            <p className="text-3xl font-light tracking-[0.2em] text-slate-900 uppercase">Estimate</p>
            <dl className="mt-3 grid grid-cols-[auto_auto] sm:justify-end gap-x-4 gap-y-1 text-sm">
              <dt className="text-slate-500">Estimate #</dt><dd className="font-mono font-medium text-slate-900">{est.estimate_number}</dd>
              <dt className="text-slate-500">Date</dt><dd className="text-slate-900">{formatLongDate(est.estimate_date) || '—'}</dd>
              {est.expiration_date && (<><dt className="text-slate-500">Valid Until</dt><dd className="text-slate-900">{formatLongDate(est.expiration_date)}</dd></>)}
            </dl>
          </div>
        </header>

        <section className="grid grid-cols-1 sm:grid-cols-2 gap-6 py-8">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.15em] text-slate-400 mb-2">Bill To</p>
            <p className="text-sm font-semibold text-slate-900">{company?.name || 'Customer'}</p>
            {billTo.map((l) => <p key={l} className="text-sm text-slate-600">{l}</p>)}
          </div>
          {site && (
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.15em] text-slate-400 mb-2">Service Location</p>
              {site.name && <p className="text-sm font-semibold text-slate-900">{site.name}</p>}
              {siteLines.map((l) => <p key={l} className="text-sm text-slate-600">{l}</p>)}
            </div>
          )}
        </section>

        {canToggle && (
          <div className="flex justify-end mb-3 print:hidden">
            <div className="inline-flex p-1 bg-slate-100 rounded-lg text-xs font-medium">
              {([['by_system', 'By System', Layers], ['by_room', 'By Room', LayoutGrid]] as const).map(([k, label, Icon]) => (
                <button
                  key={k}
                  onClick={() => setMode(k)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md transition-all ${mode === k ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}
                >
                  <Icon className="w-3.5 h-3.5" /> {label}
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="rounded-xl border border-slate-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-900 text-white">
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider">Description</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider w-16">Qty</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider w-28">Rate</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider w-32">Amount</th>
                </tr>
              </thead>
              {groups.map((g) => (
                <tbody key={g.id} className="divide-y divide-slate-100">
                  {g.name && (
                    <tr className="bg-slate-50">
                      <td colSpan={3} className="px-4 py-2 text-xs font-semibold uppercase tracking-wider text-slate-600">{g.name}</td>
                      <td className="px-4 py-2 text-right text-xs font-semibold text-slate-600 tabular-nums">
                        {formatMoney(g.items.reduce((s, i) => s + Number(i.quantity) * Number(i.unit_price), 0))}
                      </td>
                    </tr>
                  )}
                  {g.items.map((li) => (
                    <tr key={li.id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="px-4 py-3 text-slate-900">{li.description || 'Item'}</td>
                      <td className="px-4 py-3 text-right text-slate-600 tabular-nums">{Number(li.quantity)}</td>
                      <td className="px-4 py-3 text-right text-slate-600 tabular-nums">{formatMoney(li.unit_price)}</td>
                      <td className="px-4 py-3 text-right font-medium text-slate-900 tabular-nums">{formatMoney(Number(li.quantity) * Number(li.unit_price))}</td>
                    </tr>
                  ))}
                </tbody>
              ))}
              {data.line_items.length === 0 && (
                <tbody><tr><td colSpan={4} className="px-4 py-10 text-center text-slate-500">No items have been added yet.</td></tr></tbody>
              )}
            </table>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row justify-between gap-8 mt-8">
          <div className="sm:max-w-sm">
            {est.notes && (
              <>
                <p className="text-[11px] font-semibold uppercase tracking-[0.15em] text-slate-400 mb-2">Notes</p>
                <p className="text-sm text-slate-600 whitespace-pre-wrap leading-relaxed">{est.notes}</p>
              </>
            )}
          </div>
          <dl className="w-full sm:w-72 text-sm space-y-2">
            <div className="flex justify-between text-slate-600"><dt>Subtotal</dt><dd className="tabular-nums">{formatMoney(est.subtotal)}</dd></div>
            <div className="flex justify-between text-slate-600"><dt>Tax</dt><dd className="tabular-nums">{formatMoney(est.tax)}</dd></div>
            <div className="flex justify-between items-baseline pt-3 border-t-2 border-slate-900">
              <dt className="font-semibold text-slate-900">Total</dt>
              <dd className="text-2xl font-semibold text-slate-900 tabular-nums">{formatMoney(est.total)}</dd>
            </div>
          </dl>
        </div>
      </div>
    </article>
  );
}
