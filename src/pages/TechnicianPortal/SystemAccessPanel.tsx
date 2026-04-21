import { useEffect, useState } from 'react';
import {
  ShieldAlert, Flame, KeyRound, Network, Tv2, DoorOpen, Shield,
  Radio, Phone, Users, Lock, Activity, ChevronDown, ChevronUp
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import type { TechWO, SystemAccessData } from './types';

const iconMap: Record<string, React.ElementType> = {
  ShieldAlert, Flame, KeyRound, Network, Tv2, DoorOpen, Shield,
};

interface Props {
  job: TechWO;
}

export default function SystemAccessPanel({ job }: Props) {
  const [data, setData] = useState<SystemAccessData>({ zones: [], contacts: [], passcodes: [], events: [] });
  const [loading, setLoading] = useState(true);
  const [openSection, setOpenSection] = useState<string | null>('zones');

  const system = job.customer_systems;
  const typeName = system?.system_types?.name || '';
  const isAlarm = ['Burg', 'Fire', 'Burg & Fire'].includes(typeName);
  const isNetwork = typeName === 'Networking';
  const isAccess = typeName === 'Access Control';

  useEffect(() => {
    if (!job.system_id) { setLoading(false); return; }
    (async () => {
      setLoading(true);
      const [zonesRes, contactsRes, passRes, eventsRes] = await Promise.all([
        supabase.from('system_zones').select('id, zone_number, zone_name, zone_type, bypass_status, area').eq('system_id', job.system_id).order('zone_number'),
        supabase.from('alarm_emergency_contacts').select('id, contact_order, first_name, last_name, phone, relation, has_key, access_level').eq('system_id', job.system_id).order('contact_order'),
        supabase.from('alarm_code_words').select('id, passcode, authority, is_duress').eq('system_id', job.system_id),
        supabase.from('alarm_event_history').select('id, zone_name, signal_code, description, event_at').eq('system_id', job.system_id).order('event_at', { ascending: false }).limit(20),
      ]);
      setData({
        zones: zonesRes.data || [],
        contacts: contactsRes.data || [],
        passcodes: passRes.data || [],
        events: eventsRes.data || [],
      });
      setLoading(false);
    })();
  }, [job.system_id]);

  if (!system) return null;

  const IconComp = system.system_types?.icon_name ? (iconMap[system.system_types.icon_name] || Shield) : Shield;
  const color = system.system_types?.color || '#2563eb';

  function toggle(key: string) {
    setOpenSection(openSection === key ? null : key);
  }

  return (
    <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 border-b border-gray-100 flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ backgroundColor: color + '1A' }}>
          <IconComp className="h-5 w-5" style={{ color }} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">{typeName || 'System'}</p>
          <p className="text-sm font-bold text-gray-900 truncate">{system.name}</p>
        </div>
        <div className="flex gap-1.5 flex-shrink-0">
          {system.is_on_test && (
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-700">ON TEST</span>
          )}
          {system.is_out_of_service && (
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-red-100 text-red-700">OOS</span>
          )}
        </div>
      </div>

      {/* Panel/Account Info */}
      <div className="px-4 py-3 grid grid-cols-2 gap-x-4 gap-y-2 bg-gray-50 border-b border-gray-100">
        {system.panel_make && (
          <div>
            <p className="text-[10px] font-semibold text-gray-400 uppercase">Panel</p>
            <p className="text-xs font-medium text-gray-900">{system.panel_make} {system.panel_model}</p>
          </div>
        )}
        {system.monitoring_account_number && (
          <div>
            <p className="text-[10px] font-semibold text-gray-400 uppercase">Account #</p>
            <p className="text-xs font-medium text-gray-900 font-mono">{system.monitoring_account_number}</p>
          </div>
        )}
        {system.cs_name && (
          <div>
            <p className="text-[10px] font-semibold text-gray-400 uppercase">Central Station</p>
            <p className="text-xs font-medium text-gray-900">{system.cs_name}</p>
          </div>
        )}
        {system.cs_number && (
          <div>
            <p className="text-[10px] font-semibold text-gray-400 uppercase">CS Phone</p>
            <p className="text-xs font-medium text-gray-900 font-mono">{system.cs_number}</p>
          </div>
        )}
        {system.comm_partner_name && (
          <div>
            <p className="text-[10px] font-semibold text-gray-400 uppercase">Comm Partner</p>
            <p className="text-xs font-medium text-gray-900">{system.comm_partner_name}</p>
          </div>
        )}
        {system.comm_account_id && (
          <div>
            <p className="text-[10px] font-semibold text-gray-400 uppercase">Comm Account</p>
            <p className="text-xs font-medium text-gray-900 font-mono">{system.comm_account_id}</p>
          </div>
        )}
      </div>

      {loading && (
        <div className="p-4 text-xs text-gray-400 text-center">Loading system data...</div>
      )}

      {!loading && (isAlarm || isAccess) && (
        <>
          <CollapsibleSection
            icon={Radio}
            title="Zones"
            count={data.zones.length}
            isOpen={openSection === 'zones'}
            onToggle={() => toggle('zones')}
          >
            {data.zones.length === 0 ? (
              <p className="text-xs text-gray-400 py-2">No zones defined.</p>
            ) : (
              <div className="space-y-1">
                {data.zones.map(z => (
                  <div key={z.id} className="flex items-center gap-2 py-1.5 text-xs">
                    <span className="font-mono font-bold text-gray-400 w-6 text-right">{z.zone_number}</span>
                    <span className="flex-1 font-medium text-gray-900">{z.zone_name || '—'}</span>
                    {z.area && <span className="text-gray-500">{z.area}</span>}
                    {z.zone_type && <span className="px-1.5 py-0.5 rounded bg-gray-100 text-gray-600 capitalize">{z.zone_type}</span>}
                    {z.bypass_status && <span className="px-1.5 py-0.5 rounded bg-amber-100 text-amber-700 font-semibold">BYP</span>}
                  </div>
                ))}
              </div>
            )}
          </CollapsibleSection>

          <CollapsibleSection
            icon={Users}
            title="Emergency Contacts"
            count={data.contacts.length}
            isOpen={openSection === 'contacts'}
            onToggle={() => toggle('contacts')}
          >
            {data.contacts.length === 0 ? (
              <p className="text-xs text-gray-400 py-2">No emergency contacts.</p>
            ) : (
              <div className="space-y-2">
                {data.contacts.map(c => (
                  <div key={c.id} className="flex items-center gap-2 py-1">
                    <span className="w-6 h-6 rounded-full bg-blue-100 text-blue-700 text-[10px] font-bold flex items-center justify-center flex-shrink-0">{c.contact_order}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-gray-900 truncate">{c.first_name} {c.last_name}</p>
                      <p className="text-[11px] text-gray-500">{c.relation || '—'} · {c.access_level || 'Contact'}</p>
                    </div>
                    <a href={`tel:${c.phone}`} className="flex items-center gap-1 text-xs font-medium text-blue-600 hover:text-blue-800">
                      <Phone className="h-3 w-3" /> {c.phone}
                    </a>
                    {c.has_key && <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-700 font-semibold">KEY</span>}
                  </div>
                ))}
              </div>
            )}
          </CollapsibleSection>

          <CollapsibleSection
            icon={Lock}
            title="Passcodes"
            count={data.passcodes.length}
            isOpen={openSection === 'passcodes'}
            onToggle={() => toggle('passcodes')}
          >
            {data.passcodes.length === 0 ? (
              <p className="text-xs text-gray-400 py-2">No passcodes.</p>
            ) : (
              <div className="space-y-1">
                {data.passcodes.map(p => (
                  <div key={p.id} className="flex items-center gap-3 py-1.5 text-xs">
                    <span className="font-mono font-bold text-gray-900 bg-gray-100 px-2 py-0.5 rounded tracking-widest">{p.passcode}</span>
                    <span className="flex-1 text-gray-700">{p.authority || '—'}</span>
                    {p.is_duress && <span className="px-1.5 py-0.5 rounded bg-red-100 text-red-700 font-bold text-[10px]">DURESS</span>}
                  </div>
                ))}
              </div>
            )}
          </CollapsibleSection>

          <CollapsibleSection
            icon={Activity}
            title="Recent Events"
            count={data.events.length}
            isOpen={openSection === 'events'}
            onToggle={() => toggle('events')}
          >
            {data.events.length === 0 ? (
              <p className="text-xs text-gray-400 py-2">No recent events.</p>
            ) : (
              <div className="space-y-1.5 max-h-64 overflow-y-auto">
                {data.events.map(ev => (
                  <div key={ev.id} className="flex items-start gap-2 py-1 text-xs border-b border-gray-50 last:border-0">
                    <span className="font-mono text-gray-400 w-20 flex-shrink-0">{new Date(ev.event_at).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}</span>
                    <span className="flex-1">
                      <span className="font-semibold text-gray-900">{ev.signal_code || '—'}</span>
                      {ev.zone_name && <span className="text-gray-500"> · {ev.zone_name}</span>}
                      <p className="text-gray-600 text-[11px]">{ev.description}</p>
                    </span>
                  </div>
                ))}
              </div>
            )}
          </CollapsibleSection>
        </>
      )}

      {!loading && isNetwork && (
        <div className="px-4 py-3 text-xs text-gray-500">
          Networking system. See <span className="font-semibold text-gray-700">Site Inventory</span> below for installed switches, gateways, APs, MACs and IMEIs.
        </div>
      )}
    </div>
  );
}

function CollapsibleSection({
  icon: Icon,
  title,
  count,
  isOpen,
  onToggle,
  children,
}: {
  icon: React.ElementType;
  title: string;
  count: number;
  isOpen: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="border-b border-gray-100 last:border-0">
      <button
        onClick={onToggle}
        className="w-full px-4 py-2.5 flex items-center gap-2 hover:bg-gray-50 transition-colors"
      >
        <Icon className="h-4 w-4 text-gray-400" />
        <span className="text-sm font-semibold text-gray-700 flex-1 text-left">{title}</span>
        <span className="text-[10px] font-bold text-gray-500 bg-gray-100 rounded-full px-2 py-0.5">{count}</span>
        {isOpen ? <ChevronUp className="h-4 w-4 text-gray-400" /> : <ChevronDown className="h-4 w-4 text-gray-400" />}
      </button>
      {isOpen && <div className="px-4 pb-3">{children}</div>}
    </div>
  );
}
