import { useState, useCallback, useMemo } from 'react';
import { Plus, Search, FileText, AlertTriangle, Clock, CheckCircle2, Layers, X } from 'lucide-react';
import { useInvoiceList, type Invoice } from './useInvoices';
import { useConsolidatedList, summarize } from './consolidated';
import InvoiceDetail from './InvoiceDetail';
import NewInvoiceSlideOver from './NewInvoiceSlideOver';
import ConsolidatedInvoiceDetail from './ConsolidatedInvoiceDetail';
import NewConsolidatedModal from './NewConsolidatedModal';
import InvoiceListTable, { type ListRow } from './InvoiceListTable';
import { formatCurrency } from './invoiceFormat';
import { invoiceDate, invoicePeriodStats } from './invoiceStats';
import DateRangePicker from '../../components/DateRangePicker';
import DeltaBadge from '../../components/DeltaBadge';
import PeriodStatCard from '../../components/PeriodStatCard';
import { inRange, useDateRange } from '../../lib/dateRange';
import { summarize as summarizeTxns, useTransactions } from '../Accounting/Transactions/useTransactions';

const STATUS_TABS = [
  { key: '', label: 'All' },
  { key: 'draft', label: 'Draft' },
  { key: 'sent', label: 'Open' },
  { key: 'partial', label: 'Partial' },
  { key: 'overdue', label: 'Overdue' },
  { key: 'paid', label: 'Paid' },
  { key: 'void', label: 'Void' },
];

type TypeFilter = 'all' | 'regular' | 'consolidated';

const TYPE_TABS: { key: TypeFilter; label: string }[] = [
  { key: 'all', label: 'All types' },
  { key: 'regular', label: 'Invoices' },
  { key: 'consolidated', label: 'Consolidated' },
];

function matchesInvoice(inv: Invoice, term: string) {
  return (
    inv.invoice_number?.toLowerCase().includes(term) ||
    inv.notes?.toLowerCase().includes(term) ||
    inv.companies?.name?.toLowerCase().includes(term)
  );
}

function rowDate(row: ListRow) {
  return row.kind === 'ci' ? row.ci.invoice_date || row.ci.created_at : invoiceDate(row.inv);
}

