import { useState, useEffect, useRef } from 'react';
import {
  Plus, Pencil, Trash2, X, Check, Search, ChevronDown, ChevronRight,
  DoorOpen, Server, Box, Layers, Camera, Image, Package, Cpu,
  Home, Archive, Wrench
} from 'lucide-react';
import { supabase } from '../../lib/supabase';

interface Room {
  id: string;
  site_id: string;
  name: string;
  floor_level: string | null;
  room_type: string | null;
  photo_url: string | null;
  notes: string | null;
  sort_order: number;
}

interface InventoryItem {
  id: string;
  site_id: string;
  room_id: string | null;
  system_id: string | null;
  product_id: string | null;
  product_name: string | null;
  product_category: string | null;
  serial_number: string | null;
  mac_address: string | null;
  installation_date: string | null;
  last_service_date: string | null;
  photo_url: string | null;
  notes: string | null;
  status: string | null;
  location_detail: string | null;
}

interface SystemOption {
  id: string;
  name: string;
}

interface ProductOption {
  id: string;
  name: string;
  manufacturer: string;
  model_number: string;
  category: string;
  image_url: string | null;
}

const ROOM_TYPES = ['Bedroom', 'Bathroom', 'Living Area', 'Kitchen', 'Office', 'Server Room', 'Garage', 'Closet', 'Utility', 'Other'];
const FLOOR_LEVELS = ['Basement', '1st Floor', '2nd Floor', '3rd Floor', 'Attic', 'Roof'];

const roomTypeIcon: Record<string, React.ElementType> = {
  'Server Room': Server,
  Office: Archive,
  Garage: Box,
  Utility: Wrench,
  Closet: DoorOpen,
};

