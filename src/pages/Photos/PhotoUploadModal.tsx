import { useState, useRef } from 'react';
import { X, Camera, Upload, Tag, Plus, Check, User } from 'lucide-react';
import type { PhotoLabel, PhotoUploadContext } from './types';

interface PendingFile {
  file: File;
  previewUrl: string;
  caption: string;
  labelIds: string[];
}

interface Props {
  context: PhotoUploadContext;
  allLabels: PhotoLabel[];
  onUpload: (file: File, ctx: PhotoUploadContext, uploadedBy: string, caption: string | null, labelIds: string[]) => Promise<any>;
  onCreateLabel: (name: string, color: string) => Promise<PhotoLabel | null>;
  onClose: () => void;
}

const PRESET_COLORS = [
  '#EF4444', '#F97316', '#F59E0B', '#84CC16', '#10B981',
  '#06B6D4', '#3B82F6', '#8B5CF6', '#EC4899', '#6B7280',
];

export default function PhotoUploadModal({ context, allLabels, onUpload, onCreateLabel, onClose }: Props) {
  const [pendingFiles, setPendingFiles] = useState<PendingFile[]>([]);
  const [uploadedBy, setUploadedBy] = useState('');
  const [uploading, setUploading] = useState(false);
  const [newLabelName, setNewLabelName] = useState('');
  const [newLabelColor, setNewLabelColor] = useState('#3B82F6');
  const [showNewLabel, setShowNewLabel] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const cameraRef = useRef<HTMLInputElement>(null);

  function addFiles(files: FileList | null) {
    if (!files) return;
    const newItems: PendingFile[] = Array.from(files).map(file => ({
      file,
      previewUrl: URL.createObjectURL(file),
      caption: '',
      labelIds: [],
    }));
    setPendingFiles(prev => [...prev, ...newItems]);
  }

  function removeFile(index: number) {
    setPendingFiles(prev => {
      URL.revokeObjectURL(prev[index].previewUrl);
      return prev.filter((_, i) => i !== index);
    });
  }

  function updateCaption(index: number, caption: string) {
    setPendingFiles(prev => prev.map((f, i) => i === index ? { ...f, caption } : f));
  }

  function toggleLabel(index: number, labelId: string) {
    setPendingFiles(prev => prev.map((f, i) => {
      if (i !== index) return f;
      const ids = f.labelIds.includes(labelId)
        ? f.labelIds.filter(id => id !== labelId)
        : [...f.labelIds, labelId];
      return { ...f, labelIds: ids };
    }));
  }

  async function handleCreateLabel() {
    if (!newLabelName.trim()) return;
    const label = await onCreateLabel(newLabelName.trim(), newLabelColor);
    if (label) {
      setNewLabelName('');
      setNewLabelColor('#3B82F6');
      setShowNewLabel(false);
    }
  }

  async function handleSubmit() {
    if (pendingFiles.length === 0) return;
    setUploading(true);
    for (const item of pendingFiles) {
      await onUpload(item.file, context, uploadedBy || 'Unknown', item.caption || null, item.labelIds);
    }
    pendingFiles.forEach(f => URL.revokeObjectURL(f.previewUrl));
    setUploading(false);
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div>
            <h2 className="text-lg font-bold text-gray-900">Upload Photos</h2>
            {(context.companyName || context.siteName || context.systemName) && (
              <p className="text-sm text-gray-500 mt-0.5">
                {[context.systemName, context.siteName, context.companyName].filter(Boolean).join(' · ')}
              </p>
            )}
          </div>
          <button onClick={onClose} className="p-2 rounded-xl hover:bg-gray-100 text-gray-400 transition-colors">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              <User className="h-4 w-4 inline mr-1.5 text-gray-400" />
              Uploaded by
            </label>
            <input
              type="text"
              value={uploadedBy}
              onChange={e => setUploadedBy(e.target.value)}
              placeholder="Your name..."
              className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {pendingFiles.length === 0 ? (
            <div
              className="border-2 border-dashed border-gray-200 rounded-2xl p-10 text-center hover:border-blue-400 transition-colors cursor-pointer"
              onClick={() => fileRef.current?.click()}
              onDragOver={e => e.preventDefault()}
              onDrop={e => { e.preventDefault(); addFiles(e.dataTransfer.files); }}
            >
              <div className="w-16 h-16 rounded-2xl bg-blue-50 flex items-center justify-center mx-auto mb-4">
                <Upload className="h-8 w-8 text-blue-500" />
              </div>
              <p className="text-base font-semibold text-gray-700 mb-1">Drop photos here</p>
              <p className="text-sm text-gray-400 mb-4">or click to select files</p>
              <div className="flex justify-center gap-3">
                <button
                  onClick={e => { e.stopPropagation(); fileRef.current?.click(); }}
                  className="flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl text-sm font-medium transition-colors"
                >
                  <Upload className="h-4 w-4" />
                  Browse Files
                </button>
                <button
                  onClick={e => { e.stopPropagation(); cameraRef.current?.click(); }}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-medium transition-colors"
                >
                  <Camera className="h-4 w-4" />
                  Take Photo
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {pendingFiles.map((item, index) => (
                <div key={index} className="flex gap-4 p-4 bg-gray-50 rounded-2xl border border-gray-100">
                  <div className="relative flex-shrink-0">
                    <img
                      src={item.previewUrl}
                      alt=""
                      className="w-24 h-24 object-cover rounded-xl"
                    />
                    <button
                      onClick={() => removeFile(index)}
                      className="absolute -top-2 -right-2 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center hover:bg-red-600 transition-colors"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                  <div className="flex-1 min-w-0 space-y-3">
                    <input
                      type="text"
                      value={item.caption}
                      onChange={e => updateCaption(index, e.target.value)}
                      placeholder="Add a caption..."
                      className="w-full border border-gray-200 bg-white rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <div>
                      <p className="text-xs font-medium text-gray-500 mb-1.5 flex items-center gap-1">
                        <Tag className="h-3.5 w-3.5" />
                        Labels
                      </p>
                      <div className="flex flex-wrap gap-1.5">
                        {allLabels.map(label => {
                          const active = item.labelIds.includes(label.id);
                          return (
                            <button
                              key={label.id}
                              onClick={() => toggleLabel(index, label.id)}
                              className={`px-2.5 py-1 rounded-full text-xs font-semibold border transition-all ${
                                active
                                  ? 'border-transparent text-white'
                                  : 'border-gray-200 text-gray-500 bg-white hover:border-gray-300'
                              }`}
                              style={active ? { backgroundColor: label.color } : {}}
                            >
                              {label.name}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                </div>
              ))}

              <button
                onClick={() => fileRef.current?.click()}
                className="w-full flex items-center justify-center gap-2 py-3 border-2 border-dashed border-gray-200 rounded-2xl text-sm text-gray-500 hover:border-blue-400 hover:text-blue-600 transition-colors"
              >
                <Plus className="h-4 w-4" />
                Add more photos
              </button>
            </div>
          )}

          <div className="border-t border-gray-100 pt-4">
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm font-medium text-gray-700 flex items-center gap-1.5">
                <Tag className="h-4 w-4 text-gray-400" />
                Manage Labels
              </p>
              <button
                onClick={() => setShowNewLabel(v => !v)}
                className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 transition-colors font-medium"
              >
                <Plus className="h-3.5 w-3.5" />
                New Label
              </button>
            </div>

            {showNewLabel && (
              <div className="bg-gray-50 rounded-xl p-3 space-y-2 mb-3">
                <input
                  type="text"
                  value={newLabelName}
                  onChange={e => setNewLabelName(e.target.value)}
                  placeholder="Label name..."
                  className="w-full border border-gray-200 bg-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <div className="flex items-center gap-2">
                  <div className="flex gap-1.5 flex-wrap flex-1">
                    {PRESET_COLORS.map(color => (
                      <button
                        key={color}
                        onClick={() => setNewLabelColor(color)}
                        className={`w-6 h-6 rounded-full flex-shrink-0 transition-transform hover:scale-110 ${
                          newLabelColor === color ? 'ring-2 ring-offset-1 ring-gray-400 scale-110' : ''
                        }`}
                        style={{ backgroundColor: color }}
                      />
                    ))}
                  </div>
                  <button
                    onClick={handleCreateLabel}
                    disabled={!newLabelName.trim()}
                    className="flex items-center gap-1 px-3 py-1.5 bg-blue-600 disabled:bg-gray-300 text-white rounded-lg text-xs font-medium transition-colors hover:bg-blue-700 flex-shrink-0"
                  >
                    <Check className="h-3.5 w-3.5" />
                    Create
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="px-6 py-4 border-t border-gray-100 flex justify-between items-center">
          <button onClick={onClose} className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-800 transition-colors">
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={pendingFiles.length === 0 || uploading}
            className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 text-white rounded-xl text-sm font-semibold transition-colors"
          >
            {uploading ? (
              <span className="flex items-center gap-2">
                <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Uploading...
              </span>
            ) : (
              <>
                <Upload className="h-4 w-4" />
                Upload {pendingFiles.length > 0 ? `${pendingFiles.length} Photo${pendingFiles.length > 1 ? 's' : ''}` : 'Photos'}
              </>
            )}
          </button>
        </div>
      </div>

      <input ref={fileRef} type="file" accept="image/*" multiple className="hidden" onChange={e => addFiles(e.target.files)} />
      <input ref={cameraRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={e => addFiles(e.target.files)} />
    </div>
  );
}
