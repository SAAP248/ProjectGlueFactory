import { Ticket, AlertCircle } from 'lucide-react';
import { TicketRow } from './useDashboardData';

interface Props {
  tickets: TicketRow[];
}

const priorityStyles = (p: string) => {
  const pr = (p || '').toLowerCase();
  if (pr === 'urgent' || pr === 'critical') return 'bg-red-100 text-red-700 ring-red-200';
  if (pr === 'high') return 'bg-orange-100 text-orange-700 ring-orange-200';
  if (pr === 'medium' || pr === 'normal') return 'bg-amber-100 text-amber-700 ring-amber-200';
  return 'bg-gray-100 text-gray-700 ring-gray-200';
};

const timeAgo = (iso: string) => {
  const diff = Date.now() - new Date(iso).getTime();
  const h = Math.floor(diff / 3600000);
  if (h < 1) return `${Math.floor(diff / 60000)}m`;
  if (h < 24) return `${h}h`;
  return `${Math.floor(h / 24)}d`;
};

export default function TicketsPanel({ tickets }: Props) {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100">
      <div className="p-5 border-b border-gray-100 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Ticket className="h-4 w-4 text-orange-600" />
          <h3 className="text-sm font-semibold text-gray-900">Tickets Needing Attention</h3>
        </div>
      </div>
      <div className="divide-y divide-gray-100">
        {tickets.length === 0 ? (
          <div className="p-6 text-center text-sm text-gray-500">No open tickets</div>
        ) : (
          tickets.map((t) => {
            const overdue = t.due_date && new Date(t.due_date) < new Date();
            return (
              <div key={t.id} className="p-4 hover:bg-gray-50 transition-colors">
                <div className="flex items-start gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono text-gray-400">{t.ticket_number}</span>
                      <span
                        className={`text-xs px-2 py-0.5 rounded-full font-medium ring-1 ${priorityStyles(t.priority)}`}
                      >
                        {t.priority}
                      </span>
                      {overdue && (
                        <span className="inline-flex items-center gap-1 text-xs font-medium text-rose-600">
                          <AlertCircle className="h-3 w-3" />
                          Overdue
                        </span>
                      )}
                    </div>
                    <p className="font-medium text-sm text-gray-900 truncate mt-1">{t.title}</p>
                    <p className="text-xs text-gray-500 truncate">{t.company}</p>
                  </div>
                  <span className="text-xs text-gray-400 shrink-0">{timeAgo(t.created_at)}</span>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
