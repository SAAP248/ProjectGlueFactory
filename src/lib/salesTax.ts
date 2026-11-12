import { useEffect, useMemo, useState } from 'react';
import { supabase } from './supabase';
import { useAppSetting } from './useAppSettings';

export interface TaxQuote {
  subtotal: number;
  taxable: number;
  exempt_amount: number;
  state: number;
  county: number;
  city: number;
  tax: number;
  state_rate: number;
  county_rate: number;
  city_rate: number;
  county_name: string | null;
  city_name: string | null;
  customer_exempt: boolean;
  certificate: string | null;
  certificate_expires: string | null;
}

export interface TaxLine {
  quantity: number;
  unit_price: number;
  taxable: boolean;
}

export function useLaborTaxable() {
  const [value] = useAppSetting('acct_labor_taxable');
  return value === 'true';
}

export function defaultTaxable(product: { is_taxable?: boolean | null } | null, laborTaxable: boolean) {
  return product ? product.is_taxable ?? true : laborTaxable;
}

export function useTaxQuote(companyId: string | null, siteId: string | null, date: string | null, lines: TaxLine[]) {
  const [quote, setQuote] = useState<TaxQuote | null>(null);
  const [error, setError] = useState<string | null>(null);
  const key = useMemo(() => JSON.stringify(lines.map(l => [Number(l.quantity) || 0, Number(l.unit_price) || 0, !!l.taxable])), [lines]);

  useEffect(() => {
    if (!companyId) { setQuote(null); return; }
    let cancelled = false;
    const t = setTimeout(async () => {
      const { data, error: err } = await supabase.rpc('acct_tax_quote', {
        p_company_id: companyId,
        p_site_id: siteId || null,
        p_date: date || null,
        p_lines: (JSON.parse(key) as [number, number, boolean][]).map(([quantity, unit_price, taxable]) => ({ quantity, unit_price, taxable })),
      });
      if (cancelled) return;
      if (err || !data) { setError(err?.message ?? 'Could not figure sales tax'); return; }
      setError(null);
      setQuote(data as TaxQuote);
    }, 250);
    return () => { cancelled = true; clearTimeout(t); };
  }, [companyId, siteId, date, key]);

  return { quote, error };
}
