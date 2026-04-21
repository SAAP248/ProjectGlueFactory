import { useState, useEffect, useCallback } from 'react';
import { Plus, Search, Phone, Mail, MapPin, User, TrendingUp, Calendar, PhoneCall, UserCheck, XCircle, Filter } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import type { Lead, LeadStatus } from './types';
import { LEAD_STATUS_CONFIG } from './types';
import LeadFormModal from './LeadFormModal';
import LeadSlideOver from './LeadSlideOver';
import NewDealWizard from '../Deals/NewDealWizard';

const STATUS_FILTERS: { value: LeadStatus | 'all'; label: string }[] = [
  { value: 'all', label: 'All Leads' },
  { value: 'new', label: 'New' },
  { value: 'contacted', label: 'Contacted' },
  { value: 'scheduled', label: 'Scheduled' },
  { value: 'converted', label: 'Converted' },
  { value: 'lost', label: 'Lost' },
];

function formatPhone(p: string | null) {
  if (!p) return null;
  const d = p.replace(/\D/g, '');
  if (d.length === 10) return `(${d.slice(0, 3)}) ${d.slice(3, 6)}-${d.slice(6)}`;
  return p;
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

interface StatCardProps {
  label: string;
  value: number;
  icon: React.ElementType;
  color: string;
  bg: string;
  onClick?: () => void;
  active?: boolean;
}

function StatCard({ label, value, icon: Icon, color, bg, onClick, active }: StatCardProps) {
  return (
    <button
      onClick={onClick}
      className={`text-left p-4 rounded-xl border transition-all ${active ? 'ring-2 ring-blue-500 border-blue-300' : 'border-gray-200 hover:border-gray-300'} bg-white shadow-sm hover:shadow-md`}
    >
      <div className="flex items-center justify-between mb-3">
        <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${bg}`}>
          <Icon className={`h-5 w-5 ${color}`} />
        </div>
        <span className="text-2xl font-bold text-gray-900">{value}</span>
      </div>
      <p className="text-sm text-gray-500 font-medium">{label}</p>
    </button>
  );
}

export default function Leads() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<LeadStatus | 'all'>('all');
  const [showForm, setShowForm] = useState(false);
  const [editLead, setEditLead] = useState<Lead | null>(null);
  const [slideOverId, setSlideOverId] = useState<string | null>(null);
  const [convertingLead, setConvertingLead] = useState<Lead | null>(null);

  const loadLeads = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from('leads')
      .select('*, lead_sources(*), employees(id, first_name, last_name)')
      .order('created_at', { ascending: false });
    setLeads((data as Lead[]) ?? []);
    setLoading(false);
  }, []);

  useEffect(() => {
    loadLeads();
  }, [loadLeads]);

  const filtered = leads.filter(l => {
    const matchStatus = statusFilter === 'all' || l.status === statusFilter;
    const q = search.toLowerCase();
    const matchSearch = !q ||
      l.contact_name.toLowerCase().includes(q) ||
      (l.contact_phone ?? '').includes(q) ||
      (l.contact_email ?? '').toLowerCase().includes(q) ||
      (l.city ?? '').toLowerCase().includes(q) ||
      (l.lead_sources?.name ?? '').toLowerCase().includes(q) ||
      (l.employees ? `${l.employees.first_name} ${l.employees.last_name}`.toLowerCase().includes(q) : false);
    return matchStatus && matchSearch;
  });

  const counts = {
    all: leads.length,
    new: leads.filter(l => l.status === 'new').length,
    contacted: leads.filter(l => l.status === 'contacted').length,
    scheduled: leads.filter(l => l.status === 'scheduled').length,
    converted: leads.filter(l => l.status === 'converted').length,
    lost: leads.filter(l => l.status === 'lost').length,
  };

  function handleSaved(lead: Lead) {
    setShowForm(false);
    setEditLead(null);
    setLeads(prev => {
      const exists = prev.find(l => l.id === lead.id);
      if (exists) return prev.map(l => l.id === lead.id ? lead : l);
      return [lead, ...prev];
    });
    setSlideOverId(lead.id);
  }

  function handleConvertToDeal(lead: Lead) {
    setSlideOverId(null);
    setConvertingLead(lead);
  }

  return (
    <div className="flex flex-col h-full">
      <div className="px-6 pt-6 pb-4 border-b border-gray-200 bg-white">
        <div className="flex items-center justify-between mb-5">
          <div>
            <h1 className="text-xl font-bold text-gray-900">Leads</h1>
            <p className="text-sm text-gray-500 mt-0.5">Track sales calls, inquiries, and prospects</p>
          </div>
          <button
            onClick={() => { setEditLead(null); setShowForm(true); }}
            className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 text-white text-sm font-semibold rounded-xl hover:bg-blue-700 transition-colors shadow-sm"
          >
            <Plus className="h-4 w-4" />
            New Lead
          </button>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
          <StatCard
            label="Total Leads"
            value={counts.all}
            icon={User}
            color="text-gray-600"
            bg="bg-gray-100"
            onClick={() => setStatusFilter('all')}
            active={statusFilter === 'all'}
          />
          <StatCard
            label="New"
            value={counts.new}
            icon={PhoneCall}
            color="text-blue-600"
            bg="bg-blue-100"
            onClick={() => setStatusFilter('new')}
            active={statusFilter === 'new'}
          />
          <StatCard
            label="Scheduled"
            value={counts.scheduled}
            icon={Calendar}
            color="text-amber-600"
            bg="bg-amber-100"
            onClick={() => setStatusFilter('scheduled')}
            active={statusFilter === 'scheduled'}
          />
          <StatCard
            label="Converted"
            value={counts.converted}
            icon={TrendingUp}
            color="text-green-600"
            bg="bg-green-100"
            onClick={() => setStatusFilter('converted')}
            active={statusFilter === 'converted'}
          />
        </div>

        <div className="flex items-center gap-3">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search leads…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1">
            <Filter className="h-3.5 w-3.5 text-gray-400 ml-1" />
            {STATUS_FILTERS.map(f => (
              <button
                key={f.value}
                onClick={() => setStatusFilter(f.value as LeadStatus | 'all')}
                className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                  statusFilter === f.value
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                {f.label}
                {f.value !== 'all' && (
                  <span className="ml-1 text-gray-400">{counts[f.value as LeadStatus]}</span>
                )}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="flex items-center justify-center h-48">
            <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-center">
            <div className="w-12 h-12 bg-gray-100 rounded-xl flex items-center justify-center mb-3">
              <User className="h-6 w-6 text-gray-400" />
            </div>
            <p className="text-sm font-semibold text-gray-700 mb-1">No leads found</p>
            <p className="text-xs text-gray-400">
              {search || statusFilter !== 'all' ? 'Try adjusting your search or filters' : 'Create your first lead to get started'}
            </p>
            {!search && statusFilter === 'all' && (
              <button
                onClick={() => { setEditLead(null); setShowForm(true); }}
                className="mt-4 px-4 py-2 bg-blue-600 text-white text-sm font-semibold rounded-lg hover:bg-blue-700 transition-colors"
              >
                New Lead
              </button>
            )}
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {filtered.map(lead => {
              const cfg = LEAD_STATUS_CONFIG[lead.status];
              const salesperson = lead.employees
                ? `${lead.employees.first_name} ${lead.employees.last_name}`
                : null;
              const location = [lead.city, lead.state].filter(Boolean).join(', ');

              return (
                <button
                  key={lead.id}
                  onClick={() => setSlideOverId(lead.id)}
                  className="w-full text-left px-6 py-4 hover:bg-gray-50 transition-colors group"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-amber-100 rounded-xl flex items-center justify-center shrink-0">
                      <User className="h-5 w-5 text-amber-600" />
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-semibold text-gray-900 text-sm group-hover:text-blue-600 transition-colors">
                          {lead.contact_name}
                        </span>
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold border ${cfg.bg} ${cfg.color} ${cfg.border}`}>
                          {cfg.label}
                        </span>
                        {lead.lead_sources && (
                          <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">
                            {lead.lead_sources.name}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-4 text-xs text-gray-500">
                        {lead.contact_phone && (
                          <span className="flex items-center gap-1">
                            <Phone className="h-3 w-3" />
                            {formatPhone(lead.contact_phone)}
                          </span>
                        )}
                        {lead.contact_email && (
                          <span className="flex items-center gap-1 truncate max-w-[180px]">
                            <Mail className="h-3 w-3 shrink-0" />
                            {lead.contact_email}
                          </span>
                        )}
                        {location && (
                          <span className="flex items-center gap-1">
                            <MapPin className="h-3 w-3" />
                            {location}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-6 shrink-0 text-right">
                      {salesperson && (
                        <div className="hidden sm:flex items-center gap-1.5 text-xs text-gray-500">
                          <UserCheck className="h-3.5 w-3.5" />
                          <span>{salesperson}</span>
                        </div>
                      )}
                      {lead.status === 'lost' && (
                        <div className="flex items-center gap-1 text-xs text-red-500">
                          <XCircle className="h-3.5 w-3.5" />
                          Lost
                        </div>
                      )}
                      <div className="text-xs text-gray-400">
                        {formatDate(lead.created_at)}
                      </div>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {(showForm || editLead) && (
        <LeadFormModal
          lead={editLead}
          onClose={() => { setShowForm(false); setEditLead(null); }}
          onSaved={handleSaved}
        />
      )}

      {convertingLead && (
        <NewDealWizard
          leadPrefill={{
            leadId: convertingLead.id,
            contactName: convertingLead.contact_name,
            contactPhone: convertingLead.contact_phone ?? undefined,
            contactEmail: convertingLead.contact_email ?? undefined,
            address: convertingLead.address ?? undefined,
            city: convertingLead.city ?? undefined,
            state: convertingLead.state ?? undefined,
            zip: convertingLead.zip ?? undefined,
            assignedEmployeeId: convertingLead.assigned_employee_id ?? undefined,
          }}
          onClose={() => setConvertingLead(null)}
          onDealCreated={() => { setConvertingLead(null); loadLeads(); }}
        />
      )}

      {slideOverId && (
        <>
          <div className="fixed inset-0 z-40 bg-black/20" onClick={() => setSlideOverId(null)} />
          <LeadSlideOver
            leadId={slideOverId}
            onClose={() => setSlideOverId(null)}
            onEdit={lead => { setSlideOverId(null); setEditLead(lead); setShowForm(true); }}
            onConvertToDeal={handleConvertToDeal}
            onUpdated={loadLeads}
          />
        </>
      )}
    </div>
  );
}
