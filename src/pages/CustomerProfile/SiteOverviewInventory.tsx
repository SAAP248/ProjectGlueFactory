import { useState, useEffect, useRef } from 'react';
import {
  Package, Plus, ChevronDown, ChevronRight, Pencil, Trash2, X, Check,
  Search, Bed, Bath, Sofa, UtensilsCrossed, Monitor, Server, Car, DoorClosed,
  Wrench, LayoutGrid, CircleDot, AlertTriangle
} from 'lucide-react';
import type { SiteRoom, SiteInventoryItem } from './SiteOverview';
import type { CustomerSystem } from './types';
import { supabase } from '../../lib/supabase';

interface Props {
  siteId: string;
  companyId: string;
  rooms: SiteRoom[];
  inventory: SiteInventoryItem[];
  systems: CustomerSystem[];
  onRefresh: () => void;
}

interface ProductResult {
  id: string;
  name: string;
  manufacturer: string | null;
  model_number: string | null;
  category: string | null;
  image_url: string | null;
}

const ROOM_TYPES = ['Bedroom', 'Bathroom', 'Living Area', 'Kitchen', 'Office', 'Server Room', 'Garage', 'Closet', 'Utility', 'Other'];

const ROOM_ICON_MAP: Record<string, React.ElementType> = {
  Bedroom: Bed, Bathroom: Bath, 'Living Area': Sofa, Kitchen: UtensilsCrossed,
  Office: Monitor, 'Server Room': Server, Garage: Car, Closet: DoorClosed,
  Utility: Wrench, Other: LayoutGrid,
};

const ROOM_COLOR_MAP: Record<string, string> = {
  Bedroom: 'bg-indigo-100 text-indigo-700', Bathroom: 'bg-cyan-100 text-cyan-700',
  'Living Area': 'bg-amber-100 text-amber-700', Kitchen: 'bg-rose-100 text-rose-700',
  Office: 'bg-blue-100 text-blue-700', 'Server Room': 'bg-emerald-100 text-emerald-700',
  Garage: 'bg-gray-200 text-gray-700', Closet: 'bg-orange-100 text-orange-700',
  Utility: 'bg-teal-100 text-teal-700', Other: 'bg-gray-100 text-gray-600',
};

const emptyRoom = { name: '', floor_level: '', room_type: 'Other', notes: '' };
const emptyEquip = {
  product_name: '', product_category: '', product_id: null as string | null,
  system_id: '', serial_number: '', mac_address: '', room_id: '',
  installation_date: '', last_service_date: '', notes: '', status: 'active',
};

