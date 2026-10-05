import { useEffect, useState } from 'react';
import { supabase } from '../../../lib/supabase';
import {
  addMonthsAnchored, cancellationRefundCents, computeBalance, formatCents, formatDate,
} from '../lib/domain';
import { cancelAgreement, pauseAgreement, signAndActivate } from '../lib/lifecycle';
import { adjustEntitlement, logRemoteSession, scheduleVisit } from '../lib/fulfillment';
import type { AgreementDetail, SpBenefit, SpSettings } from '../lib/types';
import { Btn, ErrorNote, Field, Modal, errorText, inputCls } from '../ui';

interface BaseProps {
  detail: AgreementDetail;
  today: string;
  onClose: () => void;
  onDone: (message: string) => void;
}

function useAction() {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  async function run(fn: () => Promise<void>) {
    setBusy(true);
    setError('');
    try { await fn(); } catch (e) { setError(errorText(e)); } finally { setBusy(false); }
  }
  return { busy, error, run };
}

export function SignModal({ detail, today, settings, onClose, onDone }: BaseProps & { settings: SpSettings }) {
  const [name, setName] = useState('');
  const [agree, setAgree] = useState(false);
  const { busy, error, run } = useAction();
  const v = detail.agreement.sp_plan_versions;
  return (
    <Modal
      title="Record customer signature"
      subtitle="Activates the agreement, schedules billing and grants benefits."
      onClose={onClose}
      footer={<>
        <Btn onClick={onClose}>Cancel</Btn>
        <Btn variant="primary" busy={busy} disabled={!name.trim() || !agree}
          onClick={() => run(async () => { await signAndActivate(detail.agreement.id, name, settings, today); onDone('Agreement signed and activated.'); })}>
          Sign and activate
        </Btn>
      </>}
    >
      <div className="space-y-4">
        {v?.terms_text && (
          <div className="max-h-40 overflow-y-auto text-xs leading-relaxed text-gray-600 bg-gray-50 border border-gray-200 rounded-lg p-3 whitespace-pre-line">
            {v.terms_text}
          </div>
        )}
        <Field label="Signer full name">
          <input className={inputCls} value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Jordan Smith" autoFocus />
        </Field>
        {name.trim() && (
          <p className="font-display italic text-2xl text-gray-800 border-b border-gray-300 pb-1">{name}</p>
        )}
        <label className="flex items-start gap-2 text-sm text-gray-700">
          <input type="checkbox" className="mt-0.5 rounded border-gray-300 text-blue-600" checked={agree} onChange={e => setAgree(e.target.checked)} />
          Customer has read and accepts the plan terms, billing schedule and cancellation policy.
        </label>
        <ErrorNote message={error} />
      </div>
    </Modal>
  );
}

export function PauseModal({ detail, today, onClose, onDone }: BaseProps) {
  const [resumeOn, setResumeOn] = useState(addMonthsAnchored(today, 1));
  const { busy, error, run } = useAction();
  return (
    <Modal
      title="Pause agreement"
      subtitle="Billing is skipped and benefits are on hold until the resume date."
      onClose={onClose}
      footer={<>
        <Btn onClick={onClose}>Cancel</Btn>
        <Btn variant="primary" busy={busy} disabled={resumeOn <= today}
          onClick={() => run(async () => { await pauseAgreement(detail.agreement, today, resumeOn); onDone(`Paused until ${formatDate(resumeOn)}.`); })}>
          Pause plan
        </Btn>
      </>}
    >
      <div className="space-y-4">
        <Field label="Resume on" hint="Charges with a bill date before this day are skipped, not owed.">
          <input type="date" className={inputCls} value={resumeOn} min={today} max={detail.agreement.end_date} onChange={e => setResumeOn(e.target.value)} />
        </Field>
        <ErrorNote message={error} />
      </div>
    </Modal>
  );
}

