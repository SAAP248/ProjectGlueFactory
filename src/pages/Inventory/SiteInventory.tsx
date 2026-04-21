import { Search, MapPin } from 'lucide-react';

export default function SiteInventory() {
  const inventory = [
    { id: 1, product: 'Control Panel DS7240', serialNumber: 'SN-123456789', macAddress: '00:1A:2B:3C:4D:5E', site: 'Acme Corp - Building A', customer: 'Acme Corporation', installDate: '2023-05-15', warrantyExp: '2026-05-15', status: 'Active' },
    { id: 2, product: 'IP Camera 4MP', serialNumber: 'SN-987654321', macAddress: '00:1A:2B:3C:4D:5F', site: 'Downtown Mall - East Entrance', customer: 'Downtown Mall', installDate: '2023-08-22', warrantyExp: '2026-08-22', status: 'Active' },
    { id: 3, product: 'Motion Detector PIR', serialNumber: 'SN-456789123', macAddress: 'N/A', site: 'Smith Residence', customer: 'Smith Residence', installDate: '2024-01-10', warrantyExp: '2027-01-10', status: 'Active' },
  ];

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Site Inventory</h1>
        <p className="text-gray-600 mt-1">Track installed equipment at customer locations</p>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100">
        <div className="p-6 border-b border-gray-100">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search by serial number, MAC address..."
              className="pl-10 pr-4 py-2 w-full border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Product</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Serial Number</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">MAC Address</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Site</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Install Date</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Warranty Exp</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Status</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {inventory.map((item) => (
                <tr key={item.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 font-medium text-gray-900">{item.product}</td>
                  <td className="px-6 py-4 font-mono text-sm text-gray-900">{item.serialNumber}</td>
                  <td className="px-6 py-4 font-mono text-sm text-gray-600">{item.macAddress}</td>
                  <td className="px-6 py-4">
                    <div className="flex items-center">
                      <MapPin className="h-4 w-4 text-gray-400 mr-2" />
                      <div>
                        <div className="text-sm font-medium text-gray-900">{item.site}</div>
                        <div className="text-xs text-gray-600">{item.customer}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-900">{item.installDate}</td>
                  <td className="px-6 py-4 text-sm text-gray-900">{item.warrantyExp}</td>
                  <td className="px-6 py-4">
                    <span className="px-3 py-1 text-xs font-medium rounded-full bg-green-100 text-green-800">
                      {item.status}
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
