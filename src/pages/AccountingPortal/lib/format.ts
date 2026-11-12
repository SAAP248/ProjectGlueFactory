import type { AccountType } from './types';

const moneyFmt = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' });
const moneyFmt0 = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });

export function money(n: number | null | undefined) {
  return moneyFmt.format(Number(n ?? 0));
}

export function money0(n: number | null | undefined) {
  return moneyFmt0.format(Number(n ?? 0));
}

export function round2(n: number) {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

export function toISO(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function parseISO(s: string) {
  const [y, m, d] = s.slice(0, 10).split('-').map(Number);
  return new Date(y, m - 1, d);
}

export function fmtDate(s: string | null | undefined) {
  if (!s) return '';
  return parseISO(s).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export function monthLabel(s: string, long = false) {
  return parseISO(s).toLocaleDateString('en-US', { month: long ? 'long' : 'short', year: 'numeric' });
}

export function startOfMonth(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

export function endOfMonth(d: Date) {
  return new Date(d.getFullYear(), d.getMonth() + 1, 0);
}

export function addMonths(d: Date, n: number) {
  return new Date(d.getFullYear(), d.getMonth() + n, 1);
}

export function todayISO() {
  return toISO(new Date());
}

export function daysBetween(a: string, b: string) {
  return Math.round((parseISO(b).getTime() - parseISO(a).getTime()) / 86400000);
}

export function isDebitNormal(type: AccountType) {
  return type === 'asset' || type === 'expense' || type === 'cogs';
}

export function naturalBalance(type: AccountType, debit: number, credit: number) {
  return isDebitNormal(type) ? debit - credit : credit - debit;
}

export const TYPE_LABELS: Record<AccountType, string> = {
  asset: 'Assets',
  liability: 'Liabilities',
  equity: 'Equity',
  income: 'Income',
  cogs: 'Cost of Goods Sold',
  expense: 'Expenses',
};

export const SOURCE_LABELS: Record<string, string> = {
  invoice: 'Invoice',
  cogs: 'Cost of sale',
  payment: 'Payment',
  portal_payment: 'Online payment',
  commission: 'Commission',
  manual: 'Journal entry',
  recurring: 'Repeating entry',
  bill: 'Bill',
  bill_payment: 'Bill payment',
  deposit: 'Deposit',
  bank: 'Bank entry',
  writeoff: 'Write-off',
  tax_payment: 'Sales tax payment',
  payroll: 'Payroll',
  payroll_tax: 'Payroll taxes',
  transfer: 'Transfer',
  card: 'Card charge',
  card_payment: 'Card payment',
  bank_fee: 'Bank fee',
  interest: 'Interest',
  owner_draw: 'Owner draw',
  opening: 'Opening balance',
  legacy_sales: 'Prior system sales',
};

export function sourceLabel(t: string) {
  return SOURCE_LABELS[t] ?? t.replace(/_/g, ' ');
}

export type RangePreset = 'this_month' | 'last_month' | 'this_quarter' | 'last_quarter' | 'this_year' | 'last_year' | 'custom';

export interface DateRange {
  preset: RangePreset;
  from: string;
  to: string;
}

export function presetRange(preset: RangePreset, base = new Date()): DateRange {
  const y = base.getFullYear();
  const m = base.getMonth();
  const q = Math.floor(m / 3);
  switch (preset) {
    case 'this_month':
      return { preset, from: toISO(new Date(y, m, 1)), to: toISO(new Date(y, m + 1, 0)) };
    case 'last_month':
      return { preset, from: toISO(new Date(y, m - 1, 1)), to: toISO(new Date(y, m, 0)) };
    case 'this_quarter':
      return { preset, from: toISO(new Date(y, q * 3, 1)), to: toISO(new Date(y, q * 3 + 3, 0)) };
    case 'last_quarter':
      return { preset, from: toISO(new Date(y, q * 3 - 3, 1)), to: toISO(new Date(y, q * 3, 0)) };
    case 'last_year':
      return { preset, from: `${y - 1}-01-01`, to: `${y - 1}-12-31` };
    case 'this_year':
    default:
      return { preset: preset === 'custom' ? 'this_year' : preset, from: `${y}-01-01`, to: toISO(new Date(y, m + 1, 0)) };
  }
}

export const PRESET_LABELS: Record<RangePreset, string> = {
  this_month: 'This month',
  last_month: 'Last month',
  this_quarter: 'This quarter',
  last_quarter: 'Last quarter',
  this_year: 'This year',
  last_year: 'Last year',
  custom: 'Custom',
};

export function rangeLabel(r: DateRange) {
  return `${fmtDate(r.from)} - ${fmtDate(r.to)}`;
}

function csvCell(v: string | number | null | undefined) {
  const s = v == null ? '' : String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export function downloadCsv(filename: string, rows: (string | number | null | undefined)[][]) {
  const csv = rows.map(r => r.map(csvCell).join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename.endsWith('.csv') ? filename : `${filename}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export function printPage() {
  window.print();
}
