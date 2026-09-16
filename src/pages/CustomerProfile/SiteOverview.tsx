import { useState, useEffect, useCallback } from 'react';
import {
  ChevronRight, MapPin, DoorOpen, Lock, Wifi, KeyRound,
  Eye, EyeOff, Pencil, Check, X, Building2, Home
} from 'lucide-react';
import type { Site, CustomerSystem } from './types';
import SiteOverviewVendors from './SiteOverviewVendors';
import SiteOverviewProviders from './SiteOverviewProviders';
import SiteOverviewInventory from './SiteOverviewInventory';
import { supabase } from '../../lib/supabase';

export interface SiteVendor {
  id: string;
  site_id: string;
  vendor_id: string;
  notes: string | null;
  vendors: {
    id: string;
    name: string;
    trade_type: string;
    contact_name: string | null;
    phone: string | null;
    email: string | null;
    website: string | null;
    notes: string | null;
  };
}

export interface SiteServiceProvider {
  id: string;
  site_id: string;
  provider_name: string;
  service_type: string;
  account_number: string | null;
  phone: string | null;
  email: string | null;
  notes: string | null;
}

export interface SiteRoom {
  id: string;
  site_id: string;
  name: string;
  floor_level: string | null;
  room_type: string;
  photo_url: string | null;
  notes: string | null;
  sort_order: number;
}

export interface SiteInventoryItem {
  id: string;
  site_id: string;
  company_id: string | null;
  room_id: string | null;
  system_id: string | null;
  product_id: string | null;
  product_name: string | null;
  product_category: string | null;
  serial_number: string | null;
  mac_address: string | null;
  installation_date: string | null;
  last_service_date: string | null;
  warranty_expiration: string | null;
  photo_url: string | null;
  status: string | null;
  notes: string | null;
  location_detail: string | null;
}

interface Props {
  site: Site;
  companyName: string;
  companyId: string;
  onBack: () => void;
}

type EditField = 'gate_code' | 'alarm_code' | 'wifi' | 'access' | null;

