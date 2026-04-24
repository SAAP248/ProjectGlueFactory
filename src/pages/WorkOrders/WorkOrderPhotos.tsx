import { useCallback, useEffect, useRef, useState } from 'react';
import { Camera, Upload, X, Trash2, Pencil, Check, Image as ImageIcon } from 'lucide-react';
import { supabase } from '../../lib/supabase';

interface Attachment {
  id: string;
  work_order_id: string;
  file_name: string;
  file_type: string;
  file_url: string;
  caption: string | null;
  file_size_bytes: number | null;
  created_at: string;
}

interface Props {
  workOrderId: string;
  readOnly?: boolean;
  compact?: boolean;
}

const MAX_FILE_BYTES = 4 * 1024 * 1024;

export default function WorkOrderPhotos({ workOrderId, readOnly = false, compact = false }: Props) {
  const [photos, setPhotos] = useState<Attachment[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [lightbox, setLightbox] = useState<Attachment | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editCaption, setEditCaption] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from('work_order_attachments')
      .select('*')
      .eq('work_order_id', workOrderId)
      .order('created_at', { ascending: false });
    if (data) setPhotos(data as Attachment[]);
    setLoading(false);
  }, [workOrderId]);

  useEffect(() => { load(); }, [load]);

  async function handleFiles(files: FileList | null) {
    if (!files || files.length === 0) return;
    setUploadError(null);
    setUploading(true);
    try {
      const rows: Array<Omit<Attachment, 'id' | 'created_at'>> = [];
      for (const file of Array.from(files)) {
        if (!file.type.startsWith('image/')) continue;
        if (file.size > MAX_FILE_BYTES) {
          setUploadError(`${file.name} is larger than 4MB and was skipped.`);
          continue;
        }
        const dataUrl = await readFileAsDataUrl(file);
        rows.push({
          work_order_id: workOrderId,
          file_name: file.name,
          file_type: 'image',
          file_url: dataUrl,
          caption: null,
          file_size_bytes: file.size,
        });
      }
      if (rows.length > 0) {
        await supabase.from('work_order_attachments').insert(rows);
        await load();
      }
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  }

  async function saveCaption(id: string) {
    await supabase
      .from('work_order_attachments')
      .update({ caption: editCaption.trim() || null })
      .eq('id', id);
    setPhotos(prev => prev.map(p => p.id === id ? { ...p, caption: editCaption.trim() || null } : p));
    setEditingId(null);
    setEditCaption('');
  }

  async function deletePhoto(id: string) {
    if (!confirm('Delete this photo?')) return;
    await supabase.from('work_order_attachments').delete().eq('id', id);
    setPhotos(prev => prev.filter(p => p.id !== id));
    setLightbox(curr => (curr?.id === id ? null : curr));
  }

  const gridClass = compact
    ? 'grid grid-cols-4 gap-2'
    : 'grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3';

  return (
    <div className="space-y-3">
      {!readOnly && (
        <div className="flex items-center gap-3">
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 transition-colors disabled:opacity-60"
          >
            <Upload className="h-4 w-4" />
            {uploading ? 'Uploading…' : 'Upload Photos'}
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            capture="environment"
            className="hidden"
            onChange={e => handleFiles(e.target.files)}
          />
          <p className="text-xs text-gray-500">Max 4MB per image. JPG/PNG/HEIC.</p>
        </div>
      )}

      {uploadError && (
        <p className="text-xs text-red-600">{uploadError}</p>
      )}

      {loading ? (
        <div className="py-10 flex items-center justify-center">
          <div className="animate-spin rounded-full h-6 w-6 border-2 border-blue-600 border-t-transparent" />
        </div>
      ) : photos.length === 0 ? (
        <div className="text-center py-10 border-2 border-dashed border-gray-200 rounded-2xl bg-gray-50">
          <Camera className="h-8 w-8 text-gray-300 mx-auto mb-2" />
          <p className="text-sm text-gray-500 font-medium">No photos yet</p>
          {!readOnly && (
            <p className="text-xs text-gray-400 mt-1">Upload photos or take them from the Tech Portal.</p>
          )}
        </div>
      ) : (
        <div className={gridClass}>
          {photos.map(photo => (
            <div key={photo.id} className="group relative bg-white rounded-xl border border-gray-200 overflow-hidden">
              {photo.file_type === 'image' ? (
                <button onClick={() => setLightbox(photo)} className="block w-full">
                  <img src={photo.file_url} alt={photo.caption || photo.file_name} className={`w-full object-cover ${compact ? 'h-20' : 'h-36'}`} />
                </button>
              ) : (
                <div className={`flex items-center justify-center bg-gray-100 ${compact ? 'h-20' : 'h-36'}`}>
                  <ImageIcon className="h-8 w-8 text-gray-400" />
                </div>
              )}
              {!compact && (
                <div className="px-2.5 py-2 border-t border-gray-100">
                  {editingId === photo.id ? (
                    <div className="flex items-center gap-1">
                      <input
                        autoFocus
                        value={editCaption}
                        onChange={e => setEditCaption(e.target.value)}
                        onKeyDown={e => { if (e.key === 'Enter') saveCaption(photo.id); if (e.key === 'Escape') setEditingId(null); }}
                        placeholder="Add a description…"
                        className="flex-1 text-xs border border-gray-200 rounded-md px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                      <button onClick={() => saveCaption(photo.id)} className="p-1 rounded-md hover:bg-emerald-50">
                        <Check className="h-3.5 w-3.5 text-emerald-600" />
                      </button>
                      <button onClick={() => { setEditingId(null); setEditCaption(''); }} className="p-1 rounded-md hover:bg-gray-100">
                        <X className="h-3.5 w-3.5 text-gray-500" />
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-start justify-between gap-2">
                      <p className={`text-xs flex-1 min-w-0 ${photo.caption ? 'text-gray-800' : 'text-gray-400 italic'}`}>
                        {photo.caption || 'No description'}
                      </p>
                      {!readOnly && (
                        <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button onClick={() => { setEditingId(photo.id); setEditCaption(photo.caption || ''); }} className="p-1 rounded-md hover:bg-blue-50">
                            <Pencil className="h-3 w-3 text-blue-600" />
                          </button>
                          <button onClick={() => deletePhoto(photo.id)} className="p-1 rounded-md hover:bg-red-50">
                            <Trash2 className="h-3 w-3 text-red-600" />
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {lightbox && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4" onClick={() => setLightbox(null)}>
          <button
            onClick={() => setLightbox(null)}
            className="absolute top-4 right-4 w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white"
          >
            <X className="h-5 w-5" />
          </button>
          <div className="max-w-5xl w-full" onClick={e => e.stopPropagation()}>
            <img src={lightbox.file_url} alt={lightbox.caption || lightbox.file_name} className="w-full max-h-[80vh] object-contain rounded-xl" />
            <p className="mt-3 text-sm text-white/90 text-center">
              {lightbox.caption || lightbox.file_name}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}
