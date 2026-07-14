import { useState, useEffect, useMemo } from 'react';
import { DollarSign, TrendingUp, BarChart3, Building2, Users, Filter, Calendar, Download, ArrowLeft, RefreshCw } from 'lucide-react';
import { supabase } from '../../lib/supabase';

interface RevenueEntry {
  id: string;
  revenue_date: string;
  revenue_type: string;
  amount: number;
  employee_id: string | null;
  office_id: string | null;
  company_id: string | null;
  system_type_id: string | null;
  notes: string | null;
}

interface Office {
  id: string;
  name: string;
}

interface Employee {
  id: string;
  first_name: string;
  last_name: string;
  role: string;
}

interface SystemType {
  id: string;
  name: string;
  color: string;
}

type DatePreset = 'this_month' | 'last_month' | 'this_quarter' | 'last_quarter' | 'this_year' | 'last_year' | 'custom';

function getPresetDates(preset: DatePreset): { from: string; to: string } {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();

  switch (preset) {
    case 'this_month': {
      const from = new Date(year, month, 1);
      const to = new Date(year, month + 1, 0);
      return { from: fmt(from), to: fmt(to) };
    }
    case 'last_month': {
      const from = new Date(year, month - 1, 1);
      const to = new Date(year, month, 0);
      return { from: fmt(from), to: fmt(to) };
    }
    case 'this_quarter': {
      const qStart = Math.floor(month / 3) * 3;
      const from = new Date(year, qStart, 1);
      const to = new Date(year, qStart + 3, 0);
      return { from: fmt(from), to: fmt(to) };
    }
    case 'last_quarter': {
      const qStart = Math.floor(month / 3) * 3 - 3;
      const from = new Date(year, qStart, 1);
      const to = new Date(year, qStart + 3, 0);
      return { from: fmt(from), to: fmt(to) };
    }
    case 'this_year': {
      return { from: `${year}-01-01`, to: `${year}-12-31` };
    }
    case 'last_year': {
      return { from: `${year - 1}-01-01`, to: `${year - 1}-12-31` };
    }
    default:
      return { from: fmt(new Date(year, month, 1)), to: fmt(now) };
  }
}

function fmt(d: Date): string {
  return d.toISOString().split('T')[0];
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(amount);
}

const REVENUE_COLORS: Record<string, { bg: string; text: string; bar: string }> = {
  Sales: { bg: 'bg-emerald-50', text: 'text-emerald-700', bar: 'bg-emerald-500' },
  Service: { bg: 'bg-blue-50', text: 'text-blue-700', bar: 'bg-blue-500' },
  RMR: { bg: 'bg-amber-50', text: 'text-amber-700', bar: 'bg-amber-500' },
};

