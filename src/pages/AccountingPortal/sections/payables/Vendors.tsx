import { useMemo, useState } from 'react';
import { AlertTriangle, Plus, Search, Truck } from 'lucide-react';
import { supabase } from '../../../../lib/supabase';
import { usePortal } from '../../lib/context';
import { errMsg } from '../../lib/api';
import { money } from '../../lib/format';
import type { Bill, Vendor } from '../../lib/types';
import { AccountSelect, Badge, btnPrimary, btnSecondary, Card, EmptyState, ErrorBanner, Field, inputCls, Modal } from '../../components/ui';

const TYPES = ['subcontractor', 'supplier', 'professional', 'landlord', 'utility', 'insurance', 'software', 'vehicle', 'lender', 'payroll', 'card', 'other'];
const ENTITIES = ['individual', 'llc', 'partnership', 'corporation'];

type Draft = Partial<Vendor> & { name: string };

export default function Vendors({ vendors, bills, onChanged, onOpenBills }: {
  vendors: Vendor[]; bills: Bill[]; onChanged: () => void; onOpenBills: (vendorId: string) => void;
}) {
  const { accounts, notify } = usePortal();
  const [q, setQ] = useState('');
  const [edit, setEdit] = useState<Draft | null>(null);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const owed = useMemo(() => {
    const m = new Map<string, number>();
    for (const b of bills) {
      if (b.status === 'void' || b.status === 'paid') continue;
      const left = (b.total - b.amount_paid) * (b.kind === 'credit' ? -1 : 1);
      m.set(b.vendor_id, (m.get(b.vendor_id) ?? 0) + left);
    }
    return m;
  }, [bills]);

  const list = vendors.filter(v => !q || `${v.name} ${v.vendor_type} ${v.contact_name}`.toLowerCase().includes(q.toLowerCase()));

  async function save() {
    if (!edit) return;
    setSaving(true);
    setError('');
    const { id, ...rest } = edit;
    const row = {
      name: rest.name.trim(), vendor_type: rest.vendor_type ?? 'other', contact_name: rest.contact_name ?? null, email: rest.email ?? null,
      phone: rest.phone ?? null, address: rest.address ?? null, city: rest.city ?? null, state: rest.state ?? null, zip: rest.zip ?? null,
      payment_terms: rest.payment_terms ?? 'Net 30', default_account_id: rest.default_account_id || null, tax_id: rest.tax_id || null,
      entity_type: rest.entity_type ?? 'llc', is_1099: !!rest.is_1099, is_active: rest.is_active ?? true, notes: rest.notes ?? null,
    };
    const { error } = id ? await supabase.from('acct_vendors').update(row).eq('id', id) : await supabase.from('acct_vendors').insert(row);
    setSaving(false);
    if (error) { setError(errMsg(error)); return; }
    setEdit(null);
    notify(id ? 'Vendor updated' : 'Vendor added');
    onChanged();
  }

  const set = (k: keyof Vendor, v: unknown) => setEdit(e => (e ? { ...e, [k]: v } : e));

  return (
    <Card className="overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-4 border-b border-gray-100">
        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input value={q} onChange={e => setQ(e.target.value)} placeholder="Search vendors" className={`${inputCls} pl-9`} />
        </div>
        <button onClick={() => setEdit({ name: '', vendor_type: 'subcontractor', entity_type: 'llc', payment_terms: 'Net 30', is_active: true })} className={btnPrimary}><Plus className="w-4 h-4" /> New vendor</button>
      </div>
      {list.length === 0 ? <EmptyState icon={<Truck className="w-5 h-5" />} title="No vendors found" /> : (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead><tr className="border-b border-gray-100 text-xs font-semibold uppercase tracking-wide text-gray-500">
              <th className="text-left px-5 py-2.5">Vendor</th><th className="text-left px-3 py-2.5">Type</th><th className="text-left px-3 py-2.5">Terms</th><th className="text-left px-3 py-2.5">1099</th><th className="text-right px-5 py-2.5">You owe</th>
            </tr></thead>
            <tbody className="divide-y divide-gray-50">
              {list.map(v => {
                const bal = owed.get(v.id) ?? 0;
                return (
                  <tr key={v.id} onClick={() => setEdit({ ...v })} className={`cursor-pointer hover:bg-gray-50 text-sm ${v.is_active ? '' : 'opacity-50'}`}>
                    <td className="px-5 py-2.5"><p className="font-medium text-gray-900">{v.name}</p><p className="text-xs text-gray-500">{[v.contact_name, v.phone].filter(Boolean).join(' · ')}</p></td>
                    <td className="px-3 py-2.5 capitalize text-gray-600">{v.vendor_type}</td>
                    <td className="px-3 py-2.5 text-gray-600">{v.payment_terms}</td>
                    <td className="px-3 py-2.5">{v.is_1099 ? (v.tax_id ? <Badge tone="blue">1099</Badge> : <Badge tone="amber"><AlertTriangle className="w-3 h-3" /> Needs W-9</Badge>) : <span className="text-gray-300">-</span>}</td>
                    <td className="px-5 py-2.5 text-right tabular-nums">
                      {Math.abs(bal) > 0.004 ? <button onClick={e => { e.stopPropagation(); onOpenBills(v.id); }} className="font-medium text-blue-700 hover:underline">{money(bal)}</button> : <span className="text-gray-400">{money(0)}</span>}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <Modal open={!!edit} onClose={() => setEdit(null)} title={edit?.id ? edit.name : 'New vendor'} size="lg"
        footer={<><button onClick={() => setEdit(null)} className={btnSecondary}>Cancel</button><button onClick={save} disabled={saving || !edit?.name.trim()} className={btnPrimary}>Save vendor</button></>}>
        {edit && (
          <div className="space-y-4">
            <ErrorBanner message={error} />
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Name"><input value={edit.name} onChange={e => set('name', e.target.value)} className={inputCls} autoFocus /></Field>
              <Field label="Type"><select value={edit.vendor_type ?? 'other'} onChange={e => set('vendor_type', e.target.value)} className={`${inputCls} capitalize`}>{TYPES.map(t => <option key={t} value={t}>{t}</option>)}</select></Field>
              <Field label="Contact"><input value={edit.contact_name ?? ''} onChange={e => set('contact_name', e.target.value)} className={inputCls} /></Field>
              <Field label="Phone"><input value={edit.phone ?? ''} onChange={e => set('phone', e.target.value)} className={inputCls} /></Field>
              <Field label="Email"><input type="email" value={edit.email ?? ''} onChange={e => set('email', e.target.value)} className={inputCls} /></Field>
              <Field label="Payment terms"><select value={edit.payment_terms ?? 'Net 30'} onChange={e => set('payment_terms', e.target.value)} className={inputCls}>{['Due on receipt', 'Net 10', 'Net 15', 'Net 30', 'Net 45', 'Net 60'].map(t => <option key={t}>{t}</option>)}</select></Field>
              <Field label="Street address"><input value={edit.address ?? ''} onChange={e => set('address', e.target.value)} className={inputCls} /></Field>
              <div className="grid grid-cols-[1fr_70px_90px] gap-2">
                <Field label="City"><input value={edit.city ?? ''} onChange={e => set('city', e.target.value)} className={inputCls} /></Field>
                <Field label="State"><input value={edit.state ?? ''} onChange={e => set('state', e.target.value.toUpperCase().slice(0, 2))} className={inputCls} /></Field>
                <Field label="ZIP"><input value={edit.zip ?? ''} onChange={e => set('zip', e.target.value)} className={inputCls} /></Field>
              </div>
              <Field label="Default expense account" hint="Pre-fills new bills from this vendor">
                <AccountSelect accounts={accounts} value={edit.default_account_id ?? ''} onChange={id => set('default_account_id', id)} types={['expense', 'cogs', 'asset']} />
              </Field>
              <Field label="Business type"><select value={edit.entity_type ?? 'llc'} onChange={e => set('entity_type', e.target.value)} className={`${inputCls} capitalize`}>{ENTITIES.map(t => <option key={t} value={t}>{t === 'llc' ? 'LLC' : t}</option>)}</select></Field>
            </div>
            <div className="rounded-lg border border-gray-200 p-4 space-y-3">
              <label className="flex items-center gap-2 text-sm font-medium text-gray-900">
                <input type="checkbox" checked={!!edit.is_1099} onChange={e => set('is_1099', e.target.checked)} className="rounded border-gray-300 text-blue-600 focus:ring-blue-500" />
                Send this vendor a 1099 at year end
              </label>
              {edit.is_1099 && (
                <Field label="Tax ID (SSN or EIN from their W-9)"><input value={edit.tax_id ?? ''} onChange={e => set('tax_id', e.target.value)} className={inputCls} placeholder="XX-XXXXXXX" /></Field>
              )}
            </div>
            <Field label="Notes"><textarea value={edit.notes ?? ''} onChange={e => set('notes', e.target.value)} rows={2} className={inputCls} /></Field>
            {edit.id && (
              <label className="flex items-center gap-2 text-sm text-gray-700">
                <input type="checkbox" checked={edit.is_active === false} onChange={e => set('is_active', !e.target.checked)} className="rounded border-gray-300 text-blue-600 focus:ring-blue-500" />
                Hide this vendor (inactive)
              </label>
            )}
          </div>
        )}
      </Modal>
    </Card>
  );
}
