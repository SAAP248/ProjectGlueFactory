import { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useServiceRates, useBillingProducts } from './useEmployees';
import type { Employee } from './types';

const ROLES = [
  { value: 'admin', label: 'Administrator' },
  { value: 'accounting', label: 'Accounting' },
  { value: 'sales_manager', label: 'Sales Manager' },
  { value: 'sales', label: 'Salesperson' },
  { value: 'csr', label: 'Customer Service Rep' },
  { value: 'dispatcher', label: 'Dispatcher' },
  { value: 'tech_manager', label: 'Tech Manager' },
  { value: 'technician', label: 'Technician' },
  { value: 'limited_tech', label: 'Limited Technician' },
];

const DEPARTMENTS = ['Executive', 'Sales', 'Field Operations', 'Operations', 'Finance', 'Admin'];
const EMPLOYMENT_TYPES = [
  { value: 'full_time', label: 'Full-Time' },
  { value: 'part_time', label: 'Part-Time' },
  { value: 'contractor', label: 'Contractor' },
  { value: '1099', label: '1099 Independent' },
];
const PAY_TYPES = [
  { value: 'hourly', label: 'Hourly' },
  { value: 'salary', label: 'Salary' },
];
const COLORS = ['#2563eb', '#059669', '#d97706', '#dc2626', '#7c3aed', '#0891b2', '#1e40af', '#16a34a', '#ea580c', '#64748b'];

interface Props {
  employee: Employee | null;
  canViewCompensation: boolean;
  onClose: () => void;
  onSaved: () => void;
}

