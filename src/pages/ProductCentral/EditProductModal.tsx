import { useState } from 'react';
import { X } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import type { PCProduct } from './types';

interface Props {
  product: PCProduct;
  onClose: () => void;
  onSaved: (updated: PCProduct) => void;
}

interface FieldDef {
  key: string;
  label: string;
  type: 'text' | 'number' | 'textarea' | 'boolean' | 'select';
  group: string;
  options?: string[];
}

const FIELDS: FieldDef[] = [
  { key: 'name', label: 'Product Name', type: 'text', group: 'General' },
  { key: 'manufacturer', label: 'Brand', type: 'text', group: 'General' },
  { key: 'sku', label: 'SKU', type: 'text', group: 'General' },
  { key: 'upc', label: 'UPC', type: 'text', group: 'General' },
  { key: 'model_number', label: 'Model Number', type: 'text', group: 'General' },
  { key: 'product_type', label: 'Product Type', type: 'text', group: 'General' },
  { key: 'category', label: 'Category', type: 'text', group: 'General' },
  { key: 'subcategory', label: 'Subcategory', type: 'text', group: 'General' },
  { key: 'default_system_type', label: 'Default System Type', type: 'text', group: 'General' },
  { key: 'image_url', label: 'Image URL', type: 'text', group: 'General' },
  { key: 'product_url', label: 'Manufacturer URL', type: 'text', group: 'General' },
  { key: 'description', label: 'Short Description', type: 'textarea', group: 'Descriptions' },
  { key: 'long_description', label: 'Long Description', type: 'textarea', group: 'Descriptions' },
  { key: 'price', label: 'Sales Price', type: 'number', group: 'Pricing' },
  { key: 'msrp', label: 'MSRP', type: 'number', group: 'Pricing' },
  { key: 'min_sales_price', label: 'Minimum Sales Price', type: 'number', group: 'Pricing' },
  { key: 'cost', label: 'Cost', type: 'number', group: 'Pricing' },
  { key: 'raw_cost', label: 'Raw Cost', type: 'number', group: 'Pricing' },
  { key: 'is_taxable', label: 'Taxable', type: 'boolean', group: 'Tax' },
  { key: 'tax_code', label: 'Tax Code', type: 'text', group: 'Tax' },
  { key: 'purchase_account', label: 'Purchase Account', type: 'text', group: 'Accounting' },
  { key: 'sales_account', label: 'Sales Account', type: 'text', group: 'Accounting' },
  { key: 'preferred_distributor', label: 'Preferred Distributor', type: 'text', group: 'Accounting' },
  { key: 'install_hours', label: 'Install Hours', type: 'number', group: 'Installation' },
  { key: 'install_information', label: 'Install Information', type: 'textarea', group: 'Installation' },
];

const GROUPS = ['General', 'Descriptions', 'Pricing', 'Tax', 'Accounting', 'Installation'];

export default function EditProductModal({ product, onClose, onSaved }: Props) {
  const [form, setForm] = useState<Record<string, unknown>>({ ...product });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [activeGroup, setActiveGroup] = useState('General');

  function setField(key: string, value: unknown) {
    setForm(prev => ({ ...prev, [key]: value }));
  }

  async function handleSave() {
    setSaving(true);
    setError('');
    const updates: Record<string, unknown> = {};
    for (const f of FIELDS) {
      const val = form[f.key];
      if (f.type === 'number') {
        updates[f.key] = val === '' || val == null ? null : Number(val);
      } else if (f.type === 'boolean') {
        updates[f.key] = !!val;
      } else {
        updates[f.key] = typeof val === 'string' && val.trim() === '' ? null : val;
      }
    }
    const { data, error: err } = await supabase
      .from('products')
      .update(updates)
      .eq('id', product.id)
      .select()
      .maybeSingle();
    if (err) {
      setError('Failed to save changes. Please try again.');
      setSaving(false);
      return;
    }
    if (data) onSaved(data as unknown as PCProduct);
  }

  const groupFields = FIELDS.filter(f => f.group === activeGroup);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between p-5 border-b border-gray-200 flex-shrink-0">
          <h2 className="text-base font-bold text-gray-900">Edit Product</h2>
          <button onClick={onClose} className="p-1 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Group tabs */}
        <div className="flex border-b border-gray-200 px-5 flex-shrink-0 overflow-x-auto">
          {GROUPS.map(g => (
            <button
              key={g}
              onClick={() => setActiveGroup(g)}
              className={`px-3 py-2.5 text-xs font-semibold border-b-2 whitespace-nowrap transition-colors ${
                activeGroup === g ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-800'
              }`}
            >
              {g}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto p-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {groupFields.map(field => {
              const val = form[field.key];
              if (field.type === 'boolean') {
                return (
                  <div key={field.key} className="flex items-center justify-between col-span-2 sm:col-span-1">
                    <label className="text-sm font-medium text-gray-700">{field.label}</label>
                    <button
                      type="button"
                      onClick={() => setField(field.key, !val)}
                      className={`relative inline-flex h-6 w-11 rounded-full transition-colors ${val ? 'bg-blue-600' : 'bg-gray-200'}`}
                    >
                      <span className={`inline-block h-5 w-5 rounded-full bg-white shadow transform transition-transform mt-0.5 ${val ? 'translate-x-5 ml-0.5' : 'translate-x-0.5'}`} />
                    </button>
                  </div>
                );
              }
              if (field.type === 'textarea') {
                return (
                  <div key={field.key} className="col-span-2">
                    <label className="block text-xs font-semibold text-gray-700 mb-1">{field.label}</label>
                    <textarea
                      value={(val as string) ?? ''}
                      onChange={e => setField(field.key, e.target.value)}
                      rows={3}
                      className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                    />
                  </div>
                );
              }
              return (
                <div key={field.key}>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">{field.label}</label>
                  <input
                    type={field.type === 'number' ? 'number' : 'text'}
                    step={field.type === 'number' ? '0.01' : undefined}
                    value={val != null ? String(val) : ''}
                    onChange={e => setField(field.key, e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              );
            })}
          </div>
          {error && <p className="text-xs text-red-600 mt-3">{error}</p>}
        </div>

        <div className="flex justify-end gap-2 p-5 border-t border-gray-200 flex-shrink-0">
          <button onClick={onClose} className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors">
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
          >
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  );
}
