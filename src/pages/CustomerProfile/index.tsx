import { useState, useEffect } from 'react';
import { ArrowLeft, Star, Phone, Mail, MapPin, Globe, CreditCard as Edit, Wrench, FileText, Plus, Building2, Home, AlertTriangle, Pencil, Check, X, ShieldAlert, Network, ChevronRight, CheckCircle2, CircleDashed, XCircle, MinusCircle } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { QB_SYNC_LABELS, QB_SYNC_STYLES, formatLastSynced, type QbSyncStatus } from '../../lib/quickbooks';
import type {
  Company, Site, Contact, CustomerSystem, SystemZone, SystemDevice,
  Invoice, Estimate, Transaction, Credit, WorkOrder, CustomerNote, CallLog, CustomerEmail, SmsMessage
} from './types';
import EditCustomerModal from './EditCustomerModal';
import OverviewTab from './OverviewTab';
import SitesSystemsTab from './SitesSystemsTab';
import AccountingTab from './AccountingTab';
import WorkOrdersTab from './WorkOrdersTab';
import ContactsTab from './ContactsTab';
import CommunicationsTab from './CommunicationsTab';
import SubCustomersTab from './SubCustomersTab';
import PhotoGallery from '../Photos/PhotoGallery';
import DocumentGallery from '../Documents/DocumentGallery';

interface Props {
  customerId: string | null;
  onBack: () => void;
  onViewCustomer: (id: string) => void;
}

interface ParentSummary {
  id: string;
  name: string;
  account_number: string | null;
}

interface SubCustomerSummary {
  id: string;
  name: string;
  bill_with_parent: boolean;
  total_revenue: number;
  outstanding_balance: number;
  past_due_amount: number;
}

const tagColor = (tag: string) => {
  if (tag === 'Past Due') return 'bg-red-100 text-red-700';
  if (tag === 'Priority') return 'bg-orange-100 text-orange-700';
  if (tag === 'Large Account') return 'bg-blue-100 text-blue-700';
  return 'bg-gray-100 text-gray-600';
};

