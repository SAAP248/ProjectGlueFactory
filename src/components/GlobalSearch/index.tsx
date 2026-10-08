import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Search, Clock, X, Building2, Wrench, FileText, ShieldCheck, Loader2, CornerDownLeft } from 'lucide-react';
import {
  type RecentSearch, type SearchHit, type SearchRecordType,
  searchRecords, fetchRecentSearches, saveRecentSearch, removeRecentSearch, clearRecentSearches,
} from './searchApi';

interface Props {
  onOpenRecord: (type: SearchRecordType, id: string) => void;
}

const TYPE_META: Record<SearchRecordType, { label: string; icon: typeof Search; tint: string }> = {
  customer: { label: 'Customers', icon: Building2, tint: 'bg-blue-50 text-blue-600' },
  work_order: { label: 'Work Orders', icon: Wrench, tint: 'bg-amber-50 text-amber-600' },
  invoice: { label: 'Invoices', icon: FileText, tint: 'bg-emerald-50 text-emerald-600' },
  agreement: { label: 'Service Plans', icon: ShieldCheck, tint: 'bg-teal-50 text-teal-600' },
};
const GROUP_ORDER: SearchRecordType[] = ['customer', 'work_order', 'invoice', 'agreement'];

function timeAgo(iso: string): string {
  const mins = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60000));
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.round(hrs / 24);
  return days === 1 ? 'yesterday' : `${days}d ago`;
}

