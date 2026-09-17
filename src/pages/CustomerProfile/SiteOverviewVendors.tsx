import { useState, useEffect, useRef } from 'react';
import {
  Wrench, Plus, X, Search, Droplets, Zap, Thermometer, KeyRound,
  TreePine, Home, HardHat, Paintbrush, Phone, Mail, ExternalLink, ChevronDown
} from 'lucide-react';
import type { SiteVendor } from './SiteOverview';
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

interface Props {
  siteId: string;
  vendors: SiteVendor[];
  onRefresh: () => void;
}

const TRADE_ICONS: Record<string, React.ElementType> = {
  Plumber: Droplets, Electrician: Zap, HVAC: Thermometer, Locksmith: KeyRound,
  Landscaping: TreePine, Roofing: Home, 'General Contractor': HardHat,
  Painting: Paintbrush, Other: Wrench,
};

const TRADE_COLORS: Record<string, string> = {
  Plumber: 'bg-blue-100 text-blue-700',
  Electrician: 'bg-yellow-100 text-yellow-700',
  HVAC: 'bg-cyan-100 text-cyan-700',
  Locksmith: 'bg-orange-100 text-orange-700',
  Landscaping: 'bg-green-100 text-green-700',
  Roofing: 'bg-slate-100 text-slate-700',
  'General Contractor': 'bg-amber-100 text-amber-700',
  Painting: 'bg-rose-100 text-rose-700',
  Other: 'bg-gray-100 text-gray-600',
};

const TRADE_TYPES = ['Plumber', 'Electrician', 'HVAC', 'Locksmith', 'General Contractor', 'Roofing', 'Landscaping', 'Painting', 'Other'];

