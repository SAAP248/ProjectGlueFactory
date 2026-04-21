import { useState } from 'react';
import { X } from 'lucide-react';
import type { Deal } from './types';
import { SALES_STAGES, FORECAST_CATEGORIES } from './types';
import { supabase } from '../../lib/supabase';

interface Company {
  id: string;
  name: string;
}

interface Props {
  initialStage?: string;
  onClose: () => void;
  onCreate: (deal: Partial<Deal>) => Promise<Deal | null>;
}

export default function NewDealModal({ initialStage = 'Lead', onClose, onCreate }: Props) {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loadingCompanies, setLoadingCompanies] = useState(false);
  const [form, setForm] = useState({
    title: '',
    company_id: '',
    value: '',
    probability: '20',
    sales_stage: initialStage,
    forecast_category: 'pipeline' as Deal['forecast_category'],
    expected_close_date: '',
    description: '',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useState(() => {
    setLoadingCompanies(true);
    supabase.from('companies').select('id, name').order('name').then(({ data }) => {
      if (data) setCompanies(data);
      setLoadingCompanies(false);
    });
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim()) { setError('Title is required'); return; }
    if (!form.company_id) { setError('Please select a company'); return; }
    setSaving(true);
    const result = await onCreate({
      title: form.title.trim(),
      company_id: form.company_id,
      value: Number(form.value) || 0,
      probability: Number(form.probability) || 0,
      sales_stage: form.sales_stage,
      install_status: 'Not Scheduled',
      office_status: 'Sold',
      forecast_category: form.forecast_category,
      expected_close_date: form.expected_close_date || null,
      description: form.description || null,
    });
    setSaving(false);
    if (result) onClose();
    else setError('Failed to create deal. Please try again.');
  };

  return (
    <>
      <div className="fixed inset-0 bg-black/30 z-40" onClick={onClose} />
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
            <h2 className="text-lg font-bold text-gray-900">New Deal</h2>
            <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500 transition-colors">
              <X className="h-4 w-4" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="p-6 space-y-4">
            {error && (
              <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                {error}
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Deal Title *</label>
              <input
                required
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Enterprise Security System"
                value={form.title}
                onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Company *</label>
              <select
                required
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                value={form.company_id}
                onChange={e => setForm(f => ({ ...f, company_id: e.target.value }))}
                disabled={loadingCompanies}
              >
                <option value="">Select a company…</option>
                {companies.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Deal Value</label>
                <input
                  type="number"
                  min={0}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="50000"
                  value={form.value}
                  onChange={e => setForm(f => ({ ...f, value: e.target.value }))}
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">
                  Probability: {form.probability}%
                </label>
                <input
                  type="range" min={0} max={100} step={5}
                  className="w-full mt-2 accent-blue-600"
                  value={form.probability}
                  onChange={e => setForm(f => ({ ...f, probability: e.target.value }))}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Sales Stage</label>
                <select
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                  value={form.sales_stage}
                  onChange={e => setForm(f => ({ ...f, sales_stage: e.target.value }))}
                >
                  {SALES_STAGES.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Forecast</label>
                <select
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                  value={form.forecast_category}
                  onChange={e => setForm(f => ({ ...f, forecast_category: e.target.value as Deal['forecast_category'] }))}
                >
                  {FORECAST_CATEGORIES.map(fc => <option key={fc.value} value={fc.value}>{fc.label}</option>)}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Expected Close Date</label>
              <input
                type="date"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={form.expected_close_date}
                onChange={e => setForm(f => ({ ...f, expected_close_date: e.target.value }))}
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Description</label>
              <textarea
                rows={2}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                placeholder="Brief description of the opportunity…"
                value={form.description}
                onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
              />
            </div>

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 text-sm rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving}
                className="flex-1 px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors font-medium"
              >
                {saving ? 'Creating…' : 'Create Deal'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </>
  );
}
