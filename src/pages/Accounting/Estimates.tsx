import { useMemo, useState } from 'react';
import { Plus, FileText, Search, Clock, CheckCircle2, DollarSign, AlertCircle, Loader2, Eye, MessageSquare, BookOpen, PenLine } from 'lucide-react';
import { useEstimateList, ESTIMATE_STATUSES, estimateStatusStyles, formatMoney, formatDate } from '../Estimates/useEstimates';
import EstimatePanel from '../Estimates/EstimatePanel';

interface Props {
  onOpenInvoice?: (invoiceId: string) => void;
}

export default function Estimates({ onOpenInvoice }: Props) {
  const { estimates, convertedIds, unreadCounts, loading, error, refetch } = useEstimateList();
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return estimates.filter((e) => {
      if (status && e.status !== status) return false;
      if (!term) return true;
      return (
        e.estimate_number.toLowerCase().includes(term) ||
        (e.companies?.name || '').toLowerCase().includes(term)
      );
    });
  }, [estimates, search, status]);

  const stats = useMemo(() => {
    const pending = estimates.filter((e) => e.status === 'draft' || e.status === 'sent');
    const approved = estimates.filter((e) => e.status === 'approved');
    return [
      { label: 'Total Estimates', value: String(estimates.length), icon: FileText, tone: 'bg-blue-50 text-blue-600' },
      { label: 'Pending', value: String(pending.length), sub: formatMoney(pending.reduce((s, e) => s + Number(e.total), 0)), icon: Clock, tone: 'bg-amber-50 text-amber-600' },
      { label: 'Approved', value: String(approved.length), sub: formatMoney(approved.reduce((s, e) => s + Number(e.total), 0)), icon: CheckCircle2, tone: 'bg-emerald-50 text-emerald-600' },
      { label: 'Total Value', value: formatMoney(estimates.reduce((s, e) => s + Number(e.total), 0)), icon: DollarSign, tone: 'bg-teal-50 text-teal-600' },
    ];
  }, [estimates]);

  return (
    <div className="p-6">
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Estimates</h1>
          <p className="text-gray-600 mt-1">Create, send, and track customer estimates</p>
        </div>
        <button
          onClick={() => setCreating(true)}
          className="inline-flex items-center justify-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium transition-colors shadow-sm"
        >
          <Plus className="h-5 w-5 mr-2" /> New Estimate
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {stats.map((s) => (
          <div key={s.label} className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">{s.label}</p>
                <p className="text-2xl font-bold text-gray-900 mt-2">{loading ? '—' : s.value}</p>
                {s.sub && !loading && <p className="text-xs text-gray-500 mt-1">{s.sub}</p>}
              </div>
              <div className={`h-10 w-10 rounded-lg flex items-center justify-center ${s.tone}`}>
                <s.icon className="h-5 w-5" />
              </div>
            </div>
          </div>
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
              {estimates.length ? 'Try a different search or status.' : 'Create your first estimate to get started.'}
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
