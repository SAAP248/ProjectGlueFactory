export interface WizardPhone {
  id: string;
  label: string;
  phone_number: string;
  is_primary: boolean;
}

export interface WizardEmail {
  id: string;
  label: string;
  email_address: string;
  is_primary: boolean;
}

export interface WizardSystem {
  id: string;
  system_type_id: string;
  system_type_name: string;
  system_type_icon: string;
  system_type_color: string;
  name: string;
  package_id: string | null;
  package_name: string | null;
  sort_order: number;
}

export interface WizardLineItem {
  id: string;
  product_id: string | null;
  system_group_id: string | null;
  description: string;
  quantity: number;
  unit_cost: number;
  unit_price: number;
  sort_order: number;
}

export interface WizardState {
  customerMode: 'existing' | 'new';
  existingCompanyId: string;
  existingCompanyName: string;

  convertedFromLeadId?: string;

  newCompanyName: string;
  newCustomerType: 'residential' | 'commercial';
  newAccountNumber: string;
  newStatus: string;
  newPhones: WizardPhone[];
  newEmails: WizardEmail[];

  billingAddress: string;
  billingCity: string;
  billingState: string;
  billingZip: string;

  siteMode: 'existing' | 'new';
  existingSiteId: string;
  existingSiteName: string;
  siteMatchesBilling: boolean;
  siteName: string;
  siteAddress: string;
  siteCity: string;
  siteState: string;
  siteZip: string;
  siteType: string;
  siteAccessInstructions: string;
  siteAlarmCode: string;

  systems: WizardSystem[];

  lineItems: WizardLineItem[];
  marginThreshold: number;

  scopeOfWork: string;
  internalNotes: string;
  termsAndConditions: string;
  expirationDate: string;

  depositRequested: boolean;
  depositAmount: string;
  depositMethod: string;

  dealTitle: string;
  probability: number;
  expectedCloseDate: string;
  forecastCategory: string;
  assignedEmployeeId: string;
}

export interface SystemType {
  id: string;
  name: string;
  icon_name: string;
  color: string;
  is_active: boolean;
  sort_order: number;
}

export interface ProductCatalogItem {
  id: string;
  sku: string;
  name: string;
  description: string | null;
  category: string;
  manufacturer: string;
  cost: number;
  price: number;
  image_url: string | null;
  is_active: boolean;
}

export interface PackageCatalogItem {
  id: string;
  name: string;
  cost: number;
  price: number;
}

export const DEFAULT_TERMS = `1. Payment Terms: 50% deposit required upon contract signing. Remaining balance due upon completion.
2. Warranty: All installed equipment is covered by manufacturer warranty. Labor warranty is 1 year from installation date.
3. Monitoring: Monthly monitoring fees begin upon system activation.
4. Cancellation: Customer may cancel within 3 business days of signing without penalty.
5. Permits: Customer is responsible for any required permits unless otherwise noted.
6. Changes: Any changes to the scope of work after signing may result in additional charges.`;

export function generateProposalToken(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  const date = new Date().toISOString().slice(0, 10);
  const rand = Array.from({ length: 6 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
  return `${date}-${rand}`;
}

export function generateAccountNumber(): string {
  return `WH-${Date.now().toString().slice(-6)}`;
}
