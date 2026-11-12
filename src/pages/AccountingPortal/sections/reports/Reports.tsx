import { useState, type ComponentType } from 'react';
import {
  ArrowLeft, BarChart3, BookOpen, Building2, ChevronRight, Clock, FileCheck, FileText, History, Landmark,
  ListChecks, MapPin, Scale, TrendingUp, Users, Wrench,
} from 'lucide-react';
import { usePortal } from '../../lib/context';
import AccountLedger from '../../components/AccountLedger';
import { AccountSelect, btnGhost, Card, PageHeader } from '../../components/ui';
import { initialRange, type ReportProps } from './ReportFrame';
import { BalanceSheet, CashFlow, ProfitLoss, TrialBalance } from './statements';
import { AuditTrail, JournalReport } from './activity';
import { Aging } from './aging';
import { ProfitByCustomer, ProfitByOffice, ProfitByService } from './profit';
import { Summary1099, TaxByCounty } from './tax';

function LedgerReport({ onBack, params }: ReportProps) {
  const { accounts, byId, go } = usePortal();
  const [accountId, setAccountId] = useState(params.account ?? '');
  const account = byId.get(accountId);
  if (account) {
    return <AccountLedger account={account} onBack={onBack} initialRange={params.from ? initialRange(params) : undefined} />;
  }
  return (
    <div className="space-y-5">
      <button onClick={onBack} className={`${btnGhost} -ml-2`}><ArrowLeft className="w-4 h-4" /> All reports</button>
      <Card className="p-6 max-w-lg">
        <h3 className="text-base font-semibold text-gray-900">Account detail</h3>
        <p className="mt-1 text-sm text-gray-500">Choose an account to see every transaction and its running balance.</p>
        <div className="mt-4">
          <AccountSelect accounts={accounts} value={accountId} onChange={id => { setAccountId(id); go('reports', { report: 'ledger', account: id }); }} />
        </div>
      </Card>
    </div>
  );
}

interface ReportDef { id: string; title: string; desc: string; icon: typeof Scale; Comp: ComponentType<ReportProps> }

const GROUPS: { title: string; reports: ReportDef[] }[] = [
  {
    title: 'Financial statements',
    reports: [
      { id: 'pl', title: 'Profit & Loss', desc: 'Income, costs and net profit, by month or compared to last year', icon: TrendingUp, Comp: ProfitLoss },
      { id: 'balance', title: 'Balance Sheet', desc: 'What the business owns, owes and is worth on a date', icon: Scale, Comp: BalanceSheet },
      { id: 'cashflow', title: 'Cash Flow', desc: 'Where cash came from and where it went', icon: Landmark, Comp: CashFlow },
      { id: 'trial', title: 'Trial Balance', desc: 'Every account balance, debits and credits side by side', icon: ListChecks, Comp: TrialBalance },
    ],
  },
  {
    title: 'Customers & sales',
    reports: [
      { id: 'aging', title: 'Overdue Balances', desc: 'Unpaid invoices grouped by how late they are', icon: Clock, Comp: Aging },
      { id: 'customer', title: 'Profit by Customer', desc: 'Sales, costs and margin for each customer', icon: Users, Comp: ProfitByCustomer },
      { id: 'service', title: 'Profit by Service', desc: 'Margin on equipment, parts, labor and contracts', icon: Wrench, Comp: ProfitByService },
      { id: 'office', title: 'Profit by Office', desc: 'Sales and margin for each office location', icon: Building2, Comp: ProfitByOffice },
    ],
  },
  {
    title: 'Vendors & tax',
    reports: [
      { id: 'county', title: 'Sales Tax by County', desc: 'State, county and city tax collected, ready for the DR-15', icon: MapPin, Comp: TaxByCounty },
      { id: '1099', title: '1099 Summary', desc: 'Contractors and landlords who need a 1099 this year', icon: FileCheck, Comp: Summary1099 },
    ],
  },
  {
    title: 'Activity',
    reports: [
      { id: 'ledger', title: 'Account Detail', desc: 'Every transaction in one account with a running balance', icon: BookOpen, Comp: LedgerReport },
      { id: 'journal', title: 'Journal', desc: 'Every entry line posted in a period', icon: FileText, Comp: JournalReport },
      { id: 'audit', title: 'Audit Trail', desc: 'Who changed what, including month locks and unlocks', icon: History, Comp: AuditTrail },
    ],
  },
];

const ALL = new Map(GROUPS.flatMap(g => g.reports).map(r => [r.id, r]));

export default function Reports() {
  const { params, go } = usePortal();
  const def = params.report ? ALL.get(params.report) : undefined;

  if (def) {
    const { Comp } = def;
    return (
      <Comp
        params={params}
        onBack={() => go('reports')}
        drill={(account, from, to) => go('reports', { report: 'ledger', account, from, to })}
      />
    );
  }

  return (
    <div className="space-y-8">
      <PageHeader title="Reports" subtitle="Every report can be printed or saved as a spreadsheet. Click any amount to see the transactions behind it." />
      {GROUPS.map(g => (
        <section key={g.title}>
          <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-gray-500">{g.title}</h3>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {g.reports.map(r => {
              const Icon = r.icon;
              return (
                <button
                  key={r.id}
                  onClick={() => go('reports', { report: r.id })}
                  className="group text-left bg-white rounded-xl border border-gray-200 p-5 hover:border-blue-300 hover:shadow-sm transition"
                >
                  <div className="flex items-start justify-between">
                    <div className="p-2 rounded-lg bg-blue-50 text-blue-600 group-hover:bg-blue-600 group-hover:text-white transition"><Icon className="w-5 h-5" /></div>
                    <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-blue-600 group-hover:translate-x-0.5 transition" />
                  </div>
                  <p className="mt-3 text-sm font-semibold text-gray-900">{r.title}</p>
                  <p className="mt-1 text-xs text-gray-500 leading-relaxed">{r.desc}</p>
                </button>
              );
            })}
          </div>
        </section>
      ))}
      <p className="flex items-center gap-2 text-xs text-gray-400"><BarChart3 className="w-3.5 h-3.5" /> Budget vs. actual is on the Budgets tab.</p>
    </div>
  );
}
