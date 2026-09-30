import { useState, useEffect } from 'react';
import {
  TrendingUp, DollarSign, FileText, CreditCard,
  AlertTriangle, Plus, X as XIcon,
  Receipt, ArrowUpRight, ArrowDownRight, Minus,
  ChevronDown, ChevronRight, Users, Package,
  MapPin, CheckCircle, Truck, Save
} from 'lucide-react';
import { supabase } from '../../lib/supabase';

interface Invoice {
  id: string;
  invoice_number: string;
  status: string;
  invoice_date: string;
  due_date: string;
  subtotal: number;
  tax: number;
  total: number;
  amount_paid: number;
  balance_due: number;
}

interface Transaction {
  id: string;
  transaction_number: string;
  transaction_type: string;
  payment_method: string;
  amount: number;
  transaction_date: string;
  reference_number: string | null;
  invoice_id: string | null;
}

interface TechEntry {
  id: string;
  employee_id: string;
  first_name: string;
  last_name: string;
  is_lead: boolean;
  status: string;
  scheduled_date: string | null;
  enroute_at: string | null;
  onsite_at: string | null;
  completed_at: string | null;
  work_started_at: string | null;
  total_paused_minutes: number;
}

interface LineItem {
  id: string;
  line_type: string;
  description: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  cost_price: number | null;
  product_id: string | null;
}

interface Props {
  workOrder: any;
  lineItems: LineItem[];
  onPaymentRecorded: () => void;
  onLineItemsChanged: () => void;
}

const INVOICE_STATUS_STYLES: Record<string, { bg: string; text: string; label: string }> = {
  draft: { bg: 'bg-gray-100', text: 'text-gray-600', label: 'Draft' },
  sent: { bg: 'bg-blue-100', text: 'text-blue-700', label: 'Sent' },
  viewed: { bg: 'bg-blue-100', text: 'text-blue-700', label: 'Viewed' },
  partial: { bg: 'bg-amber-100', text: 'text-amber-700', label: 'Partial' },
  paid: { bg: 'bg-emerald-100', text: 'text-emerald-700', label: 'Paid' },
  overdue: { bg: 'bg-red-100', text: 'text-red-700', label: 'Overdue' },
  void: { bg: 'bg-gray-100', text: 'text-gray-500', label: 'Void' },
};

