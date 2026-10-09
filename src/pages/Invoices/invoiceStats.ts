import { inRange, toISO, type DateRange } from '../../lib/dateRange';
import type { Invoice } from './useInvoices';

export interface InvoicePeriodStats {
  issued: number;
  billed: number;
  outstanding: number;
  openCount: number;
  overdueCount: number;
  overdueAmount: number;
}

export function invoiceDate(inv: Invoice) {
  return inv.invoice_date || inv.created_at;
}

export function invoicePeriodStats(invoices: Invoice[], range: DateRange): InvoicePeriodStats {
  const today = toISO(new Date());
  const s: InvoicePeriodStats = { issued: 0, billed: 0, outstanding: 0, openCount: 0, overdueCount: 0, overdueAmount: 0 };
  for (const inv of invoices) {
    if (inv.status === 'void' || inv.status === 'draft' || !inRange(invoiceDate(inv), range)) continue;
    const balance = Number(inv.balance_due) || 0;
    s.issued++;
    s.billed += Number(inv.total) || 0;
    if (inv.status === 'paid' || balance <= 0) continue;
    s.outstanding += balance;
    s.openCount++;
    if (inv.due_date && inv.due_date.slice(0, 10) < today) {
      s.overdueCount++;
      s.overdueAmount += balance;
    }
  }
  return s;
}
