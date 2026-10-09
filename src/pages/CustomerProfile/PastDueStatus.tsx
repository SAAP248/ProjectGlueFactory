import { AlertTriangle, CheckCircle2, ChevronRight, X } from 'lucide-react';
import { formatMoney, type PastDueSummary } from './pastDue';

function formatDate(value: string) {
  const [y, m, d] = value.slice(0, 10).split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function plural(n: number, word: string) {
  return `${n} ${word}${n === 1 ? '' : 's'}`;
}

export function PastDueBadge({ summary, onClick }: { summary: PastDueSummary; onClick: () => void }) {
  if (summary.count === 0) {
    return (
      <button
        onClick={onClick}
        title="No invoices past due"
        className="inline-flex items-center gap-1.5 text-xs font-medium px-2 py-0.5 rounded border border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 transition-colors"
      >
        <CheckCircle2 className="h-3.5 w-3.5" />
        Current
      </button>
    );
  }

  return (
    <button
      onClick={onClick}
      className="group relative inline-flex items-center gap-1.5 text-xs font-semibold px-2 py-0.5 rounded border border-red-200 bg-red-50 text-red-700 hover:bg-red-100 hover:border-red-300 transition-colors"
    >
      <span className="relative flex h-2 w-2">
        <span className="absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75 animate-ping" />
        <span className="relative inline-flex h-2 w-2 rounded-full bg-red-500" />
      </span>
      Past Due {formatMoney(summary.total)} · {plural(summary.count, 'invoice')}
      <span
        role="tooltip"
        className="pointer-events-none absolute left-1/2 top-full z-20 mt-2 -translate-x-1/2 whitespace-nowrap rounded-lg bg-gray-900 px-3 py-2 text-xs font-medium text-white shadow-lg opacity-0 translate-y-1 transition-all duration-150 group-hover:opacity-100 group-hover:translate-y-0"
      >
        Oldest: {plural(summary.oldestDays, 'day')} overdue
        <span className="block text-[11px] font-normal text-gray-300">Click to view overdue invoices</span>
      </span>
    </button>
  );
}

export function PastDueBanner({ summary, onView, onDismiss }: { summary: PastDueSummary; onView: () => void; onDismiss: () => void }) {
  return (
    <div className="mb-4 flex items-center gap-3 rounded-xl border border-red-200 bg-gradient-to-r from-red-50 to-white px-4 py-3">
      <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-red-100">
        <AlertTriangle className="h-5 w-5 text-red-600" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-red-800">
          {formatMoney(summary.total)} past due across {plural(summary.count, 'invoice')}
        </p>
        <p className="text-xs text-red-700/80">
          Oldest invoice was due {summary.oldestDueDate ? formatDate(summary.oldestDueDate) : 'previously'} ({plural(summary.oldestDays, 'day')} ago)
        </p>
      </div>
      <button
        onClick={onView}
        className="inline-flex flex-shrink-0 items-center gap-1 rounded-lg bg-red-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-red-700 transition-colors"
      >
        View invoices
        <ChevronRight className="h-3.5 w-3.5" />
      </button>
      <button
        onClick={onDismiss}
        aria-label="Dismiss past due alert"
        className="flex-shrink-0 rounded-md p-1 text-red-400 hover:bg-red-100 hover:text-red-700 transition-colors"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}
