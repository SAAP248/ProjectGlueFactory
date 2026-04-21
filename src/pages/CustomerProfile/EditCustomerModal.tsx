import { useState, useEffect, useMemo } from 'react';
import { X, Plus, Trash2, Loader2, Search, Building2, Home, Network, CheckCircle2, CircleDashed, XCircle, MinusCircle } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import type { Company, PhoneEntry, EmailEntry } from './types';
import { QB_SYNC_LABELS, QB_SYNC_STYLES, formatLastSynced, type QbSyncStatus } from '../../lib/quickbooks';

interface ParentOption {
  id: string;
  name: string;
  account_number: string | null;
  customer_type: string;
}

interface Props {
  company: Company;
  onClose: () => void;
  onSaved: () => void;
}

const PHONE_LABELS = ['Main', 'Mobile', 'Fax', 'Office', 'Other'];
const EMAIL_LABELS = ['Primary', 'Billing', 'Support', 'Other'];
const PAYMENT_TERMS = ['Net 30', 'Net 15', 'Net 60', 'Due on Receipt', 'Net 90'];
const CUSTOMER_TYPES = ['commercial', 'residential'];
const STATUSES = ['active', 'inactive', 'prospect', 'suspended'];

export default function EditCustomerModal({ company, onClose, onSaved }: Props) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const [name, setName] = useState(company.name || '');
  const [status, setStatus] = useState(company.status || 'active');
  const [customerType, setCustomerType] = useState(company.customer_type || 'commercial');
  const [isVip, setIsVip] = useState(company.is_vip || false);
  const [website, setWebsite] = useState(company.website || '');

  const [accountNumber, setAccountNumber] = useState(company.account_number || '');
  const [quickbooksId, setQuickbooksId] = useState(company.quickbooks_id || '');
  const [qbSyncStatus, setQbSyncStatus] = useState<QbSyncStatus>(
    (company.qb_sync_status as QbSyncStatus) || 'not_synced'
  );

  const [phones, setPhones] = useState<PhoneEntry[]>(
    company.phones?.length ? company.phones : [{ label: 'Main', number: company.phone || '' }]
  );
  const [companyEmails, setCompanyEmails] = useState<EmailEntry[]>(
    company.company_emails?.length ? company.company_emails : [{ label: 'Primary', address: company.email || '' }]
  );

  const [billingAddress, setBillingAddress] = useState(company.billing_address || '');
  const [billingAddress2, setBillingAddress2] = useState(company.billing_address_2 || '');
  const [billingCity, setBillingCity] = useState(company.billing_city || '');
  const [billingState, setBillingState] = useState(company.billing_state || '');
  const [billingZip, setBillingZip] = useState(company.billing_zip || '');
  const [billingCountry, setBillingCountry] = useState(company.billing_country || 'USA');

  const [paymentTerms, setPaymentTerms] = useState(company.payment_terms || 'Net 30');
  const [notes, setNotes] = useState(company.notes || '');
  const [tagInput, setTagInput] = useState('');
  const [tags, setTags] = useState<string[]>(company.tags || []);

  const [parentId, setParentId] = useState<string | null>(company.parent_company_id || null);
  const [billWithParent, setBillWithParent] = useState(company.bill_with_parent ?? true);
  const [parentOptions, setParentOptions] = useState<ParentOption[]>([]);
  const [parentQuery, setParentQuery] = useState('');
  const [hasChildren, setHasChildren] = useState(false);

  useEffect(() => {
    (async () => {
      const [parentsRes, childrenRes] = await Promise.all([
        supabase
          .from('companies')
          .select('id, name, account_number, customer_type')
          .is('parent_company_id', null)
          .neq('id', company.id)
          .order('name'),
        supabase
          .from('companies')
          .select('id', { count: 'exact', head: true })
          .eq('parent_company_id', company.id),
      ]);
      if (parentsRes.data) setParentOptions(parentsRes.data);
      setHasChildren((childrenRes.count || 0) > 0);
    })();
  }, [company.id]);

  const selectedParent = useMemo(
    () => parentOptions.find(p => p.id === parentId) || null,
    [parentOptions, parentId]
  );

  const filteredParents = useMemo(() => {
    const q = parentQuery.trim().toLowerCase();
    if (!q) return parentOptions.slice(0, 8);
    return parentOptions
      .filter(p => p.name.toLowerCase().includes(q) || p.account_number?.toLowerCase().includes(q))
      .slice(0, 8);
  }, [parentOptions, parentQuery]);

  function addPhone() {
    setPhones(p => [...p, { label: 'Main', number: '' }]);
  }

  function removePhone(i: number) {
    setPhones(p => p.filter((_, idx) => idx !== i));
  }

  function updatePhone(i: number, field: keyof PhoneEntry, value: string) {
    setPhones(p => p.map((entry, idx) => idx === i ? { ...entry, [field]: value } : entry));
  }

  function addEmail() {
    setCompanyEmails(e => [...e, { label: 'Primary', address: '' }]);
  }

  function removeEmail(i: number) {
    setCompanyEmails(e => e.filter((_, idx) => idx !== i));
  }

  function updateEmail(i: number, field: keyof EmailEntry, value: string) {
    setCompanyEmails(e => e.map((entry, idx) => idx === i ? { ...entry, [field]: value } : entry));
  }

  function addTag() {
    const trimmed = tagInput.trim();
    if (trimmed && !tags.includes(trimmed)) {
      setTags(t => [...t, trimmed]);
    }
    setTagInput('');
  }

  function removeTag(tag: string) {
    setTags(t => t.filter(x => x !== tag));
  }

  async function handleSave() {
    if (!name.trim()) {
      setError('Company name is required.');
      return;
    }
    setSaving(true);
    setError('');

    const filteredPhones = phones.filter(p => p.number.trim());
    const filteredEmails = companyEmails.filter(e => e.address.trim());

    const { error: saveErr } = await supabase.from('companies').update({
      name: name.trim(),
      status,
      customer_type: customerType,
      is_vip: isVip,
      website: website.trim(),
      account_number: accountNumber.trim(),
      quickbooks_id: quickbooksId.trim(),
      qb_sync_status: quickbooksId.trim() ? qbSyncStatus : 'not_synced',
      qb_last_synced_at:
        quickbooksId.trim() && qbSyncStatus === 'synced'
          ? (company.qb_last_synced_at || new Date().toISOString())
          : company.qb_last_synced_at,
      phone: filteredPhones[0]?.number || '',
      email: filteredEmails[0]?.address || '',
      phones: filteredPhones,
      company_emails: filteredEmails,
      billing_address: billingAddress.trim(),
      billing_address_2: billingAddress2.trim(),
      billing_city: billingCity.trim(),
      billing_state: billingState.trim(),
      billing_zip: billingZip.trim(),
      billing_country: billingCountry.trim(),
      payment_terms: paymentTerms,
      notes: notes.trim(),
      tags,
      parent_company_id: parentId,
      bill_with_parent: parentId ? billWithParent : true,
    }).eq('id', company.id);

    setSaving(false);

    if (saveErr) {
      setError(saveErr.message || 'Failed to save changes. Please try again.');
      return;
    }

    onSaved();
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-end">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-2xl h-full bg-white shadow-2xl flex flex-col overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 flex-shrink-0">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Edit Customer</h2>
            <p className="text-sm text-gray-500 mt-0.5">{company.name}</p>
          </div>
          <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-8">

          <section>
            <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Customer Identifiers</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">WorkHorse ID</label>
                <input
                  type="text"
                  value={accountNumber}
                  onChange={e => setAccountNumber(e.target.value)}
                  placeholder="e.g. WH-001234"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">QuickBooks Online ID</label>
                <input
                  type="text"
                  value={quickbooksId}
                  onChange={e => setQuickbooksId(e.target.value)}
                  placeholder="e.g. QBO-123456"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>

            <div className="mt-4 rounded-lg border border-gray-200 bg-gray-50 p-3">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <div className="flex items-center gap-2">
                  {(() => {
                    const s = QB_SYNC_STYLES[qbSyncStatus];
                    const Icon = qbSyncStatus === 'synced' ? CheckCircle2
                      : qbSyncStatus === 'pending' ? CircleDashed
                      : qbSyncStatus === 'error' ? XCircle : MinusCircle;
                    return (
                      <span className={`inline-flex items-center gap-1.5 px-2 py-1 text-xs font-medium rounded-full border ${s.pill}`}>
                        <Icon className={`h-3.5 w-3.5 ${s.iconColor}`} />
                        QuickBooks: {QB_SYNC_LABELS[qbSyncStatus]}
                      </span>
                    );
                  })()}
                  {company.qb_last_synced_at && qbSyncStatus === 'synced' && (
                    <span className="text-xs text-gray-500">
                      Last synced {formatLastSynced(company.qb_last_synced_at)}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-1">
                  {(['synced', 'pending', 'error', 'not_synced'] as QbSyncStatus[]).map(s => (
                    <button
                      key={s}
                      type="button"
                      disabled={!quickbooksId.trim() && s !== 'not_synced'}
                      onClick={() => setQbSyncStatus(s)}
                      className={`px-2 py-1 text-xs font-medium rounded-md border transition-colors ${
                        qbSyncStatus === s
                          ? 'bg-white border-gray-400 text-gray-900 shadow-sm'
                          : 'bg-transparent border-transparent text-gray-500 hover:text-gray-800 hover:bg-white'
                      } disabled:opacity-40 disabled:cursor-not-allowed`}
                    >
                      {QB_SYNC_LABELS[s]}
                    </button>
                  ))}
                </div>
              </div>
              {!quickbooksId.trim() && (
                <p className="mt-2 text-xs text-gray-500">
                  Enter a QuickBooks Online ID above to enable sync.
                </p>
              )}
            </div>
          </section>

          <div className="border-t border-gray-100" />

          <section>
            <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Basic Info</h3>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Company Name <span className="text-red-500">*</span></label>
                <input
                  type="text"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
                  <select
                    value={customerType}
                    onChange={e => setCustomerType(e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
                  >
                    {CUSTOMER_TYPES.map(t => (
                      <option key={t} value={t} className="capitalize">{t.charAt(0).toUpperCase() + t.slice(1)}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                  <select
                    value={status}
                    onChange={e => setStatus(e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
                  >
                    {STATUSES.map(s => (
                      <option key={s} value={s} className="capitalize">{s.charAt(0).toUpperCase() + s.slice(1)}</option>
                    ))}
                  </select>
                </div>
                <div className="flex flex-col justify-end pb-0.5">
                  <label className="block text-sm font-medium text-gray-700 mb-1">VIP Account</label>
                  <button
                    type="button"
                    onClick={() => setIsVip(v => !v)}
                    className={`w-full flex items-center justify-center gap-2 px-3 py-2 text-sm rounded-lg border transition-colors ${
                      isVip
                        ? 'bg-yellow-50 border-yellow-300 text-yellow-700 font-medium'
                        : 'bg-white border-gray-300 text-gray-500'
                    }`}
                  >
                    {isVip ? 'VIP On' : 'VIP Off'}
                  </button>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Website</label>
                <input
                  type="text"
                  value={website}
                  onChange={e => setWebsite(e.target.value)}
                  placeholder="https://example.com"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>
          </section>

          <div className="border-t border-gray-100" />

          <section>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Account Hierarchy</h3>
              {parentId && (
                <button
                  onClick={() => { setParentId(null); setParentQuery(''); }}
                  className="text-xs text-gray-500 hover:text-gray-700"
                >
                  Promote to top-level
                </button>
              )}
            </div>

            {hasChildren && !parentId && (
              <p className="mb-3 text-xs text-gray-500 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 flex items-center gap-2">
                <Network className="h-3.5 w-3.5 text-blue-600 flex-shrink-0" />
                This is a master account with sub-customers. It cannot be converted to a sub-customer.
              </p>
            )}

            {!hasChildren && (
              selectedParent ? (
                <div className="flex items-center gap-3 p-3 rounded-lg border border-blue-200 bg-blue-50">
                  <div className="w-8 h-8 rounded-lg bg-white flex items-center justify-center flex-shrink-0">
                    {selectedParent.customer_type === 'commercial'
                      ? <Building2 className="h-4 w-4 text-blue-600" />
                      : <Home className="h-4 w-4 text-green-600" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-[10px] font-semibold text-blue-700 uppercase tracking-wide">Sub-customer of</div>
                    <div className="text-sm font-semibold text-gray-900 truncate">{selectedParent.name}</div>
                  </div>
                  <button
                    onClick={() => { setParentId(null); setParentQuery(''); }}
                    className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-white rounded"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ) : (
                <div>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <input
                      type="text"
                      value={parentQuery}
                      onChange={e => setParentQuery(e.target.value)}
                      placeholder="Search master accounts to nest under..."
                      className="pl-9 pr-3 py-2 w-full border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  {parentQuery && (
                    <ul className="mt-2 max-h-48 overflow-y-auto rounded-lg border border-gray-200 divide-y divide-gray-100 bg-white">
                      {filteredParents.map(p => (
                        <li key={p.id}>
                          <button
                            onClick={() => setParentId(p.id)}
                            className="w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-gray-50 transition-colors"
                          >
                            {p.customer_type === 'commercial'
                              ? <Building2 className="h-4 w-4 text-blue-500" />
                              : <Home className="h-4 w-4 text-green-500" />}
                            <span className="text-sm text-gray-900 flex-1 truncate">{p.name}</span>
                            {p.account_number && (
                              <span className="text-xs font-mono text-gray-400">{p.account_number}</span>
                            )}
                          </button>
                        </li>
                      ))}
                      {filteredParents.length === 0 && (
                        <li className="px-3 py-2 text-xs text-gray-400">No matching master accounts.</li>
                      )}
                    </ul>
                  )}
                </div>
              )
            )}

            {parentId && (
              <label className="mt-3 flex items-start gap-2 p-3 rounded-lg bg-gray-50 border border-gray-200 cursor-pointer">
                <input
                  type="checkbox"
                  checked={billWithParent}
                  onChange={e => setBillWithParent(e.target.checked)}
                  className="mt-0.5 h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="text-sm">
                  <span className="font-medium text-gray-900">Bill with parent</span>
                  <span className="block text-xs text-gray-500 mt-0.5">
                    Invoices roll up to the parent's AR and statements.
                  </span>
                </span>
              </label>
            )}
          </section>

          <div className="border-t border-gray-100" />

          <section>
            <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Phone Numbers</h3>
            <div className="space-y-2">
              {phones.map((phone, i) => (
                <div key={i} className="flex items-center gap-2">
                  <select
                    value={phone.label}
                    onChange={e => updatePhone(i, 'label', e.target.value)}
                    className="w-28 flex-shrink-0 border border-gray-300 rounded-lg px-2 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                  >
                    {PHONE_LABELS.map(l => <option key={l} value={l}>{l}</option>)}
                  </select>
                  <input
                    type="tel"
                    value={phone.number}
                    onChange={e => updatePhone(i, 'number', e.target.value)}
                    placeholder="(555) 000-0000"
                    className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                  <button
                    type="button"
                    onClick={() => removePhone(i)}
                    disabled={phones.length === 1}
                    className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
              <button
                type="button"
                onClick={addPhone}
                className="flex items-center gap-1.5 text-sm text-blue-600 hover:text-blue-800 transition-colors mt-1"
              >
                <Plus className="h-4 w-4" />
                Add Phone
              </button>
            </div>
          </section>

          <div className="border-t border-gray-100" />

          <section>
            <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Email Addresses</h3>
            <div className="space-y-2">
              {companyEmails.map((email, i) => (
                <div key={i} className="flex items-center gap-2">
                  <select
                    value={email.label}
                    onChange={e => updateEmail(i, 'label', e.target.value)}
                    className="w-28 flex-shrink-0 border border-gray-300 rounded-lg px-2 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                  >
                    {EMAIL_LABELS.map(l => <option key={l} value={l}>{l}</option>)}
                  </select>
                  <input
                    type="email"
                    value={email.address}
                    onChange={e => updateEmail(i, 'address', e.target.value)}
                    placeholder="email@example.com"
                    className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                  <button
                    type="button"
                    onClick={() => removeEmail(i)}
                    disabled={companyEmails.length === 1}
                    className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
              <button
                type="button"
                onClick={addEmail}
                className="flex items-center gap-1.5 text-sm text-blue-600 hover:text-blue-800 transition-colors mt-1"
              >
                <Plus className="h-4 w-4" />
                Add Email
              </button>
            </div>
          </section>

          <div className="border-t border-gray-100" />

          <section>
            <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Billing Address</h3>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Address Line 1</label>
                <input
                  type="text"
                  value={billingAddress}
                  onChange={e => setBillingAddress(e.target.value)}
                  placeholder="123 Main St"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Address Line 2</label>
                <input
                  type="text"
                  value={billingAddress2}
                  onChange={e => setBillingAddress2(e.target.value)}
                  placeholder="Suite 200, Floor 3, etc."
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-1">
                  <label className="block text-sm font-medium text-gray-700 mb-1">City</label>
                  <input
                    type="text"
                    value={billingCity}
                    onChange={e => setBillingCity(e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">State</label>
                  <input
                    type="text"
                    value={billingState}
                    onChange={e => setBillingState(e.target.value)}
                    placeholder="TX"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">ZIP</label>
                  <input
                    type="text"
                    value={billingZip}
                    onChange={e => setBillingZip(e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Country</label>
                <input
                  type="text"
                  value={billingCountry}
                  onChange={e => setBillingCountry(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>
          </section>

          <div className="border-t border-gray-100" />

          <section>
            <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Additional Info</h3>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Payment Terms</label>
                <select
                  value={paymentTerms}
                  onChange={e => setPaymentTerms(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                >
                  {PAYMENT_TERMS.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Tags</label>
                <div className="flex flex-wrap gap-1.5 mb-2">
                  {tags.map(tag => (
                    <span key={tag} className="inline-flex items-center gap-1 px-2.5 py-1 bg-gray-100 text-gray-700 text-xs rounded-full">
                      {tag}
                      <button type="button" onClick={() => removeTag(tag)} className="text-gray-400 hover:text-red-500 transition-colors">
                        <X className="h-3 w-3" />
                      </button>
                    </span>
                  ))}
                </div>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={tagInput}
                    onChange={e => setTagInput(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addTag(); } }}
                    placeholder="Add a tag..."
                    className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                  <button
                    type="button"
                    onClick={addTag}
                    className="px-3 py-2 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
                  >
                    Add
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Internal Notes</label>
                <textarea
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  rows={3}
                  placeholder="Internal notes about this customer..."
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                />
              </div>
            </div>
          </section>

        </div>

        <div className="flex-shrink-0 px-6 py-4 border-t border-gray-200 bg-white">
          {error && (
            <p className="text-sm text-red-600 mb-3">{error}</p>
          )}
          <div className="flex items-center gap-3 justify-end">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-60"
            >
              {saving && <Loader2 className="h-4 w-4 animate-spin" />}
              Save Changes
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
