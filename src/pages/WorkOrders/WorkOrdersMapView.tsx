import { useState, useEffect, useMemo, useCallback } from 'react';
import { Calendar, ChevronRight, Clock, MapPin, Wrench, User, AlertCircle, X } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import GoogleMap, { type MapMarker } from '../../components/GoogleMap';

interface WOPin {
  id: string;
  wo_number: string;
  title: string;
  work_order_type: string;
  status: string;
  priority: string;
  scheduled_date: string | null;
  scheduled_time: string | null;
  lat: number;
  lng: number;
  companyName: string;
  siteName: string;
  leadTech: string;
}

const TYPE_COLOR_MAP: Record<string, { color: string; label: string }> = {
  service:      { color: '#0d9488', label: 'Service' },
  service_call: { color: '#0d9488', label: 'Service Call' },
  installation: { color: '#2563eb', label: 'Installation' },
  inspection:   { color: '#7c3aed', label: 'Inspection' },
  maintenance:  { color: '#d97706', label: 'Maintenance' },
  project:      { color: '#4f46e5', label: 'Project' },
  work_order:   { color: '#6b7280', label: 'Work Order' },
};

function normalizeType(t: string): string {
  return t.toLowerCase().replace(/\s+/g, '_');
}

function getTypeColor(raw: string): string {
  return TYPE_COLOR_MAP[normalizeType(raw)]?.color || '#6b7280';
}

function getTypeLabel(raw: string): string {
  return TYPE_COLOR_MAP[normalizeType(raw)]?.label || raw;
}

const DATE_PRESETS = [
  { key: 'all', label: 'All Dates' },
  { key: 'today', label: 'Today' },
  { key: 'week', label: 'This Week' },
  { key: 'month', label: 'This Month' },
  { key: 'custom', label: 'Custom' },
] as const;

interface Props {
  onViewDetail: (id: string) => void;
}

