import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { X, Search, ClipboardCheck, Building2, MapPin, Check, FileText, ChevronRight } from 'lucide-react';

interface Props {
  onClose: () => void;
  onCreate: (inspectionId: string) => void;
  preselectedWorkOrderId?: string;
}

interface WorkOrderOption {
  id: string;
  wo_number: string;
  title: string;
  work_order_type: string;
  company_id: string;
  site_id: string;
  companies: { name: string } | null;
  sites: { name: string; address: string; city: string; state: string; zip: string } | null;
}

interface CustomerOption {
  id: string;
  name: string;
}

interface SiteOption {
  id: string;
  name: string;
  address: string;
  city: string;
  state: string;
  zip: string;
  company_id: string;
}

type Mode = 'choose' | 'with-wo' | 'without-wo';

const TYPE_TABS = [
  { value: 'all', label: 'All' },
  { value: 'inspection', label: 'Inspection' },
  { value: 'service_call', label: 'Service Call' },
  { value: 'installation', label: 'Installation' },
  { value: 'service', label: 'Service' },
];

export default function NewInspectionModal({ onClose, onCreate, preselectedWorkOrderId }: Props) {
  const [mode, setMode] = useState<Mode>(preselectedWorkOrderId ? 'with-wo' : 'choose');

  const [workOrders, setWorkOrders] = useState<WorkOrderOption[]>([]);
  const [search, setSearch] = useState('');
  const [selectedWO, setSelectedWO] = useState<WorkOrderOption | null>(null);
  const [typeFilter, setTypeFilter] = useState('all');
  const [woLoading, setWoLoading] = useState(false);

  const [customers, setCustomers] = useState<CustomerOption[]>([]);
  const [sites, setSites] = useState<SiteOption[]>([]);
  const [selectedCustomerId, setSelectedCustomerId] = useState('');
  const [selectedSiteId, setSelectedSiteId] = useState('');
  const [customerSearch, setCustomerSearch] = useState('');
  const [manualLoading, setManualLoading] = useState(false);

  const [sitesLoading, setSitesLoading] = useState(false);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    if (mode === 'with-wo' && workOrders.length === 0) loadWorkOrders();
    if (mode === 'without-wo' && customers.length === 0) loadCustomers();
  }, [mode]);

  async function loadWorkOrders() {
    setWoLoading(true);
    const { data } = await supabase
      .from('work_orders')
      .select('id, wo_number, title, work_order_type, company_id, site_id, companies(name), sites(name, address, city, state, zip)')
      .in('status', ['open', 'in_progress', 'scheduled', 'pending'])
      .order('created_at', { ascending: false })
      .limit(300);
    const list = (data as WorkOrderOption[]) || [];
    setWorkOrders(list);
    if (preselectedWorkOrderId) {
      const pre = list.find(w => w.id === preselectedWorkOrderId);
      if (pre) setSelectedWO(pre);
    }
    setWoLoading(false);
  }

  async function loadCustomers() {
    setManualLoading(true);
    const { data } = await supabase
      .from('companies')
      .select('id, name')
      .order('name')
      .limit(500);
    setCustomers((data as CustomerOption[]) || []);
    setManualLoading(false);
  }

  async function loadSites(companyId: string) {
    setSitesLoading(true);
    const { data } = await supabase
      .from('sites')
      .select('id, name, address, city, state, zip, company_id')
      .eq('company_id', companyId)
      .order('name');
    setSites((data as SiteOption[]) || []);
    setSitesLoading(false);
  }

  function handleCustomerChange(companyId: string) {
    setSelectedCustomerId(companyId);
    setSelectedSiteId('');
    setSites([]);
    if (companyId) {
      setSitesLoading(true);
      loadSites(companyId);
    }
  }

  const filteredWOs = workOrders.filter(w => {
    if (typeFilter !== 'all' && w.work_order_type !== typeFilter) return false;
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      w.wo_number.toLowerCase().includes(q) ||
      w.title.toLowerCase().includes(q) ||
      (w.companies?.name || '').toLowerCase().includes(q)
    );
  });

  const filteredCustomers = customerSearch.trim()
    ? customers.filter(c => c.name.toLowerCase().includes(customerSearch.toLowerCase()))
    : customers;

  const canCreate = mode === 'with-wo'
    ? !!selectedWO
    : !!selectedCustomerId;

  async function handleCreate() {
    setCreating(true);

    const { data: tmpl } = await supabase
      .from('inspection_templates')
      .select('id')
      .eq('code', 'nfpa72')
      .eq('is_active', true)
      .order('version', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!tmpl) {
      setCreating(false);
      return;
    }

    const today = new Date().toISOString().split('T')[0];
    const now = new Date().toTimeString().slice(0, 5);
    const inspNum = `INS-${Date.now().toString(36).toUpperCase()}`;

    let companyId: string | null = null;
    let siteId: string | null = null;
    let workOrderId: string | null = null;
    const prefillData: Record<string, string> = {
      inspection_date: today,
      inspection_start_time: now,
    };
    let techEmployeeId: string | null = null;
    let contactId: string | null = null;

    if (mode === 'with-wo' && selectedWO) {
      workOrderId = selectedWO.id;
      companyId = selectedWO.company_id;
      siteId = selectedWO.site_id;

      prefillData.company_name = selectedWO.companies?.name || '';
      prefillData.site_address = selectedWO.sites?.address || '';
      prefillData.site_city = (selectedWO.sites as any)?.city || '';
      prefillData.site_state = (selectedWO.sites as any)?.state || '';
      prefillData.site_zip = (selectedWO.sites as any)?.zip || '';

      prefillData.site_name = selectedWO.sites?.name || '';
      prefillData.wo_number = selectedWO.wo_number;

      const { data: techData } = await supabase
        .from('work_order_technicians')
        .select('employee_id, employees(first_name, last_name)')
        .eq('work_order_id', selectedWO.id)
        .eq('is_lead', true)
        .limit(1)
        .maybeSingle();

      if (techData?.employees) {
        techEmployeeId = techData.employee_id;
        prefillData.technician_name = `${(techData.employees as any).first_name} ${(techData.employees as any).last_name}`;
      }

      const { data: contactData } = await supabase
        .from('contacts')
        .select('id, first_name, last_name, phone, email')
        .eq('site_id', selectedWO.site_id)
        .limit(1)
        .maybeSingle();

      if (contactData) {
        contactId = contactData.id;
        prefillData.contact_name = `${contactData.first_name} ${contactData.last_name}`;
        prefillData.contact_phone = contactData.phone || '';
        prefillData.contact_email = contactData.email || '';
      }
    } else {
      companyId = selectedCustomerId || null;
      siteId = selectedSiteId || null;

      const customer = customers.find(c => c.id === selectedCustomerId);
      if (customer) prefillData.company_name = customer.name;

      if (selectedSiteId) {
        const site = sites.find(s => s.id === selectedSiteId);
        if (site) {
          prefillData.site_name = site.name;
          prefillData.site_address = site.address || '';
          prefillData.site_city = site.city || '';
          prefillData.site_state = site.state || '';
          prefillData.site_zip = site.zip || '';

        }

        const { data: contactData } = await supabase
          .from('contacts')
          .select('id, first_name, last_name, phone, email')
          .eq('site_id', selectedSiteId)
          .limit(1)
          .maybeSingle();

        if (contactData) {
          contactId = contactData.id;
          prefillData.contact_name = `${contactData.first_name} ${contactData.last_name}`;
          prefillData.contact_phone = contactData.phone || '';
          prefillData.contact_email = contactData.email || '';
        }
      }
    }

    const { data: newInspection, error } = await supabase
      .from('inspections')
      .insert({
        inspection_number: inspNum,
        template_id: tmpl.id,
        work_order_id: workOrderId,
        company_id: companyId,
        site_id: siteId,
        technician_id: techEmployeeId,
        contact_id: contactId,
        status: 'draft',
        inspection_date: today,
        inspection_start_time: now,
        prefill_data: prefillData,
      })
      .select('id')
      .single();

    if (error || !newInspection) {
      setCreating(false);
      return;
    }

    const { data: fullTmpl } = await supabase
      .from('inspection_templates')
      .select('pages')
      .eq('id', tmpl.id)
      .maybeSingle();

    if (fullTmpl?.pages) {
      const prefillRows: { inspection_id: string; field_id: string; page_index: number; value: any }[] = [];
      (fullTmpl.pages as any[]).forEach((page: any, pageIdx: number) => {
        (page.sections || []).forEach((section: any) => {
          (section.fields || []).forEach((field: any) => {
            if (field.prefill && prefillData[field.prefill]) {
              prefillRows.push({
                inspection_id: newInspection.id,
                field_id: field.id,
                page_index: pageIdx,
                value: prefillData[field.prefill],
              });
            }
          });
        });
      });
      if (prefillRows.length > 0) {
        await supabase.from('inspection_field_values').upsert(prefillRows, { onConflict: 'inspection_id,field_id' });
      }
    }

    setCreating(false);
    onCreate(newInspection.id);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="fixed inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-white rounded-xl shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <div className="flex items-center gap-2">
            <ClipboardCheck className="h-5 w-5 text-blue-600" />
            <h2 className="text-lg font-bold text-gray-900">New Inspection</h2>
          </div>
          <button onClick={onClose} className="p-1 text-gray-400 hover:text-gray-600">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6">

          {/* Mode chooser */}
          {mode === 'choose' && (
            <div className="space-y-3">
              <p className="text-sm text-gray-500 mb-4">How would you like to create this inspection?</p>
              <button
                onClick={() => setMode('with-wo')}
                className="w-full text-left px-5 py-4 rounded-xl border-2 border-gray-200 hover:border-blue-300 hover:bg-blue-50/50 transition-all group"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
                      <FileText className="h-5 w-5 text-blue-600" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-gray-900">Link to a Work Order</p>
                      <p className="text-xs text-gray-500 mt-0.5">Pick an existing work order to auto-fill customer and site details</p>
                    </div>
                  </div>
                  <ChevronRight className="h-5 w-5 text-gray-300 group-hover:text-blue-500 transition-colors" />
                </div>
              </button>
              <button
                onClick={() => setMode('without-wo')}
                className="w-full text-left px-5 py-4 rounded-xl border-2 border-gray-200 hover:border-blue-300 hover:bg-blue-50/50 transition-all group"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-teal-100 flex items-center justify-center">
                      <Building2 className="h-5 w-5 text-teal-600" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-gray-900">Choose Customer & Site</p>
                      <p className="text-xs text-gray-500 mt-0.5">Create an inspection without linking it to a work order</p>
                    </div>
                  </div>
                  <ChevronRight className="h-5 w-5 text-gray-300 group-hover:text-blue-500 transition-colors" />
                </div>
              </button>
            </div>
          )}

          {/* With Work Order mode */}
          {mode === 'with-wo' && (
            <>
              <p className="text-sm text-gray-500 mb-4">Select a work order to create an NFPA 72 inspection for.</p>

              {/* Search */}
              <div className="relative mb-3">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder="Search by WO number, title, or customer..."
                  className="w-full pl-9 pr-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Type filter tabs */}
              <div className="flex gap-1 mb-3 flex-wrap">
                {TYPE_TABS.map(tab => (
                  <button
                    key={tab.value}
                    onClick={() => setTypeFilter(tab.value)}
                    className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-colors ${
                      typeFilter === tab.value
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    {tab.label}
                    {tab.value !== 'all' && (
                      <span className="ml-1 opacity-70">
                        ({workOrders.filter(w => w.work_order_type === tab.value).length})
                      </span>
                    )}
                  </button>
                ))}
              </div>

              {/* Work order list */}
              {woLoading ? (
                <div className="flex justify-center py-8">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600" />
                </div>
              ) : (
                <div className="space-y-1 max-h-[340px] overflow-y-auto">
                  {filteredWOs.length === 0 ? (
                    <p className="text-sm text-gray-400 text-center py-8">No matching work orders found.</p>
                  ) : filteredWOs.map(wo => {
                    const isSelected = selectedWO?.id === wo.id;
                    return (
                      <button
                        key={wo.id}
                        onClick={() => setSelectedWO(wo)}
                        className={`w-full text-left px-4 py-3 rounded-lg border transition-all ${
                          isSelected
                            ? 'border-blue-400 bg-blue-50 ring-2 ring-blue-200'
                            : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-bold text-gray-900 font-mono">{wo.wo_number}</span>
                            <span className={`text-xs px-1.5 py-0.5 rounded font-medium capitalize ${
                              wo.work_order_type === 'inspection' ? 'bg-blue-100 text-blue-700' :
                              wo.work_order_type === 'service_call' ? 'bg-teal-100 text-teal-700' :
                              wo.work_order_type === 'installation' ? 'bg-amber-100 text-amber-700' :
                              'bg-gray-100 text-gray-600'
                            }`}>
                              {wo.work_order_type.replace('_', ' ')}
                            </span>
                          </div>
                          {isSelected && (
                            <div className="w-5 h-5 rounded-full bg-blue-600 flex items-center justify-center flex-shrink-0">
                              <Check className="h-3 w-3 text-white" />
                            </div>
                          )}
                        </div>
                        <p className="text-sm text-gray-700 mt-0.5 truncate">{wo.title}</p>
                        <div className="flex items-center gap-3 mt-1">
                          {wo.companies?.name && (
                            <span className="flex items-center gap-1 text-xs text-gray-400">
                              <Building2 className="h-3 w-3" /> {wo.companies.name}
                            </span>
                          )}
                          {wo.sites?.name && (
                            <span className="flex items-center gap-1 text-xs text-gray-400">
                              <MapPin className="h-3 w-3" /> {wo.sites.name}
                            </span>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </>
          )}

          {/* Without Work Order mode */}
          {mode === 'without-wo' && (
            <>
              <p className="text-sm text-gray-500 mb-4">Choose a customer and optionally a site for this inspection.</p>

              {manualLoading ? (
                <div className="flex justify-center py-8">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600" />
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Customer picker */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Customer *</label>
                    <div className="relative mb-2">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                      <input
                        type="text"
                        value={customerSearch}
                        onChange={e => setCustomerSearch(e.target.value)}
                        placeholder="Search customers..."
                        className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div className="max-h-[200px] overflow-y-auto border border-gray-200 rounded-lg divide-y divide-gray-100">
                      {filteredCustomers.length === 0 ? (
                        <p className="text-sm text-gray-400 text-center py-6">No customers found</p>
                      ) : filteredCustomers.map(c => {
                        const isSelected = selectedCustomerId === c.id;
                        return (
                          <button
                            key={c.id}
                            onClick={() => handleCustomerChange(c.id)}
                            className={`w-full text-left px-4 py-2.5 text-sm transition-colors flex items-center justify-between ${
                              isSelected ? 'bg-blue-50 text-blue-700 font-medium' : 'text-gray-700 hover:bg-gray-50'
                            }`}
                          >
                            <span className="flex items-center gap-2">
                              <Building2 className="h-3.5 w-3.5 text-gray-400 flex-shrink-0" />
                              {c.name}
                            </span>
                            {isSelected && (
                              <div className="w-5 h-5 rounded-full bg-blue-600 flex items-center justify-center flex-shrink-0">
                                <Check className="h-3 w-3 text-white" />
                              </div>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Site picker */}
                  {selectedCustomerId && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">Select a Site</label>
                      <p className="text-xs text-gray-400 mb-2">The site address will be automatically filled into the inspection form.</p>
                      {sitesLoading ? (
                        <div className="flex items-center justify-center py-6 border border-gray-200 rounded-lg">
                          <div className="animate-spin rounded-full h-5 w-5 border-2 border-blue-600 border-t-transparent" />
                          <span className="ml-2 text-sm text-gray-400">Loading sites...</span>
                        </div>
                      ) : sites.length === 0 ? (
                        <div className="py-5 text-center border border-dashed border-gray-200 rounded-lg">
                          <MapPin className="h-5 w-5 text-gray-300 mx-auto mb-1" />
                          <p className="text-xs text-gray-400">No sites found for this customer.</p>
                        </div>
                      ) : (
                        <div className="max-h-[180px] overflow-y-auto border border-gray-200 rounded-lg divide-y divide-gray-100">
                          {sites.map(s => {
                            const isSelected = selectedSiteId === s.id;
                            const fullAddr = [s.address, s.city, s.state, s.zip].filter(Boolean).join(', ');
                            return (
                              <button
                                key={s.id}
                                onClick={() => setSelectedSiteId(isSelected ? '' : s.id)}
                                className={`w-full text-left px-4 py-3 transition-colors flex items-center justify-between gap-3 ${
                                  isSelected ? 'bg-blue-50 ring-1 ring-inset ring-blue-200' : 'hover:bg-gray-50'
                                }`}
                              >
                                <div className="min-w-0">
                                  <p className={`text-sm font-medium truncate ${isSelected ? 'text-blue-700' : 'text-gray-800'}`}>
                                    {s.name}
                                  </p>
                                  {fullAddr && (
                                    <p className={`text-xs mt-0.5 truncate ${isSelected ? 'text-blue-500' : 'text-gray-400'}`}>
                                      <MapPin className="inline h-3 w-3 mr-0.5 -mt-0.5" />
                                      {fullAddr}
                                    </p>
                                  )}
                                </div>
                                {isSelected && (
                                  <div className="w-5 h-5 rounded-full bg-blue-600 flex items-center justify-center flex-shrink-0">
                                    <Check className="h-3 w-3 text-white" />
                                  </div>
                                )}
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Selection summary */}
                  {selectedCustomerId && selectedSiteId && (() => {
                    const cust = customers.find(c => c.id === selectedCustomerId);
                    const site = sites.find(s => s.id === selectedSiteId);
                    if (!cust || !site) return null;
                    const parts = [site.address, site.city, site.state, site.zip].filter(Boolean);
                    return (
                      <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4">
                        <div className="flex items-start gap-3">
                          <div className="w-8 h-8 rounded-lg bg-emerald-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                            <Check className="h-4 w-4 text-emerald-600" />
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-semibold text-emerald-800">Ready to create</p>
                            <p className="text-xs text-emerald-700 mt-1">
                              <span className="font-medium">{cust.name}</span>
                              {' '}&#8212; {site.name}
                            </p>
                            {parts.length > 0 && (
                              <p className="text-xs text-emerald-600 mt-0.5">
                                {parts.join(', ')}
                              </p>
                            )}
                            <p className="text-xs text-emerald-600 mt-1 italic">This address will be auto-filled on the inspection form.</p>
                          </div>
                        </div>
                      </div>
                    );
                  })()}
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between gap-3 px-6 py-4 border-t border-gray-200 bg-gray-50 rounded-b-xl">
          <div>
            {mode !== 'choose' && !preselectedWorkOrderId && (
              <button
                onClick={() => { setMode('choose'); setSelectedWO(null); setSelectedCustomerId(''); setSelectedSiteId(''); }}
                className="text-sm text-gray-500 hover:text-gray-700 font-medium"
              >
                &larr; Back
              </button>
            )}
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50"
            >
              Cancel
            </button>
            {mode !== 'choose' && (
              <button
                onClick={handleCreate}
                disabled={!canCreate || creating}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
              >
                {creating ? 'Creating...' : 'Create Inspection'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
