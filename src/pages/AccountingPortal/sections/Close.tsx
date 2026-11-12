import { useCallback, useEffect, useMemo, useState } from 'react';
import { ArrowRight, CalendarCheck, Check, History, Lock, Unlock } from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import { usePortal, type Section } from '../lib/context';
import { errMsg } from '../lib/api';
import { fmtDate, monthLabel, todayISO } from '../lib/format';
import type { Period, PeriodEvent } from '../lib/types';
import { Badge, btnDanger, btnPrimary, btnSecondary, Card, CardHeader, ErrorBanner, Field, inputCls, Loading, Modal, PageHeader } from '../components/ui';

const CHECKLIST: { key: string; label: string; hint: string; section: Section; params?: Record<string, string> }[] = [
  { key: 'bank_review', label: 'Review every bank and card transaction', hint: 'Nothing left waiting in the bank feed', section: 'banking' },
  { key: 'deposits', label: 'Deposit all customer payments', hint: 'Undeposited funds is empty for the month', section: 'banking', params: { tab: 'deposits' } },
  { key: 'reconcile', label: 'Match bank statements', hint: 'Operating, payroll, savings and the Amex card', section: 'banking', params: { tab: 'reconcile' } },
  { key: 'bills', label: 'Enter all vendor bills', hint: 'Every bill dated this month is in Payables', section: 'payables', params: { tab: 'bills' } },
  { key: 'sales_tax', label: 'File Florida sales tax', hint: 'DR-15 due by the 20th of next month', section: 'tax' },
  { key: 'adjustments', label: 'Post adjusting entries', hint: 'Depreciation, prepaid insurance, accruals', section: 'journal' },
  { key: 'review', label: 'Review Profit & Loss and Balance Sheet', hint: 'Compare to last month and budget', section: 'reports', params: { report: 'pl' } },
];

const EVENT_TONE: Record<string, 'emerald' | 'amber' | 'blue'> = { locked: 'emerald', unlocked: 'amber', year_closed: 'blue' };
const EVENT_LABEL: Record<string, string> = { locked: 'Locked', unlocked: 'Unlocked', year_closed: 'Year closed' };

