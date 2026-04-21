import { Plus } from 'lucide-react';

export default function Statements() {
  const statements = [
    { id: 1, number: 'STMT-202403', customer: 'Acme Corporation', statementDate: '2024-03-01', period: 'March 2024', beginningBalance: 8500, charges: 12500, payments: 5000, endingBalance: 16000, sent: true },
    { id: 2, number: 'STMT-202403', customer: 'Downtown Mall', statementDate: '2024-03-01', period: 'March 2024', beginningBalance: 30000, charges: 45000, payments: 30000, endingBalance: 45000, sent: true },
    { id: 3, number: 'STMT-202402', customer: 'Tech Solutions Inc', statementDate: '2024-02-01', period: 'February 2024', beginningBalance: 0, charges: 2100, payments: 0, endingBalance: 2100, sent: true },
  ];

  return (
    <div className="p-6">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Statements</h1>
          <p className="text-gray-600 mt-1">Customer account statements</p>
        </div>
        <button className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium">
          <Plus className="h-5 w-5 mr-2" />
          Generate Statements
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Statement #</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Customer</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Period</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Beginning</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Charges</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Payments</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Ending Balance</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {statements.map((stmt) => (
                <tr key={stmt.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 font-semibold text-gray-900">{stmt.number}</td>
                  <td className="px-6 py-4 text-sm text-gray-900">{stmt.customer}</td>
                  <td className="px-6 py-4 text-sm text-gray-900">{stmt.period}</td>
                  <td className="px-6 py-4 text-sm text-gray-900">${stmt.beginningBalance.toLocaleString()}</td>
                  <td className="px-6 py-4 text-sm text-red-600">+${stmt.charges.toLocaleString()}</td>
                  <td className="px-6 py-4 text-sm text-green-600">-${stmt.payments.toLocaleString()}</td>
                  <td className="px-6 py-4 text-sm font-semibold text-gray-900">${stmt.endingBalance.toLocaleString()}</td>
                  <td className="px-6 py-4">
                    <button className="text-blue-600 hover:text-blue-700 text-sm font-medium mr-3">
                      View
                    </button>
                    <button className="text-blue-600 hover:text-blue-700 text-sm font-medium">
                      Send
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
