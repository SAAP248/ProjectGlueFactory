import { Plus, Warehouse, DollarSign, Package } from 'lucide-react';

export default function Warehouses() {
  const warehouses = [
    { id: 1, name: 'Main Warehouse', location: 'Houston, TX', products: 1247, value: 328450, unrealized: 145200, manager: 'Robert Smith' },
    { id: 2, name: 'North Branch', location: 'Dallas, TX', products: 856, value: 198300, unrealized: 89400, manager: 'Jennifer Wilson' },
    { id: 3, name: 'East Distribution', location: 'Austin, TX', products: 634, value: 156700, unrealized: 67800, manager: 'Michael Brown' },
  ];

  return (
    <div className="p-6">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Warehouses</h1>
          <p className="text-gray-600 mt-1">Manage warehouse locations and inventory</p>
        </div>
        <button className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium">
          <Plus className="h-5 w-5 mr-2" />
          New Warehouse
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {warehouses.map((warehouse) => (
          <div key={warehouse.id} className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="bg-blue-100 p-3 rounded-xl">
                <Warehouse className="h-6 w-6 text-blue-600" />
              </div>
              <button className="text-blue-600 hover:text-blue-700 text-sm font-medium">
                View Details
              </button>
            </div>
            <h3 className="text-lg font-bold text-gray-900 mb-1">{warehouse.name}</h3>
            <p className="text-sm text-gray-600 mb-4">{warehouse.location}</p>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <Package className="h-4 w-4 text-gray-400 mr-2" />
                  <span className="text-sm text-gray-600">Products</span>
                </div>
                <span className="text-sm font-semibold text-gray-900">{warehouse.products.toLocaleString()}</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <DollarSign className="h-4 w-4 text-gray-400 mr-2" />
                  <span className="text-sm text-gray-600">Total Value</span>
                </div>
                <span className="text-sm font-semibold text-gray-900">${warehouse.value.toLocaleString()}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Unrealized Profit</span>
                <span className="text-sm font-semibold text-green-600">${warehouse.unrealized.toLocaleString()}</span>
              </div>
              <div className="pt-3 border-t border-gray-100">
                <div className="text-xs text-gray-600">Manager</div>
                <div className="text-sm font-medium text-gray-900">{warehouse.manager}</div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