function fmt(val: number | null | undefined): string {
  return '$' + (Number(val) || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function fmtDate(d: string | null): string {
  if (!d) return '—';
  return new Date(d + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function fmtTime(d: string | null | undefined): string {
  if (!d) return '—';
  return new Date(d).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
}

function fmtDateTime(d: string | null | undefined): string {
  if (!d) return '—';
  const dt = new Date(d);
  return dt.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) + ' ' +
    dt.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
}

function diffMinutes(start: string | null, end: string | null): number | null {
  if (!start || !end) return null;
  return Math.round((new Date(end).getTime() - new Date(start).getTime()) / 60000);
}

function fmtDuration(mins: number | null): string {
  if (mins === null || mins < 0) return '—';
  if (mins < 60) return `${mins}m`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

export default function WorkOrderAccountingTab({ workOrder: wo, lineItems, onPaymentRecorded, onLineItemsChanged }: Props) {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [techEntries, setTechEntries] = useState<TechEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [laborOpen, setLaborOpen] = useState(false);
  const [partsOpen, setPartsOpen] = useState(false);
  const [paymentModal, setPaymentModal] = useState(false);
  const [paymentForm, setPaymentForm] = useState({ amount: '', method: 'cash', reference: '' });
  const [savingPayment, setSavingPayment] = useState(false);
  const [timeModal, setTimeModal] = useState<TechEntry | null>(null);
  const [timeForm, setTimeForm] = useState({ enroute: '', onsite: '', completed: '' });
  const [savingTime, setSavingTime] = useState(false);
  const [editingCost, setEditingCost] = useState<string | null>(null);
  const [costInput, setCostInput] = useState('');

  useEffect(() => { loadAccountingData(); }, [wo.id]);

  async function loadAccountingData() {
    setLoading(true);
    const [invRes, txRes, techRes] = await Promise.all([
      supabase
        .from('invoices')
        .select('id, invoice_number, status, invoice_date, due_date, subtotal, tax, total, amount_paid, balance_due')
        .eq('work_order_id', wo.id)
        .order('invoice_date', { ascending: false }),
      supabase
        .from('transactions')
        .select('id, transaction_number, transaction_type, payment_method, amount, transaction_date, reference_number, invoice_id')
        .eq('company_id', wo.company_id)
        .order('transaction_date', { ascending: false })
        .limit(100),
      supabase
        .from('work_order_technicians')
        .select('id, employee_id, is_lead, status, scheduled_date, enroute_at, onsite_at, completed_at, work_started_at, total_paused_minutes, employees(first_name, last_name)')
        .eq('work_order_id', wo.id)
        .order('scheduled_date', { ascending: true }),
    ]);
    const invoiceData = (invRes.data || []) as Invoice[];
    setInvoices(invoiceData);

    const invoiceIds = new Set(invoiceData.map(i => i.id));
    const relevantTx = (txRes.data || []).filter((t: any) => t.invoice_id && invoiceIds.has(t.invoice_id)) as Transaction[];
    setTransactions(relevantTx);

    setTechEntries(
      (techRes.data || []).map((t: any) => ({
        id: t.id,
        employee_id: t.employee_id,
        first_name: t.employees?.first_name || '',
        last_name: t.employees?.last_name || '',
        is_lead: t.is_lead,
        status: t.status || 'assigned',
        scheduled_date: t.scheduled_date,
        enroute_at: t.enroute_at,
        onsite_at: t.onsite_at,
        completed_at: t.completed_at,
        work_started_at: t.work_started_at,
        total_paused_minutes: t.total_paused_minutes || 0,
      }))
    );
    setLoading(false);
  }

  async function recordPayment() {
    if (!paymentForm.amount) return;
    setSavingPayment(true);
    const amount = parseFloat(paymentForm.amount);
    await supabase
      .from('work_orders')
      .update({
        payment_collected: (wo.payment_collected || 0) + amount,
        payment_method: paymentForm.method,
        updated_at: new Date().toISOString(),
      })
      .eq('id', wo.id);
    setPaymentForm({ amount: '', method: 'cash', reference: '' });
    setPaymentModal(false);
    setSavingPayment(false);
    onPaymentRecorded();
  }

  function openTimeEdit(tech: TechEntry) {
    setTimeModal(tech);
    setTimeForm({
      enroute: tech.enroute_at ? new Date(tech.enroute_at).toISOString().slice(0, 16) : '',
      onsite: tech.onsite_at ? new Date(tech.onsite_at).toISOString().slice(0, 16) : '',
      completed: tech.completed_at ? new Date(tech.completed_at).toISOString().slice(0, 16) : '',
    });
  }

  async function saveTimeEdit() {
    if (!timeModal) return;
    setSavingTime(true);
    const update: Record<string, any> = {};
    if (timeForm.enroute) update.enroute_at = new Date(timeForm.enroute).toISOString();
    else update.enroute_at = null;
    if (timeForm.onsite) update.onsite_at = new Date(timeForm.onsite).toISOString();
    else update.onsite_at = null;
    if (timeForm.completed) update.completed_at = new Date(timeForm.completed).toISOString();
    else update.completed_at = null;
    await supabase.from('work_order_technicians').update(update).eq('id', timeModal.id);
    setSavingTime(false);
    setTimeModal(null);
    loadAccountingData();
  }

  async function saveCostPrice(itemId: string) {
    const val = parseFloat(costInput);
    if (isNaN(val)) { setEditingCost(null); return; }
    await supabase.from('work_order_line_items').update({ cost_price: val }).eq('id', itemId);
    setEditingCost(null);
    onLineItemsChanged();
  }

  const revenue = Number(wo.total_revenue) || 0;
  const laborCost = Number(wo.total_labor_cost) || 0;
  const partsCost = Number(wo.total_parts_cost) || 0;
  const travelFee = Number(wo.travel_fee) || 0;
  const profit = Number(wo.profit_amount) || 0;
  const margin = Number(wo.profit_margin_pct) || 0;
  const totalInvoiced = invoices.reduce((s, i) => s + Number(i.total), 0);
  const totalPaid = invoices.reduce((s, i) => s + Number(i.amount_paid), 0);
  const totalBalanceDue = invoices.reduce((s, i) => s + Number(i.balance_due), 0);
  const onSiteCollected = Number(wo.payment_collected) || 0;

  const partItems = lineItems.filter(li => li.line_type === 'part' || li.line_type === 'material');
  const partsTotalSell = partItems.reduce((s, li) => s + Number(li.total_price), 0);
  const partsTotalCost = partItems.reduce((s, li) => s + (li.cost_price != null ? Number(li.cost_price) * Number(li.quantity) : 0), 0);
  const partsMargin = partsTotalSell > 0 ? ((partsTotalSell - partsTotalCost) / partsTotalSell) * 100 : 0;
  const lineItemsTotal = lineItems.reduce((s, li) => s + Number(li.total_price), 0);

  const totalLaborMins = techEntries.reduce((sum, t) => {
    const onsite = diffMinutes(t.onsite_at, t.completed_at);
    return sum + (onsite !== null ? Math.max(0, onsite - (t.total_paused_minutes || 0)) : 0);
  }, 0);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="animate-spin rounded-full h-6 w-6 border-2 border-blue-600 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="space-y-4 max-w-4xl">
      {/* Profitability Overview */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-blue-600" />
            <h3 className="text-sm font-semibold text-gray-900">Profitability</h3>
          </div>
          {profit !== 0 && (
            <span className={`flex items-center gap-1 text-sm font-bold ${profit >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
              {profit >= 0 ? <ArrowUpRight className="h-4 w-4" /> : <ArrowDownRight className="h-4 w-4" />}
              {margin.toFixed(1)}% margin
            </span>
          )}
        </div>
        <div className="p-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="p-4 rounded-xl bg-blue-50 border border-blue-100">
              <p className="text-xs font-semibold text-blue-600 uppercase tracking-wider">Revenue</p>
              <p className="text-xl font-bold text-blue-900 mt-1">{fmt(revenue)}</p>
            </div>
            <div className="p-4 rounded-xl bg-gray-50 border border-gray-100">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Labor Cost</p>
              <p className="text-xl font-bold text-gray-900 mt-1">{fmt(laborCost)}</p>
            </div>
            <div className="p-4 rounded-xl bg-gray-50 border border-gray-100">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Parts Cost</p>
              <p className="text-xl font-bold text-gray-900 mt-1">{fmt(partsCost)}</p>
            </div>
            <div className={`p-4 rounded-xl border ${profit >= 0 ? 'bg-emerald-50 border-emerald-200' : 'bg-red-50 border-red-200'}`}>
              <p className={`text-xs font-semibold uppercase tracking-wider ${profit >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>Profit</p>
              <p className={`text-xl font-bold mt-1 ${profit >= 0 ? 'text-emerald-900' : 'text-red-900'}`}>{fmt(profit)}</p>
            </div>
          </div>

          {revenue > 0 && (
            <div className="mt-5">
              <div className="flex items-center justify-between text-xs text-gray-500 mb-1.5">
                <span>Cost breakdown</span>
                <span>Revenue: {fmt(revenue)}</span>
              </div>
              <div className="h-3 rounded-full bg-gray-100 overflow-hidden flex">
                {laborCost > 0 && <div className="h-full bg-blue-400" style={{ width: `${Math.min((laborCost / revenue) * 100, 100)}%` }} />}
                {partsCost > 0 && <div className="h-full bg-teal-400" style={{ width: `${Math.min((partsCost / revenue) * 100, 100)}%` }} />}
                {travelFee > 0 && <div className="h-full bg-amber-400" style={{ width: `${Math.min((travelFee / revenue) * 100, 100)}%` }} />}
                {profit > 0 && <div className="h-full bg-emerald-400" style={{ width: `${(profit / revenue) * 100}%` }} />}
              </div>
              <div className="flex items-center gap-4 mt-2 flex-wrap">
                <span className="flex items-center gap-1.5 text-xs text-gray-500"><span className="w-2.5 h-2.5 rounded-sm bg-blue-400" /> Labor</span>
                <span className="flex items-center gap-1.5 text-xs text-gray-500"><span className="w-2.5 h-2.5 rounded-sm bg-teal-400" /> Parts</span>
                {travelFee > 0 && <span className="flex items-center gap-1.5 text-xs text-gray-500"><span className="w-2.5 h-2.5 rounded-sm bg-amber-400" /> Travel</span>}
                <span className="flex items-center gap-1.5 text-xs text-gray-500"><span className="w-2.5 h-2.5 rounded-sm bg-emerald-400" /> Profit</span>
              </div>
            </div>
          )}

          {revenue === 0 && laborCost === 0 && partsCost === 0 && (
            <p className="text-sm text-gray-400 mt-4 text-center">No profitability data recorded yet.</p>
          )}
        </div>
      </div>

      {/* Labor Breakdown (collapsible) */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <button
          onClick={() => setLaborOpen(!laborOpen)}
          className="w-full px-6 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
        >
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-50 rounded-lg"><Users className="h-4 w-4 text-blue-600" /></div>
            <div className="text-left">
              <h3 className="text-sm font-semibold text-gray-900">Labor Breakdown</h3>
              <p className="text-xs text-gray-500">
                {techEntries.length} technician{techEntries.length !== 1 ? 's' : ''}
                {totalLaborMins > 0 && ` \u00b7 ${fmtDuration(totalLaborMins)} on-site`}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm font-bold text-gray-700">{fmt(laborCost)}</span>
            {laborOpen ? <ChevronDown className="h-4 w-4 text-gray-400" /> : <ChevronRight className="h-4 w-4 text-gray-400" />}
          </div>
        </button>

        {laborOpen && (
          <div className="border-t border-gray-100">
            {techEntries.length === 0 ? (
              <div className="py-6 text-center text-sm text-gray-400">No technicians assigned</div>
            ) : (
              <div className="divide-y divide-gray-50">
                {techEntries.map(tech => {
                  const driveMin = diffMinutes(tech.enroute_at, tech.onsite_at);
                  const onsiteMin = diffMinutes(tech.onsite_at, tech.completed_at);
                  const workMin = onsiteMin !== null ? Math.max(0, onsiteMin - (tech.total_paused_minutes || 0)) : null;
                  return (
                    <div key={tech.id} className="px-5 py-2.5 flex items-center gap-3">
                      <div className="w-7 h-7 rounded-full bg-blue-100 flex items-center justify-center text-[10px] font-bold text-blue-700 flex-shrink-0">
                        {tech.first_name[0]}{tech.last_name[0]}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-semibold text-gray-900 truncate">{tech.first_name} {tech.last_name}</span>
                          {tech.is_lead && <span className="text-[10px] font-bold text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded flex-shrink-0">LEAD</span>}
                          <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold uppercase flex-shrink-0 ${
                            tech.status === 'completed' ? 'bg-emerald-100 text-emerald-700' :
                            tech.status === 'onsite' ? 'bg-blue-100 text-blue-700' :
                            tech.status === 'enroute' ? 'bg-amber-100 text-amber-700' :
                            'bg-gray-100 text-gray-500'
                          }`}>{tech.status}</span>
                          {tech.scheduled_date && <span className="text-[11px] text-gray-400 flex-shrink-0">{fmtDate(tech.scheduled_date)}</span>}
                        </div>
                        <div className="flex items-center gap-1 mt-0.5 text-xs text-gray-500">
                          <Truck className="h-3 w-3 text-amber-500" />
                          <span className={tech.enroute_at ? 'text-gray-700 font-medium' : 'text-gray-300'}>{fmtTime(tech.enroute_at)}</span>
                          <span className="text-gray-300 mx-0.5">&rarr;</span>
                          <MapPin className="h-3 w-3 text-blue-500" />
                          <span className={tech.onsite_at ? 'text-gray-700 font-medium' : 'text-gray-300'}>{fmtTime(tech.onsite_at)}</span>
                          <span className="text-gray-300 mx-0.5">&rarr;</span>
                          <CheckCircle className="h-3 w-3 text-emerald-500" />
                          <span className={tech.completed_at ? 'text-gray-700 font-medium' : 'text-gray-300'}>{fmtTime(tech.completed_at)}</span>
                          {(driveMin !== null || workMin !== null) && (
                            <span className="ml-2 text-gray-400">
                              {driveMin !== null && <span>drive {fmtDuration(driveMin)}</span>}
                              {driveMin !== null && workMin !== null && <span> / </span>}
                              {workMin !== null && <span className="font-semibold text-gray-600">on-site {fmtDuration(workMin)}</span>}
                            </span>
                          )}
                        </div>
                      </div>
                      <button
                        onClick={() => openTimeEdit(tech)}
                        className="text-[11px] font-medium text-blue-600 hover:text-blue-800 px-2 py-1 rounded hover:bg-blue-50 transition-colors flex-shrink-0"
                      >
                        Edit
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Parts Breakdown (collapsible) */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <button
          onClick={() => setPartsOpen(!partsOpen)}
          className="w-full px-6 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
        >
          <div className="flex items-center gap-3">
            <div className="p-2 bg-teal-50 rounded-lg"><Package className="h-4 w-4 text-teal-600" /></div>
            <div className="text-left">
              <h3 className="text-sm font-semibold text-gray-900">Parts &amp; Materials</h3>
              <p className="text-xs text-gray-500">
                {partItems.length} item{partItems.length !== 1 ? 's' : ''}
                {partsTotalCost > 0 && ` \u00b7 ${partsMargin.toFixed(0)}% margin`}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-right">
              <p className="text-sm font-bold text-gray-700">{fmt(partsTotalSell)}</p>
              {partsTotalCost > 0 && <p className="text-[10px] text-gray-400">cost {fmt(partsTotalCost)}</p>}
            </div>
            {partsOpen ? <ChevronDown className="h-4 w-4 text-gray-400" /> : <ChevronRight className="h-4 w-4 text-gray-400" />}
          </div>
        </button>

        {partsOpen && (
          <div className="border-t border-gray-100">
            {partItems.length === 0 ? (
              <div className="py-8 text-center text-sm text-gray-400">No parts or materials on this work order</div>
            ) : (
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-100">
                  <tr>
                    <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase">Item</th>
                    <th className="px-4 py-2.5 text-center text-xs font-semibold text-gray-500 uppercase">Qty</th>
                    <th className="px-4 py-2.5 text-right text-xs font-semibold text-gray-500 uppercase">Cost Each</th>
                    <th className="px-4 py-2.5 text-right text-xs font-semibold text-gray-500 uppercase">Sell Each</th>
                    <th className="px-4 py-2.5 text-right text-xs font-semibold text-gray-500 uppercase">Total Sell</th>
                    <th className="px-4 py-2.5 text-right text-xs font-semibold text-gray-500 uppercase">Margin</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {partItems.map(item => {
                    const costEach = item.cost_price != null ? Number(item.cost_price) : null;
                    const sellEach = Number(item.unit_price);
                    const totalSell = Number(item.total_price);
                    const totalCost = costEach !== null ? costEach * Number(item.quantity) : null;
                    const itemMargin = costEach !== null && sellEach > 0 ? ((sellEach - costEach) / sellEach) * 100 : null;
                    return (
                      <tr key={item.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3">
                          <p className="font-medium text-gray-900">{item.description}</p>
                          <p className="text-xs text-gray-400 capitalize">{item.line_type}</p>
                        </td>
                        <td className="px-4 py-3 text-center text-gray-700">{item.quantity}</td>
                        <td className="px-4 py-3 text-right">
                          {editingCost === item.id ? (
                            <div className="flex items-center justify-end gap-1">
                              <span className="text-gray-400 text-xs">$</span>
                              <input
                                type="number"
                                step="0.01"
                                value={costInput}
                                onChange={e => setCostInput(e.target.value)}
                                onKeyDown={e => { if (e.key === 'Enter') saveCostPrice(item.id); if (e.key === 'Escape') setEditingCost(null); }}
                                className="w-20 text-right text-sm border border-blue-300 rounded px-1.5 py-0.5 focus:outline-none focus:ring-1 focus:ring-blue-500"
                                autoFocus
                              />
                              <button onClick={() => saveCostPrice(item.id)} className="p-0.5 text-blue-600 hover:text-blue-800">
                                <Save className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={() => { setEditingCost(item.id); setCostInput(costEach !== null ? String(costEach) : ''); }}
                              className={`text-sm ${costEach !== null ? 'text-gray-700' : 'text-gray-300 italic'} hover:text-blue-600 transition-colors`}
                              title="Click to set cost price"
                            >
                              {costEach !== null ? fmt(costEach) : 'set cost'}
                            </button>
                          )}
                        </td>
                        <td className="px-4 py-3 text-right text-gray-700">{fmt(sellEach)}</td>
                        <td className="px-4 py-3 text-right font-medium text-gray-900">{fmt(totalSell)}</td>
                        <td className="px-4 py-3 text-right">
                          {itemMargin !== null ? (
                            <span className={`text-xs font-bold ${itemMargin >= 20 ? 'text-emerald-600' : itemMargin >= 0 ? 'text-amber-600' : 'text-red-600'}`}>
                              {itemMargin.toFixed(0)}%
                            </span>
                          ) : (
                            <span className="text-xs text-gray-300">—</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                {partsTotalCost > 0 && (
                  <tfoot className="border-t-2 border-gray-200 bg-gray-50">
                    <tr>
                      <td className="px-4 py-2.5 text-xs font-bold text-gray-600" colSpan={2}>Totals</td>
                      <td className="px-4 py-2.5 text-right text-xs font-bold text-gray-600">{fmt(partsTotalCost)}</td>
                      <td className="px-4 py-2.5" />
                      <td className="px-4 py-2.5 text-right text-xs font-bold text-gray-900">{fmt(partsTotalSell)}</td>
                      <td className="px-4 py-2.5 text-right">
                        <span className={`text-xs font-bold ${partsMargin >= 20 ? 'text-emerald-600' : partsMargin >= 0 ? 'text-amber-600' : 'text-red-600'}`}>
                          {partsMargin.toFixed(0)}%
                        </span>
                      </td>
                    </tr>
                  </tfoot>
                )}
              </table>
            )}
          </div>
        )}
      </div>

      {/* Billing Summary */}
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <h3 className="text-sm font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <Receipt className="h-4 w-4 text-gray-500" />
          Billing Summary
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-y-3 gap-x-6">
          <div className="flex justify-between text-sm">
            <span className="text-gray-500">Type</span>
            <span className={`font-medium ${wo.billing_type === 'not_billable' ? 'text-gray-400' : 'text-gray-900'}`}>
              {wo.billing_type === 'not_billable' ? 'Not Billable' : wo.billing_type === 'hourly' ? 'Hourly' : 'Fixed Price'}
            </span>
          </div>
          {wo.billing_type === 'hourly' && Number(wo.billing_rate) > 0 && (
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Rate</span>
              <span className="font-medium text-gray-900">${wo.billing_rate}/hr</span>
            </div>
          )}
          {wo.billing_type === 'fixed' && Number(wo.fixed_amount) > 0 && (
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Fixed Price</span>
              <span className="font-medium text-gray-900">{fmt(wo.fixed_amount)}</span>
            </div>
          )}
          {travelFee > 0 && (
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Travel Fee</span>
              <span className="font-medium text-gray-900">{fmt(travelFee)}</span>
            </div>
          )}
          <div className="flex justify-between text-sm">
            <span className="text-gray-500">Line Items</span>
            <span className="font-medium text-gray-900">{fmt(lineItemsTotal)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-500">Billing Status</span>
            <span className={`text-xs font-semibold px-2 py-0.5 rounded-full capitalize ${
              wo.billing_status === 'paid' ? 'bg-emerald-100 text-emerald-700' :
              wo.billing_status === 'invoiced' ? 'bg-blue-100 text-blue-700' :
              'bg-gray-100 text-gray-500'
            }`}>{wo.billing_status}</span>
          </div>
        </div>
      </div>

      {/* Invoices */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FileText className="h-4 w-4 text-blue-600" />
            <h3 className="text-sm font-semibold text-gray-900">Invoices ({invoices.length})</h3>
          </div>
          {invoices.length > 0 && (
            <div className="flex items-center gap-4 text-xs">
              <span className="text-gray-500">Invoiced: <span className="font-semibold text-gray-900">{fmt(totalInvoiced)}</span></span>
              <span className="text-gray-500">Paid: <span className="font-semibold text-emerald-600">{fmt(totalPaid)}</span></span>
              {totalBalanceDue > 0 && <span className="text-gray-500">Due: <span className="font-semibold text-red-600">{fmt(totalBalanceDue)}</span></span>}
            </div>
          )}
        </div>
        {invoices.length === 0 ? (
          <div className="py-10 text-center">
            <FileText className="h-8 w-8 text-gray-300 mx-auto mb-2" />
            <p className="text-sm text-gray-400">No invoices linked to this work order</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Invoice #</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Date</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Due</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Status</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase">Total</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase">Paid</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase">Balance</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {invoices.map(inv => {
                const st = INVOICE_STATUS_STYLES[inv.status] || INVOICE_STATUS_STYLES.draft;
                const isOverdue = inv.due_date && new Date(inv.due_date) < new Date() && Number(inv.balance_due) > 0 && inv.status !== 'paid';
                return (
                  <tr key={inv.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-mono font-semibold text-blue-600">{inv.invoice_number}</td>
                    <td className="px-4 py-3 text-gray-600">{fmtDate(inv.invoice_date)}</td>
                    <td className={`px-4 py-3 ${isOverdue ? 'text-red-600 font-medium' : 'text-gray-600'}`}>
                      {fmtDate(inv.due_date)}
                      {isOverdue && <AlertTriangle className="inline h-3 w-3 ml-1" />}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${st.bg} ${st.text}`}>{st.label}</span>
                    </td>
                    <td className="px-4 py-3 text-right font-medium text-gray-900">{fmt(inv.total)}</td>
                    <td className="px-4 py-3 text-right text-emerald-600">{fmt(inv.amount_paid)}</td>
                    <td className={`px-4 py-3 text-right font-medium ${Number(inv.balance_due) > 0 ? 'text-red-600' : 'text-gray-400'}`}>{fmt(inv.balance_due)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Payment Transactions */}
      {transactions.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100">
            <div className="flex items-center gap-2">
              <CreditCard className="h-4 w-4 text-emerald-600" />
              <h3 className="text-sm font-semibold text-gray-900">Payment Transactions ({transactions.length})</h3>
            </div>
          </div>
          <div className="divide-y divide-gray-100">
            {transactions.map(tx => (
              <div key={tx.id} className="px-6 py-3 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${tx.transaction_type === 'payment' ? 'bg-emerald-100' : 'bg-amber-100'}`}>
                    {tx.transaction_type === 'payment' ? <ArrowUpRight className="h-4 w-4 text-emerald-600" /> : <Minus className="h-4 w-4 text-amber-600" />}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">{tx.transaction_number}</p>
                    <p className="text-xs text-gray-500 capitalize">{tx.payment_method}{tx.reference_number && ` \u00b7 Ref: ${tx.reference_number}`}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className={`text-sm font-semibold ${tx.transaction_type === 'payment' ? 'text-emerald-600' : 'text-gray-700'}`}>{fmt(tx.amount)}</p>
                  <p className="text-xs text-gray-400">{fmtDate(tx.transaction_date)}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* On-Site Payment */}
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
            <DollarSign className="h-4 w-4 text-emerald-600" />
            On-Site Collection
          </h3>
          {onSiteCollected > 0 && <span className="text-sm font-bold text-emerald-600">{fmt(onSiteCollected)}</span>}
        </div>
        <div className="flex items-center gap-4">
          <p className="text-sm text-gray-600 flex-1">
            {onSiteCollected > 0 ? `${fmt(onSiteCollected)} collected on-site via ${wo.payment_method || 'cash'}` : 'No on-site payment collected yet'}
          </p>
          {wo.billing_type !== 'not_billable' && (
            <button onClick={() => setPaymentModal(true)} className="flex items-center gap-2 px-4 py-2.5 text-sm font-semibold text-white bg-emerald-600 rounded-lg hover:bg-emerald-700 transition-colors">
              <Plus className="h-4 w-4" /> Record Payment
            </button>
          )}
        </div>
      </div>

      {/* Payment Modal */}
      {paymentModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/40" onClick={() => setPaymentModal(false)} />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-lg font-semibold text-gray-900">Record Payment</h3>
              <button onClick={() => setPaymentModal(false)} className="p-1 hover:bg-gray-100 rounded-lg"><XIcon className="h-5 w-5 text-gray-500" /></button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Amount</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">$</span>
                  <input type="number" step="0.01" min="0" value={paymentForm.amount} onChange={e => setPaymentForm(p => ({ ...p, amount: e.target.value }))} className="w-full pl-7 pr-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" autoFocus />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Payment Method</label>
                <div className="grid grid-cols-4 gap-2">
                  {['cash', 'check', 'card', 'other'].map(method => (
                    <button key={method} onClick={() => setPaymentForm(p => ({ ...p, method }))} className={`py-2 text-sm font-medium rounded-lg capitalize transition-all border-2 ${paymentForm.method === method ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-gray-200 text-gray-600 hover:border-gray-300'}`}>{method}</button>
                  ))}
                </div>
              </div>
              {paymentForm.method !== 'cash' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Reference #</label>
                  <input type="text" value={paymentForm.reference} onChange={e => setPaymentForm(p => ({ ...p, reference: e.target.value }))} placeholder="Check #, transaction ID..." className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
              )}
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={() => setPaymentModal(false)} className="flex-1 px-4 py-2.5 text-sm font-medium text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50">Cancel</button>
              <button onClick={recordPayment} disabled={savingPayment || !paymentForm.amount} className="flex-1 px-4 py-2.5 text-sm font-medium text-white bg-emerald-600 rounded-lg hover:bg-emerald-700 disabled:opacity-60">{savingPayment ? 'Saving...' : 'Record Payment'}</button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Times Modal */}
      {timeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/40" onClick={() => setTimeModal(null)} />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-5">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Edit Times</h3>
                <p className="text-sm text-gray-500">{timeModal.first_name} {timeModal.last_name}</p>
              </div>
              <button onClick={() => setTimeModal(null)} className="p-1 hover:bg-gray-100 rounded-lg"><XIcon className="h-5 w-5 text-gray-500" /></button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5 flex items-center gap-1.5">
                  <Truck className="h-4 w-4 text-amber-500" /> Drive Start
                </label>
                <input type="datetime-local" value={timeForm.enroute} onChange={e => setTimeForm(p => ({ ...p, enroute: e.target.value }))} className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5 flex items-center gap-1.5">
                  <MapPin className="h-4 w-4 text-blue-500" /> On-Site Arrival
                </label>
                <input type="datetime-local" value={timeForm.onsite} onChange={e => setTimeForm(p => ({ ...p, onsite: e.target.value }))} className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5 flex items-center gap-1.5">
                  <CheckCircle className="h-4 w-4 text-emerald-500" /> Completed
                </label>
                <input type="datetime-local" value={timeForm.completed} onChange={e => setTimeForm(p => ({ ...p, completed: e.target.value }))} className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={() => setTimeModal(null)} className="flex-1 px-4 py-2.5 text-sm font-medium text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50">Cancel</button>
              <button onClick={saveTimeEdit} disabled={savingTime} className="flex-1 px-4 py-2.5 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-60">{savingTime ? 'Saving...' : 'Save Times'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
