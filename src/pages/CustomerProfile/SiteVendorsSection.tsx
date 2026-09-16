import { useState, useEffect } from 'react';
import {
  Plus, Trash2, Search, Phone, Mail, Globe, X, Wrench, Zap, Droplets,
  Wind, KeyRound, TreePine, PaintBucket, HardHat, Hammer, ChevronDown, ExternalLink
} from 'lucide-react';
import { supabase } from '../../lib/supabase';

interface Vendor {
  id: string;
  name: string;
  trade_type: string;
  contact_name: string | null;
  phone: string | null;
  email: string | null;
  website: string | null;
  notes: string | null;
}

interface SiteVendor {
  id: string;
  vendor_id: string;
  notes: string | null;
  vendors: Vendor;
}

const TRADE_TYPES = ['Plumber', 'Electrician', 'HVAC', 'Locksmith', 'General Contractor', 'Roofing', 'Landscaping', 'Painting', 'Other'];

const tradeIcon: Record<string, React.ElementType> = {
  Plumber: Droplets,
  Electrician: Zap,
  HVAC: Wind,
  Locksmith: KeyRound,
  'General Contractor': HardHat,
  Roofing: Hammer,
  Landscaping: TreePine,
  Painting: PaintBucket,
};

const tradeColor: Record<string, string> = {
  Plumber: 'text-blue-600 bg-blue-50',
  Electrician: 'text-yellow-600 bg-yellow-50',
  HVAC: 'text-cyan-600 bg-cyan-50',
  Locksmith: 'text-amber-600 bg-amber-50',
  'General Contractor': 'text-orange-600 bg-orange-50',
  Roofing: 'text-stone-600 bg-stone-50',
  Landscaping: 'text-green-600 bg-green-50',
  Painting: 'text-rose-600 bg-rose-50',
};

