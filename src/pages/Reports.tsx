import { useState, useEffect } from 'react';
import { FileText, Download, RotateCcw, TrendingUp, Users, ChevronDown, ChevronUp, AlertCircle } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface GoBackWO {
  id: string;
  wo_number: string;
  title: string;
  scheduled_date: string | null;
  go_back_notes: string | null;
  go_back_reason_ids: string[] | null;
  companies?: { name: string };
  work_order_technicians?: { employees?: { first_name: string; last_name: string } }[];
}

interface GoBackReason {
  id: string;
  label: string;
}

interface GoBackStats {
  total: number;
  rate: number;
  byReason: { label: string; count: number }[];
  byTech: { name: string; count: number }[];
  recent: GoBackWO[];
}

const reportCategories = [
  {
    name: 'Sales Reports',
    reports: ['Sales by Technician', 'Revenue by Customer Type', 'Sales Pipeline Analysis', 'Monthly Sales Summary'],
  },
  {
    name: 'Operations Reports',
    reports: ['Work Order Status Report', 'Technician Productivity', 'Service Response Times', 'Job Completion Rates'],
  },
  {
    name: 'Office Reports',
    reports: ['Customer Acquisition', 'Active vs Inactive Customers', 'Service Contract Renewals', 'Customer Satisfaction Scores'],
  },
  {
    name: 'Accounting Reports',
    reports: ['Accounts Receivable Aging', 'Revenue Recognition', 'Profit & Loss Statement', 'Cash Flow Analysis'],
  },
];

function getDateRange(range: string): { from: string; to: string } {
  const now = new Date();
  const to = now.toISOString().split('T')[0];
  let from: Date;
  if (range === '30d') from = new Date(now.setDate(now.getDate() - 30));
  else if (range === '90d') from = new Date(now.setDate(now.getDate() - 90));
  else if (range === '6m') from = new Date(now.setMonth(now.getMonth() - 6));
  else from = new Date(now.setFullYear(now.getFullYear() - 1));
  return { from: from.toISOString().split('T')[0], to };
}

