import { Fragment, useEffect, useMemo, useState } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { supabase } from '../../../../lib/supabase';
import { usePortal } from '../../lib/context';
import { errMsg, fetchAllRows } from '../../lib/api';
import { daysBetween, downloadCsv, fmtDate, money, todayISO } from '../../lib/format';
import { Badge, btnDanger, btnSecondary, ErrorBanner, Field, inputCls, Loading, Modal, Tabs } from '../../components/ui';
import { ReportFrame, type ReportProps } from './ReportFrame';

interface OpenInvoice { id: string; invoice_number: string; invoice_date: string; due_date: string | null; total: number; balance_due: number; status: string; company_id: string; companies: { name: string } | null }
const BUCKETS = ['Current', '1-30', '31-60', '61-90', 'Over 90'] as const;
const bucketOf = (days: number) => (days <= 0 ? 0 : days <= 30 ? 1 : days <= 60 ? 2 : days <= 90 ? 3 : 4);

export function Aging({ onBack }: ReportProps) {
  const { onOpenInvoice, onViewCustomer, refreshKey, refresh, notify } = usePortal();
  const [rows, setRows] = useState<OpenInvoice[] | null>(null);
  const [open, setOpen] = useState<Set<string>>(new Set());
  const [view, setView] = useState<'summary' | 'detail'>('summary');
  const [writeOff, setWriteOff] = useState<OpenInvoice | null>(null);
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const today = todayISO();

  useEffect(() => {
    setRows(null);
    fetchAllRows<OpenInvoice>((f, t) => supabase
      .from('invoices')
      .select('id, invoice_number, invoice_date, due_date, total, balance_due, status, company_id, companies(name)')
      .gt('balance_due', 0.004)
      .not('status', 'in', '(void,written_off,draft)')
      .order('due_date')
      .range(f, t) as unknown as PromiseLike<{ data: OpenInvoice[] | null; error: unknown }>)
      .then(setRows).catch(e => setError(errMsg(e)));
  }, [refreshKey]);

  const groups = useMemo(() => {
    const m = new Map<string, { id: string; name: string; buckets: number[]; total: number; invoices: (OpenInvoice & { days: number })[] }>();
    for (const r of rows ?? []) {
      const days = r.due_date ? daysBetween(r.due_date, today) : 0;
      const g = m.get(r.company_id) ?? { id: r.company_id, name: r.companies?.name ?? 'Unknown customer', buckets: [0, 0, 0, 0, 0], total: 0, invoices: [] };
      g.buckets[bucketOf(days)] += Number(r.balance_due);
      g.total += Number(r.balance_due);
      g.invoices.push({ ...r, days });
      m.set(r.company_id, g);
    }
    return [...m.values()].sort((a, b) => b.buckets[4] - a.buckets[4] || b.total - a.total);
  }, [rows, today]);

  const totals = groups.reduce((s, g) => s.map((v, i) => v + g.buckets[i]), [0, 0, 0, 0, 0]);
  const grand = totals.reduce((a, b) => a + b, 0);

  const doWriteOff = async () => {
    if (!writeOff || !reason.trim()) return;
    setBusy(true);
    const { error } = await supabase.rpc('acct_write_off_invoice', { p_invoice_id: writeOff.id, p_reason: reason.trim(), p_date: today });
    setBusy(false);
    if (error) { setError(errMsg(error)); return; }
    notify(`${writeOff.invoice_number} written off as bad debt`);
    setWriteOff(null); setReason('');
    refresh();
  };

  return (
    <ReportFrame
      title="Overdue Balances (Receivables Aging)"
      period={`As of ${fmtDate(today)}`}
      onBack={onBack}
      controls={<Tabs value={view} onChange={setView} tabs={[{ id: 'summary', label: 'By customer' }, { id: 'detail', label: 'Every invoice' }]} />}
      onCsv={rows ? () => downloadCsv(`receivables-aging-${today}`, [
        ['Customer', 'Invoice', 'Invoice date', 'Due date', 'Days past due', 'Balance', ...BUCKETS],
        ...groups.flatMap(g => g.invoices.map(i => [g.name, i.invoice_number, i.invoice_date, i.due_date, Math.max(0, i.days), Number(i.balance_due).toFixed(2), ...BUCKETS.map((_, b) => (bucketOf(i.days) === b ? Number(i.balance_due).toFixed(2) : ''))])),
      ]) : undefined}
      note="Days past due are counted from each invoice's due date. Write-offs post to Bad Debt and close the invoice."
    >
      <ErrorBanner message={error} onClose={() => setError('')} />
      {!rows ? <Loading /> : (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead><tr className="border-b border-gray-200 text-xs font-semibold uppercase tracking-wide text-gray-500">
              <th className="text-left px-6 py-2.5">Customer</th>
              {BUCKETS.map(b => <th key={b} className="text-right px-4 py-2.5 whitespace-nowrap">{b}</th>)}
              <th className="text-right px-6 py-2.5">Total</th>
            </tr></thead>
            <tbody className="divide-y divide-gray-50">
              {groups.map(g => {
                const expanded = view === 'detail' || open.has(g.id);
                return (
                  <Fragment key={g.id}>
                    <tr className="hover:bg-gray-50">
                      <td className="px-6 py-2 text-sm">
                        <div className="flex items-center gap-1.5">
                          <button className="text-gray-400 hover:text-gray-700 no-print" onClick={() => setOpen(s => { const n = new Set(s); if (n.has(g.id)) n.delete(g.id); else n.add(g.id); return n; })}>
                            {expanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                          </button>
                          <button onClick={() => onViewCustomer(g.id)} className="font-medium text-gray-900 hover:text-blue-700 hover:underline text-left">{g.name}</button>
                          <span className="text-xs text-gray-400">{g.invoices.length}</span>
                        </div>
                      </td>
                      {g.buckets.map((v, i) => <td key={i} className={`px-4 py-2 text-sm text-right tabular-nums ${i === 4 && v ? 'text-red-600 font-medium' : 'text-gray-700'}`}>{v ? money(v) : ''}</td>)}
                      <td className="px-6 py-2 text-sm text-right tabular-nums font-semibold text-gray-900">{money(g.total)}</td>
                    </tr>
                    {expanded && g.invoices.map(i => (
                      <tr key={i.id} className="bg-gray-50/60 text-sm">
                        <td className="pl-14 pr-4 py-1.5">
                          <button onClick={() => onOpenInvoice(i.id)} className="text-blue-700 hover:underline">{i.invoice_number}</button>
                          <span className="ml-2 text-xs text-gray-500">due {fmtDate(i.due_date)}</span>
                          {i.days > 0 && <span className="ml-2"><Badge tone={i.days > 90 ? 'red' : i.days > 30 ? 'amber' : 'gray'}>{i.days} days late</Badge></span>}
                          {i.days > 60 && <button onClick={() => setWriteOff(i)} className="ml-2 text-xs text-red-600 hover:underline no-print">Write off</button>}
                        </td>
                        {BUCKETS.map((_, b) => <td key={b} className="px-4 py-1.5 text-right tabular-nums text-gray-600">{bucketOf(i.days) === b ? money(Number(i.balance_due)) : ''}</td>)}
                        <td className="px-6 py-1.5" />
                      </tr>
                    ))}
                  </Fragment>
                );
              })}
            </tbody>
            <tfoot><tr className="bg-gray-50 text-sm font-bold">
              <td className="px-6 py-2.5">Total</td>
              {totals.map((v, i) => <td key={i} className="px-4 py-2.5 text-right tabular-nums">{money(v)}</td>)}
              <td className="px-6 py-2.5 text-right tabular-nums">{money(grand)}</td>
            </tr></tfoot>
          </table>
        </div>
      )}
      <Modal
        open={!!writeOff}
        onClose={() => setWriteOff(null)}
        size="sm"
        title={`Write off ${writeOff?.invoice_number ?? ''}`}
        subtitle={writeOff ? `${money(Number(writeOff.balance_due))} owed by ${writeOff.companies?.name ?? 'customer'}` : undefined}
        footer={<><button className={btnSecondary} onClick={() => setWriteOff(null)}>Cancel</button><button className={btnDanger} disabled={!reason.trim() || busy} onClick={doWriteOff}>{busy ? 'Writing off...' : 'Write off balance'}</button></>}
      >
        <Field label="Reason (saved to the audit trail)"><textarea rows={3} className={inputCls} value={reason} onChange={e => setReason(e.target.value)} placeholder="Customer went out of business, sent to collections..." /></Field>
      </Modal>
    </ReportFrame>
  );
}