export default function CustomerProfile({ customerId, onBack, onViewCustomer }: Props) {
  const [activeTab, setActiveTab] = useState('overview');
  const [loading, setLoading] = useState(true);

  const [company, setCompany] = useState<Company | null>(null);
  const [sites, setSites] = useState<Site[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [systems, setSystems] = useState<CustomerSystem[]>([]);
  const [zones, setZones] = useState<SystemZone[]>([]);
  const [devices, setDevices] = useState<SystemDevice[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [estimates, setEstimates] = useState<Estimate[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [credits, setCredits] = useState<Credit[]>([]);
  const [workOrders, setWorkOrders] = useState<WorkOrder[]>([]);
  const [notes, setNotes] = useState<CustomerNote[]>([]);
  const [callLogs, setCallLogs] = useState<CallLog[]>([]);
  const [emails, setEmails] = useState<CustomerEmail[]>([]);
  const [smsMessages, setSmsMessages] = useState<SmsMessage[]>([]);
  const [editingCriticalNotes, setEditingCriticalNotes] = useState(false);
  const [criticalNotesText, setCriticalNotesText] = useState('');
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingTroubleNotes, setEditingTroubleNotes] = useState(false);
  const [troubleNotesText, setTroubleNotesText] = useState('');
  const [savingTrouble, setSavingTrouble] = useState(false);
  const [parent, setParent] = useState<ParentSummary | null>(null);
  const [subCustomers, setSubCustomers] = useState<SubCustomerSummary[]>([]);

  const baseTabs = [
    { id: 'overview', label: 'Overview' },
    { id: 'sites-systems', label: 'Sites & Systems' },
    { id: 'accounting', label: 'Accounting' },
    { id: 'work-orders', label: 'Work Orders' },
    { id: 'contacts', label: 'Contacts' },
    { id: 'communications', label: 'Communications' },
    { id: 'photos', label: 'Photos' },
    { id: 'documents', label: 'Documents' },
  ];
  const canHaveSubs = !!company && !company.parent_company_id;
  const TABS = canHaveSubs
    ? [baseTabs[0], { id: 'sub-customers', label: 'Sub-customers' }, ...baseTabs.slice(1)]
    : baseTabs;

  useEffect(() => {
    if (customerId) loadAll(customerId);
  }, [customerId]);

  async function loadAll(id: string) {
    setLoading(true);

    const [
      companyRes, sitesRes, contactsRes, systemsRes,
      invoicesRes, estimatesRes, transactionsRes, creditsRes,
      workOrdersRes, notesRes, callLogsRes, emailsRes, smsRes
    ] = await Promise.all([
      supabase.from('companies').select('*').eq('id', id).maybeSingle(),
      supabase.from('sites').select('*').eq('company_id', id).order('name'),
      supabase.from('contacts').select('*').eq('company_id', id).order('is_primary', { ascending: false }),
      supabase.from('customer_systems').select('*, system_types(id, name, icon_name, color)').eq('company_id', id),
      supabase.from('invoices').select('*').eq('company_id', id).order('invoice_date', { ascending: false }),
      supabase.from('estimates').select('*').eq('company_id', id).order('estimate_date', { ascending: false }),
      supabase.from('transactions').select('*').eq('company_id', id).order('transaction_date', { ascending: false }),
      supabase.from('customer_credits').select('*').eq('company_id', id).order('issued_date', { ascending: false }),
      supabase.from('work_orders').select('*').eq('company_id', id).order('scheduled_date', { ascending: false }),
      supabase.from('customer_notes').select('*').eq('company_id', id).order('created_at', { ascending: false }),
      supabase.from('call_logs').select('*').eq('company_id', id).order('call_date', { ascending: false }),
      supabase.from('customer_emails').select('*').eq('company_id', id).order('email_date', { ascending: false }),
      supabase.from('sms_messages').select('*').eq('company_id', id).order('sent_at', { ascending: false }),
    ]);

    if (companyRes.data) {
      setCompany(companyRes.data);
      setCriticalNotesText(companyRes.data.critical_notes || '');
      setTroubleNotesText((companyRes.data as any).trouble_notes || '');

      const [parentRes, subsRes] = await Promise.all([
        companyRes.data.parent_company_id
          ? supabase.from('companies').select('id, name, account_number').eq('id', companyRes.data.parent_company_id).maybeSingle()
          : Promise.resolve({ data: null }),
        supabase.from('companies')
          .select('id, name, bill_with_parent, total_revenue, outstanding_balance, past_due_amount')
          .eq('parent_company_id', id),
      ]);
      setParent(parentRes.data as ParentSummary | null);
      setSubCustomers((subsRes.data as SubCustomerSummary[]) || []);
    } else {
      setParent(null);
      setSubCustomers([]);
    }
    if (sitesRes.data) setSites(sitesRes.data);
    if (contactsRes.data) setContacts(contactsRes.data);

    const systemsData = (systemsRes.data || []) as CustomerSystem[];
    setSystems(systemsData);

    if (systemsData.length > 0) {
      const systemIds = systemsData.map(s => s.id);
      const [zonesRes, devicesRes] = await Promise.all([
        supabase.from('system_zones').select('*').in('system_id', systemIds).order('zone_number'),
        supabase.from('system_devices').select('*').in('system_id', systemIds),
      ]);
      if (zonesRes.data) setZones(zonesRes.data);
      if (devicesRes.data) setDevices(devicesRes.data);
    }

    if (invoicesRes.data) setInvoices(invoicesRes.data);
    if (estimatesRes.data) setEstimates(estimatesRes.data);
    if (transactionsRes.data) setTransactions(transactionsRes.data);
    if (creditsRes.data) setCredits(creditsRes.data);
    if (workOrdersRes.data) setWorkOrders(workOrdersRes.data);
    if (notesRes.data) setNotes(notesRes.data);
    if (callLogsRes.data) setCallLogs(callLogsRes.data);
    if (emailsRes.data) setEmails(emailsRes.data);
    if (smsRes.data) setSmsMessages(smsRes.data);

    setLoading(false);
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Loading customer profile...</div>
      </div>
    );
  }

  if (!company) {
    return (
      <div className="p-6 text-center text-gray-500">Customer not found.</div>
    );
  }

  const isCommercial = company.customer_type === 'commercial';

  const tabBadge = (tabId: string): number | null => {
    if (tabId === 'work-orders') {
      const open = workOrders.filter(w => !['completed', 'cancelled'].includes(w.status)).length;
      return open > 0 ? open : null;
    }
    if (tabId === 'accounting') {
      const overdue = invoices.filter(i => i.status === 'overdue').length;
      return overdue > 0 ? overdue : null;
    }
    if (tabId === 'communications') {
      const unreadEmails = emails.filter(e => !e.is_read && e.direction === 'inbound').length;
      const unreadSms = smsMessages.filter(s => !s.is_read && s.direction === 'inbound').length;
      const total = unreadEmails + unreadSms;
      return total > 0 ? total : null;
    }
    if (tabId === 'sub-customers') {
      return subCustomers.length > 0 ? subCustomers.length : null;
    }
    return null;
  };

  async function saveCriticalNotes() {
    if (!company) return;
    await supabase.from('companies').update({ critical_notes: criticalNotesText }).eq('id', company.id);
    setCompany(c => c ? { ...c, critical_notes: criticalNotesText } : c);
    setEditingCriticalNotes(false);
  }

  async function toggleTroubleCustomer() {
    if (!company) return;
    setSavingTrouble(true);
    const newVal = !(company as any).is_trouble_customer;
    const update: Record<string, any> = {
      is_trouble_customer: newVal,
      trouble_flagged_at: newVal ? new Date().toISOString() : null,
    };
    if (!newVal) update.trouble_notes = null;
    await supabase.from('companies').update(update).eq('id', company.id);
    setCompany(c => c ? { ...c, ...update } : c);
    if (!newVal) setTroubleNotesText('');
    setSavingTrouble(false);
  }

  async function saveTroubleNotes() {
    if (!company) return;
    await supabase.from('companies').update({ trouble_notes: troubleNotesText }).eq('id', company.id);
    setCompany(c => c ? { ...c, trouble_notes: troubleNotesText } as any : c);
    setEditingTroubleNotes(false);
  }

  return (
    <div className="min-h-full bg-gray-50">
      <div className="bg-white border-b border-gray-200">
        <div className="px-6 pt-4 pb-0">
          <div className="flex items-center gap-3 mb-4">
            <button
              onClick={onBack}
              className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800 transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Customers
            </button>
            {parent && (
              <>
                <span className="text-gray-300">|</span>
                <nav className="flex items-center gap-1 text-sm">
                  <button
                    onClick={() => onViewCustomer(parent.id)}
                    className="flex items-center gap-1 text-blue-600 hover:text-blue-800 font-medium transition-colors"
                  >
                    <Network className="h-3.5 w-3.5" />
                    {parent.name}
                  </button>
                  <ChevronRight className="h-3.5 w-3.5 text-gray-400" />
                  <span className="text-gray-500">{company.name}</span>
                </nav>
              </>
            )}
          </div>

          <div className="flex items-start justify-between gap-4 mb-5">
            <div className="flex items-start gap-4">
              <div className={`w-14 h-14 rounded-xl flex items-center justify-center flex-shrink-0 ${
                isCommercial ? 'bg-blue-100' : 'bg-green-100'
              }`}>
                {isCommercial
                  ? <Building2 className="h-7 w-7 text-blue-600" />
                  : <Home className="h-7 w-7 text-green-600" />
                }
              </div>
              <div>
                <div className="flex items-center gap-3 flex-wrap">
                  <h1 className="text-2xl font-bold text-gray-900">{company.name}</h1>
                  {subCustomers.length > 0 && (
                    <div className="flex items-center gap-1 px-2.5 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-semibold">
                      <Network className="h-3.5 w-3.5" />
                      Master · {subCustomers.length}
                    </div>
                  )}
                  {parent && (
                    <div className="flex items-center gap-1 px-2.5 py-1 bg-slate-100 text-slate-700 rounded-full text-xs font-semibold">
                      Sub-customer
                    </div>
                  )}
                  {parent && company.bill_with_parent && (
                    <div className="px-2.5 py-1 bg-emerald-100 text-emerald-700 rounded-full text-xs font-semibold">
                      Billed to parent
                    </div>
                  )}
                  {company.is_vip && (
                    <div className="flex items-center gap-1 px-2.5 py-1 bg-yellow-100 text-yellow-700 rounded-full text-xs font-semibold">
                      <Star className="h-3.5 w-3.5 fill-yellow-500 text-yellow-500" />
                      VIP
                    </div>
                  )}
                  {(company as any).is_trouble_customer && (
                    <div className="flex items-center gap-1 px-2.5 py-1 bg-red-100 text-red-700 rounded-full text-xs font-semibold">
                      <ShieldAlert className="h-3.5 w-3.5" />
                      Trouble Customer
                    </div>
                  )}
                  <span className={`px-2.5 py-1 text-xs font-medium rounded-full capitalize ${
                    company.status === 'active' ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-500'
                  }`}>
                    {company.status}
                  </span>
                  <span className={`px-2.5 py-1 text-xs font-medium rounded-full capitalize ${
                    isCommercial ? 'bg-blue-100 text-blue-700' : 'bg-green-100 text-green-700'
                  }`}>
                    {company.customer_type}
                  </span>
                </div>
                <div className="flex items-center gap-3 mt-1 flex-wrap">
                  {company.account_number && (
                    <span className="text-xs font-mono text-gray-500 bg-gray-100 px-2 py-0.5 rounded">
                      WH: {company.account_number}
                    </span>
                  )}
                  {company.quickbooks_id && (() => {
                    const status = (company.qb_sync_status || 'not_synced') as QbSyncStatus;
                    const s = QB_SYNC_STYLES[status];
                    const Icon = status === 'synced' ? CheckCircle2 : status === 'pending' ? CircleDashed : status === 'error' ? XCircle : MinusCircle;
                    return (
                      <span
                        className={`inline-flex items-center gap-1.5 text-xs font-mono px-2 py-0.5 rounded border ${s.pill}`}
                        title={`QuickBooks: ${QB_SYNC_LABELS[status]}${company.qb_last_synced_at ? ` · ${formatLastSynced(company.qb_last_synced_at)}` : ''}`}
                      >
                        <Icon className={`h-3.5 w-3.5 ${s.iconColor}`} />
                        QB: {company.quickbooks_id}
                      </span>
                    );
                  })()}
                </div>
                <div className="flex items-center gap-4 mt-2 flex-wrap text-sm text-gray-500">
                  {(() => {
                    const phoneList = company.phones?.length ? company.phones : (company.phone ? [{ label: 'Main', number: company.phone }] : []);
                    if (!phoneList.length) return null;
                    return (
                      <>
                        <a href={`tel:${phoneList[0].number}`} className="flex items-center gap-1 hover:text-blue-600 transition-colors">
                          <Phone className="h-4 w-4" />
                          {phoneList[0].number}
                          {phoneList.length > 1 && (
                            <span className="text-xs text-gray-400 ml-0.5">+{phoneList.length - 1}</span>
                          )}
                        </a>
                      </>
                    );
                  })()}
                  {(() => {
                    const emailList = company.company_emails?.length ? company.company_emails : (company.email ? [{ label: 'Primary', address: company.email }] : []);
                    if (!emailList.length) return null;
                    return (
                      <a href={`mailto:${emailList[0].address}`} className="flex items-center gap-1 hover:text-blue-600 transition-colors">
                        <Mail className="h-4 w-4" />
                        {emailList[0].address}
                        {emailList.length > 1 && (
                          <span className="text-xs text-gray-400 ml-0.5">+{emailList.length - 1}</span>
                        )}
                      </a>
                    );
                  })()}
                  {(company.billing_city || company.billing_state) && (
                    <span className="flex items-center gap-1">
                      <MapPin className="h-4 w-4" />
                      {[company.billing_city, company.billing_state].filter(Boolean).join(', ')}
                    </span>
                  )}
                  {company.website && (
                    <a href={company.website} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 hover:text-blue-600 transition-colors">
                      <Globe className="h-4 w-4" />
                      {company.website.replace(/^https?:\/\//, '')}
                    </a>
                  )}
                </div>
                {(company.tags || []).length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mt-3">
                    {(company.tags || []).map((tag, i) => (
                      <span key={i} className={`px-2 py-0.5 text-xs font-medium rounded-full ${tagColor(tag)}`}>
                        {tag}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2 flex-shrink-0">
              <button
                onClick={() => setShowEditModal(true)}
                className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <Edit className="h-4 w-4" />
                Edit
              </button>
              <button className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors">
                <Wrench className="h-4 w-4" />
                New WO
              </button>
              <button className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-white bg-emerald-600 rounded-lg hover:bg-emerald-700 transition-colors">
                <FileText className="h-4 w-4" />
                Invoice
              </button>
              <button className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
                <Plus className="h-4 w-4" />
                More
              </button>
            </div>
          </div>

          {(company.critical_notes || editingCriticalNotes) && (
            <div className="mb-4 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 flex items-start gap-3">
              <AlertTriangle className="h-4 w-4 text-amber-600 flex-shrink-0 mt-0.5" />
              <div className="flex-1 min-w-0">
                <span className="text-xs font-semibold text-amber-700 uppercase tracking-wide">Critical Notes</span>
                {editingCriticalNotes ? (
                  <div className="mt-1.5 flex items-end gap-2">
                    <textarea
                      value={criticalNotesText}
                      onChange={e => setCriticalNotesText(e.target.value)}
                      rows={2}
                      placeholder="Gate code, alarm code, special access instructions..."
                      className="flex-1 border border-amber-300 bg-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 resize-none"
                    />
                    <div className="flex flex-col gap-1 flex-shrink-0">
                      <button onClick={saveCriticalNotes} className="p-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition-colors">
                        <Check className="h-4 w-4" />
                      </button>
                      <button onClick={() => { setEditingCriticalNotes(false); setCriticalNotesText(company.critical_notes || ''); }} className="p-2 bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200 transition-colors">
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-amber-800 font-medium mt-0.5 leading-relaxed">{company.critical_notes}</p>
                )}
              </div>
              {!editingCriticalNotes && (
                <button onClick={() => setEditingCriticalNotes(true)} className="p-1.5 text-amber-500 hover:text-amber-700 hover:bg-amber-100 rounded-lg transition-colors flex-shrink-0">
                  <Pencil className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          )}

          {!company.critical_notes && !editingCriticalNotes && (
            <div className="mb-4">
              <button
                onClick={() => setEditingCriticalNotes(true)}
                className="flex items-center gap-1.5 text-xs text-amber-600 hover:text-amber-800 transition-colors"
              >
                <AlertTriangle className="h-3.5 w-3.5" />
                Add critical notes (gate codes, access info...)
              </button>
            </div>
          )}

          {(company as any).is_trouble_customer && (
            <div className="mb-4 bg-red-50 border border-red-200 rounded-xl px-4 py-3 flex items-start gap-3">
              <ShieldAlert className="h-4 w-4 text-red-600 flex-shrink-0 mt-0.5" />
              <div className="flex-1 min-w-0">
                <span className="text-xs font-semibold text-red-700 uppercase tracking-wide">Trouble Customer</span>
                {editingTroubleNotes ? (
                  <div className="mt-1.5 flex items-end gap-2">
                    <textarea
                      value={troubleNotesText}
                      onChange={e => setTroubleNotesText(e.target.value)}
                      rows={2}
                      placeholder="Describe issues, payment disputes, aggressive behavior..."
                      className="flex-1 border border-red-300 bg-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-400 resize-none"
                    />
                    <div className="flex flex-col gap-1 flex-shrink-0">
                      <button onClick={saveTroubleNotes} className="p-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors">
                        <Check className="h-4 w-4" />
                      </button>
                      <button onClick={() => { setEditingTroubleNotes(false); setTroubleNotesText((company as any).trouble_notes || ''); }} className="p-2 bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200 transition-colors">
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-red-800 font-medium mt-0.5 leading-relaxed">
                    {(company as any).trouble_notes || 'No notes added.'}
                  </p>
                )}
                {(company as any).trouble_flagged_at && (
                  <p className="text-xs text-red-500 mt-1">
                    Flagged {new Date((company as any).trouble_flagged_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                  </p>
                )}
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                {!editingTroubleNotes && (
                  <button onClick={() => setEditingTroubleNotes(true)} className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-100 rounded-lg transition-colors">
                    <Pencil className="h-3.5 w-3.5" />
                  </button>
                )}
                <button
                  onClick={toggleTroubleCustomer}
                  disabled={savingTrouble}
                  className="text-xs px-2 py-1 bg-white border border-red-300 text-red-600 rounded-lg hover:bg-red-50 transition-colors font-medium"
                >
                  Remove Flag
                </button>
              </div>
            </div>
          )}

          {!(company as any).is_trouble_customer && (
            <div className="mb-4">
              <button
                onClick={toggleTroubleCustomer}
                disabled={savingTrouble}
                className="flex items-center gap-1.5 text-xs text-red-500 hover:text-red-700 transition-colors"
              >
                <ShieldAlert className="h-3.5 w-3.5" />
                Flag as trouble customer
              </button>
            </div>
          )}

          <div className="flex gap-0 border-b-0 -mb-px overflow-x-auto">
            {TABS.map(tab => {
              const badge = tabBadge(tab.id);
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 whitespace-nowrap transition-colors ${
                    activeTab === tab.id
                      ? 'border-blue-600 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-800 hover:border-gray-300'
                  }`}
                >
                  {tab.label}
                  {badge !== null && (
                    <span className="bg-red-500 text-white text-xs font-bold rounded-full h-4.5 min-w-[18px] flex items-center justify-center px-1 leading-none py-0.5">
                      {badge}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {showEditModal && company && (
        <EditCustomerModal
          company={company}
          onClose={() => setShowEditModal(false)}
          onSaved={() => loadAll(company.id)}
        />
      )}

      <div className="p-6">
        {activeTab === 'overview' && (
          <OverviewTab
            company={company}
            workOrders={workOrders}
            invoices={invoices}
            notes={notes}
            systemsCount={systems.length}
            sitesCount={sites.length}
            onNavigate={setActiveTab}
          />
        )}
        {activeTab === 'sub-customers' && canHaveSubs && (
          <SubCustomersTab
            parentCompanyId={company.id}
            parentName={company.name}
            onViewCustomer={onViewCustomer}
          />
        )}
        {activeTab === 'sites-systems' && (
          <SitesSystemsTab
            companyName={company.name}
            accountNumber={company.account_number}
            companyStatus={company.status}
            companyId={company.id}
            sites={sites}
            systems={systems}
            zones={zones}
            devices={devices}
          />
        )}
        {activeTab === 'accounting' && (
          <AccountingTab
            estimates={estimates}
            invoices={invoices}
            transactions={transactions}
            credits={credits}
          />
        )}
        {activeTab === 'work-orders' && <WorkOrdersTab companyId={company.id} />}
        {activeTab === 'contacts' && (
          <ContactsTab
            companyId={company.id}
            contacts={contacts}
            callLogs={callLogs}
            emails={emails}
            onRefresh={() => loadAll(company.id)}
          />
        )}
        {activeTab === 'communications' && (
          <CommunicationsTab
            companyId={company.id}
            callLogs={callLogs}
            emails={emails}
            notes={notes}
            smsMessages={smsMessages}
            contacts={contacts}
            onRefresh={() => loadAll(company.id)}
          />
        )}
        {activeTab === 'photos' && (
          <PhotoGallery
            context={{
              companyId: company.id,
              companyName: company.name,
            }}
          />
        )}
        {activeTab === 'documents' && (
          <DocumentGallery
            context={{
              companyId: company.id,
              companyName: company.name,
            }}
          />
        )}
      </div>
    </div>
  );
}
