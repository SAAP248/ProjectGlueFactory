import { useState, useEffect, useMemo } from 'react';
import { X, Loader2, Search, Building2, Home } from 'lucide-react';
import { supabase } from '../../lib/supabase';

interface ParentOption {
  id: string;
  name: string;
  account_number: string | null;
  customer_type: string;
}

interface Props {
  onClose: () => void;
  onCreated: (id: string) => void;
  defaultParentId?: string | null;
}

export default function NewCustomerModal({ onClose, onCreated, defaultParentId = null }: Props) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const [name, setName] = useState('');
  const [customerType, setCustomerType] = useState('commercial');
  const [status, setStatus] = useState('active');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');

  const [quickbooksId, setQuickbooksId] = useState('');
  const [syncWithQb, setSyncWithQb] = useState(false);

  const [parentId, setParentId] = useState<string | null>(defaultParentId);
  const [billWithParent, setBillWithParent] = useState(true);
  const [parentQuery, setParentQuery] = useState('');
  const [parentOptions, setParentOptions] = useState<ParentOption[]>([]);
  const [loadingParents, setLoadingParents] = useState(true);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from('companies')
        .select('id, name, account_number, customer_type')
        .is('parent_company_id', null)
        .order('name');
      if (data) setParentOptions(data);
      setLoadingParents(false);
    })();
  }, []);

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

  async function handleSave() {
    if (!name.trim()) {
      setError('Company name is required.');
      return;
    }
    setSaving(true);
    setError('');

    const qbId = quickbooksId.trim();
    const payload: Record<string, unknown> = {
      name: name.trim(),
      customer_type: customerType,
      status,
      phone: phone.trim(),
      email: email.trim(),
      parent_company_id: parentId,
      bill_with_parent: parentId ? billWithParent : true,
      quickbooks_id: qbId,
      qb_sync_status: qbId && syncWithQb ? 'synced' : qbId ? 'pending' : 'not_synced',
      qb_last_synced_at: qbId && syncWithQb ? new Date().toISOString() : null,
    };

    const { data, error: saveErr } = await supabase
      .from('companies')
      .insert(payload)
      .select('id')
      .maybeSingle();

    setSaving(false);

    if (saveErr || !data) {
      setError(saveErr?.message || 'Failed to create customer.');
      return;
    }

    onCreated(data.id);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-end">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-xl h-full bg-white shadow-2xl flex flex-col overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 flex-shrink-0">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">New Customer</h2>
            <p className="text-sm text-gray-500 mt-0.5">
              {parentId ? 'Creating a sub-customer' : 'Creating a master account'}
            </p>
          </div>
          <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">
          <section>
            <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Basic Info</h3>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Company Name <span className="text-red-500">*</span></label>
                <input
                  type="text"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  autoFocus
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
                  <select
                    value={customerType}
                    onChange={e => setCustomerType(e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                  >
                    <option value="commercial">Commercial</option>
                    <option value="residential">Residential</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                  <select
                    value={status}
                    onChange={e => setStatus(e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                  >
                    <option value="active">Active</option>
                    <option value="prospect">Prospect</option>
                    <option value="inactive">Inactive</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                  <input
                    type="tel"
                    value={phone}
                    onChange={e => setPhone(e.target.value)}
                    placeholder="(555) 000-0000"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                  <input
                    type="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder="billing@company.com"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
            </div>
          </section>

          <div className="border-t border-gray-100" />

          <section>
            <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">QuickBooks Online</h3>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">QBO Customer ID</label>
              <input
                type="text"
                value={quickbooksId}
                onChange={e => setQuickbooksId(e.target.value)}
                placeholder="e.g. QBO-123456"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <p className="mt-1 text-xs text-gray-500">
                Paste the matching customer ID from QuickBooks Online.
              </p>
            </div>
            <label className={`mt-3 flex items-start gap-2 p-3 rounded-lg border cursor-pointer transition-colors ${
              quickbooksId.trim()
                ? 'bg-emerald-50 border-emerald-200'
                : 'bg-gray-50 border-gray-200 opacity-60 cursor-not-allowed'
            }`}>
              <input
                type="checkbox"
                checked={syncWithQb}
                disabled={!quickbooksId.trim()}
                onChange={e => setSyncWithQb(e.target.checked)}
                className="mt-0.5 h-4 w-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
              />
              <span className="text-sm">
                <span className="font-medium text-gray-900">Sync actively with QuickBooks</span>
                <span className="block text-xs text-gray-500 mt-0.5">
                  When on, invoices and payments keep both systems in sync.
                </span>
              </span>
            </label>
          </section>

          <div className="border-t border-gray-100" />

          <section>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Sub-customer Of</h3>
              {parentId && (
                <button
                  onClick={() => { setParentId(null); setParentQuery(''); }}
                  className="text-xs text-gray-500 hover:text-gray-700"
                >
                  Make top-level
                </button>
              )}
            </div>

            {selectedParent ? (
              <div className="flex items-center gap-3 p-3 rounded-lg border border-blue-200 bg-blue-50">
                <div className="w-8 h-8 rounded-lg bg-white flex items-center justify-center flex-shrink-0">
                  {selectedParent.customer_type === 'commercial'
                    ? <Building2 className="h-4 w-4 text-blue-600" />
                    : <Home className="h-4 w-4 text-green-600" />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-semibold text-gray-900 truncate">{selectedParent.name}</div>
                  {selectedParent.account_number && (
                    <div className="text-xs font-mono text-gray-500">{selectedParent.account_number}</div>
                  )}
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
                    placeholder="Search master accounts..."
                    className="pl-9 pr-3 py-2 w-full border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                {loadingParents ? (
                  <p className="mt-2 text-xs text-gray-400">Loading...</p>
                ) : (
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
                <p className="mt-2 text-xs text-gray-500">
                  Leave empty to create a top-level master account.
                </p>
              </div>
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
                    Invoices for this sub-customer roll up to the parent's AR and statements.
                  </span>
                </span>
              </label>
            )}
          </section>
        </div>

        <div className="flex-shrink-0 px-6 py-4 border-t border-gray-200 bg-white">
          {error && <p className="text-sm text-red-600 mb-3">{error}</p>}
          <div className="flex items-center gap-3 justify-end">
            <button
              onClick={onClose}
              disabled={saving}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-60"
            >
              {saving && <Loader2 className="h-4 w-4 animate-spin" />}
              Create Customer
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
