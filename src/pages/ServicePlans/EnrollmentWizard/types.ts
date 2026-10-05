import type { Cadence } from '../lib/domain';
import type { SpAddon, SpAgreement, SpMonitoringAccount, SpPlan } from '../lib/types';

export interface WizardCompany {
  id: string;
  name: string;
}

export interface WizardSite {
  id: string;
  name: string;
  address: string;
  city: string;
  systems: { id: string; name: string }[];
}

export interface WizardState {
  company: WizardCompany | null;
  coverage: Record<string, string[]>;
  planId: string;
  cadence: Cadence;
  addons: Record<string, number>;
  startDate: string;
  paymentMethod: SpAgreement['payment_method'];
  autoRenew: boolean;
  notes: string;
  signerName: string;
}

export interface WizardLookups {
  plans: SpPlan[];
  addons: SpAddon[];
  sites: WizardSite[];
  monitoring: SpMonitoringAccount[];
  coveredSites: Map<string, string>;
}

export function priceFor(plan: SpPlan | undefined, cadence: Cadence): number | null {
  return plan?.current?.sp_price_options.find(p => p.cadence === cadence)?.amount_cents ?? null;
}

export function priceMap(plan: SpPlan | undefined): Partial<Record<Cadence, number>> {
  const out: Partial<Record<Cadence, number>> = {};
  for (const p of plan?.current?.sp_price_options ?? []) out[p.cadence] = p.amount_cents;
  return out;
}
