import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { X, Search, ClipboardCheck, Building2, MapPin } from 'lucide-react';

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
  sites: { name: string; address: string; city: string; state: string; zip: string; phone: string } | null;
}

export default function NewInspectionModal({ onClose, onCreate, preselectedWorkOrderId }: Props) {
  const [workOrders, setWorkOrders] = useState<WorkOrderOption[]>([]);
  const [search, setSearch] = useState('');
  const [selectedWO, setSelectedWO] = useState<WorkOrderOption | null>(null);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    async function load() {
      const { data } = await supabase
        .from('work_orders')
        .select('id, wo_number, title, work_order_type, company_id, site_id, companies(name), sites(name, address, city, state, zip, phone)')
        .in('status', ['open', 'in_progress', 'scheduled', 'pending'])
        .order('created_at', { ascending: false })
        .limit(200);
      setWorkOrders((data as WorkOrderOption[]) || []);
      if (preselectedWorkOrderId && data) {
        const pre = (data as WorkOrderOption[]).find(w => w.id === preselectedWorkOrderId);
        if (pre) setSelectedWO(pre);
      }
      setLoading(false);
    }
    load();
  }, [preselectedWorkOrderId]);

  const filtered = search.trim()
    ? workOrders.filter(w =>
        w.wo_number.toLowerCase().includes(search.toLowerCase()) ||
        w.title.toLowerCase().includes(search.toLowerCase()) ||
        (w.companies?.name || '').toLowerCase().includes(search.toLowerCase())
      )
    : workOrders;

  const handleCreate = async () => {
    if (!selectedWO) return;
    setCreating(true);

    // Get the active template
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

    // Get first assigned technician
    const { data: techData } = await supabase
      .from('work_order_technicians')
      .select('employee_id, employees(first_name, last_name)')
      .eq('work_order_id', selectedWO.id)
      .eq('is_lead', true)
      .limit(1)
      .maybeSingle();

    // Get site contact
    const { data: contactData } = await supabase
      .from('contacts')
      .select('id, first_name, last_name, phone, email')
      .eq('site_id', selectedWO.site_id)
      .limit(1)
      .maybeSingle();

    // Generate inspection number
    const inspNum = `INS-${Date.now().toString(36).toUpperCase()}`;
    const today = new Date().toISOString().split('T')[0];
    const now = new Date().toTimeString().slice(0, 5);

    const techName = techData?.employees
      ? `${(techData.employees as any).first_name} ${(techData.employees as any).last_name}`
      : '';

    const prefillData: Record<string, string> = {
      company_name: selectedWO.companies?.name || '',
      site_address: selectedWO.sites?.address || '',
      site_city: (selectedWO.sites as any)?.city || '',
      site_state: (selectedWO.sites as any)?.state || '',
      site_zip: (selectedWO.sites as any)?.zip || '',
      site_phone: (selectedWO.sites as any)?.phone || '',
      site_name: selectedWO.sites?.name || '',
      contact_name: contactData ? `${contactData.first_name} ${contactData.last_name}` : '',
      contact_phone: contactData?.phone || '',
      contact_email: contactData?.email || '',
      wo_number: selectedWO.wo_number,
      inspection_date: today,
      inspection_start_time: now,
      technician_name: techName,
    };

    const { data: newInspection, error } = await supabase
      .from('inspections')
      .insert({
        inspection_number: inspNum,
        template_id: tmpl.id,
        work_order_id: selectedWO.id,
        company_id: selectedWO.company_id,
        site_id: selectedWO.site_id,
        technician_id: techData?.employee_id || null,
        contact_id: contactData?.id || null,
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

    // Pre-populate field values from prefill mapping
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
  };

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
          <p className="text-sm text-gray-500 mb-4">Select a work order to create an NFPA 72 inspection for.</p>

          {/* Search */}
          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search work orders..."
              className="w-full pl-9 pr-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Work order list */}
          {loading ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600" />
            </div>
          ) : (
            <div className="space-y-1 max-h-[400px] overflow-y-auto">
              {filtered.length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-8">No matching work orders found.</p>
              ) : filtered.map(wo => (
                <button
                  key={wo.id}
                  onClick={() => setSelectedWO(wo)}
                  className={`w-full text-left px-4 py-3 rounded-lg border transition-colors ${
                    selectedWO?.id === wo.id
                      ? 'border-blue-400 bg-blue-50 ring-2 ring-blue-200'
                      : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-gray-900 font-mono">{wo.wo_number}</span>
                      <span className="text-xs px-1.5 py-0.5 rounded bg-gray-100 text-gray-600">{wo.work_order_type}</span>
                    </div>
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
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-200 bg-gray-50 rounded-b-xl">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            onClick={handleCreate}
            disabled={!selectedWO || creating}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
          >
            {creating ? 'Creating...' : 'Create Inspection'}
          </button>
        </div>
      </div>
    </div>
  );
}
