import { Search, DollarSign } from 'lucide-react';

export default function Transactions() {
  const stats = [
    { label: 'Total Received', value: '$287,450', color: 'bg-green-500' },
    { label: 'Credit Card', value: '$145,200', color: 'bg-blue-500' },
    { label: 'ACH', value: '$98,750', color: 'bg-purple-500' },
    { label: 'Check', value: '$43,500', color: 'bg-orange-500' },
  ];

  const transactions = [
    { id: 1, number: 'TXN-5678', customer: 'Acme Corporation', invoice: 'INV-2140', date: '2024-03-15', amount: 5000, method: 'Credit Card', reference: '****1234' },
    { id: 2, number: 'TXN-5677', customer: 'Smith Residence', invoice: 'INV-2144', date: '2024-03-14', amount: 350, method: 'ACH', reference: 'ACH-789456' },
    { id: 3, number: 'TXN-5676', customer: 'Downtown Mall', invoice: 'INV-2143', date: '2024-03-13', amount: 30000, method: 'Check', reference: 'CHK-4567' },
    { id: 4, number: 'TXN-5675', customer: 'Tech Solutions Inc', invoice: 'INV-2141', date: '2024-03-12', amount: 2100, method: 'Credit Card', reference: '****5678' },
  ];

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Transactions</h1>
        <p className="text-gray-600 mt-1">Payment history and transaction records</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
        {stats.map((stat, index) => (
          <div key={index} className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">{stat.label}</p>
                <p className="text-2xl font-bold text-gray-900 mt-2">{stat.value}</p>
              </div>
              <div className={`${stat.color} w-12 h-12 rounded-xl flex items-center justify-center`}>
                <DollarSign className="h-6 w-6 text-white" />
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100">
        <div className="p-6 border-b border-gray-100">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search transactions..."
              className="pl-10 pr-4 py-2 w-full border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Transaction #</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Customer</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Invoice</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Date</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Amount</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Method</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Reference</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {transactions.map((txn) => (
                <tr key={txn.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 font-semibold text-gray-900">{txn.number}</td>
                  <td className="px-6 py-4 text-sm text-gray-900">{txn.customer}</td>
                  <td className="px-6 py-4 text-sm text-blue-600">{txn.invoice}</td>
                  <td className="px-6 py-4 text-sm text-gray-900">{txn.date}</td>
                  <td className="px-6 py-4 text-sm font-semibold text-green-600">${txn.amount.toLocaleString()}</td>
                  <td className="px-6 py-4">
                    <span className={`px-3 py-1 text-xs font-medium rounded-full ${
                      txn.method === 'Credit Card' ? 'bg-blue-100 text-blue-800' :
                      txn.method === 'ACH' ? 'bg-purple-100 text-purple-800' :
                      'bg-orange-100 text-orange-800'
                    }`}>
                      {txn.method}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600 font-mono">{txn.reference}</td>
                  <td className="px-6 py-4">
                    <button className="text-blue-600 hover:text-blue-700 text-sm font-medium">
                      View Receipt
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
