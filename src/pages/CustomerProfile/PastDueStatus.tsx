import { CheckCircle2, ChevronRight, X } from 'lucide-react';
import { formatMoney, type PastDueSummary } from './pastDue';

function plural(n: number, word: string) {
  return `${n} ${word}${n === 1 ? '' : 's'}`;
}

export function PastDueBadge({ summary, onClick }: { summary: PastDueSummary; onClick: () => void }) {
  if (summary.count === 0) {
    return (
      <button
        onClick={onClick}
        title="No invoices past due"
        className="inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded border border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 transition-colors"
      >
        <CheckCircle2 className="h-3 w-3" />
        Current
      </button>
    );
  }

  return (
    <button
      onClick={onClick}
      className="group relative inline-flex items-center gap-1.5 text-xs font-medium px-2 py-0.5 rounded border border-red-200 bg-red-50 text-red-700 hover:bg-red-100 hover:border-red-300 transition-colors"
    >
      <span className="h-1.5 w-1.5 rounded-full bg-red-500" />
      Past Due {formatMoney(summary.total)}
      <span
        role="tooltip"
        className="pointer-events-none absolute left-1/2 top-full z-20 mt-2 -translate-x-1/2 whitespace-nowrap rounded-lg bg-gray-900 px-3 py-2 text-xs font-medium text-white shadow-lg opacity-0 translate-y-1 transition-all duration-150 group-hover:opacity-100 group-hover:translate-y-0"
      >
        {plural(summary.count, 'invoice')} · oldest {plural(summary.oldestDays, 'day')} overdue
        <span className="block text-[11px] font-normal text-gray-300">Click to view overdue invoices</span>
      </span>
    </button>
  );
}

export function PastDueCard({ summary, onView, onDismiss }: { summary: PastDueSummary; onView: () => void; onDismiss: () => void }) {
  return (
    <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2">
      <span className="h-2 w-2 flex-shrink-0 rounded-full bg-red-500" />
      <p className="min-w-0 flex-1 truncate text-xs text-red-800" title={`${formatMoney(summary.total)} past due · ${plural(summary.count, 'invoice')} · oldest ${summary.oldestDays} days`}>
        <span className="font-semibold">{formatMoney(summary.total)} past due</span>
        <span className="text-red-700/80"> · {plural(summary.count, 'invoice')} · oldest {summary.oldestDays}d</span>
      </p>
      <button
        onClick={onView}
        className="inline-flex flex-shrink-0 items-center text-xs font-semibold text-red-700 hover:text-red-900 transition-colors"
      >
        View
        <ChevronRight className="h-3.5 w-3.5" />
      </button>
      <button
        onClick={onDismiss}
        aria-label="Dismiss past due alert"
        className="flex-shrink-0 rounded p-0.5 text-red-400 hover:bg-red-100 hover:text-red-700 transition-colors"
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}
