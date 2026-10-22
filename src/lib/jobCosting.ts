export interface TechTimeRow {
  onsite_at: string | null;
  completed_at: string | null;
  total_paused_minutes: number | null;
}

export interface CostLine {
  line_type: string;
  quantity: number;
  cost_price: number | null;
}

export function workedMinutes(t: TechTimeRow): number {
  if (!t.onsite_at || !t.completed_at) return 0;
  const mins = Math.round((new Date(t.completed_at).getTime() - new Date(t.onsite_at).getTime()) / 60000);
  return Math.max(0, mins - (t.total_paused_minutes || 0));
}

export function laborCostFor(minutes: number, burdenedRate: number | null | undefined): number {
  return (minutes / 60) * (Number(burdenedRate) || 0);
}

export function isProductLine(line: Pick<CostLine, 'line_type'>): boolean {
  return line.line_type === 'part' || line.line_type === 'material';
}

export function productCost(lines: CostLine[]): number {
  return lines
    .filter(isProductLine)
    .reduce((s, li) => s + (li.cost_price != null ? Number(li.cost_price) * Number(li.quantity) : 0), 0);
}

export function formatHours(minutes: number): string {
  return `${(minutes / 60).toFixed(2)} hrs`;
}

export function formatMoney(val: number | null | undefined): string {
  return '$' + (Number(val) || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function formatShortDate(d: string | null | undefined): string {
  if (!d) return '—';
  const date = d.length === 10 ? new Date(d + 'T00:00:00') : new Date(d);
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}
