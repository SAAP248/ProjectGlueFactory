import { Plus } from 'lucide-react';

export default function PurchaseOrders() {
  const orders = [
    { id: 1, poNumber: 'PO-1234', distributor: 'Security Systems Supply Co', orderDate: '2024-03-10', expectedDate: '2024-03-24', amount: 15420, status: 'Pending' },
    { id: 2, poNumber: 'PO-1233', distributor: 'National Alarm Distributors', orderDate: '2024-03-08', expectedDate: '2024-03-22', amount: 8950, status: 'Approved' },
    { id: 3, poNumber: 'PO-1232', distributor: 'Electronic Components Inc', orderDate: '2024-03-05', expectedDate: '2024-03-15', amount: 12300, status: 'Received' },
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Pending': return 'bg-yellow-100 text-yellow-800';
      case 'Approved': return 'bg-blue-100 text-blue-800';
      case 'Received': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="p-6">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Purchase Orders</h1>
          <p className="text-gray-600 mt-1">Track orders from distributors</p>
        </div>
        <button className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium">
          <Plus className="h-5 w-5 mr-2" />
          New Purchase Order
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">PO Number</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Distributor</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Order Date</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Expected Date</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Amount</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Status</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {orders.map((order) => (
                <tr key={order.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 font-semibold text-gray-900">{order.poNumber}</td>
                  <td className="px-6 py-4 text-sm text-gray-900">{order.distributor}</td>
                  <td className="px-6 py-4 text-sm text-gray-900">{order.orderDate}</td>
                  <td className="px-6 py-4 text-sm text-gray-900">{order.expectedDate}</td>
                  <td className="px-6 py-4 text-sm font-medium text-gray-900">${order.amount.toLocaleString()}</td>
                  <td className="px-6 py-4">
                    <span className={`px-3 py-1 text-xs font-medium rounded-full ${getStatusColor(order.status)}`}>
                      {order.status}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <button className="text-blue-600 hover:text-blue-700 text-sm font-medium">
                      View Details
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
