import { CheckCircle, Clock, AlertTriangle, Circle, ChevronDown, ChevronUp, Layers } from 'lucide-react';
import type { ProjectPhase } from './types';
import { getPhaseStatusColor } from './types';
import { useState } from 'react';
import ApplyTemplateModal from './ApplyTemplateModal';

interface Props {
  phases: ProjectPhase[];
  projectId: string;
  onUpdateStatus: (phaseId: string, status: string) => void;
  onRefetch: () => void;
}

const STATUS_OPTIONS = [
  { value: 'not_started', label: 'Not Started' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'completed', label: 'Completed' },
  { value: 'blocked', label: 'Blocked' },
];

function PhaseIcon({ status }: { status: string }) {
  if (status === 'completed') return <CheckCircle className="h-5 w-5 text-green-500" />;
  if (status === 'in_progress') return <Clock className="h-5 w-5 text-blue-500 animate-pulse" />;
  if (status === 'blocked') return <AlertTriangle className="h-5 w-5 text-red-500" />;
  return <Circle className="h-5 w-5 text-gray-300" />;
}

export default function PhaseTimeline({ phases, projectId, onUpdateStatus, onRefetch }: Props) {
  const [expanded, setExpanded] = useState<string | null>(null);
  const [showApplyTemplate, setShowApplyTemplate] = useState(false);

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div className="text-sm font-semibold text-gray-700">
          {phases.length} Phase{phases.length !== 1 ? 's' : ''}
        </div>
        <button
          onClick={() => setShowApplyTemplate(true)}
          className="flex items-center gap-2 px-3 py-1.5 text-xs font-semibold text-blue-700 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 transition-colors"
        >
          <Layers className="h-3.5 w-3.5" />
          Apply Template
        </button>
      </div>

      {phases.length === 0 ? (
        <div className="text-center py-12 text-gray-400 text-sm bg-gray-50 rounded-xl border border-dashed border-gray-200">
          <Layers className="h-8 w-8 text-gray-300 mx-auto mb-2" />
          No phases defined. Click "Apply Template" to add a phase set.
        </div>
      ) : (
        <div className="space-y-2">
          {phases.map((phase, index) => {
            const totalBudget = (phase.labor_budget || 0) + (phase.materials_budget || 0) + (phase.other_budget || 0);
            const totalActual = (phase.labor_actual || 0) + (phase.materials_actual || 0) + (phase.other_actual || 0);
            const isOver = totalActual > totalBudget && totalBudget > 0;
            const isExpanded = expanded === phase.id;

            return (
              <div
                key={phase.id}
                className={`bg-white border rounded-xl overflow-hidden transition-all ${
                  phase.status === 'in_progress' ? 'border-blue-200 shadow-sm' :
                  phase.status === 'blocked' ? 'border-red-200' :
                  phase.status === 'completed' ? 'border-green-100' : 'border-gray-100'
                }`}
              >
                <div
                  className="flex items-center gap-4 p-4 cursor-pointer select-none"
                  onClick={() => setExpanded(isExpanded ? null : phase.id)}
                >
                  <div className="flex flex-col items-center">
                    <PhaseIcon status={phase.status} />
                    {index < phases.length - 1 && (
                      <div className={`w-0.5 h-4 mt-1 ${phase.status === 'completed' ? 'bg-green-300' : 'bg-gray-200'}`} />
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 flex-wrap">
                      <span className="font-semibold text-gray-900 text-sm">{phase.name}</span>
                      <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${getPhaseStatusColor(phase.status)}`}>
                        {phase.status.replace('_', ' ')}
                      </span>
                      {phase.gate_met && (
                        <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-green-50 text-green-700">Gate Met</span>
                      )}
                      {isOver && (
                        <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-red-50 text-red-700">Over Budget</span>
                      )}
                    </div>
                    <div className="flex items-center gap-4 mt-1">
                      {(phase.scheduled_start_date || phase.scheduled_end_date) && (
                        <span className="text-xs text-gray-400">
                          {phase.scheduled_start_date ? new Date(phase.scheduled_start_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : ''}
                          {phase.scheduled_end_date ? ` → ${new Date(phase.scheduled_end_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}` : ''}
                        </span>
                      )}
                      {totalBudget > 0 && (
                        <span className="text-xs text-gray-400">
                          Budget: ${totalBudget.toLocaleString()}
                          {totalActual > 0 && <span className={isOver ? ' text-red-500 font-medium' : ' text-green-600'}> · Actual: ${totalActual.toLocaleString()}</span>}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-3 flex-shrink-0">
                    <select
                      value={phase.status}
                      onChange={e => { e.stopPropagation(); onUpdateStatus(phase.id, e.target.value); }}
                      onClick={e => e.stopPropagation()}
                      className="text-xs border border-gray-200 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                    >
                      {STATUS_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                    </select>
                    {isExpanded ? <ChevronUp className="h-4 w-4 text-gray-400" /> : <ChevronDown className="h-4 w-4 text-gray-400" />}
                  </div>
                </div>

                {isExpanded && (
                  <div className="px-4 pb-4 border-t border-gray-50 pt-3">
                    <div className="grid grid-cols-3 gap-3 mb-3">
                      {[
                        { label: 'Labor', budget: phase.labor_budget, actual: phase.labor_actual },
                        { label: 'Materials', budget: phase.materials_budget, actual: phase.materials_actual },
                        { label: 'Other', budget: phase.other_budget, actual: phase.other_actual },
                      ].map(item => (
                        <div key={item.label} className="bg-gray-50 rounded-lg p-3">
                          <div className="text-xs font-semibold text-gray-500 mb-1">{item.label}</div>
                          <div className="text-sm font-bold text-gray-900">${(item.budget || 0).toLocaleString()}</div>
                          <div className="text-xs text-gray-500">Budget</div>
                          {(item.actual || 0) > 0 && (
                            <>
                              <div className={`text-sm font-bold mt-1 ${(item.actual || 0) > (item.budget || 0) ? 'text-red-600' : 'text-green-600'}`}>
                                ${(item.actual || 0).toLocaleString()}
                              </div>
                              <div className="text-xs text-gray-500">Actual</div>
                            </>
                          )}
                        </div>
                      ))}
                    </div>
                    {phase.gate_requirement && (
                      <div className="flex items-start gap-2 bg-amber-50 rounded-lg p-3">
                        <AlertTriangle className="h-4 w-4 text-amber-500 flex-shrink-0 mt-0.5" />
                        <div>
                          <div className="text-xs font-semibold text-amber-800">Gate Requirement</div>
                          <div className="text-xs text-amber-700 mt-0.5">{phase.gate_requirement}</div>
                        </div>
                        {!phase.gate_met && (
                          <span className="ml-auto text-xs bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full font-medium">Pending</span>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {showApplyTemplate && (
        <ApplyTemplateModal
          projectId={projectId}
          existingPhases={phases}
          onClose={() => setShowApplyTemplate(false)}
          onApplied={() => { setShowApplyTemplate(false); onRefetch(); }}
        />
      )}
    </div>
  );
}
