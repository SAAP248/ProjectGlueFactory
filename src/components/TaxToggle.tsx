import { Info, ShieldCheck } from 'lucide-react';
import type { TaxQuote } from '../lib/salesTax';

const money = (n: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(Number(n) || 0);

export function TaxToggle({ taxable, onChange, disabled = false }: { taxable: boolean; onChange?: (v: boolean) => void; disabled?: boolean }) {
  const readOnly = disabled || !onChange;
  return (
    <button
      type="button"
      role="switch"
      aria-checked={taxable}
      disabled={readOnly}
      onClick={() => onChange?.(!taxable)}
      title={readOnly ? undefined : taxable ? 'Sales tax is charged on this line. Click to stop.' : 'No sales tax on this line. Click to charge tax.'}
      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold whitespace-nowrap transition-colors ${
        taxable ? 'bg-blue-50 text-blue-700 ring-1 ring-inset ring-blue-200' : 'bg-gray-100 text-gray-500 ring-1 ring-inset ring-gray-200'
      } ${readOnly ? 'cursor-default' : 'hover:ring-blue-400'}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${taxable ? 'bg-blue-600' : 'bg-gray-400'}`} />
      {taxable ? 'Tax' : 'No tax'}
    </button>
  );
}

export function TaxBreakdownHint({ quote }: { quote: Pick<TaxQuote, 'state' | 'county' | 'city' | 'state_rate' | 'county_rate' | 'city_rate' | 'county_name' | 'city_name' | 'taxable'> }) {
  return (
    <span className="group relative inline-flex">
      <Info className="w-3.5 h-3.5 text-gray-400" />
      <span className="pointer-events-none absolute bottom-full left-1/2 z-30 mb-2 w-60 -translate-x-1/2 rounded-lg bg-gray-900 px-3 py-2.5 text-xs text-white opacity-0 shadow-lg transition-opacity group-hover:opacity-100">
        <span className="block mb-1.5 text-gray-300">On {money(quote.taxable)} taxable · shown to the customer as one line</span>
        <span className="flex justify-between"><span>Florida {Number(quote.state_rate)}%</span><span>{money(quote.state)}</span></span>
        <span className="flex justify-between"><span>{quote.county_name ?? 'County'} surtax {Number(quote.county_rate)}%</span><span>{money(quote.county)}</span></span>
        {Number(quote.city) > 0 && <span className="flex justify-between"><span>{quote.city_name ?? 'City'} {Number(quote.city_rate)}%</span><span>{money(quote.city)}</span></span>}
      </span>
    </span>
  );
}

export function ExemptNotice({ certificate, expires }: { certificate: string | null; expires: string | null }) {
  return (
    <div className="flex items-start gap-2 rounded-lg bg-emerald-50 px-3 py-2 text-xs text-emerald-800">
      <ShieldCheck className="w-4 h-4 shrink-0 mt-px" />
      <span>Customer is tax exempt{certificate ? ` (certificate ${certificate}` : ''}{certificate && expires ? `, good through ${new Date(expires + 'T00:00:00').toLocaleDateString('en-US')})` : certificate ? ')' : ''}. No sales tax is charged.</span>
    </div>
  );
}
