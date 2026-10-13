import { supabase } from '../../lib/supabase';
import type { TemplatePage } from './types';

export type DeviceRow = Record<string, string>;

export interface SystemTemplate {
  id: string;
  system_id: string;
  company_id: string | null;
  site_id: string | null;
  facp_manufacturer: string;
  facp_model: string;
  software_revision: string;
  slc_loops: number | null;
  num_zones: number | null;
  battery_type: string;
  battery_size_ah: string;
  devices: DeviceRow[];
  notification_appliances: DeviceRow[];
  source_inspection_id: string | null;
  updated_by: string | null;
  created_at: string;
  updated_at: string;
  companies?: { name: string } | null;
  sites?: { name: string; address: string | null; city: string | null; state: string | null } | null;
  customer_systems?: { name: string | null; panel_make: string | null; panel_model: string | null } | null;
  inspections?: { inspection_number: string } | null;
}

export interface SystemOption {
  id: string;
  name: string | null;
  panel_make: string | null;
  panel_model: string | null;
}

export const DEVICE_COLUMNS = [
  { id: 'device_location', label: 'Location / Zone' },
  { id: 'device_type', label: 'Type' },
  { id: 'device_address', label: 'Address / ID' },
  { id: 'device_manufacturer', label: 'Manufacturer' },
  { id: 'device_model', label: 'Model' },
];

export const NAC_COLUMNS = [
  { id: 'nac_type', label: 'Type' },
  { id: 'nac_location', label: 'Location' },
  { id: 'nac_manufacturer', label: 'Manufacturer' },
  { id: 'nac_model', label: 'Model #' },
  { id: 'nac_serial', label: 'Serial #' },
  { id: 'nac_candela', label: 'Candela' },
];

const TEXT_FIELDS = {
  sys_manufacturer: 'facp_manufacturer',
  sys_model: 'facp_model',
  sys_software_rev: 'software_revision',
  sys_battery_type: 'battery_type',
  sys_battery_size: 'battery_size_ah',
} as const;

const NUMBER_FIELDS = {
  sys_num_loops: 'slc_loops',
  sys_num_zones: 'num_zones',
} as const;

const DEVICE_FIELD = 'ft_device_table';
const NAC_FIELD = 'ft_nac_device_table';

export function systemLabel(s: { name?: string | null; panel_make?: string | null; panel_model?: string | null } | null | undefined) {
  if (!s) return 'Unnamed system';
  const panel = [s.panel_make, s.panel_model].filter(Boolean).join(' ');
  return s.name || panel || 'Unnamed system';
}

function keepColumns(rows: unknown, columns: { id: string }[]): DeviceRow[] {
  if (!Array.isArray(rows)) return [];
  return rows
    .filter((r): r is Record<string, unknown> => !!r && typeof r === 'object')
    .map(r => Object.fromEntries(columns.map(c => [c.id, r[c.id] == null ? '' : String(r[c.id])])))
    .filter(r => Object.values(r).some(v => v.trim() !== ''));
}

function toInt(v: unknown): number | null {
  if (v === null || v === undefined || v === '') return null;
  const n = Number(v);
  return Number.isFinite(n) ? Math.round(n) : null;
}

export async function loadSiteSystems(siteId: string): Promise<SystemOption[]> {
  const { data, error } = await supabase
    .from('customer_systems')
    .select('id, name, panel_make, panel_model')
    .eq('site_id', siteId)
    .order('name');
  if (error) return [];
  return (data as SystemOption[]) || [];
}

export async function loadTemplateForSystem(systemId: string): Promise<SystemTemplate | null> {
  const { data } = await supabase
    .from('inspection_system_templates')
    .select('*')
    .eq('system_id', systemId)
    .maybeSingle();
  return (data as SystemTemplate) || null;
}

/** Fields left blank on the inspection keep the template's previous value. */
export async function saveSystemTemplate(
  inspection: { id: string; system_id: string | null; company_id: string | null; site_id: string | null },
  values: Record<string, unknown>,
  updatedBy: string | null,
): Promise<string | null> {
  let systemId = inspection.system_id;
  if (!systemId && inspection.site_id) {
    const systems = await loadSiteSystems(inspection.site_id);
    if (systems.length !== 1) return null;
    systemId = systems[0].id;
    await supabase.from('inspections').update({ system_id: systemId }).eq('id', inspection.id);
  }
  if (!systemId) return null;

  const existing = await loadTemplateForSystem(systemId);
  const row: Record<string, unknown> = {
    system_id: systemId,
    company_id: inspection.company_id,
    site_id: inspection.site_id,
    source_inspection_id: inspection.id,
    updated_by: updatedBy,
    updated_at: new Date().toISOString(),
  };

  for (const [fieldId, col] of Object.entries(TEXT_FIELDS)) {
    const v = values[fieldId];
    const text = v == null ? '' : String(v).trim();
    row[col] = text || (existing ? existing[col] : '');
  }
  for (const [fieldId, col] of Object.entries(NUMBER_FIELDS)) {
    const n = toInt(values[fieldId]);
    row[col] = n ?? (existing ? existing[col] : null);
  }
  const devices = keepColumns(values[DEVICE_FIELD], DEVICE_COLUMNS);
  const nacs = keepColumns(values[NAC_FIELD], NAC_COLUMNS);
  row.devices = devices.length ? devices : existing?.devices ?? [];
  row.notification_appliances = nacs.length ? nacs : existing?.notification_appliances ?? [];

  const { error } = await supabase
    .from('inspection_system_templates')
    .upsert(row, { onConflict: 'system_id' });
  return error ? null : systemId;
}

function pageIndexOf(pages: TemplatePage[], fieldId: string): number {
  const idx = pages.findIndex(p => p.sections.some(s => s.fields.some(f => f.id === fieldId)));
  return idx < 0 ? 0 : idx;
}

export function templateFieldRows(tpl: SystemTemplate, pages: TemplatePage[], inspectionId: string) {
  const values: Record<string, unknown> = {};
  for (const [fieldId, col] of Object.entries(TEXT_FIELDS)) {
    if (tpl[col]) values[fieldId] = tpl[col];
  }
  for (const [fieldId, col] of Object.entries(NUMBER_FIELDS)) {
    if (tpl[col] !== null) values[fieldId] = tpl[col];
  }
  if (tpl.devices.length) {
    values[DEVICE_FIELD] = tpl.devices.map(d => ({ ...d, device_sensitivity: '', device_result: '', device_notes: '' }));
  }
  if (tpl.notification_appliances.length) {
    values[NAC_FIELD] = tpl.notification_appliances.map(d => ({ ...d, nac_result: '', nac_photo: '', nac_notes: '' }));
  }
  return Object.entries(values).map(([field_id, value]) => ({
    inspection_id: inspectionId,
    field_id,
    page_index: pageIndexOf(pages, field_id),
    value,
  }));
}