export function CancelModal({ detail, today, onClose, onDone }: BaseProps) {
  const [reason, setReason] = useState('');
  const { busy, error, run } = useAction();
  const policy = detail.agreement.sp_plan_versions?.cancellation_policy ?? 'no_refund';
  const current = detail.occurrences.find(o => o.status === 'paid' && o.period_start <= today && o.period_end >= today);
  const refund = current ? cancellationRefundCents({
    policy, periodStart: current.period_start, periodEnd: current.period_end, paidCents: current.amount_cents, cancelDate: today,
  }) : 0;
  const voids = detail.occurrences.filter(o => o.status === 'scheduled' || o.status === 'failed').length;
  return (
    <Modal
      title={`Cancel ${detail.agreement.agreement_number}`}
      onClose={onClose}
      footer={<>
        <Btn onClick={onClose}>Keep plan</Btn>
        <Btn variant="danger" busy={busy} disabled={!reason.trim()}
          onClick={() => run(async () => { const r = await cancelAgreement(detail.agreement, today, reason.trim()); onDone(r > 0 ? `Canceled. ${formatCents(r)} refunded.` : 'Agreement canceled.'); })}>
          Cancel agreement
        </Btn>
      </>}
    >
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div className="rounded-lg bg-gray-50 p-3">
            <p className="text-xs text-gray-500">Plan policy</p>
            <p className="font-medium text-gray-900 mt-0.5">{policy === 'prorated' ? 'Prorated refund' : 'No refund'}</p>
          </div>
          <div className="rounded-lg bg-gray-50 p-3">
            <p className="text-xs text-gray-500">Refund today</p>
            <p className="font-medium text-gray-900 mt-0.5 tabular-nums">{formatCents(refund)}</p>
          </div>
        </div>
        <p className="text-sm text-gray-600">
          {voids} upcoming or unpaid charge{voids === 1 ? '' : 's'} will be voided. Monitoring service is not affected.
        </p>
        <Field label="Reason">
          <textarea className={inputCls} rows={3} value={reason} onChange={e => setReason(e.target.value)} placeholder="Why is the customer canceling?" />
        </Field>
        <ErrorNote message={error} />
      </div>
    </Modal>
  );
}

interface Tech { id: string; first_name: string; last_name: string }

export function ScheduleVisitModal({ detail, today, benefit, onClose, onDone }: BaseProps & { benefit: SpBenefit }) {
  const sites = detail.sites;
  const uniqueSites = [...new Map(sites.map(s => [s.site_id, s])).values()];
  const [siteId, setSiteId] = useState(uniqueSites[0]?.site_id ?? detail.agreement.primary_site_id ?? '');
  const systemsAtSite = sites.filter(s => s.site_id === siteId && s.system_id);
  const [systemId, setSystemId] = useState('');
  const [date, setDate] = useState(today);
  const [time, setTime] = useState('09:00');
  const [techId, setTechId] = useState('');
  const [notes, setNotes] = useState('');
  const [techs, setTechs] = useState<Tech[]>([]);
  const { busy, error, run } = useAction();
  const balance = computeBalance(detail.ledger.filter(e => e.benefit_id === benefit.id));
  const covered = balance.available > 0;

  useEffect(() => {
    supabase.from('employees').select('id, first_name, last_name').eq('status', 'active').order('first_name')
      .then(({ data }) => setTechs((data ?? []) as Tech[]));
  }, []);

  return (
    <Modal
      title={`Schedule ${benefit.name.toLowerCase()}`}
      subtitle={`${benefit.duration_minutes} minute visit`}
      onClose={onClose}
      footer={<>
        <Btn onClick={onClose}>Cancel</Btn>
        <Btn variant="primary" busy={busy} disabled={!date}
          onClick={() => run(async () => {
            const r = await scheduleVisit({
              agreement: detail.agreement, benefit, siteId: siteId || null, systemId: systemId || null,
              date, time, technicianId: techId || null, notes,
            }, today);
            onDone(`Work order ${r.woNumber} created${r.covered ? '' : ' as a billable overage'}.`);
          })}>
          Create work order
        </Btn>
      </>}
    >
      <div className="space-y-4">
        <div className={`rounded-lg px-3 py-2.5 text-sm ${covered ? 'bg-emerald-50 text-emerald-800' : 'bg-amber-50 text-amber-800'}`}>
          {covered
            ? `Included in plan. ${balance.available} remaining this term; this visit will be reserved.`
            : `Allowance used up. This visit will be billed at the overage price of ${formatCents(benefit.overage_price_cents)}.`}
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Site">
            <select className={inputCls} value={siteId} onChange={e => { setSiteId(e.target.value); setSystemId(''); }}>
              {uniqueSites.map(s => <option key={s.site_id} value={s.site_id}>{s.sites?.name ?? 'Site'}</option>)}
            </select>
          </Field>
          <Field label="Equipment">
            <select className={inputCls} value={systemId} onChange={e => setSystemId(e.target.value)}>
              <option value="">All covered equipment</option>
              {systemsAtSite.map(s => <option key={s.id} value={s.system_id ?? ''}>{s.customer_systems?.name ?? 'System'}</option>)}
            </select>
          </Field>
          <Field label="Date">
            <input type="date" className={inputCls} value={date} onChange={e => setDate(e.target.value)} />
          </Field>
          <Field label="Time">
            <input type="time" className={inputCls} value={time} onChange={e => setTime(e.target.value)} />
          </Field>
        </div>
        <Field label="Technician" hint="Leave unassigned to dispatch later.">
          <select className={inputCls} value={techId} onChange={e => setTechId(e.target.value)}>
            <option value="">Unassigned</option>
            {techs.map(t => <option key={t.id} value={t.id}>{t.first_name} {t.last_name}</option>)}
          </select>
        </Field>
        <Field label="Notes for the technician">
          <textarea className={inputCls} rows={2} value={notes} onChange={e => setNotes(e.target.value)} />
        </Field>
        <ErrorNote message={error} />
      </div>
    </Modal>
  );
}

