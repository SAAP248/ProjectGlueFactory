import { useState } from 'react';
import { X, Plus, Trash2, GripVertical, Lock } from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import type { PhaseTemplate, PhaseTemplateItem } from './types';

interface DraftItem {
  id: string;
  name: string;
  gate_requirement: string;
}

interface Props {
  template?: PhaseTemplate;
  onClose: () => void;
  onSaved: () => void;
}

function makeDraft(items: PhaseTemplateItem[]): DraftItem[] {
  return items.map(i => ({
    id: i.id,
    name: i.name,
    gate_requirement: i.gate_requirement || '',
  }));
}

function newItem(): DraftItem {
  return { id: `new-${Math.random()}`, name: '', gate_requirement: '' };
}

export default function TemplateEditorModal({ template, onClose, onSaved }: Props) {
  const isNew = !template;
  const [name, setName] = useState(template?.name || '');
  const [description, setDescription] = useState(template?.description || '');
  const [items, setItems] = useState<DraftItem[]>(
    template?.items?.length ? makeDraft(template.items) : [newItem()]
  );
  const [saving, setSaving] = useState(false);
  const [dragIdx, setDragIdx] = useState<number | null>(null);
  const [dragOver, setDragOver] = useState<number | null>(null);

  function updateItem(idx: number, key: keyof DraftItem, value: string) {
    setItems(prev => prev.map((it, i) => i === idx ? { ...it, [key]: value } : it));
  }

  function addItem() {
    setItems(prev => [...prev, newItem()]);
  }

  function removeItem(idx: number) {
    setItems(prev => prev.filter((_, i) => i !== idx));
  }

  function handleDragStart(idx: number) {
    setDragIdx(idx);
  }

  function handleDragOver(e: React.DragEvent, idx: number) {
    e.preventDefault();
    setDragOver(idx);
  }

  function handleDrop(idx: number) {
    if (dragIdx === null || dragIdx === idx) { setDragIdx(null); setDragOver(null); return; }
    const next = [...items];
    const [moved] = next.splice(dragIdx, 1);
    next.splice(idx, 0, moved);
    setItems(next);
    setDragIdx(null);
    setDragOver(null);
  }

  async function handleSave() {
    if (!name.trim() || items.some(it => !it.name.trim())) return;
    setSaving(true);

    if (isNew) {
      const { data: tmpl, error } = await supabase
        .from('phase_templates')
        .insert({ name: name.trim(), description: description.trim() || null, is_builtin: false })
        .select()
        .maybeSingle();
      if (!error && tmpl) {
        await supabase.from('phase_template_items').insert(
          items.map((it, i) => ({
            template_id: tmpl.id,
            name: it.name.trim(),
            phase_order: i,
            gate_requirement: it.gate_requirement.trim() || null,
          }))
        );
      }
    } else {
      await supabase
        .from('phase_templates')
        .update({ name: name.trim(), description: description.trim() || null, updated_at: new Date().toISOString() })
        .eq('id', template!.id);

      await supabase.from('phase_template_items').delete().eq('template_id', template!.id);
      await supabase.from('phase_template_items').insert(
        items.map((it, i) => ({
          template_id: template!.id,
          name: it.name.trim(),
          phase_order: i,
          gate_requirement: it.gate_requirement.trim() || null,
        }))
      );
    }

    setSaving(false);
    onSaved();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xl max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between p-5 border-b border-gray-100">
          <h2 className="text-base font-bold text-gray-900">
            {isNew ? 'New Phase Template' : 'Edit Template'}
          </h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1.5">Template Name *</label>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="e.g. Fire Alarm NFPA"
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1.5">Description</label>
            <textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              rows={2}
              placeholder="When to use this template..."
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-semibold text-gray-600">Phases ({items.length})</label>
              <button
                onClick={addItem}
                className="flex items-center gap-1 text-xs font-medium text-blue-600 hover:text-blue-700"
              >
                <Plus className="h-3.5 w-3.5" />
                Add Phase
              </button>
            </div>

            <div className="space-y-2">
              {items.map((item, idx) => (
                <div
                  key={item.id}
                  draggable
                  onDragStart={() => handleDragStart(idx)}
                  onDragOver={e => handleDragOver(e, idx)}
                  onDrop={() => handleDrop(idx)}
                  className={`group border rounded-lg p-3 transition-all cursor-grab active:cursor-grabbing ${
                    dragOver === idx ? 'border-blue-400 bg-blue-50' : 'border-gray-200 bg-gray-50'
                  }`}
                >
                  <div className="flex items-start gap-2">
                    <div className="flex items-center mt-2 text-gray-300 group-hover:text-gray-400 shrink-0">
                      <GripVertical className="h-4 w-4" />
                    </div>
                    <div className="flex-1 space-y-2">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-gray-400 w-5 text-center">{idx + 1}</span>
                        <input
                          type="text"
                          value={item.name}
                          onChange={e => updateItem(idx, 'name', e.target.value)}
                          placeholder="Phase name"
                          className="flex-1 px-2.5 py-1.5 text-sm border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                        />
                        <button
                          onClick={() => removeItem(idx)}
                          disabled={items.length === 1}
                          className="p-1 rounded text-gray-300 hover:text-red-500 disabled:opacity-30"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                      <input
                        type="text"
                        value={item.gate_requirement}
                        onChange={e => updateItem(idx, 'gate_requirement', e.target.value)}
                        placeholder="Gate requirement (optional)"
                        className="w-full px-2.5 py-1.5 text-xs border border-gray-100 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-400 bg-white text-gray-500 placeholder:text-gray-300"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 p-5 border-t border-gray-100">
          <button onClick={onClose} className="px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 rounded-lg">
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving || !name.trim() || items.some(it => !it.name.trim())}
            className="px-5 py-2 bg-blue-600 text-white text-sm font-semibold rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? 'Saving...' : isNew ? 'Create Template' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  );
}

export function DuplicateTemplateModal({ template, onClose, onSaved }: { template: PhaseTemplate; onClose: () => void; onSaved: () => void }) {
  const [name, setName] = useState(`${template.name} (Copy)`);
  const [saving, setSaving] = useState(false);

  async function handleDuplicate() {
    if (!name.trim()) return;
    setSaving(true);
    const { data: newTmpl } = await supabase
      .from('phase_templates')
      .insert({ name: name.trim(), description: template.description || null, is_builtin: false })
      .select()
      .maybeSingle();
    if (newTmpl && template.items?.length) {
      await supabase.from('phase_template_items').insert(
        template.items.map(it => ({
          template_id: newTmpl.id,
          name: it.name,
          phase_order: it.phase_order,
          gate_requirement: it.gate_requirement || null,
        }))
      );
    }
    setSaving(false);
    onSaved();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-9 h-9 bg-blue-100 rounded-lg flex items-center justify-center">
            <Lock className="h-4 w-4 text-blue-600" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-gray-900">Duplicate Template</h2>
            <p className="text-xs text-gray-500 mt-0.5">Creates an editable copy of "{template.name}"</p>
          </div>
        </div>
        <label className="block text-xs font-semibold text-gray-600 mb-1.5">New Template Name</label>
        <input
          type="text"
          value={name}
          onChange={e => setName(e.target.value)}
          className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 mb-4"
        />
        <div className="flex gap-3">
          <button onClick={onClose} className="flex-1 px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 rounded-lg border border-gray-200">
            Cancel
          </button>
          <button
            onClick={handleDuplicate}
            disabled={saving || !name.trim()}
            className="flex-1 px-4 py-2 bg-blue-600 text-white text-sm font-semibold rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            {saving ? 'Duplicating...' : 'Duplicate'}
          </button>
        </div>
      </div>
    </div>
  );
}
