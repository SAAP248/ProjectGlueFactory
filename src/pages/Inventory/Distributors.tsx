import { Plus, ShoppingCart } from 'lucide-react';

export default function Distributors() {
  const distributors = [
    { id: 1, name: 'Security Systems Supply Co', contact: 'John Anderson', phone: '(555) 111-2222', email: 'orders@securitysupply.com', terms: 'Net 30', active: true },
    { id: 2, name: 'National Alarm Distributors', contact: 'Sarah Martinez', phone: '(555) 333-4444', email: 'sales@nationalalarm.com', terms: 'Net 45', active: true },
    { id: 3, name: 'Electronic Components Inc', contact: 'Mike Thompson', phone: '(555) 555-6666', email: 'info@electroniccomp.com', terms: 'Net 30', active: true },
  ];

  return (
    <div className="p-6">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Distributors</h1>
          <p className="text-gray-600 mt-1">Manage your supplier relationships</p>
        </div>
        <button className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium">
          <Plus className="h-5 w-5 mr-2" />
          New Distributor
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Distributor</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Contact</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Phone</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Email</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Payment Terms</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Status</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {distributors.map((dist) => (
                <tr key={dist.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <div className="flex items-center">
                      <div className="bg-blue-100 p-2 rounded-lg mr-3">
                        <ShoppingCart className="h-5 w-5 text-blue-600" />
                      </div>
                      <span className="font-semibold text-gray-900">{dist.name}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-900">{dist.contact}</td>
                  <td className="px-6 py-4 text-sm text-gray-900">{dist.phone}</td>
                  <td className="px-6 py-4 text-sm text-gray-600">{dist.email}</td>
                  <td className="px-6 py-4 text-sm text-gray-900">{dist.terms}</td>
                  <td className="px-6 py-4">
                    <span className="px-3 py-1 text-xs font-medium rounded-full bg-green-100 text-green-800">
                      Active
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
