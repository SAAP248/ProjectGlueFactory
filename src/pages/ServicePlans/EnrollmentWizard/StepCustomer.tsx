import { useEffect, useState } from 'react';
import { Building2, Search } from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import { inputCls, Loading } from '../ui';
import type { WizardCompany } from './types';

export default function StepCustomer({ value, onChange }: { value: WizardCompany | null; onChange: (c: WizardCompany) => void }) {
  const [q, setQ] = useState('');
  const [rows, setRows] = useState<WizardCompany[] | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    const t = setTimeout(async () => {
      let query = supabase.from('companies').select('id, name').order('name').limit(40);
      if (q.trim()) query = query.ilike('name', `%${q.trim().replace(/[%_]/g, '')}%`);
      const { data, error: err } = await query;
      if (err) setError(err.message);
      else { setError(''); setRows((data ?? []) as WizardCompany[]); }
    }, 200);
    return () => clearTimeout(t);
  }, [q]);

  return (
    <div className="space-y-4">
      <div>
        <h2 className="font-display text-2xl text-gray-900">Who is this plan for?</h2>
        <p className="text-sm text-gray-500 mt-1">The agreement lives on the customer's account and appears on their profile.</p>
      </div>
      <div className="relative">
        <Search className="h-4 w-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
        <input autoFocus className={`${inputCls} pl-9`} placeholder="Search customers" value={q} onChange={e => setQ(e.target.value)} />
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}
      {!rows ? <Loading /> : (
        <div className="grid sm:grid-cols-2 gap-2">
          {rows.length === 0 && <p className="text-sm text-gray-500 py-6">No customers match that search.</p>}
          {rows.map(c => {
            const active = value?.id === c.id;
            return (
              <button key={c.id} onClick={() => onChange(c)}
                className={`flex items-center gap-3 p-3 rounded-xl border text-left transition-all ${active ? 'border-blue-500 bg-blue-50 ring-2 ring-blue-500/20' : 'border-gray-200 bg-white hover:border-gray-300 hover:shadow-sm'}`}>
                <span className={`w-9 h-9 rounded-lg flex items-center justify-center ${active ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-500'}`}>
                  <Building2 className="h-4 w-4" />
                </span>
                <span className="font-medium text-gray-900 text-sm truncate">{c.name}</span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
