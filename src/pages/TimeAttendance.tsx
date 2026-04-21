import { Clock, MapPin } from 'lucide-react';

export default function TimeAttendance() {
  const timeEntries = [
    { id: 1, employee: 'Mike Johnson', date: '2024-03-17', clockIn: '8:00 AM', clockOut: '5:15 PM', location: 'Main Office', hours: 8.25, status: 'Approved' },
    { id: 2, employee: 'Sarah Williams', date: '2024-03-17', clockIn: '8:15 AM', clockOut: '4:45 PM', location: 'Main Office', hours: 8.5, status: 'Approved' },
    { id: 3, employee: 'David Brown', date: '2024-03-17', clockIn: '7:45 AM', clockOut: '5:00 PM', location: 'Field', hours: 9.25, status: 'Pending' },
    { id: 4, employee: 'Mike Johnson', date: '2024-03-16', clockIn: '8:05 AM', clockOut: '5:00 PM', location: 'Main Office', hours: 8.92, status: 'Approved' },
  ];

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Time & Attendance</h1>
        <p className="text-gray-600 mt-1">Track employee time and manage payroll</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Hours Today</p>
              <p className="text-3xl font-bold text-gray-900 mt-2">26.0</p>
            </div>
            <div className="bg-blue-500 w-12 h-12 rounded-xl flex items-center justify-center">
              <Clock className="h-6 w-6 text-white" />
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
          <div>
            <p className="text-sm font-medium text-gray-600">Clocked In</p>
            <p className="text-3xl font-bold text-green-600 mt-2">3</p>
          </div>
        </div>
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
          <div>
            <p className="text-sm font-medium text-gray-600">Clocked Out</p>
            <p className="text-3xl font-bold text-gray-900 mt-2">2</p>
          </div>
        </div>
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
          <div>
            <p className="text-sm font-medium text-gray-600">Pending Approval</p>
            <p className="text-3xl font-bold text-yellow-600 mt-2">1</p>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100">
        <div className="p-6 border-b border-gray-100">
          <h2 className="text-lg font-bold text-gray-900">Time Entries</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Employee</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Date</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Clock In</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Clock Out</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Location</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Hours</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Status</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {timeEntries.map((entry) => (
                <tr key={entry.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 font-medium text-gray-900">{entry.employee}</td>
                  <td className="px-6 py-4 text-sm text-gray-900">{entry.date}</td>
                  <td className="px-6 py-4 text-sm text-gray-900">{entry.clockIn}</td>
                  <td className="px-6 py-4 text-sm text-gray-900">{entry.clockOut}</td>
                  <td className="px-6 py-4">
                    <div className="flex items-center text-sm text-gray-600">
                      <MapPin className="h-4 w-4 mr-1" />
                      {entry.location}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm font-semibold text-gray-900">{entry.hours.toFixed(2)}</td>
                  <td className="px-6 py-4">
                    <span className={`px-3 py-1 text-xs font-medium rounded-full ${
                      entry.status === 'Approved' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                    }`}>
                      {entry.status}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <button className="text-blue-600 hover:text-blue-700 text-sm font-medium">
                      {entry.status === 'Pending' ? 'Approve' : 'Edit'}
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
