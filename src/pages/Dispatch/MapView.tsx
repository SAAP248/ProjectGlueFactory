import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  MapPin, PhoneCall, Wrench, Clock, User, Phone, ArrowRight, Navigation2,
  ChevronRight, Users, AlertTriangle, CircleDot, Layers, Maximize2, Plus,
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import type { Lead } from '../Leads/types';
import LeadSlideOver from '../Leads/LeadSlideOver';
import LeadFormModal from '../Leads/LeadFormModal';
import NewDealWizard from '../Deals/NewDealWizard/index';
import WorkOrderSlideOver from '../WorkOrders/WorkOrderSlideOver';

interface ScheduledItem {
  id: string;
  kind: 'sales_call' | 'work_order';
  dateISO: string;
  startTime: string | null;
  endTime: string | null;
  customerName: string;
  subtitle: string | null;
  addressLine: string | null;
  phone: string | null;
  priority: 'high' | 'normal' | 'low';
  status: string;
  assignedTo: string | null;
  leadId?: string | null;
  workOrderId?: string | null;
  notes?: string | null;
}

interface TechRow {
  id: string;
  name: string;
  role: string | null;
  avatar_url: string | null;
  jobsToday: number;
  jobsActive: number;
}

function timeStr(t: string | null) {
  if (!t) return '';
  const [h, m] = t.split(':').map(Number);
  const ampm = h >= 12 ? 'PM' : 'AM';
  const hh = h % 12 || 12;
  return `${hh}:${String(m).padStart(2, '0')} ${ampm}`;
}

function initials(name: string) {
  return name.split(' ').filter(Boolean).slice(0, 2).map(p => p[0]).join('').toUpperCase();
}

const TECH_COLORS = [
  'bg-emerald-500',
  'bg-blue-500',
  'bg-amber-500',
  'bg-rose-500',
  'bg-teal-500',
  'bg-orange-500',
];

const RANGES = [
  { id: 'today', label: 'Today' },
  { id: 'tomorrow', label: 'Tomorrow' },
  { id: 'week', label: 'This Week' },
] as const;

type RangeId = typeof RANGES[number]['id'];

function getRange(range: RangeId): { startISO: string; endISO: string } {
  const t = new Date();
  t.setHours(0, 0, 0, 0);
  if (range === 'today') {
    const iso = t.toISOString().slice(0, 10);
    return { startISO: iso, endISO: iso };
  }
  if (range === 'tomorrow') {
    const tom = new Date(t.getTime() + 86400000);
    const iso = tom.toISOString().slice(0, 10);
    return { startISO: iso, endISO: iso };
  }
  const end = new Date(t.getTime() + 6 * 86400000);
  return { startISO: t.toISOString().slice(0, 10), endISO: end.toISOString().slice(0, 10) };
}

