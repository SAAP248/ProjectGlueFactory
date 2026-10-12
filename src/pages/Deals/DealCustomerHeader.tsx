import { useEffect, useRef, useState } from 'react';
import { Building2, MapPin, Phone, Mail, ExternalLink, ChevronDown, Check, UserPlus, Navigation } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import type { Deal, DealSite, Employee } from './types';

interface Contact {
  first_name: string | null;
  last_name: string | null;
  phone: string | null;
  mobile: string | null;
  email: string | null;
}

interface Props {
  deal: Deal;
  employees: Employee[];
  onAssign: (employeeId: string | null) => Promise<void>;
  onChooseSite: (siteId: string) => Promise<void>;
  onViewCustomer?: (companyId: string) => void;
}

function useOutsideClose(open: boolean, close: () => void) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) close();
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open, close]);
  return ref;
}

function fullAddress(site: DealSite): string {
  const cityLine = [site.city, [site.state, site.zip].filter(Boolean).join(' ')].filter(Boolean).join(', ');
  return [site.address, cityLine].filter(Boolean).join(', ');
}

function initials(first: string, last: string) {
  return `${first?.[0] ?? ''}${last?.[0] ?? ''}`.toUpperCase();
}

export default function DealCustomerHeader({ deal, employees, onAssign, onChooseSite, onViewCustomer }: Props) {
  const [contact, setContact] = useState<Contact | null>(null);
  const [salesOpen, setSalesOpen] = useState(false);
  const [siteOpen, setSiteOpen] = useState(false);
  const [sites, setSites] = useState<DealSite[] | null>(null);
  const [busy, setBusy] = useState(false);
  const salesRef = useOutsideClose(salesOpen, () => setSalesOpen(false));
  const siteRef = useOutsideClose(siteOpen, () => setSiteOpen(false));

  useEffect(() => {
    setContact(null);
    if (!deal.company_id) return;
    supabase
      .from('contacts')
      .select('first_name, last_name, phone, mobile, email')
      .eq('company_id', deal.company_id)
      .order('is_primary', { ascending: false })
      .limit(1)
      .maybeSingle()
      .then(({ data }) => setContact((data as Contact) ?? null));
  }, [deal.company_id]);

  const openSitePicker = async () => {
    setSiteOpen(o => !o);
    if (sites !== null) return;
    const { data } = await supabase
      .from('sites')
      .select('id, name, address, city, state, zip')
      .eq('company_id', deal.company_id)
      .order('name');
    setSites((data ?? []) as DealSite[]);
  };

  const site = deal.sites ?? null;
  const address = site ? fullAddress(site) : '';
  const phone = contact?.mobile || contact?.phone || deal.companies?.phone || null;
  const email = contact?.email || deal.companies?.email || null;
  const contactName = contact ? [contact.first_name, contact.last_name].filter(Boolean).join(' ') : '';
  const assigned = deal.assigned_employee;

  return (
    <div className="mt-3 rounded-xl border border-gray-200 bg-white p-3.5 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <Building2 className="h-4 w-4 text-gray-400 flex-shrink-0" />
            <span className="text-sm font-semibold text-gray-900 truncate">{deal.companies?.name ?? 'No customer'}</span>
            {onViewCustomer && deal.company_id && (
              <button
                onClick={() => onViewCustomer(deal.company_id)}
                className="inline-flex items-center gap-1 text-xs font-medium text-blue-600 hover:text-blue-700"
              >
                View customer <ExternalLink className="h-3 w-3" />
              </button>
            )}
          </div>

          {site ? (
            <a
              href={`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(address)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="group mt-1.5 flex items-start gap-2 rounded-lg -mx-1 px-1 py-0.5 hover:bg-blue-50 transition-colors"
              title="Get directions"
            >
              <MapPin className="h-4 w-4 text-blue-500 mt-0.5 flex-shrink-0" />
              <span className="min-w-0">
                {site.name && <span className="block text-sm font-medium text-gray-800">{site.name}</span>}
                <span className="block text-xs text-gray-500 group-hover:text-blue-700">{address || 'No address on file'}</span>
              </span>
              <Navigation className="h-3.5 w-3.5 text-gray-300 group-hover:text-blue-500 mt-0.5 ml-auto flex-shrink-0" />
            </a>
          ) : (
            <div ref={siteRef} className="relative mt-1.5">
              <button
                onClick={openSitePicker}
                className="inline-flex items-center gap-1.5 rounded-lg border border-dashed border-amber-300 bg-amber-50 px-2.5 py-1 text-xs font-medium text-amber-800 hover:bg-amber-100 transition-colors"
              >
                <MapPin className="h-3.5 w-3.5" /> Choose site
              </button>
              {siteOpen && (
                <div className="absolute left-0 top-full mt-1 z-20 w-72 max-h-64 overflow-y-auto rounded-xl border border-gray-200 bg-white py-1 shadow-xl">
                  {sites === null && <p className="px-3 py-2 text-xs text-gray-400">Loading sites...</p>}
                  {sites?.length === 0 && <p className="px-3 py-2 text-xs text-gray-500">This customer has no sites yet.</p>}
                  {sites?.map(s => (
                    <button
                      key={s.id}
                      disabled={busy}
                      onClick={async () => { setBusy(true); await onChooseSite(s.id); setBusy(false); setSiteOpen(false); }}
                      className="w-full px-3 py-2 text-left hover:bg-gray-50 disabled:opacity-50"
                    >
                      <span className="block text-sm font-medium text-gray-800">{s.name || 'Unnamed site'}</span>
                      <span className="block text-xs text-gray-500">{fullAddress(s) || 'No address'}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {(contactName || phone || email) && (
            <div className="mt-2 flex items-center gap-2 flex-wrap">
              {contactName && <span className="text-xs text-gray-600">{contactName}</span>}
              {phone && (
                <a href={`tel:${phone}`} className="inline-flex items-center gap-1 rounded-full bg-green-50 px-2.5 py-1 text-xs font-medium text-green-700 hover:bg-green-100 transition-colors">
                  <Phone className="h-3 w-3" /> {phone}
                </a>
              )}
              {email && (
                <a href={`mailto:${email}`} className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2.5 py-1 text-xs font-medium text-blue-700 hover:bg-blue-100 transition-colors max-w-[220px]">
                  <Mail className="h-3 w-3 flex-shrink-0" /> <span className="truncate">{email}</span>
                </a>
              )}
            </div>
          )}
        </div>

        <div ref={salesRef} className="relative flex-shrink-0">
          <span className="block text-[10px] font-semibold uppercase tracking-wider text-gray-400 mb-1 text-right">Salesperson</span>
          <button
            onClick={() => setSalesOpen(o => !o)}
            className={`inline-flex items-center gap-2 rounded-full border pl-1 pr-2.5 py-1 text-xs font-medium transition-all hover:shadow-sm ${
              assigned ? 'border-gray-200 bg-white text-gray-800 hover:border-blue-300' : 'border-amber-300 bg-amber-50 text-amber-800 hover:bg-amber-100'
            }`}
          >
            {assigned ? (
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-blue-600 text-[10px] font-semibold text-white">
                {initials(assigned.first_name, assigned.last_name)}
              </span>
            ) : (
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-amber-200">
                <UserPlus className="h-3.5 w-3.5 text-amber-800" />
              </span>
            )}
            {assigned ? `${assigned.first_name} ${assigned.last_name}` : 'Unassigned'}
            <ChevronDown className="h-3 w-3 opacity-60" />
          </button>
          {salesOpen && (
            <div className="absolute right-0 top-full mt-1 z-20 w-60 max-h-72 overflow-y-auto rounded-xl border border-gray-200 bg-white py-1 shadow-xl">
              {[{ id: '', first_name: 'Unassigned', last_name: '', role: '' }, ...employees].map(emp => {
                const selected = (deal.assigned_employee_id ?? '') === emp.id;
                return (
                  <button
                    key={emp.id || 'none'}
                    disabled={busy}
                    onClick={async () => {
                      setSalesOpen(false);
                      if (selected) return;
                      setBusy(true);
                      await onAssign(emp.id || null);
                      setBusy(false);
                    }}
                    className="flex w-full items-center gap-2 px-3 py-2 text-left hover:bg-gray-50 disabled:opacity-50"
                  >
                    <span className="min-w-0 flex-1">
                      <span className={`block text-sm ${emp.id ? 'text-gray-800' : 'text-gray-500 italic'}`}>
                        {emp.first_name} {emp.last_name}
                      </span>
                      {emp.role && <span className="block text-xs text-gray-400 capitalize">{emp.role}</span>}
                    </span>
                    {selected && <Check className="h-4 w-4 text-blue-600" />}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
