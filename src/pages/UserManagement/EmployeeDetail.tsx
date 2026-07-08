import { useState } from 'react';
import { User, Phone, Briefcase, DollarSign, Award, FileText, Mail, MapPin, Calendar, Shield, CreditCard as Edit3, AlertTriangle } from 'lucide-react';
import { useCertifications, useServiceRates, useBillingProducts } from './useEmployees';
import { ROLE_PAGES } from '../../config/roleAccess';
import type { Employee } from './types';
import CertificationsTab from './CertificationsTab';

const ROLE_LABELS: Record<string, string> = {
  admin: 'Administrator',
  accounting: 'Accounting',
  sales_manager: 'Sales Manager',
  sales: 'Salesperson',
  csr: 'Customer Service Rep',
  dispatcher: 'Dispatcher',
  tech_manager: 'Tech Manager',
  technician: 'Technician',
  tech: 'Technician',
  limited_tech: 'Limited Tech',
};

const EMPLOYMENT_TYPE_LABELS: Record<string, string> = {
  full_time: 'Full-Time',
  part_time: 'Part-Time',
  contractor: 'Contractor',
  '1099': '1099 Independent',
};

interface Props {
  employee: Employee;
  canViewCompensation: boolean;
  onEdit: () => void;
  onRefetch: () => void;
}

type Tab = 'profile' | 'contact' | 'employment' | 'compensation' | 'certifications' | 'permissions';

