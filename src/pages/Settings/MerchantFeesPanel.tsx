import { useEffect, useState } from 'react';
import { CreditCard, Landmark, Percent, Loader2, CheckCircle2, AlertTriangle, Info } from 'lucide-react';
import { saveAppSetting } from '../../lib/useAppSettings';
import { useFeeRates, FEE_SETTING_KEYS, estimateFee, type FeeRates } from '../../lib/merchantFees';

type Draft = Record<keyof FeeRates, string>;

function toDraft(r: FeeRates): Draft {
  return {
    cardPct: String(r.cardPct),
    cardFlat: r.cardFlat.toFixed(2),
    achPct: String(r.achPct),
    achFlat: r.achFlat.toFixed(2),
    surchargePct: String(r.surchargePct),
  };
}

function RateInput({ label, prefix, suffix, value, onChange }: {
  label: string; prefix?: string; suffix?: string; value: string; onChange: (v: string) => void;
}) {
  return (
    <label className="block">
      <span className="text-xs font-medium text-gray-600">{label}</span>
      <div className="mt-1 flex items-center rounded-lg border border-gray-200 bg-white focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-100 transition">
        {prefix && <span className="pl-3 text-sm text-gray-400">{prefix}</span>}
        <input
          type="number"
          step="0.01"
          min="0"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full bg-transparent px-3 py-2 text-sm text-gray-900 outline-none"
        />
        {suffix && <span className="pr-3 text-sm text-gray-400">{suffix}</span>}
      </div>
    </label>
  );
}

export default function MerchantFeesPanel() {
  const { rates, loading } = useFeeRates();
  const [draft, setDraft] = useState<Draft>(toDraft(rates));
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ tone: 'ok' | 'error'; text: string } | null>(null);

  useEffect(() => {
    if (!loading) setDraft(toDraft(rates));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading]);

  const set = (k: keyof FeeRates) => (v: string) => setDraft((d) => ({ ...d, [k]: v }));

  const parsed: FeeRates = {
    cardPct: Math.max(0, parseFloat(draft.cardPct) || 0),
    cardFlat: Math.max(0, parseFloat(draft.cardFlat) || 0),
    achPct: Math.max(0, parseFloat(draft.achPct) || 0),
    achFlat: Math.max(0, parseFloat(draft.achFlat) || 0),
    surchargePct: Math.max(0, parseFloat(draft.surchargePct) || 0),
  };

  async function save() {
    setSaving(true);
    setMessage(null);
    try {
      await Promise.all((Object.keys(parsed) as (keyof FeeRates)[]).map((k) =>
        saveAppSetting(FEE_SETTING_KEYS[k], String(parsed[k]))
      ));
      setMessage({ tone: 'ok', text: 'Rates saved. New payments will use these rates; past payments keep their recorded fee.' });
    } catch {
      setMessage({ tone: 'error', text: 'Could not save the rates. Please try again.' });
    }
    setSaving(false);
  }

  if (loading) {
    return (
      <div className="flex justify-center rounded-xl border border-gray-200 bg-white py-16">
        <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-gray-200 bg-white p-6">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600">
            <CreditCard className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Merchant Fees</h2>
            <p className="mt-1 text-sm leading-relaxed text-gray-600">
              Processing rates used to estimate the fee on every card and ACH payment. Check, cash and wire payments carry no fee.
              Estimated fees are replaced with actual fees when you sync with CSG Forte from the Merchant Service Fee report.
            </p>
          </div>
        </div>
      </div>

      {message && (
        <div className={`flex items-center gap-2 rounded-lg border px-4 py-2.5 text-sm ${
          message.tone === 'ok' ? 'border-emerald-200 bg-emerald-50 text-emerald-800' : 'border-red-200 bg-red-50 text-red-700'
        }`}>
          {message.tone === 'ok' ? <CheckCircle2 className="h-4 w-4" /> : <AlertTriangle className="h-4 w-4" />}
          {message.text}
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-xl border border-gray-200 bg-white p-5">
          <div className="mb-4 flex items-center gap-2 text-sm font-semibold text-gray-900">
            <CreditCard className="h-4 w-4 text-blue-600" /> Credit card
          </div>
          <div className="grid grid-cols-2 gap-3">
            <RateInput label="Percent" suffix="%" value={draft.cardPct} onChange={set('cardPct')} />
            <RateInput label="Per transaction" prefix="$" value={draft.cardFlat} onChange={set('cardFlat')} />
          </div>
          <p className="mt-3 text-xs text-gray-500">On a $1,000 payment: <span className="font-medium text-gray-800">${estimateFee('credit_card', 1000, parsed).toFixed(2)}</span></p>
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-5">
          <div className="mb-4 flex items-center gap-2 text-sm font-semibold text-gray-900">
            <Landmark className="h-4 w-4 text-teal-600" /> ACH
          </div>
          <div className="grid grid-cols-2 gap-3">
            <RateInput label="Percent" suffix="%" value={draft.achPct} onChange={set('achPct')} />
            <RateInput label="Per transaction" prefix="$" value={draft.achFlat} onChange={set('achFlat')} />
          </div>
          <p className="mt-3 text-xs text-gray-500">On a $1,000 payment: <span className="font-medium text-gray-800">${estimateFee('ach', 1000, parsed).toFixed(2)}</span></p>
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-5">
          <div className="mb-4 flex items-center gap-2 text-sm font-semibold text-gray-900">
            <Percent className="h-4 w-4 text-amber-600" /> Card fee surcharge
          </div>
          <RateInput label="Default surcharge" suffix="%" value={draft.surchargePct} onChange={set('surchargePct')} />
          <p className="mt-3 flex gap-1.5 text-xs text-gray-500">
            <Info className="h-3.5 w-3.5 flex-shrink-0 mt-0.5" />
            Turned on per invoice. Shown to the customer as its own line and never counted as profit.
          </p>
        </div>
      </div>

      <div className="flex justify-end">
        <button
          onClick={save}
          disabled={saving}
          className="flex items-center gap-2 rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-blue-700 disabled:opacity-60"
        >
          {saving && <Loader2 className="h-4 w-4 animate-spin" />}
          Save rates
        </button>
      </div>
    </div>
  );
}