export function RemoteUseModal({ detail, today, benefit, onClose, onDone }: BaseProps & { benefit: SpBenefit }) {
  const [note, setNote] = useState('');
  const { busy, error, run } = useAction();
  return (
    <Modal
      title={`Log ${benefit.name.toLowerCase()}`}
      onClose={onClose}
      footer={<>
        <Btn onClick={onClose}>Cancel</Btn>
        <Btn variant="primary" busy={busy}
          onClick={() => run(async () => { await logRemoteSession(detail.agreement, benefit, today, note); onDone(`${benefit.name} logged.`); })}>
          Log use
        </Btn>
      </>}
    >
      <div className="space-y-4">
        <Field label="What was done">
          <textarea className={inputCls} rows={3} value={note} onChange={e => setNote(e.target.value)} placeholder="e.g. Reset streaming box and updated firmware" autoFocus />
        </Field>
        <ErrorNote message={error} />
      </div>
    </Modal>
  );
}

export function AdjustModal({ detail, today, benefit, onClose, onDone }: BaseProps & { benefit: SpBenefit }) {
  const [qty, setQty] = useState('1');
  const [reason, setReason] = useState('');
  const { busy, error, run } = useAction();
  return (
    <Modal
      title={`Adjust ${benefit.name.toLowerCase()}`}
      subtitle="Goodwill credits or corrections. Use a negative number to remove."
      onClose={onClose}
      footer={<>
        <Btn onClick={onClose}>Cancel</Btn>
        <Btn variant="primary" busy={busy} disabled={!reason.trim()}
          onClick={() => run(async () => { await adjustEntitlement(detail.agreement, benefit, parseInt(qty, 10), reason, today); onDone('Allowance adjusted.'); })}>
          Save adjustment
        </Btn>
      </>}
    >
      <div className="space-y-4">
        <Field label="Quantity">
          <input type="number" step={1} className={inputCls} value={qty} onChange={e => setQty(e.target.value)} />
        </Field>
        <Field label="Reason">
          <input className={inputCls} value={reason} onChange={e => setReason(e.target.value)} placeholder="e.g. Goodwill for missed appointment" />
        </Field>
        <ErrorNote message={error} />
      </div>
    </Modal>
  );
}