export default function SiteOverviewInventory({ siteId, companyId, rooms, inventory, systems, onRefresh }: Props) {
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [roomModal, setRoomModal] = useState<{ mode: 'add' | 'edit'; data: typeof emptyRoom; id?: string } | null>(null);
  const [equipModal, setEquipModal] = useState<{ mode: 'add' | 'edit'; data: typeof emptyEquip; id?: string } | null>(null);
  const [saving, setSaving] = useState(false);

  const toggle = (id: string) => setExpanded(prev => {
    const n = new Set(prev);
    n.has(id) ? n.delete(id) : n.add(id);
    return n;
  });

  const roomItems = (roomId: string) => inventory.filter(i => i.room_id === roomId);
  const unassigned = inventory.filter(i => !i.room_id);
  const systemMap = Object.fromEntries(systems.map(s => [s.id, s]));

  async function saveRoom() {
    if (!roomModal || !roomModal.data.name.trim()) return;
    setSaving(true);
    if (roomModal.mode === 'add') {
      await supabase.from('site_rooms').insert({
        site_id: siteId, name: roomModal.data.name.trim(),
        floor_level: roomModal.data.floor_level || null,
        room_type: roomModal.data.room_type, notes: roomModal.data.notes || null,
      });
    } else if (roomModal.id) {
      await supabase.from('site_rooms').update({
        name: roomModal.data.name.trim(),
        floor_level: roomModal.data.floor_level || null,
        room_type: roomModal.data.room_type, notes: roomModal.data.notes || null,
      }).eq('id', roomModal.id);
    }
    setSaving(false);
    setRoomModal(null);
    onRefresh();
  }

  async function deleteRoom(room: SiteRoom) {
    if (!window.confirm(`Delete "${room.name}"? Equipment in this room will become unassigned.`)) return;
    await supabase.from('site_rooms').delete().eq('id', room.id);
    onRefresh();
  }

  async function saveEquip() {
    if (!equipModal) return;
    setSaving(true);
    const d = equipModal.data;
    const payload: Record<string, any> = {
      site_id: siteId, company_id: companyId,
      product_name: d.product_name || null, product_category: d.product_category || null,
      product_id: d.product_id || null, system_id: d.system_id || null,
      serial_number: d.serial_number || null, mac_address: d.mac_address || null,
      room_id: d.room_id || null,
      installation_date: d.installation_date || null, last_service_date: d.last_service_date || null,
      notes: d.notes || null, status: d.status || 'active',
    };
    if (equipModal.mode === 'add') {
      await supabase.from('site_inventory').insert(payload);
    } else if (equipModal.id) {
      await supabase.from('site_inventory').update(payload).eq('id', equipModal.id);
    }
    setSaving(false);
    setEquipModal(null);
    onRefresh();
  }

  async function deleteEquip(id: string) {
    if (!window.confirm('Delete this equipment entry?')) return;
    await supabase.from('site_inventory').delete().eq('id', id);
    onRefresh();
  }

  function openAddEquip(roomId?: string) {
    setEquipModal({ mode: 'add', data: { ...emptyEquip, room_id: roomId || '' } });
  }

  function openEditEquip(item: SiteInventoryItem) {
    setEquipModal({
      mode: 'edit', id: item.id,
      data: {
        product_name: item.product_name || '', product_category: item.product_category || '',
        product_id: item.product_id || null, system_id: item.system_id || '',
        serial_number: item.serial_number || '', mac_address: item.mac_address || '',
        room_id: item.room_id || '', installation_date: item.installation_date || '',
        last_service_date: item.last_service_date || '', notes: item.notes || '',
        status: item.status || 'active',
      },
    });
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-emerald-50 rounded-lg"><Package className="h-5 w-5 text-emerald-600" /></div>
          <div>
            <h3 className="font-semibold text-gray-900">Site Inventory</h3>
            <p className="text-xs text-gray-500">{rooms.length} room{rooms.length !== 1 ? 's' : ''}, {inventory.length} item{inventory.length !== 1 ? 's' : ''}</p>
          </div>
        </div>
        <button onClick={() => setRoomModal({ mode: 'add', data: { ...emptyRoom } })}
          className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-emerald-600 bg-emerald-50 rounded-lg hover:bg-emerald-100 transition-colors">
          <Plus className="h-4 w-4" /> Add Room
        </button>
      </div>

      <div className="p-4 space-y-3">
        {rooms.map(room => {
          const items = roomItems(room.id);
          const isOpen = expanded.has(room.id);
          const Icon = ROOM_ICON_MAP[room.room_type] || LayoutGrid;
          const color = ROOM_COLOR_MAP[room.room_type] || ROOM_COLOR_MAP.Other;
          return (
            <div key={room.id} className="border border-gray-200 rounded-xl overflow-hidden">
              <button onClick={() => toggle(room.id)}
                className="w-full px-5 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors">
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg ${color.split(' ')[0]}`}><Icon className={`h-4 w-4 ${color.split(' ')[1]}`} /></div>
                  <div className="text-left">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-gray-900 text-sm">{room.name}</span>
                      <span className={`px-2 py-0.5 text-xs rounded-full font-medium ${color}`}>{room.room_type}</span>
                    </div>
                    {room.floor_level && <p className="text-xs text-gray-500 mt-0.5">{room.floor_level}</p>}
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-xs text-gray-500 bg-gray-100 px-2.5 py-1 rounded-full">{items.length} item{items.length !== 1 ? 's' : ''}</span>
                  {isOpen ? <ChevronDown className="h-4 w-4 text-gray-400" /> : <ChevronRight className="h-4 w-4 text-gray-400" />}
                </div>
              </button>

              {isOpen && (
                <div className="border-t border-gray-100">
                  <div className="px-5 py-2 bg-gray-50 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {room.notes && <span className="text-xs text-gray-500 italic">{room.notes}</span>}
                    </div>
                    <div className="flex items-center gap-1">
                      <button onClick={(e) => { e.stopPropagation(); setRoomModal({ mode: 'edit', id: room.id, data: { name: room.name, floor_level: room.floor_level || '', room_type: room.room_type, notes: room.notes || '' } }); }}
                        className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"><Pencil className="h-3.5 w-3.5" /></button>
                      <button onClick={(e) => { e.stopPropagation(); deleteRoom(room); }}
                        className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"><Trash2 className="h-3.5 w-3.5" /></button>
                    </div>
                  </div>
                  {items.length > 0 ? (
                    <div className="overflow-x-auto">
                      <EquipmentTable items={items} systemMap={systemMap} onEdit={openEditEquip} onDelete={deleteEquip} />
                    </div>
                  ) : (
                    <div className="py-8 text-center text-sm text-gray-400">No equipment in this room</div>
                  )}
                  <div className="px-5 py-3 border-t border-gray-100">
                    <button onClick={() => openAddEquip(room.id)}
                      className="w-full py-2 border border-dashed border-gray-300 rounded-lg text-sm text-gray-500 hover:border-emerald-400 hover:text-emerald-600 hover:bg-emerald-50 transition-colors flex items-center justify-center gap-2">
                      <Plus className="h-4 w-4" /> Add Equipment
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })}

        {rooms.length === 0 && unassigned.length === 0 && (
          <div className="py-12 text-center border border-dashed border-gray-300 rounded-xl">
            <Package className="h-10 w-10 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500 mb-1">No rooms or equipment yet</p>
            <p className="text-xs text-gray-400 mb-4">Add rooms to organize equipment by location</p>
            <button onClick={() => setRoomModal({ mode: 'add', data: { ...emptyRoom } })}
              className="px-4 py-2 text-sm font-medium text-emerald-600 bg-emerald-50 rounded-lg hover:bg-emerald-100 transition-colors">
              Add First Room
            </button>
          </div>
        )}

        {unassigned.length > 0 && (
          <div className="border border-amber-200 rounded-xl overflow-hidden">
            <div className="px-5 py-3 bg-amber-50 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-amber-600" />
                <span className="font-medium text-sm text-amber-800">Unassigned Equipment</span>
                <span className="text-xs text-amber-600 bg-amber-100 px-2 py-0.5 rounded-full">{unassigned.length}</span>
              </div>
              <button onClick={() => openAddEquip()}
                className="text-xs text-amber-700 hover:text-amber-900 font-medium transition-colors">+ Add Equipment</button>
            </div>
            <div className="overflow-x-auto">
              <EquipmentTable items={unassigned} systemMap={systemMap} onEdit={openEditEquip} onDelete={deleteEquip} />
            </div>
          </div>
        )}
      </div>

      {roomModal && (
        <RoomModal data={roomModal.data} mode={roomModal.mode} saving={saving}
          onChange={(d) => setRoomModal(prev => prev ? { ...prev, data: d } : null)}
          onSave={saveRoom} onClose={() => setRoomModal(null)} />
      )}

      {equipModal && (
        <EquipmentModal data={equipModal.data} mode={equipModal.mode} saving={saving}
          rooms={rooms} systems={systems}
          onChange={(d) => setEquipModal(prev => prev ? { ...prev, data: d } : null)}
          onSave={saveEquip} onClose={() => setEquipModal(null)} />
      )}
    </div>
  );
}

function EquipmentTable({ items, systemMap, onEdit, onDelete }: {
  items: SiteInventoryItem[];
  systemMap: Record<string, CustomerSystem>;
  onEdit: (item: SiteInventoryItem) => void;
  onDelete: (id: string) => void;
}) {
  return (
    <table className="w-full text-sm">
      <thead>
        <tr className="bg-gray-50 border-b border-gray-100">
          <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500">Product</th>
          <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500">System</th>
          <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500">Serial / MAC</th>
          <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500">Installed</th>
          <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500">Last Service</th>
          <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500">Status</th>
          <th className="px-4 py-2.5 w-20"></th>
        </tr>
      </thead>
      <tbody className="divide-y divide-gray-50">
        {items.map(item => {
          const sys = item.system_id ? systemMap[item.system_id] : null;
          return (
            <tr key={item.id} className="hover:bg-gray-50 transition-colors group">
              <td className="px-4 py-3">
                <div className="font-medium text-gray-900">{item.product_name || 'Unknown'}</div>
                {item.product_category && <div className="text-xs text-gray-500">{item.product_category}</div>}
              </td>
              <td className="px-4 py-3">
                {sys ? (
                  <div className="flex items-center gap-1.5">
                    <CircleDot className="h-3 w-3 flex-shrink-0" style={{ color: sys.system_types?.color || '#6b7280' }} />
                    <span className="text-xs text-gray-700">{sys.name}</span>
                  </div>
                ) : <span className="text-xs text-gray-400">--</span>}
              </td>
              <td className="px-4 py-3 font-mono text-xs text-gray-600">
                {item.serial_number && <div>{item.serial_number}</div>}
                {item.mac_address && <div className="text-gray-400">{item.mac_address}</div>}
                {!item.serial_number && !item.mac_address && <span className="text-gray-400">--</span>}
              </td>
              <td className="px-4 py-3 text-xs text-gray-600">
                {item.installation_date ? new Date(item.installation_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '--'}
              </td>
              <td className="px-4 py-3 text-xs text-gray-600">
                {item.last_service_date ? new Date(item.last_service_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '--'}
              </td>
              <td className="px-4 py-3">
                <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${item.status === 'active' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
                  {item.status || 'active'}
                </span>
              </td>
              <td className="px-4 py-3 text-right">
                <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button onClick={() => onEdit(item)} className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"><Pencil className="h-3.5 w-3.5" /></button>
                  <button onClick={() => onDelete(item.id)} className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"><Trash2 className="h-3.5 w-3.5" /></button>
                </div>
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}

function RoomModal({ data, mode, saving, onChange, onSave, onClose }: {
  data: typeof emptyRoom; mode: 'add' | 'edit'; saving: boolean;
  onChange: (d: typeof emptyRoom) => void; onSave: () => void; onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h3 className="font-semibold text-gray-900">{mode === 'add' ? 'Add Room' : 'Edit Room'}</h3>
          <button onClick={onClose} className="p-1.5 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition-colors"><X className="h-4 w-4" /></button>
        </div>
        <div className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Room Name *</label>
            <input value={data.name} onChange={e => onChange({ ...data, name: e.target.value })}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500" placeholder="e.g. Master Bedroom" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Floor Level</label>
            <input value={data.floor_level} onChange={e => onChange({ ...data, floor_level: e.target.value })}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500" placeholder="e.g. 2nd Floor" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Room Type</label>
            <select value={data.room_type} onChange={e => onChange({ ...data, room_type: e.target.value })}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500">
              {ROOM_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
            <textarea value={data.notes} onChange={e => onChange({ ...data, notes: e.target.value })} rows={2}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 resize-none" />
          </div>
        </div>
        <div className="flex justify-end gap-3 px-6 py-4 border-t border-gray-100">
          <button onClick={onClose} className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors">Cancel</button>
          <button onClick={onSave} disabled={saving || !data.name.trim()}
            className="px-4 py-2 text-sm font-medium text-white bg-emerald-600 rounded-lg hover:bg-emerald-700 transition-colors disabled:opacity-50">{saving ? 'Saving...' : 'Save'}</button>
        </div>
      </div>
    </div>
  );
}

function EquipmentModal({ data, mode, saving, rooms, systems, onChange, onSave, onClose }: {
  data: typeof emptyEquip; mode: 'add' | 'edit'; saving: boolean;
  rooms: SiteRoom[]; systems: CustomerSystem[];
  onChange: (d: typeof emptyEquip) => void; onSave: () => void; onClose: () => void;
}) {
  const [searchQuery, setSearchQuery] = useState(mode === 'edit' ? data.product_name : '');
  const [searchResults, setSearchResults] = useState<ProductResult[]>([]);
  const [showResults, setShowResults] = useState(false);
  const searchTimeout = useRef<ReturnType<typeof setTimeout>>();
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!searchQuery.trim()) { setSearchResults([]); return; }
    clearTimeout(searchTimeout.current);
    searchTimeout.current = setTimeout(async () => {
      const q = `%${searchQuery}%`;
      const { data: products } = await supabase
        .from('products')
        .select('id, name, manufacturer, model_number, category, image_url')
        .or(`name.ilike.${q},manufacturer.ilike.${q},model_number.ilike.${q}`)
        .limit(10);
      setSearchResults((products as ProductResult[]) || []);
      setShowResults(true);
    }, 300);
    return () => clearTimeout(searchTimeout.current);
  }, [searchQuery]);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) setShowResults(false);
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  function selectProduct(p: ProductResult) {
    const displayName = [p.manufacturer, p.model_number || p.name].filter(Boolean).join(' ');
    onChange({ ...data, product_id: p.id, product_name: displayName, product_category: p.category || '' });
    setSearchQuery(displayName);
    setShowResults(false);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 sticky top-0 bg-white z-10">
          <h3 className="font-semibold text-gray-900">{mode === 'add' ? 'Add Equipment' : 'Edit Equipment'}</h3>
          <button onClick={onClose} className="p-1.5 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition-colors"><X className="h-4 w-4" /></button>
        </div>
        <div className="p-6 space-y-4">
          <div className="relative" ref={dropdownRef}>
            <label className="block text-sm font-medium text-gray-700 mb-1">Product (search catalog or type name)</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input value={searchQuery}
                onChange={e => { setSearchQuery(e.target.value); onChange({ ...data, product_name: e.target.value, product_id: null }); }}
                onFocus={() => searchResults.length > 0 && setShowResults(true)}
                className="w-full border border-gray-300 rounded-lg pl-10 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                placeholder="Search by name, manufacturer, or model..." />
            </div>
            {showResults && searchResults.length > 0 && (
              <div className="absolute z-20 left-0 right-0 mt-1 bg-white border border-gray-200 rounded-xl shadow-lg max-h-60 overflow-y-auto">
                {searchResults.map(p => (
                  <button key={p.id} onClick={() => selectProduct(p)}
                    className="w-full px-4 py-3 flex items-center gap-3 hover:bg-gray-50 transition-colors text-left border-b border-gray-50 last:border-0">
                    <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center flex-shrink-0">
                      {p.image_url ? <img src={p.image_url} alt="" className="w-10 h-10 rounded-lg object-cover" /> : <Package className="h-5 w-5 text-gray-400" />}
                    </div>
                    <div className="min-w-0">
                      <div className="text-sm font-medium text-gray-900 truncate">{p.name}</div>
                      <div className="text-xs text-gray-500">{[p.manufacturer, p.model_number].filter(Boolean).join(' \u00b7 ')} {p.category && `\u00b7 ${p.category}`}</div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {data.product_id && (
            <div className="flex items-center gap-2 px-3 py-2 bg-emerald-50 border border-emerald-200 rounded-lg">
              <Check className="h-4 w-4 text-emerald-600" />
              <span className="text-sm text-emerald-800">Linked to product catalog</span>
              <button onClick={() => { onChange({ ...data, product_id: null }); setSearchQuery(data.product_name); }}
                className="ml-auto text-xs text-emerald-600 hover:text-emerald-800">Clear</button>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Room</label>
              <select value={data.room_id} onChange={e => onChange({ ...data, room_id: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500">
                <option value="">Unassigned</option>
                {rooms.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">System</label>
              <select value={data.system_id} onChange={e => onChange({ ...data, system_id: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500">
                <option value="">None</option>
                {systems.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Serial Number</label>
              <input value={data.serial_number} onChange={e => onChange({ ...data, serial_number: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">MAC Address</label>
              <input value={data.mac_address} onChange={e => onChange({ ...data, mac_address: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Installation Date</label>
              <input type="date" value={data.installation_date} onChange={e => onChange({ ...data, installation_date: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Last Service Date</label>
              <input type="date" value={data.last_service_date} onChange={e => onChange({ ...data, last_service_date: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500" />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
            <select value={data.status} onChange={e => onChange({ ...data, status: e.target.value })}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500">
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
            <textarea value={data.notes} onChange={e => onChange({ ...data, notes: e.target.value })} rows={2}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 resize-none" />
          </div>
        </div>
        <div className="flex justify-end gap-3 px-6 py-4 border-t border-gray-100 sticky bottom-0 bg-white">
          <button onClick={onClose} className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors">Cancel</button>
          <button onClick={onSave} disabled={saving}
            className="px-4 py-2 text-sm font-medium text-white bg-emerald-600 rounded-lg hover:bg-emerald-700 transition-colors disabled:opacity-50">{saving ? 'Saving...' : 'Save'}</button>
        </div>
      </div>
    </div>
  );
}
