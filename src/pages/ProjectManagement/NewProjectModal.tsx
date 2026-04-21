import { useState, useEffect } from 'react';
import { X, Briefcase, Layers, Plus, Trash2, CheckCircle } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import type { PhaseTemplate } from './PhaseTemplates/types';

interface Props {
  onClose: () => void;
  onSaved: () => void;
  dealId?: string;
  prefilledCompanyId?: string;
}

interface DraftPhase {
  key: string;
  name: string;
}

type TemplateStep = 'form' | 'phases';

export default function NewProjectModal({ onClose, onSaved, dealId, prefilledCompanyId }: Props) {
  const [step, setStep] = useState<TemplateStep>('form');
  const [companies, setCompanies] = useState<{ id: string; name: string }[]>([]);
  const [employees, setEmployees] = useState<{ id: string; first_name: string; last_name: string }[]>([]);
  const [sites, setSites] = useState<{ id: string; name: string; address: string }[]>([]);
  const [templates, setTemplates] = useState<PhaseTemplate[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | 'none' | null>(null);
  const [draftPhases, setDraftPhases] = useState<DraftPhase[]>([]);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    name: '',
    project_number: '',
    project_type: 'installation',
    company_id: prefilledCompanyId || '',
    site_id: '',
    project_manager_id: '',
    lead_technician_id: '',
    contract_value: '',
    billing_type: 'milestone',
    start_date: '',
    end_date: '',
    description: '',
    ahj_name: '',
    permit_status: 'not_required',
  });

  useEffect(() => {
    async function load() {
      const [coRes, empRes, tmplRes] = await Promise.all([
        supabase.from('companies').select('id, name').eq('status', 'active').order('name'),
        supabase.from('employees').select('id, first_name, last_name').eq('status', 'active').order('first_name'),
        supabase.from('phase_templates').select('*, items:phase_template_items(*)').order('is_builtin', { ascending: false }).order('created_at', { ascending: true }),
      ]);
      if (coRes.data) setCompanies(coRes.data);
      if (empRes.data) setEmployees(empRes.data);
      if (tmplRes.data) {
        const sorted = tmplRes.data.map((t: PhaseTemplate) => ({
          ...t,
          items: (t.items || []).sort((a, b) => a.phase_order - b.phase_order),
        }));
        setTemplates(sorted);
        if (sorted.length > 0) {
          const defaultTmpl = sorted.find((t: PhaseTemplate) => t.name.includes('Standard Commercial')) || sorted[0];
          setSelectedTemplateId(defaultTmpl.id);
          setDraftPhases(buildDraft(defaultTmpl));
        }
      }
    }
    load();
  }, []);

  useEffect(() => {
    async function loadSites() {
      if (!form.company_id) { setSites([]); return; }
      const { data } = await supabase.from('sites').select('id, name, address').eq('company_id', form.company_id).order('name');
      setSites(data || []);
    }
    loadSites();
  }, [form.company_id]);

  function buildDraft(tmpl: PhaseTemplate): DraftPhase[] {
    return (tmpl.items || []).map(it => ({ key: `${it.id}-${Math.random()}`, name: it.name }));
  }

  function selectTemplate(id: string | 'none') {
    setSelectedTemplateId(id);
    if (id === 'none') {
      setDraftPhases([]);
    } else {
      const tmpl = templates.find(t => t.id === id);
      if (tmpl) setDraftPhases(buildDraft(tmpl));
    }
  }

  function addPhase() {
    setDraftPhases(prev => [...prev, { key: `new-${Math.random()}`, name: '' }]);
  }

  function removePhase(key: string) {
    setDraftPhases(prev => prev.filter(p => p.key !== key));
  }

  function updatePhase(key: string, name: string) {
    setDraftPhases(prev => prev.map(p => p.key === key ? { ...p, name } : p));
  }

  function set(k: string, v: string) {
    setForm(prev => ({ ...prev, [k]: v }));
  }

  async function handleSave() {
    if (!form.name || !form.company_id) return;
    setSaving(true);

    const { data: proj, error } = await supabase.from('projects').insert({
      name: form.name,
      project_number: form.project_number || null,
      project_type: form.project_type,
      company_id: form.company_id,
      site_id: form.site_id || null,
      project_manager_id: form.project_manager_id || null,
      lead_technician_id: form.lead_technician_id || null,
      contract_value: parseFloat(form.contract_value) || 0,
      budget: parseFloat(form.contract_value) || 0,
      billing_type: form.billing_type,
      start_date: form.start_date || null,
      end_date: form.end_date || null,
      description: form.description || null,
      ahj_name: form.ahj_name || null,
      permit_status: form.permit_status,
      deal_id: dealId || null,
      status: 'planning',
      actual_cost: 0,
      approved_co_value: 0,
      total_billed: 0,
      completion_percent: 0,
    }).select().maybeSingle();

    if (!error && proj && draftPhases.length > 0) {
      const valid = draftPhases.filter(p => p.name.trim());
      if (valid.length > 0) {
        await supabase.from('project_phases').insert(
          valid.map((p, i) => ({
            project_id: proj.id,
            name: p.name.trim(),
            phase_order: i,
            status: 'not_started',
          }))
        );
      }
    }

    setSaving(false);
    if (!error) onSaved();
  }

  const canProceed = !!form.name && !!form.company_id;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[92vh] flex flex-col">
        <div className="flex items-center justify-between p-6 border-b border-gray-100 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-blue-100 rounded-lg flex items-center justify-center">
              <Briefcase className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <h2 className="text-base font-bold text-gray-900">New Project</h2>
              <div className="flex items-center gap-2 mt-0.5">
                <StepDot active={step === 'form'} done={step === 'phases'} label="Project Details" />
                <div className="w-8 h-px bg-gray-200" />
                <StepDot active={step === 'phases'} done={false} label="Phase Template" />
              </div>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-gray-100 text-gray-400">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">
          {step === 'form' && (
            <div className="p-6 space-y-5">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="block text-xs font-semibold text-gray-600 mb-1.5">Project Name *</label>
                  <input
                    type="text"
                    value={form.name}
                    onChange={e => set('name', e.target.value)}
                    placeholder="e.g. Acme Corp - Full Security Installation"
                    className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1.5">Project Number</label>
                  <input
                    type="text"
                    value={form.project_number}
                    onChange={e => set('project_number', e.target.value)}
                    placeholder="PRJ-2026-XXX"
                    className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1.5">Project Type</label>
                  <select
                    value={form.project_type}
                    onChange={e => set('project_type', e.target.value)}
                    className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="installation">Installation</option>
                    <option value="upgrade">Upgrade / Expansion</option>
                    <option value="service_contract">Service Contract</option>
                    <option value="retrofit">Retrofit</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="block text-xs font-semibold text-gray-600 mb-1.5">Customer *</label>
                  <select
                    value={form.company_id}
                    onChange={e => set('company_id', e.target.value)}
                    className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Select customer...</option>
                    {companies.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
                {sites.length > 0 && (
                  <div className="col-span-2">
                    <label className="block text-xs font-semibold text-gray-600 mb-1.5">Site / Location</label>
                    <select
                      value={form.site_id}
                      onChange={e => set('site_id', e.target.value)}
                      className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">Select site...</option>
                      {sites.map(s => <option key={s.id} value={s.id}>{s.name} — {s.address}</option>)}
                    </select>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1.5">Project Manager</label>
                  <select
                    value={form.project_manager_id}
                    onChange={e => set('project_manager_id', e.target.value)}
                    className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Select PM...</option>
                    {employees.map(e => <option key={e.id} value={e.id}>{e.first_name} {e.last_name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1.5">Lead Technician</label>
                  <select
                    value={form.lead_technician_id}
                    onChange={e => set('lead_technician_id', e.target.value)}
                    className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Select technician...</option>
                    {employees.map(e => <option key={e.id} value={e.id}>{e.first_name} {e.last_name}</option>)}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1.5">Contract Value ($)</label>
                  <input
                    type="number"
                    value={form.contract_value}
                    onChange={e => set('contract_value', e.target.value)}
                    placeholder="0.00"
                    className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1.5">Billing Type</label>
                  <select
                    value={form.billing_type}
                    onChange={e => set('billing_type', e.target.value)}
                    className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="milestone">Milestone Billing</option>
                    <option value="percentage">Percentage of Completion</option>
                    <option value="time_and_materials">Time & Materials</option>
                    <option value="fixed">Fixed Price (One Invoice)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1.5">Start Date</label>
                  <input
                    type="date"
                    value={form.start_date}
                    onChange={e => set('start_date', e.target.value)}
                    className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1.5">Target Completion</label>
                  <input
                    type="date"
                    value={form.end_date}
                    onChange={e => set('end_date', e.target.value)}
                    className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5">Description / Scope</label>
                <textarea
                  value={form.description}
                  onChange={e => set('description', e.target.value)}
                  rows={3}
                  placeholder="Brief description of the installation scope..."
                  className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                />
              </div>
            </div>
          )}

          {step === 'phases' && (
            <div className="p-6 space-y-5">
              <div>
                <h3 className="text-sm font-semibold text-gray-800 mb-1">Choose a Phase Template</h3>
                <p className="text-xs text-gray-400 mb-4">Select the template that best fits this project, then customize the phases below before creating.</p>

                <div className="grid grid-cols-1 gap-2 mb-5">
                  {templates.map(tmpl => {
                    const count = tmpl.items?.length || 0;
                    const isSelected = selectedTemplateId === tmpl.id;
                    return (
                      <button
                        key={tmpl.id}
                        onClick={() => selectTemplate(tmpl.id)}
                        className={`w-full text-left px-4 py-3 rounded-xl border-2 transition-all ${
                          isSelected
                            ? 'border-blue-500 bg-blue-50'
                            : 'border-gray-100 bg-white hover:border-gray-200 hover:bg-gray-50'
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
                  <button
                    onClick={() => selectTemplate('none')}
                    className={`w-full text-left px-4 py-3 rounded-xl border-2 transition-all ${
                      selectedTemplateId === 'none'
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-dashed border-gray-200 bg-white hover:border-gray-300'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      {selectedTemplateId === 'none'
                        ? <CheckCircle className="h-4 w-4 text-blue-500" />
                        : <div className="h-4 w-4 rounded-full border-2 border-gray-300" />
                      }
                      <span className={`text-sm font-medium ${selectedTemplateId === 'none' ? 'text-blue-700' : 'text-gray-500'}`}>
                        No phases — start blank
                      </span>
                    </div>
                  </button>
                </div>

                {selectedTemplateId !== 'none' && selectedTemplateId !== null && (
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label className="text-xs font-semibold text-gray-600">
                        Customize Phases
                        <span className="ml-1.5 text-gray-400 font-normal">— rename or remove before creating</span>
                      </label>
                      <button
                        onClick={addPhase}
                        className="flex items-center gap-1 text-xs font-medium text-blue-600 hover:text-blue-700"
                      >
                        <Plus className="h-3.5 w-3.5" />
                        Add Phase
                      </button>
                    </div>
                    <div className="space-y-2">
                      {draftPhases.map((ph, idx) => (
                        <div key={ph.key} className="flex items-center gap-2">
                          <span className="text-xs font-bold text-gray-300 w-5 text-center">{idx + 1}</span>
                          <input
                            type="text"
                            value={ph.name}
                            onChange={e => updatePhase(ph.key, e.target.value)}
                            className="flex-1 px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                          <button
                            onClick={() => removePhase(ph.key)}
                            disabled={draftPhases.length === 1}
                            className="p-1.5 rounded-lg text-gray-300 hover:text-red-500 hover:bg-red-50 disabled:opacity-30 transition-colors"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        <div className="flex items-center justify-between gap-3 p-6 border-t border-gray-100 flex-shrink-0">
          {step === 'form' ? (
            <>
              <button onClick={onClose} className="px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">
                Cancel
              </button>
              <button
                onClick={() => setStep('phases')}
                disabled={!canProceed}
                className="px-5 py-2 bg-blue-600 text-white text-sm font-semibold rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Next: Phase Template
              </button>
            </>
          ) : (
            <>
              <button onClick={() => setStep('form')} className="px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">
                Back
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="px-5 py-2 bg-blue-600 text-white text-sm font-semibold rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {saving ? 'Creating...' : 'Create Project'}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function StepDot({ active, done, label }: { active: boolean; done: boolean; label: string }) {
  return (
    <div className="flex items-center gap-1.5">
      <div className={`w-2 h-2 rounded-full ${active ? 'bg-blue-600' : done ? 'bg-green-500' : 'bg-gray-200'}`} />
      <span className={`text-xs ${active ? 'text-blue-700 font-semibold' : done ? 'text-green-600' : 'text-gray-400'}`}>{label}</span>
    </div>
  );
}
