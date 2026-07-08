import { useState } from 'react';
import { Plus, Trash2, AlertTriangle, CheckCircle2, Clock } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import type { Certification } from './types';

interface Props {
  employeeId: string;
  certs: Certification[];
  onRefetch: () => void;
}

export default function CertificationsTab({ employeeId, certs, onRefetch }: Props) {
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState({ cert_name: '', cert_number: '', issuing_authority: '', issued_date: '', expiration_date: '', notes: '' });
  const [saving, setSaving] = useState(false);

  function getStatus(cert: Certification) {
    if (!cert.expiration_date) return 'permanent';
    const diff = new Date(cert.expiration_date).getTime() - Date.now();
    if (diff < 0) return 'expired';
    if (diff < 90 * 24 * 60 * 60 * 1000) return 'expiring';
    return 'valid';
  }

  async function handleAdd() {
    if (!form.cert_name.trim()) return;
    setSaving(true);
    await supabase.from('employee_certifications').insert({
      employee_id: employeeId,
      cert_name: form.cert_name.trim(),
      cert_number: form.cert_number.trim() || null,
      issuing_authority: form.issuing_authority.trim() || null,
      issued_date: form.issued_date || null,
      expiration_date: form.expiration_date || null,
      notes: form.notes.trim() || null,
    });
    setForm({ cert_name: '', cert_number: '', issuing_authority: '', issued_date: '', expiration_date: '', notes: '' });
    setAdding(false);
    setSaving(false);
    onRefetch();
  }

  async function handleDelete(id: string) {
    await supabase.from('employee_certifications').delete().eq('id', id);
    onRefetch();
  }

  const statusBadge: Record<string, { bg: string; text: string; icon: React.ElementType; label: string }> = {
    valid: { bg: 'bg-emerald-50 border-emerald-200', text: 'text-emerald-700', icon: CheckCircle2, label: 'Valid' },
    expiring: { bg: 'bg-amber-50 border-amber-200', text: 'text-amber-700', icon: AlertTriangle, label: 'Expiring Soon' },
    expired: { bg: 'bg-red-50 border-red-200', text: 'text-red-700', icon: AlertTriangle, label: 'Expired' },
    permanent: { bg: 'bg-blue-50 border-blue-200', text: 'text-blue-700', icon: CheckCircle2, label: 'No Expiry' },
  };

  return (
    <div className="max-w-3xl">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-bold text-gray-900">Certifications & Licenses ({certs.length})</h3>
        {!adding && (
          <button
            onClick={() => setAdding(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-blue-700 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors"
          >
            <Plus className="h-3.5 w-3.5" /> Add
          </button>
        )}
      </div>

      {adding && (
        <div className="mb-4 p-4 bg-gray-50 border border-gray-200 rounded-xl space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Certification Name *</label>
              <input
                type="text"
                value={form.cert_name}
                onChange={e => setForm(f => ({ ...f, cert_name: e.target.value }))}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="e.g., NICET Level II"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Certificate Number</label>
              <input
                type="text"
                value={form.cert_number}
                onChange={e => setForm(f => ({ ...f, cert_number: e.target.value }))}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Issuing Authority</label>
              <input
                type="text"
                value={form.issuing_authority}
                onChange={e => setForm(f => ({ ...f, issuing_authority: e.target.value }))}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="e.g., TDLR, NICET"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Issued Date</label>
              <input
                type="date"
                value={form.issued_date}
                onChange={e => setForm(f => ({ ...f, issued_date: e.target.value }))}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Expiration Date</label>
              <input
                type="date"
                value={form.expiration_date}
                onChange={e => setForm(f => ({ ...f, expiration_date: e.target.value }))}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Notes</label>
              <input
                type="text"
                value={form.notes}
                onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleAdd}
              disabled={!form.cert_name.trim() || saving}
              className="px-4 py-2 text-sm font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
            >
              {saving ? 'Saving...' : 'Save'}
            </button>
            <button
              onClick={() => setAdding(false)}
              className="px-4 py-2 text-sm font-medium text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {certs.length === 0 ? (
        <div className="text-center py-8">
          <Clock className="h-8 w-8 text-gray-200 mx-auto mb-2" />
          <p className="text-sm text-gray-400">No certifications on file</p>
        </div>
      ) : (
        <div className="space-y-2">
          {certs.map(cert => {
            const status = getStatus(cert);
            const badge = statusBadge[status];
            const Icon = badge.icon;
            return (
              <div key={cert.id} className={`p-4 rounded-xl border ${badge.bg} flex items-center gap-4`}>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-sm font-semibold text-gray-900">{cert.cert_name}</span>
                    <span className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${badge.text}`}>
                      <Icon className="h-3 w-3" />
                      {badge.label}
                    </span>
                  </div>
                  <div className="flex items-center gap-4 text-xs text-gray-600">
                    {cert.cert_number && <span>#{cert.cert_number}</span>}
                    {cert.issuing_authority && <span>{cert.issuing_authority}</span>}
                    {cert.expiration_date && (
                      <span>Expires: {new Date(cert.expiration_date).toLocaleDateString()}</span>
                    )}
                  </div>
                  {cert.notes && <p className="text-xs text-gray-500 mt-1">{cert.notes}</p>}
                </div>
                <button
                  onClick={() => handleDelete(cert.id)}
                  className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