export default function SiteVendorsSection({ siteId }: { siteId: string }) {
  const [siteVendors, setSiteVendors] = useState<SiteVendor[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);

  useEffect(() => {
    loadSiteVendors();
  }, [siteId]);

  async function loadSiteVendors() {
    const { data } = await supabase
      .from('site_vendors')
      .select('id, vendor_id, notes, vendors(id, name, trade_type, contact_name, phone, email, website, notes)')
      .eq('site_id', siteId);
    if (data) setSiteVendors(data as unknown as SiteVendor[]);
    setLoading(false);
  }

  async function unlinkVendor(siteVendorId: string) {
    await supabase.from('site_vendors').delete().eq('id', siteVendorId);
    setSiteVendors(prev => prev.filter(sv => sv.id !== siteVendorId));
  }

  const Icon = (type: string) => tradeIcon[type] || Wrench;
  const color = (type: string) => tradeColor[type] || 'text-gray-600 bg-gray-50';

  return (
    <div className="bg-white rounded-xl border border-gray-200">
      <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-orange-50">
            <Wrench className="h-5 w-5 text-orange-600" />
          </div>
          <div>
            <h2 className="font-semibold text-gray-900">Vendors</h2>
            <p className="text-xs text-gray-500">Trade vendors linked to this site</p>
          </div>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors"
        >
          <Plus className="h-4 w-4" />
          Add Vendor
        </button>
      </div>

      <div className="p-4">
        {loading ? (
          <div className="text-center py-8 text-sm text-gray-400">Loading vendors...</div>
        ) : siteVendors.length === 0 ? (
          <div className="text-center py-10 border border-dashed border-gray-200 rounded-xl">
            <Wrench className="h-8 w-8 text-gray-300 mx-auto mb-2" />
            <p className="text-sm text-gray-500 mb-3">No vendors linked to this site yet</p>
            <button
              onClick={() => setShowAddModal(true)}
              className="text-sm text-blue-600 hover:text-blue-800 font-medium transition-colors"
            >
              Add your first vendor
            </button>
          </div>
        ) : (
          <div className="space-y-2">
            {siteVendors.map(sv => {
              const v = sv.vendors;
              const TradeIcon = Icon(v.trade_type);
              return (
                <div key={sv.id} className="flex items-center gap-4 px-4 py-3 rounded-xl hover:bg-gray-50 transition-colors group border border-transparent hover:border-gray-100">
                  <div className={`p-2.5 rounded-xl flex-shrink-0 ${color(v.trade_type)}`}>
                    <TradeIcon className="h-5 w-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-gray-900 text-sm">{v.name}</span>
                      <span className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">{v.trade_type}</span>
                    </div>
                    <div className="flex items-center gap-4 mt-1 flex-wrap">
                      {v.contact_name && (
                        <span className="text-xs text-gray-500">{v.contact_name}</span>
                      )}
                      {v.phone && (
                        <a href={`tel:${v.phone}`} className="flex items-center gap-1 text-xs text-gray-500 hover:text-blue-600 transition-colors">
                          <Phone className="h-3 w-3" />
                          {v.phone}
                        </a>
                      )}
                      {v.email && (
                        <a href={`mailto:${v.email}`} className="flex items-center gap-1 text-xs text-gray-500 hover:text-blue-600 transition-colors">
                          <Mail className="h-3 w-3" />
                          {v.email}
                        </a>
                      )}
                    </div>
                    {sv.notes && (
                      <p className="text-xs text-gray-400 mt-1 italic">{sv.notes}</p>
                    )}
                  </div>
                  <button
                    onClick={() => unlinkVendor(sv.id)}
                    className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all opacity-0 group-hover:opacity-100"
                    title="Remove from site"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {showAddModal && (
        <AddVendorModal
          siteId={siteId}
          existingVendorIds={siteVendors.map(sv => sv.vendor_id)}
          onClose={() => setShowAddModal(false)}
          onAdded={loadSiteVendors}
        />
      )}
    </div>
  );
}

function AddVendorModal({ siteId, existingVendorIds, onClose, onAdded }: {
  siteId: string;
  existingVendorIds: string[];
  onClose: () => void;
  onAdded: () => void;
}) {
  const [search, setSearch] = useState('');
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [newVendor, setNewVendor] = useState({ name: '', trade_type: 'Other', contact_name: '', phone: '', email: '' });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadVendors();
  }, []);

  async function loadVendors() {
    const { data } = await supabase.from('vendors').select('*').order('name');
    if (data) setVendors(data as Vendor[]);
    setLoading(false);
  }

  const filtered = vendors.filter(v =>
    !existingVendorIds.includes(v.id) &&
    (v.name.toLowerCase().includes(search.toLowerCase()) ||
     v.trade_type.toLowerCase().includes(search.toLowerCase()) ||
     (v.contact_name || '').toLowerCase().includes(search.toLowerCase()))
  );

  async function linkVendor(vendorId: string) {
    await supabase.from('site_vendors').insert({ site_id: siteId, vendor_id: vendorId });
    onAdded();
    onClose();
  }

  async function createAndLink() {
    if (!newVendor.name.trim()) return;
    setSaving(true);
    const { data, error } = await supabase.from('vendors').insert({
      name: newVendor.name.trim(),
      trade_type: newVendor.trade_type,
      contact_name: newVendor.contact_name || null,
      phone: newVendor.phone || null,
      email: newVendor.email || null,
    }).select('id').maybeSingle();
    if (data) {
      await supabase.from('site_vendors').insert({ site_id: siteId, vendor_id: data.id });
      onAdded();
      onClose();
    }
    setSaving(false);
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[80vh] flex flex-col" onClick={e => e.stopPropagation()}>
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <h3 className="font-semibold text-gray-900">{showCreate ? 'Create New Vendor' : 'Add Vendor to Site'}</h3>
          <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">
            <X className="h-5 w-5" />
          </button>
        </div>

        {showCreate ? (
          <div className="p-6 space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Company Name *</label>
              <input type="text" value={newVendor.name} onChange={e => setNewVendor(p => ({ ...p, name: e.target.value }))}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" autoFocus />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Trade Type</label>
              <select value={newVendor.trade_type} onChange={e => setNewVendor(p => ({ ...p, trade_type: e.target.value }))}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 bg-white">
                {TRADE_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Contact Name</label>
                <input type="text" value={newVendor.contact_name} onChange={e => setNewVendor(p => ({ ...p, contact_name: e.target.value }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                <input type="text" value={newVendor.phone} onChange={e => setNewVendor(p => ({ ...p, phone: e.target.value }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
              <input type="email" value={newVendor.email} onChange={e => setNewVendor(p => ({ ...p, email: e.target.value }))}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" />
            </div>
            <div className="flex items-center justify-between pt-2">
              <button onClick={() => setShowCreate(false)} className="text-sm text-gray-500 hover:text-gray-700 transition-colors">
                Back to search
              </button>
              <button
                onClick={createAndLink}
                disabled={!newVendor.name.trim() || saving}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
              >
                {saving ? 'Creating...' : 'Create & Add to Site'}
              </button>
            </div>
          </div>
        ) : (
          <>
            <div className="px-6 pt-4 pb-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search vendors by name, trade, or contact..."
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  className="w-full pl-9 pr-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                  autoFocus
                />
              </div>
            </div>
            <div className="flex-1 overflow-y-auto px-6 pb-4">
              {loading ? (
                <div className="text-center py-8 text-sm text-gray-400">Loading...</div>
              ) : filtered.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-sm text-gray-500 mb-3">
                    {search ? `No vendors matching "${search}"` : 'All vendors are already linked'}
                  </p>
                  <button
                    onClick={() => { setShowCreate(true); setNewVendor(p => ({ ...p, name: search })); }}
                    className="text-sm text-blue-600 hover:text-blue-800 font-medium transition-colors"
                  >
                    Create a new vendor{search ? ` "${search}"` : ''}
                  </button>
                </div>
              ) : (
                <div className="space-y-1 mt-2">
                  {filtered.map(v => (
                    <button
                      key={v.id}
                      onClick={() => linkVendor(v.id)}
                      className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-blue-50 transition-colors text-left group"
                    >
                      <div className={`p-2 rounded-lg ${tradeColor[v.trade_type] || 'text-gray-600 bg-gray-50'}`}>
                        {(() => { const I = tradeIcon[v.trade_type] || Wrench; return <I className="h-4 w-4" />; })()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-gray-900 text-sm">{v.name}</span>
                          <span className="text-xs text-gray-400">{v.trade_type}</span>
                        </div>
                        {v.contact_name && <p className="text-xs text-gray-500">{v.contact_name}</p>}
                      </div>
                      <Plus className="h-4 w-4 text-blue-500 opacity-0 group-hover:opacity-100 transition-opacity" />
                    </button>
                  ))}
                </div>
              )}
            </div>
            <div className="px-6 py-3 border-t border-gray-100">
              <button
                onClick={() => setShowCreate(true)}
                className="flex items-center gap-2 text-sm text-blue-600 hover:text-blue-800 font-medium transition-colors"
              >
                <Plus className="h-4 w-4" />
                Create new vendor
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
