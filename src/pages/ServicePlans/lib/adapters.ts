import { supabase } from '../../../lib/supabase';

// Integration seams. The demo implementations below stand in for a real card processor and for
// WorkHorse Subscriptions (monitoring RMR); swap them without touching plan logic.

export interface ChargeResult {
  ok: boolean;
  reference: string;
  reason?: string;
}

export interface PaymentAdapter {
  charge(req: { agreementNumber: string; amountCents: number; method: string }): Promise<ChargeResult>;
  refund(req: { agreementNumber: string; amountCents: number }): Promise<ChargeResult>;
}

export const demoPaymentAdapter: PaymentAdapter = {
  async charge({ method }) {
    const reference = `DEMO-${Math.random().toString(36).slice(2, 10).toUpperCase()}`;
    if (method === 'card_declined') return { ok: false, reference, reason: 'Card declined' };
    return { ok: true, reference };
  },
  async refund() {
    return { ok: true, reference: `DEMO-RF-${Math.random().toString(36).slice(2, 8).toUpperCase()}` };
  },
};

export interface MonitoringAdapter {
  monthlyCentsByCompany(companyIds?: string[]): Promise<Map<string, number>>;
}

export const demoMonitoringAdapter: MonitoringAdapter = {
  async monthlyCentsByCompany(companyIds) {
    let q = supabase.from('sp_monitoring_accounts').select('company_id, monthly_cents').eq('status', 'active');
    if (companyIds) q = q.in('company_id', companyIds);
    const { data, error } = await q;
    if (error) throw new Error(error.message);
    const map = new Map<string, number>();
    for (const r of data ?? []) map.set(r.company_id, (map.get(r.company_id) ?? 0) + r.monthly_cents);
    return map;
  },
};
