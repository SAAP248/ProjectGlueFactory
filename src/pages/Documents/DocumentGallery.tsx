import { useState, useEffect, useRef } from 'react';
import {
  Search, Upload, X, Eye, EyeOff, Download, ExternalLink,
  FileText, Trash2, SlidersHorizontal, ChevronDown, ArrowUpDown
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import type { Document, DocumentUploadContext, DocumentFilters } from './types';
import { EMPTY_FILTERS } from './types';
import { useDocumentCategories, formatBytes, fileTypeLabel, fileTypeColor } from './useDocuments';
import DocumentUploadModal from './DocumentUploadModal';
import DocumentViewer from './DocumentViewer';

interface Props {
  context: DocumentUploadContext;
}

function toDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = e => resolve(e.target?.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export default function DocumentGallery({ context }: Props) {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState<DocumentFilters>(EMPTY_FILTERS);
  const [searchInput, setSearchInput] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [showUpload, setShowUpload] = useState(false);
  const [viewerDoc, setViewerDoc] = useState<Document | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const searchTimer = useRef<ReturnType<typeof setTimeout>>();

  const { categories, createCategory } = useDocumentCategories();

  useEffect(() => { loadDocuments(); }, [filters, context]);

  async function loadDocuments() {
    setLoading(true);
    let query = supabase
      .from('documents')
      .select(`
        *,
        document_categories(id, name, color),
        companies(name),
        sites(name),
        customer_systems(name)
      `);

    if (context.companyId) query = query.eq('company_id', context.companyId);
    if (context.siteId) query = query.eq('site_id', context.siteId);
    if (context.systemId) query = query.eq('system_id', context.systemId);
    if (filters.showPortalOnly) query = query.eq('show_in_portal', true);
    if (filters.dateFrom) query = query.gte('created_at', filters.dateFrom);
    if (filters.dateTo) query = query.lte('created_at', filters.dateTo + 'T23:59:59');

    const { data } = await query;
    if (data) {
      let mapped = data as Document[];

      if (filters.search) {
        const q = filters.search.toLowerCase();
        mapped = mapped.filter(d =>
          d.file_name.toLowerCase().includes(q) ||
          d.description?.toLowerCase().includes(q) ||
          d.uploaded_by?.toLowerCase().includes(q) ||
          d.document_categories?.name.toLowerCase().includes(q) ||
          d.companies?.name?.toLowerCase().includes(q) ||
          d.sites?.name?.toLowerCase().includes(q)
        );
      }

      if (filters.categoryIds.length > 0) {
        mapped = mapped.filter(d => d.category_id && filters.categoryIds.includes(d.category_id));
      }

      mapped.sort((a, b) => {
        if (filters.sortBy === 'newest') return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        if (filters.sortBy === 'oldest') return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
        if (filters.sortBy === 'name') return a.file_name.localeCompare(b.file_name);
        if (filters.sortBy === 'size') return (b.file_size_bytes ?? 0) - (a.file_size_bytes ?? 0);
        return 0;
      });

      setDocuments(mapped);
    }
    setLoading(false);
  }

  function handleSearch(val: string) {
    setSearchInput(val);
    clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => {
      setFilters(f => ({ ...f, search: val }));
    }, 300);
  }

  function toggleCategory(id: string) {
    setFilters(f => ({
      ...f,
      categoryIds: f.categoryIds.includes(id)
        ? f.categoryIds.filter(x => x !== id)
        : [...f.categoryIds, id],
    }));
  }

  async function handleUpdate(id: string, updates: Partial<Document>) {
    await supabase.from('documents').update(updates).eq('id', id);
    setDocuments(prev => prev.map(d => d.id === id ? { ...d, ...updates } : d));
    if (viewerDoc?.id === id) setViewerDoc(prev => prev ? { ...prev, ...updates } : null);
  }

  async function handleDelete(id: string) {
    await supabase.from('documents').delete().eq('id', id);
    setDocuments(prev => prev.filter(d => d.id !== id));
    setConfirmDeleteId(null);
  }

  async function handleUpload(file: File, ctx: DocumentUploadContext, uploadedBy: string, description: string, categoryId: string, showInPortal: boolean) {
    let fileUrl = '';
    try {
      const ext = file.name.split('.').pop() ?? 'bin';
      const path = `site-documents/${ctx.companyId ?? 'global'}/${crypto.randomUUID()}.${ext}`;
      const { error } = await supabase.storage.from('site-documents').upload(path, file, { contentType: file.type });
      if (!error) {
        const { data: { publicUrl } } = supabase.storage.from('site-documents').getPublicUrl(path);
        fileUrl = publicUrl;
      } else {
        fileUrl = await toDataUrl(file);
      }
    } catch {
      fileUrl = await toDataUrl(file);
    }

    await supabase.from('documents').insert({
      file_name: file.name,
      file_url: fileUrl,
      file_type: file.type || 'application/octet-stream',
      file_size_bytes: file.size,
      description: description || null,
      category_id: categoryId || null,
      company_id: ctx.companyId ?? null,
      site_id: ctx.siteId ?? null,
      system_id: ctx.systemId ?? null,
      uploaded_by: uploadedBy || 'Unknown',
      show_in_portal: showInPortal,
    });
  }

  const activeFilterCount = [
    filters.categoryIds.length > 0,
    filters.showPortalOnly,
    !!filters.dateFrom,
    !!filters.dateTo,
  ].filter(Boolean).length;

  const categoriesInUse = categories.filter(c => documents.some(d => d.category_id === c.id));

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            value={searchInput}
            onChange={e => handleSearch(e.target.value)}
            placeholder="Search documents..."
            className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
          />
          {searchInput && (
            <button
              onClick={() => { setSearchInput(''); setFilters(f => ({ ...f, search: '' })); }}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        <div className="flex items-center gap-1.5 border border-gray-200 rounded-xl p-1 bg-white">
          <select
            value={filters.sortBy}
            onChange={e => setFilters(f => ({ ...f, sortBy: e.target.value as DocumentFilters['sortBy'] }))}
            className="text-xs font-medium text-gray-600 bg-transparent focus:outline-none pl-1 pr-6 py-1"
          >
            <option value="newest">Newest</option>
            <option value="oldest">Oldest</option>
            <option value="name">Name A-Z</option>
            <option value="size">Largest</option>
          </select>
        </div>

        <button
          onClick={() => setShowFilters(v => !v)}
          className={`flex items-center gap-1.5 px-3 py-2 rounded-xl border text-sm font-medium transition-colors ${
            showFilters || activeFilterCount > 0
              ? 'bg-blue-50 border-blue-200 text-blue-700'
              : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
          }`}
        >
          <SlidersHorizontal className="h-4 w-4" />
          Filters
          {activeFilterCount > 0 && (
            <span className="bg-blue-600 text-white text-xs rounded-full w-4 h-4 flex items-center justify-center font-bold">
              {activeFilterCount}
            </span>
          )}
          <ChevronDown className={`h-3.5 w-3.5 transition-transform ${showFilters ? 'rotate-180' : ''}`} />
        </button>

        <button
          onClick={() => setShowUpload(true)}
          className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-semibold transition-colors"
        >
          <Upload className="h-4 w-4" />
          Upload
        </button>
      </div>

      {showFilters && (
        <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 space-y-3">
          {categoriesInUse.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Category</p>
              <div className="flex flex-wrap gap-2">
                {categoriesInUse.map(cat => {
                  const active = filters.categoryIds.includes(cat.id);
                  return (
                    <button
                      key={cat.id}
                      onClick={() => toggleCategory(cat.id)}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border transition-all ${
                        active ? 'border-transparent text-white' : 'border-gray-200 text-gray-600 bg-white hover:border-gray-300'
                      }`}
                      style={active ? { backgroundColor: cat.color } : {}}
                    >
                      <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: active ? 'rgba(255,255,255,0.7)' : cat.color }} />
                      {cat.name}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          <div className="flex items-center gap-4 flex-wrap">
            <div className="flex items-center gap-2">
              <div>
                <label className="text-xs font-medium text-gray-500 block mb-1">From</label>
                <input
                  type="date"
                  value={filters.dateFrom}
                  onChange={e => setFilters(f => ({ ...f, dateFrom: e.target.value }))}
                  className="border border-gray-200 rounded-lg px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500 block mb-1">To</label>
                <input
                  type="date"
                  value={filters.dateTo}
                  onChange={e => setFilters(f => ({ ...f, dateTo: e.target.value }))}
                  className="border border-gray-200 rounded-lg px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                />
              </div>
            </div>

            <label className="flex items-center gap-2 cursor-pointer">
              <div
                className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                  filters.showPortalOnly ? 'bg-blue-600' : 'bg-gray-300'
                }`}
                onClick={() => setFilters(f => ({ ...f, showPortalOnly: !f.showPortalOnly }))}
              >
                <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${
                  filters.showPortalOnly ? 'translate-x-4' : 'translate-x-0.5'
                }`} />
              </div>
              <span className="text-sm text-gray-600 flex items-center gap-1">
                <Eye className="h-4 w-4 text-gray-400" />
                Portal visible only
              </span>
            </label>

            {activeFilterCount > 0 && (
              <button
                onClick={() => setFilters(EMPTY_FILTERS)}
                className="text-xs text-red-500 hover:text-red-700 flex items-center gap-1"
              >
                <X className="h-3.5 w-3.5" />
                Clear all
              </button>
            )}
          </div>
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-16">
          <div className="w-7 h-7 border-2 border-blue-200 border-t-blue-600 rounded-full animate-spin" />
        </div>
      ) : documents.length === 0 ? (
        <div className="bg-white rounded-xl border border-dashed border-gray-200 p-12 text-center">
          <div className="w-14 h-14 rounded-2xl bg-gray-100 flex items-center justify-center mx-auto mb-3">
            <FileText className="h-7 w-7 text-gray-300" />
          </div>
          <p className="text-sm font-semibold text-gray-500 mb-1">No documents yet</p>
          <p className="text-xs text-gray-400 mb-4">
            {activeFilterCount > 0 ? 'Try adjusting your filters' : 'Upload contracts, warranties, manuals, and more'}
          </p>
          {activeFilterCount === 0 && (
            <button
              onClick={() => setShowUpload(true)}
              className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-semibold transition-colors"
            >
              <Upload className="h-4 w-4" />
              Upload First Document
            </button>
          )}
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="divide-y divide-gray-100">
            {documents.map(doc => {
              const cat = categories.find(c => c.id === doc.category_id);
              return (
                <div
                  key={doc.id}
                  className="flex items-center gap-4 px-5 py-3.5 hover:bg-gray-50 transition-colors group"
                >
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 cursor-pointer"
                    style={{ backgroundColor: '#f3f4f6' }}
                    onClick={() => setViewerDoc(doc)}
                  >
                    <FileText className="h-5 w-5 text-gray-400" />
                  </div>

                  <div
                    className="flex-1 min-w-0 cursor-pointer"
                    onClick={() => setViewerDoc(doc)}
                  >
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-semibold text-gray-900 truncate">{doc.file_name}</p>
                      <span className={`text-xs font-bold px-1.5 py-0.5 rounded ${fileTypeColor(doc.file_type)}`}>
                        {fileTypeLabel(doc.file_type)}
                      </span>
                      {cat && (
                        <span
                          className="text-xs font-semibold px-2 py-0.5 rounded-full text-white"
                          style={{ backgroundColor: cat.color }}
                        >
                          {cat.name}
                        </span>
                      )}
                      {doc.show_in_portal && (
                        <span className="flex items-center gap-1 text-xs text-blue-600 font-medium">
                          <Eye className="h-3 w-3" />
                          Portal
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {doc.description && <span className="text-gray-500">{doc.description} · </span>}
                      {formatBytes(doc.file_size_bytes)}
                      {doc.file_size_bytes ? ' · ' : ''}
                      {new Date(doc.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                      {doc.uploaded_by ? ` · ${doc.uploaded_by}` : ''}
                    </p>
                  </div>

                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                    <button
                      onClick={e => { e.stopPropagation(); handleUpdate(doc.id, { show_in_portal: !doc.show_in_portal }); }}
                      title={doc.show_in_portal ? 'Hide from portal' : 'Show in portal'}
                      className={`w-7 h-7 rounded-lg flex items-center justify-center transition-colors ${
                        doc.show_in_portal
                          ? 'bg-blue-100 text-blue-600 hover:bg-blue-200'
                          : 'bg-gray-100 text-gray-400 hover:bg-gray-200'
                      }`}
                    >
                      {doc.show_in_portal ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
                    </button>
                    <a
                      href={doc.file_url}
                      download={doc.file_name}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-7 h-7 rounded-lg flex items-center justify-center bg-gray-100 text-gray-400 hover:bg-blue-100 hover:text-blue-600 transition-colors"
                      title="Download"
                      onClick={e => e.stopPropagation()}
                    >
                      <Download className="h-3.5 w-3.5" />
                    </a>
                    <a
                      href={doc.file_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-7 h-7 rounded-lg flex items-center justify-center bg-gray-100 text-gray-400 hover:bg-blue-100 hover:text-blue-600 transition-colors"
                      title="Open in new tab"
                      onClick={e => e.stopPropagation()}
                    >
                      <ExternalLink className="h-3.5 w-3.5" />
                    </a>
                    {confirmDeleteId === doc.id ? (
                      <div className="flex items-center gap-1 bg-red-50 rounded-lg px-2 py-1">
                        <span className="text-xs text-red-600">Delete?</span>
                        <button onClick={() => handleDelete(doc.id)} className="text-xs font-bold text-red-600 hover:text-red-800">Yes</button>
                        <button onClick={() => setConfirmDeleteId(null)} className="text-xs text-gray-500">No</button>
                      </div>
                    ) : (
                      <button
                        onClick={e => { e.stopPropagation(); setConfirmDeleteId(doc.id); }}
                        className="w-7 h-7 rounded-lg flex items-center justify-center bg-gray-100 text-gray-400 hover:bg-red-100 hover:text-red-500 transition-colors"
                        title="Delete"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {showUpload && (
        <DocumentUploadModal
          context={context}
          categories={categories}
          onUpload={handleUpload}
          onCreateCategory={createCategory}
          onClose={async () => { setShowUpload(false); await loadDocuments(); }}
        />
      )}

      {viewerDoc && (
        <DocumentViewer
          document={viewerDoc}
          documents={documents}
          categories={categories}
          onClose={() => setViewerDoc(null)}
          onNavigate={d => setViewerDoc(d)}
          onUpdate={handleUpdate}
          onDelete={handleDelete}
        />
      )}
    </div>
  );
}
