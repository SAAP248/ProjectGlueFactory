export type AccountType = 'asset' | 'liability' | 'equity' | 'income' | 'cogs' | 'expense';

export interface Account {
  id: string;
  code: string;
  name: string;
  type: AccountType;
  subtype: string | null;
  description: string | null;
  is_active: boolean;
  is_system: boolean;
  institution: string | null;
  last4: string | null;
  is_1099: boolean;
}

export interface Entry {
  id: string;
  entry_number: number;
  entry_date: string;
  memo: string;
  source_type: string;
  source_id: string | null;
  source_key: string | null;
  source_ref: string | null;
  company_id: string | null;
  vendor_id: string | null;
  posted_from_locked: boolean;
  original_date: string | null;
  is_demo: boolean;
  created_by: string | null;
  created_at: string;
}

export interface EntryLine {
  id: string;
  entry_id: string;
  account_id: string;
  debit: number;
  credit: number;
  description: string | null;
  company_id: string | null;
  vendor_id: string | null;
  sort_order: number;
}

export interface Vendor {
  id: string;
  name: string;
  vendor_type: string | null;
  distributor_id: string | null;
  contact_name: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  zip: string | null;
  payment_terms: string | null;
  default_account_id: string | null;
  tax_id: string | null;
  entity_type: string | null;
  is_1099: boolean;
  is_active: boolean;
  is_demo: boolean;
  notes: string | null;
}

export interface Bill {
  id: string;
  vendor_id: string;
  kind: 'bill' | 'credit';
  bill_number: string | null;
  bill_date: string;
  due_date: string;
  memo: string;
  total: number;
  amount_paid: number;
  status: 'open' | 'partial' | 'paid' | 'void';
  purchase_order_id: string | null;
  is_demo: boolean;
}

export interface BillLine {
  id: string;
  bill_id: string;
  account_id: string;
  description: string;
  amount: number;
  company_id: string | null;
  sort_order: number;
}

export interface BillPayment {
  id: string;
  bill_id: string;
  vendor_id: string;
  pay_date: string;
  amount: number;
  method: 'check' | 'ach' | 'card' | 'credit';
  check_number: string | null;
  bank_account_id: string | null;
  credit_bill_id: string | null;
}

export interface BankTxn {
  id: string;
  account_id: string;
  txn_date: string;
  description: string;
  amount: number;
  status: 'pending' | 'matched' | 'added' | 'excluded';
  matched_entry_id: string | null;
  hint_entry_ids: string[] | null;
}

export interface BankRule {
  id: string;
  match_text: string;
  account_id: string;
  vendor_id: string | null;
  is_active: boolean;
}

export interface Period {
  period_start: string;
  status: 'open' | 'locked';
  checklist: Record<string, boolean>;
  locked_at: string | null;
  locked_by: string | null;
  notes: string;
}

export interface PeriodEvent {
  id: string;
  period_start: string;
  action: string;
  reason: string;
  actor: string;
  created_at: string;
}

export interface Reconciliation {
  id: string;
  account_id: string;
  statement_date: string;
  beginning_balance: number;
  statement_balance: number;
  status: 'in_progress' | 'completed';
  completed_at: string | null;
}

export interface TaxFiling {
  period_start: string;
  gross_sales: number;
  exempt_sales: number;
  taxable_sales: number;
  state_tax: number;
  county_tax: number;
  city_tax: number;
  total_tax: number;
  collection_allowance: number;
  amount_paid: number;
  filed_date: string;
  confirmation: string | null;
  entry_id: string | null;
}

export interface AccountTotal {
  account_id: string;
  debit: number;
  credit: number;
}

export interface MonthlyTotal extends AccountTotal {
  month: string;
}

export interface Budget {
  id: string;
  fiscal_year: number;
  account_id: string;
  month: number;
  amount: number;
}

export interface Nav {
  onOpenInvoice: (id: string) => void;
  onViewCustomer: (id: string) => void;
}
