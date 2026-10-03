import { supabase } from '../../lib/supabase';

export interface CustomerLineItem {
  id: string;
  description: string | null;
  quantity: number;
  unit_price: number;
  system_group_id: string | null;
  room_id: string | null;
}

export interface CustomerEstimate {
  id: string;
  estimate_number: string;
  status: string;
  view_mode: 'estimate' | 'proposal';
  estimate_date: string | null;
  expiration_date: string | null;
  subtotal: number;
  tax: number;
  total: number;
  notes: string | null;
  terms: string | null;
  grouping_mode: string | null;
  scope_of_work: string | null;
  cover_title: string | null;
  cover_image_url: string | null;
  accepted_at: string | null;
  declined_at: string | null;
  declined_reason: string | null;
  customer_name_signed: string | null;
  signature_type: 'typed' | 'drawn' | null;
  signature_data: string | null;
}

export interface Address {
  name?: string | null;
  address?: string | null;
  city?: string | null;
  state?: string | null;
  zip?: string | null;
}

export interface CustomerEstimateData {
  estimate: CustomerEstimate;
  company: { name: string; billing_address: string | null; billing_city: string | null; billing_state: string | null; billing_zip: string | null } | null;
  site: Address | null;
  deal_title: string | null;
  line_items: CustomerLineItem[];
  systems: { id: string; name: string }[];
  rooms: { id: string; name: string }[];
  business: (Address & { phone: string | null; license_number: string | null }) | null;
  settings: Record<string, string>;
}

export interface EstimateMessage {
  id: string;
  sender_type: 'customer' | 'staff';
  sender_name: string;
  message: string;
  reference_type: string | null;
  reference_label: string | null;
  attachment_path: string | null;
  attachment_name: string | null;
  attachment_type: string | null;
  attachment_size: number | null;
  created_at: string;
}

export const MAX_FILE_BYTES = 10 * 1024 * 1024;
export const ALLOWED_FILE_TYPES = [
  'image/png', 'image/jpeg', 'image/gif', 'image/webp', 'image/heic', 'application/pdf', 'text/plain', 'text/csv',
  'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
];
export const FILE_ACCEPT = '.png,.jpg,.jpeg,.gif,.webp,.heic,.pdf,.txt,.csv,.doc,.docx,.xls,.xlsx';

export function formatMoney(n: number): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(Number(n) || 0);
}

export function formatLongDate(d: string | null): string {
  if (!d) return '';
  return new Date(d.length === 10 ? `${d}T00:00:00` : d).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
}

