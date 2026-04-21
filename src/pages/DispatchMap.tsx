import { useState, useEffect, useCallback } from 'react';
import { MapPin, Wrench, PhoneCall, Plus, User, Clock, ArrowRight } from 'lucide-react';
import { supabase } from '../lib/supabase';
import ViewTypeFilter, { type ViewType } from '../components/ViewTypeFilter';
import type { Lead } from './Leads/types';
import { LEAD_STATUS_CONFIG } from './Leads/types';
import LeadSlideOver from './Leads/LeadSlideOver';
import LeadFormModal from './Leads/LeadFormModal';
import NewDealWizard from './Deals/NewDealWizard/index';

interface Technician {
  id: string;
  name: string;
  status: string;
  location: string;
  jobs: number;
}

interface UnassignedJob {
  id: string;
  customer: string;
  address: string;
  type: string;
  priority: string;
}

interface SalesCallRow {
  id: string;
  appointment_date: string;
  start_time: string | null;
  appointment_type: string;
  lead_id: string | null;
  leads?: {
    id: string;
    contact_name: string;
    contact_phone: string | null;
    address: string | null;
    city: string | null;
    state: string | null;
    status: Lead['status'];
    lead_sources?: { name: string } | null;
    employees?: { id: string; first_name: string; last_name: string } | null;
  } | null;
}

const technicians: Technician[] = [
  { id: '1', name: 'Mike Johnson', status: 'On Route', location: '1.2 miles away', jobs: 3 },
  { id: '2', name: 'Sarah Williams', status: 'On Site', location: 'Downtown Mall', jobs: 2 },
  { id: '3', name: 'David Brown', status: 'Available', location: 'Warehouse', jobs: 1 },
];

const unassignedJobs: UnassignedJob[] = [
  { id: '1', customer: 'Smith Residence', address: '456 Oak Ave', type: 'Service', priority: 'High' },
  { id: '2', customer: 'Office Plaza', address: '789 Business Pkwy', type: 'Installation', priority: 'Normal' },
];

function apptTimeStr(t: string | null) {
  if (!t) return '';
  const [h, m] = t.split(':').map(Number);
  const ampm = h >= 12 ? 'PM' : 'AM';
  const hh = h % 12 || 12;
  return `${hh}:${String(m).padStart(2, '0')} ${ampm}`;
}

