import { Plus, DollarSign } from 'lucide-react';

export default function Invoices() {
  const stats = [
    { label: 'Total Invoices', value: '234', color: 'bg-blue-500' },
    { label: 'Outstanding', value: '$142K', color: 'bg-orange-500' },
    { label: 'Paid This Month', value: '$287K', color: 'bg-green-500' },
    { label: 'Overdue', value: '$34K', color: 'bg-red-500' },
  ];

  const invoices = [
    { id: 1, number: 'INV-2145', customer: 'Acme Corporation', date: '2024-03-15', dueDate: '2024-04-14', amount: 12500, paid: 0, status: 'Outstanding' },
    { id: 2, number: 'INV-2144', customer: 'Smith Residence', date: '2024-03-12', dueDate: '2024-04-11', amount: 350, paid: 350, status: 'Paid' },
    { id: 3, number: 'INV-2143', customer: 'Downtown Mall', date: '2024-02-28', dueDate: '2024-03-29', amount: 45000, paid: 30000, status: 'Partial' },
    { id: 4, number: 'INV-2142', customer: 'Tech Solutions Inc', date: '2024-02-15', dueDate: '2024-03-16', amount: 2100, paid: 0, status: 'Overdue' },
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Paid': return 'bg-green-100 text-green-800';
      case 'Partial': return 'bg-yellow-100 text-yellow-800';
      case 'Outstanding': return 'bg-blue-100 text-blue-800';
      case 'Overdue': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="p-6">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Invoices</h1>
          <p className="text-gray-600 mt-1">Manage customer invoices and payments</p>
        </div>
        <button className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium">
          <Plus className="h-5 w-5 mr-2" />
          New Invoice
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
              <div className={`${stat.color} w-12 h-12 rounded-xl flex items-center justify-center`}>
                <DollarSign className="h-6 w-6 text-white" />
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Invoice #</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Customer</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Date</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Due Date</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Amount</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Paid</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Balance</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Status</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {invoices.map((invoice) => (
                <tr key={invoice.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 font-semibold text-gray-900">{invoice.number}</td>
                  <td className="px-6 py-4 text-sm text-gray-900">{invoice.customer}</td>
                  <td className="px-6 py-4 text-sm text-gray-900">{invoice.date}</td>
                  <td className="px-6 py-4 text-sm text-gray-900">{invoice.dueDate}</td>
                  <td className="px-6 py-4 text-sm font-medium text-gray-900">${invoice.amount.toLocaleString()}</td>
                  <td className="px-6 py-4 text-sm text-green-600">${invoice.paid.toLocaleString()}</td>
                  <td className="px-6 py-4 text-sm font-semibold text-gray-900">
                    ${(invoice.amount - invoice.paid).toLocaleString()}
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-3 py-1 text-xs font-medium rounded-full ${getStatusColor(invoice.status)}`}>
                      {invoice.status}
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
