import { useState, useEffect } from 'react';
import { X, Layers, CheckCircle, AlertTriangle } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import type { PhaseTemplate } from './PhaseTemplates/types';
import type { ProjectPhase } from './types';

interface Props {
  projectId: string;
  existingPhases: ProjectPhase[];
  onClose: () => void;
  onApplied: () => void;
}

export default function ApplyTemplateModal({ projectId, existingPhases, onClose, onApplied }: Props) {
  const [templates, setTemplates] = useState<PhaseTemplate[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [applying, setApplying] = useState(false);
  const hasExisting = existingPhases.length > 0;

  useEffect(() => {
    supabase
      .from('phase_templates')
      .select('*, items:phase_template_items(*)')
      .order('is_builtin', { ascending: false })
      .order('created_at', { ascending: true })
      .then(({ data }) => {
        if (data) {
          const sorted = data.map(t => ({
            ...t,
            items: (t.items || []).sort((a: { phase_order: number }, b: { phase_order: number }) => a.phase_order - b.phase_order),
          }));
          setTemplates(sorted);
          if (sorted.length > 0) setSelectedId(sorted[0].id);
        }
      });
  }, []);

  async function handleApply() {
    if (!selectedId) return;
    const template = templates.find(t => t.id === selectedId);
    if (!template || !template.items?.length) return;

    setApplying(true);

    const templateNames = template.items.map(it => it.name.trim().toLowerCase());

    if (hasExisting) {
      const existingByName = new Map(existingPhases.map(ph => [ph.name.trim().toLowerCase(), ph]));
      const updates: { id: string; phase_order: number }[] = [];
      const inserts: { project_id: string; name: string; phase_order: number; status: string; gate_requirement?: string }[] = [];

      template.items.forEach((templateItem, newOrder) => {
        const key = templateItem.name.trim().toLowerCase();
        const existingMatch = existingByName.get(key);
        if (existingMatch) {
          updates.push({ id: existingMatch.id, phase_order: newOrder });
          existingByName.delete(key);
        } else {
          inserts.push({
            project_id: projectId,
            name: templateItem.name,
            phase_order: newOrder,
            status: 'not_started',
            gate_requirement: templateItem.gate_requirement || undefined,
          });
        }
      });

      let appendOrder = template.items.length;
      for (const [, remaining] of existingByName) {
        const matchedByName = templateNames.some(tn =>
          tn.includes(remaining.name.trim().toLowerCase().slice(0, 6)) ||
          remaining.name.trim().toLowerCase().includes(tn.slice(0, 6))
        );
        if (!matchedByName) {
          updates.push({ id: remaining.id, phase_order: appendOrder++ });
        }
      }

      await Promise.all([
        ...updates.map(u =>
          supabase.from('project_phases').update({ phase_order: u.phase_order }).eq('id', u.id)
        ),
        inserts.length > 0 ? supabase.from('project_phases').insert(inserts) : Promise.resolve(),
      ]);
    } else {
      await supabase.from('project_phases').insert(
        template.items.map((it, i) => ({
          project_id: projectId,
          name: it.name,
          phase_order: i,
          status: 'not_started',
          gate_requirement: it.gate_requirement || null,
        }))
      );
    }

    setApplying(false);
    onApplied();
  }

  const selectedTemplate = templates.find(t => t.id === selectedId);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[85vh] flex flex-col">
        <div className="flex items-center justify-between p-5 border-b border-gray-100 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
              <Layers className="h-4 w-4 text-blue-600" />
            </div>
            <h2 className="text-base font-bold text-gray-900">Apply Phase Template</h2>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {hasExisting && (
            <div className="flex items-start gap-2.5 bg-amber-50 border border-amber-200 rounded-xl p-3.5">
              <AlertTriangle className="h-4 w-4 text-amber-500 flex-shrink-0 mt-0.5" />
              <div className="text-xs text-amber-800 leading-relaxed">
                This project already has <strong>{existingPhases.length} phases</strong>. Applying a template will
                re-order matching phases into the template's sequence and add any new ones.
                Phases that don't match will be appended at the end.
              </div>
            </div>
          )}

          <div className="space-y-2">
            {templates.map(tmpl => {
              const count = tmpl.items?.length || 0;
              const isSelected = selectedId === tmpl.id;
              return (
                <button
                  key={tmpl.id}
                  onClick={() => setSelectedId(tmpl.id)}
                  className={`w-full text-left px-4 py-3 rounded-xl border-2 transition-all ${
                    isSelected ? 'border-blue-500 bg-blue-50' : 'border-gray-100 bg-white hover:border-gray-200 hover:bg-gray-50'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {isSelected
                        ? <CheckCircle className="h-4 w-4 text-blue-500 flex-shrink-0" />
                        : <Layers className="h-4 w-4 text-gray-300 flex-shrink-0" />
                      }
                      <span className={`text-sm font-semibold ${isSelected ? 'text-blue-800' : 'text-gray-800'}`}>{tmpl.name}</span>
                      {tmpl.is_builtin && (
                        <span className="text-xs text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded">Built-in</span>
                      )}
                    </div>
                    <span className={`text-xs font-medium ${isSelected ? 'text-blue-500' : 'text-gray-400'}`}>
                      {count} phase{count !== 1 ? 's' : ''}
                    </span>
                  </div>
                  {tmpl.description && (
                    <p className={`text-xs mt-0.5 ml-6 ${isSelected ? 'text-blue-600' : 'text-gray-400'}`}>{tmpl.description}</p>
                  )}
                </button>
              );
            })}
          </div>

          {selectedTemplate?.items && selectedTemplate.items.length > 0 && (
            <div className="bg-gray-50 rounded-xl p-4 border border-gray-100">
              <div className="text-xs font-semibold text-gray-500 mb-3">Preview — {selectedTemplate.name}</div>
              <div className="space-y-1.5">
                {selectedTemplate.items.map((item, idx) => {
                  const existingKey = item.name.trim().toLowerCase();
                  const alreadyExists = existingPhases.some(
                    ph => ph.name.trim().toLowerCase() === existingKey
                  );
                  return (
                    <div key={item.id} className="flex items-center gap-2.5">
                      <span className="text-xs font-bold text-gray-300 w-4 text-right">{idx + 1}</span>
                      <span className="text-xs text-gray-700">{item.name}</span>
                      {alreadyExists && (
                        <span className="text-xs bg-green-100 text-green-700 px-1.5 py-0.5 rounded font-medium ml-auto">exists</span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        <div className="flex items-center justify-end gap-3 p-5 border-t border-gray-100 flex-shrink-0">
          <button onClick={onClose} className="px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 rounded-lg">
            Cancel
          </button>
          <button
            onClick={handleApply}
            disabled={applying || !selectedId}
            className="px-5 py-2 bg-blue-600 text-white text-sm font-semibold rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {applying ? 'Applying...' : 'Apply Template'}
          </button>
        </div>
      </div>
    </div>
  );
}
