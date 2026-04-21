import { Plus, FileText } from 'lucide-react';

export default function Estimates() {
  const stats = [
    { label: 'Total Estimates', value: '156', color: 'bg-blue-500' },
    { label: 'Pending', value: '42', color: 'bg-yellow-500' },
    { label: 'Accepted', value: '89', color: 'bg-green-500' },
    { label: 'Total Value', value: '$428K', color: 'bg-purple-500' },
  ];

  const estimates = [
    { id: 1, number: 'EST-1045', customer: 'Acme Corporation', date: '2024-03-15', expirationDate: '2024-04-15', amount: 75000, status: 'Pending' },
    { id: 2, number: 'EST-1044', customer: 'Downtown Mall', date: '2024-03-12', expirationDate: '2024-04-12', amount: 125000, status: 'Accepted' },
    { id: 3, number: 'EST-1043', customer: 'Tech Solutions Inc', date: '2024-03-10', expirationDate: '2024-04-10', amount: 42000, status: 'Pending' },
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Pending': return 'bg-yellow-100 text-yellow-800';
      case 'Accepted': return 'bg-green-100 text-green-800';
      case 'Declined': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="p-6">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Estimates</h1>
          <p className="text-gray-600 mt-1">Create and manage customer estimates</p>
        </div>
        <button className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium">
          <Plus className="h-5 w-5 mr-2" />
          New Estimate
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
        {stats.map((stat, index) => (
          <div key={index} className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">{stat.label}</p>
                <p className="text-3xl font-bold text-gray-900 mt-2">{stat.value}</p>
              </div>
              <div className={`${stat.color} w-12 h-12 rounded-xl`} />
            </div>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Estimate #</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Customer</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Date</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Expiration</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Amount</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Status</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {estimates.map((estimate) => (
                <tr key={estimate.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <div className="flex items-center">
                      <FileText className="h-5 w-5 text-gray-400 mr-3" />
                      <span className="font-semibold text-gray-900">{estimate.number}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-900">{estimate.customer}</td>
                  <td className="px-6 py-4 text-sm text-gray-900">{estimate.date}</td>
                  <td className="px-6 py-4 text-sm text-gray-900">{estimate.expirationDate}</td>
                  <td className="px-6 py-4 text-sm font-semibold text-gray-900">${estimate.amount.toLocaleString()}</td>
                  <td className="px-6 py-4">
                    <span className={`px-3 py-1 text-xs font-medium rounded-full ${getStatusColor(estimate.status)}`}>
                      {estimate.status}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <button className="text-blue-600 hover:text-blue-700 text-sm font-medium">
                      View
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
