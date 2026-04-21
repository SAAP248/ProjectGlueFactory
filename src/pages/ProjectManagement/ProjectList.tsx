import { useState } from 'react';
import {
  Plus, Search, Filter, Briefcase, TrendingUp,
  AlertTriangle, ChevronRight, Building2,
  MapPin, User, DollarSign, Calendar, Layers
} from 'lucide-react';
import { useProjects } from './useProjects';
import type { Project, ProjectStatus } from './types';
import { getStatusColor, getStatusLabel, formatCurrency, formatCurrencyFull } from './types';
import NewProjectModal from './NewProjectModal';

interface Props {
  onViewProject: (id: string) => void;
  onManageTemplates: () => void;
}

export default function ProjectList({ onViewProject, onManageTemplates }: Props) {
  const { projects, loading } = useProjects();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<ProjectStatus | 'all'>('all');
  const [showNewModal, setShowNewModal] = useState(false);
  const [view, setView] = useState<'list' | 'cards'>('list');

  const filtered = projects.filter(p => {
    const matchSearch =
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      (p.companies?.name || '').toLowerCase().includes(search.toLowerCase()) ||
      (p.project_number || '').toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === 'all' || p.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const totalContractValue = projects.reduce((s, p) => s + (p.contract_value || 0) + (p.approved_co_value || 0), 0);
  const totalBilled = projects.reduce((s, p) => s + (p.total_billed || 0), 0);
  const activeCount = projects.filter(p => p.status === 'active').length;
  const atRiskCount = projects.filter(p => {
    const cost = p.actual_cost || 0;
    const budget = p.budget || 1;
    return p.status === 'active' && cost / budget > 0.9;
  }).length;

  const stats = [
    { label: 'Active Projects', value: activeCount, icon: Briefcase, color: 'text-blue-600', bg: 'bg-blue-50' },
    { label: 'Total Contract Value', value: formatCurrency(totalContractValue), icon: DollarSign, color: 'text-green-600', bg: 'bg-green-50' },
    { label: 'Total Billed', value: formatCurrency(totalBilled), icon: TrendingUp, color: 'text-cyan-600', bg: 'bg-cyan-50' },
    { label: 'At Risk', value: atRiskCount, icon: AlertTriangle, color: 'text-orange-600', bg: 'bg-orange-50' },
  ];

  function getPhaseProgress(project: Project) {
    const phases = project.phases || [];
    if (!phases.length) return 0;
    const completed = phases.filter(ph => ph.status === 'completed').length;
    return Math.round((completed / phases.length) * 100);
  }

  function getCurrentPhase(project: Project) {
    const phases = project.phases || [];
    return phases.find(ph => ph.status === 'in_progress') || phases.find(ph => ph.status === 'not_started');
  }

  function getMarginPercent(project: Project) {
    const contractTotal = (project.contract_value || 0) + (project.approved_co_value || 0);
    const cost = project.actual_cost || 0;
    if (!contractTotal) return null;
    return Math.round(((contractTotal - cost) / contractTotal) * 100);
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Projects</h1>
          <p className="text-gray-500 mt-1 text-sm">Manage installation projects, track financials, and monitor phase progress</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={onManageTemplates}
            className="flex items-center px-3 py-2 text-sm font-medium text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <Layers className="h-4 w-4 mr-1.5" />
            Phase Templates
          </button>
          <button
            onClick={() => setShowNewModal(true)}
            className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium text-sm transition-colors"
          >
            <Plus className="h-4 w-4 mr-2" />
            New Project
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {stats.map((stat, i) => (
          <div key={i} className="bg-white rounded-xl p-5 border border-gray-100 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <div className={`w-10 h-10 ${stat.bg} rounded-lg flex items-center justify-center`}>
                <stat.icon className={`h-5 w-5 ${stat.color}`} />
              </div>
            </div>
            <div className="text-2xl font-bold text-gray-900">{stat.value}</div>
            <div className="text-xs text-gray-500 mt-1 font-medium">{stat.label}</div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm mb-4">
        <div className="p-4 flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search projects, companies, project numbers..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-gray-400" />
            {(['all', 'planning', 'active', 'on_hold', 'completed', 'cancelled'] as const).map(s => (
              <button
                key={s}
                onClick={() => setStatusFilter(s)}
                className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                  statusFilter === s
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {s === 'all' ? 'All' : getStatusLabel(s as ProjectStatus)}
              </button>
            ))}
          </div>
          <div className="flex border border-gray-200 rounded-lg overflow-hidden">
            <button
              onClick={() => setView('list')}
              className={`px-3 py-2 text-xs font-medium ${view === 'list' ? 'bg-blue-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'}`}
            >
              List
            </button>
            <button
              onClick={() => setView('cards')}
              className={`px-3 py-2 text-xs font-medium ${view === 'cards' ? 'bg-blue-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'}`}
            >
              Cards
            </button>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-16 text-center">
          <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-gray-500 text-sm">Loading projects...</p>
        </div>
      ) : view === 'list' ? (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Project</th>
                  <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Customer / Site</th>
                  <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Contract Value</th>
                  <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Billed</th>
                  <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Phase Progress</th>
                  <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">PM</th>
                  <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Timeline</th>
                  <th className="px-5 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="px-5 py-16 text-center text-gray-400 text-sm">
                      No projects found
                    </td>
                  </tr>
                ) : filtered.map(project => {
                  const contractTotal = (project.contract_value || 0) + (project.approved_co_value || 0);
                  const billedPct = contractTotal > 0 ? Math.round(((project.total_billed || 0) / contractTotal) * 100) : 0;
                  const phaseProgress = getPhaseProgress(project);
                  const currentPhase = getCurrentPhase(project);
                  const margin = getMarginPercent(project);

                  return (
                    <tr key={project.id} className="hover:bg-gray-50 cursor-pointer" onClick={() => onViewProject(project.id)}>
                      <td className="px-5 py-4">
                        <div className="font-semibold text-gray-900 text-sm">{project.name}</div>
                        <div className="text-xs text-gray-400 mt-0.5">{project.project_number} · {project.project_type}</div>
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-1.5">
                          <Building2 className="h-3.5 w-3.5 text-gray-400 flex-shrink-0" />
                          <span className="text-sm text-gray-900">{project.companies?.name || '—'}</span>
                        </div>
                        {project.sites && (
                          <div className="flex items-center gap-1.5 mt-0.5">
                            <MapPin className="h-3 w-3 text-gray-300 flex-shrink-0" />
                            <span className="text-xs text-gray-400">{project.sites.city}, {project.sites.state}</span>
                          </div>
                        )}
                      </td>
                      <td className="px-5 py-4">
                        <span className={`px-2.5 py-1 text-xs font-medium rounded-full border ${getStatusColor(project.status)}`}>
                          {getStatusLabel(project.status)}
                        </span>
                        {project.approved_co_value > 0 && (
                          <div className="text-xs text-amber-600 mt-1 font-medium">+{formatCurrency(project.approved_co_value)} COs</div>
                        )}
                      </td>
                      <td className="px-5 py-4">
                        <div className="text-sm font-semibold text-gray-900">{formatCurrencyFull(contractTotal)}</div>
                        {margin !== null && (
                          <div className={`text-xs font-medium mt-0.5 ${margin >= 30 ? 'text-green-600' : margin >= 15 ? 'text-yellow-600' : 'text-red-600'}`}>
                            {margin}% margin
                          </div>
                        )}
                      </td>
                      <td className="px-5 py-4">
                        <div className="text-sm text-gray-900 font-medium">{formatCurrencyFull(project.total_billed || 0)}</div>
                        <div className="flex items-center gap-1.5 mt-1">
                          <div className="flex-1 h-1.5 bg-gray-100 rounded-full max-w-[60px]">
                            <div
                              className="h-1.5 bg-green-500 rounded-full"
                              style={{ width: `${Math.min(billedPct, 100)}%` }}
                            />
                          </div>
                          <span className="text-xs text-gray-400">{billedPct}%</span>
                        </div>
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-2">
                          <div className="flex-1 h-2 bg-gray-100 rounded-full max-w-[80px]">
                            <div
                              className="h-2 bg-blue-500 rounded-full"
                              style={{ width: `${phaseProgress}%` }}
                            />
                          </div>
                          <span className="text-xs font-medium text-gray-700">{phaseProgress}%</span>
                        </div>
                        {currentPhase && (
                          <div className="text-xs text-gray-400 mt-0.5 truncate max-w-[140px]">{currentPhase.name}</div>
                        )}
                      </td>
                      <td className="px-5 py-4">
                        {project.project_manager ? (
                          <div className="flex items-center gap-1.5">
                            <div className="w-6 h-6 rounded-full bg-blue-100 text-blue-700 text-xs font-bold flex items-center justify-center">
                              {project.project_manager.first_name[0]}{project.project_manager.last_name[0]}
                            </div>
                            <span className="text-xs text-gray-700">{project.project_manager.first_name}</span>
                          </div>
                        ) : (
                          <span className="text-xs text-gray-400">Unassigned</span>
                        )}
                      </td>
                      <td className="px-5 py-4">
                        {project.start_date && (
                          <div className="text-xs text-gray-600">
                            {new Date(project.start_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                          </div>
                        )}
                        {project.end_date && (
                          <div className="text-xs text-gray-400">
                            → {new Date(project.end_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                          </div>
                        )}
                      </td>
                      <td className="px-5 py-4">
                        <ChevronRight className="h-4 w-4 text-gray-400" />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map(project => {
            const contractTotal = (project.contract_value || 0) + (project.approved_co_value || 0);
            const billedPct = contractTotal > 0 ? Math.round(((project.total_billed || 0) / contractTotal) * 100) : 0;
            const phaseProgress = getPhaseProgress(project);
            const phases = project.phases || [];
            return (
              <div
                key={project.id}
                onClick={() => onViewProject(project.id)}
                className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 hover:shadow-md transition-shadow cursor-pointer"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-gray-900 text-sm leading-snug">{project.name}</div>
                    <div className="text-xs text-gray-400 mt-0.5">{project.project_number}</div>
                  </div>
                  <span className={`ml-2 flex-shrink-0 px-2 py-0.5 text-xs font-medium rounded-full border ${getStatusColor(project.status)}`}>
                    {getStatusLabel(project.status)}
                  </span>
                </div>

                <div className="flex items-center gap-1.5 mb-4">
                  <Building2 className="h-3.5 w-3.5 text-gray-400" />
                  <span className="text-xs text-gray-600">{project.companies?.name}</span>
                  {project.sites && (
                    <>
                      <span className="text-gray-300">·</span>
                      <MapPin className="h-3 w-3 text-gray-300" />
                      <span className="text-xs text-gray-400">{project.sites.city}</span>
                    </>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-3 mb-4">
                  <div className="bg-gray-50 rounded-lg p-2.5">
                    <div className="text-xs text-gray-500 mb-0.5">Contract Value</div>
                    <div className="text-sm font-bold text-gray-900">{formatCurrency(contractTotal)}</div>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-2.5">
                    <div className="text-xs text-gray-500 mb-0.5">Billed</div>
                    <div className="text-sm font-bold text-gray-900">{formatCurrency(project.total_billed || 0)}</div>
                  </div>
                </div>

                <div className="mb-3">
                  <div className="flex justify-between text-xs text-gray-500 mb-1">
                    <span>Phase Progress</span>
                    <span className="font-medium text-gray-700">{phaseProgress}%</span>
                  </div>
                  <div className="h-2 bg-gray-100 rounded-full">
                    <div className="h-2 bg-blue-500 rounded-full transition-all" style={{ width: `${phaseProgress}%` }} />
                  </div>
                  <div className="flex mt-1.5 gap-0.5">
                    {phases.map(ph => (
                      <div
                        key={ph.id}
                        title={ph.name}
                        className={`flex-1 h-1 rounded-full ${
                          ph.status === 'completed' ? 'bg-green-400' :
                          ph.status === 'in_progress' ? 'bg-blue-400' :
                          ph.status === 'blocked' ? 'bg-red-400' : 'bg-gray-200'
                        }`}
                      />
                    ))}
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3 text-xs text-gray-500">
                    {project.project_manager && (
                      <div className="flex items-center gap-1">
                        <User className="h-3 w-3" />
                        <span>{project.project_manager.first_name} {project.project_manager.last_name}</span>
                      </div>
                    )}
                    {project.end_date && (
                      <div className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        <span>{new Date(project.end_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
                      </div>
                    )}
                  </div>
                  <div className="text-xs font-medium text-blue-600">
                    {billedPct}% billed
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {showNewModal && (
        <NewProjectModal onClose={() => setShowNewModal(false)} onSaved={() => window.location.reload()} />
      )}
    </div>
  );
}