export function formatBytes(n: number | null): string {
  if (!n) return '';
  if (n < 1024 * 1024) return `${Math.max(1, Math.round(n / 1024))} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}

export function addressLines(a: Address | null | undefined): string[] {
  if (!a) return [];
  const cityLine = [a.city, [a.state, a.zip].filter(Boolean).join(' ')].filter(Boolean).join(', ');
  return [a.address, cityLine].filter((x): x is string => !!x);
}

export function isExpired(est: CustomerEstimate): boolean {
  if (!est.expiration_date) return false;
  const today = new Date().toISOString().slice(0, 10);
  return est.expiration_date < today;
}

export function validateFile(file: File): string | null {
  if (file.size > MAX_FILE_BYTES) return 'Files must be 10 MB or smaller.';
  if (!ALLOWED_FILE_TYPES.includes(file.type)) return 'Please upload an image, PDF, Word, Excel or text file.';
  return null;
}

export async function uploadEstimateFile(estimateId: string, file: File): Promise<{ path: string | null; error: string | null }> {
  const invalid = validateFile(file);
  if (invalid) return { path: null, error: invalid };
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_').slice(-80);
  const path = `${estimateId}/${crypto.randomUUID()}-${safeName}`;
  const { error } = await supabase.storage.from('estimate-files').upload(path, file, { contentType: file.type, upsert: false });
  if (error) return { path: null, error: 'The file could not be uploaded. Please try again.' };
  return { path, error: null };
}

export async function getFileUrl(path: string): Promise<string | null> {
  const { data } = await supabase.storage.from('estimate-files').createSignedUrl(path, 3600);
  return data?.signedUrl ?? null;
}

function isCustomerData(v: unknown): v is CustomerEstimateData {
  return !!v && typeof v === 'object' && 'estimate' in v && Array.isArray((v as CustomerEstimateData).line_items);
}

export async function fetchCustomerEstimate(token: string): Promise<{ data: CustomerEstimateData | null; error: string | null }> {
  const { data, error } = await supabase.rpc('get_customer_estimate', { p_token: token });
  if (error) return { data: null, error: 'We could not load this document. Please try again in a moment.' };
  if (!isCustomerData(data)) return { data: null, error: 'This link is not valid. Please check it or ask your sales representative for a new one.' };
  return { data: { ...data, settings: data.settings || {} }, error: null };
}

export async function markViewed(token: string) {
  await supabase.rpc('mark_estimate_viewed', { p_token: token });
}

export async function resolveDealToken(dealToken: string): Promise<string | null> {
  const { data } = await supabase.rpc('resolve_deal_proposal', { p_deal_token: dealToken });
  return typeof data === 'string' ? data : null;
}

const RESPONSE_ERRORS: Record<string, string> = {
  already_responded: 'A response has already been recorded for this document.',
  expired: 'This document has expired. Please ask us for an updated version.',
  invalid_name: 'Please enter your full name.',
  invalid_signature: 'Please provide your signature.',
};

export async function respond(
  token: string,
  action: 'accept' | 'decline',
  fields: { name?: string; email?: string; signatureType?: 'typed' | 'drawn'; signatureData?: string | null; reason?: string }
): Promise<string | null> {
  const { error } = await supabase.rpc('respond_to_estimate', {
    p_token: token,
    p_action: action,
    p_name: fields.name ?? null,
    p_email: fields.email ?? null,
    p_signature_type: fields.signatureType ?? null,
    p_signature_data: fields.signatureData ?? null,
    p_reason: fields.reason ?? null,
  });
  if (!error) return null;
  const key = Object.keys(RESPONSE_ERRORS).find((k) => error.message.includes(k));
  return key ? RESPONSE_ERRORS[key] : 'Something went wrong while saving your response. Please try again.';
}

export async function fetchMessages(token: string): Promise<EstimateMessage[] | null> {
  const { data, error } = await supabase.rpc('list_estimate_messages', { p_token: token });
  if (error || !Array.isArray(data)) return null;
  return data as EstimateMessage[];
}

export async function postCustomerMessage(
  token: string,
  input: {
    name: string;
    message: string;
    reference?: { type: 'product' | 'room' | 'system'; id: string | null; label: string } | null;
    attachment?: { path: string; name: string; type: string; size: number } | null;
  }
): Promise<string | null> {
  const { error } = await supabase.rpc('post_estimate_message', {
    p_token: token,
    p_name: input.name,
    p_message: input.message,
    p_reference_type: input.reference?.type ?? null,
    p_reference_id: input.reference?.id ?? null,
    p_reference_label: input.reference?.label ?? null,
    p_attachment_path: input.attachment?.path ?? null,
    p_attachment_name: input.attachment?.name ?? null,
    p_attachment_type: input.attachment?.type ?? null,
    p_attachment_size: input.attachment?.size ?? null,
  });
  return error ? 'Your message could not be sent. Please try again.' : null;
}

export function subscribeToMessages(estimateId: string, onChange: () => void): () => void {
  const channel = supabase
    .channel(`estimate-messages-${estimateId}-${Math.random().toString(36).slice(2)}`)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'proposal_messages', filter: `estimate_id=eq.${estimateId}` }, onChange)
    .subscribe();
  return () => { supabase.removeChannel(channel); };
}
