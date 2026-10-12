import { useMemo } from 'react';
import { AlertTriangle, ArrowRight, CheckCircle2, ChevronRight, Circle, Lightbulb, XCircle, PartyPopper, MinusCircle } from 'lucide-react';
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

const GROUP_STYLE: Record<StoryGroup, { label: string; dot: string; chip: string; line: string }> = {
  sales: { label: 'Sales', dot: 'bg-blue-600', chip: 'bg-blue-50 text-blue-700', line: 'bg-blue-200' },
  install: { label: 'Install', dot: 'bg-amber-500', chip: 'bg-amber-50 text-amber-800', line: 'bg-amber-200' },
  office: { label: 'Office', dot: 'bg-teal-600', chip: 'bg-teal-50 text-teal-700', line: 'bg-teal-200' },
};

const TONE_STYLE: Record<NextStep['tone'], { box: string; icon: JSX.Element; button: string }> = {
  info: { box: 'border-blue-200 bg-blue-50 text-blue-900', icon: <Lightbulb className="h-4 w-4 text-blue-600" />, button: 'bg-blue-600 hover:bg-blue-700' },
  warn: { box: 'border-amber-200 bg-amber-50 text-amber-900', icon: <AlertTriangle className="h-4 w-4 text-amber-600" />, button: 'bg-amber-600 hover:bg-amber-700' },
  bad: { box: 'border-red-200 bg-red-50 text-red-900', icon: <XCircle className="h-4 w-4 text-red-600" />, button: 'bg-red-600 hover:bg-red-700' },
  good: { box: 'border-green-200 bg-green-50 text-green-900', icon: <PartyPopper className="h-4 w-4 text-green-600" />, button: 'bg-green-600 hover:bg-green-700' },
};

function formatDate(iso: string | null) {
  if (!iso) return null;
  const hasTime = iso.length > 10;
  const d = new Date(hasTime ? iso : `${iso}T12:00:00`);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: d.getFullYear() !== new Date().getFullYear() ? 'numeric' : undefined })
    + (hasTime ? ` \u00b7 ${d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}` : '');
}

function EventIcon({ event }: { event: StoryEvent }) {
  const g = GROUP_STYLE[event.group];
  if (event.state === 'done') return <span className={`flex h-6 w-6 items-center justify-center rounded-full ${g.dot} ring-4 ring-white`}><CheckCircle2 className="h-3.5 w-3.5 text-white" /></span>;
  if (event.state === 'declined') return <span className="flex h-6 w-6 items-center justify-center rounded-full bg-red-600 ring-4 ring-white"><XCircle className="h-3.5 w-3.5 text-white" /></span>;
  if (event.state === 'current') return (
    <span className="relative flex h-6 w-6 items-center justify-center rounded-full bg-white ring-4 ring-white">
      <span className={`absolute inset-0 rounded-full ${g.dot} opacity-25 animate-ping`} />
      <span className={`relative h-3 w-3 rounded-full ${g.dot}`} />
    </span>
  );
  if (event.state === 'skipped') return <span className="flex h-6 w-6 items-center justify-center rounded-full bg-white ring-4 ring-white"><MinusCircle className="h-4 w-4 text-gray-300" /></span>;
  return <span className="flex h-6 w-6 items-center justify-center rounded-full bg-white ring-4 ring-white"><Circle className="h-4 w-4 text-gray-300" /></span>;
}

export default function DealStory({ deal, activities, employees, onOpenLink, onAction }: Props) {
  const refreshKey = `${deal.sales_stage}|${deal.install_status}|${deal.office_status}|${activities.length}`;
  const { estimates, workOrders, invoices, loading, error } = useDealStoryData(deal.id, refreshKey);
  const { events, next } = useMemo(
    () => buildDealStory(deal as Deal & Record<string, unknown>, activities, employees, estimates, workOrders, invoices),
    [deal, activities, employees, estimates, workOrders, invoices],
  );
  const tone = TONE_STYLE[next.tone];

  return (
    <div className="space-y-4">
      <div className={`flex items-start gap-3 rounded-xl border p-3.5 ${tone.box}`}>
        <span className="mt-0.5 flex-shrink-0">{tone.icon}</span>
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-semibold uppercase tracking-wider opacity-70">Next step</p>
          <p className="mt-0.5 text-sm font-medium leading-snug">{loading ? 'Reading the deal story...' : next.message}</p>
        </div>
        {!loading && next.action && (
          <button
            onClick={() => onAction(next.action!)}
            className={`flex-shrink-0 inline-flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-semibold text-white transition-colors ${tone.button}`}
          >
            {next.action.label} <ArrowRight className="h-3 w-3" />
          </button>
        )}
      </div>

      <div>
        <div className="mb-3 flex items-center justify-between">
          <span className="text-xs font-semibold uppercase tracking-wider text-gray-500">Deal story</span>
          <div className="flex items-center gap-3">
            {(Object.keys(GROUP_STYLE) as StoryGroup[]).map(g => (
              <span key={g} className="flex items-center gap-1 text-[11px] text-gray-500">
                <span className={`h-2 w-2 rounded-full ${GROUP_STYLE[g].dot}`} /> {GROUP_STYLE[g].label}
              </span>
            ))}
          </div>
        </div>

        {error && <p className="mb-2 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700">Some details could not be loaded. The story may be incomplete.</p>}

        <ol className="relative">
          {events.map((ev, i) => {
            const g = GROUP_STYLE[ev.group];
            const isLast = i === events.length - 1;
            const muted = ev.state === 'upcoming' || ev.state === 'skipped';
            const clickable = !!ev.link && !muted;
            const body = (
              <div className={`flex-1 min-w-0 rounded-lg px-2.5 py-1.5 -my-1 transition-colors ${clickable ? 'group-hover:bg-gray-50' : ''}`}>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className={`text-sm ${muted ? 'text-gray-400' : ev.state === 'declined' ? 'font-semibold text-red-700' : 'font-semibold text-gray-900'}`}>
                    {ev.label}
                  </span>
                  {!muted && <span className={`rounded px-1.5 py-0.5 text-[10px] font-semibold ${g.chip}`}>{g.label}</span>}
                  {ev.state === 'current' && <span className="rounded bg-gray-900 px-1.5 py-0.5 text-[10px] font-semibold text-white">Up next</span>}
                  {ev.state === 'skipped' && <span className="text-[11px] text-gray-400">Not recorded</span>}
                  {clickable && <ChevronRight className="ml-auto h-3.5 w-3.5 text-gray-300 group-hover:text-gray-500" />}
                </div>
                {!muted && (ev.date || ev.actor || ev.detail) && (
                  <p className="mt-0.5 text-xs text-gray-500">
                    {[formatDate(ev.date), ev.actor ? `by ${ev.actor}` : null, ev.detail].filter(Boolean).join(' \u00b7 ')}
                  </p>
                )}
              </div>
            );
            return (
              <li key={ev.key} className="relative flex gap-3 pb-4">
                {!isLast && <span className={`absolute left-[11px] top-6 bottom-0 w-0.5 ${ev.state === 'done' ? g.line : 'bg-gray-100'}`} />}
                <EventIcon event={ev} />
                {clickable ? (
                  <button onClick={() => onOpenLink(ev.link!)} className="group flex flex-1 min-w-0 text-left">{body}</button>
                ) : body}
              </li>
            );
          })}
        </ol>
      </div>
    </div>
  );
}
