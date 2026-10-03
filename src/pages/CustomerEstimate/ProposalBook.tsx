import type { ReactNode } from 'react';
import { ArrowLeft, ArrowRight, BookOpen, Building2, ClipboardList, FileText, ScrollText, ShieldCheck, CheckCircle2, MapPin, Calendar } from 'lucide-react';
import type { CustomerEstimateData } from './api';
import { addressLines, formatLongDate, formatMoney } from './api';
import EstimateDocument from './EstimateDocument';

export const PROPOSAL_PAGES = [
  { id: 'cover', label: 'Cover', icon: BookOpen },
  { id: 'about', label: 'About Us', icon: Building2 },
  { id: 'scope', label: 'Scope of Work', icon: ClipboardList },
  { id: 'estimate', label: 'Estimate', icon: FileText },
  { id: 'terms', label: 'Terms & Acceptance', icon: ScrollText },
] as const;

export type ProposalPageId = typeof PROPOSAL_PAGES[number]['id'];

interface Props {
  data: CustomerEstimateData;
  page: ProposalPageId;
  onNavigate: (page: ProposalPageId) => void;
  response: ReactNode;
}

export default function ProposalBook({ data, page, onNavigate, response }: Props) {
  const index = PROPOSAL_PAGES.findIndex((p) => p.id === page);
  const prev = PROPOSAL_PAGES[index - 1];
  const next = PROPOSAL_PAGES[index + 1];

  const pages: Record<ProposalPageId, ReactNode> = {
    cover: <CoverPage data={data} onBegin={() => onNavigate('about')} />,
    about: <AboutPage data={data} />,
    scope: <ScopePage data={data} />,
    estimate: <EstimateDocument data={data} />,
    terms: <TermsPage data={data} response={response} />,
  };

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 sm:py-10 lg:grid lg:grid-cols-[220px_1fr] lg:gap-10">
      <nav className="print:hidden mb-6 lg:mb-0">
        <div className="lg:sticky lg:top-24">
          <p className="hidden lg:block text-[11px] font-semibold uppercase tracking-[0.15em] text-slate-400 mb-3 px-3">Contents</p>
          <ol className="flex lg:flex-col gap-1 overflow-x-auto -mx-4 px-4 lg:mx-0 lg:px-0 pb-1 lg:pb-0">
            {PROPOSAL_PAGES.map((p, i) => {
              const active = p.id === page;
              const done = i < index;
              return (
                <li key={p.id} className="flex-shrink-0">
                  <button
                    onClick={() => onNavigate(p.id)}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all ${active ? 'bg-slate-900 text-white shadow-sm' : 'text-slate-600 hover:bg-white hover:text-slate-900'}`}
                  >
                    <span className={`w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-semibold flex-shrink-0 ${active ? 'bg-white/15 text-white' : done ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-200 text-slate-600'}`}>
                      {done ? <CheckCircle2 className="w-3.5 h-3.5" /> : i + 1}
                    </span>
                    <span className="whitespace-nowrap font-medium">{p.label}</span>
                  </button>
                </li>
              );
            })}
          </ol>
          <div className="hidden lg:block mt-6 px-3">
            <div className="h-1 rounded-full bg-slate-200 overflow-hidden">
              <div className="h-full bg-blue-600 transition-all duration-500" style={{ width: `${((index + 1) / PROPOSAL_PAGES.length) * 100}%` }} />
            </div>
            <p className="text-xs text-slate-500 mt-2">Page {index + 1} of {PROPOSAL_PAGES.length}</p>
          </div>
        </div>
      </nav>

      <div className="min-w-0">
        {PROPOSAL_PAGES.map((p) => (
          <div key={p.id} className={`${p.id === page ? 'block animate-fade-in' : 'hidden'} print:block print:break-after-page`}>
            {pages[p.id]}
          </div>
        ))}

        <div className="flex items-center justify-between mt-8 print:hidden">
          {prev ? (
            <button onClick={() => onNavigate(prev.id)} className="group flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-slate-700 bg-white border border-slate-200 rounded-xl hover:border-slate-300 hover:shadow-sm transition-all">
              <ArrowLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" /> {prev.label}
            </button>
          ) : <span />}
          {next && (
            <button onClick={() => onNavigate(next.id)} className="group flex items-center gap-2 px-5 py-2.5 text-sm font-semibold text-white bg-slate-900 rounded-xl hover:bg-slate-800 shadow-sm transition-all">
              {next.label} <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function PageCard({ eyebrow, title, children }: { eyebrow: string; title: string; children: ReactNode }) {
  return (
    <article className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 sm:p-10 print:shadow-none print:border-0">
      <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-blue-700">{eyebrow}</p>
      <h2 className="font-display text-3xl sm:text-4xl text-slate-900 mt-2 mb-8 leading-tight">{title}</h2>
      {children}
    </article>
  );
}

function CoverPage({ data, onBegin }: { data: CustomerEstimateData; onBegin: () => void }) {
  const { estimate: est, company, site, business, settings } = data;
  const image = est.cover_image_url || settings.proposal_cover_image;
  const title = est.cover_title || data.deal_title || 'Your Project Proposal';
  const siteLine = addressLines(site).join(', ');

  return (
    <article className="relative overflow-hidden rounded-2xl bg-slate-900 text-white min-h-[560px] flex flex-col shadow-xl print:min-h-[9.5in]">
      {image && <img src={image} alt="" className="absolute inset-0 w-full h-full object-cover opacity-60" />}
      <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-900/70 to-slate-900/20" />
      <div className="relative flex items-center gap-3 p-6 sm:p-10">
        <div className="w-10 h-10 rounded-xl bg-white/10 backdrop-blur border border-white/20 flex items-center justify-center">
          <ShieldCheck className="w-5 h-5" />
        </div>
        <span className="text-sm font-semibold tracking-wide">{business?.name || 'Our Company'}</span>
      </div>
      <div className="relative mt-auto p-6 sm:p-10">
        <p className="text-[11px] font-semibold uppercase tracking-[0.25em] text-teal-300">Proposal #{est.estimate_number}</p>
        <h1 className="font-display text-4xl sm:text-6xl leading-[1.1] mt-3 max-w-3xl">{title}</h1>
        <div className="mt-8 grid grid-cols-1 sm:grid-cols-3 gap-5 max-w-3xl text-sm">
          <div>
            <p className="text-white/50 text-xs uppercase tracking-wider mb-1">Prepared for</p>
            <p className="font-medium">{company?.name || 'Valued Customer'}</p>
          </div>
          {siteLine && (
            <div>
              <p className="text-white/50 text-xs uppercase tracking-wider mb-1 flex items-center gap-1"><MapPin className="w-3 h-3" /> Location</p>
              <p className="font-medium">{siteLine}</p>
            </div>
          )}
          <div>
            <p className="text-white/50 text-xs uppercase tracking-wider mb-1 flex items-center gap-1"><Calendar className="w-3 h-3" /> Date</p>
            <p className="font-medium">{formatLongDate(est.estimate_date)}</p>
          </div>
        </div>
        <button onClick={onBegin} className="group mt-10 inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-white text-slate-900 text-sm font-semibold hover:bg-slate-100 transition-colors print:hidden">
          Open Proposal <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
        </button>
      </div>
    </article>
  );
}

function AboutPage({ data }: { data: CustomerEstimateData }) {
  const { business, settings } = data;
  const paragraphs = (settings.proposal_about_us || '').split(/\n\s*\n/).filter(Boolean);
  const highlights = (settings.proposal_highlights || '').split('\n').map((s) => s.trim()).filter(Boolean);

  return (
    <PageCard eyebrow="About Us" title={business?.name ? `Meet ${business.name}` : 'Who We Are'}>
      <div className="grid grid-cols-1 md:grid-cols-5 gap-8">
        <div className="md:col-span-3 space-y-4">
          {settings.proposal_tagline && <p className="text-lg text-slate-700 leading-relaxed">{settings.proposal_tagline}</p>}
          {paragraphs.map((p, i) => <p key={i} className="text-sm text-slate-600 leading-relaxed whitespace-pre-wrap">{p}</p>)}
          {business?.license_number && <p className="text-xs text-slate-400 pt-2">License #{business.license_number}</p>}
        </div>
        {settings.proposal_about_image && (
          <div className="md:col-span-2">
            <img src={settings.proposal_about_image} alt="Our team at work" className="w-full h-64 md:h-full max-h-80 object-cover rounded-xl" />
          </div>
        )}
      </div>
      {highlights.length > 0 && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mt-10">
          {highlights.map((h) => (
            <div key={h} className="rounded-xl bg-slate-50 border border-slate-100 p-4 hover:border-blue-200 hover:bg-blue-50/40 transition-colors">
              <CheckCircle2 className="w-5 h-5 text-teal-600 mb-2" />
              <p className="text-sm font-medium text-slate-800">{h}</p>
            </div>
          ))}
        </div>
      )}
    </PageCard>
  );
}

function ScopePage({ data }: { data: CustomerEstimateData }) {
  const { estimate: est, systems, rooms, line_items } = data;
  const scope = est.scope_of_work || '';
  return (
    <PageCard eyebrow="Scope of Work" title="What we'll deliver">
      {scope ? (
        <div className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">{scope}</div>
      ) : (
        <p className="text-sm text-slate-600 leading-relaxed">
          This project includes the supply, installation, programming and testing of the {line_items.length} item{line_items.length === 1 ? '' : 's'} detailed in the estimate, followed by a full walkthrough and training session with your team.
        </p>
      )}
      {(systems.length > 0 || rooms.length > 0) && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mt-10">
          {systems.length > 0 && <ChipList label="Systems" items={systems.map((s) => s.name)} />}
          {rooms.length > 0 && <ChipList label="Areas" items={rooms.map((r) => r.name)} />}
        </div>
      )}
      <div className="mt-10 rounded-xl bg-slate-900 text-white p-6 flex items-center justify-between">
        <span className="text-sm text-white/70">Total investment</span>
        <span className="text-2xl font-semibold tabular-nums">{formatMoney(est.total)}</span>
      </div>
    </PageCard>
  );
}

function ChipList({ label, items }: { label: string; items: string[] }) {
  return (
    <div>
      <p className="text-[11px] font-semibold uppercase tracking-[0.15em] text-slate-400 mb-3">{label}</p>
      <div className="flex flex-wrap gap-2">
        {items.map((i) => <span key={i} className="px-3 py-1.5 text-sm text-slate-700 bg-slate-100 rounded-full">{i}</span>)}
      </div>
    </div>
  );
}

function TermsPage({ data, response }: { data: CustomerEstimateData; response: ReactNode }) {
  const terms = data.estimate.terms || data.settings.proposal_terms || '';
  return (
    <div className="space-y-6">
      <PageCard eyebrow="Terms & Conditions" title="The fine print, made clear">
        {terms ? (
          <div className="text-sm text-slate-600 leading-relaxed whitespace-pre-wrap max-h-[480px] overflow-y-auto pr-2 print:max-h-none">{terms}</div>
        ) : (
          <p className="text-sm text-slate-500">Standard terms apply. Ask our team if you have any questions.</p>
        )}
      </PageCard>
      {response}
    </div>
  );
}
