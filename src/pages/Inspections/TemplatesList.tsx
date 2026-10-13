import { useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { Search, Layers, Building2, MapPin, Cpu, ChevronRight, ChevronDown, Battery, Bell, Radar, AlertTriangle } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { systemLabel } from './systemTemplates';
import type { SystemTemplate } from './systemTemplates';

interface Props {
  tabs: ReactNode;
  onOpen: (systemId: string) => void;
}

type Grouping = 'customer' | 'system';

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function TemplateRow({ t, onOpen, showCustomer }: { t: SystemTemplate; onOpen: () => void; showCustomer: boolean }) {
  const panel = [t.facp_manufacturer, t.facp_model].filter(Boolean).join(' ');
  return (
    <button
      onClick={onOpen}
      className="group grid w-full grid-cols-1 items-center gap-2 px-4 py-3 text-left transition-colors hover:bg-gray-50/80 md:grid-cols-[minmax(0,2fr)_minmax(0,1.6fr)_auto_auto_16px] md:gap-4"
    >
      <div className="flex min-w-0 items-center gap-3">
        <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-teal-50 text-teal-600 transition-colors group-hover:bg-teal-100">
          <Cpu className="h-4 w-4" />
        </div>
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-gray-900">{systemLabel(t.customer_systems)}</p>
          <p className="flex items-center gap-1 truncate text-xs text-gray-500">
            {showCustomer && t.companies?.name && <><Building2 className="h-3 w-3 flex-shrink-0" />{t.companies.name}<span className="text-gray-300">/</span></>}
            <MapPin className="h-3 w-3 flex-shrink-0" />{t.sites?.name || 'No site'}
          </p>
        </div>
      </div>
      <div className="min-w-0 text-sm text-gray-700">
        <p className="truncate">{panel || <span className="text-gray-400">Panel not recorded</span>}</p>
        <p className="truncate text-xs text-gray-400">
          {[t.slc_loops != null && `${t.slc_loops} SLC`, t.num_zones != null && `${t.num_zones} zones`, t.battery_size_ah && `${t.battery_size_ah} AH`].filter(Boolean).join(' \u00b7 ') || '\u2014'}
        </p>
      </div>
      <div className="flex items-center gap-3 text-xs text-gray-600">
        <span className="inline-flex items-center gap-1" title="Initiating devices"><Radar className="h-3.5 w-3.5 text-blue-500" />{t.devices.length}</span>
        <span className="inline-flex items-center gap-1" title="Notification appliances"><Bell className="h-3.5 w-3.5 text-amber-500" />{t.notification_appliances.length}</span>
        {t.battery_type && <span className="inline-flex items-center gap-1" title="Battery type"><Battery className="h-3.5 w-3.5 text-emerald-500" />{t.battery_type}</span>}
      </div>
      <span className="text-xs text-gray-400 md:text-right">Updated {formatDate(t.updated_at)}</span>
      <ChevronRight className="hidden h-4 w-4 text-gray-300 transition-colors group-hover:text-gray-500 md:block" />
    </button>
  );
}

export default function TemplatesList({ tabs, onOpen }: Props) {
  const [templates, setTemplates] = useState<SystemTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [search, setSearch] = useState('');
  const [grouping, setGrouping] = useState<Grouping>('customer');
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());

  useEffect(() => {
    (async () => {
      const { data, error: err } = await supabase
        .from('inspection_system_templates')
        .select('*, companies(name), sites(name, address, city, state), customer_systems(name, panel_make, panel_model)')
        .order('updated_at', { ascending: false });
      if (err) setError(true);
      else setTemplates((data as SystemTemplate[]) || []);
      setLoading(false);
    })();
  }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return templates;
    return templates.filter(t =>
      [t.companies?.name, t.sites?.name, t.sites?.address, systemLabel(t.customer_systems), t.facp_manufacturer, t.facp_model]
        .some(v => (v || '').toLowerCase().includes(q)),
    );
  }, [templates, search]);

  const groups = useMemo(() => {
    const map = new Map<string, { name: string; items: SystemTemplate[] }>();
    filtered.forEach(t => {
      const key = t.company_id || 'none';
      if (!map.has(key)) map.set(key, { name: t.companies?.name || 'No customer', items: [] });
      map.get(key)!.items.push(t);
    });
    return [...map.entries()].sort((a, b) => a[1].name.localeCompare(b[1].name));
  }, [filtered]);

  const toggle = (key: string) => setCollapsed(prev => {
    const next = new Set(prev);
    if (next.has(key)) next.delete(key); else next.add(key);
    return next;
  });

  const totalDevices = templates.reduce((s, t) => s + t.devices.length + t.notification_appliances.length, 0);

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Inspections</h1>
        <p className="text-sm text-gray-500 mt-1">Saved system templates: panel, power and device details carried into the next inspection</p>
      </div>

      {tabs}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {[
          { label: 'Systems with templates', value: templates.length, icon: Cpu, tone: 'bg-teal-50 text-teal-600' },
          { label: 'Customers', value: new Set(templates.map(t => t.company_id)).size, icon: Building2, tone: 'bg-blue-50 text-blue-600' },
          { label: 'Devices on file', value: totalDevices, icon: Radar, tone: 'bg-amber-50 text-amber-600' },
        ].map(card => (
          <div key={card.label} className="flex items-center gap-3 rounded-xl border border-gray-200 bg-white p-4">
            <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${card.tone}`}><card.icon className="h-5 w-5" /></div>
            <div>
              <p className="text-xl font-bold text-gray-900">{loading ? '\u2014' : card.value}</p>
              <p className="text-xs text-gray-500">{card.label}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="relative min-w-[240px] max-w-md flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search customer, site, system or panel..."
            className="w-full rounded-lg border border-gray-200 py-2.5 pl-9 pr-4 text-sm transition-shadow focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div className="flex items-center gap-1 rounded-lg bg-gray-100 p-1">
          {([['customer', 'By customer'], ['system', 'All systems']] as const).map(([g, label]) => (
            <button
              key={g}
              onClick={() => setGrouping(g)}
              className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${grouping === g ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600 hover:text-gray-900'}`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-blue-600" />
        </div>
      ) : error ? (
        <div className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          <AlertTriangle className="h-4 w-4" /> Templates could not be loaded. Please try again.
        </div>
      ) : filtered.length === 0 ? (
        <div className="py-20 text-center">
          <Layers className="mx-auto mb-3 h-12 w-12 text-gray-300" />
          <p className="text-sm text-gray-500">
            {templates.length === 0
              ? 'No templates yet. A template is saved automatically for a system each time its inspection is saved.'
              : 'No templates match your search.'}
          </p>
        </div>
      ) : grouping === 'system' ? (
        <div className="divide-y divide-gray-100 overflow-hidden rounded-xl border border-gray-200 bg-white">
          {filtered.map(t => <TemplateRow key={t.id} t={t} showCustomer onOpen={() => onOpen(t.system_id)} />)}
        </div>
      ) : (
        <div className="space-y-3">
          {groups.map(([key, g]) => {
            const open = !collapsed.has(key);
            return (
              <div key={key} className="overflow-hidden rounded-xl border border-gray-200 bg-white">
                <button
                  onClick={() => toggle(key)}
                  className="flex w-full items-center justify-between gap-3 bg-gray-50/70 px-4 py-2.5 text-left transition-colors hover:bg-gray-100/70"
                >
                  <span className="flex items-center gap-2">
                    <ChevronDown className={`h-4 w-4 text-gray-400 transition-transform ${open ? '' : '-rotate-90'}`} />
                    <Building2 className="h-4 w-4 text-gray-400" />
                    <span className="text-sm font-semibold text-gray-900">{g.name}</span>
                  </span>
                  <span className="text-xs text-gray-500">{g.items.length} system{g.items.length === 1 ? '' : 's'}</span>
                </button>
                {open && (
                  <div className="divide-y divide-gray-100">
                    {g.items.map(t => <TemplateRow key={t.id} t={t} showCustomer={false} onOpen={() => onOpen(t.system_id)} />)}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
