import { useCallback, useEffect, useMemo, useState } from 'react';
import { CheckCircle2, FileText, MapPin, Percent, Send } from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import { usePortal } from '../lib/context';
import { errMsg, fetchAllRows } from '../lib/api';
import { fmtDate, money, monthLabel, round2, todayISO } from '../lib/format';
import type { TaxFiling } from '../lib/types';
import { Badge, btnPrimary, btnSecondary, Card, CardHeader, ErrorBanner, Field, inputCls, Loading, Modal, PageHeader, StatCard, Tabs } from '../components/ui';

interface Inv { invoice_date: string; taxable_amount: number; exempt_amount: number; tax_state_amount: number; tax_county_amount: number; tax_city_amount: number; tax: number }
interface MonthRow { period: string; gross: number; exempt: number; taxable: number; state: number; county: number; city: number; total: number; filing?: TaxFiling }
interface County { county: string; surtax_rate: number }
interface City { id: string; county: string; city: string; rate: number }

const due = (period: string) => { const [y, m] = period.split('-').map(Number); return `${m === 12 ? y + 1 : y}-${String(m === 12 ? 1 : m + 1).padStart(2, '0')}-20`; };

export default function SalesTax() {
  const { go, refreshKey, refresh, notify, byCode, accounts } = usePortal();
  const [tab, setTab] = useState<'returns' | 'rates'>('returns');
  const [invs, setInvs] = useState<Inv[] | null>(null);
  const [filings, setFilings] = useState<TaxFiling[]>([]);
  const [counties, setCounties] = useState<County[]>([]);
  const [cities, setCities] = useState<City[]>([]);
  const [error, setError] = useState('');
  const [filing, setFiling] = useState<MonthRow | null>(null);
  const year0 = `${new Date().getFullYear() - 1}-01-01`;

  const load = useCallback(async () => {
    try {
      const [i, f, c, ci] = await Promise.all([
        fetchAllRows<Inv>((a, b) => supabase.from('invoices').select('invoice_date, taxable_amount, exempt_amount, tax_state_amount, tax_county_amount, tax_city_amount, tax').gte('invoice_date', year0).not('status', 'in', '(draft,void)').order('id').range(a, b) as unknown as PromiseLike<{ data: Inv[] | null; error: unknown }>),
        supabase.from('acct_tax_filings').select('*').gte('period_start', year0),
        supabase.from('acct_tax_counties').select('county, surtax_rate').order('county'),
        supabase.from('acct_tax_cities').select('*').order('city'),
      ]);
      setInvs(i);
      setFilings((f.data ?? []) as TaxFiling[]);
      setCounties(((c.data ?? []) as County[]).map(x => ({ ...x, surtax_rate: Number(x.surtax_rate) })));
      setCities((ci.data ?? []) as City[]);
    } catch (e) { setError(errMsg(e)); }
  }, [year0]);

  useEffect(() => { load(); }, [load, refreshKey]);

  const months = useMemo<MonthRow[]>(() => {
    const m = new Map<string, MonthRow>();
    const now = new Date();
    for (let d = new Date(now.getFullYear() - 1, 0, 1); d <= now; d = new Date(d.getFullYear(), d.getMonth() + 1, 1)) {
      const p = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`;
      m.set(p, { period: p, gross: 0, exempt: 0, taxable: 0, state: 0, county: 0, city: 0, total: 0 });
    }
    for (const i of invs ?? []) {
      const r = m.get(`${i.invoice_date.slice(0, 7)}-01`);
      if (!r) continue;
      r.taxable += Number(i.taxable_amount); r.exempt += Number(i.exempt_amount); r.gross += Number(i.taxable_amount) + Number(i.exempt_amount);
      r.state += Number(i.tax_state_amount); r.county += Number(i.tax_county_amount); r.city += Number(i.tax_city_amount); r.total += Number(i.tax);
    }
    for (const f of filings) { const r = m.get(f.period_start); if (r) r.filing = f; }
    return [...m.values()].reverse();
  }, [invs, filings]);

  if (!invs) return error ? <ErrorBanner message={error} /> : <Loading />;

  const thisMonth = `${todayISO().slice(0, 7)}-01`;
  const unfiled = months.filter(m => !m.filing && m.period < thisMonth);
  const owed = round2(unfiled.reduce((s, m) => s + m.total, 0));
  const next = unfiled[unfiled.length - 1];
  const ytd = months.filter(m => m.period.startsWith(String(new Date().getFullYear())));

  async function saveCounty(c: County, rate: number) {
    const { error } = await supabase.from('acct_tax_counties').update({ surtax_rate: rate, updated_at: new Date().toISOString() }).eq('county', c.county);
    if (error) setError(errMsg(error)); else { notify(`${c.county} rate saved`); load(); }
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Florida Sales Tax" subtitle="6% state tax plus each county's surtax on the first $5,000 of an item, and city tax where it applies. Returns (DR-15) are due by the 20th of the next month." />
      <ErrorBanner message={error} onClose={() => setError('')} />
      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Waiting to be filed" value={money(owed)} hint={`${unfiled.length} month${unfiled.length === 1 ? '' : 's'} not filed yet`} tone={unfiled.length ? 'amber' : 'emerald'} icon={<Percent className="w-5 h-5" />} />
        <StatCard label="Next return due" value={next ? fmtDate(due(next.period)) : 'All filed'} hint={next ? `${monthLabel(next.period, true)} · ${money(next.total)}` : undefined} tone={next && due(next.period) < todayISO() ? 'red' : 'blue'} icon={<Send className="w-5 h-5" />} onClick={next ? () => setFiling(next) : undefined} />
        <StatCard label="Collected this year" value={money(ytd.reduce((s, m) => s + m.total, 0))} hint={`on ${money(ytd.reduce((s, m) => s + m.taxable, 0))} taxable sales`} tone="gray" icon={<FileText className="w-5 h-5" />} />
      </div>

      <Tabs value={tab} onChange={setTab} tabs={[{ id: 'returns', label: 'Monthly returns' }, { id: 'rates', label: 'County & city rates' }]} />

      {tab === 'returns' ? (
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead><tr className="border-b border-gray-100 text-xs font-semibold uppercase tracking-wide text-gray-500">
                {['Month', 'Gross sales', 'Exempt', 'Taxable', 'State', 'County', 'City', 'Tax due', 'Status', ''].map((h, i) => <th key={i} className={`${i === 0 ? 'text-left px-5' : i >= 8 ? 'text-left px-3' : 'text-right px-3'} py-2.5 whitespace-nowrap`}>{h}</th>)}
              </tr></thead>
              <tbody className="divide-y divide-gray-50">
                {months.map(m => {
                  const late = !m.filing && m.period < thisMonth && due(m.period) < todayISO();
                  return (
                    <tr key={m.period} className="text-sm hover:bg-gray-50">
                      <td className="px-5 py-2.5 font-medium text-gray-900 whitespace-nowrap">{monthLabel(m.period, true)}</td>
                      <td className="px-3 py-2.5 text-right tabular-nums">{money(m.gross)}</td>
                      <td className="px-3 py-2.5 text-right tabular-nums text-gray-500">{money(m.exempt)}</td>
                      <td className="px-3 py-2.5 text-right tabular-nums">{money(m.taxable)}</td>
                      <td className="px-3 py-2.5 text-right tabular-nums text-gray-600">{money(m.state)}</td>
                      <td className="px-3 py-2.5 text-right tabular-nums text-gray-600">{money(m.county)}</td>
                      <td className="px-3 py-2.5 text-right tabular-nums text-gray-600">{m.city ? money(m.city) : '-'}</td>
                      <td className="px-3 py-2.5 text-right tabular-nums font-semibold">{money(m.filing?.total_tax ?? m.total)}</td>
                      <td className="px-3 py-2.5 whitespace-nowrap">
                        {m.filing ? <Badge tone="emerald"><CheckCircle2 className="w-3 h-3" /> Filed {fmtDate(m.filing.filed_date)}</Badge>
                          : m.period >= thisMonth ? <Badge>Collecting</Badge>
                          : late ? <Badge tone="red">Past due</Badge> : <Badge tone="amber">Due {fmtDate(due(m.period))}</Badge>}
                      </td>
                      <td className="px-3 py-2.5 text-right whitespace-nowrap">
                        <button onClick={() => go('reports', { report: 'county', from: m.period, to: `${m.period.slice(0, 8)}${new Date(Number(m.period.slice(0, 4)), Number(m.period.slice(5, 7)), 0).getDate()}` })} className="text-xs font-medium text-gray-500 hover:text-blue-700 mr-3"><MapPin className="inline w-3.5 h-3.5" /> Counties</button>
                        {!m.filing && m.period < thisMonth && <button onClick={() => setFiling(m)} className="text-xs font-semibold text-blue-600 hover:text-blue-800">File</button>}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      ) : (
        <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
          <Card className="overflow-hidden">
            <CardHeader title="County surtax" subtitle="Applied on the first $5,000 of each taxable item, based on the job site's county" />
            <div className="grid sm:grid-cols-2 xl:grid-cols-3 divide-y sm:divide-y-0 divide-gray-50 max-h-[560px] overflow-y-auto">
              {counties.map(c => <CountyRow key={c.county} c={c} onSave={r => saveCounty(c, r)} />)}
            </div>
          </Card>
          <Card className="overflow-hidden h-fit">
            <CardHeader title="City taxes" subtitle="Extra local taxes on top of state and county" />
            <ul className="divide-y divide-gray-50">
              {cities.map(c => <li key={c.id} className="flex justify-between px-5 py-2.5 text-sm"><span className="text-gray-900">{c.city} <span className="text-gray-400">· {c.county}</span></span><span className="tabular-nums font-medium">{Number(c.rate)}%</span></li>)}
              {cities.length === 0 && <li className="px-5 py-6 text-sm text-center text-gray-500">No city taxes set up.</li>}
            </ul>
          </Card>
        </div>
      )}

      {filing && (
        <FileModal row={filing} bankDefault={byCode.get('1000')?.id ?? ''} banks={accounts.filter(a => a.subtype === 'bank' && a.is_active)} onClose={() => setFiling(null)}
          onDone={() => { setFiling(null); notify(`${monthLabel(filing.period, true)} return filed`); refresh(); }} />
      )}
    </div>
  );
}

function CountyRow({ c, onSave }: { c: County; onSave: (rate: number) => void }) {
  const [v, setV] = useState(String(c.surtax_rate));
  const dirty = Number(v) !== c.surtax_rate;
  return (
    <div className="flex items-center justify-between gap-2 px-5 py-2">
      <span className="text-sm text-gray-800">{c.county}</span>
      <div className="flex items-center gap-1">
        <input type="number" step="0.1" min="0" max="3" value={v} onChange={e => setV(e.target.value)} onBlur={() => dirty && onSave(Number(v))} className="w-16 px-2 py-1 text-right text-sm bg-gray-50 border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" />
        <span className="text-xs text-gray-400">%</span>
      </div>
    </div>
  );
}

function FileModal({ row, banks, bankDefault, onClose, onDone }: { row: MonthRow; banks: { id: string; name: string }[]; bankDefault: string; onClose: () => void; onDone: () => void }) {
  const [filed, setFiled] = useState(todayISO() <= due(row.period) ? todayISO() : todayISO());
  const [bank, setBank] = useState(bankDefault);
  const [conf, setConf] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const onTime = filed <= due(row.period);
  const allowance = onTime ? Math.min(30, round2(row.total * 0.025)) : 0;

  async function file() {
    setBusy(true);
    setError('');
    const { error } = await supabase.rpc('acct_file_sales_tax', { p_period: row.period, p_filed_date: filed, p_bank_account_id: bank, p_confirmation: conf || null, p_demo: false });
    setBusy(false);
    if (error) { setError(errMsg(error)); return; }
    onDone();
  }

  return (
    <Modal open onClose={onClose} title={`File ${monthLabel(row.period, true)} return`} subtitle={`Florida DR-15 · due ${fmtDate(due(row.period))}`} size="sm"
      footer={<><button onClick={onClose} className={btnSecondary}>Cancel</button><button onClick={file} disabled={busy || !bank} className={btnPrimary}><Send className="w-4 h-4" /> Pay {money(row.total - allowance)}</button></>}>
      <div className="space-y-4">
        <ErrorBanner message={error} />
        <dl className="rounded-lg bg-gray-50 p-4 space-y-1.5 text-sm">
          {[['Gross sales', row.gross], ['Exempt sales', row.exempt], ['Taxable sales', row.taxable], ['State tax (6%)', row.state], ['County surtax', row.county], ['City tax', row.city]].map(([k, v]) => (
            <div key={k as string} className="flex justify-between"><dt className="text-gray-600">{k}</dt><dd className="tabular-nums">{money(v as number)}</dd></div>
          ))}
          <div className="flex justify-between border-t border-gray-200 pt-1.5 font-semibold"><dt>Tax collected</dt><dd className="tabular-nums">{money(row.total)}</dd></div>
          <div className="flex justify-between text-emerald-700"><dt>Collection allowance {onTime ? '(filed on time)' : '(late, none)'}</dt><dd className="tabular-nums">-{money(allowance)}</dd></div>
        </dl>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Filed on"><input type="date" value={filed} onChange={e => setFiled(e.target.value)} className={inputCls} /></Field>
          <Field label="Paid from"><select value={bank} onChange={e => setBank(e.target.value)} className={inputCls}>{banks.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}</select></Field>
        </div>
        <Field label="Confirmation number (optional)"><input value={conf} onChange={e => setConf(e.target.value)} className={inputCls} /></Field>
      </div>
    </Modal>
  );
}
