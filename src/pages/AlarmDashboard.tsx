import { Bell, AlertTriangle, CheckCircle, Clock } from 'lucide-react';

export default function AlarmDashboard() {
  const partners = [
    { id: 1, name: 'Central Station Alpha', status: 'online', events: 156, lastContact: '2 min ago' },
    { id: 2, name: 'Guardian Monitoring', status: 'online', events: 89, lastContact: '5 min ago' },
    { id: 3, name: 'SecureWatch Services', status: 'warning', events: 234, lastContact: '15 min ago' },
  ];

  const recentEvents = [
    { id: 1, time: '2:45 PM', company: 'Acme Corp HQ', site: 'Building A', type: 'Burglar Alarm', zone: 'Zone 3', severity: 'critical', partner: 'Central Station Alpha' },
    { id: 2, time: '2:38 PM', company: 'Tech Solutions', site: 'Main Office', type: 'Fire Alarm', zone: 'Zone 1', severity: 'critical', partner: 'Guardian Monitoring' },
    { id: 3, time: '2:22 PM', company: 'Downtown Mall', site: 'East Entrance', type: 'Door Sensor', zone: 'Zone 7', severity: 'high', partner: 'Central Station Alpha' },
    { id: 4, time: '2:15 PM', company: 'Smith Warehouse', site: 'Loading Dock', type: 'Motion Detected', zone: 'Zone 12', severity: 'medium', partner: 'SecureWatch Services' },
    { id: 5, time: '2:03 PM', company: 'Office Plaza', site: 'Floor 5', type: 'Glass Break', zone: 'Zone 4', severity: 'high', partner: 'Guardian Monitoring' },
    { id: 6, time: '1:58 PM', company: 'Retail Store #3', site: 'Main Floor', type: 'Low Battery', zone: 'Zone 2', severity: 'low', partner: 'Central Station Alpha' },
  ];

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'bg-red-100 text-red-800 border-red-200';
      case 'high': return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'low': return 'bg-blue-100 text-blue-800 border-blue-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Alarm Dashboard</h1>
        <p className="text-gray-600 mt-1">Monitor alarm events from central stations and communication partners</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        {partners.map((partner) => (
          <div key={partner.id} className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center space-x-3">
                <div className={`w-3 h-3 rounded-full ${partner.status === 'online' ? 'bg-green-500 animate-pulse' : 'bg-yellow-500'}`} />
                <h3 className="font-semibold text-gray-900">{partner.name}</h3>
              </div>
              <Bell className="h-5 w-5 text-gray-400" />
            </div>
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Total Events</span>
                <span className="text-xl font-bold text-gray-900">{partner.events}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Last Contact</span>
                <span className="text-sm font-medium text-gray-900">{partner.lastContact}</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100">
        <div className="p-6 border-b border-gray-100">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-gray-900">Recent Event History</h2>
            <div className="flex items-center space-x-2">
              <button className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50">
                Filter
              </button>
              <button className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700">
                Acknowledge All
              </button>
            </div>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Time</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Company</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Site</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Event Type</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Zone</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Severity</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Partner</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {recentEvents.map((event) => (
                <tr key={event.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{event.time}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{event.company}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{event.site}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{event.type}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{event.zone}</td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-3 py-1 text-xs font-medium rounded-full border ${getSeverityColor(event.severity)}`}>
                      {event.severity.toUpperCase()}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{event.partner}</td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <button className="text-blue-600 hover:text-blue-700 text-sm font-medium">
                      Acknowledge
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
