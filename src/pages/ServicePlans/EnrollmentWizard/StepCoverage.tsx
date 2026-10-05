import { Check, Cpu, MapPin, ShieldCheck } from 'lucide-react';
import type { WizardSite } from './types';

interface Props {
  sites: WizardSite[];
  coveredSites: Map<string, string>;
  coverage: Record<string, string[]>;
  onChange: (c: Record<string, string[]>) => void;
}

export default function StepCoverage({ sites, coveredSites, coverage, onChange }: Props) {
  function toggleSite(id: string) {
    const next = { ...coverage };
    if (next[id]) delete next[id];
    else next[id] = sites.find(s => s.id === id)?.systems.map(s => s.id) ?? [];
    onChange(next);
  }

  function toggleSystem(siteId: string, sysId: string) {
    const cur = coverage[siteId] ?? [];
    onChange({ ...coverage, [siteId]: cur.includes(sysId) ? cur.filter(x => x !== sysId) : [...cur, sysId] });
  }

  return (
    <div className="space-y-4">
      <div>
        <h2 className="font-display text-2xl text-gray-900">Which sites and equipment are covered?</h2>
        <p className="text-sm text-gray-500 mt-1">Pick one or more sites. Leave all equipment unchecked to cover the whole site.</p>
      </div>
      {sites.length === 0 && (
        <div className="rounded-xl border border-dashed border-gray-300 bg-white p-8 text-center text-sm text-gray-500">
          This customer has no sites yet. Add a site on their profile first.
        </div>
      )}
      <div className="space-y-3">
        {sites.map(site => {
          const selected = !!coverage[site.id];
          const existing = coveredSites.get(site.id);
          return (
            <div key={site.id} className={`rounded-xl border bg-white transition-all ${selected ? 'border-blue-500 ring-2 ring-blue-500/15' : 'border-gray-200'}`}>
              <button onClick={() => toggleSite(site.id)} className="w-full flex items-center gap-3 p-4 text-left">
                <span className={`w-5 h-5 rounded-md border flex items-center justify-center transition-colors ${selected ? 'bg-blue-600 border-blue-600' : 'border-gray-300'}`}>
                  {selected && <Check className="h-3.5 w-3.5 text-white" />}
                </span>
                <MapPin className="h-4 w-4 text-gray-400" />
                <span className="flex-1 min-w-0">
                  <span className="block font-medium text-gray-900 text-sm">{site.name}</span>
                  <span className="block text-xs text-gray-500 truncate">{[site.address, site.city].filter(Boolean).join(', ')}</span>
                </span>
                {existing && (
                  <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-700 bg-emerald-50 rounded-md px-2 py-0.5">
                    <ShieldCheck className="h-3 w-3" /> {existing}
                  </span>
                )}
              </button>
              {selected && site.systems.length > 0 && (
                <div className="px-4 pb-4 pl-12 flex flex-wrap gap-2 animate-fade-in">
                  {site.systems.map(sys => {
                    const on = coverage[site.id]?.includes(sys.id);
                    return (
                      <button key={sys.id} onClick={() => toggleSystem(site.id, sys.id)}
                        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium border transition-colors ${on ? 'bg-blue-50 border-blue-200 text-blue-700' : 'bg-white border-gray-200 text-gray-500 hover:border-gray-300'}`}>
                        <Cpu className="h-3 w-3" /> {sys.name}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
