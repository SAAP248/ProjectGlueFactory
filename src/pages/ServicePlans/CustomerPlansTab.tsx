import { useEffect, useState } from 'react';
import { fetchAgreements, fetchCatalog } from './lib/queries';
import type { SpAgreement, SpPlan } from './lib/types';
import { useSpSettings } from './useSpSettings';
import AgreementsList from './AgreementsList';
import AgreementDetail from './AgreementDetail';
import EnrollmentWizard from './EnrollmentWizard';
import { ErrorNote, Loading, errorText } from './ui';

interface Props {
  companyId: string;
  companyName: string;
  onOpenInvoice?: (invoiceId: string) => void;
  onViewCustomer?: (companyId: string) => void;
}

export default function CustomerPlansTab({ companyId, companyName, onOpenInvoice, onViewCustomer }: Props) {
  const { settings, today, error: settingsError } = useSpSettings();
  const [agreements, setAgreements] = useState<SpAgreement[] | null>(null);
  const [plans, setPlans] = useState<SpPlan[]>([]);
  const [error, setError] = useState('');
  const [openId, setOpenId] = useState<string | null>(null);
  const [wizard, setWizard] = useState(false);
  const [notice, setNotice] = useState('');

  async function load() {
    try {
      const [a, p] = await Promise.all([fetchAgreements({ companyId }), fetchCatalog()]);
      setAgreements(a); setPlans(p); setError('');
    } catch (e) { setError(errorText(e)); }
  }
  useEffect(() => { load(); }, [companyId]);

  if (settingsError || error) return <ErrorNote message={settingsError || error} />;
  if (!settings || !agreements) return <Loading />;

  if (openId) {
    return (
      <AgreementDetail agreementId={openId} settings={settings} today={today}
        onBack={() => { setOpenId(null); load(); }} onOpenAgreement={setOpenId}
        onOpenInvoice={onOpenInvoice} onViewCustomer={onViewCustomer} />
    );
  }

  return (
    <div className="space-y-4">
      {notice && <div className="rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm px-3 py-2.5 animate-fade-in">{notice}</div>}
      <AgreementsList agreements={agreements} plans={plans} onOpen={setOpenId} onNew={() => setWizard(true)} compact />
      {wizard && (
        <EnrollmentWizard settings={settings} today={today} initialCompany={{ id: companyId, name: companyName }}
          onClose={() => setWizard(false)}
          onCreated={(id, msg) => { setWizard(false); setNotice(msg); setOpenId(id); }} />
      )}
    </div>
  );
}