export default function SiteOverview({ site: initialSite, companyName, companyId, onBack }: Props) {
  const [site, setSite] = useState(initialSite);
  const [loading, setLoading] = useState(true);
  const [vendors, setVendors] = useState<SiteVendor[]>([]);
  const [providers, setProviders] = useState<SiteServiceProvider[]>([]);
  const [rooms, setRooms] = useState<SiteRoom[]>([]);
  const [inventory, setInventory] = useState<SiteInventoryItem[]>([]);
  const [systems, setSystems] = useState<CustomerSystem[]>([]);

  const [editField, setEditField] = useState<EditField>(null);
  const [editValues, setEditValues] = useState<Record<string, string>>({});
  const [visible, setVisible] = useState<Set<string>>(new Set());
  const [saving, setSaving] = useState(false);

  const loadSiteData = useCallback(async () => {
    const [siteRes, vendorRes, providerRes, roomRes, invRes, sysRes] = await Promise.all([
      supabase.from('sites').select('*').eq('id', site.id).maybeSingle(),
      supabase.from('site_vendors').select('*, vendors(*)').eq('site_id', site.id),
      supabase.from('site_service_providers').select('*').eq('site_id', site.id).order('service_type'),
      supabase.from('site_rooms').select('*').eq('site_id', site.id).order('sort_order'),
      supabase.from('site_inventory').select('*').eq('site_id', site.id).order('product_name'),
      supabase.from('customer_systems').select('*, system_types(id, name, icon_name, color)').eq('site_id', site.id),
    ]);
    if (siteRes.data) setSite(siteRes.data);
    setVendors((vendorRes.data as SiteVendor[]) || []);
    setProviders((providerRes.data as SiteServiceProvider[]) || []);
    setRooms((roomRes.data as SiteRoom[]) || []);
    setInventory((invRes.data as SiteInventoryItem[]) || []);
    setSystems((sysRes.data as CustomerSystem[]) || []);
    setLoading(false);
  }, [site.id]);

  useEffect(() => { loadSiteData(); }, [loadSiteData]);

  const toggleVisible = (field: string) => setVisible(prev => {
    const n = new Set(prev);
    n.has(field) ? n.delete(field) : n.add(field);
    return n;
  });

  const startEdit = (field: EditField) => {
    if (!field) return;
    if (field === 'wifi') {
      setEditValues({ wifi_network: site.wifi_network || '', wifi_password: site.wifi_password || '' });
    } else if (field === 'gate_code') {
      setEditValues({ gate_code: site.gate_code || '' });
    } else if (field === 'alarm_code') {
      setEditValues({ alarm_code: site.alarm_code || '' });
    } else if (field === 'access') {
      setEditValues({ access_instructions: site.access_instructions || '' });
    }
    setEditField(field);
  };

  const cancelEdit = () => { setEditField(null); setEditValues({}); };

  const saveEdit = async () => {
    if (!editField) return;
    setSaving(true);
    let update: Record<string, any> = {};
    if (editField === 'gate_code') update = { gate_code: editValues.gate_code || null };
    else if (editField === 'alarm_code') update = { alarm_code: editValues.alarm_code || null };
    else if (editField === 'wifi') update = { wifi_network: editValues.wifi_network || null, wifi_password: editValues.wifi_password || null };
    else if (editField === 'access') update = { access_instructions: editValues.access_instructions || null };

    await supabase.from('sites').update(update).eq('id', site.id);
    setSite(prev => ({ ...prev, ...update }));
    setSaving(false);
    setEditField(null);
    setEditValues({});
  };

  const mask = (val: string | undefined | null) => val ? '\u2022'.repeat(Math.min(val.length, 12)) : '';

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Loading site details...</div>
      </div>
    );
  }

  const isCommercial = site.site_type === 'commercial';

  return (
    <div className="space-y-6">
      {/* Back + Header */}
      <div>
        <button onClick={onBack}
          className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-800 mb-4 transition-colors group">
          <ChevronRight className="h-4 w-4 rotate-180 group-hover:-translate-x-0.5 transition-transform" />
          Back to Sites &amp; Systems
        </button>
        <div className="flex items-center gap-4">
          <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${isCommercial ? 'bg-blue-100' : 'bg-green-100'}`}>
            {isCommercial ? <Building2 className="h-6 w-6 text-blue-600" /> : <Home className="h-6 w-6 text-green-600" />}
          </div>
          <div>
            <div className="flex items-center gap-3">
              <h2 className="text-xl font-bold text-gray-900">{site.name}</h2>
              <span className={`px-2.5 py-0.5 text-xs rounded-full capitalize font-medium ${isCommercial ? 'bg-blue-100 text-blue-700' : 'bg-green-100 text-green-700'}`}>
                {site.site_type}
              </span>
            </div>
            <div className="flex items-center gap-1.5 text-sm text-gray-500 mt-0.5">
              <MapPin className="h-3.5 w-3.5" />
              {site.address}, {site.city}, {site.state} {site.zip}
            </div>
          </div>
        </div>
      </div>

      {/* Quick Info Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Gate Code */}
        <div className="bg-white rounded-xl border border-gray-200 p-4 hover:shadow-sm transition-all">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <DoorOpen className="h-4 w-4 text-gray-400" />
              <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Gate Code</span>
            </div>
            {editField !== 'gate_code' && (
              <button onClick={() => startEdit('gate_code')} className="p-1 text-gray-400 hover:text-blue-600 rounded transition-colors">
                <Pencil className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
          {editField === 'gate_code' ? (
            <div className="flex items-center gap-2">
              <input value={editValues.gate_code || ''} onChange={e => setEditValues(prev => ({ ...prev, gate_code: e.target.value }))}
                className="flex-1 border border-gray-300 rounded-lg px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="e.g. 4521#" autoFocus />
              <button onClick={saveEdit} disabled={saving} className="p-1.5 text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"><Check className="h-3.5 w-3.5" /></button>
              <button onClick={cancelEdit} className="p-1.5 text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"><X className="h-3.5 w-3.5" /></button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <span className="text-sm font-mono font-medium text-gray-900">
                {site.gate_code ? (visible.has('gate') ? site.gate_code : mask(site.gate_code)) : <span className="text-gray-400 font-sans">Not set</span>}
              </span>
              {site.gate_code && (
                <button onClick={() => toggleVisible('gate')} className="p-1 text-gray-400 hover:text-gray-600 transition-colors">
                  {visible.has('gate') ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                </button>
              )}
            </div>
          )}
        </div>

        {/* Alarm Code */}
        <div className="bg-white rounded-xl border border-gray-200 p-4 hover:shadow-sm transition-all">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Lock className="h-4 w-4 text-gray-400" />
              <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Alarm Code</span>
            </div>
            {editField !== 'alarm_code' && (
              <button onClick={() => startEdit('alarm_code')} className="p-1 text-gray-400 hover:text-blue-600 rounded transition-colors">
                <Pencil className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
          {editField === 'alarm_code' ? (
            <div className="flex items-center gap-2">
              <input value={editValues.alarm_code || ''} onChange={e => setEditValues(prev => ({ ...prev, alarm_code: e.target.value }))}
                className="flex-1 border border-gray-300 rounded-lg px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="Alarm code" autoFocus />
              <button onClick={saveEdit} disabled={saving} className="p-1.5 text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"><Check className="h-3.5 w-3.5" /></button>
              <button onClick={cancelEdit} className="p-1.5 text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"><X className="h-3.5 w-3.5" /></button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <span className="text-sm font-mono font-medium text-gray-900">
                {site.alarm_code ? (visible.has('alarm') ? site.alarm_code : mask(site.alarm_code)) : <span className="text-gray-400 font-sans">Not set</span>}
              </span>
              {site.alarm_code && (
                <button onClick={() => toggleVisible('alarm')} className="p-1 text-gray-400 hover:text-gray-600 transition-colors">
                  {visible.has('alarm') ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                </button>
              )}
            </div>
          )}
        </div>

        {/* Wi-Fi */}
        <div className="bg-white rounded-xl border border-gray-200 p-4 hover:shadow-sm transition-all">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Wifi className="h-4 w-4 text-gray-400" />
              <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Wi-Fi</span>
            </div>
            {editField !== 'wifi' && (
              <button onClick={() => startEdit('wifi')} className="p-1 text-gray-400 hover:text-blue-600 rounded transition-colors">
                <Pencil className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
          {editField === 'wifi' ? (
            <div className="space-y-2">
              <input value={editValues.wifi_network || ''} onChange={e => setEditValues(prev => ({ ...prev, wifi_network: e.target.value }))}
                className="w-full border border-gray-300 rounded-lg px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="Network name" autoFocus />
              <input value={editValues.wifi_password || ''} onChange={e => setEditValues(prev => ({ ...prev, wifi_password: e.target.value }))}
                className="w-full border border-gray-300 rounded-lg px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="Password" />
              <div className="flex justify-end gap-2">
                <button onClick={saveEdit} disabled={saving} className="p-1.5 text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"><Check className="h-3.5 w-3.5" /></button>
                <button onClick={cancelEdit} className="p-1.5 text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"><X className="h-3.5 w-3.5" /></button>
              </div>
            </div>
          ) : site.wifi_network ? (
            <div>
              <div className="text-sm font-medium text-gray-900">{site.wifi_network}</div>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="text-xs font-mono text-gray-500">
                  {visible.has('wifi') ? site.wifi_password : mask(site.wifi_password)}
                </span>
                {site.wifi_password && (
                  <button onClick={() => toggleVisible('wifi')} className="p-0.5 text-gray-400 hover:text-gray-600 transition-colors">
                    {visible.has('wifi') ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                  </button>
                )}
              </div>
            </div>
          ) : (
            <span className="text-sm text-gray-400">Not set</span>
          )}
        </div>

        {/* Access Instructions */}
        <div className="bg-white rounded-xl border border-gray-200 p-4 hover:shadow-sm transition-all">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <KeyRound className="h-4 w-4 text-gray-400" />
              <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Access</span>
            </div>
            {editField !== 'access' && (
              <button onClick={() => startEdit('access')} className="p-1 text-gray-400 hover:text-blue-600 rounded transition-colors">
                <Pencil className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
          {editField === 'access' ? (
            <div className="space-y-2">
              <textarea value={editValues.access_instructions || ''} onChange={e => setEditValues(prev => ({ ...prev, access_instructions: e.target.value }))}
                className="w-full border border-gray-300 rounded-lg px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" rows={2} placeholder="Access instructions..." autoFocus />
              <div className="flex justify-end gap-2">
                <button onClick={saveEdit} disabled={saving} className="p-1.5 text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"><Check className="h-3.5 w-3.5" /></button>
                <button onClick={cancelEdit} className="p-1.5 text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"><X className="h-3.5 w-3.5" /></button>
              </div>
            </div>
          ) : (
            <p className="text-sm text-gray-700 line-clamp-2">
              {site.access_instructions || <span className="text-gray-400">Not set</span>}
            </p>
          )}
        </div>
      </div>

      {/* Sections */}
      <SiteOverviewVendors siteId={site.id} vendors={vendors} onRefresh={loadSiteData} />
      <SiteOverviewProviders siteId={site.id} providers={providers} onRefresh={loadSiteData} />
      <SiteOverviewInventory siteId={site.id} companyId={companyId} rooms={rooms} inventory={inventory} systems={systems} onRefresh={loadSiteData} />
    </div>
  );
}
