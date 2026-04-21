import { useState, useEffect, useMemo } from 'react';
import { Search, Plus, Star, TrendingUp, TrendingDown, Phone, ChevronRight, ChevronDown, Building2, Home, AlertTriangle, Network, CornerDownRight, CheckCircle2, CircleDashed, XCircle, MinusCircle } from 'lucide-react';
import { supabase } from '../lib/supabase';
import NewCustomerModal from './Customers/NewCustomerModal';
import { QB_SYNC_LABELS, QB_SYNC_STYLES, formatLastSynced, type QbSyncStatus } from '../lib/quickbooks';

interface CustomerRow {
  id: string;
  name: string;
  customer_type: string;
  account_number: string;
  status: string;
  is_vip: boolean;
  is_trouble_customer: boolean;
  total_revenue: number;
  outstanding_balance: number;
  past_due_amount: number;
  phone: string;
  email: string;
  tags: string[];
  billing_city: string;
  billing_state: string;
  parent_company_id: string | null;
  bill_with_parent: boolean;
  quickbooks_id: string | null;
  qb_sync_status: QbSyncStatus;
  qb_last_synced_at: string | null;
}

interface Props {
  onViewCustomer: (id: string) => void;
}

export default function Customers({ onViewCustomer }: Props) {
  const [customers, setCustomers] = useState<CustomerRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [troubleFilter, setTroubleFilter] = useState(false);
  const [showAllLevels, setShowAllLevels] = useState(false);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [showNewModal, setShowNewModal] = useState(false);

  useEffect(() => {
    fetchCustomers();
  }, []);

  async function fetchCustomers() {
    setLoading(true);
    const { data } = await supabase
      .from('companies')
      .select('id, name, customer_type, account_number, status, is_vip, is_trouble_customer, total_revenue, outstanding_balance, past_due_amount, phone, email, tags, billing_city, billing_state, parent_company_id, bill_with_parent, quickbooks_id, qb_sync_status, qb_last_synced_at')
      .order('name');
    if (data) setCustomers(data as CustomerRow[]);
    setLoading(false);
  }

  const childrenByParent = useMemo(() => {
    const map = new Map<string, CustomerRow[]>();
    for (const c of customers) {
      if (c.parent_company_id) {
        const arr = map.get(c.parent_company_id) || [];
        arr.push(c);
        map.set(c.parent_company_id, arr);
      }
    }
    return map;
  }, [customers]);

  function matchesFilters(c: CustomerRow): boolean {
    const matchSearch =
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.account_number?.toLowerCase().includes(search.toLowerCase()) ||
      c.email?.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === 'all' || c.status === statusFilter;
    const matchType = typeFilter === 'all' || c.customer_type === typeFilter;
    const matchTrouble = !troubleFilter || c.is_trouble_customer;
    return matchSearch && matchStatus && matchType && matchTrouble;
  }

  const displayRows = useMemo(() => {
    const rows: Array<{ customer: CustomerRow; depth: 0 | 1; childCount: number }> = [];

    if (showAllLevels) {
      const visible = customers.filter(matchesFilters);
      for (const c of visible) {
        rows.push({
          customer: c,
          depth: c.parent_company_id ? 1 : 0,
          childCount: childrenByParent.get(c.id)?.length || 0,
        });
      }
      return rows;
    }

    const parents = customers.filter(c => !c.parent_company_id);
    for (const parent of parents) {
      const kids = childrenByParent.get(parent.id) || [];
      const parentHit = matchesFilters(parent);
      const matchingKids = kids.filter(matchesFilters);

      if (!parentHit && matchingKids.length === 0) continue;

      rows.push({ customer: parent, depth: 0, childCount: kids.length });

      if (expanded.has(parent.id)) {
        const toShow = parentHit ? kids : matchingKids;
        for (const kid of toShow) {
          rows.push({ customer: kid, depth: 1, childCount: 0 });
        }
      }
    }
    return rows;
  }, [customers, childrenByParent, search, statusFilter, typeFilter, troubleFilter, showAllLevels, expanded]);

  function toggleExpanded(id: string) {
    setExpanded(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  const total = customers.length;
  const topLevel = customers.filter(c => !c.parent_company_id).length;
  const masterAccounts = customers.filter(c => !c.parent_company_id && (childrenByParent.get(c.id)?.length || 0) > 0).length;
  const subCustomers = customers.filter(c => c.parent_company_id).length;
  const commercial = customers.filter(c => c.customer_type === 'commercial').length;
  const vip = customers.filter(c => c.is_vip).length;
  const trouble = customers.filter(c => c.is_trouble_customer).length;

  const stats = [
    { label: 'Total Customers', value: total.toLocaleString(), change: '+12%', trending: 'up' as const },
    { label: 'Master Accounts', value: masterAccounts.toLocaleString(), sub: `${topLevel} top-level`, icon: Network },
    { label: 'Sub-customers', value: subCustomers.toLocaleString(), sub: total ? `${Math.round((subCustomers / total) * 100)}% of base` : '0%' },
    { label: 'Commercial', value: commercial.toLocaleString(), percentage: total ? `${Math.round((commercial / total) * 100)}%` : '0%' },
    { label: 'VIP Customers', value: vip.toLocaleString(), icon: Star },
    { label: 'Trouble Customers', value: trouble.toLocaleString(), icon: AlertTriangle, alert: true },
  ];

  const tagColor = (tag: string) => {
    if (tag === 'Past Due') return 'bg-red-100 text-red-700';
    if (tag === 'Priority') return 'bg-orange-100 text-orange-700';
    if (tag === 'Large Account') return 'bg-blue-100 text-blue-700';
    return 'bg-gray-100 text-gray-600';
  };

  return (
    <div className="p-6">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Customers</h1>
          <p className="text-gray-600 mt-1">Manage your customer accounts and relationships</p>
        </div>
        <button
          onClick={() => setShowNewModal(true)}
          className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium transition-colors"
        >
          <Plus className="h-5 w-5 mr-2" />
          New Customer
        </button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-6">
        {stats.map((stat, index) => (
          <div key={index} className={`bg-white rounded-xl p-5 shadow-sm border ${(stat as any).alert && trouble > 0 ? 'border-red-200' : 'border-gray-100'}`}>
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-medium text-gray-600">{stat.label}</p>
              {stat.icon && <stat.icon className={`h-4 w-4 ${(stat as any).alert ? 'text-red-500' : 'text-gray-400'}`} />}
            </div>
            <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
            {stat.change && (
              <div className="flex items-center mt-2">
                {stat.trending === 'up'
                  ? <TrendingUp className="h-4 w-4 text-green-600 mr-1" />
                  : <TrendingDown className="h-4 w-4 text-red-600 mr-1" />}
                <span className={`text-xs font-medium ${stat.trending === 'up' ? 'text-green-600' : 'text-red-600'}`}>
                  {stat.change}
                </span>
              </div>
            )}
            {(stat as any).percentage && (
              <p className="text-xs text-gray-600 mt-1">{(stat as any).percentage} of total</p>
            )}
            {(stat as any).sub && (
              <p className="text-xs text-gray-500 mt-1">{(stat as any).sub}</p>
            )}
          </div>
        ))}
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100">
        <div className="p-6 border-b border-gray-100">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div className="relative flex-1 min-w-[240px] max-w-md">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search by name, account, or email..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="pl-10 pr-4 py-2 w-full border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div className="flex items-center space-x-2 flex-wrap gap-y-2">
              <select
                value={statusFilter}
                onChange={e => setStatusFilter(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
              >
                <option value="all">All Status</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
              <select
                value={typeFilter}
                onChange={e => setTypeFilter(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
              >
                <option value="all">All Types</option>
                <option value="commercial">Commercial</option>
                <option value="residential">Residential</option>
              </select>
              <button
                onClick={() => setTroubleFilter(t => !t)}
                className={`flex items-center gap-1.5 px-3 py-2 text-sm font-medium rounded-lg border transition-all ${
                  troubleFilter
                    ? 'bg-red-50 border-red-300 text-red-700'
                    : 'bg-white border-gray-300 text-gray-600 hover:border-gray-400'
                }`}
              >
                <AlertTriangle className="h-4 w-4" />
                Trouble
              </button>
              <button
                onClick={() => setShowAllLevels(v => !v)}
                className={`flex items-center gap-1.5 px-3 py-2 text-sm font-medium rounded-lg border transition-all ${
                  showAllLevels
                    ? 'bg-blue-50 border-blue-300 text-blue-700'
                    : 'bg-white border-gray-300 text-gray-600 hover:border-gray-400'
                }`}
                title={showAllLevels ? 'Showing all accounts flat' : 'Showing master accounts with sub-customers nested'}
              >
                <Network className="h-4 w-4" />
                {showAllLevels ? 'Flat view' : 'Tree view'}
              </button>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="p-12 text-center text-gray-500">Loading customers...</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Customer</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Account #</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">QuickBooks</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Type</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Revenue</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Outstanding</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Tags</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {displayRows.map(({ customer, depth, childCount }) => {
                  const isExpanded = expanded.has(customer.id);
                  const isParent = childCount > 0;
                  return (
                    <tr
                      key={customer.id}
                      className={`hover:bg-gray-50 cursor-pointer transition-colors ${
                        depth === 1 ? 'bg-gray-50/40' : ''
                      }`}
                      onClick={() => onViewCustomer(customer.id)}
                    >
                      <td className="px-6 py-4">
                        <div className="flex items-center" style={{ paddingLeft: depth === 1 ? 28 : 0 }}>
                          {depth === 1 && (
                            <CornerDownRight className="h-3.5 w-3.5 text-gray-300 mr-2 flex-shrink-0" />
                          )}
                          {depth === 0 && isParent && !showAllLevels ? (
                            <button
                              onClick={e => { e.stopPropagation(); toggleExpanded(customer.id); }}
                              className="p-0.5 mr-1 text-gray-400 hover:text-gray-700 hover:bg-gray-200 rounded transition-colors flex-shrink-0"
                            >
                              {isExpanded
                                ? <ChevronDown className="h-4 w-4" />
                                : <ChevronRight className="h-4 w-4" />}
                            </button>
                          ) : depth === 0 && !showAllLevels ? (
                            <span className="inline-block w-[22px] flex-shrink-0" />
                          ) : null}
                          <div className={`w-9 h-9 rounded-lg flex items-center justify-center mr-3 flex-shrink-0 ${
                            customer.customer_type === 'commercial' ? 'bg-blue-100' : 'bg-green-100'
                          }`}>
                            {customer.customer_type === 'commercial'
                              ? <Building2 className="h-5 w-5 text-blue-600" />
                              : <Home className="h-5 w-5 text-green-600" />}
                          </div>
                          <div>
                            <div className="flex items-center gap-2 flex-wrap">
                              {customer.is_vip && <Star className="h-3.5 w-3.5 text-yellow-500 fill-yellow-500 flex-shrink-0" />}
                              {customer.is_trouble_customer && <AlertTriangle className="h-3.5 w-3.5 text-red-500 flex-shrink-0" />}
                              <span className="font-semibold text-gray-900">{customer.name}</span>
                              {isParent && depth === 0 && (
                                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 text-[10px] font-semibold rounded bg-blue-50 text-blue-700 border border-blue-200">
                                  <Network className="h-2.5 w-2.5" />
                                  Master · {childCount}
                                </span>
                              )}
                              {depth === 1 && customer.bill_with_parent && (
                                <span className="inline-flex items-center px-1.5 py-0.5 text-[10px] font-medium rounded bg-emerald-50 text-emerald-700 border border-emerald-200">
                                  Billed to parent
                                </span>
                              )}
                            </div>
                            <div className="text-xs text-gray-500 flex items-center mt-0.5">
                              <Phone className="h-3 w-3 mr-1" />
                              {customer.phone || '—'}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700 font-mono">{customer.account_number}</td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {customer.quickbooks_id ? (() => {
                          const status = (customer.qb_sync_status || 'not_synced') as QbSyncStatus;
                          const s = QB_SYNC_STYLES[status];
                          const Icon = status === 'synced' ? CheckCircle2 : status === 'pending' ? CircleDashed : status === 'error' ? XCircle : MinusCircle;
                          return (
                            <span
                              className={`inline-flex items-center gap-1.5 text-xs font-mono px-2 py-1 rounded-full border ${s.pill}`}
                              title={`${QB_SYNC_LABELS[status]}${customer.qb_last_synced_at ? ` · ${formatLastSynced(customer.qb_last_synced_at)}` : ''}`}
                            >
                              <Icon className={`h-3.5 w-3.5 ${s.iconColor}`} />
                              {customer.quickbooks_id}
                            </span>
                          );
                        })() : (
                          <span className="text-xs text-gray-400">—</span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2.5 py-1 text-xs font-medium rounded-full capitalize ${
                          customer.customer_type === 'commercial' ? 'bg-blue-100 text-blue-800' : 'bg-green-100 text-green-800'
                        }`}>
                          {customer.customer_type}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2.5 py-1 text-xs font-medium rounded-full capitalize ${
                          customer.status === 'active' ? 'bg-emerald-100 text-emerald-800' : 'bg-gray-100 text-gray-600'
                        }`}>
                          {customer.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        ${Number(customer.total_revenue).toLocaleString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">
                          ${Number(customer.outstanding_balance).toLocaleString()}
                        </div>
                        {Number(customer.past_due_amount) > 0 && (
                          <div className="text-xs text-red-600 font-medium">
                            Past Due: ${Number(customer.past_due_amount).toLocaleString()}
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-wrap gap-1">
                          {(customer.tags || []).map((tag, idx) => (
                            <span key={idx} className={`px-2 py-0.5 text-xs rounded-full font-medium ${tagColor(tag)}`}>
                              {tag}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center text-blue-600 hover:text-blue-700">
                          <ChevronRight className="h-5 w-5" />
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {displayRows.length === 0 && !loading && (
                  <tr>
                    <td colSpan={9} className="px-6 py-12 text-center text-gray-500">
                      No customers found matching your search.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showNewModal && (
        <NewCustomerModal
          onClose={() => setShowNewModal(false)}
          onCreated={(id) => {
            setShowNewModal(false);
            fetchCustomers();
            onViewCustomer(id);
          }}
        />
      )}
    </div>
  );
}
