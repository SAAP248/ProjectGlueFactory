import { useMemo, useState } from 'react';
import { Plus, FileText, Search, Clock, CheckCircle2, DollarSign, AlertCircle, Loader2, Eye, MessageSquare, BookOpen, PenLine, Percent } from 'lucide-react';
import { useEstimateList, ESTIMATE_STATUSES, estimateStatusStyles, formatMoney, formatDate, type EstimateRecord as Estimate } from '../Estimates/useEstimates';
import EstimatePanel from '../Estimates/EstimatePanel';
import DateRangePicker from '../../components/DateRangePicker';
import DeltaBadge from '../../components/DeltaBadge';
import PeriodStatCard from '../../components/PeriodStatCard';
import { inRange, useDateRange, type DateRange } from '../../lib/dateRange';

interface Props {
  onOpenInvoice?: (invoiceId: string) => void;
}

function periodStats(estimates: Estimate[], range: DateRange) {
  const list = estimates.filter((e) => inRange(e.estimate_date || e.created_at, range));
  const sum = (xs: Estimate[]) => xs.reduce((s, e) => s + (Number(e.total) || 0), 0);
  const pending = list.filter((e) => e.status === 'draft' || e.status === 'sent');
  const approved = list.filter((e) => e.status === 'approved');
  const decided = list.filter((e) => e.status === 'approved' || e.status === 'declined' || e.status === 'expired');
  return {
    count: list.length,
    value: sum(list),
    pendingCount: pending.length,
    pendingValue: sum(pending),
    approvedCount: approved.length,
    approvedValue: sum(approved),
    decidedCount: decided.length,
    approvalRate: decided.length ? (approved.length / decided.length) * 100 : 0,
  };
}

