import { useCallback, useEffect, useState } from 'react';
import { CheckCircle2, Plus, ShieldCheck, X } from 'lucide-react';
import { useSpSettings } from './useSpSettings';
import { useModuleData } from './useModuleData';
import DemoBar from './DemoBar';
import Dashboard from './Dashboard';
import AgreementsList from './AgreementsList';
import Fulfillment from './Fulfillment';
import BillingView from './BillingView';
import Reports from './Reports';
import SettingsView from './SettingsView';
import AgreementDetail from './AgreementDetail';
import EnrollmentWizard from './EnrollmentWizard';
import { Btn, ErrorNote, Loading } from './ui';

export type ModuleTab = 'dashboard' | 'agreements' | 'fulfillment' | 'billing' | 'reports' | 'settings';

const TABS: { id: ModuleTab; label: string }[] = [
  { id: 'dashboard', label: 'Dashboard' },
  { id: 'agreements', label: 'Agreements' },
  { id: 'fulfillment', label: 'Fulfillment' },
  { id: 'billing', label: 'Billing' },
  { id: 'reports', label: 'Reports' },
  { id: 'settings', label: 'Settings' },
];

interface Props {
  initialAgreementId?: string | null;
  onOpenInvoice?: (invoiceId: string) => void;
  onViewCustomer?: (companyId: string) => void;
}

export default function ServicePlans({ initialAgreementId, onOpenInvoice, onViewCustomer }: Props) {
  const { settings, today, error: settingsError, reload: reloadSettings } = useSpSettings();
  const { data, error: dataError, reload: reloadData } = useModuleData();
  const [tab, setTab] = useState<ModuleTab>('dashboard');
  const [openId, setOpenId] = useState<string | null>(initialAgreementId ?? null);
  const [wizard, setWizard] = useState(false);
  const [toast, setToast] = useState<{ text: string; tone: 'ok' | 'error' } | null>(null);
  const [revision, setRevision] = useState(0);

  useEffect(() => { if (initialAgreementId) setOpenId(initialAgreementId); }, [initialAgreementId]);
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), toast.tone === 'error' ? 7000 : 4500);
    return () => clearTimeout(t);
  }, [toast]);

  const refresh = useCallback(async (message?: string) => {
    await Promise.all([reloadSettings(), reloadData()]);
    setRevision(r => r + 1);
    if (message) setToast({ text: message, tone: 'ok' });
  }, [reloadSettings, reloadData]);

  const showError = (text: string) => setToast({ text, tone: 'error' });
  const error = settingsError || dataError;

  return (
    <div className="min-h-full bg-gray-50">
      <div className="bg-white border-b border-gray-200 px-6 pt-5">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center shadow-sm">
              <ShieldCheck className="h-5 w-5 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Service Plans</h1>
              <p className="text-sm text-gray-500">Annual maintenance agreements, billed separately from monitoring</p>
            </div>
          </div>
          <Btn variant="primary" onClick={() => setWizard(true)} disabled={!settings}><Plus className="h-4 w-4" /> New agreement</Btn>
        </div>
        <nav className="flex gap-1 mt-4 -mb-px overflow-x-auto">
          {TABS.map(t => (
            <button key={t.id} onClick={() => { setTab(t.id); setOpenId(null); }}
              className={`px-4 py-2.5 text-sm font-medium border-b-2 whitespace-nowrap transition-colors ${tab === t.id && !openId ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-800'}`}>
              {t.label}
            </button>
          ))}
        </nav>
      </div>

      <div className="p-6 space-y-6 max-w-[1400px] mx-auto">
        {settings && <DemoBar settings={settings} today={today} onChanged={m => refresh(m)} onError={showError} />}
        <ErrorNote message={error} />
        {!settings || !data ? (!error && <Loading />) : openId ? (
          <AgreementDetail
            key={`${openId}:${revision}`}
            agreementId={openId}
            settings={settings}
            today={today}
            onBack={() => { setOpenId(null); reloadData(); }}
            onOpenAgreement={id => setOpenId(id)}
            onOpenInvoice={onOpenInvoice}
            onViewCustomer={onViewCustomer}
          />
        ) : (
          <div key={tab} className="animate-fade-in">
            {tab === 'dashboard' && <Dashboard data={data} today={today} onOpen={setOpenId} onGo={setTab} />}
            {tab === 'agreements' && <AgreementsList agreements={data.agreements} plans={data.plans} onOpen={setOpenId} onNew={() => setWizard(true)} />}
            {tab === 'fulfillment' && <Fulfillment data={data} today={today} onOpen={setOpenId} onChanged={m => refresh(m)} />}
            {tab === 'billing' && <BillingView data={data} settings={settings} today={today} onOpen={setOpenId} onOpenInvoice={onOpenInvoice} onChanged={m => refresh(m)} />}
            {tab === 'reports' && <Reports data={data} today={today} />}
            {tab === 'settings' && <SettingsView key={revision} settings={settings} onChanged={m => refresh(m)} />}
          </div>
        )}
      </div>

      {wizard && settings && (
        <EnrollmentWizard
          settings={settings}
          today={today}
          onClose={() => setWizard(false)}
          onCreated={(id, message) => { setWizard(false); setOpenId(id); refresh(message); }}
        />
      )}

      {toast && (
        <div className="fixed bottom-6 right-6 z-[60] animate-fade-in">
          <div className={`flex items-start gap-3 max-w-md rounded-xl shadow-lg px-4 py-3 text-sm ${toast.tone === 'ok' ? 'bg-gray-900 text-white' : 'bg-red-600 text-white'}`}>
            <CheckCircle2 className="h-4 w-4 mt-0.5 flex-shrink-0" />
            <span className="flex-1">{toast.text}</span>
            <button onClick={() => setToast(null)} className="opacity-70 hover:opacity-100" aria-label="Dismiss"><X className="h-4 w-4" /></button>
          </div>
        </div>
      )}
    </div>
  );
}
