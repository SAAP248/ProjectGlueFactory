import { useEffect, useMemo, useState } from 'react';
import { Search } from 'lucide-react';
import { supabase } from '../../../../lib/supabase';
import { usePortal } from '../../lib/context';
import { errMsg, fetchAllRows } from '../../lib/api';
import { downloadCsv, fmtDate, money, presetRange, rangeLabel, sourceLabel, type DateRange } from '../../lib/format';
import { Badge, DateRangeBar, ErrorBanner, inputCls, Loading } from '../../components/ui';
import { initialRange, ReportFrame, type ReportProps } from './ReportFrame';

interface JRow {
  id: string; entry_number: number; entry_date: string; memo: string; source_type: string; source_ref: string | null;
  acct_entry_lines: { id: string; account_id: string; debit: number; credit: number; description: string | null; sort_order: number }[];
}

export function JournalReport({ onBack, params }: ReportProps) {
  const { byId, openEntry, refreshKey } = usePortal();
  const [range, setRange] = useState<DateRange>(params.from ? initialRange(params) : presetRange('this_month'));
  const [rows, setRows] = useState<JRow[] | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    setRows(null);
    fetchAllRows<JRow>((f, t) => supabase
      .from('acct_entries')
      .select('id, entry_number, entry_date, memo, source_type, source_ref, acct_entry_lines(id, account_id, debit, credit, description, sort_order)')
      .gte('entry_date', range.from).lte('entry_date', range.to)
      .order('entry_date').order('entry_number')
      .range(f, t) as unknown as PromiseLike<{ data: JRow[] | null; error: unknown }>)
      .then(setRows).catch(e => setError(errMsg(e)));
  }, [range, refreshKey]);

  const totals = useMemo(() => (rows ?? []).flatMap(r => r.acct_entry_lines).reduce((s, l) => ({ d: s.d + Number(l.debit), c: s.c + Number(l.credit) }), { d: 0, c: 0 }), [rows]);
  const acct = (id: string) => { const a = byId.get(id); return a ? `${a.code} ${a.name}` : ''; };

  return (
    <ReportFrame
      title="Journal"
      period={rangeLabel(range)}
      onBack={onBack}
      controls={<DateRangeBar range={range} onChange={setRange} />}
      onCsv={rows ? () => downloadCsv(`journal-${range.from}-${range.to}`, [
        ['Date', 'Entry', 'Type', 'Reference', 'Memo', 'Account', 'Line description', 'Debit', 'Credit'],
        ...rows.flatMap(r => [...r.acct_entry_lines].sort((a, b) => a.sort_order - b.sort_order).map(l => [r.entry_date, r.entry_number, sourceLabel(r.source_type), r.source_ref, r.memo, acct(l.account_id), l.description, Number(l.debit).toFixed(2), Number(l.credit).toFixed(2)])),
      ]) : undefined}
      note={rows && `${rows.length} entries · ${money(totals.d)} debits · ${money(totals.c)} credits`}
    >
      <ErrorBanner message={error} />
      {!rows ? <Loading /> : (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead><tr className="border-b border-gray-200 text-xs font-semibold uppercase tracking-wide text-gray-500">
              <th className="text-left px-6 py-2.5">Date</th><th className="text-left px-4 py-2.5">Entry</th><th className="text-left px-4 py-2.5">Account</th><th className="text-left px-4 py-2.5">Description</th><th className="text-right px-4 py-2.5">Debit</th><th className="text-right px-6 py-2.5">Credit</th>
            </tr></thead>
            <tbody>
              {rows.map(r => {
                const lines = [...r.acct_entry_lines].sort((a, b) => a.sort_order - b.sort_order);
                return lines.map((l, i) => (
                  <tr key={l.id} onClick={() => openEntry(r.id)} className={`cursor-pointer hover:bg-blue-50/40 ${i === lines.length - 1 ? 'border-b border-gray-100' : ''}`}>
                    <td className="px-6 py-1.5 text-sm text-gray-600 whitespace-nowrap align-top">{i === 0 ? fmtDate(r.entry_date) : ''}</td>
                    <td className="px-4 py-1.5 text-sm align-top">{i === 0 && <><span className="font-mono text-xs text-gray-400">#{r.entry_number}</span> <span className="text-gray-700">{sourceLabel(r.source_type)}</span>{r.source_ref && <span className="block text-xs text-gray-400">{r.source_ref}</span>}</>}</td>
                    <td className={`px-4 py-1.5 text-sm text-gray-800 whitespace-nowrap ${Number(l.credit) ? 'pl-10' : ''}`}>{acct(l.account_id)}</td>
                    <td className="px-4 py-1.5 text-sm text-gray-500 max-w-xs truncate">{l.description || (i === 0 ? r.memo : '')}</td>
                    <td className="px-4 py-1.5 text-sm text-right tabular-nums">{Number(l.debit) ? money(Number(l.debit)) : ''}</td>
                    <td className="px-6 py-1.5 text-sm text-right tabular-nums">{Number(l.credit) ? money(Number(l.credit)) : ''}</td>
                  </tr>
                ));
              })}
              {rows.length === 0 && <tr><td colSpan={6} className="py-10 text-center text-sm text-gray-500">No entries in this period.</td></tr>}
            </tbody>
          </table>
        </div>
      )}
    </ReportFrame>
  );
}

