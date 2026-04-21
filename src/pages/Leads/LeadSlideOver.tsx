import { useState, useEffect, useRef } from 'react';
import {
  X, Phone, Mail, MapPin, Calendar, User, CheckCircle, XCircle, Clock,
  ArrowRight, ExternalLink, CreditCard as Edit2, ChevronRight, Shield,
  Package, Camera, Plus, Trash2, Image, Check, ChevronDown, ChevronUp,
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import type { Lead, LeadActivityLog, LeadSystem, LeadLineItem, LeadPhoto } from './types';
import { LEAD_STATUS_CONFIG } from './types';
import * as LucideIcons from 'lucide-react';

interface SystemType {
  id: string;
  name: string;
  icon_name: string;
  color: string;
  is_active: boolean;
  sort_order: number;
}

interface PackageCatalogItem {
  id: string;
  name: string;
  cost: number;
  price: number;
}

interface ProductCatalogItem {
  id: string;
  sku: string;
  name: string;
  description: string | null;
  category: string;
  manufacturer: string;
  cost: number;
  price: number;
  is_active: boolean;
}

interface Props {
  leadId: string;
  onClose: () => void;
  onEdit: (lead: Lead) => void;
  onConvertToDeal: (lead: Lead) => void;
  onUpdated: () => void;
}

type TabId = 'overview' | 'systems' | 'products' | 'photos';

function SystemIcon({ name, className }: { name: string; className?: string }) {
  const Icon = (LucideIcons as Record<string, React.ComponentType<{ className?: string }>>)[name];
  if (!Icon) return <Shield className={className} />;
  return <Icon className={className} />;
}

function formatPhone(p: string | null) {
  if (!p) return null;
  const d = p.replace(/\D/g, '');
  if (d.length === 10) return `(${d.slice(0, 3)}) ${d.slice(3, 6)}-${d.slice(6)}`;
  return p;
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
}

function formatCurrency(n: number) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2 }).format(n);
}

