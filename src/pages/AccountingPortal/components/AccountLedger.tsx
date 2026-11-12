import { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, Search } from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import { usePortal } from '../lib/context';
import { errMsg, fetchAllRows, fetchTotals } from '../lib/api';
import { downloadCsv, fmtDate, naturalBalance, parseISO, presetRange, rangeLabel, sourceLabel, toISO, type DateRange } from '../lib/format';
import type { Account } from '../lib/types';
import { btnGhost, Card, DateRangeBar, ErrorBanner, inputCls, Loading, Money, PageHeader, ReportActions, Td, Th } from './ui';

interface LedgerRow {
  id: string;
  debit: number;
  credit: number;
  description: string | null;
  entry_id: string;
  companies: { name: string } | null;
  acct_vendors: { name: string } | null;
  acct_entries: { entry_date: string; entry_number: number; memo: string; source_type: string; source_ref: string | null };
}

export default function AccountLedger({ account, onBack, initialRange }: { account: Account; onBack?: () => void; initialRange?: DateRange }) {
  const { openEntry, refreshKey } = usePortal();
  const [range, setRange] = useState<DateRange>(initialRange ?? presetRange('this_year'));
  const [rows, setRows] = useState<LedgerRow[] | null>(null);
  const [opening, setOpening] = useState(0);
  const [q, setQ] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    setRows(null);
    (async () => {
      try {
        const dayBefore = toISO(new Date(parseISO(range.from).getTime() - 86400000));
        const pnl = ['income', 'cogs', 'expense'].includes(account.type);
        const openFrom = pnl ? `${range.from.slice(0, 4)}-01-01` : null;
        const [tot, data] = await Promise.all([
          openFrom && openFrom > dayBefore ? Promise.resolve(new Map()) : fetchTotals(openFrom, dayBefore),
          fetchAllRows<LedgerRow>((f, t) => supabase
            .from('acct_entry_lines')
            .select('id, debit, credit, description, entry_id, companies(name), acct_vendors(name), acct_entries!inner(entry_date, entry_number, memo, source_type, source_ref)')
            .eq('account_id', account.id)
            .gte('acct_entries.entry_date', range.from)
            .lte('acct_entries.entry_date', range.to)
            .order('id')
            .range(f, t) as unknown as PromiseLike<{ data: LedgerRow[] | null; error: unknown }>),
        ]);
        const o = tot.get(account.id);
        setOpening(o ? naturalBalance(account.type, o.debit, o.credit) : 0);
        data.sort((a, b) => a.acct_entries.entry_date.localeCompare(b.acct_entries.entry_date) || a.acct_entries.entry_number - b.acct_entries.entry_number);
        setRows(data);
      } catch (e) {
        setError(errMsg(e));
      }
    })();
  }, [account, range, refreshKey]);

  const withBalance = useMemo(() => {
    let run = opening;
    return (rows ?? []).map(r => {
      run += naturalBalance(account.type, Number(r.debit), Number(r.credit));
      return { ...r, balance: run };
    });
  }, [rows, opening, account.type]);

  const visible = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return withBalance;
    return withBalance.filter(r =>
      [r.acct_entries.memo, r.description, r.acct_entries.source_ref, r.companies?.name, r.acct_vendors?.name]
        .some(v => v?.toLowerCase().includes(s)));
  }, [withBalance, q]);

  const totalD = withBalance.reduce((s, r) => s + Number(r.debit), 0);
  const totalC = withBalance.reduce((s, r) => s + Number(r.credit), 0);
  const ending = withBalance.length ? withBalance[withBalance.length - 1].balance : opening;

  const csv = () => downloadCsv(`${account.code}-${account.name}-${range.from}-${range.to}`, [
    ['Date', 'Entry', 'Type', 'Reference', 'Name', 'Memo', 'Debit', 'Credit', 'Balance'],
    ['', '', '', '', '', 'Beginning balance', '', '', opening.toFixed(2)],
    ...withBalance.map(r => [r.acct_entries.entry_date, r.acct_entries.entry_number, sourceLabel(r.acct_entries.source_type), r.acct_entries.source_ref, r.companies?.name ?? r.acct_vendors?.name, r.description || r.acct_entries.memo, Number(r.debit).toFixed(2), Number(r.credit).toFixed(2), r.balance.toFixed(2)]),
  ]);

  return (
    <div className="space-y-6">
      {onBack && <button onClick={onBack} className={`${btnGhost} no-print -ml-2`}><ArrowLeft className="w-4 h-4" /> Back</button>}
      <PageHeader title={`${account.code} · ${account.name}`} subtitle={`Account detail · ${rangeLabel(range)}`} actions={<ReportActions onCsv={csv} />} />
      <div className="flex flex-wrap items-center justify-between gap-3">
        <DateRangeBar range={range} onChange={setRange} />
        <div className="relative no-print">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input value={q} onChange={e => setQ(e.target.value)} placeholder="Search memo, name, reference" className={`${inputCls} pl-9 w-72`} />
        </div>
      </div>
      <ErrorBanner message={error} />
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[['Beginning balance', opening], ['Debits', totalD], ['Credits', totalC], ['Ending balance', ending]].map(([l, v]) => (
          <Card key={l as string} className="p-4">
            <p className="text-xs text-gray-500">{l}</p>
            <p className="mt-1 text-lg font-semibold text-gray-900"><Money value={v as number} /></p>
          </Card>
        ))}
      </div>
      <Card className="overflow-hidden">
        {!rows ? <Loading /> : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr><Th>Date</Th><Th>Type</Th><Th>Ref</Th><Th>Name</Th><Th>Memo</Th><Th right>Debit</Th><Th right>Credit</Th><Th right>Balance</Th></tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                <tr className="bg-gray-50/50"><Td className="text-gray-500">{fmtDate(range.from)}</Td><Td /><Td /><Td /><Td className="font-medium text-gray-700">Beginning balance</Td><Td /><Td /><Td right className="font-medium"><Money value={opening} /></Td></tr>
                {visible.map(r => (
                  <tr key={r.id} onClick={() => openEntry(r.entry_id)} className="hover:bg-blue-50/50 cursor-pointer transition">
                    <Td className="whitespace-nowrap text-gray-600">{fmtDate(r.acct_entries.entry_date)}</Td>
                    <Td className="whitespace-nowrap text-gray-600">{sourceLabel(r.acct_entries.source_type)}</Td>
                    <Td className="whitespace-nowrap text-gray-500">{r.acct_entries.source_ref}</Td>
                    <Td className="text-gray-900">{r.companies?.name ?? r.acct_vendors?.name ?? ''}</Td>
                    <Td className="text-gray-600 max-w-xs truncate">{r.description || r.acct_entries.memo}</Td>
                    <Td right>{Number(r.debit) ? <Money value={Number(r.debit)} /> : ''}</Td>
                    <Td right>{Number(r.credit) ? <Money value={Number(r.credit)} /> : ''}</Td>
                    <Td right className="font-medium text-gray-900"><Money value={r.balance} /></Td>
                  </tr>
                ))}
                {visible.length === 0 && <tr><td colSpan={8} className="py-10 text-center text-sm text-gray-500">No activity in this period.</td></tr>}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
