import { useState } from 'react';
import {
  Building2, Plus, X, Pencil, Trash2, Eye, EyeOff,
  Globe, Zap, Flame, Droplets, Phone, Tv, Shield
} from 'lucide-react';
import type { SiteServiceProvider } from './SiteOverview';
import { supabase } from '../../lib/supabase';

interface Props {
  siteId: string;
  providers: SiteServiceProvider[];
  onRefresh: () => void;
}

const SERVICE_TYPES = ['Internet', 'Electric', 'Gas', 'Water', 'Phone', 'Cable', 'Security Monitoring', 'Other'];

const SERVICE_ICONS: Record<string, React.ElementType> = {
  Internet: Globe, Electric: Zap, Gas: Flame, Water: Droplets,
  Phone: Phone, Cable: Tv, 'Security Monitoring': Shield, Other: Building2,
};

const SERVICE_COLORS: Record<string, string> = {
  Internet: 'bg-blue-100 text-blue-700',
  Electric: 'bg-yellow-100 text-yellow-700',
  Gas: 'bg-orange-100 text-orange-700',
  Water: 'bg-cyan-100 text-cyan-700',
  Phone: 'bg-green-100 text-green-700',
  Cable: 'bg-violet-100 text-violet-700',
  'Security Monitoring': 'bg-red-100 text-red-700',
  Other: 'bg-gray-100 text-gray-600',
};

const emptyForm = { provider_name: '', service_type: 'Internet', account_number: '', phone: '', email: '', notes: '' };

