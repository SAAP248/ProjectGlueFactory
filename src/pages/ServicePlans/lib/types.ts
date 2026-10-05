import type {
  AgreementStatus, Cadence, CancellationPolicy, LedgerEntryType, RolloverPolicy,
} from './domain';

export interface SpSettings {
  id: number;
  demo_mode: boolean;
  demo_date: string;
  grace_days: number;
  renewal_notice_days: number;
  invoice_due_days: number;
  default_cadence: Cadence;
}

export interface SpPriceOption {
  id: string;
  plan_version_id: string;
  cadence: Cadence;
  amount_cents: number;
  is_default: boolean;
}

export type BenefitType = 'visit' | 'remote' | 'perk';

export interface SpBenefit {
  id: string;
  plan_version_id: string;
  name: string;
  description: string;
  benefit_type: BenefitType;
  quantity_per_term: number;
  duration_minutes: number;
  overage_price_cents: number;
  sort_order: number;
}

export interface SpPlanVersion {
  id: string;
  plan_id: string;
  version_number: number;
  term_months: number;
  auto_renew: boolean;
  renewal_notice_days: number;
  labor_discount_bps: number;
  parts_discount_bps: number;
  priority_service: boolean;
  waive_trip_fee: boolean;
  rollover_policy: RolloverPolicy;
  rollover_cap: number;
  cancellation_policy: CancellationPolicy;
  terms_text: string;
  change_note: string;
  published_at: string;
  sp_price_options: SpPriceOption[];
  sp_benefits: SpBenefit[];
}

export interface SpPlan {
  id: string;
  code: string;
  name: string;
  category: string;
  description: string;
  color: string;
  status: 'active' | 'archived';
  current_version_id: string | null;
  versions: SpPlanVersion[];
  current: SpPlanVersion | null;
}

export interface SpAddon {
  id: string;
  name: string;
  description: string;
  category: string;
  annual_amount_cents: number;
  is_active: boolean;
}

export interface SpAgreement {
  id: string;
  agreement_number: string;
  company_id: string;
  primary_site_id: string | null;
  plan_id: string;
  plan_version_id: string;
  cadence: Cadence;
  status: AgreementStatus;
  start_date: string;
  end_date: string;
  anchor_day: number;
  period_amount_cents: number;
  auto_renew: boolean;
  payment_method: 'card_on_file' | 'card_declined' | 'invoice';
  grace_until: string | null;
  paused_at: string | null;
  resume_on: string | null;
  canceled_at: string | null;
  cancel_reason: string | null;
  signed_by_name: string | null;
  signed_at: string | null;
  renewed_from_id: string | null;
  notes: string;
  created_at: string;
  companies: { name: string } | null;
  sites: { name: string; address: string; city: string } | null;
  sp_plans: { name: string; color: string; category: string } | null;
  sp_plan_versions: Omit<SpPlanVersion, 'sp_price_options' | 'sp_benefits'> | null;
}

export interface SpAgreementSite {
  id: string;
  site_id: string;
  system_id: string | null;
  sites: { name: string; address: string; city: string } | null;
  customer_systems: { name: string } | null;
}

export interface SpAgreementAddon {
  id: string;
  addon_id: string | null;
  name: string;
  annual_amount_cents: number;
  quantity: number;
}

export interface SpLedgerEntry {
  id: string;
  agreement_id: string;
  benefit_id: string;
  entry_type: LedgerEntryType;
  quantity: number;
  period_start: string;
  period_end: string;
  work_order_id: string | null;
  occurrence_key: string;
  note: string;
  created_at: string;
  work_orders?: { wo_number: string; status: string; scheduled_date: string | null } | null;
}

export type OccurrenceStatus = 'scheduled' | 'processing' | 'paid' | 'failed' | 'skipped' | 'void';

export interface SpBillingOccurrence {
  id: string;
  agreement_id: string;
  occurrence_key: string;
  sequence: number;
  period_start: string;
  period_end: string;
  bill_date: string;
  amount_cents: number;
  status: OccurrenceStatus;
  attempts: number;
  last_attempt_on: string | null;
  failure_reason: string | null;
  invoice_id: string | null;
  invoices?: { invoice_number: string; status: string; balance_due: number } | null;
}

export interface SpEvent {
  id: string;
  agreement_id: string;
  event_type: string;
  description: string;
  event_date: string;
  created_at: string;
}

export interface SpMonitoringAccount {
  id: string;
  company_id: string;
  site_id: string | null;
  provider: string;
  monthly_cents: number;
  status: string;
}

export interface AgreementDetail {
  agreement: SpAgreement;
  sites: SpAgreementSite[];
  addons: SpAgreementAddon[];
  benefits: SpBenefit[];
  ledger: SpLedgerEntry[];
  occurrences: SpBillingOccurrence[];
  events: SpEvent[];
  monitoring: SpMonitoringAccount[];
}
