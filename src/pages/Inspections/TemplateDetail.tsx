import { useEffect, useState } from 'react';
import { ArrowLeft, Cpu, Building2, MapPin, Battery, Bell, Radar, ClipboardCheck, FileText, AlertTriangle, Layers } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { DEVICE_COLUMNS, NAC_COLUMNS, systemLabel } from './systemTemplates';
import type { DeviceRow, SystemTemplate } from './systemTemplates';

interface Props {
  systemId: string;
  onBack: () => void;
  onStartInspection: (pre: { companyId: string; siteId: string | null; systemId: string }) => void;
  onOpenInspection: (id: string) => void;
}

function Spec({ label, value }: { label: string; value: string | number | null }) {
  const empty = value === null || value === '';
  return (
    <div>
      <p className="text-[11px] font-medium uppercase tracking-wide text-gray-400">{label}</p>
      <p className={`mt-0.5 text-sm ${empty ? 'text-gray-300' : 'font-medium text-gray-900'}`}>{empty ? 'Not recorded' : value}</p>
    </div>
  );
}

function DeviceTable({ title, icon, rows, columns, tone }: {
  title: string; icon: JSX.Element; rows: DeviceRow[]; columns: { id: string; label: string }[]; tone: string;
}) {
  return (
    <section className="overflow-hidden rounded-xl border border-gray-200 bg-white">
      <header className="flex items-center justify-between border-b border-gray-100 px-4 py-3">
        <h3 className="flex items-center gap-2 text-sm font-semibold text-gray-900">
          <span className={`flex h-7 w-7 items-center justify-center rounded-lg ${tone}`}>{icon}</span>
          {title}
        </h3>
        <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-600">{rows.length}</span>
      </header>
      {rows.length === 0 ? (
        <p className="px-4 py-8 text-center text-sm text-gray-400">None recorded yet.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50/60">
                <th className="w-10 px-4 py-2 text-left text-xs font-semibold text-gray-400">#</th>
                {columns.map(c => (
                  <th key={c.id} className="whitespace-nowrap px-4 py-2 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">{c.label}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {rows.map((r, i) => (
                <tr key={i} className="transition-colors hover:bg-gray-50/60">
                  <td className="px-4 py-2 text-xs text-gray-400">{i + 1}</td>
                  {columns.map(c => (
                    <td key={c.id} className="whitespace-nowrap px-4 py-2 text-gray-700">{r[c.id] || <span className="text-gray-300">{'\u2014'}</span>}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

export default function TemplateDetail({ systemId, onBack, onStartInspection, onOpenInspection }: Props) {
  const [tpl, setTpl] = useState<SystemTemplate | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const { data, error: err } = await supabase
        .from('inspection_system_templates')
        .select('*, companies(name), sites(name, address, city, state), customer_systems(name, panel_make, panel_model), inspections(inspection_number)')
        .eq('system_id', systemId)
        .maybeSingle();
      if (err) setError(true);
      setTpl((data as SystemTemplate) || null);
      setLoading(false);
    })();
  }, [systemId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-32">
        <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-blue-600" />
      </div>
    );
  }

  if (!tpl) {
    return (
      <div className="p-6">
        <button onClick={onBack} className="mb-4 flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700">
          <ArrowLeft className="h-4 w-4" /> Back to templates
        </button>
        <div className="flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          <AlertTriangle className="h-4 w-4" />
          {error ? 'This template could not be loaded.' : 'No template has been saved for this system yet.'}
        </div>
      </div>
    );
  }

  const siteAddr = [tpl.sites?.address, tpl.sites?.city, tpl.sites?.state].filter(Boolean).join(', ');

  return (
    <div className="p-6 space-y-6">
      <button onClick={onBack} className="flex items-center gap-1 text-sm text-gray-500 transition-colors hover:text-gray-700">
        <ArrowLeft className="h-4 w-4" /> Back to templates
      </button>

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-start gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-teal-50 text-teal-600">
            <Layers className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{systemLabel(tpl.customer_systems)}</h1>
            <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-gray-500">
              <span className="flex items-center gap-1"><Building2 className="h-3.5 w-3.5" />{tpl.companies?.name || 'No customer'}</span>
              <span className="flex items-center gap-1"><MapPin className="h-3.5 w-3.5" />{tpl.sites?.name || 'No site'}{siteAddr && <span className="text-gray-400">{' \u00b7 '}{siteAddr}</span>}</span>
            </div>
            <p className="mt-1 text-xs text-gray-400">
              Updated {new Date(tpl.updated_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
              {tpl.updated_by && ` by ${tpl.updated_by}`}
              {tpl.source_inspection_id && tpl.inspections?.inspection_number && (
                <>
                  {' from '}
                  <button onClick={() => onOpenInspection(tpl.source_inspection_id!)} className="inline-flex items-center gap-0.5 font-medium text-blue-600 hover:text-blue-700">
                    <FileText className="h-3 w-3" />{tpl.inspections.inspection_number}
                  </button>
                </>
              )}
            </p>
          </div>
        </div>
        {tpl.company_id && (
          <button
            onClick={() => onStartInspection({ companyId: tpl.company_id!, siteId: tpl.site_id, systemId: tpl.system_id })}
            className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-blue-700"
          >
            <ClipboardCheck className="h-4 w-4" /> Start inspection from this template
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <section className="rounded-xl border border-gray-200 bg-white p-5 lg:col-span-2">
          <h3 className="mb-4 flex items-center gap-2 text-sm font-semibold text-gray-900">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-50 text-blue-600"><Cpu className="h-4 w-4" /></span>
            Fire Alarm Control Panel
          </h3>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
            <Spec label="Manufacturer" value={tpl.facp_manufacturer} />
            <Spec label="Model" value={tpl.facp_model} />
            <Spec label="Software revision" value={tpl.software_revision} />
            <Spec label="SLC loops" value={tpl.slc_loops} />
            <Spec label="Number of zones" value={tpl.num_zones} />
          </div>
        </section>
        <section className="rounded-xl border border-gray-200 bg-white p-5">
          <h3 className="mb-4 flex items-center gap-2 text-sm font-semibold text-gray-900">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600"><Battery className="h-4 w-4" /></span>
            Batteries
          </h3>
          <div className="grid grid-cols-2 gap-4">
            <Spec label="Battery type" value={tpl.battery_type} />
            <Spec label="Size (AH)" value={tpl.battery_size_ah} />
          </div>
        </section>
      </div>

      <DeviceTable title="Initiating Devices" icon={<Radar className="h-4 w-4" />} tone="bg-blue-50 text-blue-600" rows={tpl.devices} columns={DEVICE_COLUMNS} />
      <DeviceTable title="Notification Appliances" icon={<Bell className="h-4 w-4" />} tone="bg-amber-50 text-amber-600" rows={tpl.notification_appliances} columns={NAC_COLUMNS} />
    </div>
  );
}
