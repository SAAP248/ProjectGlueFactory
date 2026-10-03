import { useEffect, useState } from 'react';
import { BookOpen, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import { useAppSetting, saveAppSetting } from '../../lib/useAppSettings';

const FIELDS = [
  { key: 'proposal_tagline', label: 'Tagline', hint: 'Short line shown above the About Us section.', rows: 0 },
  { key: 'proposal_about_us', label: 'About Us', hint: 'Separate paragraphs with a blank line.', rows: 6 },
  { key: 'proposal_highlights', label: 'Highlights', hint: 'One per line, e.g. "24/7 UL-listed monitoring".', rows: 4 },
  { key: 'proposal_terms', label: 'Default Terms & Conditions', hint: 'Used when an estimate has no terms of its own.', rows: 8 },
  { key: 'proposal_cover_image', label: 'Default cover image URL', hint: 'Must start with https://', rows: 0 },
  { key: 'proposal_about_image', label: 'About Us image URL', hint: 'Must start with https://', rows: 0 },
] as const;

type Key = typeof FIELDS[number]['key'];

export default function ProposalDefaultsPanel() {
  const settings = {
    proposal_tagline: useAppSetting('proposal_tagline'),
    proposal_about_us: useAppSetting('proposal_about_us'),
    proposal_highlights: useAppSetting('proposal_highlights'),
    proposal_terms: useAppSetting('proposal_terms'),
    proposal_cover_image: useAppSetting('proposal_cover_image'),
    proposal_about_image: useAppSetting('proposal_about_image'),
  };
  const loading = Object.values(settings).some(([, l]) => l);
  const [values, setValues] = useState<Record<Key, string> | null>(null);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<'saved' | 'error' | null>(null);

  const snapshot = FIELDS.map((f) => settings[f.key][0]).join('\u0000');
  useEffect(() => {
    if (loading) return;
    setValues(Object.fromEntries(FIELDS.map((f) => [f.key, settings[f.key][0]])) as Record<Key, string>);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, snapshot]);

  const invalidUrl = (k: Key) =>
    (k === 'proposal_cover_image' || k === 'proposal_about_image') && !!values?.[k].trim() && !/^https:\/\//i.test(values[k].trim());
  const hasInvalid = FIELDS.some((f) => invalidUrl(f.key));

  const save = async () => {
    if (!values || hasInvalid) return;
    setSaving(true);
    setStatus(null);
    try {
      for (const f of FIELDS) {
        const v = values[f.key].trim();
        if (v !== settings[f.key][0]) await saveAppSetting(f.key, v);
      }
      setStatus('saved');
      setTimeout(() => setStatus(null), 2500);
    } catch {
      setStatus('error');
    }
    setSaving(false);
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
      <div className="px-6 py-5 border-b border-gray-100">
        <div className="flex items-center gap-3 mb-1">
          <div className="bg-sky-100 p-2.5 rounded-xl">
            <BookOpen className="h-5 w-5 text-sky-700" />
          </div>
          <h3 className="text-lg font-bold text-gray-900">Proposal Defaults</h3>
        </div>
        <p className="text-sm text-gray-500 ml-11">
          Content used in every customer proposal book. Individual estimates can override the cover, scope of work and terms.
        </p>
      </div>
      {!values ? (
        <div className="p-10 flex justify-center"><Loader2 className="w-5 h-5 animate-spin text-gray-400" /></div>
      ) : (
        <div className="p-6 space-y-5">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {FIELDS.map((f) => (
              <label key={f.key} className={`block ${f.rows >= 6 ? 'lg:col-span-2' : ''}`}>
                <span className="block text-sm font-medium text-gray-800 mb-1">{f.label}</span>
                {f.rows ? (
                  <textarea
                    rows={f.rows}
                    value={values[f.key]}
                    onChange={(e) => setValues({ ...values, [f.key]: e.target.value })}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg resize-y focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                ) : (
                  <input
                    value={values[f.key]}
                    onChange={(e) => setValues({ ...values, [f.key]: e.target.value })}
                    className={`w-full px-3 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent ${invalidUrl(f.key) ? 'border-red-400' : 'border-gray-300'}`}
                  />
                )}
                <span className={`block text-xs mt-1 ${invalidUrl(f.key) ? 'text-red-600' : 'text-gray-500'}`}>{f.hint}</span>
                {(f.key === 'proposal_cover_image' || f.key === 'proposal_about_image') && values[f.key] && !invalidUrl(f.key) && (
                  <img src={values[f.key]} alt="" className="mt-2 h-24 w-full object-cover rounded-lg border border-gray-200" />
                )}
              </label>
            ))}
          </div>
          <div className="flex items-center justify-end gap-3 pt-2 border-t border-gray-100">
            {status === 'saved' && <span className="flex items-center gap-1.5 text-sm text-emerald-700"><CheckCircle2 className="w-4 h-4" /> Saved</span>}
            {status === 'error' && <span className="flex items-center gap-1.5 text-sm text-red-600"><AlertCircle className="w-4 h-4" /> Could not save. Please try again.</span>}
            <button onClick={save} disabled={saving || hasInvalid} className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors">
              {saving && <Loader2 className="w-4 h-4 animate-spin" />} Save defaults
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
