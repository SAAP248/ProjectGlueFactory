import { useState, useEffect } from 'react';
import { Check, ChevronDown, ChevronUp, Package, LayoutGrid, Layers, Plus, Trash2, GripVertical } from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import type { WizardState, WizardSystem, WizardRoom, SystemType, PackageCatalogItem } from './types';
import * as LucideIcons from 'lucide-react';

interface Props {
  state: WizardState;
  onChange: (updates: Partial<WizardState>) => void;
}

function SystemIcon({ name, className }: { name: string; className?: string }) {
  const Icon = (LucideIcons as Record<string, React.ComponentType<{ className?: string }>>)[name];
  if (!Icon) return <LucideIcons.Shield className={className} />;
  return <Icon className={className} />;
}

export default function Step2Systems({ state, onChange }: Props) {
  const [systemTypes, setSystemTypes] = useState<SystemType[]>([]);
  const [packages, setPackages] = useState<PackageCatalogItem[]>([]);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [error, setError] = useState('');

  useEffect(() => {
    supabase.from('system_types').select('*').eq('is_active', true).order('sort_order').then(({ data }) => {
      if (data) setSystemTypes(data as SystemType[]);
    });
    supabase.from('packages').select('id,name,cost,price').then(({ data }) => {
      if (data) setPackages(data as PackageCatalogItem[]);
    });
  }, []);

  function isSelected(typeId: string) {
    return state.systems.some(s => s.system_type_id === typeId);
  }

  function toggleSystem(type: SystemType) {
    setError('');
    if (isSelected(type.id)) {
      onChange({ systems: state.systems.filter(s => s.system_type_id !== type.id) });
    } else {
      const newSystem: WizardSystem = {
        id: crypto.randomUUID(),
        system_type_id: type.id,
        system_type_name: type.name,
        system_type_icon: type.icon_name,
        system_type_color: type.color,
        name: type.name,
        package_id: null,
        package_name: null,
        sort_order: state.systems.length,
      };
      onChange({ systems: [...state.systems, newSystem] });
      setExpanded(prev => ({ ...prev, [newSystem.id]: true }));
    }
  }

  function updateSystem(id: string, updates: Partial<WizardSystem>) {
    onChange({ systems: state.systems.map(s => s.id === id ? { ...s, ...updates } : s) });
  }

  function applyPackage(system: WizardSystem, pkg: PackageCatalogItem | null) {
    updateSystem(system.id, {
      package_id: pkg?.id ?? null,
      package_name: pkg?.name ?? null,
    });
  }

  return (
    <div className="max-w-3xl mx-auto space-y-8">
      <div>
        <h2 className="text-xl font-bold text-gray-900 mb-1">What systems are you selling?</h2>
        <p className="text-sm text-gray-500">Select all system types that apply to this proposal. You can configure each one below.</p>
      </div>

      {error && (
        <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl px-4 py-3">
          {error}
        </div>
      )}

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
        {systemTypes.map(type => {
          const selected = isSelected(type.id);
          return (
            <button
              key={type.id}
              onClick={() => toggleSystem(type)}
              className={`relative flex flex-col items-center gap-2.5 p-4 rounded-xl border-2 transition-all text-center ${
                selected
                  ? 'border-blue-600 bg-blue-50 shadow-sm'
                  : 'border-gray-200 bg-white hover:border-gray-300 hover:shadow-sm'
              }`}
            >
              {selected && (
                <div className="absolute top-2 right-2 w-5 h-5 rounded-full bg-blue-600 flex items-center justify-center">
                  <Check className="h-3 w-3 text-white" />
                </div>
              )}
              <div
                className="w-12 h-12 rounded-xl flex items-center justify-center"
                style={{ backgroundColor: type.color + '20' }}
              >
                <SystemIcon name={type.icon_name} className="h-6 w-6" style={{ color: type.color } as React.CSSProperties} />
              </div>
              <span className={`text-sm font-semibold ${selected ? 'text-blue-700' : 'text-gray-700'}`}>
                {type.name}
              </span>
            </button>
          );
        })}
      </div>

      {state.systems.length > 0 && (
        <div>
          <h3 className="text-base font-bold text-gray-900 mb-3">Configure Selected Systems</h3>
          <div className="space-y-3">
            {state.systems.map(system => {
              const isOpen = expanded[system.id] !== false;
              return (
                <div key={system.id} className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                  <button
                    onClick={() => setExpanded(prev => ({ ...prev, [system.id]: !isOpen }))}
                    className="w-full flex items-center justify-between px-5 py-4 hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className="w-9 h-9 rounded-lg flex items-center justify-center"
                        style={{ backgroundColor: system.system_type_color + '20' }}
                      >
                        <SystemIcon name={system.system_type_icon} className="h-5 w-5" style={{ color: system.system_type_color } as React.CSSProperties} />
                      </div>
                      <div className="text-left">
                        <p className="text-sm font-bold text-gray-900">{system.name}</p>
                        {system.package_name && (
                          <p className="text-xs text-gray-500 flex items-center gap-1">
                            <Package className="h-3 w-3" /> Package: {system.package_name}
                          </p>
                        )}
                      </div>
                    </div>
                    {isOpen ? <ChevronUp className="h-4 w-4 text-gray-400" /> : <ChevronDown className="h-4 w-4 text-gray-400" />}
                  </button>

                  {isOpen && (
                    <div className="px-5 pb-5 space-y-4 border-t border-gray-100">
                      <div className="mt-4">
                        <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Display Name on Proposal</label>
                        <input
                          type="text"
                          value={system.name}
                          onChange={e => updateSystem(system.id, { name: e.target.value })}
                          className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>

                      {packages.length > 0 && (
                        <div>
                          <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Apply Package (Optional)</label>
                          <select
                            value={system.package_id ?? ''}
                            onChange={e => {
                              const pkg = packages.find(p => p.id === e.target.value) ?? null;
                              applyPackage(system, pkg);
                            }}
                            className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                          >
                            <option value="">No package — add products manually in Step 3</option>
                            {packages.map(pkg => (
                              <option key={pkg.id} value={pkg.id}>{pkg.name}</option>
                            ))}
                          </select>
                          {system.package_id && (
                            <p className="text-xs text-blue-600 mt-1.5">
                              Package items will be pre-loaded in Step 3. You can modify them there.
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {state.systems.length === 0 && (
        <p className="text-center text-sm text-gray-400 py-4">Select at least one system type to continue.</p>
      )}

      {/* Proposal Layout / Grouping Mode */}
      {state.systems.length > 0 && (
        <div className="space-y-4">
          <div>
            <h3 className="text-base font-bold text-gray-900 mb-1">Proposal Layout</h3>
            <p className="text-sm text-gray-500">How should products be grouped on the proposal the customer sees?</p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => onChange({ groupingMode: 'by_system' })}
              className={`flex items-center gap-3 p-4 rounded-xl border-2 transition-all ${
                state.groupingMode === 'by_system' ? 'border-blue-600 bg-blue-50' : 'border-gray-200 bg-white hover:border-gray-300'
              }`}
            >
              <Layers className={`h-5 w-5 ${state.groupingMode === 'by_system' ? 'text-blue-600' : 'text-gray-400'}`} />
              <div className="text-left">
                <p className={`text-sm font-semibold ${state.groupingMode === 'by_system' ? 'text-blue-700' : 'text-gray-700'}`}>By System</p>
                <p className="text-xs text-gray-500">Group by Alarm, Cameras, etc.</p>
              </div>
            </button>
            <button
              type="button"
              onClick={() => onChange({ groupingMode: 'by_room' })}
              className={`flex items-center gap-3 p-4 rounded-xl border-2 transition-all ${
                state.groupingMode === 'by_room' ? 'border-blue-600 bg-blue-50' : 'border-gray-200 bg-white hover:border-gray-300'
              }`}
            >
              <LayoutGrid className={`h-5 w-5 ${state.groupingMode === 'by_room' ? 'text-blue-600' : 'text-gray-400'}`} />
              <div className="text-left">
                <p className={`text-sm font-semibold ${state.groupingMode === 'by_room' ? 'text-blue-700' : 'text-gray-700'}`}>By Room</p>
                <p className="text-xs text-gray-500">Group by Living Room, Kitchen, etc.</p>
              </div>
            </button>
          </div>

          <p className="text-xs text-gray-400">Customers can toggle between views on the proposal page.</p>

          {/* Room management (shown when by_room is selected) */}
          {state.groupingMode === 'by_room' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-sm font-semibold text-gray-700">Rooms</label>
                <button
                  type="button"
                  onClick={() => {
                    const newRoom: WizardRoom = {
                      id: crypto.randomUUID(),
                      name: '',
                      description: '',
                      sort_order: state.rooms.length,
                    };
                    onChange({ rooms: [...state.rooms, newRoom] });
                  }}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  <Plus className="h-3.5 w-3.5" /> Add Room
                </button>
              </div>

              {state.rooms.length === 0 && (
                <p className="text-sm text-gray-400 text-center py-4 border border-dashed border-gray-200 rounded-xl">
                  Add rooms to organize products by location (e.g., Living Room, Kitchen, Master Bedroom)
                </p>
              )}

              <div className="space-y-2">
                {state.rooms.map((room, idx) => (
                  <div key={room.id} className="flex items-center gap-2 bg-white border border-gray-200 rounded-lg px-3 py-2.5">
                    <GripVertical className="h-4 w-4 text-gray-300 flex-shrink-0" />
                    <input
                      type="text"
                      placeholder="Room name (e.g., Living Room)"
                      value={room.name}
                      onChange={e => {
                        const updated = state.rooms.map((r, i) => i === idx ? { ...r, name: e.target.value } : r);
                        onChange({ rooms: updated });
                      }}
                      className="flex-1 border-0 p-0 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-0"
                    />
                    <button
                      type="button"
                      onClick={() => onChange({ rooms: state.rooms.filter((_, i) => i !== idx) })}
                      className="p-1 hover:bg-red-50 rounded text-gray-400 hover:text-red-600 transition-colors"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
              </div>

              {state.rooms.length > 0 && state.rooms.some(r => !r.name.trim()) && (
                <p className="text-xs text-amber-600">Each room needs a name.</p>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
