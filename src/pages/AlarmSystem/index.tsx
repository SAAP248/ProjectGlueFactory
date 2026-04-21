import { useState, useEffect } from 'react';
import {
  ArrowLeft, Settings, Home, Users, Lock, Phone, Clock, Camera, FileText,
  ShieldAlert, Flame, ShieldCheck, KeyRound, Network, Tv2, DoorOpen, Shield
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import type {
  CustomerSystem, SystemZone, AlarmEmergencyContact, AlarmCodeWord, AlarmEventHistory
} from '../CustomerProfile/types';
import SystemDetailsTab from './SystemDetailsTab';
import ZonesTab from './ZonesTab';
import EmergencyContactsTab from './EmergencyContactsTab';
import CodeWordsTab from './CodeWordsTab';
import CallHistoryTab from './CallHistoryTab';
import EventHistoryTab from './EventHistoryTab';
import PhotoGallery from '../Photos/PhotoGallery';
import DocumentGallery from '../Documents/DocumentGallery';
import type { AlarmSystemTab } from './types';

interface Props {
  system: CustomerSystem;
  companyName: string;
  accountNumber: string;
  companyStatus: string;
  companyId?: string;
  onBack: () => void;
  onUpdate?: (system: CustomerSystem) => void;
}

const TABS: { id: AlarmSystemTab; label: string; icon: React.ElementType }[] = [
  { id: 'system-details', label: 'System Details', icon: Settings },
  { id: 'zones', label: 'Zones', icon: Home },
  { id: 'emergency-contacts', label: 'Emergency Contacts', icon: Users },
  { id: 'code-words', label: 'Code Words', icon: Lock },
  { id: 'call-history', label: 'Call History', icon: Phone },
  { id: 'history', label: 'History', icon: Clock },
  { id: 'photos', label: 'Photos', icon: Camera },
  { id: 'documents', label: 'Documents', icon: FileText },
];

const systemIconMap: Record<string, React.ElementType> = {
  ShieldAlert, Flame, ShieldCheck, KeyRound, Network, Tv2, DoorOpen, Shield,
};

export default function AlarmSystemDetail({ system: initialSystem, companyName, accountNumber, companyStatus, companyId, onBack, onUpdate }: Props) {
  const [activeTab, setActiveTab] = useState<AlarmSystemTab>('system-details');
  const [system, setSystem] = useState<CustomerSystem>(initialSystem);

  const handleSystemUpdate = (updated: CustomerSystem) => {
    setSystem(updated);
    onUpdate?.(updated);
  };
  const [zones, setZones] = useState<SystemZone[]>([]);
  const [emergencyContacts, setEmergencyContacts] = useState<AlarmEmergencyContact[]>([]);
  const [codeWords, setCodeWords] = useState<AlarmCodeWord[]>([]);
  const [events, setEvents] = useState<AlarmEventHistory[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, [system.id]);

  const loadData = async () => {
    setLoading(true);
    const [zonesRes, contactsRes, codeWordsRes, eventsRes] = await Promise.all([
      supabase.from('system_zones').select('*').eq('system_id', system.id).order('zone_number'),
      supabase.from('alarm_emergency_contacts').select('*').eq('system_id', system.id).order('contact_order'),
      supabase.from('alarm_code_words').select('*').eq('system_id', system.id),
      supabase.from('alarm_event_history').select('*').eq('system_id', system.id).order('event_at', { ascending: false }),
    ]);
    if (zonesRes.data) setZones(zonesRes.data as SystemZone[]);
    if (contactsRes.data) setEmergencyContacts(contactsRes.data as AlarmEmergencyContact[]);
    if (codeWordsRes.data) setCodeWords(codeWordsRes.data as AlarmCodeWord[]);
    if (eventsRes.data) setEvents(eventsRes.data as AlarmEventHistory[]);
    setLoading(false);
  };

  const refreshEvents = async () => {
    const { data } = await supabase
      .from('alarm_event_history')
      .select('*')
      .eq('system_id', system.id)
      .order('event_at', { ascending: false });
    if (data) setEvents(data as AlarmEventHistory[]);
  };

  const IconComp = systemIconMap[system.system_types?.icon_name] || Shield;
  const systemColor = system.system_types?.color || '#2563eb';

  const statusColors: Record<string, string> = {
    active: 'bg-emerald-100 text-emerald-700',
    inactive: 'bg-gray-100 text-gray-600',
    prospect: 'bg-blue-100 text-blue-700',
    suspended: 'bg-red-100 text-red-700',
  };

  return (
    <div className="min-h-full">
      <div className="mb-6">
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-800 transition-colors mb-4 group"
        >
          <ArrowLeft className="h-4 w-4 group-hover:-translate-x-0.5 transition-transform" />
          Back to Sites &amp; Systems
        </button>

        <div className="flex items-start gap-4">
          <div
            className="p-3 rounded-xl flex-shrink-0 mt-0.5"
            style={{ backgroundColor: systemColor + '18' }}
          >
            <IconComp className="h-6 w-6" style={{ color: systemColor }} />
          </div>
          <div>
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-2xl font-bold text-gray-900">{companyName} — {system.name}</h1>
              <span className={`px-3 py-1 rounded-full text-xs font-semibold capitalize ${statusColors[companyStatus] || 'bg-gray-100 text-gray-600'}`}>
                {companyStatus}
              </span>
              {system.is_on_test && (
                <span className="px-3 py-1 rounded-full text-xs font-semibold bg-blue-100 text-blue-700">ON TEST</span>
              )}
              {system.is_out_of_service && (
                <span className="px-3 py-1 rounded-full text-xs font-semibold bg-orange-100 text-orange-700">OUT OF SERVICE</span>
              )}
            </div>
            <p className="text-sm text-gray-500 mt-0.5">
              {accountNumber && <span className="font-medium">{accountNumber}</span>}
              {system.monitoring_account_number && <span className="ml-2 text-gray-400">· CS Account #{system.monitoring_account_number}</span>}
              {system.system_types?.name && (
                <span className="ml-2 text-gray-400">· {system.system_types.name}</span>
              )}
            </p>
          </div>
        </div>
      </div>

      <div className="border-b border-gray-200 mb-6">
        <nav className="flex gap-0 overflow-x-auto">
          {TABS.map(tab => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-3 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
                  isActive
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-800 hover:border-gray-300'
                }`}
              >
                <Icon className="h-4 w-4" />
                {tab.label}
              </button>
            );
          })}
        </nav>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-8 h-8 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin" />
        </div>
      ) : (
        <div>
          {activeTab === 'system-details' && (
            <SystemDetailsTab system={system} onUpdate={handleSystemUpdate} />
          )}
          {activeTab === 'zones' && (
            <ZonesTab systemId={system.id} zones={zones} onZonesChange={setZones} />
          )}
          {activeTab === 'emergency-contacts' && (
            <EmergencyContactsTab systemId={system.id} contacts={emergencyContacts} onContactsChange={setEmergencyContacts} />
          )}
          {activeTab === 'code-words' && (
            <CodeWordsTab systemId={system.id} codeWords={codeWords} onCodeWordsChange={setCodeWords} />
          )}
          {activeTab === 'call-history' && (
            <CallHistoryTab calls={[]} />
          )}
          {activeTab === 'history' && (
            <EventHistoryTab events={events} onRefresh={refreshEvents} />
          )}
          {activeTab === 'photos' && (
            <PhotoGallery
              context={{
                companyId: companyId,
                systemId: system.id,
                companyName,
                systemName: system.name,
              }}
            />
          )}
          {activeTab === 'documents' && (
            <DocumentGallery
              context={{
                companyId: companyId,
                systemId: system.id,
                companyName,
                systemName: system.name,
              }}
            />
          )}
        </div>
      )}
    </div>
  );
}
