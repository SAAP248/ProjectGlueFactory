import { useState } from 'react';
import { AlertTriangle, CalendarClock, Download, FileText, Wallet } from 'lucide-react';
import { usePortal } from '../../lib/context';
import { daysBetween, money, todayISO } from '../../lib/format';
import { btnSecondary, Card, ErrorBanner, inputCls, Loading, PageHeader, StatCard, Tabs } from '../../components/ui';
import { csv1099, threshold1099, use1099, Vendor1099Table } from '../reports/tax';
import { useBills, useVendors } from './data';
import Vendors from './Vendors';
import Bills from './Bills';
import PayBills from './PayBills';
import { Credits, Payments } from './PaymentsCredits';

type Tab = 'bills' | 'pay' | 'payments' | 'credits' | 'vendors' | '1099';

function Tab1099() {
  const [year, setYear] = useState(new Date().getFullYear());
  const { rows, error } = use1099(year);
  const missing = (rows ?? []).filter(r => r.paid >= threshold1099(year) && !r.vendor.tax_id).length;
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <select value={year} onChange={e => setYear(Number(e.target.value))} className={`${inputCls} w-auto`}>{[0, 1, 2].map(i => <option key={i}>{new Date().getFullYear() - i}</option>)}</select>
        {rows && <button onClick={() => csv1099(year, rows)} className={btnSecondary}><Download className="w-4 h-4" /> Export for filing</button>}
      </div>
      {missing > 0 && (
        <div className="flex items-start gap-3 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
          <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
          {missing} vendor{missing === 1 ? '' : 's'} need a 1099 but have no tax ID. Ask them for a W-9 before January 31.
        </div>
      )}
      <ErrorBanner message={error} />
      <Card className="overflow-hidden">{!rows ? <Loading /> : <Vendor1099Table year={year} rows={rows} />}</Card>
    </div>
  );
}

export default function Payables() {
  const { params, go } = usePortal();
  const { vendors, byId, error: vErr, reload: reloadVendors } = useVendors();
  const { bills, error: bErr, reload: reloadBills } = useBills();
  const [tab, setTab] = useState<Tab>((params.tab as Tab) || 'bills');

  if (!vendors || !bills) return vErr || bErr ? <ErrorBanner message={vErr || bErr} /> : <Loading />;

  const today = todayISO();
  const open = bills.filter(b => b.kind === 'bill' && (b.status === 'open' || b.status === 'partial'));
  const owed = open.reduce((s, b) => s + b.total - b.amount_paid, 0);
  const overdue = open.filter(b => b.due_date < today);
  const week = open.filter(b => b.due_date >= today && daysBetween(today, b.due_date) <= 7);
  const changed = () => { reloadBills(); reloadVendors(); };

  return (
    <div className="space-y-6">
      <PageHeader title="Payables" subtitle="Bills from vendors, what you owe, and how it was paid. Purchase orders received in WorkHorse become bills automatically." />
      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="You owe" value={money(owed)} hint={`${open.length} unpaid bills`} icon={<FileText className="w-5 h-5" />} onClick={() => setTab('bills')} />
        <StatCard label="Overdue" value={money(overdue.reduce((s, b) => s + b.total - b.amount_paid, 0))} hint={`${overdue.length} bills past due`} tone={overdue.length ? 'red' : 'gray'} icon={<AlertTriangle className="w-5 h-5" />} onClick={() => setTab('pay')} />
        <StatCard label="Due next 7 days" value={money(week.reduce((s, b) => s + b.total - b.amount_paid, 0))} hint={`${week.length} bills`} tone="amber" icon={<CalendarClock className="w-5 h-5" />} onClick={() => setTab('pay')} />
      </div>
      <div className="flex items-center justify-between gap-3">
        <Tabs value={tab} onChange={setTab} tabs={[
          { id: 'bills', label: 'Bills' }, { id: 'pay', label: 'Pay bills', count: open.length }, { id: 'payments', label: 'Checks & payments' },
          { id: 'credits', label: 'Vendor credits' }, { id: 'vendors', label: 'Vendors', count: vendors.filter(v => v.is_active).length }, { id: '1099', label: '1099s' },
        ]} />
        {tab !== 'pay' && open.length > 0 && <button onClick={() => setTab('pay')} className="hidden md:inline-flex items-center gap-1.5 text-sm font-medium text-blue-600 hover:text-blue-800"><Wallet className="w-4 h-4" /> Pay bills</button>}
      </div>
      {tab === 'bills' && <Bills bills={bills} vendors={vendors} vendorById={byId} onChanged={changed} startNew={!!params.new} vendorFilter={params.vendor} />}
      {tab === 'pay' && <PayBills bills={bills} vendorById={byId} onChanged={changed} />}
      {tab === 'payments' && <Payments bills={bills} vendorById={byId} />}
      {tab === 'credits' && <Credits bills={bills} vendorById={byId} onChanged={changed} />}
      {tab === 'vendors' && <Vendors vendors={vendors} bills={bills} onChanged={changed} onOpenBills={id => go('payables', { tab: 'bills', vendor: id })} />}
      {tab === '1099' && <Tab1099 />}
    </div>
  );
}
