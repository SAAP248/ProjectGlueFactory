import { useState } from 'react';
import { ArrowLeft, Building2, MapPin, User, Calendar, DollarSign, TrendingUp, Layers, FileText, ReceiptText, RefreshCw, Shield, ClipboardList, AlertTriangle, CheckCircle, CreditCard as Edit2, ExternalLink, Repeat } from 'lucide-react';
import { useProjectDetail } from './useProjects';
import PhaseTimeline from './PhaseTimeline';
import ChangeOrdersTab from './ChangeOrdersTab';
import ProgressBillingTab from './ProgressBillingTab';
import { getStatusColor, getStatusLabel, formatCurrencyFull } from './types';

interface Props {
  projectId: string;
  onBack: () => void;
}

type Tab = 'overview' | 'phases' | 'budget' | 'change-orders' | 'billing' | 'work-orders' | 'rmr';

export default function ProjectDetail({ projectId, onBack }: Props) {
  const { project, phases, changeOrders, progressInvoices, rmr, budgetLines, loading, refetch, updatePhaseStatus } = useProjectDetail(projectId);
  const [tab, setTab] = useState<Tab>('overview');

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!project) {
    return (
      <div className="p-6 text-center text-gray-500">Project not found.</div>
    );
  }

  const contractTotal = (project.contract_value || 0) + (project.approved_co_value || 0);
  const margin = contractTotal > 0
    ? Math.round(((contractTotal - (project.actual_cost || 0)) / contractTotal) * 100)
    : 0;
  const billedPct = contractTotal > 0
    ? Math.round(((project.total_billed || 0) / contractTotal) * 100)
    : 0;
  const phasesCompleted = phases.filter(p => p.status === 'completed').length;
  const phasesInProgress = phases.filter(p => p.status === 'in_progress').length;
  const currentPhase = phases.find(p => p.status === 'in_progress');
  const pendingCOValue = changeOrders.filter(co => co.status === 'submitted').reduce((s, co) => s + co.total, 0);

  const tabs: { id: Tab; label: string; icon: React.ElementType }[] = [
    { id: 'overview', label: 'Overview', icon: Layers },
    { id: 'phases', label: 'Phases', icon: CheckCircle },
    { id: 'budget', label: 'Budget vs. Actual', icon: ReceiptText },
    { id: 'change-orders', label: `Change Orders (${changeOrders.length})`, icon: RefreshCw },
    { id: 'billing', label: 'Progress Billing', icon: DollarSign },
    { id: 'work-orders', label: 'Work Orders', icon: ClipboardList },
    { id: 'rmr', label: 'RMR / Contract', icon: Repeat },
  ];

  return (
    <div className="flex flex-col h-full">
      {/* Back nav + header */}
      <div className="bg-white border-b border-gray-100 px-6 pt-4 pb-0">
        <button onClick={onBack} className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 mb-4 transition-colors">
          <ArrowLeft className="h-4 w-4" />
          All Projects
        </button>

        <div className="flex items-start justify-between mb-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-xl font-bold text-gray-900">{project.name}</h1>
              <span className={`px-2.5 py-0.5 text-xs font-medium rounded-full border ${getStatusColor(project.status)}`}>
                {getStatusLabel(project.status)}
              </span>
              {project.project_number && (
                <span className="text-xs font-mono text-gray-400 bg-gray-100 px-2 py-0.5 rounded">{project.project_number}</span>
              )}
            </div>
            <div className="flex items-center gap-4 mt-2 flex-wrap text-sm text-gray-500">
              {project.companies && (
                <div className="flex items-center gap-1.5">
                  <Building2 className="h-4 w-4 text-gray-400" />
                  <span>{project.companies.name}</span>
                </div>
              )}
              {project.sites && (
                <div className="flex items-center gap-1.5">
                  <MapPin className="h-4 w-4 text-gray-400" />
                  <span>{project.sites.address}, {project.sites.city}, {project.sites.state}</span>
                </div>
              )}
              {project.project_manager && (
                <div className="flex items-center gap-1.5">
                  <User className="h-4 w-4 text-gray-400" />
                  <span>PM: {project.project_manager.first_name} {project.project_manager.last_name}</span>
                </div>
              )}
              {(project.start_date || project.end_date) && (
                <div className="flex items-center gap-1.5">
                  <Calendar className="h-4 w-4 text-gray-400" />
                  <span>
                    {project.start_date ? new Date(project.start_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : ''}
                    {project.end_date ? ` → ${new Date(project.end_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}` : ''}
                  </span>
                </div>
              )}
            </div>
          </div>
          <button className="flex items-center gap-2 px-3 py-2 text-sm text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 ml-4 flex-shrink-0">
            <Edit2 className="h-4 w-4" />
            Edit Project
          </button>
        </div>

        {/* Financial KPI Strip */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-4">
          {[
            {
              label: 'Contract Value',
              value: formatCurrencyFull(contractTotal),
              sub: project.approved_co_value > 0 ? `+${formatCurrencyFull(project.approved_co_value)} COs` : null,
              subColor: 'text-amber-600',
              icon: TrendingUp,
              iconBg: 'bg-blue-50',
              iconColor: 'text-blue-600',
            },
            {
              label: 'Actual Costs',
              value: formatCurrencyFull(project.actual_cost || 0),
              sub: project.budget ? `Budget: ${formatCurrencyFull(project.budget)}` : null,
              subColor: 'text-gray-400',
              icon: ReceiptText,
              iconBg: 'bg-gray-50',
              iconColor: 'text-gray-500',
            },
            {
              label: 'Projected Margin',
              value: `${margin}%`,
              sub: formatCurrencyFull(contractTotal - (project.actual_cost || 0)) + ' net',
              subColor: margin >= 25 ? 'text-green-600' : margin >= 10 ? 'text-yellow-600' : 'text-red-600',
              icon: DollarSign,
              iconBg: margin >= 25 ? 'bg-green-50' : margin >= 10 ? 'bg-yellow-50' : 'bg-red-50',
              iconColor: margin >= 25 ? 'text-green-600' : margin >= 10 ? 'text-yellow-600' : 'text-red-600',
            },
            {
              label: 'Billed to Date',
              value: formatCurrencyFull(project.total_billed || 0),
              sub: `${billedPct}% of contract`,
              subColor: 'text-blue-500',
              icon: FileText,
              iconBg: 'bg-cyan-50',
              iconColor: 'text-cyan-600',
            },
            {
              label: 'Remaining to Bill',
              value: formatCurrencyFull(contractTotal - (project.total_billed || 0)),
              sub: pendingCOValue > 0 ? `${formatCurrencyFull(pendingCOValue)} CO pending` : null,
              subColor: 'text-amber-600',
              icon: AlertTriangle,
              iconBg: 'bg-amber-50',
              iconColor: 'text-amber-600',
            },
          ].map((kpi, i) => (
            <div key={i} className="bg-white border border-gray-100 rounded-xl p-4 shadow-sm">
              <div className="flex items-center justify-between mb-2">
                <div className={`w-8 h-8 ${kpi.iconBg} rounded-lg flex items-center justify-center`}>
                  <kpi.icon className={`h-4 w-4 ${kpi.iconColor}`} />
                </div>
              </div>
              <div className="text-lg font-bold text-gray-900">{kpi.value}</div>
              <div className="text-xs text-gray-500 mt-0.5">{kpi.label}</div>
              {kpi.sub && <div className={`text-xs mt-0.5 font-medium ${kpi.subColor}`}>{kpi.sub}</div>}
            </div>
          ))}
        </div>

        {/* Phase progress mini-bar */}
        {phases.length > 0 && (
          <div className="mb-4 bg-gray-50 rounded-xl px-4 py-3 border border-gray-100">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-gray-600">Phase Progress</span>
              <span className="text-xs text-gray-500">{phasesCompleted}/{phases.length} phases complete</span>
            </div>
            <div className="flex gap-1.5 items-center">
              {phases.map(ph => (
                <div key={ph.id} className="flex-1 group relative">
                  <div className={`h-3 rounded-md ${
                    ph.status === 'completed' ? 'bg-green-400' :
                    ph.status === 'in_progress' ? 'bg-blue-400' :
                    ph.status === 'blocked' ? 'bg-red-400' : 'bg-gray-200'
                  }`} />
                  <div className="absolute bottom-5 left-1/2 -translate-x-1/2 hidden group-hover:block bg-gray-900 text-white text-xs rounded-lg px-2 py-1 whitespace-nowrap z-10">
                    {ph.name}
                  </div>
                </div>
              ))}
            </div>
            {currentPhase && (
              <div className="text-xs text-blue-600 font-medium mt-1.5">
                Active: {currentPhase.name}
              </div>
            )}
          </div>
        )}

        {/* Tab bar */}
        <div className="flex gap-0 border-b border-transparent overflow-x-auto">
          {tabs.map(t => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex items-center gap-1.5 px-4 py-3 text-xs font-semibold border-b-2 transition-colors whitespace-nowrap ${
                tab === t.id
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              <t.icon className="h-3.5 w-3.5" />
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tab Content */}
      <div className="flex-1 overflow-y-auto p-6">
        {tab === 'overview' && (
          <OverviewTab project={project} phases={phases} changeOrders={changeOrders} progressInvoices={progressInvoices} rmr={rmr} />
        )}
        {tab === 'phases' && (
          <PhaseTimeline phases={phases} projectId={projectId} onUpdateStatus={updatePhaseStatus} onRefetch={refetch} />
        )}
        {tab === 'budget' && (
          <BudgetTab phases={phases} budgetLines={budgetLines} actualCost={project.actual_cost || 0} />
        )}
        {tab === 'change-orders' && (
          <ChangeOrdersTab projectId={projectId} changeOrders={changeOrders} onRefetch={refetch} />
        )}
        {tab === 'billing' && (
          <ProgressBillingTab
            projectId={projectId}
            contractValue={project.contract_value || 0}
            approvedCOValue={project.approved_co_value || 0}
            progressInvoices={progressInvoices}
            phases={phases}
            onRefetch={refetch}
          />
        )}
        {tab === 'work-orders' && (
          <WorkOrdersTab projectId={projectId} phases={phases} />
        )}
        {tab === 'rmr' && (
          <RMRTab rmr={rmr} project={project} />
        )}
      </div>
    </div>
  );
}

// =====================================================
// Overview Tab
// =====================================================
import type { Project, ProjectPhase, ChangeOrder, ProgressInvoice, ProjectRMR } from './types';

function OverviewTab({ project, phases, changeOrders, progressInvoices, rmr }: {
  project: Project;
  phases: ProjectPhase[];
  changeOrders: ChangeOrder[];
  progressInvoices: ProgressInvoice[];
  rmr: ProjectRMR | null;
}) {
  const approvedCOs = changeOrders.filter(co => co.status === 'approved');
  const pendingCOs = changeOrders.filter(co => co.status === 'submitted');
  const upcomingMilestones = progressInvoices.filter(pi => pi.status === 'draft').slice(0, 3);

  return (
    <div className="grid grid-cols-3 gap-6">
      <div className="col-span-2 space-y-6">
        {project.description && (
          <div className="bg-white border border-gray-100 rounded-xl p-5 shadow-sm">
            <h3 className="text-sm font-semibold text-gray-700 mb-3">Project Scope</h3>
            <p className="text-sm text-gray-600 leading-relaxed">{project.description}</p>
          </div>
        )}

        <div className="bg-white border border-gray-100 rounded-xl p-5 shadow-sm">
          <h3 className="text-sm font-semibold text-gray-700 mb-4">Phase Summary</h3>
          <div className="space-y-2">
            {phases.map(ph => {
              const total = (ph.labor_budget || 0) + (ph.materials_budget || 0) + (ph.other_budget || 0);
              const actual = (ph.labor_actual || 0) + (ph.materials_actual || 0) + (ph.other_actual || 0);
              return (
                <div key={ph.id} className="flex items-center gap-3">
                  <div className={`w-2 h-2 rounded-full flex-shrink-0 ${
                    ph.status === 'completed' ? 'bg-green-400' :
                    ph.status === 'in_progress' ? 'bg-blue-400' :
                    ph.status === 'blocked' ? 'bg-red-400' : 'bg-gray-200'
                  }`} />
                  <div className="flex-1 text-sm text-gray-700">{ph.name}</div>
                  <div className="text-xs text-gray-400 capitalize">{ph.status.replace('_', ' ')}</div>
                  {total > 0 && (
                    <div className="text-xs text-gray-400">
                      ${actual.toLocaleString()} / ${total.toLocaleString()}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {changeOrders.length > 0 && (
          <div className="bg-white border border-gray-100 rounded-xl p-5 shadow-sm">
            <h3 className="text-sm font-semibold text-gray-700 mb-4">Change Order Summary</h3>
            <div className="space-y-2">
              {changeOrders.slice(0, 5).map(co => (
                <div key={co.id} className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-400 font-mono">{co.co_number}</span>
                    <span className="text-gray-700">{co.title}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`px-2 py-0.5 text-xs rounded-full font-medium ${
                      co.status === 'approved' ? 'bg-green-100 text-green-700' :
                      co.status === 'submitted' ? 'bg-amber-100 text-amber-700' :
                      co.status === 'rejected' ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-600'
                    }`}>{co.status}</span>
                    <span className="font-semibold text-gray-900">${co.total.toLocaleString()}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="space-y-4">
        <div className="bg-white border border-gray-100 rounded-xl p-4 shadow-sm">
          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Project Details</h3>
          <div className="space-y-2.5 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-500">Type</span>
              <span className="font-medium text-gray-900 capitalize">{project.project_type}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Billing</span>
              <span className="font-medium text-gray-900 capitalize">{project.billing_type?.replace('_', ' ')}</span>
            </div>
            {project.retainage_percent > 0 && (
              <div className="flex justify-between">
                <span className="text-gray-500">Retainage</span>
                <span className="font-medium text-gray-900">{project.retainage_percent}%</span>
              </div>
            )}
            {project.lead_technician && (
              <div className="flex justify-between">
                <span className="text-gray-500">Lead Tech</span>
                <span className="font-medium text-gray-900">{project.lead_technician.first_name} {project.lead_technician.last_name}</span>
              </div>
            )}
            {project.permit_status && project.permit_status !== 'not_required' && (
              <div className="flex justify-between">
                <span className="text-gray-500">Permit</span>
                <span className={`font-medium ${project.permit_status === 'approved' ? 'text-green-600' : 'text-amber-600'}`}>
                  {project.permit_status}
                  {project.permit_number ? ` #${project.permit_number}` : ''}
                </span>
              </div>
            )}
            {project.ahj_name && (
              <div className="flex justify-between">
                <span className="text-gray-500">AHJ</span>
                <span className="font-medium text-gray-900 text-right max-w-[120px] truncate">{project.ahj_name}</span>
              </div>
            )}
          </div>
        </div>

        {upcomingMilestones.length > 0 && (
          <div className="bg-blue-50 border border-blue-100 rounded-xl p-4">
            <h3 className="text-xs font-semibold text-blue-700 uppercase tracking-wider mb-3">Upcoming Billing</h3>
            <div className="space-y-2">
              {upcomingMilestones.map(pi => (
                <div key={pi.id} className="flex items-center justify-between text-sm">
                  <span className="text-blue-800 text-xs">{pi.title}</span>
                  <span className="font-bold text-blue-900">${pi.current_payment_due.toLocaleString()}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {rmr && (
          <div className="bg-green-50 border border-green-100 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-3">
              <Shield className="h-4 w-4 text-green-600" />
              <h3 className="text-xs font-semibold text-green-700 uppercase tracking-wider">Monitoring Contract</h3>
            </div>
            <div className="text-2xl font-bold text-green-800 mb-0.5">
              ${rmr.monthly_rate}/mo
            </div>
            <div className="text-xs text-green-600">{rmr.contract_term_months}-month term · {rmr.monitoring_type.replace('_', ' ')}</div>
            <div className="text-xs text-green-500 mt-1 capitalize">{rmr.status}</div>
          </div>
        )}

        {pendingCOs.length > 0 && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
            <h3 className="text-xs font-semibold text-amber-700 uppercase tracking-wider mb-2">Pending Approval</h3>
            {pendingCOs.map(co => (
              <div key={co.id} className="flex justify-between text-sm mb-1">
                <span className="text-amber-800 text-xs">{co.title}</span>
                <span className="font-bold text-amber-900">${co.total.toLocaleString()}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// =====================================================
// Budget vs. Actual Tab
// =====================================================
import type { ProjectBudgetLine } from './types';

function BudgetTab({ phases, budgetLines, actualCost }: {
  phases: ProjectPhase[];
  budgetLines: ProjectBudgetLine[];
  actualCost: number;
}) {
  const totalBudget = phases.reduce((s, ph) => s + (ph.labor_budget || 0) + (ph.materials_budget || 0) + (ph.other_budget || 0), 0);
  const totalActual = phases.reduce((s, ph) => s + (ph.labor_actual || 0) + (ph.materials_actual || 0) + (ph.other_actual || 0), 0);

  return (
    <div>
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-white border border-gray-100 rounded-xl p-4 shadow-sm">
          <div className="text-xs text-gray-500 mb-1">Total Budget</div>
          <div className="text-2xl font-bold text-gray-900">${totalBudget.toLocaleString()}</div>
        </div>
        <div className={`border rounded-xl p-4 ${totalActual > totalBudget ? 'bg-red-50 border-red-100' : 'bg-green-50 border-green-100'}`}>
          <div className="text-xs mb-1 font-medium text-gray-600">Total Actual Cost</div>
          <div className={`text-2xl font-bold ${totalActual > totalBudget ? 'text-red-700' : 'text-green-700'}`}>
            ${totalActual.toLocaleString()}
          </div>
        </div>
        <div className="bg-gray-50 border border-gray-100 rounded-xl p-4">
          <div className="text-xs text-gray-500 mb-1">Remaining Budget</div>
          <div className={`text-2xl font-bold ${totalBudget - totalActual < 0 ? 'text-red-600' : 'text-gray-900'}`}>
            ${(totalBudget - totalActual).toLocaleString()}
          </div>
        </div>
      </div>

      <div className="bg-white border border-gray-100 rounded-xl shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-50">
          <h3 className="text-sm font-semibold text-gray-700">Budget by Phase</h3>
        </div>
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Phase</th>
              <th className="px-5 py-3 text-right text-xs font-semibold text-gray-500 uppercase">Labor Budget</th>
              <th className="px-5 py-3 text-right text-xs font-semibold text-gray-500 uppercase">Materials Budget</th>
              <th className="px-5 py-3 text-right text-xs font-semibold text-gray-500 uppercase">Other Budget</th>
              <th className="px-5 py-3 text-right text-xs font-semibold text-gray-500 uppercase">Total Budget</th>
              <th className="px-5 py-3 text-right text-xs font-semibold text-gray-500 uppercase">Actual</th>
              <th className="px-5 py-3 text-right text-xs font-semibold text-gray-500 uppercase">Remaining</th>
              <th className="px-5 py-3 text-center text-xs font-semibold text-gray-500 uppercase">Usage</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {phases.map(ph => {
              const totalBud = (ph.labor_budget || 0) + (ph.materials_budget || 0) + (ph.other_budget || 0);
              const totalAct = (ph.labor_actual || 0) + (ph.materials_actual || 0) + (ph.other_actual || 0);
              const remaining = totalBud - totalAct;
              const usagePct = totalBud > 0 ? Math.round((totalAct / totalBud) * 100) : 0;
              const isOver = totalAct > totalBud && totalBud > 0;

              return (
                <tr key={ph.id} className={`${isOver ? 'bg-red-50/40' : ''}`}>
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-2">
                      <div className={`w-2 h-2 rounded-full ${
                        ph.status === 'completed' ? 'bg-green-400' :
                        ph.status === 'in_progress' ? 'bg-blue-400' : 'bg-gray-200'
                      }`} />
                      <span className="text-sm text-gray-900">{ph.name}</span>
                    </div>
                  </td>
                  <td className="px-5 py-3 text-right text-sm text-gray-600">${(ph.labor_budget || 0).toLocaleString()}</td>
                  <td className="px-5 py-3 text-right text-sm text-gray-600">${(ph.materials_budget || 0).toLocaleString()}</td>
                  <td className="px-5 py-3 text-right text-sm text-gray-600">${(ph.other_budget || 0).toLocaleString()}</td>
                  <td className="px-5 py-3 text-right text-sm font-semibold text-gray-900">${totalBud.toLocaleString()}</td>
                  <td className={`px-5 py-3 text-right text-sm font-semibold ${isOver ? 'text-red-600' : totalAct > 0 ? 'text-gray-900' : 'text-gray-300'}`}>
                    ${totalAct.toLocaleString()}
                  </td>
                  <td className={`px-5 py-3 text-right text-sm font-semibold ${remaining < 0 ? 'text-red-600' : 'text-gray-700'}`}>
                    {totalBud > 0 ? `$${remaining.toLocaleString()}` : '—'}
                  </td>
                  <td className="px-5 py-3">
                    {totalBud > 0 ? (
                      <div className="flex items-center gap-2 justify-center">
                        <div className="w-20 h-2 bg-gray-100 rounded-full">
                          <div
                            className={`h-2 rounded-full ${isOver ? 'bg-red-400' : usagePct > 80 ? 'bg-amber-400' : 'bg-green-400'}`}
                            style={{ width: `${Math.min(usagePct, 100)}%` }}
                          />
                        </div>
                        <span className={`text-xs font-medium ${isOver ? 'text-red-600' : 'text-gray-600'}`}>{usagePct}%</span>
                      </div>
                    ) : <span className="text-gray-300 text-xs text-center block">—</span>}
                  </td>
                </tr>
              );
            })}
          </tbody>
          <tfoot className="bg-gray-50 border-t-2 border-gray-200">
            <tr>
              <td className="px-5 py-3 text-sm font-bold text-gray-900">Total</td>
              <td className="px-5 py-3 text-right text-sm font-bold text-gray-900">
                ${phases.reduce((s, p) => s + (p.labor_budget || 0), 0).toLocaleString()}
              </td>
              <td className="px-5 py-3 text-right text-sm font-bold text-gray-900">
                ${phases.reduce((s, p) => s + (p.materials_budget || 0), 0).toLocaleString()}
              </td>
              <td className="px-5 py-3 text-right text-sm font-bold text-gray-900">
                ${phases.reduce((s, p) => s + (p.other_budget || 0), 0).toLocaleString()}
              </td>
              <td className="px-5 py-3 text-right text-sm font-bold text-gray-900">${totalBudget.toLocaleString()}</td>
              <td className={`px-5 py-3 text-right text-sm font-bold ${totalActual > totalBudget ? 'text-red-600' : 'text-gray-900'}`}>
                ${totalActual.toLocaleString()}
              </td>
              <td className={`px-5 py-3 text-right text-sm font-bold ${totalBudget - totalActual < 0 ? 'text-red-600' : 'text-gray-900'}`}>
                ${(totalBudget - totalActual).toLocaleString()}
              </td>
              <td className="px-5 py-3 text-center text-sm font-bold text-gray-700">
                {totalBudget > 0 ? `${Math.round((totalActual / totalBudget) * 100)}%` : '—'}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}

// =====================================================
// Work Orders Tab
// =====================================================
import { useEffect, useState as useStateWO } from 'react';

function WorkOrdersTab({ projectId, phases }: { projectId: string; phases: ProjectPhase[] }) {
  const [workOrders, setWorkOrders] = useStateWO<Array<{
    id: string;
    wo_number: string;
    title: string;
    status: string;
    priority: string;
    scheduled_date: string | null;
    project_phase_id: string | null;
    employees: { first_name: string; last_name: string } | null;
  }>>([]);

  useEffect(() => {
    supabase
      .from('work_orders')
      .select('id, wo_number, title, status, priority, scheduled_date, project_phase_id, employees:assigned_to(first_name, last_name)')
      .eq('project_id', projectId)
      .order('scheduled_date', { ascending: true })
      .then(({ data }) => setWorkOrders(data || []));
  }, [projectId]);

  const phaseMap = Object.fromEntries(phases.map(ph => [ph.id, ph.name]));

  const statusColor: Record<string, string> = {
    unassigned: 'bg-gray-100 text-gray-600',
    assigned: 'bg-blue-100 text-blue-700',
    in_progress: 'bg-blue-100 text-blue-800',
    completed: 'bg-green-100 text-green-700',
    cancelled: 'bg-red-100 text-red-700',
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div className="text-sm font-semibold text-gray-700">{workOrders.length} Work Orders</div>
      </div>

      {workOrders.length === 0 ? (
        <div className="text-center py-12 text-gray-400 text-sm bg-gray-50 rounded-xl border border-dashed border-gray-200">
          No work orders tied to this project yet. Create work orders and link them to this project.
        </div>
      ) : (
        <div className="bg-white border border-gray-100 rounded-xl shadow-sm overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">WO #</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Title</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Phase</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Status</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Assigned To</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Scheduled</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {workOrders.map(wo => (
                <tr key={wo.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-xs font-mono text-gray-500">{wo.wo_number}</td>
                  <td className="px-4 py-3 text-sm font-medium text-gray-900">{wo.title}</td>
                  <td className="px-4 py-3 text-xs text-gray-500">
                    {wo.project_phase_id ? phaseMap[wo.project_phase_id] || 'Unknown Phase' : '—'}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${statusColor[wo.status] || 'bg-gray-100 text-gray-600'}`}>
                      {wo.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600">
                    {wo.employees ? `${wo.employees.first_name} ${wo.employees.last_name}` : '—'}
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-500">
                    {wo.scheduled_date ? new Date(wo.scheduled_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// =====================================================
// RMR / Contract Tab
// =====================================================
function RMRTab({ rmr, project }: { rmr: ProjectRMR | null; project: Project }) {
  const [showForm, setShowForm] = useState(false);

  if (!rmr && !showForm) {
    return (
      <div className="text-center py-16 bg-gray-50 rounded-xl border border-dashed border-gray-200">
        <Shield className="h-10 w-10 text-gray-300 mx-auto mb-3" />
        <div className="text-gray-500 font-medium mb-1">No Monitoring Contract</div>
        <div className="text-gray-400 text-sm mb-4">Create the recurring revenue contract that will be generated when this project is completed.</div>
        <button
          onClick={() => setShowForm(true)}
          className="px-4 py-2 bg-green-600 text-white text-sm font-semibold rounded-lg hover:bg-green-700"
        >
          Create Monitoring Contract
        </button>
      </div>
    );
  }

  if (rmr) {
    return (
      <div className="max-w-xl">
        <div className="bg-white border border-gray-100 rounded-xl p-6 shadow-sm">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 bg-green-100 rounded-xl flex items-center justify-center">
              <Shield className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <div className="font-semibold text-gray-900">Monitoring / Service Contract</div>
              <div className={`text-xs font-medium mt-0.5 ${
                rmr.status === 'active' ? 'text-green-600' :
                rmr.status === 'pending' ? 'text-amber-600' : 'text-gray-400'
              }`}>{rmr.status}</div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 mb-6">
            <div className="bg-green-50 rounded-xl p-4">
              <div className="text-xs text-green-600 font-medium mb-1">Monthly Rate</div>
              <div className="text-3xl font-bold text-green-800">${rmr.monthly_rate}</div>
              <div className="text-xs text-green-600 mt-0.5">/month</div>
            </div>
            <div className="bg-gray-50 rounded-xl p-4">
              <div className="text-xs text-gray-500 font-medium mb-1">Annual Value</div>
              <div className="text-3xl font-bold text-gray-800">${(rmr.monthly_rate * 12).toLocaleString()}</div>
              <div className="text-xs text-gray-400 mt-0.5">/year</div>
            </div>
          </div>

          <div className="space-y-3 text-sm">
            <div className="flex justify-between border-b border-gray-50 pb-2">
              <span className="text-gray-500">Monitoring Type</span>
              <span className="font-medium text-gray-900 capitalize">{rmr.monitoring_type.replace('_', ' ')}</span>
            </div>
            <div className="flex justify-between border-b border-gray-50 pb-2">
              <span className="text-gray-500">Contract Term</span>
              <span className="font-medium text-gray-900">{rmr.contract_term_months} months</span>
            </div>
            {rmr.start_date && (
              <div className="flex justify-between border-b border-gray-50 pb-2">
                <span className="text-gray-500">Start Date</span>
                <span className="font-medium text-gray-900">{new Date(rmr.start_date).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</span>
              </div>
            )}
            {rmr.end_date && (
              <div className="flex justify-between border-b border-gray-50 pb-2">
                <span className="text-gray-500">End / Renewal Date</span>
                <span className="font-medium text-gray-900">{new Date(rmr.end_date).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</span>
              </div>
            )}
            <div className="flex justify-between border-b border-gray-50 pb-2">
              <span className="text-gray-500">Auto-Renews</span>
              <span className="font-medium text-gray-900">{rmr.auto_renews ? 'Yes' : 'No'}</span>
            </div>
          </div>

          {rmr.service_includes && rmr.service_includes.length > 0 && (
            <div className="mt-4">
              <div className="text-xs font-semibold text-gray-500 mb-2">Services Included</div>
              <div className="flex flex-wrap gap-2">
                {rmr.service_includes.map((s, i) => (
                  <span key={i} className="px-2 py-1 bg-green-100 text-green-700 text-xs rounded-lg">{s}</span>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  return null;
}
