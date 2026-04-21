import { useState, useEffect } from 'react';
import {
  Settings as SettingsIcon, User, Bell, Shield as ShieldIcon, Database,
  ShieldAlert, Flame, ShieldCheck, KeyRound, Network, Tv2, DoorOpen,
  Plus, Trash2, GripVertical, CheckCircle2, RotateCcw
} from 'lucide-react';
import { supabase } from '../lib/supabase';

interface SystemType {
  id: string;
  name: string;
  icon_name: string;
  color: string;
  is_default: boolean;
  is_active: boolean;
  sort_order: number;
}

interface GoBackReason {
  id: string;
  label: string;
  is_active: boolean;
  sort_order: number;
}

const AVAILABLE_ICONS = [
  { name: 'ShieldAlert', label: 'Shield Alert' },
  { name: 'Flame', label: 'Flame' },
  { name: 'ShieldCheck', label: 'Shield Check' },
  { name: 'KeyRound', label: 'Key' },
  { name: 'Network', label: 'Network' },
  { name: 'Tv2', label: 'TV/AV' },
  { name: 'DoorOpen', label: 'Gate/Door' },
  { name: 'Shield', label: 'Shield' },
];

const PRESET_COLORS = [
  '#dc2626', '#ea580c', '#b45309', '#16a34a',
  '#0891b2', '#2563eb', '#7c3aed', '#db2777',
  '#64748b', '#374151',
];

const iconComponentMap: Record<string, React.ElementType> = {
  ShieldAlert, Flame, ShieldCheck, KeyRound, Network, Tv2, DoorOpen, Shield: ShieldIcon,
};

