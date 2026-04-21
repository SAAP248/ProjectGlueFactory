import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../lib/supabase';
import LoginScreen from './LoginScreen';
import PortalHeader from './PortalHeader';
import DashboardTab from './DashboardTab';
import EstimatesTab from './EstimatesTab';
import InvoicesTab from './InvoicesTab';
import PaymentsTab from './PaymentsTab';
import SystemsTab from './SystemsTab';
import WorkOrdersTab from './WorkOrdersTab';
import AttachmentsTab from './AttachmentsTab';
import TicketsTab from './TicketsTab';
import type {
  PortalUser, PortalCompany, PortalInvoice, PortalEstimate,
  PortalPayment, PortalSystem, EmergencyContact, SystemPasscode,
  TestMode, PortalWorkOrder, PortalAttachment, WORequest, PortalTab,
} from './types';

export default function CustomerPortal() {
  const [user, setUser] = useState<PortalUser | null>(null);
  const [company, setCompany] = useState<PortalCompany | null>(null);
  const [activeTab, setActiveTab] = useState<PortalTab>('dashboard');
  const [loading, setLoading] = useState(false);

  const [invoices, setInvoices] = useState<PortalInvoice[]>([]);
  const [estimates, setEstimates] = useState<PortalEstimate[]>([]);
  const [payments, setPayments] = useState<PortalPayment[]>([]);
  const [systems, setSystems] = useState<PortalSystem[]>([]);
  const [emergencyContacts, setEmergencyContacts] = useState<EmergencyContact[]>([]);
  const [passcodes, setPasscodes] = useState<SystemPasscode[]>([]);
  const [testModes, setTestModes] = useState<TestMode[]>([]);
  const [workOrders, setWorkOrders] = useState<PortalWorkOrder[]>([]);
  const [attachments, setAttachments] = useState<PortalAttachment[]>([]);
  const [portalDocs, setPortalDocs] = useState<any[]>([]);
  const [requests, setRequests] = useState<WORequest[]>([]);
  const [sites, setSites] = useState<{ id: string; name: string }[]>([]);

  const loadData = useCallback(async (companyId: string) => {
    setLoading(true);

    const [
      companyRes,
      invoiceRes,
      estimateRes,
      paymentRes,
      systemRes,
      woRes,
      attachRes,
      requestRes,
      docsRes,
      siteRes,
    ] = await Promise.all([
      supabase.from('companies').select('id,name,phone,email,billing_address,billing_city,billing_state,billing_zip,outstanding_balance,past_due_amount').eq('id', companyId).maybeSingle(),
      supabase.from('invoices').select('id,invoice_number,status,invoice_date,due_date,total,amount_paid,balance_due,notes').eq('company_id', companyId).order('invoice_date', { ascending: false }),
      supabase.from('estimates').select('id,estimate_number,status,estimate_date,expiration_date,total,notes').eq('company_id', companyId).order('estimate_date', { ascending: false }),
      supabase.from('portal_payments').select('id,amount,payment_method,reference_number,notes,paid_at,invoice_id,invoices(invoice_number)').eq('company_id', companyId).order('paid_at', { ascending: false }),
      supabase.from('customer_systems').select('id,name,panel_make,panel_model,monitoring_account_number,status,installation_date,notes,site_id,sites(name,address),system_types(name,icon_name,color)').eq('company_id', companyId),
      supabase.from('work_orders').select('id,wo_number,title,status,priority,scheduled_date,work_order_type,description,resolution_notes,created_at,sites(name)').eq('company_id', companyId).order('created_at', { ascending: false }).limit(50),
      supabase.from('work_order_attachments').select('id,file_name,file_type,file_url,file_size_bytes,caption,created_at,work_orders(wo_number,title)').eq('work_orders.company_id', companyId).order('created_at', { ascending: false }),
      supabase.from('portal_wo_requests').select('id,title,description,priority,preferred_date,preferred_time,status,created_at,sites(name)').eq('company_id', companyId).order('created_at', { ascending: false }),
      supabase.from('documents').select('id,file_name,file_type,file_url,file_size_bytes,description,created_at,document_categories(name,color)').eq('company_id', companyId).eq('show_in_portal', true).order('created_at', { ascending: false }),
      supabase.from('sites').select('id,name').eq('company_id', companyId),
    ]);

    if (companyRes.data) setCompany(companyRes.data as any);
    if (invoiceRes.data) setInvoices(invoiceRes.data as any);
    if (estimateRes.data) setEstimates(estimateRes.data as any);
    if (paymentRes.data) setPayments(paymentRes.data as any);
    if (systemRes.data) setSystems(systemRes.data as any);
    if (woRes.data) setWorkOrders(woRes.data as any);
    if (requestRes.data) setRequests(requestRes.data as any);
    if (docsRes.data) setPortalDocs(docsRes.data as any);
    if (siteRes.data) setSites(siteRes.data as any);

    const filteredAttachments = (attachRes.data || []).filter((a: any) => a.work_orders);
    setAttachments(filteredAttachments as any);

    // Load system sub-data if systems exist
    if (systemRes.data && systemRes.data.length > 0) {
      const sysIds = systemRes.data.map((s: any) => s.id);
      const [ecRes, pcRes, tmRes] = await Promise.all([
        supabase.from('portal_emergency_contacts').select('*').in('system_id', sysIds).order('priority_order'),
        supabase.from('portal_system_passcodes').select('*').in('system_id', sysIds),
        supabase.from('portal_test_mode').select('*').in('system_id', sysIds),
      ]);
      if (ecRes.data) setEmergencyContacts(ecRes.data as any);
      if (pcRes.data) setPasscodes(pcRes.data as any);
      if (tmRes.data) setTestModes(tmRes.data as any);
    }

    setLoading(false);
  }, []);

  function handleLogin(u: PortalUser) {
    setUser(u);
    loadData(u.company_id);
  }

  function handleLogout() {
    setUser(null);
    setCompany(null);
    setActiveTab('dashboard');
    setInvoices([]);
    setEstimates([]);
    setPayments([]);
    setSystems([]);
    setEmergencyContacts([]);
    setPasscodes([]);
    setTestModes([]);
    setWorkOrders([]);
    setAttachments([]);
    setPortalDocs([]);
    setRequests([]);
  }

  async function refreshSystemData() {
    if (!user) return;
    const sysIds = systems.map(s => s.id);
    if (!sysIds.length) return;
    const [ecRes, pcRes, tmRes] = await Promise.all([
      supabase.from('portal_emergency_contacts').select('*').in('system_id', sysIds).order('priority_order'),
      supabase.from('portal_system_passcodes').select('*').in('system_id', sysIds),
      supabase.from('portal_test_mode').select('*').in('system_id', sysIds),
    ]);
    if (ecRes.data) setEmergencyContacts(ecRes.data as any);
    if (pcRes.data) setPasscodes(pcRes.data as any);
    if (tmRes.data) setTestModes(tmRes.data as any);
  }

  async function refreshInvoices() {
    if (!user) return;
    const [invRes, payRes] = await Promise.all([
      supabase.from('invoices').select('id,invoice_number,status,invoice_date,due_date,total,amount_paid,balance_due,notes').eq('company_id', user.company_id).order('invoice_date', { ascending: false }),
      supabase.from('portal_payments').select('id,amount,payment_method,reference_number,notes,paid_at,invoice_id,invoices(invoice_number)').eq('company_id', user.company_id).order('paid_at', { ascending: false }),
    ]);
    if (invRes.data) setInvoices(invRes.data as any);
    if (payRes.data) setPayments(payRes.data as any);
  }

  async function refreshRequests() {
    if (!user) return;
    const { data } = await supabase.from('portal_wo_requests').select('id,title,description,priority,preferred_date,preferred_time,status,created_at,sites(name)').eq('company_id', user.company_id).order('created_at', { ascending: false });
    if (data) setRequests(data as any);
  }

  if (!user) {
    return <LoginScreen onLogin={handleLogin} />;
  }

  return (
    <div className="h-full flex flex-col bg-gray-50 overflow-hidden">
      <PortalHeader
        user={user}
        company={company}
        activeTab={activeTab}
        onTabChange={setActiveTab}
        onLogout={handleLogout}
      />

      <div className="flex-1 overflow-y-auto">
        {activeTab === 'dashboard' && (
          <DashboardTab
            company={company}
            invoices={invoices}
            workOrders={workOrders}
            onTabChange={setActiveTab}
          />
        )}
        {activeTab === 'estimates' && (
          <EstimatesTab estimates={estimates} loading={loading} />
        )}
        {activeTab === 'invoices' && (
          <InvoicesTab invoices={invoices} user={user} loading={loading} onPaymentMade={refreshInvoices} />
        )}
        {activeTab === 'payments' && (
          <PaymentsTab payments={payments} loading={loading} />
        )}
        {activeTab === 'systems' && (
          <SystemsTab
            systems={systems}
            user={user}
            emergencyContacts={emergencyContacts}
            passcodes={passcodes}
            testModes={testModes}
            loading={loading}
            onRefresh={refreshSystemData}
          />
        )}
        {activeTab === 'work-orders' && (
          <WorkOrdersTab
            workOrders={workOrders}
            requests={requests}
            user={user}
            sites={sites}
            loading={loading}
            onRefresh={refreshRequests}
          />
        )}
        {activeTab === 'attachments' && (
          <AttachmentsTab attachments={attachments} portalDocs={portalDocs} loading={loading} />
        )}
        {activeTab === 'support' && (
          <TicketsTab user={user} loading={loading} />
        )}
      </div>
    </div>
  );
}