interface AuditItem { id: string; at: string; kind: string; what: string; summary: string; actor: string; tone: 'gray' | 'blue' | 'amber' | 'red' | 'emerald' }

const ACTION_TONE: Record<string, AuditItem['tone']> = { created: 'emerald', updated: 'blue', deleted: 'red', unlocked: 'amber', locked: 'gray', year_closed: 'gray', reset: 'amber' };

export function AuditTrail({ onBack, params }: ReportProps) {
  const { refreshKey } = usePortal();
  const [range, setRange] = useState<DateRange>(initialRange(params, 'this_year'));
  const [items, setItems] = useState<AuditItem[] | null>(null);
  const [q, setQ] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    setItems(null);
    const from = `${range.from}T00:00:00`;
    const to = `${range.to}T23:59:59`;
    Promise.all([
      supabase.from('acct_audit_log').select('*').gte('at', from).lte('at', to).order('at', { ascending: false }).limit(2000),
      supabase.from('acct_period_events').select('*').gte('created_at', from).lte('created_at', to).order('created_at', { ascending: false }),
    ]).then(([a, p]) => {
      if (a.error || p.error) { setError(errMsg(a.error || p.error)); return; }
      const list: AuditItem[] = [
        ...(a.data ?? []).filter(r => r.object_type !== 'period').map(r => ({ id: r.id, at: r.at, kind: r.action, what: String(r.object_type ?? '').replace(/_/g, ' '), summary: r.summary ?? '', actor: r.actor ?? '', tone: ACTION_TONE[r.action] ?? 'gray' })),
        ...(p.data ?? []).map(r => ({
          id: r.id, at: r.created_at, kind: r.action, what: 'month',
          summary: `${new Date(`${r.period_start}T12:00:00`).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })} ${r.action === 'year_closed' ? 'year closed' : r.action}${r.reason ? ` - "${r.reason}"` : ''}`,
          actor: r.actor ?? '', tone: ACTION_TONE[r.action] ?? 'gray',
        })),
      ].sort((x, y) => y.at.localeCompare(x.at));
      setItems(list);
    });
  }, [range, refreshKey]);

  const visible = useMemo(() => {
    const s = q.trim().toLowerCase();
    return (items ?? []).filter(i => !s || `${i.summary} ${i.actor} ${i.what} ${i.kind}`.toLowerCase().includes(s));
  }, [items, q]);

  return (
    <ReportFrame
      title="Audit Trail"
      period={rangeLabel(range)}
      onBack={onBack}
      controls={<>
        <DateRangeBar range={range} onChange={setRange} />
        <div className="relative"><Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" /><input value={q} onChange={e => setQ(e.target.value)} placeholder="Search activity or person" className={`${inputCls} pl-9 w-64`} /></div>
      </>}
      onCsv={items ? () => downloadCsv(`audit-trail-${range.from}-${range.to}`, [['When', 'Action', 'Item', 'Details', 'Person'], ...visible.map(i => [new Date(i.at).toLocaleString(), i.kind, i.what, i.summary, i.actor])]) : undefined}
      note="Every change to the books is recorded here, including who unlocked a month and why."
    >
      <ErrorBanner message={error} />
      {!items ? <Loading /> : (
        <table className="w-full">
          <thead><tr className="border-b border-gray-200 text-xs font-semibold uppercase tracking-wide text-gray-500">
            <th className="text-left px-6 py-2.5">When</th><th className="text-left px-4 py-2.5">Action</th><th className="text-left px-4 py-2.5">Details</th><th className="text-left px-6 py-2.5">Person</th>
          </tr></thead>
          <tbody className="divide-y divide-gray-50">
            {visible.map(i => (
              <tr key={i.id}>
                <td className="px-6 py-2 text-sm text-gray-600 whitespace-nowrap">{new Date(i.at).toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' })}</td>
                <td className="px-4 py-2 text-sm whitespace-nowrap"><Badge tone={i.tone}>{i.kind.replace(/_/g, ' ')}</Badge> <span className="text-xs text-gray-400 ml-1">{i.what}</span></td>
                <td className="px-4 py-2 text-sm text-gray-700">{i.summary}</td>
                <td className="px-6 py-2 text-sm text-gray-600">{i.actor}</td>
              </tr>
            ))}
            {visible.length === 0 && <tr><td colSpan={4} className="py-10 text-center text-sm text-gray-500">No activity recorded in this period.</td></tr>}
          </tbody>
        </table>
      )}
    </ReportFrame>
  );
}
