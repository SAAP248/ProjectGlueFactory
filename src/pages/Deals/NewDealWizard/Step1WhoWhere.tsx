import { useState, useEffect, useRef } from 'react';
import { Search, Plus, X, Phone, Mail, MapPin, Building2, Home, AlertTriangle, ChevronDown, Sparkles } from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import type { WizardState, WizardPhone, WizardEmail } from './types';
import { generateAccountNumber } from './types';

interface CompanyResult {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  billing_address: string | null;
  billing_city: string | null;
  billing_state: string | null;
  billing_zip: string | null;
  customer_type: string;
}

interface SiteResult {
  id: string;
  name: string;
  address: string;
  city: string;
  state: string;
  zip: string;
}

interface Props {
  state: WizardState;
  onChange: (updates: Partial<WizardState>) => void;
  warnings: string[];
  leadPrefill?: {
    contactName?: string;
    contactPhone?: string;
    contactEmail?: string;
    address?: string;
    city?: string;
    state?: string;
    zip?: string;
  };
}

function formatPhone(raw: string): string {
  const digits = raw.replace(/\D/g, '').slice(0, 10);
  if (digits.length <= 3) return digits;
  if (digits.length <= 6) return `${digits.slice(0, 3)}-${digits.slice(3)}`;
  return `${digits.slice(0, 3)}-${digits.slice(3, 6)}-${digits.slice(6)}`;
}