export default function WorkOrdersMapView({ onViewDetail }: Props) {
  const [pins, setPins] = useState<WOPin[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPinId, setSelectedPinId] = useState<string | null>(null);

  const [enabledTypes, setEnabledTypes] = useState<Set<string>>(new Set(Object.keys(TYPE_COLOR_MAP)));
  const [scheduleFilter, setScheduleFilter] = useState<'all' | 'scheduled' | 'unscheduled'>('all');
  const [datePreset, setDatePreset] = useState<string>('all');
  const [customFrom, setCustomFrom] = useState('');
  const [customTo, setCustomTo] = useState('');

  useEffect(() => {
    fetchPins();
  }, []);

  async function fetchPins() {
    setLoading(true);
    const { data } = await supabase
      .from('work_orders')
      .select(`
        id, wo_number, title, work_order_type, status, priority,
        scheduled_date, scheduled_time,
        companies(name),
        sites(name, latitude, longitude),
        work_order_technicians(is_lead, employees(first_name, last_name))
      `)
      .not('status', 'eq', 'cancelled')
      .order('scheduled_date', { ascending: false, nullsFirst: false });

    if (data) {
      const mapped: WOPin[] = [];
      for (const wo of data as any[]) {
        const lat = Number(wo.sites?.latitude);
        const lng = Number(wo.sites?.longitude);
        if (!lat || !lng || !isFinite(lat) || !isFinite(lng)) continue;
        const techs = wo.work_order_technicians || [];
        const lead = techs.find((t: any) => t.is_lead) || techs[0];
        const emp = lead?.employees;
        mapped.push({
          id: wo.id,
          wo_number: wo.wo_number,
          title: wo.title || '',
          work_order_type: normalizeType(wo.work_order_type || 'work_order'),
          status: wo.status,
          priority: wo.priority,
          scheduled_date: wo.scheduled_date,
          scheduled_time: wo.scheduled_time,
          lat,
          lng,
          companyName: wo.companies?.name || 'Unknown',
          siteName: wo.sites?.name || '',
          leadTech: emp ? `${emp.first_name} ${emp.last_name}` : '',
        });
      }
      setPins(mapped);
    }
    setLoading(false);
  }

  const dateBounds = useMemo(() => {
    if (datePreset === 'all') return null;
    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];
    if (datePreset === 'today') return { from: todayStr, to: todayStr };
    if (datePreset === 'week') {
      const start = new Date(now);
      start.setDate(start.getDate() - start.getDay());
      const end = new Date(start);
      end.setDate(end.getDate() + 6);
      return { from: start.toISOString().split('T')[0], to: end.toISOString().split('T')[0] };
    }
    if (datePreset === 'month') {
      const from = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
      const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      return { from, to: end.toISOString().split('T')[0] };
    }
    if (datePreset === 'custom' && customFrom) {
      return { from: customFrom, to: customTo || customFrom };
    }
    return null;
  }, [datePreset, customFrom, customTo]);

  const filteredPins = useMemo(() => {
    return pins.filter(p => {
      if (!enabledTypes.has(p.work_order_type)) return false;
      if (scheduleFilter === 'scheduled' && !p.scheduled_date) return false;
      if (scheduleFilter === 'unscheduled' && p.scheduled_date) return false;
      if (dateBounds && p.scheduled_date) {
        if (p.scheduled_date < dateBounds.from || p.scheduled_date > dateBounds.to) return false;
      }
      if (dateBounds && !p.scheduled_date) return false;
      return true;
    });
  }, [pins, enabledTypes, scheduleFilter, dateBounds]);

  const mapMarkers = useMemo<MapMarker[]>(
    () =>
      filteredPins.map(p => ({
        id: p.id,
        lat: p.lat,
        lng: p.lng,
        color: getTypeColor(p.work_order_type),
        title: `${p.wo_number} - ${p.companyName}`,
      })),
    [filteredPins],
  );

  const handlePinClick = useCallback(
    (id: string) => setSelectedPinId(prev => (prev === id ? null : id)),
    [],
  );

  const selectedPin = selectedPinId ? filteredPins.find(p => p.id === selectedPinId) : null;

  function toggleType(type: string) {
    setEnabledTypes(prev => {
      const next = new Set(prev);
      if (next.has(type)) next.delete(type);
      else next.add(type);
      return next;
    });
  }

  const typesInData = useMemo(() => {
    const set = new Set<string>();
    pins.forEach(p => set.add(p.work_order_type));
    return [...set].sort();
  }, [pins]);

  const STATUS_LABELS: Record<string, string> = {
    unassigned: 'Unassigned', scheduled: 'Scheduled', in_progress: 'In Progress',
    on_hold: 'On Hold', go_back: 'Go-Back', completed: 'Completed',
  };
  const STATUS_DOT: Record<string, string> = {
    unassigned: 'bg-gray-400', scheduled: 'bg-blue-500', in_progress: 'bg-amber-500',
    on_hold: 'bg-orange-400', go_back: 'bg-orange-500', completed: 'bg-emerald-500',
  };
  const PRIORITY_DOT: Record<string, string> = {
    low: 'text-gray-400', normal: 'text-blue-500', high: 'text-orange-500', emergency: 'text-red-600',
  };

  if (loading) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center bg-gray-50">
        <div className="w-10 h-10 border-[3px] border-blue-600 border-t-transparent rounded-full animate-spin mb-4" />
        <p className="text-sm font-medium text-gray-500">Loading map data...</p>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col min-h-0">
      {/* Toolbar */}
      <div className="bg-white border-b border-gray-100 px-5 py-3 flex items-center gap-3 flex-wrap">
        {/* Type toggles */}
        <div className="flex items-center gap-1.5">
          {typesInData.map(type => {
            const active = enabledTypes.has(type);
            const c = getTypeColor(type);
            return (
              <button
                key={type}
                onClick={() => toggleType(type)}
                className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                  active
                    ? 'border-gray-300 bg-white text-gray-800 shadow-sm'
                    : 'border-transparent bg-gray-100 text-gray-400'
                }`}
              >
                <span
                  className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                  style={{ background: active ? c : '#d1d5db' }}
                />
                {getTypeLabel(type)}
              </button>
            );
          })}
        </div>

        <div className="w-px h-6 bg-gray-200" />

        {/* Scheduled / Unscheduled toggle */}
        <div className="flex items-center bg-gray-100 rounded-lg p-0.5">
          {(['all', 'scheduled', 'unscheduled'] as const).map(v => (
            <button
              key={v}
              onClick={() => setScheduleFilter(v)}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                scheduleFilter === v ? 'bg-white shadow-sm text-gray-800' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {v === 'all' ? 'All' : v === 'scheduled' ? 'Scheduled' : 'Unscheduled'}
            </button>
          ))}
        </div>

        <div className="w-px h-6 bg-gray-200" />

        {/* Date presets */}
        <div className="flex items-center gap-1.5">
          <Calendar className="h-4 w-4 text-gray-400" />
          {DATE_PRESETS.map(p => (
            <button
              key={p.key}
              onClick={() => setDatePreset(p.key)}
              className={`px-2.5 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                datePreset === p.key
                  ? 'bg-blue-50 text-blue-700 border border-blue-200'
                  : 'text-gray-500 hover:bg-gray-100 border border-transparent'
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>

        {datePreset === 'custom' && (
          <div className="flex items-center gap-2">
            <input
              type="date"
              value={customFrom}
              onChange={e => setCustomFrom(e.target.value)}
              className="px-2 py-1.5 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <span className="text-xs text-gray-400">to</span>
            <input
              type="date"
              value={customTo}
              onChange={e => setCustomTo(e.target.value)}
              className="px-2 py-1.5 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        )}

        <span className="ml-auto text-xs font-semibold text-gray-500">
          {filteredPins.length} work order{filteredPins.length !== 1 ? 's' : ''}
        </span>
      </div>

      {/* Map + detail panel */}
      <div className="flex-1 relative flex min-h-0">
        {/* Map */}
        <div className="flex-1 relative">
          <GoogleMap
            markers={mapMarkers}
            selectedId={selectedPinId}
            onMarkerClick={handlePinClick}
            className="absolute inset-0"
          />

          {/* Legend */}
          <div className="absolute bottom-4 left-4 bg-white/95 backdrop-blur-sm rounded-xl shadow-lg border border-gray-200 p-3 min-w-[160px] z-10">
            <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-2">Work Order Types</p>
            <div className="space-y-1.5 text-xs">
              {typesInData.filter(t => enabledTypes.has(t)).map(type => (
                <div key={type} className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: getTypeColor(type) }} />
                  <span className="text-gray-700">{getTypeLabel(type)}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Detail side panel */}
        {selectedPin && (
          <div className="w-80 border-l border-gray-200 bg-white overflow-y-auto flex-shrink-0 animate-in slide-in-from-right">
            <div className="p-4 border-b border-gray-100 flex items-center justify-between">
              <span className="font-mono text-sm font-bold text-blue-700">{selectedPin.wo_number}</span>
              <button
                onClick={() => setSelectedPinId(null)}
                className="p-1 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="h-4 w-4 text-gray-400" />
              </button>
            </div>

            <div className="p-4 space-y-4">
              {/* Title */}
              <div>
                <p className="text-sm font-semibold text-gray-900 leading-snug">{selectedPin.title}</p>
              </div>

              {/* Customer + site */}
              <div className="flex items-start gap-2.5">
                <MapPin className="h-4 w-4 text-gray-400 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-sm font-medium text-gray-800">{selectedPin.companyName}</p>
                  {selectedPin.siteName && (
                    <p className="text-xs text-gray-500 mt-0.5">{selectedPin.siteName}</p>
                  )}
                </div>
              </div>

              {/* Type */}
              <div className="flex items-center gap-2.5">
                <Wrench className="h-4 w-4 text-gray-400 flex-shrink-0" />
                <span
                  className="text-xs font-medium px-2.5 py-1 rounded-full text-white"
                  style={{ background: getTypeColor(selectedPin.work_order_type) }}
                >
                  {getTypeLabel(selectedPin.work_order_type)}
                </span>
              </div>

              {/* Status */}
              <div className="flex items-center gap-2.5">
                <div className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${STATUS_DOT[selectedPin.status] || 'bg-gray-400'}`} />
                <span className="text-sm text-gray-700">
                  {STATUS_LABELS[selectedPin.status] || selectedPin.status}
                </span>
              </div>

              {/* Priority */}
              <div className="flex items-center gap-2.5">
                <AlertCircle className={`h-4 w-4 flex-shrink-0 ${PRIORITY_DOT[selectedPin.priority] || 'text-gray-400'}`} />
                <span className="text-sm text-gray-700 capitalize">{selectedPin.priority} priority</span>
              </div>

              {/* Schedule */}
              <div className="flex items-center gap-2.5">
                <Calendar className="h-4 w-4 text-gray-400 flex-shrink-0" />
                {selectedPin.scheduled_date ? (
                  <div>
                    <p className="text-sm text-gray-700">
                      {new Date(selectedPin.scheduled_date + 'T00:00:00').toLocaleDateString('en-US', {
                        weekday: 'short', month: 'short', day: 'numeric', year: 'numeric',
                      })}
                    </p>
                    {selectedPin.scheduled_time && (
                      <p className="text-xs text-gray-500 mt-0.5">{selectedPin.scheduled_time}</p>
                    )}
                  </div>
                ) : (
                  <span className="text-sm text-gray-400 italic">Not scheduled</span>
                )}
              </div>

              {/* Technician */}
              <div className="flex items-center gap-2.5">
                <User className="h-4 w-4 text-gray-400 flex-shrink-0" />
                {selectedPin.leadTech ? (
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center text-xs font-bold text-blue-700">
                      {selectedPin.leadTech.split(' ').map(n => n[0]).join('')}
                    </div>
                    <span className="text-sm text-gray-700">{selectedPin.leadTech}</span>
                  </div>
                ) : (
                  <span className="text-sm text-gray-400 italic">Unassigned</span>
                )}
              </div>

              {/* CTA */}
              <button
                onClick={() => onViewDetail(selectedPin.id)}
                className="w-full mt-2 flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium text-sm transition-colors"
              >
                View Work Order
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
