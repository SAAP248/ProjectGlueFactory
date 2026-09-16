import { useState, useEffect } from 'react';
import {
  Plus, Pencil, Trash2, X, Check, Phone, Mail, Eye, EyeOff,
  Wifi, Zap, Flame, Droplets, PhoneCall, Tv2, Shield, Building2, HelpCircle
} from 'lucide-react';
import { supabase } from '../../lib/supabase';

interface ServiceProvider {
  id: string;
  site_id: string;
  provider_name: string;
  service_type: string;
  account_number: string | null;
  phone: string | null;
  email: string | null;
  notes: string | null;
}

const SERVICE_TYPES = ['Internet', 'Electric', 'Gas', 'Water', 'Phone', 'Cable', 'Security Monitoring', 'Other'];

const serviceIcon: Record<string, React.ElementType> = {
  Internet: Wifi,
  Electric: Zap,
  Gas: Flame,
  Water: Droplets,
  Phone: PhoneCall,
  Cable: Tv2,
  'Security Monitoring': Shield,
};

const serviceColor: Record<string, string> = {
  Internet: 'text-blue-600 bg-blue-50',
  Electric: 'text-yellow-600 bg-yellow-50',
  Gas: 'text-orange-600 bg-orange-50',
  Water: 'text-cyan-600 bg-cyan-50',
  Phone: 'text-green-600 bg-green-50',
  Cable: 'text-rose-600 bg-rose-50',
  'Security Monitoring': 'text-red-600 bg-red-50',
};

const emptyForm = { provider_name: '', service_type: 'Internet', account_number: '', phone: '', email: '', notes: '' };

export default function SiteServiceProviders({ siteId }: { siteId: string }) {
  const [providers, setProviders] = useState<ServiceProvider[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [shownAccounts, setShownAccounts] = useState<Set<string>>(new Set());

  useEffect(() => { loadProviders(); }, [siteId]);

  async function loadProviders() {
    const { data } = await supabase
      .from('site_service_providers')
      .select('*')
      .eq('site_id', siteId)
      .order('created_at');
    if (data) setProviders(data);
    setLoading(false);
  }

  function startEdit(p: ServiceProvider) {
    setEditingId(p.id);
    setForm({
      provider_name: p.provider_name,
      service_type: p.service_type,
      account_number: p.account_number || '',
      phone: p.phone || '',
      email: p.email || '',
      notes: p.notes || '',
    });
    setShowForm(true);
  }

  function startAdd() {
    setEditingId(null);
    setForm(emptyForm);
    setShowForm(true);
  }

  async function save() {
    if (!form.provider_name.trim()) return;
    setSaving(true);
    const payload = {
      site_id: siteId,
      provider_name: form.provider_name.trim(),
      service_type: form.service_type,
      account_number: form.account_number || null,
      phone: form.phone || null,
      email: form.email || null,
      notes: form.notes || null,
    };
    if (editingId) {
      await supabase.from('site_service_providers').update(payload).eq('id', editingId);
    } else {
      await supabase.from('site_service_providers').insert(payload);
    }
    setShowForm(false);
    setSaving(false);
    loadProviders();
  }

  async function remove(id: string) {
    await supabase.from('site_service_providers').delete().eq('id', id);
    setProviders(prev => prev.filter(p => p.id !== id));
  }

  const toggleAccount = (id: string) => {
    setShownAccounts(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const Icon = (type: string) => serviceIcon[type] || HelpCircle;
  const color = (type: string) => serviceColor[type] || 'text-gray-600 bg-gray-50';

  return (
    <div className="bg-white rounded-xl border border-gray-200">
      <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-cyan-50">
            <Zap className="h-5 w-5 text-cyan-600" />
          </div>
          <div>
            <h2 className="font-semibold text-gray-900">Service Providers</h2>
            <p className="text-xs text-gray-500">Utilities and service companies for this site</p>
          </div>
        </div>
        <button
          onClick={startAdd}
          className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors"
        >
          <Plus className="h-4 w-4" />
          Add Provider
        </button>
      </div>

      <div className="p-4">
        {loading ? (
          <div className="text-center py-8 text-sm text-gray-400">Loading...</div>
        ) : providers.length === 0 ? (
          <div className="text-center py-10 border border-dashed border-gray-200 rounded-xl">
            <Zap className="h-8 w-8 text-gray-300 mx-auto mb-2" />
            <p className="text-sm text-gray-500 mb-3">No service providers added yet</p>
            <button onClick={startAdd} className="text-sm text-blue-600 hover:text-blue-800 font-medium transition-colors">
              Add your first provider
            </button>
          </div>
        ) : (
          <div className="space-y-2">
            {providers.map(p => {
              const SvcIcon = Icon(p.service_type);
              const showAcct = shownAccounts.has(p.id);
              return (
                <div key={p.id} className="flex items-center gap-4 px-4 py-3 rounded-xl hover:bg-gray-50 transition-colors group border border-transparent hover:border-gray-100">
                  <div className={`p-2.5 rounded-xl flex-shrink-0 ${color(p.service_type)}`}>
                    <SvcIcon className="h-5 w-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-gray-900 text-sm">{p.provider_name}</span>
                      <span className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">{p.service_type}</span>
                    </div>
                    <div className="flex items-center gap-4 mt-1 flex-wrap">
                      {p.account_number && (
                        <div className="flex items-center gap-1">
                          <span className="text-xs text-gray-500 font-mono">
                            Acct: {showAcct ? p.account_number : '\u2022\u2022\u2022\u2022' + p.account_number.slice(-4)}
                          </span>
                          <button onClick={() => toggleAccount(p.id)} className="p-0.5 text-gray-400 hover:text-gray-600 transition-colors">
                            {showAcct ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                          </button>
                        </div>
                      )}
                      {p.phone && (
                        <a href={`tel:${p.phone}`} className="flex items-center gap-1 text-xs text-gray-500 hover:text-blue-600 transition-colors">
                          <Phone className="h-3 w-3" />
                          {p.phone}
                        </a>
                      )}
                    </div>
                    {p.notes && <p className="text-xs text-gray-400 mt-1 italic">{p.notes}</p>}
                  </div>
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={() => startEdit(p)} className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors">
                      <Pencil className="h-4 w-4" />
                    </button>
                    <button onClick={() => remove(p.id)} className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" onClick={() => setShowForm(false)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md" onClick={e => e.stopPropagation()}>
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
              <h3 className="font-semibold text-gray-900">{editingId ? 'Edit Provider' : 'Add Service Provider'}</h3>
              <button onClick={() => setShowForm(false)} className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Provider Name *</label>
                <input type="text" value={form.provider_name} onChange={e => setForm(p => ({ ...p, provider_name: e.target.value }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" autoFocus />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Service Type</label>
                <select value={form.service_type} onChange={e => setForm(p => ({ ...p, service_type: e.target.value }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 bg-white">
                  {SERVICE_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Account Number</label>
                  <input type="text" value={form.account_number} onChange={e => setForm(p => ({ ...p, account_number: e.target.value }))}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                  <input type="text" value={form.phone} onChange={e => setForm(p => ({ ...p, phone: e.target.value }))}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                <textarea value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} rows={2}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 resize-none" />
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button onClick={() => setShowForm(false)} className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 transition-colors">
                  Cancel
                </button>
                <button
                  onClick={save}
                  disabled={!form.provider_name.trim() || saving}
                  className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
                >
                  {saving ? 'Saving...' : editingId ? 'Save Changes' : 'Add Provider'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
