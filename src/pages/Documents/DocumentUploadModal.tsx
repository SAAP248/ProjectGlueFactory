import { useState, useRef, useCallback } from 'react';
import { X, Upload, FileText, Plus, Check, Loader2 } from 'lucide-react';
import type { DocumentCategory, DocumentUploadContext } from './types';
import { fileTypeLabel, fileTypeColor } from './useDocuments';

interface PendingFile {
  file: File;
  description: string;
  categoryId: string;
  uploadedBy: string;
  showInPortal: boolean;
}

interface Props {
  context: DocumentUploadContext;
  categories: DocumentCategory[];
  onUpload: (file: File, ctx: DocumentUploadContext, uploadedBy: string, description: string, categoryId: string, showInPortal: boolean) => Promise<any>;
  onCreateCategory: (name: string, color: string) => Promise<DocumentCategory | null>;
  onClose: () => Promise<void>;
}

const CATEGORY_COLORS = [
  '#ef4444', '#f97316', '#eab308', '#22c55e',
  '#14b8a6', '#3b82f6', '#8b5cf6', '#ec4899', '#6b7280',
];

export default function DocumentUploadModal({ context, categories, onUpload, onCreateCategory, onClose }: Props) {
  const [pendingFiles, setPendingFiles] = useState<PendingFile[]>([]);
  const [dragging, setDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploaded, setUploaded] = useState<string[]>([]);
  const [showNewCategory, setShowNewCategory] = useState(false);
  const [newCatName, setNewCatName] = useState('');
  const [newCatColor, setNewCatColor] = useState(CATEGORY_COLORS[5]);
  const [creatingCat, setCreatingCat] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const addFiles = useCallback((files: FileList | null) => {
    if (!files) return;
    const newPending: PendingFile[] = Array.from(files).map(file => ({
      file,
      description: '',
      categoryId: '',
      uploadedBy: '',
      showInPortal: false,
    }));
    setPendingFiles(prev => [...prev, ...newPending]);
  }, []);

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    addFiles(e.dataTransfer.files);
  }, [addFiles]);

  function removeFile(idx: number) {
    setPendingFiles(prev => prev.filter((_, i) => i !== idx));
  }

  function updateFile(idx: number, updates: Partial<PendingFile>) {
    setPendingFiles(prev => prev.map((f, i) => i === idx ? { ...f, ...updates } : f));
  }

  async function handleCreateCategory() {
    if (!newCatName.trim()) return;
    setCreatingCat(true);
    const cat = await onCreateCategory(newCatName.trim(), newCatColor);
    if (cat) {
      setPendingFiles(prev => prev.map(f => f.categoryId === '' ? { ...f, categoryId: cat.id } : f));
    }
    setNewCatName('');
    setShowNewCategory(false);
    setCreatingCat(false);
  }

  async function handleUpload() {
    if (pendingFiles.length === 0) return;
    setUploading(true);
    for (let i = 0; i < pendingFiles.length; i++) {
      const pf = pendingFiles[i];
      await onUpload(pf.file, context, pf.uploadedBy, pf.description, pf.categoryId, pf.showInPortal);
      setUploaded(prev => [...prev, pf.file.name]);
    }
    setUploading(false);
    await onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="text-lg font-bold text-gray-900">Upload Documents</h2>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          {context.companyName && (
            <div className="bg-blue-50 border border-blue-100 rounded-xl px-4 py-2.5 text-sm text-blue-700">
              Uploading to: <span className="font-semibold">{context.companyName}</span>
              {context.siteName && <span> / {context.siteName}</span>}
              {context.systemName && <span> / {context.systemName}</span>}
            </div>
          )}

          <div
            onDragOver={e => { e.preventDefault(); setDragging(true); }}
            onDragLeave={() => setDragging(false)}
            onDrop={onDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`border-2 border-dashed rounded-2xl p-10 text-center cursor-pointer transition-all ${
              dragging
                ? 'border-blue-400 bg-blue-50'
                : 'border-gray-200 hover:border-blue-300 hover:bg-gray-50'
            }`}
          >
            <div className="w-12 h-12 rounded-2xl bg-gray-100 flex items-center justify-center mx-auto mb-3">
              <Upload className="h-6 w-6 text-gray-400" />
            </div>
            <p className="text-sm font-semibold text-gray-700">Drop files here or click to browse</p>
            <p className="text-xs text-gray-400 mt-1">PDF, Word, Excel, images, and more</p>
            <input
              ref={fileInputRef}
              type="file"
              multiple
              className="hidden"
              onChange={e => addFiles(e.target.files)}
            />
          </div>

          {pendingFiles.length > 0 && (
            <div className="space-y-3">
              {showNewCategory ? (
                <div className="bg-gray-50 rounded-xl border border-gray-200 p-4">
                  <p className="text-xs font-semibold text-gray-600 mb-3">New Category</p>
                  <div className="flex items-center gap-2 mb-3">
                    <input
                      type="text"
                      value={newCatName}
                      onChange={e => setNewCatName(e.target.value)}
                      placeholder="Category name..."
                      className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      autoFocus
                      onKeyDown={e => e.key === 'Enter' && handleCreateCategory()}
                    />
                    <div className="flex gap-1.5">
                      {CATEGORY_COLORS.map(c => (
                        <button
                          key={c}
                          onClick={() => setNewCatColor(c)}
                          className={`w-6 h-6 rounded-full border-2 transition-all ${newCatColor === c ? 'border-gray-700 scale-110' : 'border-transparent'}`}
                          style={{ backgroundColor: c }}
                        />
                      ))}
                    </div>
                    <button
                      onClick={handleCreateCategory}
                      disabled={creatingCat || !newCatName.trim()}
                      className="px-3 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors"
                    >
                      {creatingCat ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                    </button>
                    <button
                      onClick={() => setShowNewCategory(false)}
                      className="px-3 py-2 bg-gray-100 text-gray-600 rounded-lg text-sm font-medium hover:bg-gray-200 transition-colors"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ) : null}

              {pendingFiles.map((pf, idx) => (
                <div key={idx} className="bg-gray-50 rounded-xl border border-gray-200 p-4">
                  <div className="flex items-start gap-3 mb-3">
                    <div className="w-10 h-10 rounded-xl bg-white border border-gray-200 flex items-center justify-center flex-shrink-0">
                      <FileText className="h-5 w-5 text-gray-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-gray-900 truncate">{pf.file.name}</p>
                      <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${fileTypeColor(pf.file.type)}`}>
                        {fileTypeLabel(pf.file.type)}
                      </span>
                    </div>
                    <button
                      onClick={() => removeFile(idx)}
                      className="w-7 h-7 rounded-lg flex items-center justify-center text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors flex-shrink-0"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-xs font-medium text-gray-500 mb-1">Category</label>
                      <div className="flex gap-1.5">
                        <select
                          value={pf.categoryId}
                          onChange={e => updateFile(idx, { categoryId: e.target.value })}
                          className="flex-1 border border-gray-200 rounded-lg px-2 py-1.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                          <option value="">No category</option>
                          {categories.map(cat => (
                            <option key={cat.id} value={cat.id}>{cat.name}</option>
                          ))}
                        </select>
                        <button
                          onClick={() => setShowNewCategory(true)}
                          className="w-8 h-8 flex items-center justify-center border border-gray-200 rounded-lg text-gray-400 hover:text-blue-600 hover:border-blue-300 transition-colors bg-white"
                          title="New category"
                        >
                          <Plus className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-500 mb-1">Uploaded by</label>
                      <input
                        type="text"
                        value={pf.uploadedBy}
                        onChange={e => updateFile(idx, { uploadedBy: e.target.value })}
                        placeholder="Your name..."
                        className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div className="col-span-2">
                      <label className="block text-xs font-medium text-gray-500 mb-1">Description</label>
                      <input
                        type="text"
                        value={pf.description}
                        onChange={e => updateFile(idx, { description: e.target.value })}
                        placeholder="Optional description..."
                        className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div className="col-span-2">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <div
                          className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                            pf.showInPortal ? 'bg-blue-600' : 'bg-gray-300'
                          }`}
                          onClick={() => updateFile(idx, { showInPortal: !pf.showInPortal })}
                        >
                          <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${
                            pf.showInPortal ? 'translate-x-4' : 'translate-x-0.5'
                          }`} />
                        </div>
                        <span className="text-xs text-gray-600">Visible in customer portal</span>
                      </label>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="flex items-center justify-between px-6 py-4 border-t border-gray-100">
          <p className="text-sm text-gray-500">
            {pendingFiles.length} file{pendingFiles.length !== 1 ? 's' : ''} selected
          </p>
          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-800 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleUpload}
              disabled={pendingFiles.length === 0 || uploading}
              className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white rounded-xl text-sm font-semibold transition-colors"
            >
              {uploading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Uploading {uploaded.length + 1} of {pendingFiles.length}...
                </>
              ) : (
                <>
                  <Upload className="h-4 w-4" />
                  Upload {pendingFiles.length > 0 ? `${pendingFiles.length} ` : ''}Document{pendingFiles.length !== 1 ? 's' : ''}
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
