import { useEffect, useState } from 'react';
import { AlertTriangle, ArrowLeft, Plus, Trash2 } from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import { usePortal } from '../lib/context';
import { errMsg } from '../lib/api';
import { money, round2, todayISO } from '../lib/format';
import { AccountSelect, btnDanger, btnGhost, btnPrimary, btnSecondary, Card, ErrorBanner, Field, inputCls, Loading, PageHeader } from './ui';

interface Line { key: string; account_id: string; description: string; debit: string; credit: string }

const blank = (): Line => ({ key: crypto.randomUUID(), account_id: '', description: '', debit: '', credit: '' });

export default function JournalEditor({ entryId, onDone }: { entryId: string | null; onDone: () => void }) {
  const { accounts, actor, notify, refresh } = usePortal();
  const [date, setDate] = useState(todayISO());
  const [memo, setMemo] = useState('');
  const [lines, setLines] = useState<Line[]>([blank(), blank()]);
  const [loading, setLoading] = useState(!!entryId);
  const [locked, setLocked] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!entryId) return;
    (async () => {
      const [e, l] = await Promise.all([
        supabase.from('acct_entries').select('entry_date, memo, source_type').eq('id', entryId).maybeSingle(),
        supabase.from('acct_entry_lines').select('*').eq('entry_id', entryId).order('sort_order'),
      ]);
      if (e.error || l.error || !e.data) { setError(errMsg(e.error || l.error || 'Entry not found.')); setLoading(false); return; }
      setDate(e.data.entry_date);
      setMemo(e.data.memo ?? '');
      setLines((l.data ?? []).map(x => ({
        key: x.id, account_id: x.account_id, description: x.description ?? '',
        debit: Number(x.debit) ? String(x.debit) : '', credit: Number(x.credit) ? String(x.credit) : '',
      })));
      setLoading(false);
    })();
  }, [entryId]);

  useEffect(() => {
    if (!date) return;
    supabase.rpc('acct_is_locked', { p_date: date }).then(({ data }) => setLocked(!!data));
  }, [date]);

  const totalD = round2(lines.reduce((s, l) => s + (Number(l.debit) || 0), 0));
  const totalC = round2(lines.reduce((s, l) => s + (Number(l.credit) || 0), 0));
  const diff = round2(totalD - totalC);
  const used = lines.filter(l => l.account_id && (Number(l.debit) || Number(l.credit)));
  const canSave = !locked && diff === 0 && totalD > 0 && used.length >= 2 && memo.trim().length > 0;

  const update = (key: string, patch: Partial<Line>) => setLines(ls => ls.map(l => (l.key === key ? { ...l, ...patch } : l)));

  const save = async () => {
    setSaving(true);
    setError('');
    const { error } = await supabase.rpc('acct_save_entry', {
      p_entry_id: entryId,
      p_date: date,
      p_memo: memo.trim(),
      p_lines: used.map(l => ({ account_id: l.account_id, debit: Number(l.debit) || 0, credit: Number(l.credit) || 0, description: l.description || null })),
      p_actor: actor,
    });
    setSaving(false);
    if (error) { setError(errMsg(error)); return; }
    notify(entryId ? 'Journal entry updated' : 'Journal entry saved');
    refresh();
    onDone();
  };

  const remove = async () => {
    if (!entryId || !confirm('Delete this journal entry? This cannot be undone.')) return;
    const { error } = await supabase.from('acct_entries').delete().eq('id', entryId).in('source_type', ['manual', 'recurring']);
    if (error) { setError(errMsg(error)); return; }
    notify('Journal entry deleted');
    refresh();
    onDone();
  };

  if (loading) return <Loading />;

  return (
    <div className="space-y-6 max-w-5xl">
      <button onClick={onDone} className={`${btnGhost} -ml-2`}><ArrowLeft className="w-4 h-4" /> Back to journal</button>
      <PageHeader title={entryId ? 'Edit journal entry' : 'New journal entry'} subtitle="Debits must equal credits before the entry can be saved." />
      <ErrorBanner message={error} onClose={() => setError('')} />
      {locked && (
        <div className="flex items-start gap-3 p-3 rounded-lg bg-amber-50 border border-amber-200 text-sm text-amber-800">
          <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
          This date falls in a locked month. Pick a date in an open month, or unlock the month from Month Close (a reason is required).
        </div>
      )}
      <Card className="p-5 space-y-5">
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
          <Field label="Date"><input type="date" className={inputCls} value={date} onChange={e => setDate(e.target.value)} /></Field>
          <div className="sm:col-span-3"><Field label="Memo"><input className={inputCls} value={memo} onChange={e => setMemo(e.target.value)} placeholder="What is this entry for?" /></Field></div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px]">
            <thead>
              <tr className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                <th className="text-left pb-2 w-[34%]">Account</th>
                <th className="text-left pb-2">Description</th>
                <th className="text-right pb-2 w-32">Debit</th>
                <th className="text-right pb-2 w-32">Credit</th>
                <th className="w-10" />
              </tr>
            </thead>
            <tbody>
              {lines.map(l => (
                <tr key={l.key}>
                  <td className="pr-2 py-1"><AccountSelect accounts={accounts} value={l.account_id} onChange={v => update(l.key, { account_id: v })} /></td>
                  <td className="pr-2 py-1"><input className={inputCls} value={l.description} onChange={e => update(l.key, { description: e.target.value })} /></td>
                  <td className="pr-2 py-1"><input inputMode="decimal" className={`${inputCls} text-right`} value={l.debit} onChange={e => update(l.key, { debit: e.target.value.replace(/[^\d.]/g, ''), credit: e.target.value ? '' : l.credit })} /></td>
                  <td className="pr-2 py-1"><input inputMode="decimal" className={`${inputCls} text-right`} value={l.credit} onChange={e => update(l.key, { credit: e.target.value.replace(/[^\d.]/g, ''), debit: e.target.value ? '' : l.debit })} /></td>
                  <td className="py-1 text-center">
                    <button disabled={lines.length <= 2} onClick={() => setLines(ls => ls.filter(x => x.key !== l.key))} className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 disabled:opacity-30 transition"><Trash2 className="w-4 h-4" /></button>
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t border-gray-200">
                <td className="pt-3"><button onClick={() => setLines(ls => [...ls, blank()])} className={btnGhost}><Plus className="w-4 h-4" /> Add line</button></td>
                <td className="pt-3 text-right text-sm text-gray-500 pr-2">Totals</td>
                <td className="pt-3 text-right text-sm font-semibold text-gray-900 pr-2 tabular-nums">{money(totalD)}</td>
                <td className="pt-3 text-right text-sm font-semibold text-gray-900 pr-2 tabular-nums">{money(totalC)}</td>
                <td />
              </tr>
            </tfoot>
          </table>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
          <span className={`text-sm font-medium ${diff === 0 && totalD > 0 ? 'text-emerald-600' : 'text-amber-600'}`}>
            {totalD === 0 ? 'Enter amounts to begin' : diff === 0 ? 'Balanced' : `Out of balance by ${money(Math.abs(diff))}`}
          </span>
          <div className="flex gap-2">
            {entryId && !locked && <button className={btnDanger} onClick={remove}><Trash2 className="w-4 h-4" /> Delete</button>}
            <button className={btnSecondary} onClick={onDone}>Cancel</button>
            <button className={btnPrimary} disabled={!canSave || saving} onClick={save}>{saving ? 'Saving...' : 'Save entry'}</button>
          </div>
        </div>
      </Card>
    </div>
  );
}
