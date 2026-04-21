import { useState } from 'react';
import { RefreshCw, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';
import type { AlarmEventHistory } from '../CustomerProfile/types';

interface Props {
  events: AlarmEventHistory[];
  onRefresh: () => Promise<void>;
}

const PAGE_SIZE_OPTIONS = [10, 25, 50, 100];

export default function EventHistoryTab({ events, onRefresh }: Props) {
  const [refreshing, setRefreshing] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const sorted = [...events].sort((a, b) => new Date(b.event_at).getTime() - new Date(a.event_at).getTime());
  const totalPages = Math.max(1, Math.ceil(sorted.length / pageSize));
  const paged = sorted.slice((page - 1) * pageSize, page * pageSize);

  const handleRefresh = async () => {
    setRefreshing(true);
    await onRefresh();
    setRefreshing(false);
  };

  const formatDate = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleDateString('en-US', { year: 'numeric', month: '2-digit', day: '2-digit' })
      + ' ' + d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false }) + '...';
  };

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
        <h3 className="text-base font-semibold text-gray-900">Event List</h3>
        <button
          onClick={handleRefresh}
          disabled={refreshing}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-60"
        >
          <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
          Refresh Event History (cached for 1 hour)
        </button>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-white border-b border-gray-100">
              <th className="px-6 py-3 text-left text-xs text-gray-400 font-normal">Zone Id</th>
              <th className="px-6 py-3 text-left text-xs text-gray-400 font-normal">Zone</th>
              <th className="px-6 py-3 text-left text-xs text-gray-400 font-normal">Signal Code</th>
              <th className="px-6 py-3 text-left text-xs text-gray-400 font-normal">Event Code</th>
              <th className="px-6 py-3 text-left text-xs text-gray-400 font-normal flex items-center gap-1">
                <span className="text-blue-500">&#9660;</span> Description
              </th>
              <th className="px-6 py-3 text-left text-xs text-gray-400 font-normal">Last Updated</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {paged.map(event => (
              <tr key={event.id} className="hover:bg-gray-50 transition-colors">
                <td className="px-6 py-3 text-gray-500 text-xs">{event.zone_id_ref || ''}</td>
                <td className="px-6 py-3 text-gray-700">{event.zone_name || ''}</td>
                <td className="px-6 py-3 text-gray-700">{event.signal_code || ''}</td>
                <td className="px-6 py-3 text-gray-700">{event.event_code || ''}</td>
                <td className="px-6 py-3 font-semibold text-gray-900">{event.description}</td>
                <td className="px-6 py-3 text-gray-500 text-xs whitespace-nowrap">{formatDate(event.event_at)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        {events.length === 0 && (
          <div className="py-16 text-center text-gray-400 text-sm">
            No event history available. Click "Refresh Event History" to load from the central station.
          </div>
        )}
      </div>

      {events.length > 0 && (
        <div className="flex items-center justify-end gap-4 px-6 py-3 border-t border-gray-100 bg-gray-50">
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <span>Rows per page:</span>
            <select
              value={pageSize}
              onChange={e => { setPageSize(Number(e.target.value)); setPage(1); }}
              className="border border-gray-200 rounded px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {PAGE_SIZE_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <span className="text-sm text-gray-600">
            {(page - 1) * pageSize + 1}–{Math.min(page * pageSize, sorted.length)} of {sorted.length}
          </span>
          <div className="flex items-center gap-1">
            <button onClick={() => setPage(1)} disabled={page === 1} className="p-1.5 rounded hover:bg-gray-200 disabled:opacity-30 transition-colors">
              <ChevronsLeft className="h-4 w-4 text-gray-600" />
            </button>
            <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="p-1.5 rounded hover:bg-gray-200 disabled:opacity-30 transition-colors">
              <ChevronLeft className="h-4 w-4 text-gray-600" />
            </button>
            <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="p-1.5 rounded hover:bg-gray-200 disabled:opacity-30 transition-colors">
              <ChevronRight className="h-4 w-4 text-gray-600" />
            </button>
            <button onClick={() => setPage(totalPages)} disabled={page === totalPages} className="p-1.5 rounded hover:bg-gray-200 disabled:opacity-30 transition-colors">
              <ChevronsRight className="h-4 w-4 text-gray-600" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
