import { useState, useEffect } from 'react';
import {
  MapPin, ChevronDown, ChevronRight, ShieldAlert, Flame, ShieldCheck,
  KeyRound, Network, Tv2, DoorOpen, Shield, Plus, ExternalLink, Camera, FileText
} from 'lucide-react';
import type { Site, CustomerSystem, SystemZone, SystemDevice } from './types';
import AlarmSystemDetail from '../AlarmSystem';
import PhotoGallery from '../Photos/PhotoGallery';
import DocumentGallery from '../Documents/DocumentGallery';
import { supabase } from '../../lib/supabase';

interface SitePhotoPreview {
  id: string;
  file_url: string;
}

type SiteView = { type: 'photos'; site: Site } | { type: 'documents'; site: Site };

interface Props {
  companyName: string;
  accountNumber: string;
  companyStatus: string;
  companyId?: string;
  sites: Site[];
  systems: CustomerSystem[];
  zones: SystemZone[];
  devices: SystemDevice[];
}

const systemIconMap: Record<string, React.ElementType> = {
  ShieldAlert, Flame, ShieldCheck, KeyRound, Network, Tv2, DoorOpen, Shield,
};

const ALARM_TYPES = ['Burg', 'Fire', 'Burg & Fire'];

export default function SitesSystemsTab({ companyName, accountNumber, companyStatus, companyId, sites, systems, zones, devices }: Props) {
  const [expandedSites, setExpandedSites] = useState<Set<string>>(new Set(sites.map(s => s.id)));
  const [expandedSystems, setExpandedSystems] = useState<Set<string>>(new Set());
  const [selectedSystem, setSelectedSystem] = useState<CustomerSystem | null>(null);
  const [systemsMap, setSystemsMap] = useState<Record<string, CustomerSystem>>(
    Object.fromEntries(systems.map(s => [s.id, s]))
  );
  const [photoBySite, setPhotoBySite] = useState<Record<string, SitePhotoPreview[]>>({});
  const [docCountBySite, setDocCountBySite] = useState<Record<string, number>>({});
  const [siteView, setSiteView] = useState<SiteView | null>(null);

  useEffect(() => {
    if (sites.length === 0) return;
    const siteIds = sites.map(s => s.id);
    (async () => {
      const [photoRes, docRes] = await Promise.all([
        supabase.from('photos').select('id, file_url, site_id').in('site_id', siteIds).order('taken_at', { ascending: false }),
        supabase.from('documents').select('id, site_id').in('site_id', siteIds),
      ]);
      if (photoRes.data) {
        const map: Record<string, SitePhotoPreview[]> = {};
        for (const p of photoRes.data as any[]) {
          if (!map[p.site_id]) map[p.site_id] = [];
          if (map[p.site_id].length < 4) map[p.site_id].push({ id: p.id, file_url: p.file_url });
        }
        setPhotoBySite(map);
      }
      if (docRes.data) {
        const counts: Record<string, number> = {};
        for (const d of docRes.data as any[]) {
          counts[d.site_id] = (counts[d.site_id] || 0) + 1;
        }
        setDocCountBySite(counts);
      }
    })();
  }, [sites]);

  const toggleSite = (id: string) => {
    setExpandedSites(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const toggleSystem = (id: string) => {
    setExpandedSystems(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const handleSystemUpdate = (updated: CustomerSystem) => {
    setSystemsMap(prev => ({ ...prev, [updated.id]: updated }));
    setSelectedSystem(updated);
  };

  const siteSystems = (siteId: string) => systems.filter(s => s.site_id === siteId).map(s => systemsMap[s.id] || s);
  const systemZones = (systemId: string) => zones.filter(z => z.system_id === systemId);
  const systemDevices = (systemId: string) => devices.filter(d => d.system_id === systemId);

  const hasZones = (systemId: string) => systemZones(systemId).length > 0;
  const hasDevices = (systemId: string) => systemDevices(systemId).length > 0;
  const isAlarmSystem = (typeName: string) => ALARM_TYPES.includes(typeName);

  if (selectedSystem) {
    return (
      <AlarmSystemDetail
        system={systemsMap[selectedSystem.id] || selectedSystem}
        companyName={companyName}
        accountNumber={accountNumber}
        companyStatus={companyStatus}
        companyId={companyId}
        onBack={() => setSelectedSystem(null)}
        onUpdate={handleSystemUpdate}
      />
    );
  }

  if (siteView) {
    const isPhotos = siteView.type === 'photos';
    return (
      <div>
        <button
          onClick={() => setSiteView(null)}
          className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-800 mb-5 transition-colors group"
        >
          <ChevronRight className="h-4 w-4 rotate-180 group-hover:-translate-x-0.5 transition-transform" />
          Back to Sites &amp; Systems
        </button>
        <div className="flex items-center gap-3 mb-5">
          <div className={`p-2.5 rounded-xl ${isPhotos ? 'bg-teal-50' : 'bg-blue-50'}`}>
            {isPhotos ? <MapPin className="h-5 w-5 text-teal-600" /> : <FileText className="h-5 w-5 text-blue-600" />}
          </div>
          <div>
            <h2 className="text-lg font-bold text-gray-900">{siteView.site.name} — {isPhotos ? 'Photos' : 'Documents'}</h2>
            <p className="text-sm text-gray-500">{siteView.site.address}, {siteView.site.city}</p>
          </div>
        </div>
        {isPhotos ? (
          <PhotoGallery
            context={{
              companyId: companyId,
              siteId: siteView.site.id,
              companyName,
              siteName: siteView.site.name,
            }}
          />
        ) : (
          <DocumentGallery
            context={{
              companyId: companyId,
              siteId: siteView.site.id,
              companyName,
              siteName: siteView.site.name,
            }}
          />
        )}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <button className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors">
          <Plus className="h-4 w-4" />
          Add Site
        </button>
      </div>

      {sites.map(site => {
        const siteSystemsList = siteSystems(site.id);
        const expanded = expandedSites.has(site.id);

        return (
          <div key={site.id} className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <button
              onClick={() => toggleSite(site.id)}
              className="w-full px-6 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="bg-teal-50 p-2 rounded-lg">
                  <MapPin className="h-5 w-5 text-teal-600" />
                </div>
                <div className="text-left">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-gray-900">{site.name}</span>
                    <span className={`px-2 py-0.5 text-xs rounded-full capitalize font-medium ${
                      site.site_type === 'commercial' ? 'bg-blue-100 text-blue-700' : 'bg-green-100 text-green-700'
                    }`}>
                      {site.site_type}
                    </span>
                  </div>
                  <p className="text-sm text-gray-500 mt-0.5">
                    {site.address}, {site.city}, {site.state} {site.zip}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                {photoBySite[site.id]?.length > 0 ? (
                  <button
                    onClick={e => { e.stopPropagation(); setSiteView({ type: 'photos', site }); }}
                    className="flex items-center gap-1.5 group/photos"
                    title="View site photos"
                  >
                    <div className="flex -space-x-2">
                      {photoBySite[site.id].slice(0, 3).map((p, idx) => (
                        <img
                          key={p.id}
                          src={p.file_url}
                          alt=""
                          className="w-8 h-8 rounded-full object-cover border-2 border-white group-hover/photos:ring-2 group-hover/photos:ring-blue-400 transition-all"
                          style={{ zIndex: 3 - idx }}
                        />
                      ))}
                    </div>
                    <span className="text-xs text-gray-400 group-hover/photos:text-blue-600 transition-colors font-medium">
                      {photoBySite[site.id].length}+ photos
                    </span>
                  </button>
                ) : (
                  <button
                    onClick={e => { e.stopPropagation(); setSiteView({ type: 'photos', site }); }}
                    className="flex items-center gap-1 text-xs text-gray-400 hover:text-blue-600 transition-colors"
                    title="Add photos"
                  >
                    <Camera className="h-3.5 w-3.5" />
                    Add photos
                  </button>
                )}
                {docCountBySite[site.id] ? (
                  <button
                    onClick={e => { e.stopPropagation(); setSiteView({ type: 'documents', site }); }}
                    className="flex items-center gap-1 text-xs text-gray-400 hover:text-blue-600 transition-colors group/docs"
                    title="View site documents"
                  >
                    <FileText className="h-3.5 w-3.5 group-hover/docs:text-blue-600" />
                    <span className="font-medium group-hover/docs:text-blue-600">{docCountBySite[site.id]} doc{docCountBySite[site.id] !== 1 ? 's' : ''}</span>
                  </button>
                ) : (
                  <button
                    onClick={e => { e.stopPropagation(); setSiteView({ type: 'documents', site }); }}
                    className="flex items-center gap-1 text-xs text-gray-400 hover:text-blue-600 transition-colors"
                    title="Add documents"
                  >
                    <FileText className="h-3.5 w-3.5" />
                    Add docs
                  </button>
                )}
                <span className="text-xs text-gray-500 bg-gray-100 px-2.5 py-1 rounded-full">
                  {siteSystemsList.length} system{siteSystemsList.length !== 1 ? 's' : ''}
                </span>
                {expanded ? <ChevronDown className="h-5 w-5 text-gray-400" /> : <ChevronRight className="h-5 w-5 text-gray-400" />}
              </div>
            </button>

            {expanded && (
              <div className="border-t border-gray-100">
                {site.access_instructions && (
                  <div className="px-6 py-3 bg-amber-50 border-b border-amber-100 text-sm text-amber-800">
                    <span className="font-medium">Access: </span>{site.access_instructions}
                  </div>
                )}

                {site.alarm_code && (
                  <div className="px-6 py-3 bg-gray-50 border-b border-gray-100 text-sm text-gray-600">
                    <span className="font-medium">Alarm Code: </span>
                    <span className="font-mono tracking-widest">{'•'.repeat(site.alarm_code.length)}</span>
                  </div>
                )}

                <div className="p-4 space-y-3">
                  {siteSystemsList.map(system => {
                    const IconComp = systemIconMap[system.system_types?.icon_name] || Shield;
                    const systemExpanded = expandedSystems.has(system.id);
                    const zonesList = systemZones(system.id);
                    const devs = systemDevices(system.id);
                    const isAlarm = isAlarmSystem(system.system_types?.name);
                    const showExpand = !isAlarm && (hasZones(system.id) || hasDevices(system.id));

                    return (
                      <div key={system.id} className={`border rounded-xl overflow-hidden transition-colors ${
                        isAlarm ? 'border-gray-200 hover:border-blue-200' : 'border-gray-200'
                      }`}>
                        <div
                          className={`px-5 py-4 flex items-center justify-between transition-colors ${
                            isAlarm ? 'cursor-pointer hover:bg-blue-50/40' : showExpand ? 'cursor-pointer hover:bg-gray-50' : ''
                          }`}
                          onClick={() => {
                            if (isAlarm) {
                              setSelectedSystem(system);
                            } else if (showExpand) {
                              toggleSystem(system.id);
                            }
                          }}
                        >
                          <div className="flex items-center gap-3">
                            <div
                              className="p-2 rounded-lg flex-shrink-0"
                              style={{ backgroundColor: (system.system_types?.color || '#2563eb') + '20' }}
                            >
                              <IconComp
                                className="h-5 w-5"
                                style={{ color: system.system_types?.color || '#2563eb' }}
                              />
                            </div>
                            <div>
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="font-semibold text-gray-900 text-sm">{system.name}</span>
                                <span className={`px-2 py-0.5 text-xs rounded-full font-medium ${
                                  system.status === 'active' ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-500'
                                }`}>
                                  {system.status}
                                </span>
                                {system.is_on_test && (
                                  <span className="px-2 py-0.5 text-xs rounded-full font-medium bg-blue-100 text-blue-700">On Test</span>
                                )}
                                {system.is_out_of_service && (
                                  <span className="px-2 py-0.5 text-xs rounded-full font-medium bg-orange-100 text-orange-700">Out of Service</span>
                                )}
                              </div>
                              <div className="flex items-center gap-3 mt-1">
                                {(system.panel_make || system.panel_type) && (
                                  <span className="text-xs text-gray-500">
                                    {system.panel_type || `${system.panel_make} ${system.panel_model}`}
                                  </span>
                                )}
                                {system.monitoring_account_number && (
                                  <span className="text-xs text-gray-400 font-mono">#{system.monitoring_account_number}</span>
                                )}
                                {system.installation_date && (
                                  <span className="text-xs text-gray-400">
                                    Installed {new Date(system.installation_date).toLocaleDateString('en-US', { year: 'numeric', month: 'short' })}
                                  </span>
                                )}
                                {isAlarm && system.cs_name && (
                                  <span className="text-xs text-gray-400">CS: {system.cs_name}</span>
                                )}
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-3">
                            {hasZones(system.id) && (
                              <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">
                                {zonesList.length} zones
                              </span>
                            )}
                            {hasDevices(system.id) && (
                              <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">
                                {devs.length} devices
                              </span>
                            )}
                            {isAlarm && (
                              <ExternalLink className="h-4 w-4 text-blue-400" />
                            )}
                            {showExpand && (
                              systemExpanded
                                ? <ChevronDown className="h-4 w-4 text-gray-400" />
                                : <ChevronRight className="h-4 w-4 text-gray-400" />
                            )}
                          </div>
                        </div>

                        {systemExpanded && !isAlarm && (
                          <div className="border-t border-gray-100">
                            {zonesList.length > 0 && (
                              <div className="px-5 py-4">
                                <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Zones</h4>
                                <div className="overflow-x-auto">
                                  <table className="w-full text-sm">
                                    <thead>
                                      <tr className="bg-gray-50">
                                        <th className="px-3 py-2 text-left text-xs font-semibold text-gray-500">#</th>
                                        <th className="px-3 py-2 text-left text-xs font-semibold text-gray-500">Zone Name</th>
                                        <th className="px-3 py-2 text-left text-xs font-semibold text-gray-500">Type</th>
                                        <th className="px-3 py-2 text-left text-xs font-semibold text-gray-500">Bypass</th>
                                      </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100">
                                      {zonesList.map(zone => (
                                        <tr key={zone.id} className="hover:bg-gray-50">
                                          <td className="px-3 py-2 font-mono text-gray-600 text-xs">{String(zone.zone_number).padStart(2, '0')}</td>
                                          <td className="px-3 py-2 font-medium text-gray-800">{zone.zone_name}</td>
                                          <td className="px-3 py-2 text-gray-500">{zone.zone_type}</td>
                                          <td className="px-3 py-2">
                                            {zone.bypass_status
                                              ? <span className="text-amber-600 text-xs font-medium">Bypassed</span>
                                              : <span className="text-emerald-600 text-xs font-medium">Active</span>}
                                          </td>
                                        </tr>
                                      ))}
                                    </tbody>
                                  </table>
                                </div>
                              </div>
                            )}

                            {devs.length > 0 && (
                              <div className="px-5 py-4 border-t border-gray-100">
                                <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Devices</h4>
                                <div className="overflow-x-auto">
                                  <table className="w-full text-sm">
                                    <thead>
                                      <tr className="bg-gray-50">
                                        <th className="px-3 py-2 text-left text-xs font-semibold text-gray-500">Device</th>
                                        <th className="px-3 py-2 text-left text-xs font-semibold text-gray-500">Type</th>
                                        <th className="px-3 py-2 text-left text-xs font-semibold text-gray-500">Make / Model</th>
                                        <th className="px-3 py-2 text-left text-xs font-semibold text-gray-500">Serial / IP</th>
                                        <th className="px-3 py-2 text-left text-xs font-semibold text-gray-500">Location</th>
                                        <th className="px-3 py-2 text-left text-xs font-semibold text-gray-500">Status</th>
                                      </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100">
                                      {devs.map(dev => (
                                        <tr key={dev.id} className="hover:bg-gray-50">
                                          <td className="px-3 py-2 font-medium text-gray-800">{dev.device_name}</td>
                                          <td className="px-3 py-2 text-gray-500">{dev.device_type}</td>
                                          <td className="px-3 py-2 text-gray-600">{[dev.make, dev.model].filter(Boolean).join(' ')}</td>
                                          <td className="px-3 py-2 font-mono text-xs text-gray-500">
                                            {dev.serial_number && <div>{dev.serial_number}</div>}
                                            {dev.ip_address && <div className="text-blue-600">{dev.ip_address}</div>}
                                            {dev.mac_address && <div className="text-gray-400">{dev.mac_address}</div>}
                                          </td>
                                          <td className="px-3 py-2 text-gray-500 text-xs">{dev.location || '—'}</td>
                                          <td className="px-3 py-2">
                                            <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                                              dev.status === 'active' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'
                                            }`}>
                                              {dev.status}
                                            </span>
                                          </td>
                                        </tr>
                                      ))}
                                    </tbody>
                                  </table>
                                </div>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}

                  {siteSystemsList.length === 0 && (
                    <div className="text-center py-8 text-sm text-gray-400">No systems at this site</div>
                  )}

                  <button className="w-full py-2.5 border border-dashed border-gray-300 rounded-xl text-sm text-gray-500 hover:border-blue-400 hover:text-blue-600 hover:bg-blue-50 transition-colors flex items-center justify-center gap-2">
                    <Plus className="h-4 w-4" />
                    Add System
                  </button>
                </div>
              </div>
            )}
          </div>
        );
      })}

      {sites.length === 0 && (
        <div className="bg-white rounded-xl border border-dashed border-gray-300 py-16 text-center">
          <MapPin className="h-10 w-10 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500">No sites found for this customer</p>
        </div>
      )}
    </div>
  );
}
