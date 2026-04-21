import { DollarSign, FileText, ClipboardList, AlertTriangle, CheckCircle, Clock } from 'lucide-react';
import type { PortalCompany, PortalInvoice, PortalWorkOrder } from './types';

interface Props {
  company: PortalCompany | null;
  invoices: PortalInvoice[];
  workOrders: PortalWorkOrder[];
  onTabChange: (tab: any) => void;
}

export default function DashboardTab({ company, invoices, workOrders, onTabChange }: Props) {
  const openInvoices = invoices.filter(i => ['open', 'sent', 'partial'].includes(i.status));
  const overdueInvoices = invoices.filter(i => {
    if (!i.due_date) return false;
    return i.balance_due > 0 && new Date(i.due_date) < new Date();
  });
  const totalDue = openInvoices.reduce((s, i) => s + (i.balance_due || 0), 0);
  const activeWOs = workOrders.filter(w => !['completed', 'cancelled'].includes(w.status));
  const completedWOs = workOrders.filter(w => w.status === 'completed');

  return (
    <div className="p-6 space-y-6 max-w-4xl mx-auto">
      {/* Welcome */}
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Account Overview</h2>
        <p className="text-gray-500 text-sm mt-1">{company?.name}</p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <button
          onClick={() => onTabChange('invoices')}
          className="bg-white rounded-2xl border-2 border-gray-200 p-5 text-left hover:border-blue-300 hover:shadow-md transition-all group"
        >
          <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center mb-3">
            <DollarSign className="h-5 w-5 text-blue-600" />
          </div>
          <p className="text-2xl font-bold text-gray-900">${totalDue.toFixed(2)}</p>
          <p className="text-sm text-gray-500 mt-0.5">Balance Due</p>
          {overdueInvoices.length > 0 && (
            <p className="text-xs text-red-600 font-semibold mt-1 flex items-center gap-1">
              <AlertTriangle className="h-3 w-3" />
              {overdueInvoices.length} overdue
            </p>
          )}
        </button>

        <button
          onClick={() => onTabChange('invoices')}
          className="bg-white rounded-2xl border-2 border-gray-200 p-5 text-left hover:border-blue-300 hover:shadow-md transition-all"
        >
          <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center mb-3">
            <FileText className="h-5 w-5 text-amber-600" />
          </div>
          <p className="text-2xl font-bold text-gray-900">{openInvoices.length}</p>
          <p className="text-sm text-gray-500 mt-0.5">Open Invoices</p>
        </button>

        <button
          onClick={() => onTabChange('work-orders')}
          className="bg-white rounded-2xl border-2 border-gray-200 p-5 text-left hover:border-blue-300 hover:shadow-md transition-all"
        >
          <div className="w-10 h-10 rounded-xl bg-teal-100 flex items-center justify-center mb-3">
            <ClipboardList className="h-5 w-5 text-teal-600" />
          </div>
          <p className="text-2xl font-bold text-gray-900">{activeWOs.length}</p>
          <p className="text-sm text-gray-500 mt-0.5">Active Work Orders</p>
        </button>

        <button
          onClick={() => onTabChange('work-orders')}
          className="bg-white rounded-2xl border-2 border-gray-200 p-5 text-left hover:border-blue-300 hover:shadow-md transition-all"
        >
          <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center mb-3">
            <CheckCircle className="h-5 w-5 text-emerald-600" />
          </div>
          <p className="text-2xl font-bold text-gray-900">{completedWOs.length}</p>
          <p className="text-sm text-gray-500 mt-0.5">Completed</p>
        </button>
      </div>

      {/* Open Invoices */}
      {openInvoices.length > 0 && (
        <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
            <h3 className="text-sm font-bold text-gray-900">Outstanding Invoices</h3>
            <button onClick={() => onTabChange('invoices')} className="text-xs text-blue-600 font-semibold hover:underline">View all</button>
          </div>
          <div className="divide-y divide-gray-100">
            {openInvoices.slice(0, 4).map(inv => {
              const isOverdue = inv.due_date && new Date(inv.due_date) < new Date() && inv.balance_due > 0;
              return (
                <div key={inv.id} className="flex items-center justify-between px-5 py-3.5">
                  <div>
                    <p className="text-sm font-semibold text-gray-900">{inv.invoice_number}</p>
                    <p className="text-xs text-gray-500">
                      {inv.due_date ? `Due ${new Date(inv.due_date).toLocaleDateString()}` : 'No due date'}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className={`text-sm font-bold ${isOverdue ? 'text-red-600' : 'text-gray-900'}`}>
                      ${inv.balance_due.toFixed(2)}
                    </p>
                    {isOverdue && (
                      <span className="text-xs font-semibold text-red-500 flex items-center gap-1 justify-end">
                        <AlertTriangle className="h-3 w-3" />
                        Overdue
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Recent Work Orders */}
      {workOrders.length > 0 && (
        <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
            <h3 className="text-sm font-bold text-gray-900">Recent Work Orders</h3>
            <button onClick={() => onTabChange('work-orders')} className="text-xs text-blue-600 font-semibold hover:underline">View all</button>
          </div>
          <div className="divide-y divide-gray-100">
            {workOrders.slice(0, 4).map(wo => (
              <div key={wo.id} className="flex items-center justify-between px-5 py-3.5">
                <div>
                  <p className="text-sm font-semibold text-gray-900">{wo.title}</p>
                  <p className="text-xs text-gray-500">{wo.wo_number} {wo.scheduled_date ? `• ${new Date(wo.scheduled_date + 'T00:00:00').toLocaleDateString()}` : ''}</p>
                </div>
                <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${
                  wo.status === 'completed' ? 'bg-emerald-100 text-emerald-700' :
                  wo.status === 'scheduled' ? 'bg-blue-100 text-blue-700' :
                  wo.status === 'in_progress' ? 'bg-amber-100 text-amber-700' :
                  'bg-gray-100 text-gray-600'
                }`}>
                  {wo.status.replace(/_/g, ' ')}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
