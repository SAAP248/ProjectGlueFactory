import { useState } from 'react';
import ReportsList from './ReportsList';
import RevenueByType from './RevenueByType';

type ReportView = 'list' | 'revenue_by_type';

export default function Reports() {
  const [view, setView] = useState<ReportView>('list');

  if (view === 'revenue_by_type') {
    return <RevenueByType onBack={() => setView('list')} />;
  }

  return <ReportsList onOpenReport={(report) => {
    if (report === 'revenue_by_type') setView('revenue_by_type');
  }} />;
}
