import { FileText, Calendar } from 'lucide-react';
import type { PortalEstimate } from './types';

const STATUS_COLORS: Record<string, string> = {
  draft: 'bg-gray-100 text-gray-600',
  sent: 'bg-blue-100 text-blue-700',
  approved: 'bg-emerald-100 text-emerald-700',
  declined: 'bg-red-100 text-red-700',
  expired: 'bg-orange-100 text-orange-700',
};

interface Props {
  estimates: PortalEstimate[];
  loading: boolean;
}

export default function EstimatesTab({ estimates, loading }: Props) {
  if (loading) return <div className="flex justify-center py-16"><div className="animate-spin rounded-full h-7 w-7 border-2 border-blue-600 border-t-transparent" /></div>;

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Estimates</h2>
          <p className="text-sm text-gray-500 mt-0.5">{estimates.length} estimate{estimates.length !== 1 ? 's' : ''}</p>
        </div>
      </div>

      {estimates.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-200 p-12 text-center">
          <div className="w-14 h-14 rounded-2xl bg-gray-100 flex items-center justify-center mx-auto mb-4">
            <FileText className="h-7 w-7 text-gray-400" />
          </div>
          <p className="text-gray-600 font-semibold">No estimates yet</p>
          <p className="text-sm text-gray-400 mt-1">Your estimates will appear here when created.</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50">
                  <th className="text-left px-5 py-3 font-semibold text-gray-600">Estimate #</th>
                  <th className="text-left px-5 py-3 font-semibold text-gray-600">Date</th>
                  <th className="text-left px-5 py-3 font-semibold text-gray-600">Expires</th>
                  <th className="text-left px-5 py-3 font-semibold text-gray-600">Status</th>
                  <th className="text-right px-5 py-3 font-semibold text-gray-600">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {estimates.map(est => (
                  <tr key={est.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-5 py-3.5">
                      <span className="font-semibold text-gray-900">{est.estimate_number}</span>
                    </td>
                    <td className="px-5 py-3.5 text-gray-600">
                      {new Date(est.estimate_date).toLocaleDateString()}
                    </td>
                    <td className="px-5 py-3.5 text-gray-600">
                      {est.expiration_date ? new Date(est.expiration_date).toLocaleDateString() : '—'}
                    </td>
                    <td className="px-5 py-3.5">
                      <span className={`text-xs font-semibold px-2.5 py-1 rounded-full capitalize ${STATUS_COLORS[est.status] || 'bg-gray-100 text-gray-600'}`}>
                        {est.status}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-right font-bold text-gray-900">
                      ${est.total.toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