export default function Estimates({ onOpenInvoice }: Props) {
  const { estimates, convertedIds, unreadCounts, loading, error, refetch } = useEstimateList();
  const { selection: rangeSel, setSelection: setRangeSel, range, previous } = useDateRange('estimates');
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  const inPeriod = useMemo(
    () => estimates.filter((e) => inRange(e.estimate_date || e.created_at, range)),
    [estimates, range]
  );

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return inPeriod.filter((e) => {
      if (status && e.status !== status) return false;
      if (!term) return true;
      return (
        e.estimate_number.toLowerCase().includes(term) ||
        (e.companies?.name || '').toLowerCase().includes(term)
      );
    });
  }, [inPeriod, search, status]);

  const stats = useMemo(() => {
    const c = periodStats(estimates, range);
    const p = previous ? periodStats(estimates, previous) : null;
    return [
      {
        label: 'Total Value',
        value: formatMoney(c.value),
        sub: `${c.count} estimate${c.count === 1 ? '' : 's'}`,
        delta: p && <DeltaBadge cur={c.value} prev={p.value} />,
        icon: DollarSign, iconColor: 'text-teal-600', bgLight: 'bg-teal-50',
      },
      {
        label: 'Pending',
        value: String(c.pendingCount),
        sub: `${formatMoney(c.pendingValue)} awaiting decision`,
        icon: Clock, iconColor: 'text-amber-600', bgLight: 'bg-amber-50',
      },
      {
        label: 'Approved',
        value: String(c.approvedCount),
        sub: `${formatMoney(c.approvedValue)} won`,
        delta: p && <DeltaBadge cur={c.approvedValue} prev={p.approvedValue} />,
        icon: CheckCircle2, iconColor: 'text-emerald-600', bgLight: 'bg-emerald-50',
      },
      {
        label: 'Approval Rate',
        value: c.decidedCount ? `${c.approvalRate.toFixed(0)}%` : '—',
        sub: c.decidedCount ? `${c.approvedCount} of ${c.decidedCount} decided` : 'No decisions yet',
        delta: p && p.decidedCount > 0 && c.decidedCount > 0 && (
          <span className={`text-xs font-semibold rounded-full px-2 py-0.5 ${c.approvalRate >= p.approvalRate ? 'text-emerald-700 bg-emerald-50' : 'text-red-700 bg-red-50'}`}>
            {c.approvalRate >= p.approvalRate ? '+' : ''}{(c.approvalRate - p.approvalRate).toFixed(0)} pts
          </span>
        ),
        icon: Percent, iconColor: 'text-blue-600', bgLight: 'bg-blue-50',
      },
    ];
  }, [estimates, range, previous]);

  return (
    <div className="p-6">
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Estimates</h1>
          <p className="text-gray-600 mt-1">Create, send, and track customer estimates</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <DateRangePicker selection={rangeSel} range={range} onChange={setRangeSel} />
          <button
            onClick={() => setCreating(true)}
            className="inline-flex items-center justify-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium transition-colors shadow-sm"
          >
            <Plus className="h-5 w-5 mr-2" /> New Estimate
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {stats.map(({ label, value, ...rest }) => (
          <PeriodStatCard key={label} label={label} value={loading ? '—' : value} {...rest} />
        ))}
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100">
        <div className="p-4 border-b border-gray-100 flex flex-col lg:flex-row gap-3 lg:items-center justify-between">
          <div className="relative w-full lg:w-80">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by estimate # or customer"
              className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
            />
          </div>
          <div className="flex flex-wrap gap-1.5">
            {['', ...ESTIMATE_STATUSES].map((s) => (
              <button
                key={s || 'all'}
                onClick={() => setStatus(s)}
                className={`px-3 py-1.5 text-sm font-medium rounded-lg capitalize transition-colors ${
                  status === s ? 'bg-gray-900 text-white' : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                {s || 'All'}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="py-20 flex items-center justify-center text-gray-500">
            <Loader2 className="h-5 w-5 animate-spin mr-2" /> Loading estimates...
          </div>
        ) : error ? (
          <div className="py-16 text-center">
            <AlertCircle className="h-10 w-10 text-red-400 mx-auto mb-3" />
            <p className="text-gray-700">{error}</p>
            <button onClick={refetch} className="mt-3 text-sm font-medium text-blue-600 hover:text-blue-700">Try again</button>
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-16 text-center">
            <FileText className="h-10 w-10 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-700 font-medium">{estimates.length ? 'No estimates match your filters' : 'No estimates yet'}</p>
            <p className="text-sm text-gray-500 mt-1">
              {estimates.length ? 'Try a different search, status or date range.' : 'Create your first estimate to get started.'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  {['Estimate #', 'Customer', 'Date', 'Expires', 'Amount', 'Status', ''].map((h) => (
                    <th key={h} className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filtered.map((e) => (
                  <tr key={e.id} onClick={() => setSelectedId(e.id)} className="hover:bg-blue-50/40 cursor-pointer transition-colors group">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        {e.view_mode === 'proposal'
                          ? <BookOpen className="h-5 w-5 text-gray-400 group-hover:text-blue-500 transition-colors" aria-label="Proposal" />
                          : <FileText className="h-5 w-5 text-gray-400 group-hover:text-blue-500 transition-colors" aria-label="Estimate" />}
                        <span className="font-mono text-sm font-semibold text-gray-900">{e.estimate_number}</span>
                        {unreadCounts[e.id] > 0 && (
                          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 text-[11px] font-semibold rounded-full bg-blue-600 text-white" title={`${unreadCounts[e.id]} unread customer message(s)`}>
                            <MessageSquare className="w-3 h-3" /> {unreadCounts[e.id]}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-sm font-medium text-gray-900">{e.companies?.name || '—'}</p>
                      {e.sites?.name && <p className="text-xs text-gray-500">{e.sites.name}</p>}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-700 whitespace-nowrap">{formatDate(e.estimate_date)}</td>
                    <td className="px-6 py-4 text-sm text-gray-700 whitespace-nowrap">{formatDate(e.expiration_date)}</td>
                    <td className="px-6 py-4 text-sm font-semibold text-gray-900 whitespace-nowrap">{formatMoney(e.total)}</td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-1.5">
                        <span className={`px-2.5 py-1 text-xs font-medium rounded-full capitalize ${estimateStatusStyles[e.status] || 'bg-gray-100 text-gray-700'}`}>
                          {e.status}
                        </span>
                        {convertedIds.has(e.id) && (
                          <span className="px-2 py-1 text-xs font-medium rounded-full bg-teal-100 text-teal-800">Invoiced</span>
                        )}
                      </div>
                      {e.accepted_at && e.customer_name_signed ? (
                        <p className="mt-1 flex items-center gap-1 text-xs text-emerald-700"><PenLine className="w-3 h-3" /> Signed by {e.customer_name_signed} &middot; {formatDate(e.accepted_at)}</p>
                      ) : e.declined_at && e.status === 'declined' ? (
                        <p className="mt-1 text-xs text-gray-500">Declined {formatDate(e.declined_at)}</p>
                      ) : e.viewed_at ? (
                        <p className="mt-1 flex items-center gap-1 text-xs text-gray-500"><Eye className="w-3 h-3" /> Viewed {formatDate(e.viewed_at)}</p>
                      ) : null}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <span className="text-sm font-medium text-blue-600 group-hover:text-blue-700">View</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <EstimatePanel
        estimateId={selectedId}
        creating={creating}
        onClose={() => setSelectedId(null)}
        onCreateDone={() => setCreating(false)}
        onOpenEstimate={setSelectedId}
        onChanged={refetch}
        onOpenInvoice={onOpenInvoice}
      />
    </div>
  );
}