export default function MapView() {
  const [range, setRange] = useState<RangeId>('today');
  const [items, setItems] = useState<ScheduledItem[]>([]);
  const [technicians, setTechnicians] = useState<TechRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [hoveredTechId, setHoveredTechId] = useState<string | null>(null);
  const [kindFilter, setKindFilter] = useState<'all' | 'sales_call' | 'work_order'>('all');

  const [openLeadId, setOpenLeadId] = useState<string | null>(null);
  const [openWorkOrderId, setOpenWorkOrderId] = useState<string | null>(null);
  const [convertLead, setConvertLead] = useState<Lead | null>(null);
  const [editLead, setEditLead] = useState<Lead | null>(null);
  const [showNewLead, setShowNewLead] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  const load = useCallback(async () => {
    setLoading(true);
    const { startISO, endISO } = getRange(range);

    const [apptRes, wotRes, empRes] = await Promise.all([
      supabase
        .from('appointments')
        .select(`
          id, appointment_date, start_time, end_time, appointment_type, notes, status, lead_id,
          leads(id, contact_name, contact_phone, address, city, state, zip, status,
            employees(id, first_name, last_name))
        `)
        .gte('appointment_date', startISO)
        .lte('appointment_date', endISO)
        .eq('appointment_type', 'sales_call')
        .order('start_time', { ascending: true }),
      supabase
        .from('work_order_technicians')
        .select(`
          id, scheduled_date, scheduled_start_time, scheduled_end_time, is_lead,
          employees(id, first_name, last_name),
          work_orders(id, wo_number, title, status, priority, notes, reason_for_visit,
            companies(id, name, phone, billing_address, billing_city, billing_state, billing_zip),
            sites(id, name, address, city, state, zip)
          )
        `)
        .gte('scheduled_date', startISO)
        .lte('scheduled_date', endISO)
        .not('scheduled_date', 'is', null),
      supabase
        .from('employees')
        .select('id, first_name, last_name, role, avatar_url, status')
        .eq('status', 'active'),
    ]);

    const salesItems: ScheduledItem[] = ((apptRes.data as any[]) || []).map(row => {
      const lead = row.leads;
      const assigned = lead?.employees
        ? `${lead.employees.first_name} ${lead.employees.last_name}`
        : null;
      const addr = lead
        ? [lead.address, [lead.city, lead.state].filter(Boolean).join(', '), lead.zip]
            .filter(Boolean).join(' · ')
        : null;
      return {
        id: `appt-${row.id}`,
        kind: 'sales_call',
        dateISO: row.appointment_date,
        startTime: row.start_time,
        endTime: row.end_time,
        customerName: lead?.contact_name || 'Sales Call',
        subtitle: lead?.status || 'Lead',
        addressLine: addr,
        phone: lead?.contact_phone || null,
        priority: 'normal',
        status: row.status || 'scheduled',
        assignedTo: assigned,
        leadId: row.lead_id,
        notes: row.notes,
      };
    });

    const woItems: ScheduledItem[] = ((wotRes.data as any[]) || [])
      .filter(row => row.work_orders && row.work_orders.status !== 'cancelled')
      .map(row => {
        const wo = row.work_orders;
        const co = wo?.companies;
        const site = wo?.sites;
        const tech = row.employees
          ? `${row.employees.first_name} ${row.employees.last_name}`
          : 'Unassigned';
        const addr = site
          ? [site.address, [site.city, site.state].filter(Boolean).join(', '), site.zip].filter(Boolean).join(' · ')
          : [co?.billing_address, [co?.billing_city, co?.billing_state].filter(Boolean).join(', '), co?.billing_zip].filter(Boolean).join(' · ') || null;
        const priority: 'high' | 'normal' | 'low' =
          wo?.priority === 'urgent' || wo?.priority === 'high' ? 'high'
          : wo?.priority === 'low' ? 'low' : 'normal';
        return {
          id: `wot-${row.id}`,
          kind: 'work_order',
          dateISO: row.scheduled_date,
          startTime: row.scheduled_start_time,
          endTime: row.scheduled_end_time,
          customerName: co?.name || wo?.title || 'Work Order',
          subtitle: `${wo?.wo_number || ''}${wo?.title ? ' · ' + wo.title : ''}`.trim() || null,
          addressLine: addr,
          phone: co?.phone || null,
          priority,
          status: wo?.status || 'scheduled',
          assignedTo: tech,
          workOrderId: wo?.id || null,
          notes: wo?.reason_for_visit || wo?.notes || null,
        };
      });

    const combined = [...salesItems, ...woItems].sort((a, b) => {
      const dc = a.dateISO.localeCompare(b.dateISO);
      if (dc !== 0) return dc;
      return (a.startTime || '').localeCompare(b.startTime || '');
    });
    setItems(combined);

    // Techs — count jobs today across woItems in range
    const emps = (empRes.data as any[]) || [];
    const techRows: TechRow[] = emps.map(e => {
      const name = `${e.first_name} ${e.last_name}`;
      const jobsToday = woItems.filter(wi => wi.assignedTo === name).length;
      const jobsActive = woItems.filter(wi => wi.assignedTo === name && ['in_progress', 'on_site'].includes(wi.status)).length;
      return {
        id: e.id,
        name,
        role: e.role,
        avatar_url: e.avatar_url,
        jobsToday,
        jobsActive,
      };
    }).sort((a, b) => b.jobsToday - a.jobsToday);

    setTechnicians(techRows);
    setLoading(false);
  }, [range, refreshKey]);

  useEffect(() => { load(); }, [load]);

  const filteredItems = useMemo(() =>
    kindFilter === 'all' ? items : items.filter(i => i.kind === kindFilter),
  [items, kindFilter]);

  useEffect(() => {
    if (!selectedId && filteredItems.length > 0) {
      setSelectedId(filteredItems[0].id);
    }
    if (selectedId && !filteredItems.find(i => i.id === selectedId)) {
      setSelectedId(filteredItems[0]?.id ?? null);
    }
  }, [filteredItems, selectedId]);

  const selected = useMemo(() => items.find(i => i.id === selectedId) || null, [items, selectedId]);

  function openSelected() {
    if (!selected) return;
    if (selected.leadId) setOpenLeadId(selected.leadId);
    else if (selected.workOrderId) setOpenWorkOrderId(selected.workOrderId);
  }

  const salesCount = items.filter(i => i.kind === 'sales_call').length;
  const woCount = items.filter(i => i.kind === 'work_order').length;
  const unassigned = items.filter(i => i.kind === 'work_order' && (!i.assignedTo || i.assignedTo === 'Unassigned')).length;

  return (
    <div className="flex flex-col h-[calc(100vh-140px)] min-h-[640px] bg-gray-50 rounded-2xl border border-gray-200 overflow-hidden">
      {/* Top toolbar */}
      <div className="bg-white border-b border-gray-200 px-4 py-2.5 flex items-center gap-3 flex-shrink-0">
        <div className="flex items-center bg-gray-100 rounded-lg p-0.5">
          {RANGES.map(r => (
            <button
              key={r.id}
              onClick={() => setRange(r.id)}
              className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
                range === r.id ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {r.label}
            </button>
          ))}
        </div>

        <div className="h-5 w-px bg-gray-200" />

        <div className="flex items-center bg-gray-100 rounded-lg p-0.5">
          {([
            { id: 'all', label: 'All', count: items.length },
            { id: 'work_order', label: 'Work Orders', count: woCount },
            { id: 'sales_call', label: 'Sales Calls', count: salesCount },
          ] as const).map(o => (
            <button
              key={o.id}
              onClick={() => setKindFilter(o.id)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
                kindFilter === o.id ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {o.label}
              <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                kindFilter === o.id ? 'bg-blue-100 text-blue-700' : 'bg-gray-200 text-gray-600'
              }`}>{o.count}</span>
            </button>
          ))}
        </div>

        {unassigned > 0 && (
          <div className="flex items-center gap-1.5 ml-2 px-2.5 py-1 bg-orange-50 border border-orange-200 text-orange-700 rounded-md text-xs font-semibold">
            <AlertTriangle className="h-3.5 w-3.5" />
            {unassigned} unassigned
          </div>
        )}

        <div className="flex-1" />

        <button
          onClick={() => setShowNewLead(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-white rounded-lg text-xs font-semibold shadow-sm transition-colors"
        >
          <Plus className="h-3.5 w-3.5" />
          New Lead
        </button>
      </div>

      {/* Main three-column area */}
      <div className="flex-1 flex min-h-0">
        {/* LEFT: Details pane */}
        <aside className="w-80 bg-white border-r border-gray-200 flex flex-col flex-shrink-0 overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
            <h3 className="text-sm font-bold text-gray-900">Job Details</h3>
            {selected && (
              <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                selected.kind === 'sales_call' ? 'bg-amber-100 text-amber-700' : 'bg-blue-100 text-blue-700'
              }`}>
                {selected.kind === 'sales_call' ? 'Sales Call' : 'Work Order'}
              </span>
            )}
          </div>

          {!selected ? (
            <div className="flex-1 flex flex-col items-center justify-center text-center p-6">
              <div className="w-12 h-12 rounded-xl bg-gray-100 flex items-center justify-center mb-3">
                <MapPin className="h-5 w-5 text-gray-400" />
              </div>
              <p className="text-sm font-semibold text-gray-700">No job selected</p>
              <p className="text-xs text-gray-500 mt-1">Pick a pin or a scheduled call below to see details.</p>
            </div>
          ) : (
            <div className="flex-1 overflow-y-auto">
              <div className="p-4 border-b border-gray-100">
                <div className="flex items-start gap-3">
                  <div className={`w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 ${
                    selected.kind === 'sales_call' ? 'bg-amber-100' : 'bg-blue-100'
                  }`}>
                    {selected.kind === 'sales_call'
                      ? <PhoneCall className="h-5 w-5 text-amber-600" />
                      : <Wrench className="h-5 w-5 text-blue-600" />}
                  </div>
                  <div className="min-w-0 flex-1">
                    <h4 className="text-sm font-bold text-gray-900 leading-tight">{selected.customerName}</h4>
                    {selected.subtitle && (
                      <p className="text-xs text-gray-500 mt-0.5 truncate">{selected.subtitle}</p>
                    )}
                  </div>
                </div>

                <div className="flex flex-wrap gap-1.5 mt-3">
                  <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${
                    selected.priority === 'high'
                      ? 'bg-red-50 text-red-700 border-red-200'
                      : selected.priority === 'low'
                      ? 'bg-gray-50 text-gray-600 border-gray-200'
                      : 'bg-slate-50 text-slate-700 border-slate-200'
                  }`}>
                    {selected.priority} priority
                  </span>
                  <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200">
                    {selected.status.replace(/_/g, ' ')}
                  </span>
                </div>
              </div>

              <div className="p-4 space-y-3 border-b border-gray-100">
                <div className="flex items-start gap-2.5">
                  <Clock className="h-4 w-4 text-gray-400 mt-0.5 flex-shrink-0" />
                  <div className="text-sm">
                    <p className="text-gray-900 font-semibold">
                      {new Date(selected.dateISO + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                    </p>
                    <p className="text-xs text-gray-500">
                      {selected.startTime ? timeStr(selected.startTime) : 'Time TBD'}
                      {selected.endTime ? ' – ' + timeStr(selected.endTime) : ''}
                    </p>
                  </div>
                </div>

                {selected.addressLine && (
                  <div className="flex items-start gap-2.5">
                    <MapPin className="h-4 w-4 text-gray-400 mt-0.5 flex-shrink-0" />
                    <a
                      href={`https://maps.google.com/?q=${encodeURIComponent(selected.addressLine)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-gray-700 hover:text-blue-600 transition-colors leading-snug"
                    >
                      {selected.addressLine}
                    </a>
                  </div>
                )}

                {selected.phone && (
                  <div className="flex items-start gap-2.5">
                    <Phone className="h-4 w-4 text-gray-400 mt-0.5 flex-shrink-0" />
                    <a href={`tel:${selected.phone}`} className="text-sm text-gray-700 hover:text-blue-600 transition-colors">
                      {selected.phone}
                    </a>
                  </div>
                )}

                {selected.assignedTo && (
                  <div className="flex items-start gap-2.5">
                    <User className="h-4 w-4 text-gray-400 mt-0.5 flex-shrink-0" />
                    <div className="text-sm">
                      <p className="text-gray-900 font-semibold">{selected.assignedTo}</p>
                      <p className="text-xs text-gray-500">
                        {selected.kind === 'sales_call' ? 'Salesperson' : 'Assigned technician'}
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {selected.notes && (
                <div className="p-4 border-b border-gray-100">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-1.5">Notes</p>
                  <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">{selected.notes}</p>
                </div>
              )}

              <div className="p-4 space-y-2">
                <button
                  onClick={openSelected}
                  className="w-full flex items-center justify-center gap-1.5 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold transition-colors"
                >
                  Open full record
                  <ArrowRight className="h-3.5 w-3.5" />
                </button>
                {selected.addressLine && (
                  <a
                    href={`https://maps.google.com/?q=${encodeURIComponent(selected.addressLine)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full flex items-center justify-center gap-1.5 px-3 py-2 border border-gray-200 hover:bg-gray-50 text-gray-700 rounded-lg text-xs font-semibold transition-colors"
                  >
                    <Navigation2 className="h-3.5 w-3.5" />
                    Get directions
                  </a>
                )}
              </div>
            </div>
          )}
        </aside>

        {/* CENTER: Map + bottom strip */}
        <div className="flex-1 flex flex-col min-w-0">
          <div className="flex-1 relative bg-gradient-to-br from-slate-100 via-slate-50 to-blue-50 overflow-hidden">
            {/* Faux map grid */}
            <div
              aria-hidden
              className="absolute inset-0 opacity-40"
              style={{
                backgroundImage:
                  'linear-gradient(to right, rgba(148,163,184,0.25) 1px, transparent 1px), linear-gradient(to bottom, rgba(148,163,184,0.25) 1px, transparent 1px)',
                backgroundSize: '56px 56px',
              }}
            />
            {/* Faux road overlays */}
            <svg aria-hidden className="absolute inset-0 w-full h-full" preserveAspectRatio="none">
              <path d="M 0 220 Q 300 120 600 260 T 1200 220" stroke="rgba(148,163,184,0.5)" strokeWidth="14" fill="none" strokeLinecap="round" />
              <path d="M 0 420 Q 400 360 800 440 T 1600 420" stroke="rgba(148,163,184,0.35)" strokeWidth="10" fill="none" strokeLinecap="round" />
              <path d="M 260 0 Q 380 220 220 520 T 300 900" stroke="rgba(148,163,184,0.4)" strokeWidth="10" fill="none" strokeLinecap="round" />
              <path d="M 820 0 Q 720 240 880 480 T 820 920" stroke="rgba(148,163,184,0.3)" strokeWidth="8" fill="none" strokeLinecap="round" />
            </svg>

            {/* Pins - deterministic scatter based on index */}
            <div className="absolute inset-0">
              {filteredItems.map((item, i) => {
                const seedX = (i * 97 + 43) % 100;
                const seedY = (i * 131 + 71) % 100;
                const left = 8 + seedX * 0.84;
                const top = 8 + seedY * 0.78;
                const isSelected = item.id === selectedId;
                const isSales = item.kind === 'sales_call';
                const colorCls = isSales
                  ? 'bg-amber-500 ring-amber-200'
                  : item.priority === 'high'
                  ? 'bg-red-500 ring-red-200'
                  : (!item.assignedTo || item.assignedTo === 'Unassigned')
                  ? 'bg-orange-500 ring-orange-200'
                  : 'bg-blue-600 ring-blue-200';
                return (
                  <button
                    key={item.id}
                    onClick={() => setSelectedId(item.id)}
                    title={item.customerName}
                    className="absolute -translate-x-1/2 -translate-y-full group"
                    style={{ left: `${left}%`, top: `${top}%` }}
                  >
                    <div className={`relative flex flex-col items-center ${isSelected ? 'z-30' : 'z-10'}`}>
                      <div className={`relative w-7 h-7 rounded-full ${colorCls} ${isSelected ? 'ring-4 scale-125' : 'ring-2'} shadow-lg flex items-center justify-center transition-all group-hover:scale-110`}>
                        <MapPin className="h-3.5 w-3.5 text-white" fill="currentColor" />
                        {isSelected && (
                          <span className="absolute inset-0 rounded-full animate-ping opacity-60 bg-white" />
                        )}
                      </div>
                      <div className={`w-0.5 h-2 ${colorCls.split(' ')[0]}`} />
                      {isSelected && (
                        <div className="absolute top-full mt-1 left-1/2 -translate-x-1/2 bg-white px-2 py-1 rounded-lg shadow-xl border border-gray-200 whitespace-nowrap text-xs font-semibold text-gray-900 z-40">
                          {item.customerName}
                          {item.startTime && <span className="text-gray-400 ml-1.5">{timeStr(item.startTime)}</span>}
                        </div>
                      )}
                    </div>
                  </button>
                );
              })}

              {/* Technician pins (scattered deterministic) */}
              {technicians.filter(t => t.jobsToday > 0).slice(0, 6).map((t, idx) => {
                const left = 15 + ((idx * 181 + 7) % 70);
                const top = 12 + ((idx * 239 + 29) % 70);
                const color = TECH_COLORS[idx % TECH_COLORS.length];
                const isHovered = hoveredTechId === t.id;
                return (
                  <div
                    key={t.id}
                    className="absolute -translate-x-1/2 -translate-y-1/2 z-20"
                    style={{ left: `${left}%`, top: `${top}%` }}
                  >
                    <div className={`relative w-9 h-9 rounded-full ${color} ring-4 ring-white shadow-xl flex items-center justify-center text-white text-[10px] font-bold transition-transform ${isHovered ? 'scale-125' : ''}`}>
                      {initials(t.name)}
                      <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-emerald-500 rounded-full ring-2 ring-white" />
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Legend (top-right) */}
            <div className="absolute top-3 right-3 bg-white/95 backdrop-blur-sm rounded-xl shadow-lg border border-gray-200 p-3 min-w-[200px]">
              <div className="flex items-center justify-between mb-2">
                <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Legend</p>
                <Layers className="h-3.5 w-3.5 text-gray-400" />
              </div>
              <div className="space-y-1.5 text-xs">
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full bg-blue-600" />
                  <span className="text-gray-700">Work orders</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                  <span className="text-gray-700">Sales calls</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full bg-red-500" />
                  <span className="text-gray-700">High priority</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full bg-orange-500" />
                  <span className="text-gray-700">Unassigned</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                  <span className="text-gray-700">Active tech</span>
                </div>
              </div>
            </div>

            {/* Stats (top-left) */}
            <div className="absolute top-3 left-3 bg-white/95 backdrop-blur-sm rounded-xl shadow-lg border border-gray-200 px-3 py-2 flex items-center gap-4">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Scheduled</p>
                <p className="text-lg font-bold text-gray-900 leading-none mt-0.5">{items.length}</p>
              </div>
              <div className="h-8 w-px bg-gray-200" />
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400">On Duty</p>
                <p className="text-lg font-bold text-gray-900 leading-none mt-0.5">
                  {technicians.filter(t => t.jobsToday > 0).length}
                </p>
              </div>
            </div>

            {loading && (
              <div className="absolute inset-0 flex items-center justify-center bg-white/50 backdrop-blur-[1px]">
                <div className="w-10 h-10 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
              </div>
            )}

            {!loading && filteredItems.length === 0 && (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-center bg-white/95 backdrop-blur-sm rounded-2xl px-8 py-6 shadow-lg border border-gray-200">
                  <MapPin className="h-8 w-8 text-gray-300 mx-auto mb-2" />
                  <p className="text-sm font-semibold text-gray-700">No scheduled items</p>
                  <p className="text-xs text-gray-500 mt-1">Try a different range or filter.</p>
                </div>
              </div>
            )}
          </div>

          {/* Bottom: scheduled strip */}
          <div className="bg-white border-t border-gray-200 flex-shrink-0">
            <div className="px-4 py-2.5 flex items-center justify-between border-b border-gray-100">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-gray-500" />
                <h3 className="text-sm font-bold text-gray-900">Scheduled</h3>
                <span className="text-xs bg-gray-100 text-gray-600 font-semibold px-1.5 py-0.5 rounded-full">
                  {filteredItems.length}
                </span>
              </div>
              <p className="text-[10px] uppercase tracking-wider font-bold text-gray-400">
                {RANGES.find(r => r.id === range)?.label}
              </p>
            </div>
            <div className="max-h-[220px] overflow-y-auto">
              {filteredItems.length === 0 ? (
                <div className="text-center text-xs text-gray-400 py-8">
                  No items to display.
                </div>
              ) : (
                <ul className="divide-y divide-gray-100">
                  {filteredItems.map(item => {
                    const isSelected = item.id === selectedId;
                    const isSales = item.kind === 'sales_call';
                    const accentBar = isSales
                      ? 'bg-amber-500'
                      : item.priority === 'high'
                      ? 'bg-red-500'
                      : (!item.assignedTo || item.assignedTo === 'Unassigned')
                      ? 'bg-orange-500'
                      : 'bg-blue-600';
                    return (
                      <li
                        key={item.id}
                        ref={isSelected ? (el => el?.scrollIntoView({ block: 'nearest' })) : undefined}
                      >
                        <button
                          onClick={() => setSelectedId(item.id)}
                          className={`relative w-full text-left flex items-center gap-3 pl-4 pr-3 py-2 transition-colors ${
                            isSelected ? 'bg-blue-50' : 'hover:bg-gray-50'
                          }`}
                        >
                          <span className={`absolute left-0 top-0 bottom-0 w-1 ${isSelected ? accentBar : 'bg-transparent'}`} />

                          <span className={`flex h-7 w-7 items-center justify-center rounded-lg flex-shrink-0 ${isSales ? 'bg-amber-100' : 'bg-blue-100'}`}>
                            {isSales
                              ? <PhoneCall className="h-3.5 w-3.5 text-amber-600" />
                              : <Wrench className="h-3.5 w-3.5 text-blue-600" />}
                          </span>

                          <span className="w-20 text-xs font-semibold text-gray-700 flex-shrink-0 tabular-nums">
                            {item.startTime ? timeStr(item.startTime) : <span className="text-gray-400">TBD</span>}
                          </span>

                          <span className="flex-1 min-w-0 flex items-center gap-2">
                            <span className="text-sm font-bold text-gray-900 truncate max-w-[260px]">{item.customerName}</span>
                            {item.subtitle && (
                              <span className="text-xs text-gray-500 truncate hidden md:inline">{item.subtitle}</span>
                            )}
                          </span>

                          {item.assignedTo && (
                            <span className="hidden lg:flex items-center gap-1 text-xs text-gray-500 w-40 truncate flex-shrink-0">
                              <User className="h-3 w-3 flex-shrink-0" />
                              <span className="truncate">{item.assignedTo}</span>
                            </span>
                          )}

                          {item.addressLine && (
                            <span className="hidden xl:flex items-center gap-1 text-xs text-gray-400 w-48 truncate flex-shrink-0">
                              <MapPin className="h-3 w-3 flex-shrink-0" />
                              <span className="truncate">{item.addressLine}</span>
                            </span>
                          )}

                          <span className="flex items-center gap-1.5 flex-shrink-0">
                            {item.priority === 'high' && (
                              <span className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 bg-red-100 text-red-700 rounded">
                                High
                              </span>
                            )}
                            <span className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 bg-slate-100 text-slate-700 rounded">
                              {item.status.replace(/_/g, ' ')}
                            </span>
                          </span>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          </div>
        </div>

        {/* RIGHT: Technicians rail */}
        <aside className="w-64 bg-white border-l border-gray-200 flex flex-col flex-shrink-0 overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-gray-500" />
              <h3 className="text-sm font-bold text-gray-900">Technicians</h3>
            </div>
            <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 bg-emerald-100 text-emerald-700 rounded-full">
              {technicians.filter(t => t.jobsToday > 0).length} active
            </span>
          </div>

          <div className="flex-1 overflow-y-auto p-3 space-y-2">
            {technicians.length === 0 ? (
              <p className="text-xs text-gray-400 text-center py-6">No technicians.</p>
            ) : technicians.map((t, idx) => {
              const color = TECH_COLORS[idx % TECH_COLORS.length];
              const active = t.jobsToday > 0;
              return (
                <div
                  key={t.id}
                  onMouseEnter={() => setHoveredTechId(t.id)}
                  onMouseLeave={() => setHoveredTechId(null)}
                  className={`p-2.5 rounded-xl border transition-all cursor-pointer ${
                    active
                      ? 'bg-white border-gray-200 hover:border-gray-300 hover:shadow-sm'
                      : 'bg-gray-50 border-gray-100'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <div className={`relative w-9 h-9 rounded-full ${active ? color : 'bg-gray-300'} flex items-center justify-center text-white text-xs font-bold flex-shrink-0`}>
                      {initials(t.name)}
                      {active && (
                        <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-emerald-500 rounded-full ring-2 ring-white" />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-bold text-gray-900 truncate leading-tight">{t.name}</p>
                      <p className="text-[10px] text-gray-500 truncate capitalize">
                        {t.role || 'Technician'}
                      </p>
                    </div>
                    <ChevronRight className="h-3.5 w-3.5 text-gray-300 flex-shrink-0" />
                  </div>

                  <div className="mt-2 flex items-center gap-2 text-[10px] font-semibold">
                    <div className="flex items-center gap-1 px-2 py-0.5 bg-blue-50 text-blue-700 rounded-md">
                      <CircleDot className="h-2.5 w-2.5" />
                      {t.jobsToday} today
                    </div>
                    {t.jobsActive > 0 && (
                      <div className="flex items-center gap-1 px-2 py-0.5 bg-emerald-50 text-emerald-700 rounded-md">
                        {t.jobsActive} active
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          <div className="px-3 py-2 border-t border-gray-100">
            <button className="w-full flex items-center justify-center gap-1.5 py-1.5 text-xs font-semibold text-gray-600 hover:text-gray-900 hover:bg-gray-50 rounded-lg transition-colors">
              <Maximize2 className="h-3.5 w-3.5" />
              Expand view
            </button>
          </div>
        </aside>
      </div>

      {/* Slideovers / modals */}
      {openWorkOrderId && (
        <WorkOrderSlideOver
          workOrderId={openWorkOrderId}
          onClose={() => { setOpenWorkOrderId(null); setRefreshKey(k => k + 1); }}
        />
      )}

      {openLeadId && !convertLead && (
        <>
          <div className="fixed inset-0 z-40 bg-black/20" onClick={() => setOpenLeadId(null)} />
          <LeadSlideOver
            leadId={openLeadId}
            onClose={() => setOpenLeadId(null)}
            onEdit={lead => { setEditLead(lead); setOpenLeadId(null); }}
            onConvertToDeal={lead => { setConvertLead(lead); setOpenLeadId(null); }}
            onUpdated={() => { setRefreshKey(k => k + 1); setOpenLeadId(null); }}
          />
        </>
      )}

      {showNewLead && (
        <LeadFormModal
          onClose={() => setShowNewLead(false)}
          onSaved={() => { setRefreshKey(k => k + 1); setShowNewLead(false); }}
        />
      )}

      {editLead && (
        <LeadFormModal
          lead={editLead}
          onClose={() => setEditLead(null)}
          onSaved={() => { setRefreshKey(k => k + 1); setEditLead(null); }}
        />
      )}

      {convertLead && (
        <NewDealWizard
          leadPrefill={{
            leadId: convertLead.id,
            contactName: convertLead.contact_name,
            contactPhone: convertLead.contact_phone ?? undefined,
            contactEmail: convertLead.contact_email ?? undefined,
            address: convertLead.address ?? undefined,
            city: convertLead.city ?? undefined,
            state: convertLead.state ?? undefined,
            zip: convertLead.zip ?? undefined,
            assignedEmployeeId: convertLead.assigned_employee_id ?? undefined,
          }}
          onClose={() => setConvertLead(null)}
          onDealCreated={() => { setRefreshKey(k => k + 1); setConvertLead(null); }}
        />
      )}
    </div>
  );
}
