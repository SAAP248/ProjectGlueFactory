import { useState } from 'react';
import type { DragEvent, ElementType, ReactNode } from 'react';
import { GripVertical, Eye, EyeOff, ChevronUp, ChevronDown, Lock, Loader2 } from 'lucide-react';
import {
  LOCKED_VISIBLE, MENU_GROUPS, groupEntryId, groupItemsInOrder, mainEntriesInOrder, saveSidebarLayout,
} from '../config/sidebarMenu';
import type { GroupKey, SidebarLayout } from '../config/sidebarMenu';

interface Row { id: string; label: string; icon: ElementType; children?: ReactNode }

function move(ids: string[], from: number, to: number) {
  const next = [...ids];
  const [moved] = next.splice(from, 1);
  next.splice(to > from ? to - 1 : to, 0, moved);
  return next;
}

function SortableList({ rows, hidden, onReorder, onToggle, nested = false }: {
  rows: Row[];
  hidden: Set<string>;
  onReorder: (ids: string[]) => void;
  onToggle: (id: string) => void;
  nested?: boolean;
}) {
  const [dragId, setDragId] = useState<string | null>(null);
  const [dropAt, setDropAt] = useState<number | null>(null);
  const ids = rows.map(r => r.id);

  const onDragOver = (e: DragEvent, index: number) => {
    if (!dragId) return;
    e.preventDefault();
    e.stopPropagation();
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    setDropAt(e.clientY < rect.top + Math.min(rect.height, 40) / 2 ? index : index + 1);
  };

  const finish = () => { setDragId(null); setDropAt(null); };

  const onDrop = (e: DragEvent) => {
    e.stopPropagation();
    if (dragId !== null && dropAt !== null) {
      const from = ids.indexOf(dragId);
      if (from !== dropAt && from + 1 !== dropAt) onReorder(move(ids, from, dropAt));
    }
    finish();
  };

  const indicator = (i: number) => (
    <div className={`h-0.5 rounded-full transition-colors ${dropAt === i && dragId ? 'bg-blue-500' : 'bg-transparent'}`} />
  );

  return (
    <div className={nested ? 'ml-4 border-l border-gray-200 pl-2' : ''} onDragLeave={e => {
      if (!e.currentTarget.contains(e.relatedTarget as Node)) setDropAt(null);
    }}>
      {rows.map((row, i) => {
        const isHidden = hidden.has(row.id);
        const locked = LOCKED_VISIBLE.has(row.id);
        const Icon = row.icon;
        return (
          <div key={row.id} onDragOver={e => onDragOver(e, i)} onDrop={onDrop}>
            {indicator(i)}
            <div
              draggable
              onDragStart={e => { e.stopPropagation(); e.dataTransfer.effectAllowed = 'move'; setDragId(row.id); }}
              onDragEnd={finish}
              className={`group flex items-center gap-1.5 rounded-lg border px-1.5 py-1.5 text-sm transition-all ${
                dragId === row.id ? 'opacity-40' : ''
              } ${isHidden ? 'border-dashed border-gray-200 bg-gray-50 text-gray-400' : 'border-gray-200 bg-white text-gray-700 shadow-sm'}`}
            >
              <GripVertical className="h-4 w-4 flex-shrink-0 cursor-grab text-gray-300 active:cursor-grabbing" />
              <Icon className="h-4 w-4 flex-shrink-0" />
              <span className={`flex-1 truncate ${isHidden ? 'line-through' : ''}`}>{row.label}</span>
              <div className="flex items-center opacity-60 transition-opacity group-hover:opacity-100">
                <button type="button" disabled={i === 0} onClick={() => onReorder(move(ids, i, i - 1))}
                  className="rounded p-0.5 hover:bg-gray-100 disabled:opacity-30" title="Move up">
                  <ChevronUp className="h-3.5 w-3.5" />
                </button>
                <button type="button" disabled={i === rows.length - 1} onClick={() => onReorder(move(ids, i, i + 2))}
                  className="rounded p-0.5 hover:bg-gray-100 disabled:opacity-30" title="Move down">
                  <ChevronDown className="h-3.5 w-3.5" />
                </button>
                {locked ? (
                  <span className="p-0.5 text-gray-300" title="Always visible"><Lock className="h-3.5 w-3.5" /></span>
                ) : (
                  <button type="button" onClick={() => onToggle(row.id)}
                    className={`rounded p-0.5 hover:bg-gray-100 ${isHidden ? 'text-gray-400' : 'text-blue-600'}`}
                    title={isHidden ? 'Show in menu' : 'Hide from menu'}>
                    {isHidden ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                  </button>
                )}
              </div>
            </div>
            {row.children && <div className="mt-1">{row.children}</div>}
            {i === rows.length - 1 && indicator(i + 1)}
          </div>
        );
      })}
    </div>
  );
}

export default function SidebarMenuEditor({ initial, onClose }: { initial: SidebarLayout; onClose: () => void }) {
  const [draft, setDraft] = useState<SidebarLayout>(initial);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const hidden = new Set(draft.hidden);

  const toggle = (id: string) =>
    setDraft(d => ({ ...d, hidden: d.hidden.includes(id) ? d.hidden.filter(h => h !== id) : [...d.hidden, id] }));

  const groupRows = (g: GroupKey) => (
    <SortableList
      nested
      hidden={hidden}
      rows={groupItemsInOrder(draft, g)}
      onReorder={ids => setDraft(d => ({ ...d, [g]: ids }))}
      onToggle={toggle}
    />
  );

  const rows: Row[] = mainEntriesInOrder(draft).map(entry =>
    entry.kind === 'item'
      ? entry.item
      : { id: groupEntryId(entry.group.id), label: entry.group.label, icon: MENU_GROUPS[entry.group.id].icon, children: groupRows(entry.group.id) }
  );

  const save = async () => {
    setSaving(true);
    setError('');
    try {
      await saveSidebarLayout(draft);
      onClose();
    } catch {
      setError('Could not save the menu. Please try again.');
      setSaving(false);
    }
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="border-b border-blue-100 bg-blue-50 px-3 py-2.5">
        <p className="text-xs font-semibold text-blue-900">Editing menu for everyone</p>
        <p className="mt-0.5 text-[11px] leading-snug text-blue-700">Drag to reorder. Use the eye to hide a page.</p>
      </div>
      <div className="flex-1 space-y-0.5 overflow-y-auto p-3">
        <SortableList rows={rows} hidden={hidden} onToggle={toggle} onReorder={ids => setDraft(d => ({ ...d, main: ids }))} />
      </div>
      <div className="space-y-2 border-t border-gray-200 p-3">
        {error && <p className="text-xs text-red-600">{error}</p>}
        <div className="flex gap-2">
          <button onClick={onClose} disabled={saving}
            className="flex-1 rounded-lg border border-gray-200 py-1.5 text-xs font-semibold text-gray-600 transition-colors hover:bg-gray-50">
            Cancel
          </button>
          <button onClick={save} disabled={saving}
            className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-blue-600 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-blue-700 disabled:opacity-70">
            {saving && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
