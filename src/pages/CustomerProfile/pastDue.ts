import type { Invoice } from './types';

export interface PastDueSummary {
  total: number;
  count: number;
  oldestDueDate: string | null;
  oldestDays: number;
}

const CLOSED_STATUSES = new Set(['paid', 'draft', 'void', 'cancelled']);
const DAY_MS = 86_400_000;

function startOfToday() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

function parseDate(value: string) {
  const [y, m, d] = value.slice(0, 10).split('-').map(Number);
  return new Date(y, m - 1, d).getTime();
}

export function isInvoicePastDue(inv: Invoice, today = startOfToday()) {
  if (CLOSED_STATUSES.has(inv.status) || Number(inv.balance_due) <= 0) return false;
  if (inv.status === 'overdue') return true;
  return !!inv.due_date && parseDate(inv.due_date) < today;
}

export function getPastDueSummary(invoices: Invoice[]): PastDueSummary {
  const today = startOfToday();
  const pastDue = invoices.filter(inv => isInvoicePastDue(inv, today));
  let oldest: string | null = null;
  for (const inv of pastDue) {
    if (inv.due_date && (!oldest || parseDate(inv.due_date) < parseDate(oldest))) oldest = inv.due_date;
  }
  return {
    total: pastDue.reduce((sum, inv) => sum + Number(inv.balance_due), 0),
    count: pastDue.length,
    oldestDueDate: oldest,
    oldestDays: oldest ? Math.max(0, Math.floor((today - parseDate(oldest)) / DAY_MS)) : 0,
  };
}

export function formatMoney(value: number) {
  return `$${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}