export default function EmployeeDetail({ employee, canViewCompensation, onEdit, onRefetch }: Props) {
  const [tab, setTab] = useState<Tab>('profile');
  const { certs, refetch: refetchCerts } = useCertifications(employee.id);
  const serviceRates = useServiceRates();
  const billingProducts = useBillingProducts();

  const tabs: { id: Tab; label: string; icon: React.ElementType; hidden?: boolean }[] = [
    { id: 'profile', label: 'Profile', icon: User },
    { id: 'contact', label: 'Contact', icon: Phone },
    { id: 'employment', label: 'Employment', icon: Briefcase },
    { id: 'compensation', label: 'Compensation', icon: DollarSign, hidden: !canViewCompensation },
    { id: 'certifications', label: 'Certifications', icon: Award },
    { id: 'permissions', label: 'Permissions', icon: Shield },
  ];

  const defaultRate = serviceRates.find(r => r.id === employee.default_service_rate_id);
  const defaultProduct = billingProducts.find(p => p.id === employee.default_billing_product_id);

  const expiringSoon = certs.filter(c => {
    if (!c.expiration_date) return false;
    const diff = new Date(c.expiration_date).getTime() - Date.now();
    return diff > 0 && diff < 90 * 24 * 60 * 60 * 1000;
  });

  function formatDate(d: string | null) {
    if (!d) return '--';
    return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  }

  function formatCurrency(v: number) {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(v);
  }

  function tenure() {
    if (!employee.date_of_hire) return null;
    const start = new Date(employee.date_of_hire);
    const end = employee.date_of_termination ? new Date(employee.date_of_termination) : new Date();
    const years = Math.floor((end.getTime() - start.getTime()) / (365.25 * 24 * 60 * 60 * 1000));
    const months = Math.floor(((end.getTime() - start.getTime()) % (365.25 * 24 * 60 * 60 * 1000)) / (30.44 * 24 * 60 * 60 * 1000));
    if (years === 0) return `${months}mo`;
    return `${years}y ${months}mo`;
  }

  const accessiblePages = ROLE_PAGES[employee.role as keyof typeof ROLE_PAGES] || [];

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="px-6 py-5 border-b border-gray-100 flex-shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div
              className="w-14 h-14 rounded-2xl flex items-center justify-center text-white text-lg font-bold shadow-sm"
              style={{ backgroundColor: employee.color || '#64748b' }}
            >
              {employee.first_name[0]}{employee.last_name[0]}
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-900">
                {employee.first_name} {employee.last_name}
              </h2>
              <div className="flex items-center gap-3 mt-0.5">
                <span className="text-sm text-gray-600">{employee.title || ROLE_LABELS[employee.role] || employee.role}</span>
                {employee.department && (
                  <span className="text-xs px-2 py-0.5 bg-gray-100 text-gray-600 rounded-full font-medium">{employee.department}</span>
                )}
              </div>
            </div>
          </div>
          <button
            onClick={onEdit}
            className="flex items-center gap-2 px-4 py-2 border border-gray-200 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
          >
            <Edit3 className="h-4 w-4" /> Edit
          </button>
        </div>

        {/* Alert badges */}
        {expiringSoon.length > 0 && (
          <div className="mt-3 flex items-center gap-2 px-3 py-2 bg-amber-50 border border-amber-200 rounded-lg">
            <AlertTriangle className="h-4 w-4 text-amber-600 flex-shrink-0" />
            <span className="text-xs font-medium text-amber-800">
              {expiringSoon.length} certification{expiringSoon.length > 1 ? 's' : ''} expiring within 90 days
            </span>
          </div>
        )}

        {/* Tabs */}
        <div className="flex items-center gap-1 mt-4 -mb-5 overflow-x-auto">
          {tabs.filter(t => !t.hidden).map(t => {
            const Icon = t.icon;
            return (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={`flex items-center gap-1.5 px-3 py-2.5 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                  tab === t.id
                    ? 'border-blue-600 text-blue-700'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                <Icon className="h-3.5 w-3.5" />
                {t.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Tab Content */}
      <div className="flex-1 overflow-y-auto p-6">
        {tab === 'profile' && (
          <div className="space-y-6 max-w-2xl">
            <Section title="Basic Information">
              <Field label="Full Name" value={`${employee.first_name} ${employee.last_name}`} />
              <Field label="Job Title" value={employee.title} />
              <Field label="Department" value={employee.department} />
              <Field label="Role" value={ROLE_LABELS[employee.role] || employee.role} />
              <Field label="Status" value={employee.status} badge />
              <Field label="Calendar Color">
                <div className="flex items-center gap-2">
                  <div className="w-5 h-5 rounded-full border border-gray-200" style={{ backgroundColor: employee.color || '#64748b' }} />
                  <span className="text-sm text-gray-900">{employee.color || '#64748b'}</span>
                </div>
              </Field>
            </Section>
            {employee.notes && (
              <Section title="Notes">
                <p className="text-sm text-gray-700 whitespace-pre-wrap col-span-2">{employee.notes}</p>
              </Section>
            )}
          </div>
        )}

        {tab === 'contact' && (
          <div className="space-y-6 max-w-2xl">
            <Section title="Work Contact">
              <Field label="Work Email" value={employee.email} icon={<Mail className="h-4 w-4 text-gray-400" />} />
              <Field label="Work Phone" value={employee.phone} icon={<Phone className="h-4 w-4 text-gray-400" />} />
            </Section>
            <Section title="Personal Contact">
              <Field label="Personal Email" value={employee.personal_email} icon={<Mail className="h-4 w-4 text-gray-400" />} />
              <Field label="Personal Phone" value={employee.personal_phone} icon={<Phone className="h-4 w-4 text-gray-400" />} />
            </Section>
            <Section title="Home Address">
              <Field label="Address" value={employee.address} icon={<MapPin className="h-4 w-4 text-gray-400" />} />
              <Field label="City" value={employee.city} />
              <Field label="State" value={employee.state} />
              <Field label="Zip" value={employee.zip} />
            </Section>
            <Section title="Emergency Contact">
              <Field label="Name" value={employee.emergency_contact_name} />
              <Field label="Phone" value={employee.emergency_contact_phone} icon={<Phone className="h-4 w-4 text-gray-400" />} />
            </Section>
          </div>
        )}

        {tab === 'employment' && (
          <div className="space-y-6 max-w-2xl">
            <Section title="Employment Details">
              <Field label="Date of Hire" value={formatDate(employee.date_of_hire)} icon={<Calendar className="h-4 w-4 text-gray-400" />} />
              <Field label="Tenure" value={tenure()} />
              <Field label="Employment Type" value={EMPLOYMENT_TYPE_LABELS[employee.employment_type] || employee.employment_type} />
              <Field label="Status" value={employee.status} badge />
              {employee.date_of_termination && (
                <Field label="Termination Date" value={formatDate(employee.date_of_termination)} />
              )}
            </Section>
          </div>
        )}

        {tab === 'compensation' && canViewCompensation && (
          <div className="space-y-6 max-w-2xl">
            <Section title="Pay Information">
              <Field label="Pay Type" value={employee.pay_type === 'salary' ? 'Salary' : 'Hourly'} />
              <Field
                label={employee.pay_type === 'salary' ? 'Annual Salary' : 'Hourly Rate'}
                value={employee.pay_type === 'salary' ? formatCurrency(employee.pay_rate) + '/yr' : formatCurrency(employee.pay_rate) + '/hr'}
              />
              {employee.pay_type === 'hourly' && (
                <Field label="Overtime Rate" value={employee.overtime_rate ? formatCurrency(employee.overtime_rate) + '/hr' : '--'} />
              )}
              <Field label="Loaded Cost" value={employee.loaded_cost ? formatCurrency(employee.loaded_cost) + '/hr' : '--'} />
            </Section>
            <Section title="Billing Defaults">
              <Field label="Default Billing Product" value={defaultProduct ? `${defaultProduct.name} (${defaultProduct.sku})` : 'Not assigned'} />
              <Field label="Default Service Rate" value={defaultRate ? `${defaultRate.name} - ${formatCurrency(defaultRate.hourly_rate)}/hr` : 'Not assigned'} />
              <Field label="Bill Rate (hourly_rate)" value={employee.hourly_rate ? formatCurrency(employee.hourly_rate) + '/hr' : '--'} />
            </Section>
          </div>
        )}

        {tab === 'certifications' && (
          <CertificationsTab employeeId={employee.id} certs={certs} onRefetch={refetchCerts} />
        )}

        {tab === 'permissions' && (
          <div className="space-y-6 max-w-2xl">
            <Section title="Role & Access">
              <Field label="Assigned Role" value={ROLE_LABELS[employee.role] || employee.role} />
            </Section>
            <div>
              <h4 className="text-sm font-semibold text-gray-700 mb-3">Accessible Pages ({accessiblePages.length})</h4>
              <div className="flex flex-wrap gap-2">
                {accessiblePages.map(page => (
                  <span key={page} className="px-2.5 py-1 bg-blue-50 text-blue-700 text-xs font-medium rounded-lg border border-blue-100">
                    {page.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}
                  </span>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h3 className="text-sm font-bold text-gray-900 mb-4 pb-2 border-b border-gray-100">{title}</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {children}
      </div>
    </div>
  );
}

function Field({ label, value, icon, badge, children }: {
  label: string;
  value?: string | null;
  icon?: React.ReactNode;
  badge?: boolean;
  children?: React.ReactNode;
}) {
  const statusColors: Record<string, string> = {
    active: 'bg-emerald-100 text-emerald-700',
    inactive: 'bg-gray-100 text-gray-600',
    terminated: 'bg-red-100 text-red-700',
  };

  return (
    <div>
      <p className="text-xs font-medium text-gray-500 mb-1">{label}</p>
      {children ? children : (
        <div className="flex items-center gap-2">
          {icon}
          {badge && value ? (
            <span className={`px-2 py-0.5 rounded-full text-xs font-bold uppercase ${statusColors[value] || 'bg-gray-100 text-gray-600'}`}>
              {value}
            </span>
          ) : (
            <span className="text-sm text-gray-900">{value || '--'}</span>
          )}
        </div>
      )}
    </div>
  );
}
