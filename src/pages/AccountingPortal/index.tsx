import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  BookOpen, CalendarCheck, Check, FileSpreadsheet, Landmark, LayoutDashboard, ListTree, Loader2, Percent,
  PiggyBank, Receipt, RefreshCw, Settings, Wallet,
} from 'lucide-react';
import { errMsg, getActor, syncWorkhorse, useAccounts } from './lib/api';
import { PortalContext, type GoParams, type PortalContextValue, type Section } from './lib/context';
import type { Nav } from './lib/types';
import EntryModal from './components/EntryModal';
import { ErrorBanner, Loading } from './components/ui';
import Overview from './sections/Overview';
import Banking from './sections/banking/Banking';
import Payables from './sections/payables/Payables';
import Journal from './sections/Journal';
import ChartOfAccounts from './sections/ChartOfAccounts';
import Reports from './sections/reports/Reports';
import Close from './sections/Close';
import SalesTax from './sections/SalesTax';
import Budgets from './sections/Budgets';
import AcctSettings from './sections/AcctSettings';

const SECTIONS: { id: Section; label: string; icon: typeof Landmark }[] = [
  { id: 'home', label: 'Overview', icon: LayoutDashboard },
  { id: 'banking', label: 'Banking', icon: Wallet },
  { id: 'payables', label: 'Payables', icon: Receipt },
  { id: 'journal', label: 'Journal', icon: BookOpen },
  { id: 'accounts', label: 'Chart of Accounts', icon: ListTree },
  { id: 'reports', label: 'Reports', icon: FileSpreadsheet },
  { id: 'close', label: 'Month Close', icon: CalendarCheck },
  { id: 'tax', label: 'Sales Tax', icon: Percent },
  { id: 'budgets', label: 'Budgets', icon: PiggyBank },
  { id: 'settings', label: 'Settings', icon: Settings },
];

export default function AccountingPortal({ onOpenInvoice, onViewCustomer }: Nav) {
  const { accounts, byId, byCode, loading, error: acctError, reload } = useAccounts();
  const [section, setSection] = useState<Section>('home');
  const [params, setParams] = useState<GoParams>({});
  const [entryId, setEntryId] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [syncing, setSyncing] = useState(true);
  const [syncError, setSyncError] = useState('');
  const [lastSync, setLastSync] = useState<Date | null>(null);
  const [toast, setToast] = useState('');

  const runSync = useCallback(async () => {
    setSyncing(true);
    setSyncError('');
    try {
      await syncWorkhorse();
      setLastSync(new Date());
      setRefreshKey(k => k + 1);
    } catch (e) {
      setSyncError(`Could not bring in the latest WorkHorse activity: ${errMsg(e)}`);
    } finally {
      setSyncing(false);
    }
  }, []);

  useEffect(() => { runSync(); }, [runSync]);

  useEffect(() => {
    document.body.classList.add('acct-printing');
    return () => document.body.classList.remove('acct-printing');
  }, []);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(''), 3200);
    return () => clearTimeout(t);
  }, [toast]);

  const go = useCallback((s: Section, p: GoParams = {}) => {
    setSection(s);
    setParams(p);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  const ctx = useMemo<PortalContextValue>(() => ({
    accounts, byId, byCode, reloadAccounts: reload, params, go,
    openEntry: setEntryId, actor: getActor(), refreshKey,
    refresh: () => setRefreshKey(k => k + 1), notify: setToast,
    onOpenInvoice, onViewCustomer,
  }), [accounts, byId, byCode, reload, params, go, refreshKey, onOpenInvoice, onViewCustomer]);

  const Page = {
    home: Overview, banking: Banking, payables: Payables, journal: Journal, accounts: ChartOfAccounts,
    reports: Reports, close: Close, tax: SalesTax, budgets: Budgets, settings: AcctSettings,
  }[section];

  return (
    <PortalContext.Provider value={ctx}>
      <div className="min-h-full bg-gray-50">
        <div className="bg-white border-b border-gray-200 no-print">
          <div className="px-6 pt-5 pb-0">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-blue-600 text-white"><Landmark className="w-5 h-5" /></div>
                <div>
                  <h1 className="text-lg font-bold text-gray-900 leading-tight">WorkHorse Books</h1>
                  <p className="text-xs text-gray-500">Accounting connected to every invoice, payment and job in WorkHorse</p>
                </div>
              </div>
              <button
                onClick={runSync}
                disabled={syncing}
                className="inline-flex items-center gap-2 px-3 py-1.5 text-xs font-medium text-gray-600 rounded-lg border border-gray-200 hover:bg-gray-50 transition disabled:opacity-60"
              >
                {syncing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : lastSync ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <RefreshCw className="w-3.5 h-3.5" />}
                {syncing ? 'Updating books...' : lastSync ? `Up to date · ${lastSync.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}` : 'Update books'}
              </button>
            </div>
            <nav className="mt-4 -mb-px flex gap-1 overflow-x-auto">
              {SECTIONS.map(s => {
                const Icon = s.icon;
                const active = s.id === section;
                return (
                  <button
                    key={s.id}
                    onClick={() => go(s.id)}
                    className={`flex items-center gap-2 px-3 py-2.5 text-sm font-medium whitespace-nowrap border-b-2 transition ${active ? 'border-blue-600 text-blue-700' : 'border-transparent text-gray-500 hover:text-gray-900 hover:border-gray-300'}`}
                  >
                    <Icon className="w-4 h-4" /> {s.label}
                  </button>
                );
              })}
            </nav>
          </div>
        </div>

        <div className="acct-print-area p-6 space-y-6">
          {syncError && <ErrorBanner message={syncError} onClose={() => setSyncError('')} />}
          {acctError && <ErrorBanner message={acctError} />}
          {loading ? <Loading label="Opening the books..." /> : <Page key={`${section}:${JSON.stringify(params)}`} />}
        </div>

        <EntryModal entryId={entryId} onClose={() => setEntryId(null)} />

        {toast && (
          <div className="fixed bottom-6 right-6 z-[60] flex items-center gap-2 px-4 py-3 rounded-lg bg-gray-900 text-white text-sm shadow-lg animate-[popIn_.18s_ease-out] no-print">
            <Check className="w-4 h-4 text-emerald-400" /> {toast}
          </div>
        )}
      </div>
    </PortalContext.Provider>
  );
}
