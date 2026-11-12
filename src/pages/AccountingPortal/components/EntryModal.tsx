import { useEffect, useState } from 'react';
import { ArrowUpRight, Building2, FileText, Lock, Pencil } from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import { usePortal } from '../lib/context';
import { errMsg } from '../lib/api';
import { fmtDate, sourceLabel } from '../lib/format';
import type { Entry, EntryLine } from '../lib/types';
import { Badge, btnSecondary, ErrorBanner, Loading, Modal, Money, Td, Th } from './ui';

type LineRow = EntryLine & { companies?: { name: string } | null; acct_vendors?: { name: string } | null };

export default function EntryModal({ entryId, onClose }: { entryId: string | null; onClose: () => void }) {
  const { byId, onOpenInvoice, onViewCustomer, go } = usePortal();
  const [entry, setEntry] = useState<(Entry & { companies?: { name: string } | null }) | null>(null);
  const [lines, setLines] = useState<LineRow[]>([]);
  const [invoiceId, setInvoiceId] = useState<string | null>(null);
  const [locked, setLocked] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!entryId) return;
    setEntry(null);
    setError('');
    setInvoiceId(null);
    (async () => {
      const [e, l] = await Promise.all([
        supabase.from('acct_entries').select('*, companies(name)').eq('id', entryId).maybeSingle(),
        supabase.from('acct_entry_lines').select('*, companies(name), acct_vendors(name)').eq('entry_id', entryId).order('sort_order'),
      ]);
      if (e.error || l.error) { setError(errMsg(e.error || l.error)); return; }
      if (!e.data) { setError('This entry no longer exists.'); return; }
      const ent = e.data as Entry & { companies?: { name: string } | null };
      setEntry(ent);
      setLines((l.data ?? []) as LineRow[]);
      const lk = await supabase.rpc('acct_is_locked', { p_date: ent.entry_date });
      setLocked(!!lk.data);
      if (['invoice', 'cogs', 'writeoff'].includes(ent.source_type) && ent.source_id) setInvoiceId(ent.source_id);
      else if (['payment', 'portal_payment'].includes(ent.source_type) && ent.source_id) {
        const t = await supabase.from('transactions').select('invoice_id').eq('id', ent.source_id).maybeSingle();
        if (t.data?.invoice_id) setInvoiceId(t.data.invoice_id);
      }
    })();
  }, [entryId]);

  const totalD = lines.reduce((s, l) => s + Number(l.debit), 0);
  const totalC = lines.reduce((s, l) => s + Number(l.credit), 0);
  const editable = entry && ['manual', 'recurring'].includes(entry.source_type) && !locked;
  const isBill = entry && ['bill', 'bill_payment'].includes(entry.source_type);

  return (
    <Modal
      open={!!entryId}
      onClose={onClose}
      size="lg"
      title={entry ? `Entry #${entry.entry_number}` : 'Entry'}
      subtitle={entry ? `${sourceLabel(entry.source_type)} · ${fmtDate(entry.entry_date)}` : undefined}
      footer={
        <>
          {entry?.company_id && (
            <button className={btnSecondary} onClick={() => { onClose(); onViewCustomer(entry.company_id!); }}>
              <Building2 className="w-4 h-4" /> View customer
            </button>
          )}
          {invoiceId && (
            <button className={btnSecondary} onClick={() => { onClose(); onOpenInvoice(invoiceId); }}>
              <FileText className="w-4 h-4" /> Open invoice in WorkHorse
            </button>
          )}
          {isBill && (
            <button className={btnSecondary} onClick={() => { onClose(); go('payables', { tab: 'bills', vendor: entry!.vendor_id ?? undefined }); }}>
              <ArrowUpRight className="w-4 h-4" /> Go to bills
            </button>
          )}
          {editable && (
            <button className={btnSecondary} onClick={() => { onClose(); go('journal', { edit: entry!.id }); }}>
              <Pencil className="w-4 h-4" /> Edit entry
            </button>
          )}
        </>
      }
    >
      <ErrorBanner message={error} />
      {!entry && !error && <Loading />}
      {entry && (
        <div className="space-y-5">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
            <Info label="Reference" value={entry.source_ref || '-'} />
            <Info label="Customer" value={entry.companies?.name || '-'} />
            <Info label="Created by" value={entry.created_by || 'WorkHorse'} />
            <Info label="Status" value={locked ? <Badge tone="gray"><Lock className="w-3 h-3" /> Locked month</Badge> : <Badge tone="emerald">Open month</Badge>} />
          </div>
          <p className="text-sm text-gray-700">{entry.memo}</p>
          {entry.posted_from_locked && entry.original_date && (
            <div className="p-3 rounded-lg bg-amber-50 border border-amber-200 text-sm text-amber-800">
              This activity happened on {fmtDate(entry.original_date)}, which was already closed, so it was booked in the first open month instead.
            </div>
          )}
          <div className="border border-gray-200 rounded-lg overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50"><tr><Th>Account</Th><Th>Description</Th><Th right>Debit</Th><Th right>Credit</Th></tr></thead>
              <tbody className="divide-y divide-gray-100">
                {lines.map(l => {
                  const a = byId.get(l.account_id);
                  return (
                    <tr key={l.id}>
                      <Td>
                        <button className="text-left text-blue-700 hover:underline" onClick={() => { onClose(); go('accounts', { account: l.account_id }); }}>
                          {a ? `${a.code} · ${a.name}` : 'Unknown'}
                        </button>
                      </Td>
                      <Td className="text-gray-600">
                        {l.description}
                        {(l.companies?.name || l.acct_vendors?.name) && <span className="block text-xs text-gray-400">{l.companies?.name || l.acct_vendors?.name}</span>}
                      </Td>
                      <Td right>{Number(l.debit) ? <Money value={Number(l.debit)} /> : ''}</Td>
                      <Td right>{Number(l.credit) ? <Money value={Number(l.credit)} /> : ''}</Td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot className="bg-gray-50 font-semibold">
                <tr><Td>Total</Td><Td /><Td right><Money value={totalD} /></Td><Td right><Money value={totalC} /></Td></tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}
    </Modal>
  );
}

function Info({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <p className="text-xs text-gray-500">{label}</p>
      <div className="mt-0.5 font-medium text-gray-900">{value}</div>
    </div>
  );
}
