import { useState, useEffect } from 'react';
import { Plus, Building2, Home, ChevronRight, Star, AlertTriangle, Network, CheckCircle2, CircleDashed, XCircle, MinusCircle } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import NewCustomerModal from '../Customers/NewCustomerModal';
import { QB_SYNC_LABELS, QB_SYNC_STYLES, formatLastSynced, type QbSyncStatus } from '../../lib/quickbooks';

interface Props {
  parentCompanyId: string;
  parentName: string;
  onViewCustomer: (id: string) => void;
}

interface SubRow {
  id: string;
  name: string;
  customer_type: string;
  account_number: string | null;
  status: string;
  is_vip: boolean;
  is_trouble_customer: boolean;
  bill_with_parent: boolean;
  total_revenue: number;
  outstanding_balance: number;
  past_due_amount: number;
  phone: string | null;
  email: string | null;
  quickbooks_id: string | null;
  qb_sync_status: QbSyncStatus;
  qb_last_synced_at: string | null;
}

export default function SubCustomersTab({ parentCompanyId, parentName, onViewCustomer }: Props) {
  const [subs, setSubs] = useState<SubRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNew, setShowNew] = useState(false);

  useEffect(() => {
    load();
  }, [parentCompanyId]);

  async function load() {
    setLoading(true);
    const { data } = await supabase
      .from('companies')
      .select('id, name, customer_type, account_number, status, is_vip, is_trouble_customer, bill_with_parent, total_revenue, outstanding_balance, past_due_amount, phone, email, quickbooks_id, qb_sync_status, qb_last_synced_at')
      .eq('parent_company_id', parentCompanyId)
      .order('name');
    setSubs((data as SubRow[]) || []);
    setLoading(false);
  }

  const totalRevenue = subs.reduce((sum, s) => sum + Number(s.total_revenue || 0), 0);
  const totalOutstanding = subs.reduce((sum, s) => sum + Number(s.outstanding_balance || 0), 0);
  const totalPastDue = subs.reduce((sum, s) => sum + Number(s.past_due_amount || 0), 0);

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <Network className="h-5 w-5 text-blue-600" />
            Sub-customers
          </h2>
          <p className="text-sm text-gray-500 mt-0.5">
            Accounts rolling up to {parentName}.
          </p>
        </div>
        <button
          onClick={() => setShowNew(true)}
          className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus className="h-4 w-4" />
          Add Sub-customer
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm">
          <p className="text-xs font-medium text-gray-500">Sub-customers</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{subs.length}</p>
        </div>
        <div className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm">
          <p className="text-xs font-medium text-gray-500">Combined Revenue</p>
          <p className="text-2xl font-bold text-emerald-600 mt-1">${totalRevenue.toLocaleString()}</p>
        </div>
        <div className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm">
          <p className="text-xs font-medium text-gray-500">Combined Outstanding</p>
          <p className="text-2xl font-bold text-blue-600 mt-1">${totalOutstanding.toLocaleString()}</p>
        </div>
        <div className={`bg-white rounded-xl p-4 border shadow-sm ${totalPastDue > 0 ? 'border-red-200' : 'border-gray-100'}`}>
          <p className="text-xs font-medium text-gray-500">Combined Past Due</p>
          <p className={`text-2xl font-bold mt-1 ${totalPastDue > 0 ? 'text-red-600' : 'text-gray-400'}`}>
            ${totalPastDue.toLocaleString()}
          </p>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-gray-500">Loading sub-customers...</div>
        ) : subs.length === 0 ? (
          <div className="p-12 text-center">
            <Network className="h-10 w-10 text-gray-300 mx-auto mb-3" />
            <p className="text-sm text-gray-500">No sub-customers yet.</p>
            <button
              onClick={() => setShowNew(true)}
              className="mt-3 inline-flex items-center gap-1.5 text-sm font-medium text-blue-600 hover:text-blue-700"
            >
              <Plus className="h-4 w-4" />
              Create the first sub-customer
            </button>
          </div>
        ) : (
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="px-5 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Sub-customer</th>
                <th className="px-5 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">QuickBooks</th>
                <th className="px-5 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Billing</th>
                <th className="px-5 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Status</th>
                <th className="px-5 py-3 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">Revenue</th>
                <th className="px-5 py-3 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">Outstanding</th>
                <th className="px-5 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {subs.map(s => (
                <tr
                  key={s.id}
                  onClick={() => onViewCustomer(s.id)}
                  className="hover:bg-gray-50 cursor-pointer transition-colors"
                >
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                        s.customer_type === 'commercial' ? 'bg-blue-100' : 'bg-green-100'
                      }`}>
                        {s.customer_type === 'commercial'
                          ? <Building2 className="h-4 w-4 text-blue-600" />
                          : <Home className="h-4 w-4 text-green-600" />}
                      </div>
                      <div>
                        <div className="flex items-center gap-1.5">
                          {s.is_vip && <Star className="h-3.5 w-3.5 text-yellow-500 fill-yellow-500" />}
                          {s.is_trouble_customer && <AlertTriangle className="h-3.5 w-3.5 text-red-500" />}
                          <span className="font-semibold text-gray-900">{s.name}</span>
                        </div>
                        {s.account_number && (
                          <div className="text-xs font-mono text-gray-500 mt-0.5">{s.account_number}</div>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-3">
                    {s.quickbooks_id ? (() => {
                      const status = (s.qb_sync_status || 'not_synced') as QbSyncStatus;
                      const st = QB_SYNC_STYLES[status];
                      const Icon = status === 'synced' ? CheckCircle2 : status === 'pending' ? CircleDashed : status === 'error' ? XCircle : MinusCircle;
                      return (
                        <span
                          className={`inline-flex items-center gap-1.5 text-xs font-mono px-2 py-1 rounded-full border ${st.pill}`}
                          title={`${QB_SYNC_LABELS[status]}${s.qb_last_synced_at ? ` · ${formatLastSynced(s.qb_last_synced_at)}` : ''}`}
                        >
                          <Icon className={`h-3.5 w-3.5 ${st.iconColor}`} />
                          {s.quickbooks_id}
                        </span>
                      );
                    })() : (
                      <span className="text-xs text-gray-400">—</span>
                    )}
                  </td>
                  <td className="px-5 py-3">
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                      s.bill_with_parent ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-600'
                    }`}>
                      {s.bill_with_parent ? 'Billed to parent' : 'Billed separately'}
                    </span>
                  </td>
                  <td className="px-5 py-3">
                    <span className={`px-2 py-1 text-xs font-medium rounded-full capitalize ${
                      s.status === 'active' ? 'bg-emerald-100 text-emerald-800' : 'bg-gray-100 text-gray-600'
                    }`}>
                      {s.status}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-right text-sm font-medium text-gray-900">
                    ${Number(s.total_revenue).toLocaleString()}
                  </td>
                  <td className="px-5 py-3 text-right">
                    <div className="text-sm font-medium text-gray-900">${Number(s.outstanding_balance).toLocaleString()}</div>
                    {Number(s.past_due_amount) > 0 && (
                      <div className="text-xs text-red-600 font-medium">Past due: ${Number(s.past_due_amount).toLocaleString()}</div>
                    )}
                  </td>
                  <td className="px-5 py-3 text-right">
                    <ChevronRight className="h-4 w-4 text-gray-400 inline" />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {showNew && (
        <NewCustomerModal
          defaultParentId={parentCompanyId}
          onClose={() => setShowNew(false)}
          onCreated={() => {
            setShowNew(false);
            load();
          }}
        />
      )}
    </div>
  );
}
