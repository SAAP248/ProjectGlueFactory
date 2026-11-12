import { useEffect, useMemo, useState } from 'react';
import { CreditCard, Landmark, Lock, Pencil, Plus, Search } from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import { usePortal } from '../lib/context';
import { errMsg, fetchTotals } from '../lib/api';
import { money, naturalBalance, TYPE_LABELS, todayISO } from '../lib/format';
import type { Account, AccountType } from '../lib/types';
import AccountLedger from '../components/AccountLedger';
import { Badge, btnPrimary, btnSecondary, Card, ErrorBanner, Field, inputCls, Loading, Modal, PageHeader, Tabs } from '../components/ui';

const TYPES: AccountType[] = ['asset', 'liability', 'equity', 'income', 'cogs', 'expense'];
const SUBTYPES: Record<AccountType, { id: string; label: string }[]> = {
  asset: [{ id: 'bank', label: 'Bank' }, { id: 'current', label: 'Current asset' }, { id: 'receivable', label: 'Receivable' }, { id: 'fixed', label: 'Fixed asset' }],
  liability: [{ id: 'credit_card', label: 'Credit card' }, { id: 'payable', label: 'Payable' }, { id: 'current', label: 'Current liability' }, { id: 'long_term', label: 'Long-term liability' }],
  equity: [{ id: 'equity', label: 'Equity' }, { id: 'retained', label: 'Retained earnings' }],
  income: [{ id: 'income', label: 'Income' }, { id: 'other_income', label: 'Other income' }],
  cogs: [{ id: 'cogs', label: 'Cost of goods sold' }],
  expense: [{ id: 'expense', label: 'Expense' }, { id: 'other_expense', label: 'Other expense' }],
};

type Draft = Partial<Account> & { type: AccountType };

