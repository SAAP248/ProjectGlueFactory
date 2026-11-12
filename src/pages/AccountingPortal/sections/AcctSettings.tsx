import { useState } from 'react';
import { AlertTriangle, Percent, RotateCcw, User, Wrench } from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import { saveAppSetting, useAppSetting } from '../../../lib/useAppSettings';
import { usePortal } from '../lib/context';
import { errMsg, getActor, setActor } from '../lib/api';
import { btnDanger, btnPrimary, btnSecondary, Card, CardHeader, ErrorBanner, Field, inputCls, Modal, PageHeader } from '../components/ui';

export default function AcctSettings() {
  const { refresh, notify, reloadAccounts } = usePortal();
  const [name, setName] = useState(getActor());
  const [labor] = useAppSetting('acct_labor_taxable');
  const [stateRate, stateLoading] = useAppSetting('acct_state_tax_rate');
  const [rate, setRate] = useState<string | null>(null);
  const [confirm, setConfirm] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function save(key: string, value: string, msg: string) {
    try { await saveAppSetting(key, value); notify(msg); } catch (e) { setError(errMsg(e)); }
  }

  async function reset() {
    setBusy(true);
    setError('');
    const { error } = await supabase.rpc('acct_reset_demo');
    setBusy(false);
    setConfirm(false);
    if (error) { setError(errMsg(error)); return; }
    await reloadAccounts();
    notify('Sample data has been reset');
    refresh();
  }

  const laborOn = labor === 'true';

  return (
    <div className="space-y-6 max-w-3xl">
      <PageHeader title="Accounting settings" subtitle="Who is working, how sales tax is figured, and sample data." />
      <ErrorBanner message={error} onClose={() => setError('')} />

      <Card>
        <CardHeader title="Your name" subtitle="Saved on this device and written next to every change, unlock and close in the history." />
        <div className="flex items-end gap-3 px-5 pb-5">
          <div className="flex-1"><Field label="Name shown in history"><div className="relative"><User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" /><input value={name} onChange={e => setName(e.target.value)} className={`${inputCls} pl-9`} /></div></Field></div>
          <button disabled={!name.trim() || name.trim() === getActor()} onClick={() => { setActor(name.trim()); notify('Name saved'); refresh(); }} className={btnPrimary}>Save</button>
        </div>
      </Card>

      <Card>
        <CardHeader title="Sales tax" subtitle="Florida state rate plus each customer's county surtax. County and city rates live on the Sales Tax page." />
        <div className="px-5 pb-5 space-y-5">
          <div className="flex items-start justify-between gap-4 rounded-lg border border-gray-200 p-4">
            <div className="flex gap-3">
              <Wrench className="w-5 h-5 text-gray-400 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-gray-900">Charge tax on labor by default</p>
                <p className="text-sm text-gray-500">New labor and service lines start with the Tax switch {laborOn ? 'on' : 'off'}. You can still flip any single line on an invoice or estimate.</p>
              </div>
            </div>
            <button role="switch" aria-checked={laborOn} onClick={() => save('acct_labor_taxable', laborOn ? 'false' : 'true', `Labor is now ${laborOn ? 'not taxed' : 'taxed'} by default`)}
              className={`relative h-6 w-11 shrink-0 rounded-full transition ${laborOn ? 'bg-blue-600' : 'bg-gray-300'}`}>
              <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all ${laborOn ? 'left-[22px]' : 'left-0.5'}`} />
            </button>
          </div>
          <div className="flex items-end gap-3">
            <div className="w-48"><Field label="State sales tax rate"><div className="relative"><input type="number" step="0.01" value={rate ?? (stateLoading ? '' : stateRate || '6')} onChange={e => setRate(e.target.value)} className={`${inputCls} pr-8 text-right`} /><Percent className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" /></div></Field></div>
            <button disabled={rate === null || rate === stateRate || !(Number(rate) >= 0)} onClick={() => { save('acct_state_tax_rate', String(Number(rate)), 'State rate saved'); setRate(null); }} className={btnSecondary}>Save rate</button>
          </div>
        </div>
      </Card>

      <Card>
        <CardHeader title="Sample data" subtitle="Everything in this portal runs on practice data built from your WorkHorse jobs, invoices and purchase orders." />
        <div className="flex items-center justify-between gap-4 px-5 pb-5">
          <p className="text-sm text-gray-600">Resetting rebuilds sample bills, bank activity, statements, tax returns and budgets, and re-posts WorkHorse activity. Bills, vendors and entries you added yourself are kept.</p>
          <button onClick={() => setConfirm(true)} className={`${btnSecondary} shrink-0`}><RotateCcw className="w-4 h-4" /> Reset sample data</button>
        </div>
      </Card>

      <Modal open={confirm} onClose={() => setConfirm(false)} title="Reset sample data?" size="sm"
        footer={<><button onClick={() => setConfirm(false)} className={btnSecondary}>Keep my data</button><button onClick={reset} disabled={busy} className={btnDanger}>{busy ? 'Resetting...' : 'Reset everything'}</button></>}>
        <div className="flex gap-3 text-sm text-gray-700">
          <AlertTriangle className="w-5 h-5 shrink-0 text-amber-500" />
          <p>All accounting activity in this portal goes back to the starting sample. Your customers, jobs and invoices in WorkHorse are not touched.</p>
        </div>
      </Modal>
    </div>
  );
}