export default function Close() {
  const { go, actor, refreshKey, refresh, notify } = usePortal();
  const [periods, setPeriods] = useState<Period[] | null>(null);
  const [events, setEvents] = useState<PeriodEvent[]>([]);
  const [selected, setSelected] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [unlocking, setUnlocking] = useState(false);
  const [reason, setReason] = useState('');
  const [yearOpen, setYearOpen] = useState(false);

  const load = useCallback(async () => {
    const [p, e] = await Promise.all([
      supabase.from('acct_periods').select('*').lte('period_start', todayISO()).order('period_start', { ascending: false }),
      supabase.from('acct_period_events').select('*').order('created_at', { ascending: false }).limit(100),
    ]);
    if (p.error || e.error) { setError(errMsg(p.error ?? e.error)); return; }
    const list = (p.data ?? []) as Period[];
    setPeriods(list);
    setEvents((e.data ?? []) as PeriodEvent[]);
    setSelected(s => s || list.find(x => x.status === 'open' && x.period_start < todayISO().slice(0, 7) + '-01')?.period_start || list[0]?.period_start || '');
  }, []);

  useEffect(() => { load(); }, [load, refreshKey]);

  const period = periods?.find(p => p.period_start === selected);
  const years = useMemo(() => [...new Set((periods ?? []).map(p => Number(p.period_start.slice(0, 4))))], [periods]);
  const lastYear = new Date().getFullYear() - 1;
  const lastYearOpen = (periods ?? []).filter(p => p.period_start.startsWith(String(lastYear)) && p.status === 'open').length;

  async function toggle(key: string) {
    if (!period) return;
    const checklist = { ...period.checklist, [key]: !period.checklist?.[key] };
    setPeriods(ps => ps?.map(p => (p.period_start === period.period_start ? { ...p, checklist } : p)) ?? null);
    const { error } = await supabase.from('acct_periods').update({ checklist }).eq('period_start', period.period_start);
    if (error) { setError(errMsg(error)); load(); }
  }

  async function setStatus(status: 'open' | 'locked', why: string) {
    if (!period) return;
    setBusy(true);
    setError('');
    const { error } = await supabase.rpc('acct_set_period_status', { p_period: period.period_start, p_status: status, p_reason: why, p_actor: actor });
    setBusy(false);
    if (error) { setError(errMsg(error)); return; }
    setUnlocking(false);
    setReason('');
    notify(`${monthLabel(period.period_start, true)} ${status === 'locked' ? 'locked' : 'unlocked'}`);
    refresh();
  }

  async function closeYear() {
    setBusy(true);
    const { error } = await supabase.rpc('acct_close_year', { p_year: lastYear, p_actor: actor });
    setBusy(false);
    if (error) { setError(errMsg(error)); return; }
    setYearOpen(false);
    notify(`${lastYear} closed`);
    refresh();
  }

  if (!periods) return error ? <ErrorBanner message={error} /> : <Loading />;
  const done = period ? CHECKLIST.filter(c => period.checklist?.[c.key]).length : 0;
  const locked = period?.status === 'locked';

  return (
    <div className="space-y-6">
      <PageHeader
        title="Month Close"
        subtitle="Work through the checklist, then lock the month so nothing in it can change. Anyone can unlock a month, but a reason is required and recorded."
        actions={lastYearOpen > 0 ? <button onClick={() => setYearOpen(true)} className={btnSecondary}><CalendarCheck className="w-4 h-4" /> Close {lastYear}</button> : undefined}
      />
      <ErrorBanner message={error} onClose={() => setError('')} />

      <div className="grid gap-6 lg:grid-cols-[280px_1fr]">
        <Card className="overflow-hidden h-fit">
          <div className="max-h-[560px] overflow-y-auto divide-y divide-gray-50">
            {years.map(y => (
              <div key={y}>
                <p className="px-4 pt-3 pb-1 text-xs font-semibold uppercase tracking-wide text-gray-400 bg-gray-50/70">{y}</p>
                {periods.filter(p => p.period_start.startsWith(String(y))).map(p => {
                  const n = CHECKLIST.filter(c => p.checklist?.[c.key]).length;
                  return (
                    <button key={p.period_start} onClick={() => setSelected(p.period_start)}
                      className={`w-full flex items-center justify-between px-4 py-2.5 text-sm transition ${selected === p.period_start ? 'bg-blue-50 text-blue-800' : 'hover:bg-gray-50 text-gray-700'}`}>
                      <span className="font-medium">{monthLabel(p.period_start, true).split(' ')[0]}</span>
                      {p.status === 'locked'
                        ? <span className="flex items-center gap-1 text-xs text-emerald-700"><Lock className="w-3.5 h-3.5" /> Locked</span>
                        : <span className="text-xs text-gray-500">{n}/{CHECKLIST.length}</span>}
                    </button>
                  );
                })}
              </div>
            ))}
          </div>
        </Card>

        {period && (
          <div className="space-y-6">
            <Card>
              <div className="flex flex-wrap items-center justify-between gap-4 px-6 py-5 border-b border-gray-100">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-lg font-semibold text-gray-900">{monthLabel(period.period_start, true)}</h3>
                    {locked ? <Badge tone="emerald"><Lock className="w-3 h-3" /> Locked</Badge> : <Badge tone="amber">Open</Badge>}
                  </div>
                  <p className="mt-1 text-sm text-gray-500">
                    {locked ? `Locked${period.locked_by ? ` by ${period.locked_by}` : ''}${period.locked_at ? ` on ${fmtDate(period.locked_at)}` : ''}. New activity dated in this month posts to the next open month.` : `${done} of ${CHECKLIST.length} steps done`}
                  </p>
                </div>
                {locked
                  ? <button onClick={() => setUnlocking(true)} className={btnSecondary}><Unlock className="w-4 h-4" /> Unlock month</button>
                  : <button onClick={() => setStatus('locked', 'Month closed')} disabled={busy} className={btnPrimary}><Lock className="w-4 h-4" /> Lock month</button>}
              </div>
              <div className="h-1 bg-gray-100"><div className="h-1 bg-emerald-500 transition-all duration-500" style={{ width: `${locked ? 100 : (done / CHECKLIST.length) * 100}%` }} /></div>
              <ul className="divide-y divide-gray-50">
                {CHECKLIST.map(c => {
                  const on = !!period.checklist?.[c.key];
                  return (
                    <li key={c.key} className="flex items-center gap-4 px-6 py-3.5">
                      <button onClick={() => toggle(c.key)} disabled={locked}
                        className={`w-6 h-6 shrink-0 rounded-full border-2 flex items-center justify-center transition ${on ? 'bg-emerald-500 border-emerald-500 text-white scale-100' : 'border-gray-300 hover:border-emerald-400'} disabled:cursor-default`}>
                        {on && <Check className="w-3.5 h-3.5" />}
                      </button>
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm font-medium ${on ? 'text-gray-500 line-through' : 'text-gray-900'}`}>{c.label}</p>
                        <p className="text-xs text-gray-500">{c.hint}</p>
                      </div>
                      <button onClick={() => go(c.section, c.params)} className="text-xs font-medium text-blue-600 hover:text-blue-800 inline-flex items-center gap-1">Open <ArrowRight className="w-3.5 h-3.5" /></button>
                    </li>
                  );
                })}
              </ul>
            </Card>

            <Card>
              <CardHeader title="Lock history" subtitle="Every lock, unlock and year close, with the reason given" />
              <ul className="divide-y divide-gray-50 max-h-80 overflow-y-auto">
                {events.map(ev => (
                  <li key={ev.id} className="flex items-start gap-3 px-5 py-3 text-sm">
                    <History className="w-4 h-4 mt-0.5 text-gray-400 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-gray-900"><Badge tone={EVENT_TONE[ev.action] ?? 'blue'}>{EVENT_LABEL[ev.action] ?? ev.action}</Badge> <span className="ml-1 font-medium">{monthLabel(ev.period_start, true)}</span> <span className="text-gray-500">by {ev.actor}</span></p>
                      {ev.reason && <p className="mt-0.5 text-gray-600">"{ev.reason}"</p>}
                    </div>
                    <span className="text-xs text-gray-400 whitespace-nowrap">{new Date(ev.created_at).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}</span>
                  </li>
                ))}
                {events.length === 0 && <li className="px-5 py-8 text-center text-sm text-gray-500">No locks yet.</li>}
              </ul>
            </Card>
          </div>
        )}
      </div>

      <Modal open={unlocking} onClose={() => setUnlocking(false)} title={`Unlock ${period ? monthLabel(period.period_start, true) : ''}`} subtitle="Changes become possible again. Your reason is saved in the lock history and audit trail." size="sm"
        footer={<><button onClick={() => setUnlocking(false)} className={btnSecondary}>Cancel</button><button onClick={() => setStatus('open', reason.trim())} disabled={busy || reason.trim().length < 5} className={btnDanger}><Unlock className="w-4 h-4" /> Unlock</button></>}>
        <Field label="Why does this month need to change?" hint="At least 5 characters">
          <textarea value={reason} onChange={e => setReason(e.target.value)} rows={3} className={inputCls} placeholder="e.g. Vendor sent a corrected invoice for October" autoFocus />
        </Field>
      </Modal>

      <Modal open={yearOpen} onClose={() => setYearOpen(false)} title={`Close ${lastYear}`} size="sm"
        footer={<><button onClick={() => setYearOpen(false)} className={btnSecondary}>Cancel</button><button onClick={closeYear} disabled={busy} className={btnPrimary}><Lock className="w-4 h-4" /> Close year</button></>}>
        <p className="text-sm text-gray-600">This locks the {lastYearOpen} remaining open month{lastYearOpen === 1 ? '' : 's'} of {lastYear}. The year's profit rolls into retained earnings on the balance sheet automatically.</p>
      </Modal>
    </div>
  );
}
