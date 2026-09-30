import { useState, useEffect, useCallback } from 'react';
import {
  Shield, Cpu, Radio, Wifi, MapPin, Calendar, CheckCircle, XCircle,
  AlertTriangle, ToggleLeft, ToggleRight, Package, ChevronDown, ChevronRight,
  Phone, Key, Lock, Eye
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import type { CustomerSystem, SystemZone, AlarmEmergencyContact } from '../CustomerProfile/types';
import type { SiteRoom, SiteInventoryItem } from '../CustomerProfile/SiteOverview';
import ZonesTab from '../AlarmSystem/ZonesTab';
import EmergencyContactsTab from '../AlarmSystem/EmergencyContactsTab';

interface Props {
  workOrder: any;
}

type AlarmSubTab = 'details' | 'zones' | 'contacts';

function formatDate(d: string | null): string {
  if (!d) return '—';
  return new Date(d + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export default function WorkOrderSystemsTab({ workOrder: wo }: Props) {
  const [system, setSystem] = useState<CustomerSystem | null>(null);
  const [allSiteSystems, setAllSiteSystems] = useState<CustomerSystem[]>([]);
  const [zones, setZones] = useState<SystemZone[]>([]);
  const [emergencyContacts, setEmergencyContacts] = useState<AlarmEmergencyContact[]>([]);
  const [rooms, setRooms] = useState<SiteRoom[]>([]);
  const [inventory, setInventory] = useState<SiteInventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [alarmSubTab, setAlarmSubTab] = useState<AlarmSubTab>('details');
  const [togglingTest, setTogglingTest] = useState(false);
  const [showInventory, setShowInventory] = useState(false);

  const siteId = wo.site_id;
  const systemId = wo.system_id;
  const companyId = wo.company_id;

  const loadData = useCallback(async () => {
    setLoading(true);
    const promises: Promise<any>[] = [];

    if (systemId) {
      promises.push(
        supabase
          .from('customer_systems')
          .select('*, system_types(name, icon_name, color)')
          .eq('id', systemId)
          .maybeSingle()
          .then(r => { if (r.data) setSystem(r.data as CustomerSystem); }),
        supabase
          .from('system_zones')
          .select('*')
          .eq('system_id', systemId)
          .order('zone_number')
          .then(r => setZones((r.data || []) as SystemZone[])),
        supabase
          .from('alarm_emergency_contacts')
          .select('*')
          .eq('system_id', systemId)
          .order('contact_order')
          .then(r => setEmergencyContacts((r.data || []) as AlarmEmergencyContact[])),
      );
    }

    if (siteId) {
      promises.push(
        supabase
          .from('customer_systems')
          .select('*, system_types(name, icon_name, color)')
          .eq('site_id', siteId)
          .order('name')
          .then(r => setAllSiteSystems((r.data || []) as CustomerSystem[])),
        supabase
          .from('site_rooms')
          .select('*')
          .eq('site_id', siteId)
          .order('sort_order')
          .then(r => setRooms((r.data || []) as SiteRoom[])),
        supabase
          .from('site_inventory')
          .select('*')
          .eq('site_id', siteId)
          .order('product_name')
          .then(r => setInventory((r.data || []) as SiteInventoryItem[])),
      );
    }

    await Promise.all(promises);
    setLoading(false);
  }, [systemId, siteId]);

  useEffect(() => { loadData(); }, [loadData]);

  async function toggleOnTest() {
    if (!system) return;
    setTogglingTest(true);
    const newVal = !system.is_on_test;
    await supabase
      .from('customer_systems')
      .update({ is_on_test: newVal })
      .eq('id', system.id);
    setSystem(prev => prev ? { ...prev, is_on_test: newVal } : prev);
    setTogglingTest(false);
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="animate-spin rounded-full h-6 w-6 border-2 border-blue-600 border-t-transparent" />
      </div>
    );
  }

  if (!systemId && !siteId) {
    return (
      <div className="text-center py-16">
        <Shield className="h-12 w-12 text-gray-300 mx-auto mb-3" />
        <p className="text-gray-500 font-medium">No system or site linked</p>
        <p className="text-sm text-gray-400 mt-1">Link a system or site to this work order to see details here</p>
      </div>
    );
  }

  const isAlarm = system?.system_types?.name?.toLowerCase().includes('alarm') ||
    system?.system_types?.name?.toLowerCase().includes('security') ||
    system?.system_types?.name?.toLowerCase().includes('fire') ||
    system?.panel_make || system?.panel_model || zones.length > 0;

  const otherSystems = allSiteSystems.filter(s => s.id !== systemId);

  return (
    <div className="space-y-6 max-w-5xl">
      {/* Linked System */}
      {system && (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center"
                style={{ backgroundColor: (system.system_types?.color || '#6b7280') + '20' }}
              >
                <Shield className="h-5 w-5" style={{ color: system.system_types?.color || '#6b7280' }} />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-gray-900">{system.name}</h3>
                <p className="text-xs text-gray-500">
                  {system.system_types?.name || 'System'}
                  {system.status && ` \u00b7 ${system.status}`}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              {system.is_out_of_service && (
                <span className="flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-red-700 bg-red-100 rounded-full">
                  <XCircle className="h-3 w-3" /> Out of Service
                </span>
              )}
              {isAlarm && (
                <button
                  onClick={toggleOnTest}
                  disabled={togglingTest}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-semibold transition-all border-2 ${
                    system.is_on_test
                      ? 'border-amber-400 bg-amber-50 text-amber-700'
                      : 'border-gray-200 bg-gray-50 text-gray-600 hover:border-gray-300'
                  }`}
                >
                  {system.is_on_test
                    ? <><ToggleRight className="h-5 w-5" /> On Test</>
                    : <><ToggleLeft className="h-5 w-5" /> Place on Test</>
                  }
                </button>
              )}
            </div>
          </div>

          {/* System Details Grid */}
          <div className="p-6">
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {system.panel_make && (
                <DetailItem icon={Cpu} label="Panel Make" value={system.panel_make} />
              )}
              {system.panel_model && (
                <DetailItem icon={Cpu} label="Panel Model" value={system.panel_model} />
              )}
              {system.monitoring_account_number && (
                <DetailItem icon={Eye} label="Monitoring Acct #" value={system.monitoring_account_number} />
              )}
              {system.cs_number && (
                <DetailItem icon={Radio} label="CS Number" value={system.cs_number} />
              )}
              {system.comm_account_id && (
                <DetailItem icon={Wifi} label="Comm Account" value={system.comm_account_id} />
              )}
              {system.installation_date && (
                <DetailItem icon={Calendar} label="Installed" value={formatDate(system.installation_date)} />
              )}
              {system.panel_location && (
                <DetailItem icon={MapPin} label="Panel Location" value={system.panel_location} />
              )}
              {system.transformer_location && (
                <DetailItem icon={MapPin} label="Transformer" value={system.transformer_location} />
              )}
              {system.installer_code && (
                <DetailItem icon={Lock} label="Installer Code" value={system.installer_code} />
              )}
              {system.permit_number && (
                <DetailItem icon={Shield} label="Permit #" value={system.permit_number} />
              )}
              {system.panel_battery_date && (
                <DetailItem icon={Calendar} label="Battery Date" value={formatDate(system.panel_battery_date)} />
              )}
              {system.warranty_information && (
                <DetailItem icon={Shield} label="Warranty" value={system.warranty_information} />
              )}
            </div>

            {system.notes && (
              <div className="mt-4 p-3 bg-gray-50 rounded-lg border border-gray-100">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">System Notes</p>
                <p className="text-sm text-gray-700">{system.notes}</p>
              </div>
            )}
          </div>

          {/* Alarm Sub-tabs */}
          {isAlarm && (
            <>
              <div className="px-6 border-t border-gray-100">
                <div className="flex gap-4">
                  {([
                    { id: 'zones' as const, label: `Zones (${zones.length})` },
                    { id: 'contacts' as const, label: `Emergency Contacts (${emergencyContacts.length})` },
                  ]).map(tab => (
                    <button
                      key={tab.id}
                      onClick={() => setAlarmSubTab(tab.id)}
                      className={`py-3 text-xs font-semibold uppercase tracking-wide border-b-2 transition-colors ${
                        alarmSubTab === tab.id
                          ? 'border-blue-600 text-blue-600'
                          : 'border-transparent text-gray-500 hover:text-gray-700'
                      }`}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>
              </div>
              <div className="p-4">
                {alarmSubTab === 'zones' && (
                  <ZonesTab
                    systemId={system.id}
                    zones={zones}
                    onZonesChange={setZones}
                  />
                )}
                {alarmSubTab === 'contacts' && (
                  <EmergencyContactsTab
                    systemId={system.id}
                    contacts={emergencyContacts}
                    onContactsChange={setEmergencyContacts}
                  />
                )}
              </div>
            </>
          )}
        </div>
      )}

      {/* Other Site Systems */}
      {otherSystems.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100">
            <h3 className="text-sm font-semibold text-gray-900">Other Systems at This Site ({otherSystems.length})</h3>
          </div>
          <div className="divide-y divide-gray-100">
            {otherSystems.map(sys => (
              <div key={sys.id} className="px-6 py-3 flex items-center gap-3">
                <div
                  className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                  style={{ backgroundColor: (sys.system_types?.color || '#6b7280') + '20' }}
                >
                  <Shield className="h-4 w-4" style={{ color: sys.system_types?.color || '#6b7280' }} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">{sys.name}</p>
                  <p className="text-xs text-gray-500">
                    {sys.system_types?.name || 'System'}
                    {sys.panel_make && ` \u00b7 ${sys.panel_make}`}
                    {sys.panel_model && ` ${sys.panel_model}`}
                  </p>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  {sys.is_on_test && (
                    <span className="px-2 py-0.5 text-[10px] font-bold text-amber-700 bg-amber-100 rounded-full">ON TEST</span>
                  )}
                  {sys.is_out_of_service && (
                    <span className="px-2 py-0.5 text-[10px] font-bold text-red-700 bg-red-100 rounded-full">OOS</span>
                  )}
                  <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                    sys.status === 'active' ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-500'
                  }`}>
                    {sys.status || 'active'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Site Inventory */}
      {siteId && (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <button
            onClick={() => setShowInventory(!showInventory)}
            className="w-full px-6 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
          >
            <div className="flex items-center gap-3">
              <div className="p-2 bg-emerald-50 rounded-lg">
                <Package className="h-5 w-5 text-emerald-600" />
              </div>
              <div className="text-left">
                <h3 className="text-sm font-semibold text-gray-900">Site Inventory</h3>
                <p className="text-xs text-gray-500">
                  {rooms.length} room{rooms.length !== 1 ? 's' : ''}, {inventory.length} item{inventory.length !== 1 ? 's' : ''}
                </p>
              </div>
            </div>
            {showInventory ? <ChevronDown className="h-5 w-5 text-gray-400" /> : <ChevronRight className="h-5 w-5 text-gray-400" />}
          </button>

          {showInventory && (
            <div className="border-t border-gray-100">
              {inventory.length === 0 && rooms.length === 0 ? (
                <div className="py-10 text-center">
                  <Package className="h-8 w-8 text-gray-300 mx-auto mb-2" />
                  <p className="text-sm text-gray-400">No inventory recorded for this site</p>
                </div>
              ) : (
                <div className="p-4 space-y-3">
                  {rooms.map(room => {
                    const roomInv = inventory.filter(i => i.room_id === room.id);
                    if (roomInv.length === 0) return null;
                    return (
                      <div key={room.id} className="border border-gray-100 rounded-lg overflow-hidden">
                        <div className="px-4 py-2.5 bg-gray-50 flex items-center justify-between">
                          <span className="text-xs font-semibold text-gray-700">{room.name}</span>
                          <span className="text-xs text-gray-400">{roomInv.length} item{roomInv.length !== 1 ? 's' : ''}</span>
                        </div>
                        <table className="w-full text-sm">
                          <tbody className="divide-y divide-gray-50">
                            {roomInv.map(item => (
                              <tr key={item.id} className="hover:bg-gray-50">
                                <td className="px-4 py-2.5 text-gray-900 font-medium">{item.product_name || 'Unknown'}</td>
                                <td className="px-4 py-2.5 text-gray-500 text-xs">{item.product_category || ''}</td>
                                <td className="px-4 py-2.5 text-gray-500 font-mono text-xs">{item.serial_number || '—'}</td>
                                <td className="px-4 py-2.5">
                                  <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                                    item.status === 'active' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'
                                  }`}>
                                    {item.status || 'active'}
                                  </span>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    );
                  })}
                  {(() => {
                    const unassigned = inventory.filter(i => !i.room_id);
                    if (unassigned.length === 0) return null;
                    return (
                      <div className="border border-amber-200 rounded-lg overflow-hidden">
                        <div className="px-4 py-2.5 bg-amber-50 flex items-center gap-2">
                          <AlertTriangle className="h-3.5 w-3.5 text-amber-600" />
                          <span className="text-xs font-semibold text-amber-700">Unassigned Equipment ({unassigned.length})</span>
                        </div>
                        <table className="w-full text-sm">
                          <tbody className="divide-y divide-gray-50">
                            {unassigned.map(item => (
                              <tr key={item.id} className="hover:bg-gray-50">
                                <td className="px-4 py-2.5 text-gray-900 font-medium">{item.product_name || 'Unknown'}</td>
                                <td className="px-4 py-2.5 text-gray-500 text-xs">{item.product_category || ''}</td>
                                <td className="px-4 py-2.5 text-gray-500 font-mono text-xs">{item.serial_number || '—'}</td>
                                <td className="px-4 py-2.5">
                                  <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                                    item.status === 'active' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'
                                  }`}>
                                    {item.status || 'active'}
                                  </span>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    );
                  })()}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function DetailItem({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value: string }) {
  return (
    <div className="flex items-start gap-2.5 p-3 bg-gray-50 rounded-lg">
      <Icon className="h-4 w-4 text-gray-400 mt-0.5 flex-shrink-0" />
      <div className="min-w-0">
        <p className="text-xs text-gray-500">{label}</p>
        <p className="text-sm font-medium text-gray-900 truncate">{value}</p>
      </div>
    </div>
  );
}
