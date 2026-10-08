import { supabase } from '../../lib/supabase';

export type SearchRecordType = 'customer' | 'work_order' | 'invoice' | 'agreement';

export interface SearchHit {
  type: SearchRecordType;
  id: string;
  label: string;
  sublabel: string;
}

export interface RecentSearch extends SearchHit {
  rowId: string;
  query: string;
  searchedAt: string;
  available: boolean;
}

// Stand-in for the signed-in user until the app has logins.
export const CURRENT_USER_KEY = 'demo-user';
const RECENT_LIMIT = 5;
const PER_GROUP = 4;

const TABLE_FOR_TYPE: Record<SearchRecordType, string> = {
  customer: 'companies',
  work_order: 'work_orders',
  invoice: 'invoices',
  agreement: 'sp_agreements',
};

function cleanTerm(raw: string): string {
  return raw.replace(/[,()*%\\]/g, ' ').trim();
}

function companyName(row: { companies?: { name?: string } | { name?: string }[] | null }): string {
  const c = Array.isArray(row.companies) ? row.companies[0] : row.companies;
  return c?.name ?? '';
}

export async function searchRecords(raw: string): Promise<SearchHit[]> {
  const term = cleanTerm(raw);
  if (term.length < 2) return [];
  const like = `%${term}%`;

  const [customers, workOrders, invoices, agreements] = await Promise.all([
    supabase.from('companies').select('id, name, account_number')
      .or(`name.ilike.${like},account_number.ilike.${like}`).order('name').limit(PER_GROUP),
    supabase.from('work_orders').select('id, wo_number, title, companies(name)')
      .or(`wo_number.ilike.${like},title.ilike.${like}`).order('created_at', { ascending: false }).limit(PER_GROUP),
    supabase.from('invoices').select('id, invoice_number, companies(name)')
      .ilike('invoice_number', like).order('created_at', { ascending: false }).limit(PER_GROUP),
    supabase.from('sp_agreements').select('id, agreement_number, companies(name)')
      .ilike('agreement_number', like).order('agreement_number').limit(PER_GROUP),
  ]);

  const failed = [customers, workOrders, invoices, agreements].find(r => r.error);
  if (failed?.error) throw failed.error;

  return [
    ...(customers.data ?? []).map(r => ({ type: 'customer' as const, id: r.id, label: r.name ?? 'Unnamed customer', sublabel: r.account_number ?? '' })),
    ...(workOrders.data ?? []).map(r => ({ type: 'work_order' as const, id: r.id, label: r.wo_number ?? 'Work order', sublabel: [r.title, companyName(r)].filter(Boolean).join(' · ') })),
    ...(invoices.data ?? []).map(r => ({ type: 'invoice' as const, id: r.id, label: r.invoice_number ?? 'Invoice', sublabel: companyName(r) })),
    ...(agreements.data ?? []).map(r => ({ type: 'agreement' as const, id: r.id, label: r.agreement_number ?? 'Agreement', sublabel: companyName(r) })),
  ];
}

export async function fetchRecentSearches(): Promise<RecentSearch[]> {
  const { data, error } = await supabase
    .from('recent_searches')
    .select('id, query, record_type, record_id, label, sublabel, searched_at')
    .eq('user_key', CURRENT_USER_KEY)
    .order('searched_at', { ascending: false })
    .limit(RECENT_LIMIT);
  if (error) throw error;
  const rows = data ?? [];

  const idsByType = new Map<SearchRecordType, string[]>();
  rows.forEach(r => {
    const t = r.record_type as SearchRecordType;
    idsByType.set(t, [...(idsByType.get(t) ?? []), r.record_id]);
  });
  const existing = new Set<string>();
  await Promise.all([...idsByType.entries()].map(async ([type, ids]) => {
    const { data: found, error: e } = await supabase.from(TABLE_FOR_TYPE[type]).select('id').in('id', ids);
    if (e) { ids.forEach(id => existing.add(id)); return; }
    (found ?? []).forEach((f: { id: string }) => existing.add(f.id));
  }));

  return rows.map(r => ({
    rowId: r.id,
    type: r.record_type as SearchRecordType,
    id: r.record_id,
    label: r.label,
    sublabel: r.sublabel,
    query: r.query,
    searchedAt: r.searched_at,
    available: existing.has(r.record_id),
  }));
}

export async function saveRecentSearch(hit: SearchHit, query: string): Promise<void> {
  const { error } = await supabase.from('recent_searches').upsert({
    user_key: CURRENT_USER_KEY,
    query: query.trim(),
    record_type: hit.type,
    record_id: hit.id,
    label: hit.label,
    sublabel: hit.sublabel,
    searched_at: new Date().toISOString(),
  }, { onConflict: 'user_key,record_type,record_id' });
  if (error) throw error;

  const { data: overflow, error: listError } = await supabase
    .from('recent_searches').select('id')
    .eq('user_key', CURRENT_USER_KEY)
    .order('searched_at', { ascending: false })
    .range(RECENT_LIMIT, RECENT_LIMIT + 50);
  if (listError || !overflow?.length) return;
  await supabase.from('recent_searches').delete().in('id', overflow.map(o => o.id));
}

export async function removeRecentSearch(rowId: string): Promise<void> {
  const { error } = await supabase.from('recent_searches').delete().eq('id', rowId);
  if (error) throw error;
}

export async function clearRecentSearches(): Promise<void> {
  const { error } = await supabase.from('recent_searches').delete().eq('user_key', CURRENT_USER_KEY);
  if (error) throw error;
}
