import { useCallback, useEffect, useState } from 'react';
import {
  ArrowLeft, Ban, CalendarClock, CheckCircle2, CreditCard, Eye, FileSignature, History, MapPin, Pause, Play,
  RefreshCw, Send, ShieldAlert,
} from 'lucide-react';
import {
  allowedActions, CADENCE_LABELS, daysBetween, formatCents, formatDate, graceState, monthlyEquivalentCents,
} from '../lib/domain';
import { retryFailedPayments } from '../lib/billing';
import { renewAgreement, resumeAgreement, sendForSignature, updatePaymentMethod } from '../lib/lifecycle';
import { cancelVisit, completeVisit } from '../lib/fulfillment';
import { fetchAgreementDetail } from '../lib/queries';
import type { AgreementDetail as Detail, SpBenefit, SpSettings } from '../lib/types';
import { Btn, Card, ErrorNote, Loading, PlanChip, StatusBadge, errorText } from '../ui';
import BenefitsTab from './BenefitsTab';
import BillingTab from './BillingTab';
import CustomerView from './CustomerView';
import { AdjustModal, CancelModal, PauseModal, RemoteUseModal, ScheduleVisitModal, SignModal } from './ActionModals';

type Tab = 'benefits' | 'billing' | 'coverage' | 'activity' | 'terms';
type Dialog =
  | { kind: 'sign' } | { kind: 'pause' } | { kind: 'cancel' } | { kind: 'customer' }
  | { kind: 'schedule' | 'remote' | 'adjust'; benefit: SpBenefit }
  | null;

interface Props {
  agreementId: string;
  settings: SpSettings;
  today: string;
  onBack: () => void;
  onOpenAgreement: (id: string) => void;
  onOpenInvoice?: (invoiceId: string) => void;
  onViewCustomer?: (companyId: string) => void;
}

