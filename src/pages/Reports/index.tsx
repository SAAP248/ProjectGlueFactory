import { useState } from 'react';
import ReportsList from './ReportsList';
import RevenueByType from './RevenueByType';
import MerchantFeeReport from './MerchantFeeReport';

type ReportView = 'list' | 'revenue_by_type' | 'merchant_fees';

export default function Reports({ onOpenInvoice }: { onOpenInvoice?: (id: string) => void }) {
  const [view, setView] = useState<ReportView>('list');

  if (view === 'revenue_by_type') {
    return <RevenueByType onBack={() => setView('list')} />;
  }

  if (view === 'merchant_fees') {
    return <MerchantFeeReport onBack={() => setView('list')} onOpenInvoice={onOpenInvoice} />;
  }

  return <ReportsList onOpenReport={(report) => {
    if (report === 'revenue_by_type' || report === 'merchant_fees') setView(report);
  }} />;
}