export default function Invoices({ initialInvoiceId = null }: { initialInvoiceId?: string | null }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('all');
  const [selectedInvoiceId, setSelectedInvoiceId] = useState<string | null>(initialInvoiceId);
  const [selectedCiId, setSelectedCiId] = useState<string | null>(null);
  const [returnToCiId, setReturnToCiId] = useState<string | null>(null);
  const [showNewInvoice, setShowNewInvoice] = useState(false);
  const [newCi, setNewCi] = useState<{ companyId: string | null; ids: string[] } | null>(null);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const [selection, setSelection] = useState<Map<string, Invoice>>(new Map());

  const { invoices, loading, refetch } = useInvoiceList();
  const { items: consolidated, loading: ciLoading, refetch: refetchCi } = useConsolidatedList();
  const { transactions, refetch: refetchTxns } = useTransactions();
  const { selection: rangeSel, setSelection: setRangeSel, range, previous } = useDateRange('invoices');

  const refreshAll = useCallback(() => {
    refetch();
    refetchCi();
    refetchTxns();
  }, [refetch, refetchCi, refetchTxns]);

  const ciNumbers = useMemo(
    () => new Map(consolidated.map((c) => [c.id, c.consolidated_number])),
    [consolidated]
  );

  const rows: ListRow[] = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    const ciRows: ListRow[] = consolidated
      .filter((ci) => inRange(ci.invoice_date || ci.created_at, range))
      .map((ci) => {
        const summary = summarize(ci);
        const matched = new Set(term ? ci.invoices.filter((i) => matchesInvoice(i, term)).map((i) => i.id) : []);
        return { kind: 'ci' as const, ci, summary, matched };
      })
      .filter(({ ci, summary, matched }) => {
        if (statusFilter && summary.status !== statusFilter) return false;
        if (!term) return true;
        return (
          ci.consolidated_number.toLowerCase().includes(term) ||
          ci.companies?.name?.toLowerCase().includes(term) ||
          ci.notes?.toLowerCase().includes(term) ||
          matched.size > 0
        );
      });

    const invRows: ListRow[] = invoices
      .filter((inv) => typeFilter === 'regular' || !inv.consolidated_invoice_id)
      .filter((inv) => inRange(invoiceDate(inv), range))
      .filter((inv) => !statusFilter || inv.status === statusFilter)
      .filter((inv) => !term || matchesInvoice(inv, term))
      .map((inv) => ({ kind: 'inv' as const, inv }));

    const combined =
      typeFilter === 'consolidated' ? ciRows : typeFilter === 'regular' ? invRows : [...ciRows, ...invRows];
    return combined.sort((a, b) => rowDate(b).localeCompare(rowDate(a)));
  }, [consolidated, invoices, searchTerm, statusFilter, typeFilter, range]);

  const periodStats = useMemo(() => {
    const cur = invoicePeriodStats(invoices, range);
    const prev = previous ? invoicePeriodStats(invoices, previous) : null;
    const collected = summarizeTxns(transactions, range).net;
    const prevCollected = previous ? summarizeTxns(transactions, previous).net : undefined;
    const openCi = consolidated.filter((c) => {
      const s = summarize(c).status;
      return s !== 'paid' && s !== 'void' && inRange(c.invoice_date || c.created_at, range);
    });
    return { cur, prev, collected, prevCollected, openCi };
  }, [invoices, transactions, consolidated, range, previous]);

  const effectiveExpanded = useMemo(() => {
    const next = new Set(expanded);
    rows.forEach((r) => {
      if (r.kind === 'ci' && r.matched.size > 0) next.add(r.ci.id);
    });
    collapsed.forEach((id) => next.delete(id));
    return next;
  }, [expanded, collapsed, rows]);

  const selectedList = [...selection.values()];
  const selectionCompanies = new Set(selectedList.map((i) => i.company_id));
  const canConsolidate = selectedList.length >= 2 && selectionCompanies.size === 1;

  const toggleExpand = (id: string) => {
    const open = effectiveExpanded.has(id);
    setExpanded((prev) => {
      const next = new Set(prev);
      if (open) next.delete(id);
      else next.add(id);
      return next;
    });
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (open) next.add(id);
      else next.delete(id);
      return next;
    });
  };

  const toggleSelect = (inv: Invoice) =>
    setSelection((prev) => {
      const next = new Map(prev);
      if (next.has(inv.id)) next.delete(inv.id);
      else next.set(inv.id, inv);
      return next;
    });

  const openInvoice = useCallback((id: string) => setSelectedInvoiceId(id), []);

  const handleInvoiceCreated = useCallback(
    (id: string) => {
      setShowNewInvoice(false);
      setSelectedInvoiceId(id);
      refetch();
    },
    [refetch]
  );

  const handleCiCreated = (id: string) => {
    setNewCi(null);
    setSelection(new Map());
    setSelectedCiId(id);
    refreshAll();
  };

  if (selectedInvoiceId) {
    return (
      <InvoiceDetail
        invoiceId={selectedInvoiceId}
        onBack={() => {
          setSelectedInvoiceId(null);
          if (returnToCiId) {
            setSelectedCiId(returnToCiId);
            setReturnToCiId(null);
          }
          refreshAll();
        }}
      />
    );
  }

  if (selectedCiId) {
    return (
      <ConsolidatedInvoiceDetail
        consolidatedId={selectedCiId}
        onBack={() => {
          setSelectedCiId(null);
          refreshAll();
        }}
        onOpenInvoice={(id) => {
          setReturnToCiId(selectedCiId);
          setSelectedCiId(null);
          setSelectedInvoiceId(id);
        }}
      />
    );
  }

  const { cur, prev, collected, prevCollected, openCi } = periodStats;
  const openCiBalance = openCi.reduce((s, c) => s + summarize(c).balance, 0);

  const statCards = [
    {
      label: 'Invoices Issued',
      value: cur.issued.toLocaleString(),
      sub: `${formatCurrency(cur.billed)} billed`,
      delta: prev && <DeltaBadge cur={cur.billed} prev={prev.billed} />,
      icon: FileText, iconColor: 'text-blue-600', bgLight: 'bg-blue-50',
    },
    {
      label: 'Outstanding',
      value: formatCurrency(cur.outstanding),
      sub: `${cur.openCount} unpaid invoice${cur.openCount === 1 ? '' : 's'}`,
      icon: Clock, iconColor: 'text-amber-600', bgLight: 'bg-amber-50',
    },
    {
      label: 'Collected',
      value: formatCurrency(collected),
      sub: 'Payments received in period',
      delta: <DeltaBadge cur={collected} prev={prevCollected} />,
      icon: CheckCircle2, iconColor: 'text-emerald-600', bgLight: 'bg-emerald-50',
    },
    {
      label: 'Overdue',
      value: cur.overdueCount.toString(),
      sub: `${formatCurrency(cur.overdueAmount)} past due`,
      icon: AlertTriangle, iconColor: 'text-red-600', bgLight: 'bg-red-50',
    },
    {
      label: 'Open Consolidated',
      value: openCi.length.toString(),
      sub: `${formatCurrency(openCiBalance)} balance`,
      icon: Layers, iconColor: 'text-teal-600', bgLight: 'bg-teal-50',
    },
  ];

  const isLoading = loading || ciLoading;

  return (
    <div className="p-6 max-w-[1600px] mx-auto">
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Invoices</h1>
          <p className="text-gray-500 mt-1">Regular and consolidated invoices in one place</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <DateRangePicker selection={rangeSel} range={range} onChange={setRangeSel} />
          <button
            onClick={() => setNewCi({ companyId: null, ids: [] })}
            className="flex items-center gap-2 px-4 py-2.5 bg-white border border-gray-200 text-gray-700 rounded-xl hover:bg-gray-50 font-semibold text-sm transition-colors"
          >
            <Layers className="h-4 w-4 text-teal-600" />
            New Consolidated
          </button>
          <button
            onClick={() => setShowNewInvoice(true)}
            className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white rounded-xl hover:bg-blue-700 font-semibold text-sm transition-colors shadow-sm"
          >
            <Plus className="h-4 w-4" />
            New Invoice
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
        {statCards.map(({ label, ...rest }) => (
          <PeriodStatCard key={label} label={label} {...rest} />
        ))}
      </div>

      <div className="flex flex-col xl:flex-row items-start xl:items-center gap-3 mb-5">
        <div className="relative flex-1 w-full max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search invoice #, CI #, customer..."
            className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
          />
        </div>

        <div className="flex items-center gap-1 bg-gray-100 rounded-xl p-1">
          {TYPE_TABS.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setTypeFilter(tab.key)}
              className={`px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                typeFilter === tab.key ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-1 bg-gray-100 rounded-xl p-1">
          {STATUS_TABS.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setStatusFilter(tab.key)}
              className={`px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                statusFilter === tab.key ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {selectedList.length > 0 && (
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3 px-4 py-3 rounded-xl bg-blue-50 border border-blue-100">
          <div className="text-sm text-blue-900">
            <span className="font-semibold">{selectedList.length}</span> selected
            {selectionCompanies.size > 1 && (
              <span className="ml-3 text-amber-700">Select invoices from a single customer to consolidate</span>
            )}
            {selectedList.length === 1 && <span className="ml-3 text-blue-700">Select at least 2 to consolidate</span>}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setSelection(new Map())}
              className="flex items-center gap-1 px-3 py-1.5 text-sm font-semibold text-blue-700 hover:bg-blue-100 rounded-lg"
            >
              <X className="h-4 w-4" /> Clear
            </button>
            <button
              disabled={!canConsolidate}
              onClick={() => setNewCi({ companyId: selectedList[0].company_id, ids: selectedList.map((i) => i.id) })}
              className="flex items-center gap-2 px-4 py-1.5 text-sm font-semibold text-white bg-teal-600 hover:bg-teal-700 rounded-lg disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              <Layers className="h-4 w-4" /> Consolidate selected
            </button>
          </div>
        </div>
      )}

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        {isLoading ? (
          <div className="py-20 text-center">
            <div className="w-7 h-7 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
            <p className="text-sm text-gray-400">Loading invoices...</p>
          </div>
        ) : rows.length === 0 ? (
          <div className="py-20 text-center">
            <FileText className="h-10 w-10 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500 font-medium">No invoices found</p>
            <p className="text-sm text-gray-400 mt-1">
              {searchTerm || statusFilter || typeFilter !== 'all' || range.from
                ? 'Try adjusting your search, filters or date range'
                : 'Create your first invoice to get started'}
            </p>
          </div>
        ) : (
          <InvoiceListTable
            rows={rows}
            ciNumbers={ciNumbers}
            expanded={effectiveExpanded}
            selected={new Set(selection.keys())}
            onToggleExpand={toggleExpand}
            onToggleSelect={toggleSelect}
            onOpenInvoice={openInvoice}
            onOpenConsolidated={setSelectedCiId}
          />
        )}
      </div>

      <NewInvoiceSlideOver
        open={showNewInvoice}
        onClose={() => setShowNewInvoice(false)}
        onCreated={handleInvoiceCreated}
      />

      <NewConsolidatedModal
        open={!!newCi}
        onClose={() => setNewCi(null)}
        onCreated={handleCiCreated}
        initialCompanyId={newCi?.companyId ?? null}
        initialInvoiceIds={newCi?.ids ?? []}
        lockCompany={!!newCi?.companyId}
      />
    </div>
  );
}