export default function Settings() {
  const [activeSection, setActiveSection] = useState<'system-types' | 'go-back-reasons'>('system-types');

  const [systemTypes, setSystemTypes] = useState<SystemType[]>([]);
  const [loadingTypes, setLoadingTypes] = useState(true);
  const [newTypeName, setNewTypeName] = useState('');
  const [newTypeIcon, setNewTypeIcon] = useState('Shield');
  const [newTypeColor, setNewTypeColor] = useState('#2563eb');
  const [saving, setSaving] = useState(false);
  const [savedId, setSavedId] = useState<string | null>(null);

  const [goBackReasons, setGoBackReasons] = useState<GoBackReason[]>([]);
  const [loadingReasons, setLoadingReasons] = useState(true);
  const [newReasonLabel, setNewReasonLabel] = useState('');
  const [savingReason, setSavingReason] = useState(false);
  const [editingReasonId, setEditingReasonId] = useState<string | null>(null);
  const [editingReasonLabel, setEditingReasonLabel] = useState('');

  useEffect(() => {
    fetchSystemTypes();
    fetchGoBackReasons();
  }, []);

  async function fetchSystemTypes() {
    const { data } = await supabase.from('system_types').select('*').order('sort_order');
    if (data) setSystemTypes(data);
    setLoadingTypes(false);
  }

  async function fetchGoBackReasons() {
    const { data } = await supabase.from('go_back_reasons').select('*').order('sort_order');
    if (data) setGoBackReasons(data);
    setLoadingReasons(false);
  }

  async function addSystemType() {
    if (!newTypeName.trim()) return;
    setSaving(true);
    const maxOrder = systemTypes.reduce((m, t) => Math.max(m, t.sort_order), 0);
    const { data, error } = await supabase
      .from('system_types')
      .insert({ name: newTypeName.trim(), icon_name: newTypeIcon, color: newTypeColor, is_default: false, is_active: true, sort_order: maxOrder + 1 })
      .select()
      .maybeSingle();
    if (!error && data) {
      setSystemTypes(prev => [...prev, data]);
      setSavedId(data.id);
      setTimeout(() => setSavedId(null), 2000);
      setNewTypeName('');
      setNewTypeIcon('Shield');
      setNewTypeColor('#2563eb');
    }
    setSaving(false);
  }

  async function deleteSystemType(id: string) {
    await supabase.from('system_types').delete().eq('id', id);
    setSystemTypes(prev => prev.filter(t => t.id !== id));
  }

  async function toggleSystemTypeActive(type: SystemType) {
    await supabase.from('system_types').update({ is_active: !type.is_active }).eq('id', type.id);
    setSystemTypes(prev => prev.map(t => t.id === type.id ? { ...t, is_active: !t.is_active } : t));
  }

  async function addGoBackReason() {
    if (!newReasonLabel.trim()) return;
    setSavingReason(true);
    const maxOrder = goBackReasons.reduce((m, r) => Math.max(m, r.sort_order), 0);
    const { data, error } = await supabase
      .from('go_back_reasons')
      .insert({ label: newReasonLabel.trim(), is_active: true, sort_order: maxOrder + 1 })
      .select()
      .maybeSingle();
    if (!error && data) {
      setGoBackReasons(prev => [...prev, data]);
      setNewReasonLabel('');
    }
    setSavingReason(false);
  }

  async function deleteGoBackReason(id: string) {
    await supabase.from('go_back_reasons').delete().eq('id', id);
    setGoBackReasons(prev => prev.filter(r => r.id !== id));
  }

  async function toggleGoBackReasonActive(reason: GoBackReason) {
    await supabase.from('go_back_reasons').update({ is_active: !reason.is_active }).eq('id', reason.id);
    setGoBackReasons(prev => prev.map(r => r.id === reason.id ? { ...r, is_active: !r.is_active } : r));
  }

  async function saveReasonLabel(reason: GoBackReason) {
    if (!editingReasonLabel.trim()) return;
    await supabase.from('go_back_reasons').update({ label: editingReasonLabel.trim() }).eq('id', reason.id);
    setGoBackReasons(prev => prev.map(r => r.id === reason.id ? { ...r, label: editingReasonLabel.trim() } : r));
    setEditingReasonId(null);
  }

  const settingsSections = [
    { name: 'Company Settings', icon: SettingsIcon, items: ['Company Profile', 'Business Hours', 'Service Areas', 'Tax Settings'] },
    { name: 'User Management', icon: User, items: ['Users & Roles', 'Permissions', 'Team Settings', 'Access Control'] },
    { name: 'Notifications', icon: Bell, items: ['Email Notifications', 'SMS Alerts', 'Push Notifications', 'Alert Rules'] },
    { name: 'Security', icon: ShieldIcon, items: ['Password Policy', 'Two-Factor Auth', 'Session Management', 'Audit Logs'] },
    { name: 'Integrations', icon: Database, items: ['Central Station API', 'Accounting Software', 'Payment Gateway', 'Third-Party Apps'] },
  ];

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
        <p className="text-gray-600 mt-1">Configure your system preferences and integrations</p>
      </div>

      <div className="flex gap-2">
        <button
          onClick={() => setActiveSection('system-types')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            activeSection === 'system-types'
              ? 'bg-blue-600 text-white'
              : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
          }`}
        >
          <ShieldAlert className="h-4 w-4" />
          System Types
        </button>
        <button
          onClick={() => setActiveSection('go-back-reasons')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            activeSection === 'go-back-reasons'
              ? 'bg-orange-600 text-white'
              : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
          }`}
        >
          <RotateCcw className="h-4 w-4" />
          Go-Back Reasons
        </button>
      </div>

      {activeSection === 'system-types' && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="px-6 py-5 border-b border-gray-100">
            <div className="flex items-center gap-3 mb-1">
              <div className="bg-blue-100 p-2.5 rounded-xl">
                <ShieldAlert className="h-5 w-5 text-blue-600" />
              </div>
              <h3 className="text-lg font-bold text-gray-900">System Types</h3>
            </div>
            <p className="text-sm text-gray-500 ml-11">
              Define the types of security systems you install and monitor. These appear when adding systems to customer sites.
            </p>
          </div>
          <div className="p-6">
            {loadingTypes ? (
              <p className="text-sm text-gray-400">Loading...</p>
            ) : (
              <div className="space-y-2 mb-6">
                {systemTypes.map(type => {
                  const IconComp = iconComponentMap[type.icon_name] || ShieldIcon;
                  return (
                    <div
                      key={type.id}
                      className={`flex items-center gap-4 p-4 rounded-xl border transition-colors ${
                        type.is_active ? 'border-gray-200 bg-white' : 'border-gray-100 bg-gray-50 opacity-60'
                      }`}
                    >
                      <GripVertical className="h-4 w-4 text-gray-300 flex-shrink-0" />
                      <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0" style={{ backgroundColor: type.color + '20' }}>
                        <IconComp className="h-5 w-5" style={{ color: type.color }} />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-gray-900">{type.name}</span>
                          {type.is_default && <span className="px-1.5 py-0.5 text-xs bg-gray-100 text-gray-500 rounded font-medium">Default</span>}
                          {savedId === type.id && <CheckCircle2 className="h-4 w-4 text-emerald-500" />}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => toggleSystemTypeActive(type)}
                          className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                            type.is_active ? 'bg-gray-100 text-gray-600 hover:bg-gray-200' : 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200'
                          }`}
                        >
                          {type.is_active ? 'Disable' : 'Enable'}
                        </button>
                        {!type.is_default && (
                          <button onClick={() => deleteSystemType(type.id)} className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors">
                            <Trash2 className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
            <div className="border-t border-gray-100 pt-5">
              <h4 className="text-sm font-semibold text-gray-700 mb-3">Add Custom System Type</h4>
              <div className="flex items-end gap-3 flex-wrap">
                <div className="flex-1 min-w-48">
                  <label className="block text-xs font-medium text-gray-500 mb-1.5">Type Name</label>
                  <input
                    type="text"
                    value={newTypeName}
                    onChange={e => setNewTypeName(e.target.value)}
                    placeholder="e.g., CCTV, Intercom..."
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    onKeyDown={e => e.key === 'Enter' && addSystemType()}
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1.5">Icon</label>
                  <select
                    value={newTypeIcon}
                    onChange={e => setNewTypeIcon(e.target.value)}
                    className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {AVAILABLE_ICONS.map(icon => <option key={icon.name} value={icon.name}>{icon.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1.5">Color</label>
                  <div className="flex gap-1.5 flex-wrap">
                    {PRESET_COLORS.map(color => (
                      <button
                        key={color}
                        onClick={() => setNewTypeColor(color)}
                        className={`w-7 h-7 rounded-full border-2 transition-transform hover:scale-110 ${newTypeColor === color ? 'border-gray-800 scale-110' : 'border-transparent'}`}
                        style={{ backgroundColor: color }}
                      />
                    ))}
                  </div>
                </div>
                <button
                  onClick={addSystemType}
                  disabled={!newTypeName.trim() || saving}
                  className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  <Plus className="h-4 w-4" />
                  Add Type
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeSection === 'go-back-reasons' && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="px-6 py-5 border-b border-gray-100">
            <div className="flex items-center gap-3 mb-1">
              <div className="bg-orange-100 p-2.5 rounded-xl">
                <RotateCcw className="h-5 w-5 text-orange-600" />
              </div>
              <h3 className="text-lg font-bold text-gray-900">Go-Back Reasons</h3>
            </div>
            <p className="text-sm text-gray-500 ml-11">
              Manage the selectable reasons for go-back work orders. New reasons appear automatically in all pickers and reports.
            </p>
          </div>
          <div className="p-6">
            {loadingReasons ? (
              <p className="text-sm text-gray-400">Loading...</p>
            ) : (
              <div className="space-y-2 mb-6">
                {goBackReasons.map(reason => (
                  <div
                    key={reason.id}
                    className={`flex items-center gap-4 p-4 rounded-xl border transition-colors ${
                      reason.is_active ? 'border-gray-200 bg-white' : 'border-gray-100 bg-gray-50 opacity-60'
                    }`}
                  >
                    <GripVertical className="h-4 w-4 text-gray-300 flex-shrink-0" />
                    <div className="w-8 h-8 rounded-lg bg-orange-100 flex items-center justify-center flex-shrink-0">
                      <RotateCcw className="h-4 w-4 text-orange-500" />
                    </div>
                    <div className="flex-1">
                      {editingReasonId === reason.id ? (
                        <div className="flex items-center gap-2">
                          <input
                            type="text"
                            value={editingReasonLabel}
                            onChange={e => setEditingReasonLabel(e.target.value)}
                            className="flex-1 border border-orange-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
                            autoFocus
                            onKeyDown={e => {
                              if (e.key === 'Enter') saveReasonLabel(reason);
                              if (e.key === 'Escape') setEditingReasonId(null);
                            }}
                          />
                          <button onClick={() => saveReasonLabel(reason)} className="px-3 py-1.5 text-xs font-medium text-white bg-orange-600 rounded-lg hover:bg-orange-700">Save</button>
                          <button onClick={() => setEditingReasonId(null)} className="px-3 py-1.5 text-xs font-medium text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200">Cancel</button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-gray-900">{reason.label}</span>
                          <button
                            onClick={() => { setEditingReasonId(reason.id); setEditingReasonLabel(reason.label); }}
                            className="text-xs text-gray-400 hover:text-gray-700 transition-colors underline"
                          >
                            Edit
                          </button>
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => toggleGoBackReasonActive(reason)}
                        className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                          reason.is_active ? 'bg-gray-100 text-gray-600 hover:bg-gray-200' : 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200'
                        }`}
                      >
                        {reason.is_active ? 'Disable' : 'Enable'}
                      </button>
                      <button onClick={() => deleteGoBackReason(reason.id)} className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                ))}
                {goBackReasons.length === 0 && (
                  <p className="text-sm text-gray-400 italic py-4 text-center">No go-back reasons defined yet.</p>
                )}
              </div>
            )}
            <div className="border-t border-gray-100 pt-5">
              <h4 className="text-sm font-semibold text-gray-700 mb-3">Add New Reason</h4>
              <div className="flex items-center gap-3">
                <input
                  type="text"
                  value={newReasonLabel}
                  onChange={e => setNewReasonLabel(e.target.value)}
                  placeholder="e.g., Missing Parts, Wrong Address..."
                  className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                  onKeyDown={e => e.key === 'Enter' && addGoBackReason()}
                />
                <button
                  onClick={addGoBackReason}
                  disabled={!newReasonLabel.trim() || savingReason}
                  className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-orange-600 rounded-lg hover:bg-orange-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  <Plus className="h-4 w-4" />
                  Add Reason
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {settingsSections.map((section, index) => {
          const Icon = section.icon;
          return (
            <div key={index} className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
              <div className="flex items-center mb-4">
                <div className="bg-blue-100 p-3 rounded-xl mr-3">
                  <Icon className="h-6 w-6 text-blue-600" />
                </div>
                <h3 className="text-lg font-bold text-gray-900">{section.name}</h3>
              </div>
              <div className="space-y-2">
                {section.items.map((item, idx) => (
                  <button key={idx} className="w-full text-left px-4 py-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors text-sm font-medium text-gray-900">
                    {item}
                  </button>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
