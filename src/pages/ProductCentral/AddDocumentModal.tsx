import { useState } from 'react';
import { X, FileText } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import type { PCDocument } from './types';

interface Props {
  productId: string;
  onClose: () => void;
  onAdded: (doc: PCDocument) => void;
}

const DOC_TYPES = [
  { value: 'spec_sheet', label: 'Spec Sheet' },
  { value: 'white_paper', label: 'White Paper' },
  { value: 'install_guide', label: 'Install Guide' },
  { value: 'manual', label: 'Manual' },
  { value: 'other', label: 'Other' },
];

export default function AddDocumentModal({ productId, onClose, onAdded }: Props) {
  const [title, setTitle] = useState('');
  const [url, setUrl] = useState('');
  const [docType, setDocType] = useState('spec_sheet');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  async function handleSave() {
    if (!title.trim()) { setError('Please enter a document title.'); return; }
    if (!url.trim()) { setError('Please enter a document URL.'); return; }
    setSaving(true);
    setError('');
    const { data, error: err } = await supabase
      .from('product_central_documents')
      .insert({ product_id: productId, title: title.trim(), url: url.trim(), doc_type: docType })
      .select()
      .maybeSingle();
    if (err) { setError('Failed to save document. Please try again.'); setSaving(false); return; }
    if (data) onAdded(data as PCDocument);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
        <div className="flex items-center justify-between p-5 border-b border-gray-200">
          <div className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-blue-600" />
            <h2 className="text-base font-bold text-gray-900">Add Document</h2>
          </div>
          <button onClick={onClose} className="p-1 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="p-5 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">Document Title *</label>
            <input
              type="text"
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="e.g. Installation Guide v3.2"
              className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">Document URL *</label>
            <input
              type="url"
              value={url}
              onChange={e => setUrl(e.target.value)}
              placeholder="https://example.com/document.pdf"
              className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">Document Type</label>
            <select
              value={docType}
              onChange={e => setDocType(e.target.value)}
              className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
            >
              {DOC_TYPES.map(t => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>
          </div>
          {error && <p className="text-xs text-red-600">{error}</p>}
        </div>
        <div className="flex justify-end gap-2 p-5 border-t border-gray-200">
          <button onClick={onClose} className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors">
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
          >
            {saving ? 'Saving...' : 'Add Document'}
          </button>
        </div>
      </div>
    </div>
  );
}
