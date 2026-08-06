import { useState, useCallback } from 'react';
import { Plus, DollarSign, Search, FileText, AlertTriangle, Clock, CheckCircle2, Filter } from 'lucide-react';
import { useInvoiceList } from './useInvoices';
import InvoiceDetail from './InvoiceDetail';
import NewInvoiceSlideOver from './NewInvoiceSlideOver';

const STATUS_TABS = [
  { key: '', label: 'All' },
  { key: 'draft', label: 'Draft' },
  { key: 'sent', label: 'Open' },
  { key: 'partial', label: 'Partial' },
  { key: 'overdue', label: 'Overdue' },
  { key: 'paid', label: 'Paid' },
  { key: 'void', label: 'Void' },
];

const STATUS_COLORS: Record<string, string> = {
  draft: 'bg-gray-100 text-gray-700',
  sent: 'bg-blue-100 text-blue-700',
  paid: 'bg-emerald-100 text-emerald-700',
  partial: 'bg-amber-100 text-amber-700',
  overdue: 'bg-red-100 text-red-700',
  void: 'bg-gray-100 text-gray-500',
};

const STATUS_LABELS: Record<string, string> = {
  draft: 'Draft',
  sent: 'Open',
  paid: 'Paid',
  partial: 'Partial',
  overdue: 'Overdue',
  void: 'Void',
};

function formatCurrency(v: number) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(v);
}

function formatDate(d: string | null) {
  if (!d) return '-';
  return new Date(d + 'T00:00:00').toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export default function Invoices() {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [selectedInvoiceId, setSelectedInvoiceId] = useState<string | null>(null);
  const [showNewInvoice, setShowNewInvoice] = useState(false);

  const { invoices, loading, stats, refetch } = useInvoiceList(searchTerm, statusFilter);

  const handleViewInvoice = useCallback((id: string) => {
    setSelectedInvoiceId(id);
  }, []);

  const handleBack = useCallback(() => {
    setSelectedInvoiceId(null);
    refetch();
  }, [refetch]);

  const handleInvoiceCreated = useCallback((id: string) => {
    setShowNewInvoice(false);
    setSelectedInvoiceId(id);
    refetch();
  }, [refetch]);

  if (selectedInvoiceId) {
    return <InvoiceDetail invoiceId={selectedInvoiceId} onBack={handleBack} />;
  }

  const statCards = [
    {
      label: 'Total Invoices',
      value: stats.totalCount.toString(),
      icon: FileText,
      color: 'bg-blue-500',
      iconColor: 'text-blue-600',
      bgLight: 'bg-blue-50',
    },
    {
      label: 'Outstanding',
      value: formatCurrency(stats.outstandingBalance),
      icon: Clock,
      color: 'bg-amber-500',
      iconColor: 'text-amber-600',
      bgLight: 'bg-amber-50',
    },
    {
      label: 'Paid This Month',
      value: formatCurrency(stats.paidThisMonth),
      icon: CheckCircle2,
      color: 'bg-emerald-500',
      iconColor: 'text-emerald-600',
      bgLight: 'bg-emerald-50',
    },
    {
      label: 'Overdue',
      value: stats.overdueCount.toString(),
      icon: AlertTriangle,
      color: 'bg-red-500',
      iconColor: 'text-red-600',
      bgLight: 'bg-red-50',
    },
  ];

  return (
    <div className="p-6 max-w-[1600px] mx-auto">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Invoices</h1>
          <p className="text-gray-500 mt-1">Manage customer invoices and payments</p>
        </div>
        <button
          onClick={() => setShowNewInvoice(true)}
          className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white rounded-xl hover:bg-blue-700 font-semibold text-sm transition-colors shadow-sm"
        >
          <Plus className="h-4 w-4" />
          New Invoice
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-6">
        {statCards.map((stat) => (
          <div
            key={stat.label}
            className="bg-white rounded-xl p-5 shadow-sm border border-gray-100 hover:shadow-md transition-shadow"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">{stat.label}</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">{stat.value}</p>
              </div>
              <div className={`${stat.bgLight} w-11 h-11 rounded-xl flex items-center justify-center`}>
                <stat.icon className={`h-5 w-5 ${stat.iconColor}`} />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 mb-5">
        {/* Search */}
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search invoices..."
            className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
          />
        </div>

        {/* Status tabs */}
        <div className="flex items-center gap-1 bg-gray-100 rounded-xl p-1">
          {STATUS_TABS.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setStatusFilter(tab.key)}
              className={`px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                statusFilter === tab.key
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        {loading ? (
          <div className="py-20 text-center">
            <div className="w-7 h-7 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
            <p className="text-sm text-gray-400">Loading invoices...</p>
          </div>
        ) : invoices.length === 0 ? (
          <div className="py-20 text-center">
            <FileText className="h-10 w-10 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500 font-medium">No invoices found</p>
            <p className="text-sm text-gray-400 mt-1">
              {searchTerm || statusFilter
                ? 'Try adjusting your search or filters'
                : 'Create your first invoice to get started'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50/80 border-b border-gray-100">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Invoice #</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Customer</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Date</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Due Date</th>
                  <th className="px-6 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Total</th>
                  <th className="px-6 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Paid</th>
                  <th className="px-6 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Balance</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {invoices.map((inv) => {
                  const companyName = (inv.companies as { name: string } | null)?.name || 'Unknown';
                  const balance = Number(inv.balance_due) || 0;
                  const isOverdue =
                    inv.status !== 'paid' &&
                    inv.status !== 'void' &&
                    inv.due_date &&
                    new Date(inv.due_date) < new Date() &&
                    balance > 0;

                  return (
                    <tr
                      key={inv.id}
                      onClick={() => handleViewInvoice(inv.id)}
                      className={`hover:bg-blue-50/40 cursor-pointer transition-colors ${
                        isOverdue ? 'bg-red-50/30' : ''
                      }`}
                    >
                      <td className="px-6 py-4">
                        <span className="font-mono text-sm font-semibold text-blue-700">{inv.invoice_number}</span>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900 font-medium">{companyName}</td>
                      <td className="px-6 py-4 text-sm text-gray-600">{formatDate(inv.invoice_date)}</td>
                      <td className={`px-6 py-4 text-sm ${isOverdue ? 'text-red-600 font-semibold' : 'text-gray-600'}`}>
                        {formatDate(inv.due_date)}
                      </td>
                      <td className="px-6 py-4 text-sm font-semibold text-gray-900 text-right">
                        {formatCurrency(Number(inv.total))}
                      </td>
                      <td className="px-6 py-4 text-sm text-emerald-600 font-medium text-right">
                        {formatCurrency(Number(inv.amount_paid))}
                      </td>
                      <td className="px-6 py-4 text-sm font-bold text-gray-900 text-right">
                        {formatCurrency(balance)}
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={`inline-flex px-2.5 py-0.5 text-xs font-semibold rounded-full ${
                            STATUS_COLORS[inv.status] || 'bg-gray-100 text-gray-600'
                          }`}
                        >
                          {STATUS_LABELS[inv.status] || inv.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleViewInvoice(inv.id);
                          }}
                          className="text-blue-600 hover:text-blue-700 text-sm font-semibold hover:underline"
                        >
                          View
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* New Invoice Slide-Over */}
      <NewInvoiceSlideOver
        open={showNewInvoice}
        onClose={() => setShowNewInvoice(false)}
        onCreated={handleInvoiceCreated}
      />
    </div>
  );
}
