import { useCallback, useEffect, useState } from 'react';
import { BookOpen, Lock, Plus, Repeat, Search } from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import { usePortal } from '../lib/context';
import { errMsg } from '../lib/api';
import { downloadCsv, fmtDate, money, presetRange, sourceLabel, SOURCE_LABELS, type DateRange } from '../lib/format';
import type { Entry } from '../lib/types';
import JournalEditor from '../components/JournalEditor';
import { Badge, btnPrimary, btnSecondary, Card, DateRangeBar, EmptyState, ErrorBanner, inputCls, Loading, PageHeader, Tabs, Td, Th } from '../components/ui';

type Row = Entry & { companies: { name: string } | null; acct_vendors: { name: string } | null; acct_entry_lines: { debit: number }[] };
interface Recurring { id: string; name: string; memo: string; day_of_month: number; next_date: string; is_active: boolean; last_posted: string | null; lines: { a: string; d?: number; c?: number }[] }

const PAGE = 100;

export default function Journal() {
  const { params, go, openEntry, refreshKey, notify } = usePortal();
  const [tab, setTab] = useState<'entries' | 'recurring'>(params.tab === 'recurring' ? 'recurring' : 'entries');
  const [range, setRange] = useState<DateRange>(presetRange('this_month'));
  const [type, setType] = useState('');
  const [q, setQ] = useState('');
  const [rows, setRows] = useState<Row[] | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [recurring, setRecurring] = useState<Recurring[] | null>(null);
  const [error, setError] = useState('');

  const load = useCallback(async (offset: number) => {
    let query = supabase
      .from('acct_entries')
      .select('*, companies(name), acct_vendors(name), acct_entry_lines(debit)')
      .gte('entry_date', range.from)
      .lte('entry_date', range.to)
      .order('entry_date', { ascending: false })
      .order('entry_number', { ascending: false })
      .range(offset, offset + PAGE - 1);
    if (type) query = query.eq('source_type', type);
    const s = q.trim();
    if (s) {
      const safe = s.replace(/[%,()]/g, ' ');
      query = query.or(`memo.ilike.%${safe}%,source_ref.ilike.%${safe}%`);
    }
    const { data, error } = await query;
    if (error) { setError(errMsg(error)); return; }
    const list = (data ?? []) as Row[];
    setRows(prev => (offset === 0 ? list : [...(prev ?? []), ...list]));
    setHasMore(list.length === PAGE);
  }, [range, type, q]);

  useEffect(() => {
    if (tab !== 'entries') return;
    setRows(null);
    const t = setTimeout(() => load(0), q ? 250 : 0);
    return () => clearTimeout(t);
  }, [load, tab, refreshKey, q]);

  useEffect(() => {
    if (tab !== 'recurring') return;
    supabase.from('acct_recurring').select('*').order('name').then(({ data, error }) => {
      if (error) setError(errMsg(error));
      else setRecurring((data ?? []) as Recurring[]);
    });
  }, [tab, refreshKey]);

  if (params.edit) return <JournalEditor entryId={params.edit === 'new' ? null : params.edit} onDone={() => go('journal')} />;

  const toggleRecurring = async (r: Recurring) => {
    const { error } = await supabase.from('acct_recurring').update({ is_active: !r.is_active }).eq('id', r.id);
    if (error) { setError(errMsg(error)); return; }
    setRecurring(list => list?.map(x => (x.id === r.id ? { ...x, is_active: !r.is_active } : x)) ?? null);
    notify(r.is_active ? 'Repeating entry paused' : 'Repeating entry resumed');
  };

  const amount = (r: Row) => r.acct_entry_lines.reduce((s, l) => s + Number(l.debit), 0);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Journal"
        subtitle="Every entry in the books, whether WorkHorse made it automatically or someone entered it by hand."
        actions={<>
          {tab === 'entries' && rows && <button className={btnSecondary} onClick={() => downloadCsv(`journal-${range.from}-${range.to}`, [['Date', 'Entry', 'Type', 'Reference', 'Name', 'Memo', 'Amount'], ...rows.map(r => [r.entry_date, r.entry_number, sourceLabel(r.source_type), r.source_ref, r.companies?.name ?? r.acct_vendors?.name, r.memo, amount(r).toFixed(2)])])}>Export CSV</button>}
          <button className={btnPrimary} onClick={() => go('journal', { edit: 'new' })}><Plus className="w-4 h-4" /> New journal entry</button>
        </>}
      />
      <Tabs value={tab} onChange={setTab} tabs={[{ id: 'entries', label: 'Entries' }, { id: 'recurring', label: 'Repeating entries' }]} />
      <ErrorBanner message={error} onClose={() => setError('')} />

      {tab === 'entries' && (
        <>
          <div className="flex flex-wrap items-center gap-3">
            <DateRangeBar range={range} onChange={setRange} />
            <select value={type} onChange={e => setType(e.target.value)} className={`${inputCls} w-auto no-print`}>
              <option value="">All types</option>
              {Object.entries(SOURCE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
            <div className="relative no-print">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input value={q} onChange={e => setQ(e.target.value)} placeholder="Search memo or reference" className={`${inputCls} pl-9 w-64`} />
            </div>
          </div>
          <Card className="overflow-hidden">
            {!rows ? <Loading /> : rows.length === 0 ? (
              <EmptyState icon={<BookOpen className="w-5 h-5" />} title="No entries found" message="Try a different date range or type." />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b border-gray-200"><tr><Th>Date</Th><Th>#</Th><Th>Type</Th><Th>Ref</Th><Th>Name</Th><Th>Memo</Th><Th right>Amount</Th></tr></thead>
                  <tbody className="divide-y divide-gray-100">
                    {rows.map(r => (
                      <tr key={r.id} onClick={() => openEntry(r.id)} className="hover:bg-blue-50/50 cursor-pointer transition">
                        <Td className="whitespace-nowrap text-gray-600">{fmtDate(r.entry_date)}</Td>
                        <Td className="text-gray-400 font-mono text-xs">{r.entry_number}</Td>
                        <Td className="whitespace-nowrap">
                          <Badge tone={r.source_type === 'manual' ? 'blue' : 'gray'}>{sourceLabel(r.source_type)}</Badge>
                          {r.posted_from_locked && <span className="ml-1.5 inline-flex" title="Moved from a locked month"><Lock className="w-3 h-3 text-amber-500" /></span>}
                        </Td>
                        <Td className="whitespace-nowrap text-gray-500">{r.source_ref}</Td>
                        <Td className="text-gray-900">{r.companies?.name ?? r.acct_vendors?.name ?? ''}</Td>
                        <Td className="text-gray-600 max-w-sm truncate">{r.memo}</Td>
                        <Td right className="font-medium text-gray-900">{money(amount(r))}</Td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {hasMore && (
                  <div className="p-4 text-center border-t border-gray-100 no-print">
                    <button className={btnSecondary} onClick={() => load(rows.length)}>Load more</button>
                  </div>
                )}
              </div>
            )}
          </Card>
        </>
      )}

      {tab === 'recurring' && (
        <Card className="overflow-hidden">
          {!recurring ? <Loading /> : recurring.length === 0 ? (
            <EmptyState icon={<Repeat className="w-5 h-5" />} title="No repeating entries" />
          ) : (
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200"><tr><Th>Name</Th><Th>Schedule</Th><Th>Next</Th><Th>Last posted</Th><Th right>Amount</Th><Th right>Status</Th></tr></thead>
              <tbody className="divide-y divide-gray-100">
                {recurring.map(r => (
                  <tr key={r.id}>
                    <Td><p className="font-medium text-gray-900">{r.name}</p><p className="text-xs text-gray-500">{r.memo}</p></Td>
                    <Td className="text-gray-600">Monthly on day {r.day_of_month}</Td>
                    <Td className="text-gray-600">{fmtDate(r.next_date)}</Td>
                    <Td className="text-gray-600">{r.last_posted ? fmtDate(r.last_posted) : '-'}</Td>
                    <Td right>{money((r.lines ?? []).reduce((s, l) => s + Number(l.d ?? 0), 0))}</Td>
                    <Td right>
                      <button onClick={() => toggleRecurring(r)} className={`relative inline-flex h-5 w-9 rounded-full transition ${r.is_active ? 'bg-blue-600' : 'bg-gray-300'}`} aria-label="Toggle">
                        <span className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-all ${r.is_active ? 'left-[18px]' : 'left-0.5'}`} />
                      </button>
                    </Td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Card>
      )}
    </div>
  );
}
