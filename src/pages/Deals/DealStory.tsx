import { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, ArrowRight, Check, ChevronDown, ChevronRight, Lightbulb, XCircle, PartyPopper, Minus } from 'lucide-react';
import type { Deal, DealActivity, Employee } from './types';
import { buildDealStory, useDealStoryData } from './useDealStory';
import type { NextStep, StoryEvent, StoryGroup, StoryLink } from './useDealStory';

interface Props {
  deal: Deal;
  activities: DealActivity[];
  employees: Employee[];
  onOpenLink: (link: StoryLink) => void;
  onAction: (action: NonNullable<NextStep['action']>) => void;
}

const GROUP_STYLE: Record<StoryGroup, { label: string; dot: string; ring: string; text: string }> = {
  sales: { label: 'Sales', dot: 'bg-blue-600', ring: 'ring-blue-200', text: 'text-blue-700' },
  install: { label: 'Install', dot: 'bg-amber-500', ring: 'ring-amber-200', text: 'text-amber-700' },
  office: { label: 'Office', dot: 'bg-teal-600', ring: 'ring-teal-200', text: 'text-teal-700' },
};

const TONE_STYLE: Record<NextStep['tone'], { box: string; icon: JSX.Element; button: string }> = {
  info: { box: 'bg-blue-50/70 text-blue-900', icon: <Lightbulb className="h-3.5 w-3.5 text-blue-600" />, button: 'text-blue-700 hover:bg-blue-100' },
  warn: { box: 'bg-amber-50/80 text-amber-900', icon: <AlertTriangle className="h-3.5 w-3.5 text-amber-600" />, button: 'text-amber-800 hover:bg-amber-100' },
  bad: { box: 'bg-red-50/80 text-red-900', icon: <XCircle className="h-3.5 w-3.5 text-red-600" />, button: 'text-red-700 hover:bg-red-100' },
  good: { box: 'bg-green-50/80 text-green-900', icon: <PartyPopper className="h-3.5 w-3.5 text-green-600" />, button: 'text-green-700 hover:bg-green-100' },
};

function formatDate(iso: string | null) {
  if (!iso) return null;
  const d = new Date(iso.length > 10 ? iso : `${iso}T12:00:00`);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: d.getFullYear() !== new Date().getFullYear() ? 'numeric' : undefined });
}

function eventSummary(ev: StoryEvent) {
  return [formatDate(ev.date), ev.actor ? `by ${ev.actor}` : null, ev.detail].filter(Boolean).join(' \u00b7 ');
}

function StripDot({ ev }: { ev: StoryEvent }) {
  const g = GROUP_STYLE[ev.group];
  const title = [ev.label, eventSummary(ev)].filter(Boolean).join(' \u2014 ')
    + (ev.state === 'upcoming' ? ' (to do)' : ev.state === 'skipped' ? ' (not recorded)' : '');
  const cls =
    ev.state === 'done' ? g.dot :
    ev.state === 'declined' ? 'bg-red-500' :
    ev.state === 'current' ? `${g.dot} ring-2 ${g.ring} animate-pulse` :
    ev.state === 'skipped' ? 'bg-gray-200' : 'bg-white border border-gray-300';
  return <span title={title} className={`h-2 flex-1 min-w-[6px] rounded-full transition-colors ${cls}`} />;
}