export default function GlobalSearch({ onOpenRecord }: Props) {
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const [recent, setRecent] = useState<RecentSearch[]>([]);
  const [recentError, setRecentError] = useState<string | null>(null);
  const [results, setResults] = useState<SearchHit[]>([]);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [active, setActive] = useState(0);
  const [notice, setNotice] = useState<string | null>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const typing = query.trim().length >= 2;

  const loadRecent = useCallback(async () => {
    try {
      setRecent(await fetchRecentSearches());
      setRecentError(null);
    } catch {
      setRecentError('Could not load your recent searches.');
    }
  }, []);

  useEffect(() => { loadRecent(); }, [loadRecent]);

  useEffect(() => {
    if (!typing) { setResults([]); setSearchError(null); return; }
    let cancelled = false;
    setSearching(true);
    const t = setTimeout(async () => {
      try {
        const hits = await searchRecords(query);
        if (!cancelled) { setResults(hits); setSearchError(null); }
      } catch {
        if (!cancelled) setSearchError('Search failed. Please try again.');
      } finally {
        if (!cancelled) setSearching(false);
      }
    }, 250);
    return () => { cancelled = true; clearTimeout(t); };
  }, [query, typing]);

  useEffect(() => {
    function onDown(e: MouseEvent) {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, []);

  useEffect(() => { setActive(0); }, [query, open]);

  const groupedResults = useMemo(
    () => GROUP_ORDER.map(type => ({ type, hits: results.filter(r => r.type === type) })).filter(g => g.hits.length),
    [results],
  );
  const flatResults = useMemo(() => groupedResults.flatMap(g => g.hits), [groupedResults]);
  const items: (SearchHit | RecentSearch)[] = typing ? flatResults : recent;

  function close() {
    setOpen(false);
    inputRef.current?.blur();
  }

  async function openHit(hit: SearchHit, typed: string) {
    onOpenRecord(hit.type, hit.id);
    setQuery('');
    close();
    try {
      await saveRecentSearch(hit, typed || hit.label);
    } finally {
      loadRecent();
    }
  }

  function openRecent(r: RecentSearch) {
    if (!r.available) {
      setNotice(`${r.label} no longer exists.`);
      setTimeout(() => setNotice(null), 2500);
      return;
    }
    openHit(r, r.query);
  }

  async function handleRemove(r: RecentSearch) {
    setRecent(prev => prev.filter(x => x.rowId !== r.rowId));
    try { await removeRecentSearch(r.rowId); } catch { loadRecent(); }
  }

  async function handleClearAll() {
    setRecent([]);
    try { await clearRecentSearches(); } catch { loadRecent(); }
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Escape') { close(); return; }
    if (!open) setOpen(true);
    if (!items.length) return;
    if (e.key === 'ArrowDown') { e.preventDefault(); setActive(i => (i + 1) % items.length); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setActive(i => (i - 1 + items.length) % items.length); }
    else if (e.key === 'Enter') {
      e.preventDefault();
      const item = items[active];
      if (!item) return;
      if (typing) openHit(item, query);
      else openRecent(item as RecentSearch);
    }
  }

  function renderIcon(type: SearchRecordType) {
    const meta = TYPE_META[type];
    const Icon = meta.icon;
    return (
      <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${meta.tint}`}>
        <Icon className="h-4 w-4" />
      </span>
    );
  }

  let flatIndex = -1;

  return (
    <div ref={wrapRef} className="relative">
      <Search className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
      <input
        ref={inputRef}
        type="text"
        value={query}
        onChange={e => { setQuery(e.target.value); setOpen(true); }}
        onFocus={() => { setOpen(true); loadRecent(); }}
        onKeyDown={onKeyDown}
        placeholder="Search customers, work orders, invoices..."
        className="w-80 rounded-lg border border-gray-300 py-2 pl-10 pr-9 transition-shadow focus:border-transparent focus:outline-none focus:ring-2 focus:ring-blue-500"
        aria-expanded={open}
        aria-autocomplete="list"
      />
      {query && (
        <button
          onClick={() => { setQuery(''); inputRef.current?.focus(); }}
          className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
          aria-label="Clear search"
        >
          <X className="h-4 w-4" />
        </button>
      )}

      {open && (
        <div className="animate-fade-in absolute left-0 top-full z-50 mt-2 w-[28rem] overflow-hidden rounded-xl border border-gray-200 bg-white shadow-xl">
          {notice && (
            <div className="border-b border-amber-100 bg-amber-50 px-4 py-2 text-xs font-medium text-amber-800">{notice}</div>
          )}

          {!typing && (
            <div className="py-2">
              <div className="flex items-center justify-between px-4 pb-1 pt-1">
                <span className="text-xs font-semibold uppercase tracking-wide text-gray-500">Your recent searches</span>
                {recent.length > 0 && (
                  <button onClick={handleClearAll} className="text-xs font-medium text-blue-600 hover:text-blue-700">
                    Clear all
                  </button>
                )}
              </div>
              {recentError && <p className="px-4 py-3 text-sm text-red-600">{recentError}</p>}
              {!recentError && recent.length === 0 && (
                <p className="px-4 py-6 text-center text-sm text-gray-500">
                  No recent searches yet. Records you open from search will show up here.
                </p>
              )}
              {recent.map((r, i) => (
                <div
                  key={r.rowId}
                  onMouseEnter={() => setActive(i)}
                  className={`group flex items-center gap-3 px-4 py-2 transition-colors ${active === i ? 'bg-gray-50' : ''} ${r.available ? 'cursor-pointer' : 'cursor-not-allowed opacity-60'}`}
                  onClick={() => openRecent(r)}
                >
                  <Clock className="h-4 w-4 shrink-0 text-gray-400" />
                  {renderIcon(r.type)}
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-medium text-gray-900">{r.label}</div>
                    <div className="truncate text-xs text-gray-500">
                      {r.available ? (r.sublabel || TYPE_META[r.type].label) : 'No longer available'}
                    </div>
                  </div>
                  <span className="shrink-0 text-xs text-gray-400">{timeAgo(r.searchedAt)}</span>
                  <button
                    onClick={e => { e.stopPropagation(); handleRemove(r); }}
                    className="rounded p-1 text-gray-300 opacity-0 transition-opacity hover:bg-gray-200 hover:text-gray-600 group-hover:opacity-100"
                    aria-label={`Remove ${r.label} from recent searches`}
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}

          {typing && (
            <div className="max-h-[26rem] overflow-y-auto py-2">
              {searching && results.length === 0 && (
                <div className="flex items-center gap-2 px-4 py-6 text-sm text-gray-500">
                  <Loader2 className="h-4 w-4 animate-spin" /> Searching...
                </div>
              )}
              {searchError && <p className="px-4 py-3 text-sm text-red-600">{searchError}</p>}
              {!searching && !searchError && results.length === 0 && (
                <p className="px-4 py-6 text-center text-sm text-gray-500">No results for "{query.trim()}"</p>
              )}
              {groupedResults.map(group => (
                <div key={group.type} className="pb-1">
                  <div className="px-4 pb-1 pt-2 text-xs font-semibold uppercase tracking-wide text-gray-500">
                    {TYPE_META[group.type].label}
                  </div>
                  {group.hits.map(hit => {
                    flatIndex += 1;
                    const idx = flatIndex;
                    return (
                      <button
                        key={`${hit.type}-${hit.id}`}
                        onMouseEnter={() => setActive(idx)}
                        onClick={() => openHit(hit, query)}
                        className={`flex w-full items-center gap-3 px-4 py-2 text-left transition-colors ${active === idx ? 'bg-gray-50' : ''}`}
                      >
                        {renderIcon(hit.type)}
                        <div className="min-w-0 flex-1">
                          <div className="truncate text-sm font-medium text-gray-900">{hit.label}</div>
                          {hit.sublabel && <div className="truncate text-xs text-gray-500">{hit.sublabel}</div>}
                        </div>
                        {active === idx && <CornerDownLeft className="h-4 w-4 shrink-0 text-gray-400" />}
                      </button>
                    );
                  })}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
