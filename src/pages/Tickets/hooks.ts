import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../lib/supabase';
import type { Ticket, TicketDetail, TicketComment, TicketLinkedRecord, LinkedRecordType } from './types';

export function useTickets(refreshKey = 0) {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const { data, error: err } = await supabase
      .from('tickets')
      .select(`
        id, ticket_number, title, description, status, priority, ticket_type,
        source, company_id, assigned_to, show_in_customer_portal,
        created_by_portal_user_id, due_date, first_response_at, resolved_at,
        closed_at, converted_to_work_order_id, converted_to_task_id,
        created_at, updated_at,
        companies(name),
        employees(first_name, last_name)
      `)
      .order('created_at', { ascending: false });

    if (err) { setError(err.message); setLoading(false); return; }

    const ticketIds = (data || []).map((t: any) => t.id);
    let commentCounts: Record<string, number> = {};

    if (ticketIds.length > 0) {
      const { data: counts } = await supabase
        .from('ticket_comments')
        .select('ticket_id')
        .in('ticket_id', ticketIds);
      if (counts) {
        counts.forEach((c: any) => {
          commentCounts[c.ticket_id] = (commentCounts[c.ticket_id] || 0) + 1;
        });
      }
    }

    const result = (data || []).map((t: any) => ({
      ...t,
      comment_count: commentCounts[t.id] || 0,
    }));

    setTickets(result as Ticket[]);
    setLoading(false);
  }, [refreshKey]);

  useEffect(() => { load(); }, [load]);

  return { tickets, loading, error, reload: load };
}

export function useTicketDetail(ticketId: string | null) {
  const [ticket, setTicket] = useState<TicketDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!ticketId) { setTicket(null); return; }
    setLoading(true);
    setError(null);

    const [ticketRes, commentsRes, attachmentsRes, linkedRes, timelineRes] = await Promise.all([
      supabase.from('tickets').select(`
        id, ticket_number, title, description, status, priority, ticket_type,
        source, company_id, assigned_to, show_in_customer_portal,
        created_by_portal_user_id, due_date, first_response_at, resolved_at,
        closed_at, converted_to_work_order_id, converted_to_task_id,
        created_at, updated_at,
        companies(name),
        employees(first_name, last_name)
      `).eq('id', ticketId).maybeSingle(),
      supabase.from('ticket_comments').select(`
        id, ticket_id, body, is_public, author_employee_id, author_portal_user_id,
        created_at, updated_at,
        employees(first_name, last_name),
        customer_portal_users(first_name, last_name)
      `).eq('ticket_id', ticketId).order('created_at', { ascending: true }),
      supabase.from('ticket_attachments').select('*').eq('ticket_id', ticketId).order('created_at'),
      supabase.from('ticket_linked_records').select('*').eq('ticket_id', ticketId),
      supabase.from('ticket_timeline').select(`
        id, ticket_id, event_type, description, actor_employee_id,
        actor_portal_user_id, metadata, created_at,
        employees(first_name, last_name)
      `).eq('ticket_id', ticketId).order('created_at', { ascending: true }),
    ]);

    if (ticketRes.error) { setError(ticketRes.error.message); setLoading(false); return; }
    if (!ticketRes.data) { setError('Ticket not found'); setLoading(false); return; }

    const linkedWithNames = await resolveLinkedRecordNames(linkedRes.data || []);

    setTicket({
      ...(ticketRes.data as any),
      comments: commentsRes.data || [],
      attachments: attachmentsRes.data || [],
      linked_records: linkedWithNames,
      timeline: timelineRes.data || [],
    });
    setLoading(false);
  }, [ticketId]);

  useEffect(() => { load(); }, [load]);

  return { ticket, loading, error, reload: load };
}

async function resolveLinkedRecordNames(records: TicketLinkedRecord[]): Promise<TicketLinkedRecord[]> {
  if (!records.length) return records;

  const byType: Record<string, string[]> = {};
  records.forEach(r => {
    if (!byType[r.record_type]) byType[r.record_type] = [];
    byType[r.record_type].push(r.record_id);
  });

  const nameMap: Record<string, string> = {};

  await Promise.all(
    Object.entries(byType).map(async ([type, ids]) => {
      let data: any[] | null = null;
      if (type === 'site') {
        const res = await supabase.from('sites').select('id, name').in('id', ids);
        data = res.data;
      } else if (type === 'system') {
        const res = await supabase.from('customer_systems').select('id, name').in('id', ids);
        data = res.data;
      } else if (type === 'deal') {
        const res = await supabase.from('deals').select('id, title').in('id', ids);
        data = res.data?.map((d: any) => ({ id: d.id, name: d.title }));
      } else if (type === 'invoice') {
        const res = await supabase.from('invoices').select('id, invoice_number').in('id', ids);
        data = res.data?.map((d: any) => ({ id: d.id, name: `Invoice #${d.invoice_number}` }));
      } else if (type === 'work_order') {
        const res = await supabase.from('work_orders').select('id, wo_number, title').in('id', ids);
        data = res.data?.map((d: any) => ({ id: d.id, name: `${d.wo_number} - ${d.title}` }));
      }
      (data || []).forEach((d: any) => { nameMap[d.id] = d.name; });
    })
  );

  return records.map(r => ({ ...r, display_name: nameMap[r.record_id] || r.record_id }));
}

export async function addTicketComment(
  ticketId: string,
  body: string,
  isPublic: boolean,
  authorEmployeeId?: string
): Promise<{ data: TicketComment | null; error: string | null }> {
  const payload: any = {
    ticket_id: ticketId,
    body,
    is_public: isPublic,
    author_employee_id: authorEmployeeId || null,
  };

  const { data, error } = await supabase
    .from('ticket_comments')
    .insert(payload)
    .select('id, ticket_id, body, is_public, author_employee_id, author_portal_user_id, created_at, updated_at')
    .single();

  if (error) return { data: null, error: error.message };
  return { data: data as TicketComment, error: null };
}

export async function updateTicketField(
  ticketId: string,
  updates: Partial<Ticket>
): Promise<{ error: string | null }> {
  const { error } = await supabase
    .from('tickets')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', ticketId);
  return { error: error?.message || null };
}

export async function addLinkedRecord(
  ticketId: string,
  recordType: LinkedRecordType,
  recordId: string
): Promise<{ error: string | null }> {
  const { error } = await supabase
    .from('ticket_linked_records')
    .insert({ ticket_id: ticketId, record_type: recordType, record_id: recordId });
  return { error: error?.message || null };
}

export async function removeLinkedRecord(id: string): Promise<{ error: string | null }> {
  const { error } = await supabase.from('ticket_linked_records').delete().eq('id', id);
  return { error: error?.message || null };
}

export async function logTimelineEvent(
  ticketId: string,
  eventType: string,
  description: string,
  actorEmployeeId?: string,
  metadata?: Record<string, any>
): Promise<void> {
  await supabase.from('ticket_timeline').insert({
    ticket_id: ticketId,
    event_type: eventType,
    description,
    actor_employee_id: actorEmployeeId || null,
    metadata: metadata || null,
  });
}
