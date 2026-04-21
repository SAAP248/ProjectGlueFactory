import { Plus } from 'lucide-react';

export default function Packages() {
  const packages = [
    { id: 1, name: 'Basic Home Security Package', products: 5, cost: 425.00, price: 799.00, active: true },
    { id: 2, name: 'Commercial Starter Kit', products: 12, cost: 1250.00, price: 2499.00, active: true },
    { id: 3, name: 'Premium Smart Home Bundle', products: 8, cost: 850.00, price: 1599.00, active: true },
  ];

  return (
    <div className="p-6">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Packages</h1>
          <p className="text-gray-600 mt-1">Product bundles and packages</p>
        </div>
        <button className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium">
          <Plus className="h-5 w-5 mr-2" />
          New Package
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {packages.map((pkg) => (
          <div key={pkg.id} className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <div className="mb-4">
              <h3 className="text-lg font-bold text-gray-900 mb-2">{pkg.name}</h3>
              <p className="text-sm text-gray-600">{pkg.products} products included</p>
            </div>
            <div className="space-y-2 mb-4">
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Total Cost</span>
                <span className="text-sm font-medium text-gray-900">${pkg.cost.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Package Price</span>
                <span className="text-sm font-bold text-green-600">${pkg.price.toFixed(2)}</span>
              </div>
              <div className="flex justify-between pt-2 border-t border-gray-100">
                <span className="text-sm font-medium text-gray-900">Profit Margin</span>
                <span className="text-sm font-bold text-green-600">
                  {(((pkg.price - pkg.cost) / pkg.price) * 100).toFixed(0)}%
                </span>
              </div>
            </div>
            <button className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium text-sm">
              View Details
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