export default function Step1WhoWhere({ state, onChange, warnings, leadPrefill }: Props) {
  const isFromLead = !!state.convertedFromLeadId;
  const [companySearch, setCompanySearch] = useState('');
  const [companyResults, setCompanyResults] = useState<CompanyResult[]>([]);
  const [showCompanyDropdown, setShowCompanyDropdown] = useState(false);
  const [loadingCompanies, setLoadingCompanies] = useState(false);
  const [existingSites, setExistingSites] = useState<SiteResult[]>([]);
  const searchRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (companySearch.length < 2) {
      setCompanyResults([]);
      return;
    }
    const timer = setTimeout(async () => {
      setLoadingCompanies(true);
      const { data } = await supabase
        .from('companies')
        .select('id,name,phone,email,billing_address,billing_city,billing_state,billing_zip,customer_type')
        .ilike('name', `%${companySearch}%`)
        .limit(8);
      setCompanyResults(data ?? []);
      setLoadingCompanies(false);
      setShowCompanyDropdown(true);
    }, 250);
    return () => clearTimeout(timer);
  }, [companySearch]);

  useEffect(() => {
    if (!state.existingCompanyId) return;
    supabase
      .from('sites')
      .select('id,name,address,city,state,zip')
      .eq('company_id', state.existingCompanyId)
      .then(({ data }) => setExistingSites(data ?? []));
  }, [state.existingCompanyId]);

  function selectCompany(c: CompanyResult) {
    onChange({
      existingCompanyId: c.id,
      existingCompanyName: c.name,
      billingAddress: c.billing_address ?? '',
      billingCity: c.billing_city ?? '',
      billingState: c.billing_state ?? '',
      billingZip: c.billing_zip ?? '',
      siteMode: 'existing',
      existingSiteId: '',
      existingSiteName: '',
    });
    setCompanySearch(c.name);
    setShowCompanyDropdown(false);
  }

  function selectSite(s: SiteResult) {
    onChange({ existingSiteId: s.id, existingSiteName: s.name });
  }

  function addPhone() {
    const phone: WizardPhone = {
      id: crypto.randomUUID(),
      label: state.newPhones.length === 0 ? 'Main' : 'Mobile',
      phone_number: '',
      is_primary: state.newPhones.length === 0,
    };
    onChange({ newPhones: [...state.newPhones, phone] });
  }

  function updatePhone(id: string, updates: Partial<WizardPhone>) {
    if ('phone_number' in updates && typeof updates.phone_number === 'string') {
      updates = { ...updates, phone_number: formatPhone(updates.phone_number) };
    }
    onChange({ newPhones: state.newPhones.map(p => p.id === id ? { ...p, ...updates } : p) });
  }

  function removePhone(id: string) {
    const remaining = state.newPhones.filter(p => p.id !== id);
    onChange({ newPhones: remaining });
  }

  function addEmail() {
    const email: WizardEmail = {
      id: crypto.randomUUID(),
      label: state.newEmails.length === 0 ? 'Primary' : 'Billing',
      email_address: '',
      is_primary: state.newEmails.length === 0,
    };
    onChange({ newEmails: [...state.newEmails, email] });
  }

  function updateEmail(id: string, updates: Partial<WizardEmail>) {
    onChange({ newEmails: state.newEmails.map(e => e.id === id ? { ...e, ...updates } : e) });
  }

  function removeEmail(id: string) {
    const remaining = state.newEmails.filter(e => e.id !== id);
    onChange({ newEmails: remaining });
  }

  function handleSiteMatchesBilling(checked: boolean) {
    if (checked) {
      onChange({
        siteMatchesBilling: true,
        siteAddress: state.billingAddress,
        siteCity: state.billingCity,
        siteState: state.billingState,
        siteZip: state.billingZip,
      });
    } else {
      onChange({ siteMatchesBilling: false });
    }
  }

  const isExisting = state.customerMode === 'existing';
  const isNewSite = state.siteMode === 'new';

  return (
    <div className="max-w-3xl mx-auto space-y-8">
      {isFromLead && (
        <div className="flex items-start gap-3 bg-blue-50 border border-blue-200 rounded-xl p-4">
          <Sparkles className="h-5 w-5 text-blue-500 mt-0.5 shrink-0" />
          <div className="flex-1">
            <p className="text-sm font-semibold text-blue-900">Pre-filled from your lead</p>
            <p className="text-xs text-blue-700 mt-0.5">The fields below have been filled in from the lead record. Review each section and make any corrections before continuing.</p>
            {(leadPrefill?.contactName || leadPrefill?.contactPhone || leadPrefill?.contactEmail || leadPrefill?.address) && (
              <div className="mt-2 flex flex-wrap gap-2">
                {leadPrefill?.contactName && (
                  <span className="inline-flex items-center gap-1 text-xs bg-blue-100 text-blue-800 border border-blue-200 px-2 py-0.5 rounded-full font-medium">
                    <Building2 className="h-3 w-3" /> {leadPrefill.contactName}
                  </span>
                )}
                {leadPrefill?.contactPhone && (
                  <span className="inline-flex items-center gap-1 text-xs bg-blue-100 text-blue-800 border border-blue-200 px-2 py-0.5 rounded-full font-medium">
                    <Phone className="h-3 w-3" /> {leadPrefill.contactPhone}
                  </span>
                )}
                {leadPrefill?.contactEmail && (
                  <span className="inline-flex items-center gap-1 text-xs bg-blue-100 text-blue-800 border border-blue-200 px-2 py-0.5 rounded-full font-medium">
                    <Mail className="h-3 w-3" /> {leadPrefill.contactEmail}
                  </span>
                )}
                {leadPrefill?.address && (
                  <span className="inline-flex items-center gap-1 text-xs bg-blue-100 text-blue-800 border border-blue-200 px-2 py-0.5 rounded-full font-medium">
                    <MapPin className="h-3 w-3" /> {leadPrefill.address}{leadPrefill.city ? `, ${leadPrefill.city}` : ''}{leadPrefill.state ? ` ${leadPrefill.state}` : ''}
                  </span>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {warnings.length > 0 && (
        <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-xl p-4">
          <AlertTriangle className="h-5 w-5 text-amber-500 mt-0.5 shrink-0" />
          <div>
            <p className="text-sm font-semibold text-amber-800">Missing contact info</p>
            <ul className="mt-1 space-y-0.5">
              {warnings.map((w, i) => <li key={i} className="text-sm text-amber-700">{w}</li>)}
            </ul>
            <p className="text-xs text-amber-600 mt-1">Email and SMS sending require at least one phone and one email.</p>
          </div>
        </div>
      )}

      <div>
        <h2 className="text-xl font-bold text-gray-900 mb-1">Who is this proposal for?</h2>
        <p className="text-sm text-gray-500">Select an existing customer or create a new one.</p>

        <div className="flex gap-3 mt-4">
          {(['existing', 'new'] as const).map(mode => (
            <button
              key={mode}
              onClick={() => onChange({ customerMode: mode })}
              className={`flex-1 py-3 rounded-xl text-sm font-semibold border-2 transition-all ${
                state.customerMode === mode
                  ? 'border-blue-600 bg-blue-50 text-blue-700'
                  : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300'
              }`}
            >
              {mode === 'existing' ? 'Existing Customer' : 'New Customer'}
            </button>
          ))}
        </div>
      </div>

      {isExisting ? (
        <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
          <div className="relative" ref={dropdownRef}>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Search Customers</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                ref={searchRef}
                type="text"
                placeholder="Type customer name…"
                value={companySearch}
                onChange={e => setCompanySearch(e.target.value)}
                onFocus={() => companyResults.length > 0 && setShowCompanyDropdown(true)}
                className="w-full pl-9 pr-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            {showCompanyDropdown && (
              <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-white rounded-xl border border-gray-200 shadow-xl overflow-hidden">
                {loadingCompanies ? (
                  <div className="p-3 text-sm text-gray-500 text-center">Searching…</div>
                ) : companyResults.length === 0 ? (
                  <div className="p-3 text-sm text-gray-500 text-center">No results</div>
                ) : (
                  companyResults.map(c => (
                    <button
                      key={c.id}
                      onClick={() => selectCompany(c)}
                      className="w-full flex items-center gap-3 px-4 py-3 hover:bg-blue-50 text-left transition-colors border-b border-gray-50 last:border-0"
                    >
                      <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center shrink-0">
                        <Building2 className="h-4 w-4 text-blue-600" />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-gray-900">{c.name}</p>
                        <p className="text-xs text-gray-500">{c.customer_type} · {c.billing_city ?? '—'}, {c.billing_state ?? '—'}</p>
                      </div>
                    </button>
                  ))
                )}
              </div>
            )}
          </div>

          {state.existingCompanyId && (
            <div className="mt-4 bg-blue-50 rounded-lg p-4 border border-blue-100">
              <div className="flex items-center gap-2 mb-2">
                <Building2 className="h-5 w-5 text-blue-600" />
                <p className="font-semibold text-blue-900">{state.existingCompanyName}</p>
              </div>
              <div className="text-sm text-blue-700 space-y-0.5">
                {state.billingAddress && <p><MapPin className="inline h-3.5 w-3.5 mr-1" />{state.billingAddress}, {state.billingCity}, {state.billingState} {state.billingZip}</p>}
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-5">
          <div>
            <p className="text-sm font-semibold text-gray-700 mb-3">Customer Type</p>
            <div className="flex gap-3">
              {(['residential', 'commercial'] as const).map(t => (
                <button
                  key={t}
                  onClick={() => onChange({ newCustomerType: t, siteType: t })}
                  className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium border-2 transition-all ${
                    state.newCustomerType === t
                      ? 'border-blue-600 bg-blue-50 text-blue-700'
                      : 'border-gray-200 text-gray-600 hover:border-gray-300'
                  }`}
                >
                  {t === 'residential' ? <Home className="h-4 w-4" /> : <Building2 className="h-4 w-4" />}
                  {t.charAt(0).toUpperCase() + t.slice(1)}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  {state.newCustomerType === 'residential' ? 'Customer Name' : 'Company Name'} *
                </label>
                {isFromLead && leadPrefill?.contactName && (
                  <span className="text-xs text-blue-600 font-medium flex items-center gap-1"><Sparkles className="h-3 w-3" /> From Lead</span>
                )}
              </div>
              <input
                type="text"
                placeholder={state.newCustomerType === 'residential' ? 'John & Jane Smith' : 'Acme Corporation'}
                value={state.newCompanyName}
                onChange={e => onChange({ newCompanyName: e.target.value })}
                className={`w-full border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${isFromLead && leadPrefill?.contactName ? 'border-blue-300 bg-blue-50/40' : 'border-gray-300'}`}
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Account Number</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="WH-000000"
                  value={state.newAccountNumber}
                  onChange={e => onChange({ newAccountNumber: e.target.value })}
                  className="flex-1 border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <button
                  type="button"
                  onClick={() => onChange({ newAccountNumber: generateAccountNumber() })}
                  className="px-3 py-2 text-xs font-medium text-blue-600 border border-blue-300 rounded-lg hover:bg-blue-50 transition-colors whitespace-nowrap"
                >
                  Auto
                </button>
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Status</label>
              <select
                value={state.newStatus}
                onChange={e => onChange({ newStatus: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
              >
                <option value="active">Active</option>
                <option value="prospect">Prospect</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider flex items-center gap-1.5">
                <Phone className="h-3.5 w-3.5" /> Phone Numbers
              </label>
              <button onClick={addPhone} className="flex items-center gap-1 text-xs font-medium text-blue-600 hover:text-blue-700">
                <Plus className="h-3.5 w-3.5" /> Add Phone
              </button>
            </div>
            {state.newPhones.length === 0 && (
              <p className="text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                No phone numbers added. SMS sending will be unavailable.
              </p>
            )}
            <div className="space-y-2">
              {state.newPhones.map(ph => (
                <div key={ph.id} className="flex gap-2 items-center">
                  <input
                    type="text"
                    placeholder="Label (Main, Mobile…)"
                    value={ph.label}
                    onChange={e => updatePhone(ph.id, { label: e.target.value })}
                    className="w-28 border border-gray-300 rounded-lg px-2.5 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <input
                    type="tel"
                    placeholder="(555) 000-0000"
                    value={ph.phone_number}
                    onChange={e => updatePhone(ph.id, { phone_number: e.target.value })}
                    className="flex-1 border border-gray-300 rounded-lg px-2.5 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <button onClick={() => removePhone(ph.id)} className="p-1.5 text-gray-400 hover:text-red-500 transition-colors">
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider flex items-center gap-1.5">
                <Mail className="h-3.5 w-3.5" /> Email Addresses
              </label>
              <button onClick={addEmail} className="flex items-center gap-1 text-xs font-medium text-blue-600 hover:text-blue-700">
                <Plus className="h-3.5 w-3.5" /> Add Email
              </button>
            </div>
            {state.newEmails.length === 0 && (
              <p className="text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                No email addresses added. Email sending will be unavailable.
              </p>
            )}
            <div className="space-y-2">
              {state.newEmails.map(em => (
                <div key={em.id} className="flex gap-2 items-center">
                  <input
                    type="text"
                    placeholder="Label (Primary, Billing…)"
                    value={em.label}
                    onChange={e => updateEmail(em.id, { label: e.target.value })}
                    className="w-28 border border-gray-300 rounded-lg px-2.5 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <input
                    type="email"
                    placeholder="name@email.com"
                    value={em.email_address}
                    onChange={e => updateEmail(em.id, { email_address: e.target.value })}
                    className="flex-1 border border-gray-300 rounded-lg px-2.5 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <button onClick={() => removeEmail(em.id)} className="p-1.5 text-gray-400 hover:text-red-500 transition-colors">
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider">Billing Address</label>
              {isFromLead && leadPrefill?.address && (
                <span className="text-xs text-blue-600 font-medium flex items-center gap-1"><Sparkles className="h-3 w-3" /> From Lead</span>
              )}
            </div>
            <div className="grid grid-cols-6 gap-3">
              <input
                type="text" placeholder="Street address"
                value={state.billingAddress}
                onChange={e => onChange({ billingAddress: e.target.value })}
                className="col-span-6 border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <input
                type="text" placeholder="City"
                value={state.billingCity}
                onChange={e => onChange({ billingCity: e.target.value })}
                className="col-span-3 border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <input
                type="text" placeholder="State"
                value={state.billingState}
                onChange={e => onChange({ billingState: e.target.value })}
                className="col-span-1 border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <input
                type="text" placeholder="ZIP"
                value={state.billingZip}
                onChange={e => onChange({ billingZip: e.target.value })}
                className="col-span-2 border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
        </div>
      )}

      <div>
        <h2 className="text-xl font-bold text-gray-900 mb-1">Installation Site</h2>
        <p className="text-sm text-gray-500">Where will the work be performed?</p>

        {isExisting && existingSites.length > 0 && (
          <div className="flex gap-3 mt-4">
            {(['existing', 'new'] as const).map(mode => (
              <button
                key={mode}
                onClick={() => onChange({ siteMode: mode })}
                className={`flex-1 py-3 rounded-xl text-sm font-semibold border-2 transition-all ${
                  state.siteMode === mode
                    ? 'border-blue-600 bg-blue-50 text-blue-700'
                    : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300'
                }`}
              >
                {mode === 'existing' ? 'Use Existing Site' : 'Add New Site'}
              </button>
            ))}
          </div>
        )}

        {isExisting && state.siteMode === 'existing' && existingSites.length > 0 ? (
          <div className="mt-4 bg-white rounded-xl border border-gray-200 p-6">
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Select Site</label>
            <div className="relative">
              <select
                value={state.existingSiteId}
                onChange={e => {
                  const site = existingSites.find(s => s.id === e.target.value);
                  if (site) selectSite(site);
                }}
                className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white appearance-none pr-8"
              >
                <option value="">Choose a site…</option>
                {existingSites.map(s => (
                  <option key={s.id} value={s.id}>{s.name} — {s.address}, {s.city}</option>
                ))}
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
            </div>
          </div>
        ) : (
          <div className="mt-4 bg-white rounded-xl border border-gray-200 p-6 space-y-4">
            {!isExisting && (
              <label className="flex items-center gap-2.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={state.siteMatchesBilling}
                  onChange={e => handleSiteMatchesBilling(e.target.checked)}
                  className="w-4 h-4 rounded accent-blue-600"
                />
                <span className="text-sm font-medium text-gray-700">Installation location is the same as billing address</span>
              </label>
            )}

            <div className="grid grid-cols-6 gap-3">
              <div className="col-span-6">
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Site Name</label>
                <input
                  type="text" placeholder="Main Building, Warehouse A…"
                  value={state.siteName}
                  onChange={e => onChange({ siteName: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="col-span-6">
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Street Address</label>
                <input
                  type="text" placeholder="Street address"
                  value={state.siteAddress}
                  disabled={state.siteMatchesBilling}
                  onChange={e => onChange({ siteAddress: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-50 disabled:text-gray-500"
                />
              </div>
              <input
                type="text" placeholder="City"
                value={state.siteCity}
                disabled={state.siteMatchesBilling}
                onChange={e => onChange({ siteCity: e.target.value })}
                className="col-span-3 border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-50"
              />
              <input
                type="text" placeholder="State"
                value={state.siteState}
                disabled={state.siteMatchesBilling}
                onChange={e => onChange({ siteState: e.target.value })}
                className="col-span-1 border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-50"
              />
              <input
                type="text" placeholder="ZIP"
                value={state.siteZip}
                disabled={state.siteMatchesBilling}
                onChange={e => onChange({ siteZip: e.target.value })}
                className="col-span-2 border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-50"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Site Type</label>
                <select
                  value={state.siteType}
                  onChange={e => onChange({ siteType: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                >
                  <option value="commercial">Commercial</option>
                  <option value="residential">Residential</option>
                  <option value="industrial">Industrial</option>
                  <option value="retail">Retail</option>
                  <option value="government">Government</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Alarm Code</label>
                <input
                  type="text" placeholder="0000"
                  value={state.siteAlarmCode}
                  onChange={e => onChange({ siteAlarmCode: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Access Instructions</label>
              <textarea
                rows={2}
                placeholder="Gate code, key location, parking instructions…"
                value={state.siteAccessInstructions}
                onChange={e => onChange({ siteAccessInstructions: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