export default function SiteOverviewProviders({ siteId, providers, onRefresh }: Props) {
  const [modal, setModal] = useState<{ mode: 'add' | 'edit'; data: typeof emptyForm; id?: string } | null>(null);
  const [saving, setSaving] = useState(false);
  const [visibleAcct, setVisibleAcct] = useState<Set<string>>(new Set());

  const toggleAcct = (id: string) => setVisibleAcct(prev => {
    const n = new Set(prev);
    n.has(id) ? n.delete(id) : n.add(id);
    return n;
  });

  async function saveProvider() {
    if (!modal || !modal.data.provider_name.trim()) return;
    setSaving(true);
    const payload = {
      site_id: siteId,
      provider_name: modal.data.provider_name.trim(),
      service_type: modal.data.service_type,
      account_number: modal.data.account_number || null,
      phone: modal.data.phone || null,
      email: modal.data.email || null,
      notes: modal.data.notes || null,
    };
    if (modal.mode === 'add') {
      await supabase.from('site_service_providers').insert(payload);
    } else if (modal.id) {
      await supabase.from('site_service_providers').update(payload).eq('id', modal.id);
    }
    setSaving(false);
    setModal(null);
    onRefresh();
  }

  async function deleteProvider(id: string, name: string) {
    if (!window.confirm(`Delete "${name}"?`)) return;
    await supabase.from('site_service_providers').delete().eq('id', id);
    onRefresh();
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-teal-50 rounded-lg"><Building2 className="h-5 w-5 text-teal-600" /></div>
          <div>
            <h3 className="font-semibold text-gray-900">Service Providers</h3>
            <p className="text-xs text-gray-500">{providers.length} provider{providers.length !== 1 ? 's' : ''}</p>
          </div>
        </div>
        <button onClick={() => setModal({ mode: 'add', data: { ...emptyForm } })}
          className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-teal-600 bg-teal-50 rounded-lg hover:bg-teal-100 transition-colors">
          <Plus className="h-4 w-4" /> Add Provider
        </button>
      </div>

      {providers.length > 0 ? (
        <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-4">
          {providers.map(p => {
            const Icon = SERVICE_ICONS[p.service_type] || Building2;
            const color = SERVICE_COLORS[p.service_type] || SERVICE_COLORS.Other;
            return (
              <div key={p.id} className="border border-gray-200 rounded-xl p-4 hover:shadow-sm transition-all group relative">
                <div className="absolute top-3 right-3 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button onClick={() => setModal({
                    mode: 'edit', id: p.id,
                    data: { provider_name: p.provider_name, service_type: p.service_type, account_number: p.account_number || '', phone: p.phone || '', email: p.email || '', notes: p.notes || '' },
                  })} className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors">
                    <Pencil className="h-3.5 w-3.5" />
                  </button>
                  <button onClick={() => deleteProvider(p.id, p.provider_name)}
                    className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors">
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>

                <div className="flex items-center gap-2 mb-2">
                  <span className={`px-2 py-0.5 text-xs rounded-full font-medium inline-flex items-center gap-1 ${color}`}>
                    <Icon className="h-3 w-3" /> {p.service_type}
                  </span>
                </div>
                <div className="font-semibold text-gray-900 text-sm">{p.provider_name}</div>

                {p.account_number && (
                  <div className="flex items-center gap-1.5 mt-1.5">
                    <span className="text-xs text-gray-500">Acct:</span>
                    <span className="text-xs font-mono text-gray-700">
                      {visibleAcct.has(p.id) ? p.account_number : '\u2022'.repeat(Math.min(p.account_number.length, 10))}
                    </span>
                    <button onClick={() => toggleAcct(p.id)} className="p-0.5 text-gray-400 hover:text-gray-600 transition-colors">
                      {visibleAcct.has(p.id) ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                    </button>
                  </div>
                )}

                {p.phone && (
                  <a href={`tel:${p.phone}`} className="flex items-center gap-1 text-xs text-gray-500 hover:text-blue-600 mt-1 transition-colors">
                    <Phone className="h-3 w-3" />{p.phone}
                  </a>
                )}
                {p.notes && <p className="text-xs text-gray-400 italic mt-1.5">{p.notes}</p>}
              </div>
            );
          })}
        </div>
      ) : (
        <div className="py-12 text-center">
          <Building2 className="h-10 w-10 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500 mb-1">No service providers yet</p>
          <button onClick={() => setModal({ mode: 'add', data: { ...emptyForm } })}
            className="text-sm text-teal-600 hover:text-teal-800 font-medium transition-colors">Add your first provider</button>
        </div>
      )}

      {modal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm" onClick={() => setModal(null)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h3 className="font-semibold text-gray-900">{modal.mode === 'add' ? 'Add Provider' : 'Edit Provider'}</h3>
              <button onClick={() => setModal(null)} className="p-1.5 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition-colors"><X className="h-4 w-4" /></button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Provider Name *</label>
                <input value={modal.data.provider_name} onChange={e => setModal(prev => prev ? { ...prev, data: { ...prev.data, provider_name: e.target.value } } : null)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500" placeholder="e.g. AT&T Business" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Service Type</label>
                <select value={modal.data.service_type} onChange={e => setModal(prev => prev ? { ...prev, data: { ...prev.data, service_type: e.target.value } } : null)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500">
                  {SERVICE_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Account Number</label>
                <input value={modal.data.account_number} onChange={e => setModal(prev => prev ? { ...prev, data: { ...prev.data, account_number: e.target.value } } : null)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                  <input value={modal.data.phone} onChange={e => setModal(prev => prev ? { ...prev, data: { ...prev.data, phone: e.target.value } } : null)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                  <input value={modal.data.email} onChange={e => setModal(prev => prev ? { ...prev, data: { ...prev.data, email: e.target.value } } : null)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                <textarea value={modal.data.notes} onChange={e => setModal(prev => prev ? { ...prev, data: { ...prev.data, notes: e.target.value } } : null)}
                  rows={2} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500 resize-none" />
              </div>
            </div>
            <div className="flex justify-end gap-3 px-6 py-4 border-t border-gray-100">
              <button onClick={() => setModal(null)} className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors">Cancel</button>
              <button onClick={saveProvider} disabled={saving || !modal.data.provider_name.trim()}
                className="px-4 py-2 text-sm font-medium text-white bg-teal-600 rounded-lg hover:bg-teal-700 transition-colors disabled:opacity-50">
                {saving ? 'Saving...' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