export default function SiteOverviewVendors({ siteId, vendors, onRefresh }: Props) {
  const [expanded, setExpanded] = useState(false);
  const [showModal, setShowModal] = useState(false);

  async function unlinkVendor(svId: string, name: string) {
    if (!window.confirm(`Remove "${name}" from this site?`)) return;
    await supabase.from('site_vendors').delete().eq('id', svId);
    onRefresh();
  }

  const previewNames = vendors.slice(0, 3).map(sv => sv.vendors.name);
  const remaining = vendors.length - previewNames.length;

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      {/* Compact collapsible header */}
      <div className="flex items-center gap-2 px-4 py-3">
        <button
          onClick={() => setExpanded(!expanded)}
          className="flex items-center gap-2.5 flex-1 min-w-0 group"
        >
          <Wrench className="h-4 w-4 text-blue-600 flex-shrink-0" />
          <span className="font-semibold text-sm text-gray-900">Vendors</span>
          <span className="px-1.5 py-0.5 text-xs font-medium bg-gray-100 text-gray-600 rounded-full flex-shrink-0">
            {vendors.length}
          </span>
          {!expanded && vendors.length > 0 && (
            <span className="text-xs text-gray-400 truncate min-w-0">
              {previewNames.join(', ')}{remaining > 0 ? ` +${remaining}` : ''}
            </span>
          )}
          <ChevronDown className={`h-3.5 w-3.5 text-gray-400 flex-shrink-0 transition-transform duration-200 ${expanded ? 'rotate-180' : ''}`} />
        </button>
        <button onClick={(e) => { e.stopPropagation(); setShowModal(true); }}
          className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors flex-shrink-0">
          <Plus className="h-3.5 w-3.5" /> Add
        </button>
      </div>

      {/* Expandable content */}
      <div className={`transition-all duration-200 ease-in-out overflow-hidden ${expanded ? 'max-h-[2000px] opacity-100' : 'max-h-0 opacity-0'}`}>
        {vendors.length > 0 ? (
          <div className="divide-y divide-gray-50 border-t border-gray-100">
            {vendors.map(sv => {
              const v = sv.vendors;
              const Icon = TRADE_ICONS[v.trade_type] || Wrench;
              const color = TRADE_COLORS[v.trade_type] || TRADE_COLORS.Other;
              return (
                <div key={sv.id} className="px-4 py-3 flex items-start justify-between gap-3 hover:bg-gray-50 transition-colors group">
                  <div className="flex items-start gap-2.5 min-w-0">
                    <div className={`p-1.5 rounded-lg flex-shrink-0 ${color.split(' ')[0]}`}>
                      <Icon className={`h-3.5 w-3.5 ${color.split(' ')[1]}`} />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium text-gray-900 text-sm">{v.name}</span>
                        <span className={`px-1.5 py-0.5 text-[11px] rounded-full font-medium ${color}`}>{v.trade_type}</span>
                      </div>
                      {v.contact_name && <p className="text-xs text-gray-500 mt-0.5">{v.contact_name}</p>}
                      <div className="flex items-center gap-3 mt-1 flex-wrap">
                        {v.phone && (
                          <a href={`tel:${v.phone}`} className="flex items-center gap-1 text-xs text-gray-500 hover:text-blue-600 transition-colors">
                            <Phone className="h-3 w-3" />{v.phone}
                          </a>
                        )}
                        {v.email && (
                          <a href={`mailto:${v.email}`} className="flex items-center gap-1 text-xs text-gray-500 hover:text-blue-600 transition-colors">
                            <Mail className="h-3 w-3" />{v.email}
                          </a>
                        )}
                        {v.website && (
                          <a href={`https://${v.website.replace(/^https?:\/\//, '')}`} target="_blank" rel="noopener noreferrer"
                            className="flex items-center gap-1 text-xs text-gray-500 hover:text-blue-600 transition-colors">
                            <ExternalLink className="h-3 w-3" />{v.website.replace(/^https?:\/\//, '')}
                          </a>
                        )}
                      </div>
                      {sv.notes && <p className="text-xs text-gray-400 italic mt-1">{sv.notes}</p>}
                    </div>
                  </div>
                  <button onClick={() => unlinkVendor(sv.id, v.name)}
                    className="p-1 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-lg opacity-0 group-hover:opacity-100 transition-all flex-shrink-0">
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="py-8 text-center border-t border-gray-100">
            <Wrench className="h-8 w-8 text-gray-300 mx-auto mb-2" />
            <p className="text-sm text-gray-500">No vendors linked to this site</p>
          </div>
        )}
      </div>

      {showModal && (
        <AddVendorModal siteId={siteId} linkedIds={new Set(vendors.map(v => v.vendor_id))}
          onClose={() => setShowModal(false)} onRefresh={onRefresh} />
      )}
    </div>
  );
}

function AddVendorModal({ siteId, linkedIds, onClose, onRefresh }: {
  siteId: string; linkedIds: Set<string>; onClose: () => void; onRefresh: () => void;
}) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Vendor[]>([]);
  const [showCreate, setShowCreate] = useState(false);
  const [newVendor, setNewVendor] = useState({ name: '', trade_type: 'Other', contact_name: '', phone: '', email: '' });
  const [saving, setSaving] = useState(false);
  const searchTimeout = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    clearTimeout(searchTimeout.current);
    if (!query.trim()) { setResults([]); return; }
    searchTimeout.current = setTimeout(async () => {
      const { data } = await supabase.from('vendors').select('*').ilike('name', `%${query}%`).order('name').limit(20);
      setResults((data as Vendor[]) || []);
    }, 300);
    return () => clearTimeout(searchTimeout.current);
  }, [query]);

  async function linkVendor(vendorId: string) {
    if (linkedIds.has(vendorId)) return;
    await supabase.from('site_vendors').insert({ site_id: siteId, vendor_id: vendorId });
    onRefresh();
    onClose();
  }

  async function createAndLink() {
    if (!newVendor.name.trim()) return;
    setSaving(true);
    const { data } = await supabase.from('vendors').insert({
      name: newVendor.name.trim(), trade_type: newVendor.trade_type,
      contact_name: newVendor.contact_name || null, phone: newVendor.phone || null,
      email: newVendor.email || null,
    }).select().single();
    if (data) {
      await supabase.from('site_vendors').insert({ site_id: siteId, vendor_id: data.id });
    }
    setSaving(false);
    onRefresh();
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg mx-4 max-h-[85vh] flex flex-col" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h3 className="font-semibold text-gray-900">Add Vendor</h3>
          <button onClick={onClose} className="p-1.5 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition-colors"><X className="h-4 w-4" /></button>
        </div>

        <div className="p-4 border-b border-gray-100">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input value={query} onChange={e => setQuery(e.target.value)} autoFocus
              className="w-full border border-gray-300 rounded-lg pl-10 pr-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Search vendors by name..." />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {results.length > 0 && (
            <div className="divide-y divide-gray-50">
              {results.map(v => {
                const isLinked = linkedIds.has(v.id);
                const color = TRADE_COLORS[v.trade_type] || TRADE_COLORS.Other;
                return (
                  <button key={v.id} disabled={isLinked} onClick={() => linkVendor(v.id)}
                    className={`w-full px-5 py-3.5 flex items-center justify-between text-left transition-colors ${isLinked ? 'opacity-50 cursor-not-allowed' : 'hover:bg-gray-50 cursor-pointer'}`}>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-sm text-gray-900">{v.name}</span>
                        <span className={`px-2 py-0.5 text-xs rounded-full font-medium ${color}`}>{v.trade_type}</span>
                      </div>
                      {v.contact_name && <p className="text-xs text-gray-500 mt-0.5">{v.contact_name}</p>}
                    </div>
                    {isLinked && <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">Already linked</span>}
                  </button>
                );
              })}
            </div>
          )}

          {query.trim() && results.length === 0 && !showCreate && (
            <div className="py-8 text-center">
              <p className="text-sm text-gray-500 mb-2">No vendors found matching "{query}"</p>
            </div>
          )}

          <div className="p-4 border-t border-gray-100">
            {!showCreate ? (
              <button onClick={() => setShowCreate(true)}
                className="w-full py-2.5 border border-dashed border-gray-300 rounded-lg text-sm text-gray-500 hover:border-blue-400 hover:text-blue-600 hover:bg-blue-50 transition-colors flex items-center justify-center gap-2">
                <Plus className="h-4 w-4" /> Create New Vendor
              </button>
            ) : (
              <div className="space-y-3 bg-gray-50 p-4 rounded-xl">
                <h4 className="text-sm font-semibold text-gray-700">New Vendor</h4>
                <input value={newVendor.name} onChange={e => setNewVendor(prev => ({ ...prev, name: e.target.value }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="Vendor name *" />
                <select value={newVendor.trade_type} onChange={e => setNewVendor(prev => ({ ...prev, trade_type: e.target.value }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                  {TRADE_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
                <input value={newVendor.contact_name} onChange={e => setNewVendor(prev => ({ ...prev, contact_name: e.target.value }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="Contact name" />
                <div className="grid grid-cols-2 gap-3">
                  <input value={newVendor.phone} onChange={e => setNewVendor(prev => ({ ...prev, phone: e.target.value }))}
                    className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="Phone" />
                  <input value={newVendor.email} onChange={e => setNewVendor(prev => ({ ...prev, email: e.target.value }))}
                    className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="Email" />
                </div>
                <div className="flex justify-end gap-2">
                  <button onClick={() => setShowCreate(false)} className="px-3 py-2 text-sm text-gray-600 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">Cancel</button>
                  <button onClick={createAndLink} disabled={saving || !newVendor.name.trim()}
                    className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50">
                    {saving ? 'Saving...' : 'Create & Link'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
