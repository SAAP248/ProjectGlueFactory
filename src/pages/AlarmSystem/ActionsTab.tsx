import { useState } from 'react';
import { ShieldCheck, Radio, Plus, AlertTriangle, CheckCircle2, History, X } from 'lucide-react';
import type { CustomerSystem } from '../CustomerProfile/types';

type Target = 'cs' | 'comm';
type Workflow = 'create' | 'terminate';
interface Result { id: number; action: string; provider: string; date: string; detail: string }

const labels: Record<Target, string> = { cs: 'Central Station', comm: 'Communication Partner' };
const today = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};
const displayDate = (value: string) => new Date(`${value}T00:00:00`).toLocaleDateString();

export default function ActionsTab({ system, companyName }: { system: CustomerSystem; companyName: string }) {
  const [selected, setSelected] = useState<Record<Workflow, Target[]>>({ create: [], terminate: [] });
  const [timing, setTiming] = useState('immediate');
  const [date, setDate] = useState(today);
  const [reason, setReason] = useState('');
  const [review, setReview] = useState<Workflow | null>(null);
  const [results, setResults] = useState<Result[]>([]);
  const [notice, setNotice] = useState('');
  const providers = { cs: system.cs_name || 'Provider not specified', comm: system.comm_partner_name || 'Provider not specified' };
  const toggle = (workflow: Workflow, target: Target) => setSelected(prev => ({
    ...prev, [workflow]: prev[workflow].includes(target) ? prev[workflow].filter(t => t !== target) : [...prev[workflow], target],
  }));
  const record = (action: string, targets: Target[], detail: string) => {
    const timestamp = new Date().toLocaleString();
    setResults(prev => [...targets.map((target, index) => ({ id: Date.now() + index, action, provider: `${labels[target]} · ${providers[target]}`, date: timestamp, detail })), ...prev]);
    setNotice(targets.map(target => `${labels[target]}: Success`).join(' · '));
  };
  const confirm = () => {
    if (!review) return;
    record(review === 'create' ? 'Create account' : 'Terminate account', selected[review],
      review === 'create' ? 'Simulated account creation. No provider contacted.' : `${timing === 'immediate' ? 'Immediate termination' : `Termination date: ${displayDate(date)}`} · Reason: ${reason.trim()} · Simulation only; no termination is scheduled.`);
    setSelected(prev => ({ ...prev, [review]: [] }));
    setReview(null);
  };
  const serviceGroups: { title: string; targets: Target[]; actions: string[] }[] = [
    { title: 'Central Station service controls', targets: ['cs'], actions: ['On Test', 'Out of Service'] },
    { title: 'Communication Partner tools', targets: ['comm'], actions: ['Send Welcome', 'Communication Test', 'Silence Beeps', 'Device Reset', 'Partner Portal'] },
    { title: 'Customer & Field Actions', targets: ['cs', 'comm'], actions: ['Text / Email Emergency Contact Update', 'Dispatch Technician'] },
  ];

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-blue-200 bg-blue-50 p-4 text-sm text-blue-900">
        <strong>Test mode.</strong> All actions return simulated success. Real accounts, monitoring, devices and schedules remain unchanged. History lasts only while this system page is open.
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        {(['cs', 'comm'] as Target[]).map(target => {
          const Icon = target === 'cs' ? ShieldCheck : Radio;
          const account = target === 'cs' ? system.cs_number : system.comm_account_id;
          return (
            <div key={target} className="rounded-xl border border-gray-200 bg-white p-6">
              <div className="flex items-center gap-3"><Icon className="h-5 w-5 text-blue-600" /><h3 className="font-semibold text-gray-900">{labels[target]}</h3></div>
              <p className="mt-4 text-sm font-medium text-gray-800">{providers[target]}</p>
              <p className="mt-1 text-sm text-gray-600">Account: {account || 'Not recorded'}</p>
              <div className="mt-4 flex flex-wrap gap-2 text-xs">
                <span className="rounded-full bg-gray-100 px-3 py-1 text-gray-700">Account status: {target === 'cs' ? system.cs_status || 'Not recorded' : 'Not recorded'}</span>
                <span className="rounded-full bg-blue-50 px-3 py-1 text-blue-700">{(target === 'cs' ? system.is_synced_cs : system.is_synced_comm) ? 'Synced' : 'Not synced'}</span>
              </div>
            </div>
          );
        })}
      </div>
      {notice && <div role="status" className="flex items-center gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800"><CheckCircle2 className="h-5 w-5 shrink-0" />{notice}<button aria-label="Dismiss success message" onClick={() => setNotice('')} className="ml-auto p-1"><X className="h-4 w-4" /></button></div>}
      <div className="grid gap-6 lg:grid-cols-2">
        {(['create', 'terminate'] as Workflow[]).map(workflow => {
          const destructive = workflow === 'terminate';
          const targets = selected[workflow];
          const valid = targets.length > 0 && (!destructive || (reason.trim() && (timing === 'immediate' || (date && date >= today()))));
          return (
            <section key={workflow} className={`rounded-xl border bg-white p-6 ${destructive ? 'border-red-200' : 'border-gray-200'}`}>
              <h3 className="flex items-center gap-2 text-lg font-semibold text-gray-900">{destructive ? <AlertTriangle className="h-5 w-5 text-red-600" /> : <Plus className="h-5 w-5 text-blue-600" />}{destructive ? 'Terminate Accounts' : 'Create Accounts'}</h3>
              <p className="mt-2 text-sm text-gray-600">Choose one provider or select both. All providers are available for this test.</p>
              <div className="my-4 space-y-2">
                {(['cs', 'comm'] as Target[]).map(target => <label key={target} className={`flex cursor-pointer items-center gap-3 rounded-lg border p-3 ${targets.includes(target) ? 'border-blue-400 bg-blue-50' : 'border-gray-200'}`}><input type="checkbox" checked={targets.includes(target)} onChange={() => toggle(workflow, target)} className="h-4 w-4 accent-blue-600" /><span className="text-sm text-gray-900">{labels[target]}<span className="block text-xs text-gray-500">{providers[target]}</span></span></label>)}
              </div>
              {destructive && <div className="mb-4 space-y-4">
                <label className="block text-sm font-medium text-gray-700">When should termination happen?<select value={timing} onChange={e => setTiming(e.target.value)} className="mt-2 w-full rounded-lg border border-gray-300 bg-white p-2 text-gray-900"><option value="immediate">Immediately</option><option value="scheduled">Choose a date</option></select></label>
                {timing === 'scheduled' && <label className="block text-sm font-medium text-gray-700">Termination date<input type="date" value={date} min={today()} onChange={e => setDate(e.target.value)} className="mt-2 w-full rounded-lg border border-gray-300 p-2 text-gray-900" /><span className="mt-1 block text-xs text-gray-500">Test only. No automatic termination will run on this date.</span></label>}
                <label className="block text-sm font-medium text-gray-700">Reason for termination <span className="text-red-600">*</span><textarea value={reason} onChange={e => setReason(e.target.value)} rows={2} className="mt-2 w-full rounded-lg border border-gray-300 p-2 text-gray-900" /></label>
              </div>}
              <button disabled={!valid} onClick={() => setReview(workflow)} className={`w-full rounded-lg px-4 py-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:bg-gray-200 disabled:text-gray-500 ${destructive ? 'bg-red-600 hover:bg-red-700' : 'bg-blue-600 hover:bg-blue-700'}`}>
                {destructive ? 'Terminate' : 'Create'} {targets.length === 2 ? 'Both Accounts' : targets.length === 1 ? `${labels[targets[0]]} Account` : 'Accounts'}
              </button>
              {!valid && <p className="mt-2 text-xs text-gray-500">{!targets.length ? 'Select at least one provider to continue.' : 'Enter a reason and a valid termination date.'}</p>}
            </section>
          );
        })}
      </div>
      <div className="grid gap-4 lg:grid-cols-3">{serviceGroups.map(group => <section key={group.title} className="rounded-xl border border-gray-200 bg-white p-6"><h3 className="mb-4 font-semibold text-gray-900">{group.title}</h3><div className="flex flex-col gap-2">{group.actions.map(action => <button key={action} onClick={() => record(action, group.targets, 'Simulated success. No external action performed.')} className="rounded-lg border border-gray-200 px-3 py-2 text-left text-sm font-medium text-gray-700 hover:border-blue-300 hover:bg-blue-50">{action}</button>)}</div></section>)}</div>
      <section className="rounded-xl border border-gray-200 bg-white p-6">
        <h3 className="flex items-center gap-2 font-semibold text-gray-900"><History className="h-5 w-5 text-gray-500" />Recent test actions</h3>
        {!results.length ? <p className="mt-4 text-sm text-gray-500">No test actions yet.</p> : <ul className="mt-4 divide-y divide-gray-100">{results.map(result => <li key={result.id} className="py-4"><div className="flex flex-wrap justify-between gap-2"><strong className="text-sm text-gray-900">{result.action} · {result.provider}</strong><span className="text-xs font-medium text-emerald-700">Success (test)</span></div><p className="mt-1 text-sm text-gray-600">{result.detail}</p><p className="mt-2 text-xs text-gray-500">{result.date} · Requested by: Test user</p></li>)}</ul>}
      </section>
      {review && <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-gray-900/50 p-4" role="dialog" aria-modal="true" aria-labelledby="action-review-title">
        <div className="w-full max-w-lg rounded-xl bg-white p-6 shadow-xl">
          <h2 id="action-review-title" className="text-xl font-semibold text-gray-900">Review {review === 'create' ? 'account creation' : 'account termination'}</h2>
          <dl className="my-6 space-y-3 text-sm"><div><dt className="text-gray-500">Customer</dt><dd className="font-medium text-gray-900">{companyName}</dd></div><div><dt className="text-gray-500">System</dt><dd className="font-medium text-gray-900">{system.name}</dd></div><div><dt className="text-gray-500">Providers</dt><dd className="font-medium text-gray-900">{selected[review].map(t => `${labels[t]} (${providers[t]})`).join(', ')}</dd></div>{review === 'terminate' && <><div><dt className="text-gray-500">Effective date</dt><dd className="text-gray-900">{timing === 'immediate' ? 'Immediately' : displayDate(date)}</dd></div><div><dt className="text-gray-500">Reason</dt><dd className="break-words text-gray-900">{reason}</dd></div></>}</dl>
          <p className={`mb-6 rounded-lg p-3 text-sm ${review === 'terminate' ? 'bg-red-50 text-red-800' : 'bg-blue-50 text-blue-900'}`}>{review === 'terminate' ? 'In a live system, termination would stop the selected services. ' : ''}This is a test: no provider will be contacted and no account will change.</p>
          <div className="flex justify-end gap-3"><button onClick={() => setReview(null)} className="rounded-lg border border-gray-300 px-4 py-2 text-sm text-gray-700">Back</button><button onClick={confirm} className={`rounded-lg px-4 py-2 text-sm font-medium text-white ${review === 'terminate' ? 'bg-red-600 hover:bg-red-700' : 'bg-blue-600 hover:bg-blue-700'}`}>Confirm test {review === 'create' ? 'creation' : 'termination'}</button></div>
        </div>
      </div>}
    </div>
  );
}
