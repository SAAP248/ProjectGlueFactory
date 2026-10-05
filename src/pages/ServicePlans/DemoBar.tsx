import { useState } from 'react';
import { CalendarDays, FlaskConical, Play, RotateCcw } from 'lucide-react';
import { addDays, addMonthsAnchored, formatDate } from './lib/domain';
import { runBilling } from './lib/billing';
import { processLifecycle } from './lib/lifecycle';
import { reconcileVisits } from './lib/fulfillment';
import { resetDemo } from './lib/catalog';
import { updateSettings } from './lib/queries';
import type { SpSettings } from './lib/types';
import { Btn, Modal, errorText } from './ui';

export async function processCompanyDay(today: string, settings: SpSettings): Promise<string> {
  const visits = await reconcileVisits(today);
  const life = await processLifecycle(today, settings);
  const bill = await runBilling(today, settings);
  const parts = [
    bill.invoiced && `${bill.invoiced} invoice${bill.invoiced === 1 ? '' : 's'} created`,
    bill.paid && `${bill.paid} paid`,
    bill.failed && `${bill.failed} declined`,
    life.renewalNotices && `${life.renewalNotices} renewal notice${life.renewalNotices === 1 ? '' : 's'}`,
    life.renewed && `${life.renewed} auto-renewed`,
    life.expired && `${life.expired} expired`,
    life.resumed && `${life.resumed} resumed`,
    visits && `${visits} visit${visits === 1 ? '' : 's'} settled`,
  ].filter(Boolean);
  if (bill.errors.length) parts.push(`${bill.errors.length} error${bill.errors.length === 1 ? '' : 's'}`);
  return parts.length ? parts.join(', ') : 'Nothing due today';
}

interface Props {
  settings: SpSettings;
  today: string;
  onChanged: (message: string) => void;
  onError: (message: string) => void;
}

export default function DemoBar({ settings, today, onChanged, onError }: Props) {
  const [busy, setBusy] = useState('');
  const [confirmReset, setConfirmReset] = useState(false);

  async function advance(to: string) {
    setBusy('advance');
    try {
      await updateSettings({ demo_date: to });
      const summary = await processCompanyDay(to, settings);
      onChanged(`Moved to ${formatDate(to)}. ${summary}.`);
    } catch (e) {
      onError(errorText(e));
    } finally {
      setBusy('');
    }
  }

  async function runToday() {
    setBusy('run');
    try {
      onChanged(`${await processCompanyDay(today, settings)}.`);
    } catch (e) {
      onError(errorText(e));
    } finally {
      setBusy('');
    }
  }

  async function reset() {
    setBusy('reset');
    try {
      await resetDemo();
      setConfirmReset(false);
      onChanged('Demo data restored to Oct 5, 2026.');
    } catch (e) {
      onError(errorText(e));
    } finally {
      setBusy('');
    }
  }

  if (!settings.demo_mode) return null;

  return (
    <>
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 rounded-xl bg-slate-900 text-white px-4 py-2.5">
        <span className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider bg-amber-400 text-slate-900 rounded-md px-2 py-0.5">
          <FlaskConical className="h-3.5 w-3.5" /> Demo mode
        </span>
        <span className="inline-flex items-center gap-2 text-sm">
          <CalendarDays className="h-4 w-4 text-slate-400" />
          Company date <strong className="font-semibold">{formatDate(today)}</strong>
        </span>
        <div className="flex items-center gap-1 ml-auto">
          {[{ l: '+1 day', d: addDays(today, 1) }, { l: '+1 week', d: addDays(today, 7) }, { l: '+1 month', d: addMonthsAnchored(today, 1) }].map(o => (
            <button key={o.l} disabled={!!busy} onClick={() => advance(o.d)}
              className="px-2.5 py-1 rounded-md text-xs font-medium text-slate-200 hover:bg-white/10 disabled:opacity-40 transition-colors">
              {o.l}
            </button>
          ))}
          <span className="w-px h-4 bg-white/20 mx-1" />
          <button disabled={!!busy} onClick={runToday}
            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium text-slate-200 hover:bg-white/10 disabled:opacity-40 transition-colors">
            <Play className="h-3 w-3" /> {busy === 'run' || busy === 'advance' ? 'Processing...' : 'Run today'}
          </button>
          <button disabled={!!busy} onClick={() => setConfirmReset(true)}
            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium text-amber-300 hover:bg-white/10 disabled:opacity-40 transition-colors">
            <RotateCcw className="h-3 w-3" /> Reset demo
          </button>
        </div>
      </div>
      {confirmReset && (
        <Modal
          title="Reset demo data?"
          subtitle="All service plan agreements, plan invoices and plan visits go back to the original 12 scenarios."
          onClose={() => setConfirmReset(false)}
          footer={<>
            <Btn onClick={() => setConfirmReset(false)}>Keep my changes</Btn>
            <Btn variant="danger" busy={busy === 'reset'} onClick={reset}>Reset demo</Btn>
          </>}
        >
          <p className="text-sm text-gray-600">Plans and agreements you created will be removed. Other parts of the app are not touched.</p>
        </Modal>
      )}
    </>
  );
}
