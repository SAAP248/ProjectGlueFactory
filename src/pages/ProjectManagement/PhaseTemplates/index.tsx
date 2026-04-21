import { useState } from 'react';
import { Plus, Lock, Pencil, Copy, Trash2, ChevronDown, ChevronUp, AlertTriangle } from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import { usePhaseTemplates } from './usePhaseTemplates';
import TemplateEditorModal, { DuplicateTemplateModal } from './TemplateEditorModal';
import type { PhaseTemplate } from './types';

export default function PhaseTemplateManager() {
  const { templates, loading, refetch } = usePhaseTemplates();
  const [expanded, setExpanded] = useState<string | null>(null);
  const [editing, setEditing] = useState<PhaseTemplate | null | 'new'>(null);
  const [duplicating, setDuplicating] = useState<PhaseTemplate | null>(null);
  const [deleting, setDeleting] = useState<PhaseTemplate | null>(null);

  async function confirmDelete(template: PhaseTemplate) {
    await supabase.from('phase_templates').delete().eq('id', template.id);
    setDeleting(null);
    refetch();
  }

  const builtin = templates.filter(t => t.is_builtin);
  const custom = templates.filter(t => !t.is_builtin);

  return (
    <div className="max-w-3xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-lg font-bold text-gray-900">Phase Templates</h2>
          <p className="text-sm text-gray-500 mt-0.5">Reusable phase sets you can select when creating or updating a project.</p>
        </div>
        <button
          onClick={() => setEditing('new')}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-semibold rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus className="h-4 w-4" />
          New Template
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="w-7 h-7 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <div className="space-y-6">
          {builtin.length > 0 && (
            <section>
              <div className="flex items-center gap-2 mb-3">
                <Lock className="h-3.5 w-3.5 text-gray-400" />
                <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Built-in Templates</span>
                <span className="text-xs text-gray-300">· Read-only, duplicate to customize</span>
              </div>
              <div className="space-y-2">
                {builtin.map(t => (
                  <TemplateCard
                    key={t.id}
                    template={t}
                    isExpanded={expanded === t.id}
                    onToggle={() => setExpanded(expanded === t.id ? null : t.id)}
                    onDuplicate={() => setDuplicating(t)}
                  />
                ))}
              </div>
            </section>
          )}

          <section>
            <div className="flex items-center gap-2 mb-3">
              <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Your Templates</span>
            </div>
            {custom.length === 0 ? (
              <div className="text-center py-10 border-2 border-dashed border-gray-200 rounded-xl text-gray-400 text-sm">
                No custom templates yet. Click "New Template" to create one, or duplicate a built-in.
              </div>
            ) : (
              <div className="space-y-2">
                {custom.map(t => (
                  <TemplateCard
                    key={t.id}
                    template={t}
                    isExpanded={expanded === t.id}
                    onToggle={() => setExpanded(expanded === t.id ? null : t.id)}
                    onEdit={() => setEditing(t)}
                    onDuplicate={() => setDuplicating(t)}
                    onDelete={() => setDeleting(t)}
                  />
                ))}
              </div>
            )}
          </section>
        </div>
      )}

      {editing === 'new' && (
        <TemplateEditorModal
          onClose={() => setEditing(null)}
          onSaved={() => { setEditing(null); refetch(); }}
        />
      )}

      {editing && editing !== 'new' && (
        <TemplateEditorModal
          template={editing}
          onClose={() => setEditing(null)}
          onSaved={() => { setEditing(null); refetch(); }}
        />
      )}

      {duplicating && (
        <DuplicateTemplateModal
          template={duplicating}
          onClose={() => setDuplicating(null)}
          onSaved={() => { setDuplicating(null); refetch(); }}
        />
      )}

      {deleting && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-9 h-9 bg-red-100 rounded-lg flex items-center justify-center">
                <AlertTriangle className="h-4 w-4 text-red-600" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-gray-900">Delete Template?</h2>
                <p className="text-xs text-gray-500 mt-0.5">"{deleting.name}" will be permanently removed.</p>
              </div>
            </div>
            <div className="flex gap-3">
              <button onClick={() => setDeleting(null)} className="flex-1 px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 rounded-lg border border-gray-200">
                Cancel
              </button>
              <button
                onClick={() => confirmDelete(deleting)}
                className="flex-1 px-4 py-2 bg-red-600 text-white text-sm font-semibold rounded-lg hover:bg-red-700"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function TemplateCard({
  template,
  isExpanded,
  onToggle,
  onEdit,
  onDuplicate,
  onDelete,
}: {
  template: PhaseTemplate;
  isExpanded: boolean;
  onToggle: () => void;
  onEdit?: () => void;
  onDuplicate: () => void;
  onDelete?: () => void;
}) {
  const count = template.items?.length || 0;

  return (
    <div className="bg-white border border-gray-100 rounded-xl shadow-sm overflow-hidden">
      <div
        className="flex items-center gap-4 px-4 py-3.5 cursor-pointer select-none hover:bg-gray-50/60 transition-colors"
        onClick={onToggle}
      >
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-gray-900">{template.name}</span>
            {template.is_builtin && (
              <span className="px-1.5 py-0.5 text-xs bg-gray-100 text-gray-500 rounded font-medium">Built-in</span>
            )}
            <span className="text-xs text-gray-400">{count} phase{count !== 1 ? 's' : ''}</span>
          </div>
          {template.description && (
            <p className="text-xs text-gray-400 mt-0.5 truncate">{template.description}</p>
          )}
        </div>

        <div className="flex items-center gap-1 flex-shrink-0" onClick={e => e.stopPropagation()}>
          {onEdit && (
            <button
              onClick={onEdit}
              className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors"
              title="Edit"
            >
              <Pencil className="h-3.5 w-3.5" />
            </button>
          )}
          <button
            onClick={onDuplicate}
            className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors"
            title="Duplicate"
          >
            <Copy className="h-3.5 w-3.5" />
          </button>
          {onDelete && (
            <button
              onClick={onDelete}
              className="p-1.5 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-500 transition-colors"
              title="Delete"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          )}
          <div className="ml-1 text-gray-300">
            {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </div>
        </div>
      </div>

      {isExpanded && (
        <div className="px-4 pb-4 border-t border-gray-50 pt-3">
          <div className="space-y-1.5">
            {(template.items || []).map((item, idx) => (
              <div key={item.id} className="flex items-start gap-3">
                <div className="w-5 h-5 rounded-full bg-gray-100 flex items-center justify-center text-xs font-bold text-gray-400 flex-shrink-0 mt-0.5">
                  {idx + 1}
                </div>
                <div>
                  <div className="text-sm text-gray-800">{item.name}</div>
                  {item.gate_requirement && (
                    <div className="text-xs text-amber-600 mt-0.5">{item.gate_requirement}</div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