export default function ChartOfAccounts() {
  const { accounts, byId, params, go, reloadAccounts, refreshKey, notify } = usePortal();
  const [balances, setBalances] = useState<Map<string, number> | null>(null);
  const [filter, setFilter] = useState<'all' | AccountType>('all');
  const [q, setQ] = useState('');
  const [showInactive, setShowInactive] = useState(false);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchTotals(null, todayISO())
      .then(t => {
        const m = new Map<string, number>();
        for (const a of accounts) {
          const r = t.get(a.id);
          m.set(a.id, r ? naturalBalance(a.type, r.debit, r.credit) : 0);
        }
        setBalances(m);
      })
      .catch(e => setError(errMsg(e)));
  }, [accounts, refreshKey]);

  const list = useMemo(() => {
    const s = q.trim().toLowerCase();
    return accounts.filter(a =>
      (showInactive || a.is_active) &&
      (filter === 'all' || a.type === filter) &&
      (!s || a.name.toLowerCase().includes(s) || a.code.includes(s)));
  }, [accounts, filter, q, showInactive]);

  const selected = params.account ? byId.get(params.account) : undefined;
  if (selected) return <AccountLedger account={selected} onBack={() => go('accounts')} />;

  const save = async () => {
    if (!draft) return;
    if (!draft.code?.trim() || !draft.name?.trim()) { setError('Every account needs a number and a name.'); return; }
    setSaving(true);
    setError('');
    const row = {
      code: draft.code.trim(), name: draft.name.trim(), type: draft.type,
      subtype: draft.subtype || SUBTYPES[draft.type][0].id, description: draft.description || null,
      institution: draft.institution || null, last4: draft.last4 || null,
      is_active: draft.is_active ?? true, is_1099: draft.is_1099 ?? false,
    };
    const res = draft.id
      ? await supabase.from('acct_accounts').update(row).eq('id', draft.id)
      : await supabase.from('acct_accounts').insert(row);
    setSaving(false);
    if (res.error) { setError(res.error.code === '23505' ? 'That account number is already used.' : errMsg(res.error)); return; }
    await reloadAccounts();
    notify(draft.id ? 'Account updated' : 'Account added');
    setDraft(null);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Chart of Accounts"
        subtitle="Every place money is tracked. Click an account to see each transaction behind its balance."
        actions={<button className={btnPrimary} onClick={() => setDraft({ type: 'expense', is_active: true })}><Plus className="w-4 h-4" /> New account</button>}
      />
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Tabs
          value={filter}
          onChange={setFilter}
          tabs={[{ id: 'all' as const, label: 'All' }, ...TYPES.map(t => ({ id: t, label: TYPE_LABELS[t] }))]}
        />
        <div className="flex items-center gap-3">
          <label className="flex items-center gap-2 text-sm text-gray-600">
            <input type="checkbox" checked={showInactive} onChange={e => setShowInactive(e.target.checked)} className="rounded border-gray-300 text-blue-600 focus:ring-blue-500" />
            Show inactive
          </label>
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input value={q} onChange={e => setQ(e.target.value)} placeholder="Search accounts" className={`${inputCls} pl-9 w-56`} />
          </div>
        </div>
      </div>
      <ErrorBanner message={draft ? '' : error} onClose={() => setError('')} />

      {!balances ? <Loading /> : (
        <div className="space-y-6">
          {TYPES.filter(t => list.some(a => a.type === t)).map(t => {
            const group = list.filter(a => a.type === t);
            const total = group.reduce((s, a) => s + (balances.get(a.id) ?? 0), 0);
            const isPnl = ['income', 'cogs', 'expense'].includes(t);
            return (
              <Card key={t} className="overflow-hidden">
                <div className="flex items-center justify-between px-5 py-3 bg-gray-50 border-b border-gray-200">
                  <h3 className="text-sm font-semibold text-gray-900">{TYPE_LABELS[t]}</h3>
                  <span className="text-xs text-gray-500">{isPnl ? 'All-time total' : 'Balance today'} <span className="ml-2 text-sm font-semibold text-gray-900 tabular-nums">{money(total)}</span></span>
                </div>
                <div className="divide-y divide-gray-100">
                  {group.map(a => (
                    <div key={a.id} className="group flex items-center gap-4 px-5 py-3 hover:bg-blue-50/40 transition">
                      <button onClick={() => go('accounts', { account: a.id })} className="flex-1 flex items-center gap-4 text-left min-w-0">
                        <span className="w-12 text-sm font-mono text-gray-500">{a.code}</span>
                        <span className="flex items-center gap-2 min-w-0">
                          {a.subtype === 'bank' && <Landmark className="w-4 h-4 text-blue-600 shrink-0" />}
                          {a.subtype === 'credit_card' && <CreditCard className="w-4 h-4 text-amber-600 shrink-0" />}
                          <span className="text-sm font-medium text-gray-900 truncate group-hover:text-blue-700">{a.name}</span>
                          {a.last4 && <span className="text-xs text-gray-400">···{a.last4}</span>}
                          {a.is_system && <Lock className="w-3 h-3 text-gray-300" aria-label="Used by WorkHorse automatically" />}
                          {!a.is_active && <Badge>Inactive</Badge>}
                        </span>
                      </button>
                      <span className="hidden md:block text-xs text-gray-400 w-40 truncate">{SUBTYPES[a.type].find(s => s.id === a.subtype)?.label}</span>
                      <span className="w-32 text-right text-sm font-medium text-gray-900 tabular-nums">{money(balances.get(a.id) ?? 0)}</span>
                      <button onClick={() => setDraft({ ...a })} className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-white opacity-0 group-hover:opacity-100 transition no-print" aria-label="Edit account">
                        <Pencil className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </Card>
            );
          })}
        </div>
      )}

      <Modal
        open={!!draft}
        onClose={() => { setDraft(null); setError(''); }}
        title={draft?.id ? 'Edit account' : 'New account'}
        subtitle={draft?.is_system ? 'WorkHorse posts to this account automatically, so its type is fixed.' : undefined}
        footer={<>
          <button className={btnSecondary} onClick={() => { setDraft(null); setError(''); }}>Cancel</button>
          <button className={btnPrimary} onClick={save} disabled={saving}>{saving ? 'Saving...' : 'Save account'}</button>
        </>}
      >
        {draft && (
          <div className="space-y-4">
            <ErrorBanner message={error} />
            <div className="grid grid-cols-3 gap-4">
              <Field label="Number"><input className={inputCls} value={draft.code ?? ''} onChange={e => setDraft({ ...draft, code: e.target.value })} placeholder="6250" /></Field>
              <div className="col-span-2"><Field label="Name"><input className={inputCls} value={draft.name ?? ''} onChange={e => setDraft({ ...draft, name: e.target.value })} placeholder="Uniforms" /></Field></div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <Field label="Type">
                <select className={inputCls} value={draft.type} disabled={!!draft.is_system} onChange={e => { const type = e.target.value as AccountType; setDraft({ ...draft, type, subtype: SUBTYPES[type][0].id }); }}>
                  {TYPES.map(t => <option key={t} value={t}>{TYPE_LABELS[t]}</option>)}
                </select>
              </Field>
              <Field label="Detail">
                <select className={inputCls} value={draft.subtype ?? SUBTYPES[draft.type][0].id} disabled={!!draft.is_system} onChange={e => setDraft({ ...draft, subtype: e.target.value })}>
                  {SUBTYPES[draft.type].map(s => <option key={s.id} value={s.id}>{s.label}</option>)}
                </select>
              </Field>
            </div>
            {(draft.subtype === 'bank' || draft.subtype === 'credit_card') && (
              <div className="grid grid-cols-2 gap-4">
                <Field label="Bank or card company"><input className={inputCls} value={draft.institution ?? ''} onChange={e => setDraft({ ...draft, institution: e.target.value })} /></Field>
                <Field label="Last 4 digits"><input className={inputCls} maxLength={4} value={draft.last4 ?? ''} onChange={e => setDraft({ ...draft, last4: e.target.value.replace(/\D/g, '') })} /></Field>
              </div>
            )}
            <Field label="Description"><textarea rows={2} className={inputCls} value={draft.description ?? ''} onChange={e => setDraft({ ...draft, description: e.target.value })} /></Field>
            <div className="flex flex-wrap gap-6">
              <label className="flex items-center gap-2 text-sm text-gray-700">
                <input type="checkbox" disabled={!!draft.is_system} checked={draft.is_active ?? true} onChange={e => setDraft({ ...draft, is_active: e.target.checked })} className="rounded border-gray-300 text-blue-600 focus:ring-blue-500" />
                Active
              </label>
              {draft.type === 'expense' || draft.type === 'cogs' ? (
                <label className="flex items-center gap-2 text-sm text-gray-700">
                  <input type="checkbox" checked={draft.is_1099 ?? false} onChange={e => setDraft({ ...draft, is_1099: e.target.checked })} className="rounded border-gray-300 text-blue-600 focus:ring-blue-500" />
                  Counts toward 1099 totals
                </label>
              ) : null}
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