export default function RevenueByType({ onBack }: { onBack: () => void }) {
  const [entries, setEntries] = useState<RevenueEntry[]>([]);
  const [offices, setOffices] = useState<Office[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [systemTypes, setSystemTypes] = useState<SystemType[]>([]);
  const [loading, setLoading] = useState(true);

  const [preset, setPreset] = useState<DatePreset>('this_year');
  const [customFrom, setCustomFrom] = useState('');
  const [customTo, setCustomTo] = useState('');
  const [officeFilter, setOfficeFilter] = useState<string>('all');
  const [employeeFilter, setEmployeeFilter] = useState<string>('all');

  const dateRange = useMemo(() => {
    if (preset === 'custom' && customFrom && customTo) {
      return { from: customFrom, to: customTo };
    }
    return getPresetDates(preset);
  }, [preset, customFrom, customTo]);

  useEffect(() => {
    loadReferenceData();
  }, []);

  useEffect(() => {
    loadRevenue();
  }, [dateRange, officeFilter, employeeFilter]);

  async function loadReferenceData() {
    const [officeRes, empRes, sysRes] = await Promise.all([
      supabase.from('offices').select('id, name').eq('is_active', true).order('name'),
      supabase.from('employees').select('id, first_name, last_name, role').eq('status', 'active').order('first_name'),
      supabase.from('system_types').select('id, name, color').eq('is_active', true).order('sort_order'),
    ]);
    setOffices((officeRes.data as Office[]) || []);
    setEmployees((empRes.data as Employee[]) || []);
    setSystemTypes((sysRes.data as SystemType[]) || []);
  }

  async function loadRevenue() {
    setLoading(true);
    let query = supabase
      .from('revenue_entries')
      .select('id, revenue_date, revenue_type, amount, employee_id, office_id, company_id, system_type_id, notes')
      .gte('revenue_date', dateRange.from)
      .lte('revenue_date', dateRange.to)
      .order('revenue_date', { ascending: false });

    if (officeFilter !== 'all') {
      query = query.eq('office_id', officeFilter);
    }
    if (employeeFilter !== 'all') {
      query = query.eq('employee_id', employeeFilter);
    }

    const { data } = await query;
    setEntries((data as RevenueEntry[]) || []);
    setLoading(false);
  }

  const totals = useMemo(() => {
    const byType: Record<string, number> = { Sales: 0, Service: 0, RMR: 0 };
    entries.forEach(e => { byType[e.revenue_type] = (byType[e.revenue_type] || 0) + Number(e.amount); });
    const grand = Object.values(byType).reduce((a, b) => a + b, 0);
    return { byType, grand };
  }, [entries]);

  const bySystem = useMemo(() => {
    const map: Record<string, { Sales: number; Service: number; RMR: number; total: number }> = {};
    entries.forEach(e => {
      const sysId = e.system_type_id || 'unknown';
      if (!map[sysId]) map[sysId] = { Sales: 0, Service: 0, RMR: 0, total: 0 };
      map[sysId][e.revenue_type as keyof typeof map[string]] += Number(e.amount);
      map[sysId].total += Number(e.amount);
    });
    return Object.entries(map)
      .map(([id, data]) => ({ id, ...data, name: systemTypes.find(s => s.id === id)?.name || 'Other', color: systemTypes.find(s => s.id === id)?.color || '#6b7280' }))
      .sort((a, b) => b.total - a.total);
  }, [entries, systemTypes]);

  const byEmployee = useMemo(() => {
    const map: Record<string, { Sales: number; Service: number; RMR: number; total: number }> = {};
    entries.forEach(e => {
      const empId = e.employee_id || 'unassigned';
      if (!map[empId]) map[empId] = { Sales: 0, Service: 0, RMR: 0, total: 0 };
      map[empId][e.revenue_type as keyof typeof map[string]] += Number(e.amount);
      map[empId].total += Number(e.amount);
    });
    return Object.entries(map)
      .map(([id, data]) => {
        const emp = employees.find(e => e.id === id);
        return { id, ...data, name: emp ? `${emp.first_name} ${emp.last_name}` : 'Unassigned' };
      })
      .sort((a, b) => b.total - a.total);
  }, [entries, employees]);

  const byOffice = useMemo(() => {
    const map: Record<string, { Sales: number; Service: number; RMR: number; total: number }> = {};
    entries.forEach(e => {
      const oId = e.office_id || 'unknown';
      if (!map[oId]) map[oId] = { Sales: 0, Service: 0, RMR: 0, total: 0 };
      map[oId][e.revenue_type as keyof typeof map[string]] += Number(e.amount);
      map[oId].total += Number(e.amount);
    });
    return Object.entries(map)
      .map(([id, data]) => ({ id, ...data, name: offices.find(o => o.id === id)?.name || 'Unknown' }))
      .sort((a, b) => b.total - a.total);
  }, [entries, offices]);

  function exportCSV() {
    const headers = ['Date', 'Type', 'System', 'Amount', 'Employee', 'Office', 'Notes'];
    const rows = entries.map(e => [
      e.revenue_date,
      e.revenue_type,
      systemTypes.find(s => s.id === e.system_type_id)?.name || '',
      e.amount.toString(),
      employees.find(emp => emp.id === e.employee_id) ? `${employees.find(emp => emp.id === e.employee_id)!.first_name} ${employees.find(emp => emp.id === e.employee_id)!.last_name}` : '',
      offices.find(o => o.id === e.office_id)?.name || '',
      e.notes || '',
    ]);
    const csv = [headers.join(','), ...rows.map(r => r.map(c => `"${c}"`).join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `revenue-report-${dateRange.from}-to-${dateRange.to}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="p-6 space-y-6 max-w-7xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button onClick={onBack} className="p-2 hover:bg-gray-100 rounded-xl transition-colors">
            <ArrowLeft className="h-5 w-5 text-gray-600" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Revenue by Type</h1>
            <p className="text-gray-500 text-sm mt-0.5">Sales, Service, and RMR breakdown by system, office, and salesperson</p>
          </div>
        </div>
        <button
          onClick={exportCSV}
          className="flex items-center gap-2 px-4 py-2.5 bg-gray-900 text-white rounded-xl text-sm font-medium hover:bg-gray-800 transition-colors"
        >
          <Download className="h-4 w-4" />
          Export CSV
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-2xl border border-gray-200 p-5">
        <div className="flex items-center gap-2 mb-4">
          <Filter className="h-4 w-4 text-gray-500" />
          <span className="text-sm font-semibold text-gray-700">Filters</span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Date preset */}
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1.5">Date Range</label>
            <select
              value={preset}
              onChange={e => setPreset(e.target.value as DatePreset)}
              className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-400 bg-white"
            >
              <option value="this_month">This Month</option>
              <option value="last_month">Last Month</option>
              <option value="this_quarter">This Quarter</option>
              <option value="last_quarter">Last Quarter</option>
              <option value="this_year">This Year</option>
              <option value="last_year">Last Year</option>
              <option value="custom">Custom Range</option>
            </select>
          </div>

          {/* Custom date inputs */}
          {preset === 'custom' && (
            <>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1.5">From</label>
                <input
                  type="date"
                  value={customFrom}
                  onChange={e => setCustomFrom(e.target.value)}
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1.5">To</label>
                <input
                  type="date"
                  value={customTo}
                  onChange={e => setCustomTo(e.target.value)}
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                />
              </div>
            </>
          )}

          {/* Office filter */}
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1.5">Office</label>
            <select
              value={officeFilter}
              onChange={e => setOfficeFilter(e.target.value)}
              className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-400 bg-white"
            >
              <option value="all">All Offices</option>
              {offices.map(o => (
                <option key={o.id} value={o.id}>{o.name}</option>
              ))}
            </select>
          </div>

          {/* Employee filter */}
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1.5">Salesperson / Tech</label>
            <select
              value={employeeFilter}
              onChange={e => setEmployeeFilter(e.target.value)}
              className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-400 bg-white"
            >
              <option value="all">All People</option>
              {employees.map(emp => (
                <option key={emp.id} value={emp.id}>{emp.first_name} {emp.last_name}</option>
              ))}
            </select>
          </div>
        </div>
        {preset === 'custom' && (!customFrom || !customTo) && (
          <p className="text-xs text-amber-600 mt-3 flex items-center gap-1">
            <Calendar className="h-3 w-3" />
            Please select both start and end dates
          </p>
        )}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <RefreshCw className="h-6 w-6 text-gray-400 animate-spin" />
        </div>
      ) : (
        <>
          {/* KPI Row */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <KpiCard
              label="Total Revenue"
              value={formatCurrency(totals.grand)}
              icon={<DollarSign className="h-5 w-5" />}
              color="bg-gray-900 text-white"
              iconColor="bg-white/20"
            />
            <KpiCard
              label="Sales"
              value={formatCurrency(totals.byType.Sales || 0)}
              icon={<TrendingUp className="h-5 w-5" />}
              color="bg-emerald-50 text-emerald-800"
              iconColor="bg-emerald-100"
              subtitle={totals.grand > 0 ? `${Math.round(((totals.byType.Sales || 0) / totals.grand) * 100)}%` : '0%'}
            />
            <KpiCard
              label="Service"
              value={formatCurrency(totals.byType.Service || 0)}
              icon={<BarChart3 className="h-5 w-5" />}
              color="bg-blue-50 text-blue-800"
              iconColor="bg-blue-100"
              subtitle={totals.grand > 0 ? `${Math.round(((totals.byType.Service || 0) / totals.grand) * 100)}%` : '0%'}
            />
            <KpiCard
              label="RMR"
              value={formatCurrency(totals.byType.RMR || 0)}
              icon={<RefreshCw className="h-5 w-5" />}
              color="bg-amber-50 text-amber-800"
              iconColor="bg-amber-100"
              subtitle={totals.grand > 0 ? `${Math.round(((totals.byType.RMR || 0) / totals.grand) * 100)}%` : '0%'}
            />
          </div>

          {/* By System */}
          <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
            <div className="px-6 py-5 border-b border-gray-100 flex items-center gap-3">
              <div className="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center">
                <BarChart3 className="h-4 w-4 text-gray-600" />
              </div>
              <h2 className="text-base font-bold text-gray-900">Revenue by System</h2>
            </div>
            <div className="p-6">
              {bySystem.length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-8">No data for this period</p>
              ) : (
                <div className="space-y-4">
                  {bySystem.map(sys => (
                    <SystemRow key={sys.id} sys={sys} maxTotal={bySystem[0]?.total || 1} />
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* By Office + By Salesperson side by side */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* By Office */}
            <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
              <div className="px-6 py-5 border-b border-gray-100 flex items-center gap-3">
                <div className="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center">
                  <Building2 className="h-4 w-4 text-gray-600" />
                </div>
                <h2 className="text-base font-bold text-gray-900">Revenue by Office</h2>
              </div>
              <div className="p-6">
                {byOffice.length === 0 ? (
                  <p className="text-sm text-gray-400 text-center py-8">No data</p>
                ) : (
                  <div className="space-y-5">
                    {byOffice.map(office => (
                      <BreakdownRow key={office.id} name={office.name} data={office} maxTotal={byOffice[0]?.total || 1} />
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* By Salesperson */}
            <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
              <div className="px-6 py-5 border-b border-gray-100 flex items-center gap-3">
                <div className="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center">
                  <Users className="h-4 w-4 text-gray-600" />
                </div>
                <h2 className="text-base font-bold text-gray-900">Revenue by Person</h2>
              </div>
              <div className="p-6">
                {byEmployee.length === 0 ? (
                  <p className="text-sm text-gray-400 text-center py-8">No data</p>
                ) : (
                  <div className="space-y-5">
                    {byEmployee.map(emp => (
                      <BreakdownRow key={emp.id} name={emp.name} data={emp} maxTotal={byEmployee[0]?.total || 1} />
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Detailed Table */}
          <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
            <div className="px-6 py-5 border-b border-gray-100 flex items-center justify-between">
              <h2 className="text-base font-bold text-gray-900">Detail ({entries.length} entries)</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-100">
                  <tr>
                    <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Date</th>
                    <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Type</th>
                    <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase">System</th>
                    <th className="px-5 py-3 text-right text-xs font-semibold text-gray-500 uppercase">Amount</th>
                    <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Person</th>
                    <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Office</th>
                    <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Notes</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {entries.slice(0, 100).map(e => {
                    const emp = employees.find(emp => emp.id === e.employee_id);
                    const sys = systemTypes.find(s => s.id === e.system_type_id);
                    const office = offices.find(o => o.id === e.office_id);
                    const typeColor = REVENUE_COLORS[e.revenue_type] || REVENUE_COLORS.Sales;
                    return (
                      <tr key={e.id} className="hover:bg-gray-50/50 transition-colors">
                        <td className="px-5 py-3.5 text-sm text-gray-700 whitespace-nowrap">
                          {new Date(e.revenue_date + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                        </td>
                        <td className="px-5 py-3.5">
                          <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-bold ${typeColor.bg} ${typeColor.text}`}>
                            {e.revenue_type}
                          </span>
                        </td>
                        <td className="px-5 py-3.5">
                          {sys && (
                            <span className="inline-flex items-center gap-1.5 text-sm text-gray-700">
                              <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: sys.color }} />
                              {sys.name}
                            </span>
                          )}
                        </td>
                        <td className="px-5 py-3.5 text-right text-sm font-semibold text-gray-900">
                          {formatCurrency(Number(e.amount))}
                        </td>
                        <td className="px-5 py-3.5 text-sm text-gray-700">
                          {emp ? `${emp.first_name} ${emp.last_name}` : '—'}
                        </td>
                        <td className="px-5 py-3.5 text-sm text-gray-500">
                          {office?.name || '—'}
                        </td>
                        <td className="px-5 py-3.5 text-sm text-gray-500 max-w-[200px] truncate">
                          {e.notes || '—'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              {entries.length > 100 && (
                <div className="px-5 py-3 bg-gray-50 border-t border-gray-100 text-center">
                  <span className="text-xs text-gray-500">Showing first 100 of {entries.length} entries. Export CSV for full data.</span>
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function KpiCard({ label, value, icon, color, iconColor, subtitle }: {
  label: string; value: string; icon: React.ReactNode; color: string; iconColor: string; subtitle?: string;
}) {
  return (
    <div className={`rounded-2xl p-5 ${color}`}>
      <div className="flex items-center gap-3 mb-3">
        <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${iconColor}`}>
          {icon}
        </div>
        <span className="text-xs font-semibold opacity-70 uppercase tracking-wide">{label}</span>
      </div>
      <p className="text-2xl font-bold">{value}</p>
      {subtitle && <p className="text-xs font-medium opacity-60 mt-1">{subtitle} of total</p>}
    </div>
  );
}

function SystemRow({ sys, maxTotal }: { sys: { name: string; color: string; Sales: number; Service: number; RMR: number; total: number }; maxTotal: number }) {
  const pct = Math.round((sys.total / maxTotal) * 100);
  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className="w-3 h-3 rounded-full" style={{ backgroundColor: sys.color }} />
          <span className="text-sm font-semibold text-gray-800">{sys.name}</span>
        </div>
        <span className="text-sm font-bold text-gray-900">{formatCurrency(sys.total)}</span>
      </div>
      <div className="w-full h-3 bg-gray-100 rounded-full overflow-hidden flex">
        {sys.Sales > 0 && (
          <div className="h-full bg-emerald-500 transition-all" style={{ width: `${(sys.Sales / maxTotal) * 100}%` }} />
        )}
        {sys.Service > 0 && (
          <div className="h-full bg-blue-500 transition-all" style={{ width: `${(sys.Service / maxTotal) * 100}%` }} />
        )}
        {sys.RMR > 0 && (
          <div className="h-full bg-amber-500 transition-all" style={{ width: `${(sys.RMR / maxTotal) * 100}%` }} />
        )}
      </div>
      <div className="flex items-center gap-4 mt-1.5">
        {sys.Sales > 0 && <span className="text-xs text-emerald-600 font-medium">Sales: {formatCurrency(sys.Sales)}</span>}
        {sys.Service > 0 && <span className="text-xs text-blue-600 font-medium">Service: {formatCurrency(sys.Service)}</span>}
        {sys.RMR > 0 && <span className="text-xs text-amber-600 font-medium">RMR: {formatCurrency(sys.RMR)}</span>}
      </div>
    </div>
  );
}

function BreakdownRow({ name, data, maxTotal }: { name: string; data: { Sales: number; Service: number; RMR: number; total: number }; maxTotal: number }) {
  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-semibold text-gray-800">{name}</span>
        <span className="text-sm font-bold text-gray-900">{formatCurrency(data.total)}</span>
      </div>
      <div className="w-full h-2.5 bg-gray-100 rounded-full overflow-hidden flex">
        {data.Sales > 0 && (
          <div className="h-full bg-emerald-500 transition-all" style={{ width: `${(data.Sales / maxTotal) * 100}%` }} />
        )}
        {data.Service > 0 && (
          <div className="h-full bg-blue-500 transition-all" style={{ width: `${(data.Service / maxTotal) * 100}%` }} />
        )}
        {data.RMR > 0 && (
          <div className="h-full bg-amber-500 transition-all" style={{ width: `${(data.RMR / maxTotal) * 100}%` }} />
        )}
      </div>
      <div className="flex items-center gap-3 mt-1">
        {data.Sales > 0 && <span className="text-xs text-emerald-600">Sales: {formatCurrency(data.Sales)}</span>}
        {data.Service > 0 && <span className="text-xs text-blue-600">Service: {formatCurrency(data.Service)}</span>}
        {data.RMR > 0 && <span className="text-xs text-amber-600">RMR: {formatCurrency(data.RMR)}</span>}
      </div>
    </div>
  );
}
