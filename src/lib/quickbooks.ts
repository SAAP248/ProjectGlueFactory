export type QbSyncStatus = 'synced' | 'pending' | 'error' | 'not_synced';

export const QB_SYNC_LABELS: Record<QbSyncStatus, string> = {
  synced: 'Synced',
  pending: 'Pending',
  error: 'Sync error',
  not_synced: 'Not synced',
};

export const QB_SYNC_STYLES: Record<QbSyncStatus, { pill: string; dot: string; iconColor: string }> = {
  synced: {
    pill: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    dot: 'bg-emerald-500',
    iconColor: 'text-emerald-600',
  },
  pending: {
    pill: 'bg-amber-50 text-amber-700 border-amber-200',
    dot: 'bg-amber-500',
    iconColor: 'text-amber-600',
  },
  error: {
    pill: 'bg-red-50 text-red-700 border-red-200',
    dot: 'bg-red-500',
    iconColor: 'text-red-600',
  },
  not_synced: {
    pill: 'bg-gray-100 text-gray-600 border-gray-200',
    dot: 'bg-gray-400',
    iconColor: 'text-gray-400',
  },
};

export function formatLastSynced(iso: string | null): string {
  if (!iso) return 'never';
  const date = new Date(iso);
  const diff = Date.now() - date.getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 30) return `${days}d ago`;
  return date.toLocaleDateString();
}