export default function SiteRoomsInventory({ siteId, companyId }: { siteId: string; companyId: string }) {
  const [rooms, setRooms] = useState<Room[]>([]);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [systems, setSystems] = useState<SystemOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedRooms, setExpandedRooms] = useState<Set<string>>(new Set());
  const [showRoomForm, setShowRoomForm] = useState(false);
  const [editingRoom, setEditingRoom] = useState<Room | null>(null);
  const [showEquipForm, setShowEquipForm] = useState<string | null>(null);
  const [editingEquip, setEditingEquip] = useState<InventoryItem | null>(null);

  useEffect(() => { loadAll(); }, [siteId]);

  async function loadAll() {
    const [roomsRes, invRes, sysRes] = await Promise.all([
      supabase.from('site_rooms').select('*').eq('site_id', siteId).order('sort_order'),
      supabase.from('site_inventory').select('*').eq('site_id', siteId).order('product_name'),
      supabase.from('customer_systems').select('id, name').eq('site_id', siteId),
    ]);
    if (roomsRes.data) {
      setRooms(roomsRes.data);
      setExpandedRooms(new Set(roomsRes.data.map((r: Room) => r.id)));
    }
    if (invRes.data) setInventory(invRes.data);
    if (sysRes.data) setSystems(sysRes.data);
    setLoading(false);
  }

  const roomInventory = (roomId: string) => inventory.filter(i => i.room_id === roomId);
  const unassigned = inventory.filter(i => !i.room_id);
  const totalEquipment = inventory.length;

  const toggleRoom = (id: string) => {
    setExpandedRooms(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  async function deleteRoom(roomId: string) {
    await supabase.from('site_inventory').update({ room_id: null }).eq('room_id', roomId);
    await supabase.from('site_rooms').delete().eq('id', roomId);
    loadAll();
  }

  async function deleteEquipment(id: string) {
    await supabase.from('site_inventory').delete().eq('id', id);
    setInventory(prev => prev.filter(i => i.id !== id));
  }

  if (loading) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-8 text-center text-sm text-gray-400">
        Loading rooms and inventory...
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200">
      <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-emerald-50">
            <Layers className="h-5 w-5 text-emerald-600" />
          </div>
          <div>
            <h2 className="font-semibold text-gray-900">Site Inventory</h2>
            <p className="text-xs text-gray-500">
              {rooms.length} room{rooms.length !== 1 ? 's' : ''} &middot; {totalEquipment} piece{totalEquipment !== 1 ? 's' : ''} of equipment
            </p>
          </div>
        </div>
        <button
          onClick={() => { setEditingRoom(null); setShowRoomForm(true); }}
          className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors"
        >
          <Plus className="h-4 w-4" />
          Add Room
        </button>
      </div>

      <div className="p-4 space-y-3">
        {rooms.map(room => {
          const items = roomInventory(room.id);
          const expanded = expandedRooms.has(room.id);
          const RoomIcon = roomTypeIcon[room.room_type || ''] || Home;
          return (
            <div key={room.id} className="border border-gray-200 rounded-xl overflow-hidden">
              <button
                onClick={() => toggleRoom(room.id)}
                className="w-full px-5 py-3.5 flex items-center justify-between hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-emerald-50 text-emerald-600">
                    <RoomIcon className="h-5 w-5" />
                  </div>
                  <div className="text-left">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-gray-900 text-sm">{room.name}</span>
                      {room.floor_level && (
                        <span className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">{room.floor_level}</span>
                      )}
                      {room.room_type && room.room_type !== 'Other' && (
                        <span className="text-xs text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">{room.room_type}</span>
                      )}
                    </div>
                    {room.notes && <p className="text-xs text-gray-400 mt-0.5">{room.notes}</p>}
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  {room.photo_url && (
                    <img src={room.photo_url} alt="" className="h-8 w-8 rounded-lg object-cover border border-gray-200" />
                  )}
                  <span className="text-xs text-gray-500 bg-gray-100 px-2.5 py-1 rounded-full">
                    {items.length} item{items.length !== 1 ? 's' : ''}
                  </span>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={e => { e.stopPropagation(); setEditingRoom(room); setShowRoomForm(true); }}
                      className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </button>
                    <button
                      onClick={e => { e.stopPropagation(); deleteRoom(room.id); }}
                      className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                  {expanded ? <ChevronDown className="h-4 w-4 text-gray-400" /> : <ChevronRight className="h-4 w-4 text-gray-400" />}
                </div>
              </button>

              {expanded && (
                <div className="border-t border-gray-100 px-5 py-4">
                  {items.length === 0 ? (
                    <div className="text-center py-6 border border-dashed border-gray-200 rounded-xl">
                      <Package className="h-6 w-6 text-gray-300 mx-auto mb-2" />
                      <p className="text-xs text-gray-500 mb-2">No equipment in this room</p>
                      <button
                        onClick={() => { setEditingEquip(null); setShowEquipForm(room.id); }}
                        className="text-xs text-blue-600 hover:text-blue-800 font-medium transition-colors"
                      >
                        Add equipment
                      </button>
                    </div>
                  ) : (
                    <>
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="bg-gray-50">
                              <th className="px-3 py-2 text-left text-xs font-semibold text-gray-500">Equipment</th>
                              <th className="px-3 py-2 text-left text-xs font-semibold text-gray-500">Category</th>
                              <th className="px-3 py-2 text-left text-xs font-semibold text-gray-500">Serial / MAC</th>
                              <th className="px-3 py-2 text-left text-xs font-semibold text-gray-500">Installed</th>
                              <th className="px-3 py-2 text-left text-xs font-semibold text-gray-500">Status</th>
                              <th className="px-3 py-2 text-left text-xs font-semibold text-gray-500 w-10"></th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-100">
                            {items.map(item => (
                              <EquipmentRow
                                key={item.id}
                                item={item}
                                onEdit={() => { setEditingEquip(item); setShowEquipForm(room.id); }}
                                onDelete={() => deleteEquipment(item.id)}
                              />
                            ))}
                          </tbody>
                        </table>
                      </div>
                      <button
                        onClick={() => { setEditingEquip(null); setShowEquipForm(room.id); }}
                        className="mt-3 w-full py-2 border border-dashed border-gray-300 rounded-xl text-xs text-gray-500 hover:border-blue-400 hover:text-blue-600 hover:bg-blue-50 transition-colors flex items-center justify-center gap-1.5"
                      >
                        <Plus className="h-3.5 w-3.5" />
                        Add Equipment
                      </button>
                    </>
                  )}
                </div>
              )}
            </div>
          );
        })}

        {/* Unassigned inventory */}
        {unassigned.length > 0 && (
          <div className="border border-amber-200 rounded-xl overflow-hidden bg-amber-50/30">
            <div className="px-5 py-3.5 flex items-center gap-3 border-b border-amber-100">
              <div className="p-2 rounded-lg bg-amber-100 text-amber-600">
                <Package className="h-5 w-5" />
              </div>
              <div>
                <span className="font-semibold text-gray-900 text-sm">Unassigned Equipment</span>
                <p className="text-xs text-gray-500">{unassigned.length} item{unassigned.length !== 1 ? 's' : ''} not assigned to a room</p>
              </div>
            </div>
            <div className="px-5 py-4 overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-amber-50">
                    <th className="px-3 py-2 text-left text-xs font-semibold text-gray-500">Equipment</th>
                    <th className="px-3 py-2 text-left text-xs font-semibold text-gray-500">Category</th>
                    <th className="px-3 py-2 text-left text-xs font-semibold text-gray-500">Serial / MAC</th>
                    <th className="px-3 py-2 text-left text-xs font-semibold text-gray-500">Installed</th>
                    <th className="px-3 py-2 text-left text-xs font-semibold text-gray-500">Status</th>
                    <th className="px-3 py-2 text-left text-xs font-semibold text-gray-500 w-10"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-amber-100">
                  {unassigned.map(item => (
                    <EquipmentRow
                      key={item.id}
                      item={item}
                      onEdit={() => { setEditingEquip(item); setShowEquipForm('__unassigned__'); }}
                      onDelete={() => deleteEquipment(item.id)}
                    />
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {rooms.length === 0 && unassigned.length === 0 && (
          <div className="text-center py-12 border border-dashed border-gray-200 rounded-xl">
            <Home className="h-10 w-10 text-gray-300 mx-auto mb-3" />
            <p className="text-sm text-gray-500 mb-1">No rooms set up for this site</p>
            <p className="text-xs text-gray-400 mb-4">Add rooms to organize the installed equipment</p>
            <button
              onClick={() => { setEditingRoom(null); setShowRoomForm(true); }}
              className="px-4 py-2 text-sm font-medium text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors"
            >
              Add your first room
            </button>
          </div>
        )}
      </div>

      {showRoomForm && (
        <RoomFormModal
          siteId={siteId}
          room={editingRoom}
          onClose={() => setShowRoomForm(false)}
          onSaved={loadAll}
        />
      )}

      {showEquipForm && (
        <EquipmentFormModal
          siteId={siteId}
          companyId={companyId}
          roomId={showEquipForm === '__unassigned__' ? null : showEquipForm}
          rooms={rooms}
          systems={systems}
          item={editingEquip}
          onClose={() => { setShowEquipForm(null); setEditingEquip(null); }}
          onSaved={loadAll}
        />
      )}
    </div>
  );
}

function EquipmentRow({ item, onEdit, onDelete }: {
  item: InventoryItem;
  onEdit: () => void;
  onDelete: () => void;
}) {
  return (
    <tr className="hover:bg-gray-50 group">
      <td className="px-3 py-2.5">
        <div className="flex items-center gap-2">
          {item.photo_url ? (
            <img src={item.photo_url} alt="" className="h-8 w-8 rounded-lg object-cover border border-gray-200 flex-shrink-0" />
          ) : (
            <div className="h-8 w-8 rounded-lg bg-gray-100 flex items-center justify-center flex-shrink-0">
              <Cpu className="h-4 w-4 text-gray-400" />
            </div>
          )}
          <span className="font-medium text-gray-800">{item.product_name || 'Unknown'}</span>
        </div>
      </td>
      <td className="px-3 py-2.5 text-gray-500 text-xs">{item.product_category || '—'}</td>
      <td className="px-3 py-2.5 font-mono text-xs text-gray-500">
        {item.serial_number && <div>{item.serial_number}</div>}
        {item.mac_address && <div className="text-gray-400">{item.mac_address}</div>}
        {!item.serial_number && !item.mac_address && '—'}
      </td>
      <td className="px-3 py-2.5 text-xs text-gray-500">
        {item.installation_date
          ? new Date(item.installation_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
          : '—'}
      </td>
      <td className="px-3 py-2.5">
        <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
          item.status === 'active' ? 'bg-emerald-100 text-emerald-700'
            : item.status === 'inactive' ? 'bg-gray-100 text-gray-500'
            : 'bg-red-100 text-red-700'
        }`}>
          {item.status || 'active'}
        </span>
      </td>
      <td className="px-3 py-2.5">
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button onClick={onEdit} className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors">
            <Pencil className="h-3.5 w-3.5" />
          </button>
          <button onClick={onDelete} className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors">
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      </td>
    </tr>
  );
}

function RoomFormModal({ siteId, room, onClose, onSaved }: {
  siteId: string;
  room: Room | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [form, setForm] = useState({
    name: room?.name || '',
    floor_level: room?.floor_level || '',
    room_type: room?.room_type || 'Other',
    photo_url: room?.photo_url || '',
    notes: room?.notes || '',
  });
  const [saving, setSaving] = useState(false);

  async function save() {
    if (!form.name.trim()) return;
    setSaving(true);
    const payload = {
      site_id: siteId,
      name: form.name.trim(),
      floor_level: form.floor_level || null,
      room_type: form.room_type,
      photo_url: form.photo_url || null,
      notes: form.notes || null,
    };
    if (room) {
      await supabase.from('site_rooms').update(payload).eq('id', room.id);
    } else {
      await supabase.from('site_rooms').insert(payload);
    }
    setSaving(false);
    onSaved();
    onClose();
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md" onClick={e => e.stopPropagation()}>
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <h3 className="font-semibold text-gray-900">{room ? 'Edit Room' : 'Add Room'}</h3>
          <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Room Name *</label>
            <input type="text" value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
              placeholder="e.g. Master Bedroom, Server Room"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" autoFocus />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Floor / Level</label>
              <select value={form.floor_level} onChange={e => setForm(p => ({ ...p, floor_level: e.target.value }))}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 bg-white">
                <option value="">Select...</option>
                {FLOOR_LEVELS.map(f => <option key={f} value={f}>{f}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Room Type</label>
              <select value={form.room_type} onChange={e => setForm(p => ({ ...p, room_type: e.target.value }))}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 bg-white">
                {ROOM_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Photo URL</label>
            <input type="text" value={form.photo_url} onChange={e => setForm(p => ({ ...p, photo_url: e.target.value }))}
              placeholder="https://..."
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
            <textarea value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} rows={2}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 resize-none" />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button onClick={onClose} className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 transition-colors">Cancel</button>
            <button onClick={save} disabled={!form.name.trim() || saving}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors">
              {saving ? 'Saving...' : room ? 'Save Changes' : 'Add Room'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function EquipmentFormModal({ siteId, companyId, roomId, rooms, systems, item, onClose, onSaved }: {
  siteId: string;
  companyId: string;
  roomId: string | null;
  rooms: Room[];
  systems: SystemOption[];
  item: InventoryItem | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [form, setForm] = useState({
    product_name: item?.product_name || '',
    product_category: item?.product_category || '',
    product_id: item?.product_id || null as string | null,
    serial_number: item?.serial_number || '',
    mac_address: item?.mac_address || '',
    system_id: item?.system_id || '',
    room_id: roomId || item?.room_id || '',
    installation_date: item?.installation_date || '',
    last_service_date: item?.last_service_date || '',
    photo_url: item?.photo_url || '',
    notes: item?.notes || '',
    status: item?.status || 'active',
  });
  const [saving, setSaving] = useState(false);
  const [productSearch, setProductSearch] = useState('');
  const [productResults, setProductResults] = useState<ProductOption[]>([]);
  const [showProductSearch, setShowProductSearch] = useState(false);
  const [searchLoading, setSearchLoading] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);
  const searchTimeout = useRef<ReturnType<typeof setTimeout>>();

  function handleProductSearch(q: string) {
    setProductSearch(q);
    if (q.length < 2) { setProductResults([]); return; }
    clearTimeout(searchTimeout.current);
    searchTimeout.current = setTimeout(async () => {
      setSearchLoading(true);
      const { data } = await supabase
        .from('products')
        .select('id, name, manufacturer, model_number, category, image_url')
        .or(`name.ilike.%${q}%,manufacturer.ilike.%${q}%,model_number.ilike.%${q}%`)
        .eq('is_active', true)
        .limit(10);
      setProductResults((data || []) as ProductOption[]);
      setSearchLoading(false);
    }, 300);
  }

  function selectProduct(p: ProductOption) {
    setForm(prev => ({
      ...prev,
      product_id: p.id,
      product_name: p.name,
      product_category: p.category,
      photo_url: prev.photo_url || p.image_url || '',
    }));
    setShowProductSearch(false);
    setProductSearch('');
  }

  async function save() {
    if (!form.product_name.trim()) return;
    setSaving(true);
    const payload = {
      site_id: siteId,
      company_id: companyId,
      product_id: form.product_id || null,
      product_name: form.product_name.trim(),
      product_category: form.product_category || null,
      serial_number: form.serial_number || null,
      mac_address: form.mac_address || null,
      system_id: form.system_id || null,
      room_id: form.room_id || null,
      installation_date: form.installation_date || null,
      last_service_date: form.last_service_date || null,
      photo_url: form.photo_url || null,
      notes: form.notes || null,
      status: form.status,
    };
    if (item) {
      await supabase.from('site_inventory').update(payload).eq('id', item.id);
    } else {
      await supabase.from('site_inventory').insert(payload);
    }
    setSaving(false);
    onSaved();
    onClose();
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between sticky top-0 bg-white z-10">
          <h3 className="font-semibold text-gray-900">{item ? 'Edit Equipment' : 'Add Equipment'}</h3>
          <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="p-6 space-y-4">
          {/* Product Search */}
          <div ref={searchRef} className="relative">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Product <span className="text-xs text-gray-400 font-normal">(search catalog or type manually)</span>
            </label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search Product Central..."
                value={showProductSearch ? productSearch : ''}
                onFocus={() => setShowProductSearch(true)}
                onChange={e => handleProductSearch(e.target.value)}
                className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
              />
            </div>
            {showProductSearch && (productSearch.length >= 2) && (
              <div className="absolute z-20 top-full mt-1 w-full bg-white border border-gray-200 rounded-xl shadow-xl max-h-60 overflow-y-auto">
                {searchLoading ? (
                  <div className="px-4 py-3 text-sm text-gray-400">Searching...</div>
                ) : productResults.length === 0 ? (
                  <div className="px-4 py-3 text-sm text-gray-500">No products found. You can enter details manually below.</div>
                ) : (
                  productResults.map(p => (
                    <button
                      key={p.id}
                      onClick={() => selectProduct(p)}
                      className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-blue-50 transition-colors text-left"
                    >
                      {p.image_url ? (
                        <img src={p.image_url} alt="" className="h-8 w-8 rounded-lg object-cover border border-gray-200 flex-shrink-0" />
                      ) : (
                        <div className="h-8 w-8 rounded-lg bg-gray-100 flex items-center justify-center flex-shrink-0">
                          <Cpu className="h-4 w-4 text-gray-400" />
                        </div>
                      )}
                      <div className="min-w-0 flex-1">
                        <div className="text-sm font-medium text-gray-800 truncate">{p.name}</div>
                        <div className="text-xs text-gray-500">{p.manufacturer} &middot; {p.model_number} &middot; {p.category}</div>
                      </div>
                    </button>
                  ))
                )}
              </div>
            )}
            {form.product_name && !showProductSearch && (
              <div className="mt-1.5 flex items-center gap-2 px-3 py-2 bg-blue-50 rounded-lg">
                <Cpu className="h-4 w-4 text-blue-500 flex-shrink-0" />
                <span className="text-sm text-blue-800 font-medium">{form.product_name}</span>
                {form.product_category && <span className="text-xs text-blue-500">{form.product_category}</span>}
                <button
                  onClick={() => { setForm(p => ({ ...p, product_name: '', product_category: '', product_id: null })); setShowProductSearch(true); }}
                  className="ml-auto p-1 text-blue-400 hover:text-blue-600 transition-colors"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            )}
          </div>

          {/* Manual product name if no catalog product selected */}
          {!form.product_id && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Product Name *</label>
              <input type="text" value={form.product_name} onChange={e => setForm(p => ({ ...p, product_name: e.target.value }))}
                placeholder="e.g. DMP XR150 Panel"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" />
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Serial Number</label>
              <input type="text" value={form.serial_number} onChange={e => setForm(p => ({ ...p, serial_number: e.target.value }))}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">MAC Address</label>
              <input type="text" value={form.mac_address} onChange={e => setForm(p => ({ ...p, mac_address: e.target.value }))}
                placeholder="AA:BB:CC:DD:EE:FF"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">System</label>
              <select value={form.system_id} onChange={e => setForm(p => ({ ...p, system_id: e.target.value }))}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 bg-white">
                <option value="">None</option>
                {systems.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Room</label>
              <select value={form.room_id} onChange={e => setForm(p => ({ ...p, room_id: e.target.value }))}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 bg-white">
                <option value="">Unassigned</option>
                {rooms.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Installation Date</label>
              <input type="date" value={form.installation_date} onChange={e => setForm(p => ({ ...p, installation_date: e.target.value }))}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Last Service Date</label>
              <input type="date" value={form.last_service_date} onChange={e => setForm(p => ({ ...p, last_service_date: e.target.value }))}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Photo URL</label>
            <input type="text" value={form.photo_url} onChange={e => setForm(p => ({ ...p, photo_url: e.target.value }))}
              placeholder="https://..."
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
            <textarea value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} rows={2}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 resize-none" />
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button onClick={onClose} className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 transition-colors">Cancel</button>
            <button onClick={save} disabled={!form.product_name.trim() || saving}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors">
              {saving ? 'Saving...' : item ? 'Save Changes' : 'Add Equipment'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
