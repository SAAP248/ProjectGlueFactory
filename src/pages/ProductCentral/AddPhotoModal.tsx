import { useState } from 'react';
import { X, Camera } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import type { PCPhoto } from './types';

interface Props {
  productId: string;
  onClose: () => void;
  onAdded: (photo: PCPhoto) => void;
}

export default function AddPhotoModal({ productId, onClose, onAdded }: Props) {
  const [url, setUrl] = useState('');
  const [title, setTitle] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  async function handleSave() {
    if (!url.trim()) { setError('Please enter an image URL.'); return; }
    setSaving(true);
    setError('');
    const { data, error: err } = await supabase
      .from('product_central_photos')
      .insert({ product_id: productId, url: url.trim(), title: title.trim() || null, sort_order: 0 })
      .select()
      .maybeSingle();
    if (err) { setError('Failed to save photo. Please try again.'); setSaving(false); return; }
    if (data) onAdded(data as PCPhoto);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
        <div className="flex items-center justify-between p-5 border-b border-gray-200">
          <div className="flex items-center gap-2">
            <Camera className="h-5 w-5 text-blue-600" />
            <h2 className="text-base font-bold text-gray-900">Add Photo</h2>
          </div>
          <button onClick={onClose} className="p-1 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="p-5 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">Image URL *</label>
            <input
              type="url"
              value={url}
              onChange={e => setUrl(e.target.value)}
              placeholder="https://example.com/photo.jpg"
              className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">Caption (optional)</label>
            <input
              type="text"
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="e.g. Front view, Rear panel"
              className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          {url && (
            <div className="bg-gray-50 rounded-lg border border-gray-100 p-4 flex items-center justify-center">
              <img src={url} alt="Preview" className="max-h-32 object-contain" onError={e => (e.currentTarget.style.display = 'none')} />
            </div>
          )}
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
            {saving ? 'Saving...' : 'Add Photo'}
          </button>
        </div>
      </div>
    </div>
  );
}