export default function AgreementDetail({ agreementId, settings, today, onBack, onOpenAgreement, onOpenInvoice, onViewCustomer }: Props) {
  const [detail, setDetail] = useState<Detail | null>(null);
  const [error, setError] = useState('');
  const [tab, setTab] = useState<Tab>('benefits');
  const [dialog, setDialog] = useState<Dialog>(null);
  const [toast, setToast] = useState('');
  const [busy, setBusy] = useState('');

  const load = useCallback(async () => {
    try {
      setDetail(await fetchAgreementDetail(agreementId));
      setError('');
    } catch (e) {
      setError(errorText(e));
    }
  }, [agreementId]);

  useEffect(() => { setDetail(null); load(); }, [load]);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(''), 3500);
    return () => clearTimeout(t);
  }, [toast]);

  function done(message: string) {
    setDialog(null);
    setToast(message);
    load();
  }

  async function act(key: string, fn: () => Promise<string | void>) {
    setBusy(key);
    setError('');
    try {
      const msg = await fn();
      if (msg) setToast(msg);
      await load();
    } catch (e) {
      setError(errorText(e));
    } finally {
      setBusy('');
    }
  }

  if (!detail) {
    return error ? <div className="p-6"><ErrorNote message={error} /></div> : <Loading label="Loading agreement..." />;
  }

  const { agreement, sites, addons, events, monitoring } = detail;
  const actions = allowedActions(agreement.status);
  const grace = graceState(agreement.status, agreement.grace_until, today);
  const monitoringMonthly = monitoring.reduce((s, m) => s + m.monthly_cents, 0);
  const daysLeft = daysBetween(today, agreement.end_date);
  const tabs: { id: Tab; label: string }[] = [
    { id: 'benefits', label: 'Benefits' },
    { id: 'billing', label: 'Billing' },
    { id: 'coverage', label: `Coverage (${new Set(sites.map(s => s.site_id)).size})` },
    { id: 'activity', label: 'Activity' },
    { id: 'terms', label: 'Terms' },
  ];

  return (
    <div className="space-y-6">
      <div>
        <button onClick={onBack} className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800 transition-colors mb-3">
          <ArrowLeft className="h-4 w-4" /> Back
        </button>
        <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-2xl font-bold text-gray-900">{agreement.agreement_number}</h1>
              <StatusBadge status={agreement.status} />
              <PlanChip name={`${agreement.sp_plans?.name ?? 'Plan'} v${agreement.sp_plan_versions?.version_number ?? 1}`} color={agreement.sp_plans?.color} />
            </div>
            <p className="text-sm text-gray-500 mt-1">
              <button onClick={() => onViewCustomer?.(agreement.company_id)} disabled={!onViewCustomer}
                className="font-medium text-gray-700 hover:text-blue-600 disabled:hover:text-gray-700 transition-colors">
                {agreement.companies?.name}
              </button>
              {agreement.sites && <> · {agreement.sites.name}</>}
              {' · '}{formatDate(agreement.start_date)} – {formatDate(agreement.end_date)}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Btn variant="ghost" onClick={() => setDialog({ kind: 'customer' })}><Eye className="h-4 w-4" /> Customer view</Btn>
            {actions.includes('send') && (
              <Btn busy={busy === 'send'} onClick={() => act('send', async () => { await sendForSignature(agreement, today); return 'Sent for signature.'; })}>
                <Send className="h-4 w-4" /> Send
              </Btn>
            )}
            {actions.includes('sign') && <Btn variant="primary" onClick={() => setDialog({ kind: 'sign' })}><FileSignature className="h-4 w-4" /> Record signature</Btn>}
            {actions.includes('retry_payment') && (
              <Btn variant="primary" busy={busy === 'retry'} onClick={() => act('retry', async () => {
                const r = await retryFailedPayments(agreement, today);
                return r.stillFailing > 0 ? 'Card still declined. Update the payment method first.' : `Collected ${r.recovered} past-due charge${r.recovered === 1 ? '' : 's'}.`;
              })}>
                <RefreshCw className="h-4 w-4" /> Retry payment
              </Btn>
            )}
            {actions.includes('resume') && (
              <Btn variant="primary" busy={busy === 'resume'} onClick={() => act('resume', async () => { await resumeAgreement(agreement, today); return 'Agreement resumed.'; })}>
                <Play className="h-4 w-4" /> Resume
              </Btn>
            )}
            {actions.includes('renew') && (
              <Btn variant={agreement.status === 'pending_renewal' ? 'primary' : 'secondary'} busy={busy === 'renew'}
                onClick={() => act('renew', async () => { const id = await renewAgreement(agreement, today, settings); onOpenAgreement(id); })}>
                <RefreshCw className="h-4 w-4" /> Renew
              </Btn>
            )}
            {actions.includes('pause') && <Btn onClick={() => setDialog({ kind: 'pause' })}><Pause className="h-4 w-4" /> Pause</Btn>}
            {actions.includes('cancel') && <Btn variant="ghost" onClick={() => setDialog({ kind: 'cancel' })} className="!text-red-600 hover:!bg-red-50"><Ban className="h-4 w-4" /> Cancel</Btn>}
          </div>
        </div>
      </div>

      <ErrorNote message={error} />

      {grace !== 'none' && (
        <div className={`flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-xl border px-4 py-3 ${grace === 'in_grace' ? 'border-amber-200 bg-amber-50' : 'border-red-200 bg-red-50'}`}>
          <div className="flex items-start gap-3">
            <ShieldAlert className={`h-5 w-5 mt-0.5 ${grace === 'in_grace' ? 'text-amber-600' : 'text-red-600'}`} />
            <div className="text-sm">
              <p className={`font-medium ${grace === 'in_grace' ? 'text-amber-900' : 'text-red-900'}`}>
                {grace === 'in_grace' ? `Payment failed. Grace period ends ${formatDate(agreement.grace_until)}.` : `Grace period ended ${formatDate(agreement.grace_until)}. Benefits are on hold.`}
              </p>
              <p className="text-gray-600">Payment method: {agreement.payment_method === 'card_declined' ? 'card declined' : agreement.payment_method.replace(/_/g, ' ')}</p>
            </div>
          </div>
          {agreement.payment_method === 'card_declined' && (
            <Btn busy={busy === 'card'} onClick={() => act('card', async () => { await updatePaymentMethod(agreement, 'card_on_file', today); return 'New card saved. Retry the payment to collect.'; })}>
              <CreditCard className="h-4 w-4" /> Save new card
            </Btn>
          )}
        </div>
      )}
      {agreement.status === 'paused' && (
        <Banner icon={Pause} tone="amber" text={`Paused since ${formatDate(agreement.paused_at)}. Resumes automatically ${formatDate(agreement.resume_on)}.`} />
      )}
      {agreement.status === 'pending_renewal' && (
        <Banner icon={CalendarClock} tone="orange" text={`Term ends in ${daysLeft} day${daysLeft === 1 ? '' : 's'}. ${agreement.auto_renew ? 'Renews automatically onto the current plan version.' : 'Auto-renew is off.'}`} />
      )}
      {agreement.status === 'canceled' && (
        <Banner icon={Ban} tone="gray" text={`Canceled ${formatDate(agreement.canceled_at)}. Reason: ${agreement.cancel_reason || 'not given'}.`} />
      )}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Summary label={`${CADENCE_LABELS[agreement.cadence]} plan price`} value={formatCents(agreement.period_amount_cents)} sub={`${formatCents(monthlyEquivalentCents(agreement.period_amount_cents, agreement.cadence))}/mo equivalent`} />
        <Summary label="Monitoring (separate)" value={monitoringMonthly ? `${formatCents(monitoringMonthly)}/mo` : 'None'} sub="Not billed by this plan" />
        <Summary label="Term" value={agreement.status === 'expired' || agreement.status === 'canceled' ? 'Ended' : daysLeft >= 0 ? `${daysLeft} days left` : 'Ended'} sub={agreement.auto_renew ? 'Auto-renews' : 'Manual renewal'} />
        <Summary label="Signed" value={agreement.signed_by_name ?? 'Not yet'} sub={agreement.signed_at ? formatDate(agreement.signed_at.slice(0, 10)) : agreement.status.replace('_', ' ')} />
      </div>

      <div className="border-b border-gray-200 flex gap-6 overflow-x-auto">
        {tabs.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`pb-3 text-sm font-medium border-b-2 -mb-px whitespace-nowrap transition-colors ${tab === t.id ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-800'}`}>
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'benefits' && (
        <BenefitsTab
          detail={detail}
          today={today}
          onSchedule={b => setDialog({ kind: 'schedule', benefit: b })}
          onRemote={b => setDialog({ kind: 'remote', benefit: b })}
          onAdjust={b => setDialog({ kind: 'adjust', benefit: b })}
          onCompleteVisit={(id, num) => act('visit', async () => { await completeVisit(agreement.id, id, num, today); return `${num} completed. Allowance used.`; })}
          onCancelVisit={(id, num) => act('visit', async () => { await cancelVisit(agreement.id, id, num, today); return `${num} canceled. Allowance returned.`; })}
        />
      )}
      {tab === 'billing' && <BillingTab detail={detail} today={today} onOpenInvoice={onOpenInvoice} />}
      {tab === 'coverage' && (
        <div className="grid md:grid-cols-2 gap-4">
          <Card title="Covered sites and equipment">
            <ul className="divide-y divide-gray-100">
              {[...new Set(sites.map(s => s.site_id))].map(siteId => {
                const rows = sites.filter(s => s.site_id === siteId);
                const site = rows[0].sites;
                const systems = rows.filter(r => r.customer_systems).map(r => r.customer_systems!.name);
                return (
                  <li key={siteId} className="px-5 py-3.5 flex gap-3">
                    <MapPin className="h-4 w-4 text-gray-400 mt-0.5 flex-shrink-0" />
                    <div className="text-sm">
                      <p className="font-medium text-gray-900">{site?.name}</p>
                      <p className="text-gray-500">{site?.address}{site?.city ? `, ${site.city}` : ''}</p>
                      <p className="text-xs text-gray-500 mt-1">{systems.length ? systems.join(' · ') : 'All equipment at this site'}</p>
                    </div>
                  </li>
                );
              })}
              {sites.length === 0 && <li className="px-5 py-6 text-sm text-gray-500">No sites attached.</li>}
            </ul>
          </Card>
          <Card title="Add-ons">
            <ul className="divide-y divide-gray-100">
              {addons.map(a => (
                <li key={a.id} className="px-5 py-3 flex justify-between text-sm">
                  <span className="text-gray-900">{a.name}{a.quantity > 1 && <span className="text-gray-500"> x{a.quantity}</span>}</span>
                  <span className="tabular-nums text-gray-600">{formatCents(a.annual_amount_cents * a.quantity)}/yr</span>
                </li>
              ))}
              {addons.length === 0 && <li className="px-5 py-6 text-sm text-gray-500">No add-ons.</li>}
            </ul>
          </Card>
        </div>
      )}
      {tab === 'activity' && (
        <Card>
          <ol className="relative px-5 py-5">
            {events.map((e, i) => (
              <li key={e.id} className="flex gap-4 pb-5 last:pb-0">
                <div className="flex flex-col items-center">
                  <div className="w-7 h-7 rounded-full bg-gray-100 flex items-center justify-center">
                    {e.event_type.includes('fail') ? <ShieldAlert className="h-3.5 w-3.5 text-red-500" />
                      : e.event_type.includes('paid') || e.event_type.includes('signed') || e.event_type.includes('recovered') ? <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                      : <History className="h-3.5 w-3.5 text-gray-500" />}
                  </div>
                  {i < events.length - 1 && <div className="w-px flex-1 bg-gray-200 mt-1" />}
                </div>
                <div className="text-sm pt-0.5">
                  <p className="text-gray-900">{e.description}</p>
                  <p className="text-xs text-gray-500 mt-0.5">{formatDate(e.event_date)} · {e.event_type.replace(/_/g, ' ')}</p>
                </div>
              </li>
            ))}
            {events.length === 0 && <li className="text-sm text-gray-500">No activity yet.</li>}
          </ol>
        </Card>
      )}
      {tab === 'terms' && (
        <Card title={`Plan version ${agreement.sp_plan_versions?.version_number ?? ''} terms`}>
          <div className="px-5 py-4 text-sm text-gray-700 space-y-3">
            <p className="whitespace-pre-line leading-relaxed">{agreement.sp_plan_versions?.terms_text || 'No terms text on this version.'}</p>
            <div className="grid sm:grid-cols-3 gap-3 pt-3 border-t border-gray-100 text-xs text-gray-500">
              <span>Rollover: {agreement.sp_plan_versions?.rollover_policy.replace('_', ' ')} (cap {agreement.sp_plan_versions?.rollover_cap})</span>
              <span>Cancellation: {agreement.sp_plan_versions?.cancellation_policy === 'prorated' ? 'prorated refund' : 'no refund'}</span>
              <span>Anchor day: {agreement.anchor_day}</span>
            </div>
            {agreement.notes && <p className="text-xs text-gray-500">Notes: {agreement.notes}</p>}
          </div>
        </Card>
      )}

      {dialog?.kind === 'sign' && <SignModal detail={detail} today={today} settings={settings} onClose={() => setDialog(null)} onDone={done} />}
      {dialog?.kind === 'pause' && <PauseModal detail={detail} today={today} onClose={() => setDialog(null)} onDone={done} />}
      {dialog?.kind === 'cancel' && <CancelModal detail={detail} today={today} onClose={() => setDialog(null)} onDone={done} />}
      {dialog?.kind === 'customer' && <CustomerView detail={detail} today={today} onClose={() => setDialog(null)} />}
      {dialog?.kind === 'schedule' && <ScheduleVisitModal detail={detail} today={today} benefit={dialog.benefit} onClose={() => setDialog(null)} onDone={done} />}
      {dialog?.kind === 'remote' && <RemoteUseModal detail={detail} today={today} benefit={dialog.benefit} onClose={() => setDialog(null)} onDone={done} />}
      {dialog?.kind === 'adjust' && <AdjustModal detail={detail} today={today} benefit={dialog.benefit} onClose={() => setDialog(null)} onDone={done} />}

      {toast && (
        <div className="fixed bottom-6 right-6 z-50 animate-fade-in flex items-center gap-2 bg-gray-900 text-white text-sm px-4 py-3 rounded-xl shadow-lg">
          <CheckCircle2 className="h-4 w-4 text-emerald-400" /> {toast}
        </div>
      )}
    </div>
  );
}

function Summary({ label, value, sub }: { label: string; value: string; sub: string }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 px-4 py-3.5">
      <p className="text-xs text-gray-500">{label}</p>
      <p className="text-lg font-semibold text-gray-900 tabular-nums mt-0.5 truncate">{value}</p>
      <p className="text-xs text-gray-500 mt-0.5">{sub}</p>
    </div>
  );
}

function Banner({ icon: Icon, tone, text }: { icon: typeof Pause; tone: 'amber' | 'orange' | 'gray'; text: string }) {
  const cls = { amber: 'border-amber-200 bg-amber-50 text-amber-900', orange: 'border-orange-200 bg-orange-50 text-orange-900', gray: 'border-gray-200 bg-gray-50 text-gray-700' }[tone];
  return (
    <div className={`flex items-center gap-3 rounded-xl border px-4 py-3 text-sm ${cls}`}>
      <Icon className="h-4 w-4 flex-shrink-0" /> {text}
    </div>
  );
}