export default function EmployeeModal({ employee, canViewCompensation, onClose, onSaved }: Props) {
  const serviceRates = useServiceRates();
  const billingProducts = useBillingProducts();
  const isEdit = !!employee;
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const [form, setForm] = useState({
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    role: 'technician',
    status: 'active',
    personal_email: '',
    personal_phone: '',
    emergency_contact_name: '',
    emergency_contact_phone: '',
    date_of_hire: '',
    date_of_termination: '',
    employment_type: 'full_time',
    pay_type: 'hourly',
    pay_rate: '',
    overtime_rate: '',
    loaded_cost: '',
    hourly_rate: '',
    default_billing_product_id: '',
    default_service_rate_id: '',
    department: '',
    title: '',
    address: '',
    city: '',
    state: '',
    zip: '',
    notes: '',
    color: '#2563eb',
  });

  useEffect(() => {
    if (employee) {
      setForm({
        first_name: employee.first_name,
        last_name: employee.last_name,
        email: employee.email,
        phone: employee.phone || '',
        role: employee.role,
        status: employee.status,
        personal_email: employee.personal_email || '',
        personal_phone: employee.personal_phone || '',
        emergency_contact_name: employee.emergency_contact_name || '',
        emergency_contact_phone: employee.emergency_contact_phone || '',
        date_of_hire: employee.date_of_hire || '',
        date_of_termination: employee.date_of_termination || '',
        employment_type: employee.employment_type,
        pay_type: employee.pay_type,
        pay_rate: employee.pay_rate?.toString() || '',
        overtime_rate: employee.overtime_rate?.toString() || '',
        loaded_cost: employee.loaded_cost?.toString() || '',
        hourly_rate: employee.hourly_rate?.toString() || '',
        default_billing_product_id: employee.default_billing_product_id || '',
        default_service_rate_id: employee.default_service_rate_id || '',
        department: employee.department || '',
        title: employee.title || '',
        address: employee.address || '',
        city: employee.city || '',
        state: employee.state || '',
        zip: employee.zip || '',
        notes: employee.notes || '',
        color: employee.color || '#2563eb',
      });
    }
  }, [employee]);

  function update(field: string, value: string) {
    setForm(f => ({ ...f, [field]: value }));
  }

  async function handleSave() {
    if (!form.first_name.trim() || !form.last_name.trim() || !form.email.trim()) {
      setError('First name, last name, and email are required.');
      return;
    }
    setSaving(true);
    setError('');

    const payload = {
      first_name: form.first_name.trim(),
      last_name: form.last_name.trim(),
      email: form.email.trim(),
      phone: form.phone.trim() || null,
      role: form.role,
      status: form.status,
      personal_email: form.personal_email.trim() || null,
      personal_phone: form.personal_phone.trim() || null,
      emergency_contact_name: form.emergency_contact_name.trim() || null,
      emergency_contact_phone: form.emergency_contact_phone.trim() || null,
      date_of_hire: form.date_of_hire || null,
      date_of_termination: form.date_of_termination || null,
      employment_type: form.employment_type,
      pay_type: form.pay_type,
      pay_rate: form.pay_rate ? parseFloat(form.pay_rate) : 0,
      overtime_rate: form.overtime_rate ? parseFloat(form.overtime_rate) : 0,
      loaded_cost: form.loaded_cost ? parseFloat(form.loaded_cost) : 0,
      hourly_rate: form.hourly_rate ? parseFloat(form.hourly_rate) : 0,
      default_billing_product_id: form.default_billing_product_id || null,
      default_service_rate_id: form.default_service_rate_id || null,
      department: form.department.trim() || null,
      title: form.title.trim() || null,
      address: form.address.trim() || null,
      city: form.city.trim() || null,
      state: form.state.trim() || null,
      zip: form.zip.trim() || null,
      notes: form.notes.trim() || null,
      color: form.color,
      updated_at: new Date().toISOString(),
    };

    if (isEdit) {
      const { error: err } = await supabase.from('employees').update(payload).eq('id', employee!.id);
      if (err) { setError(err.message); setSaving(false); return; }
    } else {
      const { error: err } = await supabase.from('employees').insert(payload);
      if (err) { setError(err.message); setSaving(false); return; }
    }

    setSaving(false);
    onSaved();
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-3xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between flex-shrink-0">
          <h2 className="text-lg font-bold text-gray-900">{isEdit ? 'Edit Employee' : 'Add Employee'}</h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
            <X className="h-5 w-5 text-gray-500" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">
          {error && (
            <div className="px-4 py-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">{error}</div>
          )}

          {/* Basic Info */}
          <fieldset>
            <legend className="text-sm font-bold text-gray-900 mb-3">Basic Information</legend>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <InputField label="First Name *" value={form.first_name} onChange={v => update('first_name', v)} />
              <InputField label="Last Name *" value={form.last_name} onChange={v => update('last_name', v)} />
              <InputField label="Email *" value={form.email} onChange={v => update('email', v)} type="email" />
              <InputField label="Work Phone" value={form.phone} onChange={v => update('phone', v)} />
              <InputField label="Job Title" value={form.title} onChange={v => update('title', v)} placeholder="e.g., Senior Technician" />
              <SelectField label="Department" value={form.department} onChange={v => update('department', v)} options={DEPARTMENTS.map(d => ({ value: d, label: d }))} allowEmpty />
              <SelectField label="Role" value={form.role} onChange={v => update('role', v)} options={ROLES} />
              <SelectField label="Status" value={form.status} onChange={v => update('status', v)} options={[
                { value: 'active', label: 'Active' },
                { value: 'inactive', label: 'Inactive' },
                { value: 'terminated', label: 'Terminated' },
              ]} />
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1.5">Color</label>
                <div className="flex gap-1.5 flex-wrap">
                  {COLORS.map(c => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => update('color', c)}
                      className={`w-7 h-7 rounded-full border-2 transition-transform hover:scale-110 ${form.color === c ? 'border-gray-800 scale-110' : 'border-transparent'}`}
                      style={{ backgroundColor: c }}
                    />
                  ))}
                </div>
              </div>
            </div>
          </fieldset>

          {/* Personal Contact */}
          <fieldset>
            <legend className="text-sm font-bold text-gray-900 mb-3">Personal Contact</legend>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <InputField label="Personal Email" value={form.personal_email} onChange={v => update('personal_email', v)} type="email" />
              <InputField label="Personal Phone" value={form.personal_phone} onChange={v => update('personal_phone', v)} />
              <InputField label="Emergency Contact Name" value={form.emergency_contact_name} onChange={v => update('emergency_contact_name', v)} />
              <InputField label="Emergency Contact Phone" value={form.emergency_contact_phone} onChange={v => update('emergency_contact_phone', v)} />
            </div>
          </fieldset>

          {/* Address */}
          <fieldset>
            <legend className="text-sm font-bold text-gray-900 mb-3">Home Address</legend>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <InputField label="Street Address" value={form.address} onChange={v => update('address', v)} />
              </div>
              <InputField label="City" value={form.city} onChange={v => update('city', v)} />
              <div className="grid grid-cols-2 gap-3">
                <InputField label="State" value={form.state} onChange={v => update('state', v)} />
                <InputField label="Zip" value={form.zip} onChange={v => update('zip', v)} />
              </div>
            </div>
          </fieldset>

          {/* Employment */}
          <fieldset>
            <legend className="text-sm font-bold text-gray-900 mb-3">Employment</legend>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <InputField label="Date of Hire" value={form.date_of_hire} onChange={v => update('date_of_hire', v)} type="date" />
              <SelectField label="Employment Type" value={form.employment_type} onChange={v => update('employment_type', v)} options={EMPLOYMENT_TYPES} />
              {form.status === 'terminated' && (
                <InputField label="Termination Date" value={form.date_of_termination} onChange={v => update('date_of_termination', v)} type="date" />
              )}
            </div>
          </fieldset>

          {/* Compensation - only visible to admin/accounting */}
          {canViewCompensation && (
            <fieldset>
              <legend className="text-sm font-bold text-gray-900 mb-3">Compensation & Billing</legend>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <SelectField label="Pay Type" value={form.pay_type} onChange={v => update('pay_type', v)} options={PAY_TYPES} />
                <InputField
                  label={form.pay_type === 'salary' ? 'Annual Salary ($)' : 'Pay Rate ($/hr)'}
                  value={form.pay_rate}
                  onChange={v => update('pay_rate', v)}
                  type="number"
                />
                {form.pay_type === 'hourly' && (
                  <InputField label="Overtime Rate ($/hr)" value={form.overtime_rate} onChange={v => update('overtime_rate', v)} type="number" />
                )}
                <InputField label="Loaded Cost ($/hr)" value={form.loaded_cost} onChange={v => update('loaded_cost', v)} type="number" />
                <InputField label="Bill Rate / Hourly Rate ($/hr)" value={form.hourly_rate} onChange={v => update('hourly_rate', v)} type="number" />
                <SelectField
                  label="Default Billing Product"
                  value={form.default_billing_product_id}
                  onChange={v => update('default_billing_product_id', v)}
                  options={billingProducts.map(p => ({ value: p.id, label: `${p.name} (${p.sku})` }))}
                  allowEmpty
                  emptyLabel="-- None --"
                />
                <SelectField
                  label="Default Service Rate"
                  value={form.default_service_rate_id}
                  onChange={v => update('default_service_rate_id', v)}
                  options={serviceRates.map(r => ({ value: r.id, label: r.name }))}
                  allowEmpty
                  emptyLabel="-- None --"
                />
              </div>
            </fieldset>
          )}

          {/* Notes */}
          <fieldset>
            <legend className="text-sm font-bold text-gray-900 mb-3">Internal Notes</legend>
            <textarea
              value={form.notes}
              onChange={e => update('notes', e.target.value)}
              rows={3}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              placeholder="Internal notes about this employee..."
            />
          </fieldset>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-100 flex items-center justify-end gap-3 flex-shrink-0">
          <button onClick={onClose} className="px-4 py-2.5 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors">
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-5 py-2.5 text-sm font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
          >
            {saving ? 'Saving...' : isEdit ? 'Save Changes' : 'Add Employee'}
          </button>
        </div>
      </div>
    </div>
  );
}

function InputField({ label, value, onChange, type = 'text', placeholder }: {
  label: string; value: string; onChange: (v: string) => void; type?: string; placeholder?: string;
}) {
  return (
    <div>
      <label className="block text-xs font-medium text-gray-600 mb-1.5">{label}</label>
      <input
        type={type}
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
      />
    </div>
  );
}

function SelectField({ label, value, onChange, options, allowEmpty, emptyLabel }: {
  label: string; value: string; onChange: (v: string) => void;
  options: { value: string; label: string }[];
  allowEmpty?: boolean; emptyLabel?: string;
}) {
  return (
    <div>
      <label className="block text-xs font-medium text-gray-600 mb-1.5">{label}</label>
      <select
        value={value}
        onChange={e => onChange(e.target.value)}
        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
      >
        {allowEmpty && <option value="">{emptyLabel || '-- Select --'}</option>}
        {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </div>
  );
}
