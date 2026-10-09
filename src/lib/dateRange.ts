import { useEffect, useMemo, useState } from 'react';

export type RangePreset =
  | 'this_month'
  | 'last_month'
  | 'this_quarter'
  | 'last_quarter'
  | 'ytd'
  | 'last_year'
  | 'last_30'
  | 'last_12m'
  | 'all'
  | 'custom';

export interface RangeSelection {
  preset: RangePreset;
  customFrom?: string;
  customTo?: string;
}

export interface DateRange {
  from: string | null;
  to: string | null;
  label: string;
}

export const PRESET_OPTIONS: { key: Exclude<RangePreset, 'custom'>; label: string }[] = [
  { key: 'this_month', label: 'This Month' },
  { key: 'last_month', label: 'Last Month' },
  { key: 'this_quarter', label: 'This Quarter' },
  { key: 'last_quarter', label: 'Last Quarter' },
  { key: 'ytd', label: 'Year to Date' },
  { key: 'last_year', label: 'Last Year' },
  { key: 'last_30', label: 'Last 30 Days' },
  { key: 'last_12m', label: 'Last 12 Months' },
  { key: 'all', label: 'All Time' },
];

export function toISO(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function parseISO(s: string): Date {
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y, m - 1, d);
}

function addDays(s: string, n: number): string {
  const d = parseISO(s);
  d.setDate(d.getDate() + n);
  return toISO(d);
}

function shiftMonths(s: string, n: number): string {
  const d = parseISO(s);
  const day = d.getDate();
  const target = new Date(d.getFullYear(), d.getMonth() + n, 1);
  const lastDay = new Date(target.getFullYear(), target.getMonth() + 1, 0).getDate();
  target.setDate(Math.min(day, lastDay));
  return toISO(target);
}

export function daysBetween(from: string, to: string): number {
  return Math.round((parseISO(to).getTime() - parseISO(from).getTime()) / 86400000) + 1;
}

function fmt(s: string, withYear = true): string {
  return parseISO(s).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    ...(withYear ? { year: 'numeric' } : {}),
  });
}

export function formatRangeLabel(from: string | null, to: string | null): string {
  if (!from || !to) return 'All time';
  if (from === to) return fmt(from);
  const sameYear = from.slice(0, 4) === to.slice(0, 4);
  return `${fmt(from, !sameYear)} – ${fmt(to)}`;
}

export function resolveRange(sel: RangeSelection, today = new Date()): DateRange {
  const t = toISO(today);
  const y = today.getFullYear();
  const m = today.getMonth();
  const q = Math.floor(m / 3);
  let from: string | null = null;
  let to: string | null = null;

  switch (sel.preset) {
    case 'this_month':
      from = toISO(new Date(y, m, 1));
      to = t;
      break;
    case 'last_month':
      from = toISO(new Date(y, m - 1, 1));
      to = toISO(new Date(y, m, 0));
      break;
    case 'this_quarter':
      from = toISO(new Date(y, q * 3, 1));
      to = t;
      break;
    case 'last_quarter':
      from = toISO(new Date(y, q * 3 - 3, 1));
      to = toISO(new Date(y, q * 3, 0));
      break;
    case 'ytd':
      from = toISO(new Date(y, 0, 1));
      to = t;
      break;
    case 'last_year':
      from = toISO(new Date(y - 1, 0, 1));
      to = toISO(new Date(y - 1, 11, 31));
      break;
    case 'last_30':
      from = addDays(t, -29);
      to = t;
      break;
    case 'last_12m':
      from = addDays(shiftMonths(t, -12), 1);
      to = t;
      break;
    case 'custom':
      from = sel.customFrom || null;
      to = sel.customTo || null;
      if (from && to && from > to) [from, to] = [to, from];
      break;
    case 'all':
      break;
  }
  return { from, to, label: formatRangeLabel(from, to) };
}

export function previousRange(sel: RangeSelection, range: DateRange): DateRange | null {
  if (!range.from || !range.to) return null;
  const months: Partial<Record<RangePreset, number>> = {
    this_month: 1,
    last_month: 1,
    this_quarter: 3,
    last_quarter: 3,
    ytd: 12,
    last_year: 12,
  };
  const shift = months[sel.preset];
  let from: string;
  let to: string;
  if (shift) {
    from = shiftMonths(range.from, -shift);
    to = sel.preset === 'last_month' || sel.preset === 'last_quarter' || sel.preset === 'last_year'
      ? addDays(range.from, -1)
      : shiftMonths(range.to, -shift);
  } else {
    const len = daysBetween(range.from, range.to);
    to = addDays(range.from, -1);
    from = addDays(to, -(len - 1));
  }
  return { from, to, label: formatRangeLabel(from, to) };
}

export function inRange(date: string | null | undefined, range: DateRange): boolean {
  if (!range.from || !range.to) return true;
  if (!date) return false;
  const d = date.slice(0, 10);
  return d >= range.from && d <= range.to;
}

export function percentChange(current: number, previous: number): number | null {
  if (!previous) return current ? null : 0;
  return ((current - previous) / Math.abs(previous)) * 100;
}

export function useDateRange(storageKey: string, fallback: RangePreset = 'this_month') {
  const key = `date-range:${storageKey}`;
  const [selection, setSelection] = useState<RangeSelection>(() => {
    try {
      const raw = localStorage.getItem(key);
      if (raw) {
        const parsed = JSON.parse(raw) as RangeSelection;
        if (parsed && typeof parsed.preset === 'string') return parsed;
      }
    } catch {
      /* ignore malformed saved value */
    }
    return { preset: fallback };
  });

  useEffect(() => {
    localStorage.setItem(key, JSON.stringify(selection));
  }, [key, selection]);

  const range = useMemo(() => resolveRange(selection), [selection]);
  const previous = useMemo(() => previousRange(selection, range), [selection, range]);
  return { selection, setSelection, range, previous };
}
