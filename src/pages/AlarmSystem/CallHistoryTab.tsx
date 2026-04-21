import { Phone, PhoneIncoming, PhoneOutgoing } from 'lucide-react';

interface CallRecord {
  id: string;
  direction: 'inbound' | 'outbound';
  call_date: string;
  duration_minutes: number;
  caller_number: string;
  notes: string;
  contact_name?: string;
}

interface Props {
  calls: CallRecord[];
}

export default function CallHistoryTab({ calls }: Props) {
  if (calls.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 py-20 flex flex-col items-center justify-center text-center">
        <div className="bg-gray-100 p-4 rounded-full mb-4">
          <Phone className="h-8 w-8 text-gray-400" />
        </div>
        <p className="text-gray-500 font-medium">No call history</p>
        <p className="text-sm text-gray-400 mt-1">Call history from the central station will appear here.</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-100">
        <h3 className="text-base font-semibold text-gray-900">Call History</h3>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-100">
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Direction</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Date / Time</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Contact</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Number</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Duration</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Notes</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {calls.map(call => (
              <tr key={call.id} className="hover:bg-gray-50 transition-colors">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    {call.direction === 'inbound'
                      ? <PhoneIncoming className="h-4 w-4 text-emerald-500" />
                      : <PhoneOutgoing className="h-4 w-4 text-blue-500" />}
                    <span className={`text-xs font-medium capitalize ${call.direction === 'inbound' ? 'text-emerald-700' : 'text-blue-700'}`}>
                      {call.direction}
                    </span>
                  </div>
                </td>
                <td className="px-4 py-3 text-gray-600 text-xs">
                  {new Date(call.call_date).toLocaleString()}
                </td>
                <td className="px-4 py-3 text-gray-800">{call.contact_name || '—'}</td>
                <td className="px-4 py-3 font-mono text-gray-600 text-xs">{call.caller_number || '—'}</td>
                <td className="px-4 py-3 text-gray-600">{call.duration_minutes ? `${call.duration_minutes} min` : '—'}</td>
                <td className="px-4 py-3 text-gray-500 max-w-xs truncate">{call.notes || '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
