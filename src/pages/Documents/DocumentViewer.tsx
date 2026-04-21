import { useState } from 'react';
import { X, Download, ExternalLink, ChevronLeft, ChevronRight, Trash2, Eye, EyeOff, CreditCard as Edit2, Check } from 'lucide-react';
import type { Document, DocumentCategory } from './types';
import { formatBytes, fileTypeLabel, fileTypeColor } from './useDocuments';
import { supabase } from '../../lib/supabase';

interface Props {
  document: Document;
  documents: Document[];
  categories: DocumentCategory[];
  onClose: () => void;
  onNavigate: (doc: Document) => void;
  onUpdate: (id: string, updates: Partial<Document>) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}

export default function DocumentViewer({ document, documents, categories, onClose, onNavigate, onUpdate, onDelete }: Props) {
  const [editDesc, setEditDesc] = useState(false);
  const [descText, setDescText] = useState(document.description ?? '');
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const currentIdx = documents.findIndex(d => d.id === document.id);
  const hasPrev = currentIdx > 0;
  const hasNext = currentIdx < documents.length - 1;

  const isPdf = document.file_type === 'application/pdf';
  const isImage = document.file_type.startsWith('image/');
  const category = categories.find(c => c.id === document.category_id);

  async function saveDesc() {
    setSaving(true);
    await onUpdate(document.id, { description: descText || null });
    setSaving(false);
    setEditDesc(false);
  }

  async function togglePortal() {
    await onUpdate(document.id, { show_in_portal: !document.show_in_portal });
  }

  async function handleDelete() {
    await onDelete(document.id);
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm" onClick={onClose}>
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl max-h-[90vh] flex flex-col overflow-hidden mx-4"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 flex-shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <span className={`text-xs font-bold px-2 py-1 rounded-lg flex-shrink-0 ${fileTypeColor(document.file_type)}`}>
              {fileTypeLabel(document.file_type)}
            </span>
            <div className="min-w-0">
              <p className="text-sm font-bold text-gray-900 truncate">{document.file_name}</p>
              <p className="text-xs text-gray-400">
                {formatBytes(document.file_size_bytes)}
                {document.file_size_bytes ? ' · ' : ''}
                {new Date(document.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}
                {document.uploaded_by ? ` · ${document.uploaded_by}` : ''}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <button
              onClick={togglePortal}
              title={document.show_in_portal ? 'Hide from portal' : 'Show in portal'}
              className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${
                document.show_in_portal
                  ? 'bg-blue-100 text-blue-600 hover:bg-blue-200'
                  : 'bg-gray-100 text-gray-400 hover:bg-gray-200'
              }`}
            >
              {document.show_in_portal ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
            </button>
            <a
              href={document.file_url}
              download={document.file_name}
              target="_blank"
              rel="noopener noreferrer"
              className="w-8 h-8 rounded-lg flex items-center justify-center bg-gray-100 text-gray-500 hover:bg-blue-100 hover:text-blue-600 transition-colors"
              title="Download"
            >
              <Download className="h-4 w-4" />
            </a>
            <a
              href={document.file_url}
              target="_blank"
              rel="noopener noreferrer"
              className="w-8 h-8 rounded-lg flex items-center justify-center bg-gray-100 text-gray-500 hover:bg-blue-100 hover:text-blue-600 transition-colors"
              title="Open in new tab"
            >
              <ExternalLink className="h-4 w-4" />
            </a>
            {confirmDelete ? (
              <div className="flex items-center gap-1.5 bg-red-50 rounded-lg px-2 py-1.5">
                <span className="text-xs text-red-600 font-medium">Delete?</span>
                <button
                  onClick={handleDelete}
                  className="text-xs font-bold text-red-600 hover:text-red-800"
                >
                  Yes
                </button>
                <button
                  onClick={() => setConfirmDelete(false)}
                  className="text-xs text-gray-500 hover:text-gray-700"
                >
                  No
                </button>
              </div>
            ) : (
              <button
                onClick={() => setConfirmDelete(true)}
                className="w-8 h-8 rounded-lg flex items-center justify-center bg-gray-100 text-gray-400 hover:bg-red-100 hover:text-red-500 transition-colors"
                title="Delete"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            )}
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-lg flex items-center justify-center bg-gray-100 text-gray-500 hover:bg-gray-200 transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        <div className="flex flex-1 overflow-hidden">
          <div className="flex-1 bg-gray-100 flex items-center justify-center relative overflow-hidden">
            {hasPrev && (
              <button
                onClick={() => onNavigate(documents[currentIdx - 1])}
                className="absolute left-3 top-1/2 -translate-y-1/2 w-10 h-10 bg-white rounded-xl shadow flex items-center justify-center hover:bg-gray-50 transition-colors z-10"
              >
                <ChevronLeft className="h-5 w-5 text-gray-600" />
              </button>
            )}
            {hasNext && (
              <button
                onClick={() => onNavigate(documents[currentIdx + 1])}
                className="absolute right-3 top-1/2 -translate-y-1/2 w-10 h-10 bg-white rounded-xl shadow flex items-center justify-center hover:bg-gray-50 transition-colors z-10"
              >
                <ChevronRight className="h-5 w-5 text-gray-600" />
              </button>
            )}

            {isPdf ? (
              <iframe
                src={document.file_url}
                className="w-full h-full"
                title={document.file_name}
              />
            ) : isImage ? (
              <img
                src={document.file_url}
                alt={document.file_name}
                className="max-w-full max-h-full object-contain"
              />
            ) : (
              <div className="text-center p-10">
                <div className={`inline-flex items-center justify-center w-20 h-20 rounded-2xl text-2xl font-bold mb-4 ${fileTypeColor(document.file_type)}`}>
                  {fileTypeLabel(document.file_type)}
                </div>
                <p className="text-gray-600 font-semibold mb-1">{document.file_name}</p>
                <p className="text-sm text-gray-400 mb-5">Preview not available for this file type</p>
                <a
                  href={document.file_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-semibold transition-colors"
                >
                  <ExternalLink className="h-4 w-4" />
                  Open File
                </a>
              </div>
            )}
          </div>

          <div className="w-72 border-l border-gray-100 flex-shrink-0 overflow-y-auto">
            <div className="p-4 space-y-4">
              {category && (
                <div>
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1.5">Category</p>
                  <span
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-semibold text-white"
                    style={{ backgroundColor: category.color }}
                  >
                    {category.name}
                  </span>
                </div>
              )}

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Description</p>
                  {!editDesc && (
                    <button
                      onClick={() => setEditDesc(true)}
                      className="text-gray-400 hover:text-blue-600 transition-colors"
                    >
                      <Edit2 className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
                {editDesc ? (
                  <div className="space-y-1.5">
                    <textarea
                      value={descText}
                      onChange={e => setDescText(e.target.value)}
                      rows={3}
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                      placeholder="Add a description..."
                      autoFocus
                    />
                    <div className="flex gap-1.5">
                      <button
                        onClick={saveDesc}
                        disabled={saving}
                        className="flex items-center gap-1 px-3 py-1.5 bg-blue-600 text-white rounded-lg text-xs font-medium hover:bg-blue-700 transition-colors"
                      >
                        <Check className="h-3.5 w-3.5" />
                        Save
                      </button>
                      <button
                        onClick={() => { setEditDesc(false); setDescText(document.description ?? ''); }}
                        className="px-3 py-1.5 bg-gray-100 text-gray-600 rounded-lg text-xs font-medium hover:bg-gray-200 transition-colors"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-gray-600">
                    {document.description || <span className="text-gray-400 italic">No description</span>}
                  </p>
                )}
              </div>

              <div>
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1.5">Details</p>
                <div className="space-y-1.5 text-sm">
                  {document.companies?.name && (
                    <div className="flex justify-between">
                      <span className="text-gray-500">Customer</span>
                      <span className="text-gray-800 font-medium text-right max-w-[140px] truncate">{document.companies.name}</span>
                    </div>
                  )}
                  {document.sites?.name && (
                    <div className="flex justify-between">
                      <span className="text-gray-500">Site</span>
                      <span className="text-gray-800 font-medium text-right max-w-[140px] truncate">{document.sites.name}</span>
                    </div>
                  )}
                  {document.customer_systems?.name && (
                    <div className="flex justify-between">
                      <span className="text-gray-500">System</span>
                      <span className="text-gray-800 font-medium text-right max-w-[140px] truncate">{document.customer_systems.name}</span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span className="text-gray-500">Uploaded by</span>
                    <span className="text-gray-800 font-medium">{document.uploaded_by}</span>
                  </div>
                  {document.file_size_bytes && (
                    <div className="flex justify-between">
                      <span className="text-gray-500">File size</span>
                      <span className="text-gray-800 font-medium">{formatBytes(document.file_size_bytes)}</span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span className="text-gray-500">Date</span>
                    <span className="text-gray-800 font-medium">
                      {new Date(document.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}
                    </span>
                  </div>
                </div>
              </div>

              <div>
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Portal Visibility</p>
                <label className="flex items-center gap-2 cursor-pointer">
                  <div
                    className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                      document.show_in_portal ? 'bg-blue-600' : 'bg-gray-300'
                    }`}
                    onClick={togglePortal}
                  >
                    <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${
                      document.show_in_portal ? 'translate-x-4' : 'translate-x-0.5'
                    }`} />
                  </div>
                  <span className="text-sm text-gray-600">
                    {document.show_in_portal ? 'Visible to customer' : 'Internal only'}
                  </span>
                </label>
              </div>

              {documents.length > 1 && (
                <div>
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
                    {currentIdx + 1} of {documents.length}
                  </p>
                  <div className="flex gap-2">
                    <button
                      onClick={() => hasPrev && onNavigate(documents[currentIdx - 1])}
                      disabled={!hasPrev}
                      className="flex-1 flex items-center justify-center gap-1 py-2 border border-gray-200 rounded-lg text-xs font-medium text-gray-600 hover:bg-gray-50 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                    >
                      <ChevronLeft className="h-3.5 w-3.5" />
                      Previous
                    </button>
                    <button
                      onClick={() => hasNext && onNavigate(documents[currentIdx + 1])}
                      disabled={!hasNext}
                      className="flex-1 flex items-center justify-center gap-1 py-2 border border-gray-200 rounded-lg text-xs font-medium text-gray-600 hover:bg-gray-50 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                    >
                      Next
                      <ChevronRight className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