function StoryRow({ ev, onOpenLink }: { ev: StoryEvent; onOpenLink: (link: StoryLink) => void }) {
  const g = GROUP_STYLE[ev.group];
  const muted = ev.state === 'skipped';
  const clickable = !!ev.link && !muted;
  const marker =
    ev.state === 'done' ? <span className={`flex h-4 w-4 items-center justify-center rounded-full ${g.dot}`}><Check className="h-2.5 w-2.5 text-white" /></span> :
    ev.state === 'declined' ? <span className="flex h-4 w-4 items-center justify-center rounded-full bg-red-500"><XCircle className="h-2.5 w-2.5 text-white" /></span> :
    ev.state === 'current' ? <span className="flex h-4 w-4 items-center justify-center"><span className={`h-2 w-2 rounded-full ${g.dot} ring-4 ${g.ring}`} /></span> :
    <span className="flex h-4 w-4 items-center justify-center"><Minus className="h-3 w-3 text-gray-300" /></span>;

  const content = (
    <>
      {marker}
      <span className={`text-xs ${muted ? 'text-gray-400' : ev.state === 'declined' ? 'font-medium text-red-700' : 'font-medium text-gray-800'}`}>{ev.label}</span>
      <span className={`text-[10px] font-semibold ${muted ? 'text-gray-300' : g.text}`}>{g.label}</span>
      <span className="min-w-0 flex-1 truncate text-right text-[11px] text-gray-400">
        {ev.state === 'current' ? 'Up next' : muted ? 'Not recorded' : eventSummary(ev)}
      </span>
      {clickable && <ChevronRight className="h-3 w-3 flex-shrink-0 text-gray-300 group-hover:text-gray-500" />}
    </>
  );

  return (
    <li>
      {clickable ? (
        <button onClick={() => onOpenLink(ev.link!)} className="group flex w-full items-center gap-2 rounded-md px-1.5 py-1 text-left hover:bg-gray-50 transition-colors">
          {content}
        </button>
      ) : (
        <div className="flex items-center gap-2 px-1.5 py-1">{content}</div>
      )}
    </li>
  );
}

export default function DealStory({ deal, activities, employees, onOpenLink, onAction }: Props) {
  const [expanded, setExpanded] = useState(false);
  const refreshKey = `${deal.sales_stage}|${deal.install_status}|${deal.office_status}|${activities.length}`;
  const { estimates, workOrders, invoices, loading, error } = useDealStoryData(deal.id, refreshKey);
  const { events, next } = useMemo(
    () => buildDealStory(deal as Deal & Record<string, unknown>, activities, employees, estimates, workOrders, invoices),
    [deal, activities, employees, estimates, workOrders, invoices],
  );

  useEffect(() => { setExpanded(false); }, [deal.id]);

  const tone = TONE_STYLE[next.tone];
  const doneCount = events.filter(e => e.state === 'done' || e.state === 'declined').length;
  const shown = events.filter(e => e.state !== 'upcoming');
  const remaining = events.length - shown.length;

  return (
    <div className="space-y-2">
      <div className={`flex items-center gap-2 rounded-lg px-2.5 py-1.5 ${tone.box}`}>
        <span className="flex-shrink-0">{tone.icon}</span>
        <p className="min-w-0 flex-1 text-xs leading-snug">
          <span className="font-semibold">Next: </span>
          {loading ? 'Reading the deal story...' : next.message}
        </p>
        {!loading && next.action && (
          <button
            onClick={() => onAction(next.action!)}
            className={`flex-shrink-0 inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-semibold transition-colors ${tone.button}`}
          >
            {next.action.label} <ArrowRight className="h-3 w-3" />
          </button>
        )}
      </div>

      <div className="flex items-center gap-3">
        <div className="flex flex-1 items-center gap-1" aria-label="Deal progress">
          {events.map(ev => <StripDot key={ev.key} ev={ev} />)}
        </div>
        <span className="flex-shrink-0 text-[11px] text-gray-500">{doneCount} of {events.length} done</span>
        <button
          onClick={() => setExpanded(e => !e)}
          className="flex-shrink-0 inline-flex items-center gap-0.5 text-[11px] font-medium text-blue-600 hover:text-blue-700"
        >
          {expanded ? 'Hide' : 'Show full story'}
          <ChevronDown className={`h-3 w-3 transition-transform ${expanded ? 'rotate-180' : ''}`} />
        </button>
      </div>

      {expanded && (
        <div className="rounded-lg border border-gray-100 bg-white py-1">
          {error && <p className="mx-1.5 mb-1 rounded bg-red-50 px-2 py-1 text-[11px] text-red-700">Some details could not be loaded.</p>}
          <ul>
            {shown.map(ev => <StoryRow key={ev.key} ev={ev} onOpenLink={onOpenLink} />)}
          </ul>
          {remaining > 0 && (
            <p className="px-1.5 pt-0.5 pb-1 pl-[30px] text-[11px] text-gray-400">
              {remaining} more step{remaining === 1 ? '' : 's'} to go
            </p>
          )}
        </div>
      )}
    </div>
  );
}
