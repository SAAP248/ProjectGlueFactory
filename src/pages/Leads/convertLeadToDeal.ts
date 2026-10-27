import { supabase } from '../../lib/supabase';
import { generateProposalToken } from '../Deals/NewDealWizard/types';
import type { Lead, LeadLineItem, LeadSystem } from './types';

export interface ConversionResult {
  dealId: string;
  missing: string[];
}

function splitName(full: string) {
  const parts = full.trim().split(/\s+/);
  if (parts.length === 1) return { first: parts[0], last: '' };
  return { first: parts.slice(0, -1).join(' '), last: parts[parts.length - 1] };
}

export async function convertLeadToDeal(lead: Lead): Promise<ConversionResult> {
  const [{ data: sysData, error: sysErr }, { data: itemData, error: itemErr }] = await Promise.all([
    supabase.from('lead_systems').select('*').eq('lead_id', lead.id).order('sort_order'),
    supabase.from('lead_line_items').select('*').eq('lead_id', lead.id).order('sort_order'),
  ]);
  if (sysErr || itemErr) throw new Error('Could not read the lead details.');
  const systems = (sysData ?? []) as LeadSystem[];
  const items = (itemData ?? []) as LeadLineItem[];

  const { data: co, error: coErr } = await supabase.from('companies').insert({
    name: lead.contact_name.trim(),
    customer_type: 'residential',
    status: 'prospect',
    billing_address: lead.address || null,
    billing_city: lead.city || null,
    billing_state: lead.state || null,
    billing_zip: lead.zip || null,
  }).select('id').maybeSingle();
  if (coErr || !co) throw new Error('Could not create the customer.');
  const companyId = co.id as string;

  const extras = [];
  if (lead.contact_phone) {
    extras.push(supabase.from('company_phones').insert({ company_id: companyId, label: 'Mobile', phone_number: lead.contact_phone, is_primary: true }));
  }
  if (lead.contact_email) {
    extras.push(supabase.from('company_emails').insert({ company_id: companyId, label: 'Primary', email_address: lead.contact_email, is_primary: true }));
  }
  const { first, last } = splitName(lead.contact_name);
  extras.push(supabase.from('contacts').insert({
    company_id: companyId,
    first_name: first,
    last_name: last,
    phone: lead.contact_phone || null,
    email: lead.contact_email || null,
    is_primary: true,
  }));
  await Promise.all(extras);

  const { data: site } = await supabase.from('sites').insert({
    company_id: companyId,
    name: `${lead.contact_name.trim()} - Main`,
    address: lead.address ?? '',
    city: lead.city ?? '',
    state: lead.state ?? '',
    zip: lead.zip ?? '',
    site_type: 'residential',
  }).select('id').maybeSingle();
  const siteId = (site?.id as string | undefined) ?? null;

  const total = items.reduce((s, i) => s + Number(i.quantity) * Number(i.unit_price), 0);
  const token = generateProposalToken();
  const title = `${lead.contact_name.trim()} - ${systems.length ? systems.map(s => s.system_type_name).join(', ') : 'New Proposal'}`;

  const { data: deal, error: dealErr } = await supabase.from('deals').insert({
    company_id: companyId,
    site_id: siteId,
    title,
    value: total,
    probability: 20,
    sales_stage: 'Lead',
    forecast_category: 'pipeline',
    stage_entered_at: new Date().toISOString(),
    proposal_token: token,
    internal_notes: lead.notes || null,
    assigned_employee_id: lead.assigned_employee_id || null,
  }).select('id').maybeSingle();
  if (dealErr || !deal) throw new Error('Could not create the deal.');
  const dealId = deal.id as string;

  if (systems.length) {
    await supabase.from('deal_systems').insert(systems.map((s, idx) => ({
      deal_id: dealId,
      system_type_id: s.system_type_id,
      package_id: s.package_id,
      name: s.system_type_name,
      sort_order: idx,
    })));
  }

  const { data: estimate } = await supabase.from('estimates').insert({
    estimate_number: `EST-${token}`,
    company_id: companyId,
    site_id: siteId,
    deal_id: dealId,
    status: 'draft',
    estimate_date: new Date().toISOString().slice(0, 10),
    subtotal: total,
    tax: 0,
    total,
  }).select('id').maybeSingle();

  if (estimate && items.length) {
    await supabase.from('estimate_line_items').insert(items.map((i, idx) => ({
      estimate_id: estimate.id,
      product_id: i.product_id,
      description: i.description,
      quantity: i.quantity,
      unit_price: i.unit_price,
      unit_cost: i.unit_cost,
      total: Number(i.quantity) * Number(i.unit_price),
      sort_order: idx,
    })));
  }

  await Promise.all([
    supabase.from('work_orders').update({ deal_id: dealId, company_id: companyId, site_id: siteId }).eq('lead_id', lead.id),
    supabase.from('leads').update({ status: 'converted', converted_deal_id: dealId, updated_at: new Date().toISOString() }).eq('id', lead.id),
    supabase.from('lead_activity_log').insert({ lead_id: lead.id, action: 'Converted to Deal', notes: `Deal created: ${title}` }),
  ]);

  const missing: string[] = [];
  if (!lead.contact_phone) missing.push('Customer phone number');
  if (!lead.contact_email) missing.push('Customer email address');
  if (!lead.address || !lead.city || !lead.state || !lead.zip) missing.push('Complete site address');
  if (!lead.assigned_employee_id) missing.push('Assigned salesperson');
  if (!systems.length) missing.push('Systems being installed');
  if (!items.length) missing.push('Equipment and pricing on the estimate');
  missing.push('Scope of work');
  missing.push('Terms and deposit');
  missing.push('Expected close date');

  return { dealId, missing };
}