export default function DispatchMap() {
  const [viewType, setViewType] = useState<ViewType>('all');
  const [salesRange, setSalesRange] = useState<'today' | 'week'>('today');
  const [salesCalls, setSalesCalls] = useState<SalesCallRow[]>([]);
  const [loadingSales, setLoadingSales] = useState(true);
  const [selectedLeadId, setSelectedLeadId] = useState<string | null>(null);
  const [convertLead, setConvertLead] = useState<Lead | null>(null);
  const [editLead, setEditLead] = useState<Lead | null>(null);
  const [showNewLead, setShowNewLead] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  const loadSalesCalls = useCallback(async () => {
    setLoadingSales(true);
    const today = new Date().toISOString().slice(0, 10);
    const weekEnd = new Date(Date.now() + 6 * 86400000).toISOString().slice(0, 10);
    const end = salesRange === 'today' ? today : weekEnd;

    const { data } = await supabase
      .from('appointments')
      .select('id, appointment_date, start_time, appointment_type, lead_id, leads(id, contact_name, contact_phone, address, city, state, status, lead_sources(name), employees(id, first_name, last_name))')
      .gte('appointment_date', today)
      .lte('appointment_date', end)
      .eq('appointment_type', 'sales_call')
      .order('start_time', { ascending: true });

    setSalesCalls((data as SalesCallRow[]) ?? []);
    setLoadingSales(false);
  }, [salesRange, refreshKey]);

  useEffect(() => { loadSalesCalls(); }, [loadSalesCalls]);

  const showSalesPanel = viewType === 'all' || viewType === 'sales_calls';
  const showFieldPanel = viewType === 'all' || viewType === 'work_orders';

  return (
    <div className="p-6">
      <div className="mb-5 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dispatch Map</h1>
          <p className="text-gray-600 mt-1">Track technicians, sales calls, and assign jobs in real-time</p>
        </div>
        <div className="flex items-center gap-3">
          <ViewTypeFilter value={viewType} onChange={setViewType} />
          {showSalesPanel && (
            <button
              onClick={() => setShowNewLead(true)}
              className="flex items-center gap-1.5 px-3 py-2 bg-amber-500 text-white rounded-xl hover:bg-amber-600 font-semibold text-sm shadow-sm transition-colors"
            >
              <Plus className="h-3.5 w-3.5" />
              New Lead
            </button>
          )}
        </div>
      </div>

      <div className={`grid gap-4 ${viewType === 'all' ? 'grid-cols-4' : 'grid-cols-3'}`}>
        {showSalesPanel && (
          <div className="col-span-1 space-y-4">
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100">
              <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <PhoneCall className="h-4 w-4 text-amber-600" />
                  <h3 className="text-sm font-bold text-gray-900">Sales Calls</h3>
                  <span className="text-xs bg-amber-100 text-amber-700 font-semibold px-1.5 py-0.5 rounded-full">
                    {salesCalls.length}
                  </span>
                </div>
                <div className="flex items-center bg-gray-100 rounded-lg p-0.5">
                  {(['today', 'week'] as const).map(r => (
                    <button
                      key={r}
                      onClick={() => setSalesRange(r)}
                      className={`px-2.5 py-1 rounded-md text-xs font-semibold transition-all capitalize ${
                        salesRange === r ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
                      }`}
                    >
                      {r === 'today' ? 'Today' : 'This Week'}
                    </button>
                  ))}
                </div>
              </div>

              <div className="p-3 space-y-2 max-h-[520px] overflow-y-auto">
                {loadingSales ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="w-6 h-6 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
                  </div>
                ) : salesCalls.length === 0 ? (
                  <div className="text-center py-8">
                    <PhoneCall className="h-8 w-8 text-gray-300 mx-auto mb-2" />
                    <p className="text-xs text-gray-400 font-medium">No sales calls {salesRange === 'today' ? 'today' : 'this week'}</p>
                    <button
                      onClick={() => setShowNewLead(true)}
                      className="mt-2 text-xs font-semibold text-amber-600 hover:text-amber-700"
                    >
                      + Add Lead
                    </button>
                  </div>
                ) : (
                  salesCalls.map(row => {
                    const lead = row.leads;
                    if (!lead) return null;
                    const statusCfg = LEAD_STATUS_CONFIG[lead.status] ?? LEAD_STATUS_CONFIG.new;
                    const salesperson = lead.employees ? `${lead.employees.first_name} ${lead.employees.last_name}` : null;
                    const addrSnippet = [lead.address, lead.city].filter(Boolean).join(', ');

                    return (
                      <button
                        key={row.id}
                        onClick={() => setSelectedLeadId(lead.id)}
                        className="w-full text-left p-3 bg-gray-50 rounded-xl hover:bg-amber-50 hover:border-amber-200 border border-transparent transition-all group"
                      >
                        <div className="flex items-start justify-between gap-2 mb-1.5">
                          <p className="text-sm font-semibold text-gray-900 leading-tight">{lead.contact_name}</p>
                          <span className={`shrink-0 px-1.5 py-0.5 rounded-full text-xs font-semibold border ${statusCfg.bg} ${statusCfg.color} ${statusCfg.border}`}>
                            {statusCfg.label}
                          </span>
                        </div>
                        {row.start_time && (
                          <div className="flex items-center gap-1 text-xs text-amber-700 mb-1">
                            <Clock className="h-3 w-3" />
                            {new Date(row.appointment_date + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} · {apptTimeStr(row.start_time)}
                          </div>
                        )}
                        {addrSnippet && (
                          <div className="flex items-center gap-1 text-xs text-gray-500 mb-1">
                            <MapPin className="h-3 w-3 shrink-0" />
                            <span className="truncate">{addrSnippet}</span>
                          </div>
                        )}
                        {salesperson && (
                          <div className="flex items-center gap-1 text-xs text-gray-500">
                            <User className="h-3 w-3 shrink-0" />
                            {salesperson}
                          </div>
                        )}
                        <div className="mt-2 flex items-center justify-end">
                          <ArrowRight className="h-3 w-3 text-gray-300 group-hover:text-amber-500 transition-colors" />
                        </div>
                      </button>
                    );
                  })
                )}
              </div>

              <div className="px-3 pb-3">
                <button
                  onClick={() => setShowNewLead(true)}
                  className="w-full flex items-center justify-center gap-1.5 py-2 text-xs font-semibold text-amber-600 border border-dashed border-amber-300 rounded-xl hover:bg-amber-50 transition-colors"
                >
                  <Plus className="h-3.5 w-3.5" />
                  New Lead
                </button>
              </div>
            </div>
          </div>
        )}

        <div className={viewType === 'all' ? 'col-span-2' : 'col-span-2'}>
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 h-[600px] flex items-center justify-center">
            <div className="text-center text-gray-400">
              <MapPin className="h-16 w-16 mx-auto mb-4 text-gray-200" />
              <p className="text-base font-semibold text-gray-500">Interactive Map View</p>
              <p className="text-sm text-gray-400 mt-1">Map integration would display here</p>
            </div>
          </div>
        </div>

        {showFieldPanel && (
          <div className="col-span-1 space-y-4">
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
              <div className="flex items-center gap-2 mb-4">
                <Wrench className="h-4 w-4 text-blue-600" />
                <h3 className="text-sm font-bold text-gray-900">Technicians</h3>
              </div>
              <div className="space-y-3">
                {technicians.map(tech => (
                  <div key={tech.id} className="p-3 bg-gray-50 rounded-xl">
                    <div className="flex items-center justify-between mb-2">
                      <div className="font-semibold text-gray-900 text-sm">{tech.name}</div>
                      <div className={`w-2 h-2 rounded-full ${
                        tech.status === 'On Site' ? 'bg-red-500' :
                        tech.status === 'On Route' ? 'bg-yellow-500' : 'bg-green-500'
                      }`} />
                    </div>
                    <div className="text-xs text-gray-600">{tech.status}</div>
                    <div className="text-xs text-gray-500 mt-0.5">{tech.location}</div>
                    <div className="text-xs text-gray-600 mt-1.5">{tech.jobs} jobs today</div>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-2 h-2 bg-orange-500 rounded-full" />
                <h3 className="text-sm font-bold text-gray-900">Unassigned Jobs</h3>
                <span className="text-xs bg-orange-100 text-orange-700 font-semibold px-1.5 py-0.5 rounded-full">
                  {unassignedJobs.length}
                </span>
              </div>
              <div className="space-y-3">
                {unassignedJobs.map(job => (
                  <div key={job.id} className="p-3 bg-orange-50 border border-orange-200 rounded-xl">
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="font-semibold text-gray-900 text-sm">{job.customer}</div>
                      <span className={`px-2 py-0.5 text-xs font-semibold rounded-full ${
                        job.priority === 'High' ? 'bg-red-100 text-red-800' : 'bg-blue-100 text-blue-800'
                      }`}>
                        {job.priority}
                      </span>
                    </div>
                    <div className="text-xs text-gray-600">{job.type}</div>
                    <div className="text-xs text-gray-500 mt-0.5">{job.address}</div>
                    <button className="mt-3 w-full px-3 py-1.5 bg-blue-600 text-white text-xs font-semibold rounded-lg hover:bg-blue-700 transition-colors">
                      Assign Technician
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {selectedLeadId && !convertLead && (
        <>
          <div className="fixed inset-0 z-40 bg-black/20" onClick={() => setSelectedLeadId(null)} />
          <LeadSlideOver
            leadId={selectedLeadId}
            onClose={() => setSelectedLeadId(null)}
            onEdit={lead => { setEditLead(lead); setSelectedLeadId(null); }}
            onConvertToDeal={lead => { setConvertLead(lead); setSelectedLeadId(null); }}
            onUpdated={() => { setRefreshKey(k => k + 1); setSelectedLeadId(null); }}
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