export default function LeadSlideOver({ leadId, onClose, onEdit, onConvertToDeal, onUpdated }: Props) {
  const [lead, setLead] = useState<Lead | null>(null);
  const [activity, setActivity] = useState<LeadActivityLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [activeTab, setActiveTab] = useState<TabId>('overview');

  const [systems, setSystems] = useState<LeadSystem[]>([]);
  const [systemTypes, setSystemTypes] = useState<SystemType[]>([]);
  const [packages, setPackages] = useState<PackageCatalogItem[]>([]);
  const [expandedSystems, setExpandedSystems] = useState<Record<string, boolean>>({});
  const [savingSystems, setSavingSystems] = useState(false);

  const [lineItems, setLineItems] = useState<LeadLineItem[]>([]);
  const [products, setProducts] = useState<ProductCatalogItem[]>([]);
  const [productSearch, setProductSearch] = useState('');
  const [showProductSearch, setShowProductSearch] = useState(false);
  const [savingItems, setSavingItems] = useState(false);

  const [photos, setPhotos] = useState<LeadPhoto[]>([]);
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadAll();
  }, [leadId]);

  async function loadAll() {
    setLoading(true);
    const [
      { data: leadData },
      { data: activityData },
      { data: systemsData },
      { data: itemsData },
      { data: photosData },
      { data: systemTypesData },
      { data: packagesData },
      { data: productsData },
    ] = await Promise.all([
      supabase.from('leads').select('*, lead_sources(*), employees(id, first_name, last_name)').eq('id', leadId).maybeSingle(),
      supabase.from('lead_activity_log').select('*').eq('lead_id', leadId).order('created_at', { ascending: false }).limit(20),
      supabase.from('lead_systems').select('*').eq('lead_id', leadId).order('sort_order'),
      supabase.from('lead_line_items').select('*').eq('lead_id', leadId).order('sort_order'),
      supabase.from('lead_photos').select('*').eq('lead_id', leadId).order('created_at', { ascending: false }),
      supabase.from('system_types').select('*').eq('is_active', true).order('sort_order'),
      supabase.from('packages').select('id,name,cost,price'),
      supabase.from('products').select('id,sku,name,description,category,manufacturer,cost,price,is_active').eq('is_active', true).order('category').order('name'),
    ]);
    setLead(leadData as Lead | null);
    setActivity(activityData ?? []);
    setSystems((systemsData ?? []) as LeadSystem[]);
    setLineItems((itemsData ?? []) as LeadLineItem[]);
    setPhotos((photosData ?? []) as LeadPhoto[]);
    setSystemTypes((systemTypesData ?? []) as SystemType[]);
    setPackages((packagesData ?? []) as PackageCatalogItem[]);
    setProducts((productsData ?? []) as ProductCatalogItem[]);
    setLoading(false);
  }

  async function updateStatus(newStatus: Lead['status']) {
    if (!lead) return;
    setUpdatingStatus(true);
    await supabase.from('leads').update({ status: newStatus, updated_at: new Date().toISOString() }).eq('id', lead.id);
    await supabase.from('lead_activity_log').insert({ lead_id: lead.id, action: `Status changed to ${newStatus}` });
    await loadAll();
    onUpdated();
    setUpdatingStatus(false);
  }

  // ── Systems ─────────────────────────────────────────────────────────────

  async function toggleSystem(type: SystemType) {
    if (!lead) return;
    const existing = systems.find(s => s.system_type_id === type.id);
    if (existing) {
      await supabase.from('lead_systems').delete().eq('id', existing.id);
      setSystems(prev => prev.filter(s => s.id !== existing.id));
    } else {
      setSavingSystems(true);
      const row = {
        lead_id: lead.id,
        system_type_id: type.id,
        system_type_name: type.name,
        system_type_icon: type.icon_name,
        system_type_color: type.color,
        sort_order: systems.length,
      };
      const { data } = await supabase.from('lead_systems').insert(row).select().maybeSingle();
      if (data) {
        setSystems(prev => [...prev, data as LeadSystem]);
        setExpandedSystems(prev => ({ ...prev, [data.id]: true }));
      }
      setSavingSystems(false);
    }
  }

  async function updateSystemPackage(systemId: string, pkg: PackageCatalogItem | null) {
    await supabase.from('lead_systems').update({
      package_id: pkg?.id ?? null,
      package_name: pkg?.name ?? null,
    }).eq('id', systemId);
    setSystems(prev => prev.map(s => s.id === systemId
      ? { ...s, package_id: pkg?.id ?? null, package_name: pkg?.name ?? null }
      : s));
  }

  async function updateSystemNotes(systemId: string, notes: string) {
    setSystems(prev => prev.map(s => s.id === systemId ? { ...s, notes } : s));
  }

  async function saveSystemNotes(systemId: string, notes: string) {
    await supabase.from('lead_systems').update({ notes }).eq('id', systemId);
  }

  // ── Line Items ──────────────────────────────────────────────────────────

  async function addLineItem(product?: ProductCatalogItem) {
    if (!lead) return;
    setSavingItems(true);
    const row = {
      lead_id: lead.id,
      product_id: product?.id ?? null,
      description: product?.name ?? '',
      quantity: 1,
      unit_cost: product?.cost ?? 0,
      unit_price: product?.price ?? 0,
      sort_order: lineItems.length,
    };
    const { data } = await supabase.from('lead_line_items').insert(row).select().maybeSingle();
    if (data) setLineItems(prev => [...prev, data as LeadLineItem]);
    setShowProductSearch(false);
    setProductSearch('');
    setSavingItems(false);
  }

  async function updateLineItem(id: string, field: keyof LeadLineItem, value: string | number) {
    setLineItems(prev => prev.map(li => li.id === id ? { ...li, [field]: value } : li));
  }

  async function saveLineItem(id: string) {
    const item = lineItems.find(li => li.id === id);
    if (!item) return;
    await supabase.from('lead_line_items').update({
      description: item.description,
      quantity: Number(item.quantity),
      unit_cost: Number(item.unit_cost),
      unit_price: Number(item.unit_price),
    }).eq('id', id);
  }

  async function deleteLineItem(id: string) {
    await supabase.from('lead_line_items').delete().eq('id', id);
    setLineItems(prev => prev.filter(li => li.id !== id));
  }

  // ── Photos ──────────────────────────────────────────────────────────────

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !lead) return;
    setUploadingPhoto(true);
    try {
      const ext = file.name.split('.').pop() ?? 'jpg';
      const path = `lead-photos/${lead.id}/${crypto.randomUUID()}.${ext}`;
      const { error: uploadError } = await supabase.storage
        .from('lead-photos')
        .upload(path, file, { contentType: file.type, upsert: false });
      if (uploadError) {
        const reader = new FileReader();
        reader.onload = async (ev) => {
          const dataUrl = ev.target?.result as string;
          const { data } = await supabase.from('lead_photos').insert({
            lead_id: lead.id,
            file_url: dataUrl,
            caption: null,
          }).select().maybeSingle();
          if (data) setPhotos(prev => [data as LeadPhoto, ...prev]);
        };
        reader.readAsDataURL(file);
      } else {
        const { data: { publicUrl } } = supabase.storage.from('lead-photos').getPublicUrl(path);
        const { data } = await supabase.from('lead_photos').insert({
          lead_id: lead.id,
          file_url: publicUrl,
          caption: null,
        }).select().maybeSingle();
        if (data) setPhotos(prev => [data as LeadPhoto, ...prev]);
      }
    } finally {
      setUploadingPhoto(false);
      e.target.value = '';
    }
  }

  async function deletePhoto(id: string) {
    await supabase.from('lead_photos').delete().eq('id', id);
    setPhotos(prev => prev.filter(p => p.id !== id));
  }

  async function updatePhotoCaption(id: string, caption: string) {
    setPhotos(prev => prev.map(p => p.id === id ? { ...p, caption } : p));
    await supabase.from('lead_photos').update({ caption }).eq('id', id);
  }

  if (loading) {
    return (
      <div className="fixed inset-y-0 right-0 w-[520px] bg-white shadow-2xl z-50 flex items-center justify-center border-l border-gray-200">
        <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!lead) return null;

  const statusCfg = LEAD_STATUS_CONFIG[lead.status];
  const isConverted = lead.status === 'converted';
  const isLost = lead.status === 'lost';
  const salesperson = lead.employees ? `${lead.employees.first_name} ${lead.employees.last_name}` : null;
  const address = [lead.address, lead.city, lead.state, lead.zip].filter(Boolean).join(', ');

  const lineTotal = lineItems.reduce((sum, li) => sum + Number(li.quantity) * Number(li.unit_price), 0);

  const filteredProducts = products.filter(p =>
    productSearch === '' ||
    p.name.toLowerCase().includes(productSearch.toLowerCase()) ||
    p.sku.toLowerCase().includes(productSearch.toLowerCase()) ||
    p.category.toLowerCase().includes(productSearch.toLowerCase())
  ).slice(0, 20);

  const TABS: { id: TabId; label: string; icon: React.ElementType; count?: number }[] = [
    { id: 'overview', label: 'Overview', icon: User },
    { id: 'systems', label: 'Systems', icon: Shield, count: systems.length },
    { id: 'products', label: 'Products', icon: Package, count: lineItems.length },
    { id: 'photos', label: 'Photos', icon: Camera, count: photos.length },
  ];

  return (
    <>
      <div className="fixed inset-y-0 right-0 w-[520px] bg-white shadow-2xl z-50 flex flex-col border-l border-gray-200">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-amber-100 rounded-lg flex items-center justify-center">
              <User className="h-5 w-5 text-amber-600" />
            </div>
            <div>
              <h2 className="font-bold text-gray-900 text-sm">{lead.contact_name}</h2>
              <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold border ${statusCfg.bg} ${statusCfg.color} ${statusCfg.border}`}>
                {statusCfg.label}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-1">
            {!isConverted && (
              <button
                onClick={() => onEdit(lead)}
                className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <Edit2 className="h-4 w-4" />
              </button>
            )}
            <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {isConverted && lead.converted_deal_id && (
          <div className="mx-6 mt-3 bg-green-50 border border-green-200 rounded-xl p-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <span className="text-sm font-semibold text-green-800">Converted to Deal</span>
            </div>
            <a href="#deals" className="flex items-center gap-1 text-xs font-medium text-green-700 hover:text-green-900">
              View Deal <ExternalLink className="h-3 w-3" />
            </a>
          </div>
        )}

        {/* Tabs */}
        <div className="flex border-b border-gray-100 px-6 gap-1 pt-2">
          {TABS.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-t-lg transition-colors relative ${
                activeTab === tab.id
                  ? 'text-blue-600 bg-blue-50 border-b-2 border-blue-600'
                  : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
              }`}
            >
              <tab.icon className="h-3.5 w-3.5" />
              {tab.label}
              {tab.count !== undefined && tab.count > 0 && (
                <span className={`ml-0.5 px-1.5 py-0.5 rounded-full text-xs font-bold ${activeTab === tab.id ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-600'}`}>
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <div className="flex-1 overflow-y-auto">

          {/* ── OVERVIEW ── */}
          {activeTab === 'overview' && (
            <div className="px-6 py-4 space-y-5">
              <div className="bg-gray-50 rounded-xl p-4 space-y-3">
                <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Contact</h3>
                {lead.contact_phone && (
                  <a href={`tel:${lead.contact_phone}`} className="flex items-center gap-3 text-sm text-gray-700 hover:text-blue-600 transition-colors group">
                    <div className="w-7 h-7 bg-blue-50 rounded-lg flex items-center justify-center group-hover:bg-blue-100">
                      <Phone className="h-3.5 w-3.5 text-blue-600" />
                    </div>
                    {formatPhone(lead.contact_phone)}
                  </a>
                )}
                {lead.contact_email && (
                  <a href={`mailto:${lead.contact_email}`} className="flex items-center gap-3 text-sm text-gray-700 hover:text-blue-600 transition-colors group">
                    <div className="w-7 h-7 bg-blue-50 rounded-lg flex items-center justify-center group-hover:bg-blue-100">
                      <Mail className="h-3.5 w-3.5 text-blue-600" />
                    </div>
                    {lead.contact_email}
                  </a>
                )}
                {address && (
                  <div className="flex items-start gap-3 text-sm text-gray-700">
                    <div className="w-7 h-7 bg-blue-50 rounded-lg flex items-center justify-center mt-0.5 shrink-0">
                      <MapPin className="h-3.5 w-3.5 text-blue-600" />
                    </div>
                    {address}
                  </div>
                )}
              </div>

              <div className="bg-gray-50 rounded-xl p-4 space-y-3">
                <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Details</h3>
                {lead.lead_sources && (
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-500">Lead Source</span>
                    <span className="font-medium text-gray-900">{lead.lead_sources.name}</span>
                  </div>
                )}
                {salesperson && (
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-500">Salesperson</span>
                    <span className="font-medium text-gray-900">{salesperson}</span>
                  </div>
                )}
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-500">Created</span>
                  <span className="font-medium text-gray-900">{formatDate(lead.created_at)}</span>
                </div>
              </div>

              {lead.notes && (
                <div className="bg-amber-50 border border-amber-100 rounded-xl p-4">
                  <h3 className="text-xs font-semibold text-amber-700 uppercase tracking-wider mb-2">Notes</h3>
                  <p className="text-sm text-gray-700 whitespace-pre-wrap">{lead.notes}</p>
                </div>
              )}

              {activity.length > 0 && (
                <div>
                  <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Activity</h3>
                  <div className="space-y-3">
                    {activity.map((entry) => (
                      <div key={entry.id} className="flex gap-3">
                        <div className="flex flex-col items-center">
                          <div className="w-2 h-2 bg-gray-300 rounded-full mt-1.5 shrink-0" />
                          <div className="w-px flex-1 bg-gray-200 mt-1" />
                        </div>
                        <div className="pb-3">
                          <p className="text-sm text-gray-800">{entry.action}</p>
                          {entry.notes && <p className="text-xs text-gray-500 mt-0.5">{entry.notes}</p>}
                          <div className="flex items-center gap-1 mt-1">
                            <Clock className="h-3 w-3 text-gray-400" />
                            <span className="text-xs text-gray-400">{formatDate(entry.created_at)} · {formatTime(entry.created_at)}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ── SYSTEMS ── */}
          {activeTab === 'systems' && (
            <div className="px-6 py-4 space-y-4">
              <p className="text-xs text-gray-500">Select the systems this prospect is interested in. This info carries over when you convert to a deal.</p>
              <div className="grid grid-cols-2 gap-2">
                {systemTypes.map(type => {
                  const selected = systems.some(s => s.system_type_id === type.id);
                  return (
                    <button
                      key={type.id}
                      onClick={() => toggleSystem(type)}
                      disabled={savingSystems}
                      className={`flex items-center gap-2.5 p-3 rounded-xl border-2 text-left transition-all ${
                        selected
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-gray-200 hover:border-gray-300 bg-white'
                      }`}
                    >
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${selected ? 'bg-blue-100' : 'bg-gray-100'}`}>
                        <SystemIcon name={type.icon_name} className={`h-4 w-4 ${selected ? 'text-blue-600' : 'text-gray-500'}`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className={`text-xs font-semibold truncate ${selected ? 'text-blue-700' : 'text-gray-700'}`}>{type.name}</p>
                      </div>
                      {selected && <Check className="h-3.5 w-3.5 text-blue-600 shrink-0" />}
                    </button>
                  );
                })}
              </div>

              {systems.length > 0 && (
                <div className="space-y-2 pt-2">
                  <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Selected Systems</h3>
                  {systems.map(sys => {
                    const isExpanded = expandedSystems[sys.id];
                    const pkgsForType = packages;
                    return (
                      <div key={sys.id} className="border border-gray-200 rounded-xl overflow-hidden">
                        <button
                          onClick={() => setExpandedSystems(prev => ({ ...prev, [sys.id]: !prev[sys.id] }))}
                          className="w-full flex items-center gap-3 px-4 py-3 bg-gray-50 text-left hover:bg-gray-100 transition-colors"
                        >
                          <div className="w-7 h-7 rounded-lg bg-blue-100 flex items-center justify-center">
                            <SystemIcon name={sys.system_type_icon} className="h-4 w-4 text-blue-600" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-gray-900">{sys.system_type_name}</p>
                            {sys.package_name && <p className="text-xs text-gray-500">{sys.package_name}</p>}
                          </div>
                          {isExpanded ? <ChevronUp className="h-4 w-4 text-gray-400" /> : <ChevronDown className="h-4 w-4 text-gray-400" />}
                        </button>
                        {isExpanded && (
                          <div className="px-4 py-3 space-y-3 border-t border-gray-100">
                            <div>
                              <label className="block text-xs font-medium text-gray-500 mb-1">Package</label>
                              <select
                                value={sys.package_id ?? ''}
                                onChange={e => {
                                  const pkg = packages.find(p => p.id === e.target.value) ?? null;
                                  updateSystemPackage(sys.id, pkg);
                                }}
                                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                              >
                                <option value="">No package selected</option>
                                {pkgsForType.map(p => (
                                  <option key={p.id} value={p.id}>{p.name}</option>
                                ))}
                              </select>
                            </div>
                            <div>
                              <label className="block text-xs font-medium text-gray-500 mb-1">Notes</label>
                              <textarea
                                value={sys.notes ?? ''}
                                onChange={e => updateSystemNotes(sys.id, e.target.value)}
                                onBlur={e => saveSystemNotes(sys.id, e.target.value)}
                                rows={2}
                                placeholder="Any specific requirements or notes…"
                                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                              />
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* ── PRODUCTS ── */}
          {activeTab === 'products' && (
            <div className="px-6 py-4 space-y-4">
              <p className="text-xs text-gray-500">Build a rough product scope for this lead. No proposal is sent — this info carries over when you convert to a deal.</p>

              {lineItems.length > 0 && (
                <div className="space-y-2">
                  {lineItems.map(li => (
                    <div key={li.id} className="border border-gray-200 rounded-xl p-3 space-y-2">
                      <div className="flex items-start gap-2">
                        <input
                          type="text"
                          value={li.description}
                          onChange={e => updateLineItem(li.id, 'description', e.target.value)}
                          onBlur={() => saveLineItem(li.id)}
                          placeholder="Description"
                          className="flex-1 border border-gray-300 rounded-lg px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                        <button
                          onClick={() => deleteLineItem(li.id)}
                          className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                      <div className="grid grid-cols-3 gap-2">
                        <div>
                          <label className="block text-xs text-gray-400 mb-0.5">Qty</label>
                          <input
                            type="number"
                            value={li.quantity}
                            onChange={e => updateLineItem(li.id, 'quantity', e.target.value)}
                            onBlur={() => saveLineItem(li.id)}
                            min={1}
                            className="w-full border border-gray-300 rounded-lg px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                        </div>
                        <div>
                          <label className="block text-xs text-gray-400 mb-0.5">Cost</label>
                          <input
                            type="number"
                            value={li.unit_cost}
                            onChange={e => updateLineItem(li.id, 'unit_cost', e.target.value)}
                            onBlur={() => saveLineItem(li.id)}
                            min={0}
                            step={0.01}
                            className="w-full border border-gray-300 rounded-lg px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                        </div>
                        <div>
                          <label className="block text-xs text-gray-400 mb-0.5">Price</label>
                          <input
                            type="number"
                            value={li.unit_price}
                            onChange={e => updateLineItem(li.id, 'unit_price', e.target.value)}
                            onBlur={() => saveLineItem(li.id)}
                            min={0}
                            step={0.01}
                            className="w-full border border-gray-300 rounded-lg px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                        </div>
                      </div>
                      <div className="flex items-center justify-between text-xs text-gray-500">
                        <span>Line total</span>
                        <span className="font-semibold text-gray-800">{formatCurrency(Number(li.quantity) * Number(li.unit_price))}</span>
                      </div>
                    </div>
                  ))}

                  <div className="flex items-center justify-between pt-1 border-t border-gray-200">
                    <span className="text-sm font-semibold text-gray-700">Estimated Total</span>
                    <span className="text-sm font-bold text-gray-900">{formatCurrency(lineTotal)}</span>
                  </div>
                </div>
              )}

              {showProductSearch ? (
                <div className="border border-gray-200 rounded-xl overflow-hidden">
                  <div className="flex items-center gap-2 p-3 border-b border-gray-100">
                    <input
                      autoFocus
                      type="text"
                      value={productSearch}
                      onChange={e => setProductSearch(e.target.value)}
                      placeholder="Search product catalog…"
                      className="flex-1 text-sm focus:outline-none"
                    />
                    <button onClick={() => { setShowProductSearch(false); setProductSearch(''); }} className="text-gray-400 hover:text-gray-600">
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                  <div className="max-h-64 overflow-y-auto divide-y divide-gray-50">
                    {filteredProducts.map(p => (
                      <button
                        key={p.id}
                        onClick={() => addLineItem(p)}
                        className="w-full text-left px-3 py-2.5 hover:bg-gray-50 transition-colors"
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm font-medium text-gray-900">{p.name}</p>
                            <p className="text-xs text-gray-400">{p.sku} · {p.category}</p>
                          </div>
                          <span className="text-sm font-semibold text-gray-700">{formatCurrency(p.price)}</span>
                        </div>
                      </button>
                    ))}
                    {filteredProducts.length === 0 && (
                      <div className="px-3 py-4 text-center text-sm text-gray-400">No products found</div>
                    )}
                  </div>
                  <div className="border-t border-gray-100 p-2">
                    <button
                      onClick={() => addLineItem()}
                      className="w-full flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-medium text-gray-600 hover:bg-gray-50 rounded-lg transition-colors"
                    >
                      <Plus className="h-3.5 w-3.5" />
                      Add blank line item
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex gap-2">
                  <button
                    onClick={() => setShowProductSearch(true)}
                    disabled={savingItems}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 border-2 border-dashed border-gray-300 rounded-xl text-sm font-medium text-gray-500 hover:border-blue-400 hover:text-blue-600 transition-colors"
                  >
                    <Plus className="h-4 w-4" />
                    Add from Catalog
                  </button>
                  <button
                    onClick={() => addLineItem()}
                    disabled={savingItems}
                    className="flex items-center justify-center gap-2 px-4 py-2.5 border-2 border-dashed border-gray-300 rounded-xl text-sm font-medium text-gray-500 hover:border-blue-400 hover:text-blue-600 transition-colors"
                  >
                    <Plus className="h-4 w-4" />
                    Blank
                  </button>
                </div>
              )}
            </div>
          )}

          {/* ── PHOTOS ── */}
          {activeTab === 'photos' && (
            <div className="px-6 py-4 space-y-4">
              <p className="text-xs text-gray-500">Capture site photos to document conditions, panel locations, or areas of interest during your visit.</p>

              <div className="flex gap-2">
                <button
                  onClick={() => cameraInputRef.current?.click()}
                  disabled={uploadingPhoto}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 text-white text-sm font-semibold rounded-xl hover:bg-blue-700 transition-colors shadow-sm disabled:opacity-50"
                >
                  <Camera className="h-4 w-4" />
                  {uploadingPhoto ? 'Uploading…' : 'Take Photo'}
                </button>
                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploadingPhoto}
                  className="flex items-center justify-center gap-2 px-4 py-3 border border-gray-300 text-gray-700 text-sm font-semibold rounded-xl hover:bg-gray-50 transition-colors disabled:opacity-50"
                >
                  <Image className="h-4 w-4" />
                  Upload
                </button>
              </div>

              <input
                ref={cameraInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                onChange={handleFileChange}
                className="hidden"
              />
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                className="hidden"
              />

              {photos.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <div className="w-14 h-14 bg-gray-100 rounded-2xl flex items-center justify-center mb-3">
                    <Camera className="h-7 w-7 text-gray-400" />
                  </div>
                  <p className="text-sm font-medium text-gray-600 mb-1">No photos yet</p>
                  <p className="text-xs text-gray-400">Take a photo or upload from your device</p>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-3">
                  {photos.map(photo => (
                    <div key={photo.id} className="group relative">
                      <button
                        onClick={() => setLightboxUrl(photo.file_url)}
                        className="block w-full aspect-video rounded-xl overflow-hidden bg-gray-100 border border-gray-200 hover:border-blue-400 transition-colors"
                      >
                        <img
                          src={photo.file_url}
                          alt={photo.caption ?? 'Lead photo'}
                          className="w-full h-full object-cover"
                        />
                      </button>
                      <button
                        onClick={() => deletePhoto(photo.id)}
                        className="absolute top-1.5 right-1.5 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-sm"
                      >
                        <X className="h-3 w-3" />
                      </button>
                      <input
                        type="text"
                        value={photo.caption ?? ''}
                        onChange={e => setPhotos(prev => prev.map(p => p.id === photo.id ? { ...p, caption: e.target.value } : p))}
                        onBlur={e => updatePhotoCaption(photo.id, e.target.value)}
                        placeholder="Add caption…"
                        className="mt-1.5 w-full text-xs border-0 border-b border-gray-200 focus:outline-none focus:border-blue-400 text-gray-600 placeholder-gray-300 bg-transparent pb-0.5"
                      />
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer Actions */}
        {!isConverted && !isLost && (
          <div className="border-t border-gray-100 px-6 py-4">
            <div className="grid grid-cols-2 gap-2 mb-3">
              {lead.status === 'new' && (
                <button
                  onClick={() => updateStatus('contacted')}
                  disabled={updatingStatus}
                  className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-blue-50 text-blue-700 text-xs font-semibold hover:bg-blue-100 border border-blue-200 transition-colors disabled:opacity-50"
                >
                  <Phone className="h-3.5 w-3.5" />
                  Mark Contacted
                </button>
              )}
              {(lead.status === 'new' || lead.status === 'contacted') && (
                <button
                  onClick={() => updateStatus('scheduled')}
                  disabled={updatingStatus}
                  className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-amber-50 text-amber-700 text-xs font-semibold hover:bg-amber-100 border border-amber-200 transition-colors disabled:opacity-50"
                >
                  <Calendar className="h-3.5 w-3.5" />
                  Mark Scheduled
                </button>
              )}
              <button
                onClick={() => updateStatus('lost')}
                disabled={updatingStatus}
                className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-red-50 text-red-700 text-xs font-semibold hover:bg-red-100 border border-red-200 transition-colors disabled:opacity-50"
              >
                <XCircle className="h-3.5 w-3.5" />
                Mark Lost
              </button>
            </div>
            <button
              onClick={() => onConvertToDeal(lead)}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 text-white font-semibold text-sm hover:bg-blue-700 transition-colors shadow-sm"
            >
              Convert to Deal
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        )}

        {isLost && (
          <div className="border-t border-gray-100 px-6 py-4">
            <button
              onClick={() => updateStatus('new')}
              disabled={updatingStatus}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-gray-100 text-gray-700 font-semibold text-sm hover:bg-gray-200 transition-colors"
            >
              <ChevronRight className="h-4 w-4" />
              Reopen Lead
            </button>
          </div>
        )}
      </div>

      {/* Lightbox */}
      {lightboxUrl && (
        <div
          className="fixed inset-0 z-[60] bg-black/80 flex items-center justify-center p-4"
          onClick={() => setLightboxUrl(null)}
        >
          <button
            onClick={() => setLightboxUrl(null)}
            className="absolute top-4 right-4 w-10 h-10 bg-white/20 text-white rounded-full flex items-center justify-center hover:bg-white/30 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
          <img
            src={lightboxUrl}
            alt="Photo"
            className="max-w-full max-h-full rounded-xl shadow-2xl"
            onClick={e => e.stopPropagation()}
          />
        </div>
      )}
    </>
  );
}