export default function Reports() {
  const [dateRange, setDateRange] = useState('30d');
  const [goBackStats, setGoBackStats] = useState<GoBackStats | null>(null);
  const [goBackReasons, setGoBackReasons] = useState<GoBackReason[]>([]);
  const [loadingGoBack, setLoadingGoBack] = useState(true);
  const [showAllGoBacks, setShowAllGoBacks] = useState(false);

  useEffect(() => {
    loadGoBackAnalysis();
  }, [dateRange]);

  async function loadGoBackAnalysis() {
    setLoadingGoBack(true);
    const { from, to } = getDateRange(dateRange);

    const [goBackRes, totalRes, reasonsRes] = await Promise.all([
      supabase
        .from('work_orders')
        .select(`
          id, wo_number, title, scheduled_date, go_back_notes, go_back_reason_ids,
          companies(name),
          work_order_technicians(employees(first_name, last_name))
        `)
        .eq('is_go_back', true)
        .gte('created_at', from)
        .lte('created_at', to + 'T23:59:59Z')
        .order('scheduled_date', { ascending: false }),
      supabase
        .from('work_orders')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'completed')
        .gte('created_at', from)
        .lte('created_at', to + 'T23:59:59Z'),
      supabase.from('go_back_reasons').select('id, label').order('sort_order'),
    ]);

    const wos = (goBackRes.data as GoBackWO[]) || [];
    const reasons = (reasonsRes.data as GoBackReason[]) || [];
    setGoBackReasons(reasons);

    const totalCompleted = totalRes.count || 0;
    const rate = totalCompleted > 0 ? Math.round((wos.length / totalCompleted) * 100) : 0;

    const reasonMap: Record<string, number> = {};
    wos.forEach(wo => {
      (wo.go_back_reason_ids || []).forEach(rid => {
        const label = reasons.find(r => r.id === rid)?.label || 'Unknown';
        reasonMap[label] = (reasonMap[label] || 0) + 1;
      });
    });
    const byReason = Object.entries(reasonMap)
      .sort((a, b) => b[1] - a[1])
      .map(([label, count]) => ({ label, count }));

    const techMap: Record<string, number> = {};
    wos.forEach(wo => {
      const techs = wo.work_order_technicians || [];
      if (techs.length > 0 && techs[0].employees) {
        const e = techs[0].employees;
        const name = `${e.first_name} ${e.last_name}`;
        techMap[name] = (techMap[name] || 0) + 1;
      }
    });
    const byTech = Object.entries(techMap)
      .sort((a, b) => b[1] - a[1])
      .map(([name, count]) => ({ name, count }));

    setGoBackStats({ total: wos.length, rate, byReason, byTech, recent: wos });
    setLoadingGoBack(false);
  }

  const displayedGobacks = showAllGoBacks
    ? (goBackStats?.recent || [])
    : (goBackStats?.recent || []).slice(0, 5);

  return (
    <div className="p-6 space-y-8 max-w-5xl">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Reports</h1>
        <p className="text-gray-600 mt-1">Generate business intelligence and analytics reports</p>
      </div>

      {/* Go-Back Analysis */}
      <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
        <div className="px-6 py-5 border-b border-gray-100 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-orange-100 rounded-xl flex items-center justify-center">
              <RotateCcw className="h-5 w-5 text-orange-600" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-900">Go-Back Analysis</h2>
              <p className="text-sm text-gray-500">Track repeat service calls and identify patterns</p>
            </div>
          </div>
          <select
            value={dateRange}
            onChange={e => setDateRange(e.target.value)}
            className="px-3 py-2 border border-gray-200 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-orange-400"
          >
            <option value="30d">Last 30 Days</option>
            <option value="90d">Last 90 Days</option>
            <option value="6m">Last 6 Months</option>
            <option value="1y">Last Year</option>
          </select>
        </div>

        {loadingGoBack ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-2 border-orange-500 border-t-transparent" />
          </div>
        ) : goBackStats ? (
          <div className="p-6 space-y-6">
            {/* KPI cards */}
            <div className="grid grid-cols-3 gap-4">
              <div className="bg-orange-50 rounded-xl p-4 border border-orange-100">
                <div className="flex items-center gap-2 mb-1">
                  <RotateCcw className="h-4 w-4 text-orange-500" />
                  <p className="text-xs font-medium text-orange-600">Total Go-Backs</p>
                </div>
                <p className="text-3xl font-bold text-orange-700">{goBackStats.total}</p>
              </div>
              <div className={`rounded-xl p-4 border ${goBackStats.rate > 10 ? 'bg-red-50 border-red-100' : 'bg-gray-50 border-gray-200'}`}>
                <div className="flex items-center gap-2 mb-1">
                  <TrendingUp className={`h-4 w-4 ${goBackStats.rate > 10 ? 'text-red-500' : 'text-gray-500'}`} />
                  <p className={`text-xs font-medium ${goBackStats.rate > 10 ? 'text-red-600' : 'text-gray-600'}`}>Go-Back Rate</p>
                </div>
                <p className={`text-3xl font-bold ${goBackStats.rate > 10 ? 'text-red-700' : 'text-gray-700'}`}>{goBackStats.rate}%</p>
                {goBackStats.rate > 10 && (
                  <p className="text-xs text-red-500 mt-1 flex items-center gap-1">
                    <AlertCircle className="h-3 w-3" /> Above 10% threshold
                  </p>
                )}
              </div>
              <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
                <div className="flex items-center gap-2 mb-1">
                  <Users className="h-4 w-4 text-gray-500" />
                  <p className="text-xs font-medium text-gray-600">Techs with Go-Backs</p>
                </div>
                <p className="text-3xl font-bold text-gray-700">{goBackStats.byTech.length}</p>
              </div>
            </div>

            {/* By Reason + By Tech */}
            <div className="grid grid-cols-2 gap-6">
              <div>
                <h3 className="text-sm font-bold text-gray-700 mb-3">By Reason</h3>
                {goBackStats.byReason.length === 0 ? (
                  <p className="text-sm text-gray-400 italic">No reasons recorded</p>
                ) : (
                  <div className="space-y-2">
                    {goBackStats.byReason.map((item, i) => {
                      const maxCount = goBackStats.byReason[0]?.count || 1;
                      const pct = Math.round((item.count / maxCount) * 100);
                      return (
                        <div key={i}>
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-sm text-gray-700">{item.label}</span>
                            <span className="text-xs font-bold text-gray-900">{item.count}</span>
                          </div>
                          <div className="w-full bg-gray-100 rounded-full h-2">
                            <div
                              className="bg-orange-400 h-2 rounded-full transition-all"
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              <div>
                <h3 className="text-sm font-bold text-gray-700 mb-3">By Technician</h3>
                {goBackStats.byTech.length === 0 ? (
                  <p className="text-sm text-gray-400 italic">No technician data</p>
                ) : (
                  <div className="space-y-2">
                    {goBackStats.byTech.map((item, i) => {
                      const maxCount = goBackStats.byTech[0]?.count || 1;
                      const pct = Math.round((item.count / maxCount) * 100);
                      return (
                        <div key={i}>
                          <div className="flex items-center justify-between mb-1">
                            <div className="flex items-center gap-2">
                              <div className="w-5 h-5 rounded-full bg-blue-100 flex items-center justify-center text-xs font-bold text-blue-700">
                                {item.name.split(' ').map(n => n[0]).join('')}
                              </div>
                              <span className="text-sm text-gray-700">{item.name}</span>
                            </div>
                            <span className="text-xs font-bold text-gray-900">{item.count}</span>
                          </div>
                          <div className="w-full bg-gray-100 rounded-full h-2">
                            <div
                              className="bg-blue-400 h-2 rounded-full transition-all"
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* Recent go-backs list */}
            {goBackStats.recent.length > 0 && (
              <div>
                <h3 className="text-sm font-bold text-gray-700 mb-3">Recent Go-Backs</h3>
                <div className="rounded-xl border border-gray-100 overflow-hidden">
                  <table className="w-full">
                    <thead className="bg-gray-50 border-b border-gray-100">
                      <tr>
                        <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase">WO #</th>
                        <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase">Customer</th>
                        <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase">Title</th>
                        <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase">Reasons</th>
                        <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase">Date</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {displayedGobacks.map(wo => (
                        <tr key={wo.id} className="hover:bg-gray-50 transition-colors">
                          <td className="px-4 py-3">
                            <span className="font-mono text-xs font-bold text-orange-600">{wo.wo_number}</span>
                          </td>
                          <td className="px-4 py-3">
                            <span className="text-sm text-gray-700">{(wo.companies as any)?.name || '—'}</span>
                          </td>
                          <td className="px-4 py-3">
                            <span className="text-sm text-gray-800 truncate max-w-[200px] block">{wo.title}</span>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex flex-wrap gap-1">
                              {(wo.go_back_reason_ids || []).map(rid => {
                                const label = goBackReasons.find(r => r.id === rid)?.label;
                                return label ? (
                                  <span key={rid} className="text-xs bg-orange-50 text-orange-700 px-2 py-0.5 rounded-full border border-orange-100">
                                    {label}
                                  </span>
                                ) : null;
                              })}
                              {(!wo.go_back_reason_ids || wo.go_back_reason_ids.length === 0) && (
                                <span className="text-xs text-gray-400 italic">None recorded</span>
                              )}
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <span className="text-xs text-gray-500">
                              {wo.scheduled_date
                                ? new Date(wo.scheduled_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
                                : '—'}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {goBackStats.recent.length > 5 && (
                    <button
                      onClick={() => setShowAllGoBacks(v => !v)}
                      className="w-full flex items-center justify-center gap-2 py-3 text-sm font-medium text-gray-500 hover:text-gray-700 hover:bg-gray-50 transition-colors border-t border-gray-100"
                    >
                      {showAllGoBacks ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                      {showAllGoBacks ? 'Show Less' : `Show All ${goBackStats.recent.length} Go-Backs`}
                    </button>
                  )}
                </div>
              </div>
            )}

            {goBackStats.total === 0 && (
              <div className="text-center py-8">
                <RotateCcw className="h-10 w-10 text-gray-200 mx-auto mb-2" />
                <p className="text-gray-400 font-medium">No go-backs in this period</p>
              </div>
            )}
          </div>
        ) : null}
      </div>

      {/* Existing report categories */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {reportCategories.map((category, index) => (
          <div key={index} className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <h3 className="text-lg font-bold text-gray-900 mb-4">{category.name}</h3>
            <div className="space-y-2">
              {category.reports.map((report, idx) => (
                <div key={idx} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer">
                  <div className="flex items-center">
                    <FileText className="h-5 w-5 text-gray-400 mr-3" />
                    <span className="text-sm font-medium text-gray-900">{report}</span>
                  </div>
                  <button className="text-blue-600 hover:text-blue-700">
                    <Download className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
