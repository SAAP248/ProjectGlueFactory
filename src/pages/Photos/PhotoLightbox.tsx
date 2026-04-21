import { useState, useEffect, useRef } from 'react';
import { X, ChevronLeft, ChevronRight, Trash2, CreditCard as Edit2, Check, Eye, EyeOff, MapPin, Building2, Cpu, User, Calendar, Tag, Plus } from 'lucide-react';
import type { Photo, PhotoLabel } from './types';

interface Props {
  photo: Photo;
  photos: Photo[];
  allLabels: PhotoLabel[];
  onClose: () => void;
  onNavigate: (photo: Photo) => void;
  onUpdate: (id: string, updates: { caption?: string | null; show_in_portal?: boolean; labelIds?: string[] }) => void;
  onDelete: (id: string) => void;
}

export default function PhotoLightbox({ photo, photos, allLabels, onClose, onNavigate, onUpdate, onDelete }: Props) {
  const [editingCaption, setEditingCaption] = useState(false);
  const [captionDraft, setCaptionDraft] = useState(photo.caption ?? '');
  const [editingLabels, setEditingLabels] = useState(false);
  const [selectedLabelIds, setSelectedLabelIds] = useState<string[]>(photo.labels?.map(l => l.id) ?? []);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const captionRef = useRef<HTMLTextAreaElement>(null);

  const currentIndex = photos.findIndex(p => p.id === photo.id);

  useEffect(() => {
    setCaptionDraft(photo.caption ?? '');
    setSelectedLabelIds(photo.labels?.map(l => l.id) ?? []);
    setEditingCaption(false);
    setEditingLabels(false);
    setConfirmDelete(false);
  }, [photo.id]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowLeft' && currentIndex > 0) onNavigate(photos[currentIndex - 1]);
      if (e.key === 'ArrowRight' && currentIndex < photos.length - 1) onNavigate(photos[currentIndex + 1]);
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [currentIndex, photos, onClose, onNavigate]);

  useEffect(() => {
    if (editingCaption) captionRef.current?.focus();
  }, [editingCaption]);

  function saveCaption() {
    onUpdate(photo.id, { caption: captionDraft || null });
    setEditingCaption(false);
  }

  function saveLabels() {
    onUpdate(photo.id, { labelIds: selectedLabelIds });
    setEditingLabels(false);
  }

  function toggleLabel(id: string) {
    setSelectedLabelIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  }

  function handleDelete() {
    onDelete(photo.id);
    if (photos.length > 1) {
      const next = currentIndex > 0 ? photos[currentIndex - 1] : photos[currentIndex + 1];
      onNavigate(next);
    } else {
      onClose();
    }
  }

  const currentLabels = photo.labels ?? [];

  return (
    <div className="fixed inset-0 z-50 flex bg-gray-950/95 backdrop-blur-sm">
      <button
        onClick={onClose}
        className="absolute top-4 right-4 z-10 p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors"
      >
        <X className="h-5 w-5" />
      </button>

      {currentIndex > 0 && (
        <button
          onClick={() => onNavigate(photos[currentIndex - 1])}
          className="absolute left-4 top-1/2 -translate-y-1/2 z-10 p-3 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors"
        >
          <ChevronLeft className="h-6 w-6" />
        </button>
      )}
      {currentIndex < photos.length - 1 && (
        <button
          onClick={() => onNavigate(photos[currentIndex + 1])}
          className="absolute right-80 top-1/2 -translate-y-1/2 z-10 p-3 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors"
        >
          <ChevronRight className="h-6 w-6" />
        </button>
      )}

      <div className="flex-1 flex items-center justify-center p-8 min-w-0">
        <img
          src={photo.file_url}
          alt={photo.caption ?? 'Photo'}
          className="max-w-full max-h-full object-contain rounded-xl shadow-2xl"
          style={{ maxHeight: 'calc(100vh - 64px)' }}
        />
      </div>

      <div className="w-80 bg-gray-900 border-l border-white/10 flex flex-col overflow-y-auto flex-shrink-0">
        <div className="p-5 border-b border-white/10">
          <div className="flex items-center justify-between mb-1">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
              {currentIndex + 1} of {photos.length}
            </p>
            <div className="flex items-center gap-1">
              {confirmDelete ? (
                <>
                  <button
                    onClick={handleDelete}
                    className="px-2 py-1 text-xs bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
                  >
                    Confirm Delete
                  </button>
                  <button
                    onClick={() => setConfirmDelete(false)}
                    className="px-2 py-1 text-xs bg-white/10 hover:bg-white/20 text-white rounded-lg transition-colors"
                  >
                    Cancel
                  </button>
                </>
              ) : (
                <button
                  onClick={() => setConfirmDelete(true)}
                  className="p-1.5 rounded-lg text-gray-400 hover:text-red-400 hover:bg-white/10 transition-colors"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              )}
            </div>
          </div>
        </div>

        <div className="p-5 space-y-5 flex-1">
          <div>
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider flex items-center gap-1.5">
                <Edit2 className="h-3.5 w-3.5" />
                Caption
              </p>
              {!editingCaption && (
                <button
                  onClick={() => setEditingCaption(true)}
                  className="text-xs text-blue-400 hover:text-blue-300 transition-colors"
                >
                  Edit
                </button>
              )}
            </div>
            {editingCaption ? (
              <div className="space-y-2">
                <textarea
                  ref={captionRef}
                  value={captionDraft}
                  onChange={e => setCaptionDraft(e.target.value)}
                  rows={3}
                  placeholder="Add a caption..."
                  className="w-full bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                />
                <div className="flex gap-2">
                  <button
                    onClick={saveCaption}
                    className="flex items-center gap-1 px-3 py-1.5 text-xs bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
                  >
                    <Check className="h-3.5 w-3.5" />
                    Save
                  </button>
                  <button
                    onClick={() => { setEditingCaption(false); setCaptionDraft(photo.caption ?? ''); }}
                    className="px-3 py-1.5 text-xs bg-white/10 hover:bg-white/20 text-white rounded-lg transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <p className="text-sm text-gray-300 leading-relaxed">
                {photo.caption || <span className="text-gray-500 italic">No caption</span>}
              </p>
            )}
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider flex items-center gap-1.5">
                <Tag className="h-3.5 w-3.5" />
                Labels
              </p>
              {!editingLabels && (
                <button
                  onClick={() => setEditingLabels(true)}
                  className="text-xs text-blue-400 hover:text-blue-300 transition-colors"
                >
                  Edit
                </button>
              )}
            </div>
            {editingLabels ? (
              <div className="space-y-2">
                <div className="flex flex-wrap gap-1.5">
                  {allLabels.map(label => {
                    const selected = selectedLabelIds.includes(label.id);
                    return (
                      <button
                        key={label.id}
                        onClick={() => toggleLabel(label.id)}
                        className={`px-2.5 py-1 rounded-full text-xs font-semibold border transition-all ${
                          selected
                            ? 'border-transparent text-white'
                            : 'border-white/20 text-gray-400 bg-transparent hover:bg-white/10'
                        }`}
                        style={selected ? { backgroundColor: label.color } : {}}
                      >
                        {label.name}
                      </button>
                    );
                  })}
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={saveLabels}
                    className="flex items-center gap-1 px-3 py-1.5 text-xs bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
                  >
                    <Check className="h-3.5 w-3.5" />
                    Save
                  </button>
                  <button
                    onClick={() => { setEditingLabels(false); setSelectedLabelIds(photo.labels?.map(l => l.id) ?? []); }}
                    className="px-3 py-1.5 text-xs bg-white/10 hover:bg-white/20 text-white rounded-lg transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex flex-wrap gap-1.5">
                {currentLabels.length > 0 ? currentLabels.map(label => (
                  <span
                    key={label.id}
                    className="px-2.5 py-1 rounded-full text-xs font-semibold text-white"
                    style={{ backgroundColor: label.color }}
                  >
                    {label.name}
                  </span>
                )) : (
                  <button
                    onClick={() => setEditingLabels(true)}
                    className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-300 transition-colors"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    Add labels
                  </button>
                )}
              </div>
            )}
          </div>

          <div className="space-y-2.5">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Details</p>
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm text-gray-300">
                <Calendar className="h-4 w-4 text-gray-500 flex-shrink-0" />
                {new Date(photo.taken_at).toLocaleDateString('en-US', {
                  month: 'long', day: 'numeric', year: 'numeric',
                  hour: 'numeric', minute: '2-digit'
                })}
              </div>
              <div className="flex items-center gap-2 text-sm text-gray-300">
                <User className="h-4 w-4 text-gray-500 flex-shrink-0" />
                {photo.uploaded_by}
              </div>
              {photo.company_name && (
                <div className="flex items-center gap-2 text-sm text-gray-300">
                  <Building2 className="h-4 w-4 text-gray-500 flex-shrink-0" />
                  {photo.company_name}
                </div>
              )}
              {photo.site_name && (
                <div className="flex items-center gap-2 text-sm text-gray-300">
                  <MapPin className="h-4 w-4 text-gray-500 flex-shrink-0" />
                  {photo.site_name}
                </div>
              )}
              {photo.system_name && (
                <div className="flex items-center gap-2 text-sm text-gray-300">
                  <Cpu className="h-4 w-4 text-gray-500 flex-shrink-0" />
                  {photo.system_name}
                </div>
              )}
            </div>
          </div>

          <div className="border-t border-white/10 pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-200">Customer Portal</p>
                <p className="text-xs text-gray-500 mt-0.5">Visible to customers in portal</p>
              </div>
              <button
                onClick={() => onUpdate(photo.id, { show_in_portal: !photo.show_in_portal })}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors flex-shrink-0 ${
                  photo.show_in_portal ? 'bg-blue-600' : 'bg-gray-600'
                }`}
              >
                <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  photo.show_in_portal ? 'translate-x-6' : 'translate-x-1'
                }`} />
              </button>
            </div>
            <div className="mt-2 flex items-center gap-1.5 text-xs">
              {photo.show_in_portal ? (
                <span className="flex items-center gap-1 text-blue-400">
                  <Eye className="h-3.5 w-3.5" />
                  Showing in portal
                </span>
              ) : (
                <span className="flex items-center gap-1 text-gray-500">
                  <EyeOff className="h-3.5 w-3.5" />
                  Hidden from portal
                </span>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
