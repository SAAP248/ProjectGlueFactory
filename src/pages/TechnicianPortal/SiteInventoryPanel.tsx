import { useEffect, useState } from 'react';
import { Package, MapPin, Calendar, ChevronDown, ChevronUp } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import type { SiteInventoryItem } from './types';

interface Props {
  siteId: string | null;
  systemId: string | null;
}

export default function SiteInventoryPanel({ siteId, systemId }: Props) {
  const [items, setItems] = useState<SiteInventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(true);

  useEffect(() => {
    if (!siteId) { setLoading(false); return; }
    (async () => {
      let q = supabase
        .from('site_inventory')
        .select('id, product_name, product_category, serial_number, mac_address, imei, firmware_version, location_detail, zone_location, installation_date, warranty_expiration, status, system_id, notes')
        .eq('site_id', siteId)
        .order('installation_date', { ascending: false });
      const { data } = await q;
      setItems((data as SiteInventoryItem[]) || []);
      setLoading(false);
    })();
  }, [siteId]);

  if (!siteId) return null;

  const preferred = systemId ? items.filter(i => i.system_id === systemId) : [];
  const other = systemId ? items.filter(i => i.system_id !== systemId) : items;
  const ordered = [...preferred, ...other];

  return (
    <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
      <button
        onClick={() => setOpen(v => !v)}
        className="w-full px-4 py-3 flex items-center gap-3 hover:bg-gray-50 transition-colors"
      >
        <div className="w-9 h-9 rounded-xl bg-blue-50 flex items-center justify-center">
          <Package className="h-4 w-4 text-blue-600" />
        </div>
        <div className="flex-1 text-left">
          <p className="text-sm font-bold text-gray-900">Site Inventory</p>
          <p className="text-[11px] text-gray-500">Equipment installed on-site{preferred.length > 0 ? ` · ${preferred.length} on this system` : ''}</p>
        </div>
        <span className="text-[10px] font-bold text-gray-500 bg-gray-100 rounded-full px-2 py-0.5">{items.length}</span>
        {open ? <ChevronUp className="h-4 w-4 text-gray-400" /> : <ChevronDown className="h-4 w-4 text-gray-400" />}
      </button>
      {open && (
        <div className="px-4 pb-4 pt-1 space-y-2 border-t border-gray-100">
          {loading ? (
            <p className="text-xs text-gray-400 py-2">Loading...</p>
          ) : ordered.length === 0 ? (
            <p className="text-xs text-gray-400 py-2 italic">No inventory recorded for this site yet.</p>
          ) : (
            ordered.map(item => (
              <div
                key={item.id}
                className={`rounded-xl border p-3 ${
                  systemId && item.system_id === systemId
                    ? 'border-blue-200 bg-blue-50/40'
                    : 'border-gray-200 bg-white'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-900 leading-tight">{item.product_name || 'Unnamed Product'}</p>
                    {item.product_category && (
                      <p className="text-[11px] text-gray-500 mt-0.5">{item.product_category}</p>
                    )}
                  </div>
                  {systemId && item.system_id === systemId && (
                    <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-blue-600 text-white flex-shrink-0">THIS SYSTEM</span>
                  )}
                </div>
                <div className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1 text-[11px]">
                  {item.serial_number && (
                    <div><span className="text-gray-400">S/N:</span> <span className="font-mono text-gray-800">{item.serial_number}</span></div>
                  )}
                  {item.mac_address && (
                    <div><span className="text-gray-400">MAC:</span> <span className="font-mono text-gray-800">{item.mac_address}</span></div>
                  )}
                  {item.imei && (
                    <div><span className="text-gray-400">IMEI:</span> <span className="font-mono text-gray-800">{item.imei}</span></div>
                  )}
                  {item.firmware_version && (
                    <div><span className="text-gray-400">FW:</span> <span className="font-mono text-gray-800">{item.firmware_version}</span></div>
                  )}
                </div>
                {(item.location_detail || item.zone_location) && (
                  <div className="mt-1.5 flex items-center gap-1 text-[11px] text-gray-600">
                    <MapPin className="h-3 w-3 text-gray-400" />
                    {item.location_detail || item.zone_location}
                  </div>
                )}
                {item.installation_date && (
                  <div className="mt-0.5 flex items-center gap-1 text-[11px] text-gray-500">
                    <Calendar className="h-3 w-3 text-gray-400" />
                    Installed {new Date(item.installation_date).toLocaleDateString()}
                    {item.warranty_expiration && ` · Warranty until ${new Date(item.warranty_expiration).toLocaleDateString()}`}
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
