import { useState, useEffect } from 'react';
import {
  ArrowLeft, Package, ExternalLink, Camera, FileText,
  MessageSquare, Download, CheckCircle, Trash2, Send, AlertTriangle,
  Plus, Edit2, X, Clock, DollarSign, Wrench, Tag,
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { containsProfanity } from '../../lib/profanityFilter';
import { useRole } from '../../contexts/RoleContext';
import type { PCProduct, PCPhoto, PCDocument, PCNote } from './types';
import AddPhotoModal from './AddPhotoModal';
import AddDocumentModal from './AddDocumentModal';
import EditProductModal from './EditProductModal';

interface Props {
  productId: string;
  onBack: () => void;
}

type Tab = 'photos' | 'documents' | 'notes';

const DOC_TYPE_LABELS: Record<string, string> = {
  spec_sheet: 'Spec Sheet',
  white_paper: 'White Paper',
  install_guide: 'Install Guide',
  manual: 'Manual',
  other: 'Document',
};

function formatFileSize(bytes: number | null) {
  if (!bytes) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function fmtPrice(val: number | null | undefined) {
  if (val == null) return '--';
  return `$${Number(val).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function DetailField({ label, value }: { label: string; value: string | null | undefined }) {
  if (!value) return null;
  return (
    <div>
      <p className="text-xs text-gray-400 font-medium uppercase tracking-wider">{label}</p>
      <p className="text-sm font-semibold text-gray-900 mt-0.5">{value}</p>
    </div>
  );
}

export default function ProductDetail({ productId, onBack }: Props) {
  const { role } = useRole();
  const isAdmin = role === 'admin';

  const [product, setProduct] = useState<PCProduct | null>(null);
  const [photos, setPhotos] = useState<PCPhoto[]>([]);
  const [documents, setDocuments] = useState<PCDocument[]>([]);
  const [notes, setNotes] = useState<PCNote[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<Tab>('photos');
  const [newNote, setNewNote] = useState('');
  const [authorName, setAuthorName] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);
  const [showPhotoModal, setShowPhotoModal] = useState(false);
  const [showDocModal, setShowDocModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);

  useEffect(() => {
    loadProduct();
  }, [productId]);

  async function loadProduct() {
    setLoading(true);
    const [prodRes, photosRes, docsRes, notesRes] = await Promise.all([
      supabase.from('products').select('*').eq('id', productId).maybeSingle(),
      supabase.from('product_central_photos').select('*').eq('product_id', productId).order('sort_order'),
      supabase.from('product_central_documents').select('*').eq('product_id', productId).order('created_at', { ascending: false }),
      supabase.from('product_central_notes').select('*').eq('product_id', productId).order('created_at', { ascending: false }),
    ]);
    if (prodRes.data) setProduct(prodRes.data as unknown as PCProduct);
    setPhotos((photosRes.data ?? []) as PCPhoto[]);
    setDocuments((docsRes.data ?? []) as PCDocument[]);
    setNotes((notesRes.data ?? []) as PCNote[]);
    setLoading(false);
  }

  async function submitNote() {
    if (!newNote.trim() || !authorName.trim()) return;
    setSubmitting(true);
    const flagged = containsProfanity(newNote);
    const { data } = await supabase.from('product_central_notes').insert({
      product_id: productId,
      author_name: authorName.trim(),
      content: newNote.trim(),
      is_flagged: flagged,
      is_approved: !flagged,
    }).select().maybeSingle();
    if (data) setNotes(prev => [data as PCNote, ...prev]);
    setNewNote('');
    setSubmitting(false);
  }

  async function approveNote(noteId: string) {
    await supabase.from('product_central_notes').update({ is_approved: true, is_flagged: false }).eq('id', noteId);
    setNotes(prev => prev.map(n => n.id === noteId ? { ...n, is_approved: true, is_flagged: false } : n));
  }

  async function deleteNote(noteId: string) {
    await supabase.from('product_central_notes').delete().eq('id', noteId);
    setNotes(prev => prev.filter(n => n.id !== noteId));
  }

  async function deletePhoto(photoId: string) {
    await supabase.from('product_central_photos').delete().eq('id', photoId);
    setPhotos(prev => prev.filter(p => p.id !== photoId));
  }

  async function deleteDocument(docId: string) {
    await supabase.from('product_central_documents').delete().eq('id', docId);
    setDocuments(prev => prev.filter(d => d.id !== docId));
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-40">
        <div className="text-sm text-gray-400">Loading product...</div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="p-6 text-center text-gray-500">Product not found.</div>
    );
  }

  const visibleNotes = notes.filter(n => n.is_approved || isAdmin);
  const flaggedCount = notes.filter(n => n.is_flagged && !n.is_approved).length;

  const TABS: { id: Tab; label: string; icon: React.ElementType; count?: number }[] = [
    { id: 'photos', label: 'Photos', icon: Camera, count: photos.length },
    { id: 'documents', label: 'Documents', icon: FileText, count: documents.length },
    { id: 'notes', label: 'Community Notes', icon: MessageSquare, count: visibleNotes.length },
  ];

  return (
    <div className="p-6 space-y-6">
      {/* Back nav */}
      <div className="flex items-center justify-between">
        <button
          onClick={onBack}
          className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Catalog
        </button>
        {isAdmin && (
          <button
            onClick={() => setShowEditModal(true)}
            className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <Edit2 className="h-4 w-4" />
            Edit Product
          </button>
        )}
      </div>

      {/* Hero */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-0">
          <div className="bg-gray-50 flex items-center justify-center p-8 min-h-[320px] border-b lg:border-b-0 lg:border-r border-gray-200">
            {product.image_url ? (
              <img src={product.image_url} alt={product.name} className="max-h-[320px] w-auto object-contain" />
            ) : (
              <Package className="h-24 w-24 text-gray-200" />
            )}
          </div>

          <div className="p-8">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs text-blue-600 font-bold uppercase tracking-wider mb-1">
                  {product.manufacturer || 'Unknown Brand'}
                </p>
                <h1 className="text-xl font-bold text-gray-900">{product.name}</h1>
                {product.product_type && (
                  <span className="inline-flex items-center gap-1 mt-1.5 px-2 py-0.5 text-xs font-medium bg-gray-100 text-gray-600 rounded-full">
                    <Tag className="h-3 w-3" />
                    {product.product_type}
                  </span>
                )}
              </div>
              {product.product_url && (
                <a
                  href={product.product_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 font-medium flex-shrink-0"
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                  Manufacturer
                </a>
              )}
            </div>

            {product.description && (
              <p className="text-sm text-gray-600 mt-3 leading-relaxed">{product.description}</p>
            )}

            <div className="grid grid-cols-2 gap-x-6 gap-y-3 mt-6">
              <DetailField label="SKU" value={product.sku} />
              <DetailField label="UPC" value={product.upc} />
              <DetailField label="Model" value={product.model_number} />
              <DetailField label="Category" value={product.category} />
              <DetailField label="Subcategory" value={product.subcategory} />
              <DetailField label="System Type" value={product.default_system_type} />
            </div>
          </div>
        </div>
      </div>

      {/* Pricing / Accounting / Installation cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Pricing */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center">
              <DollarSign className="h-4 w-4 text-emerald-600" />
            </div>
            <h3 className="text-sm font-bold text-gray-900">Pricing</h3>
          </div>
          <div className="space-y-2.5">
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Sales Price</span>
              <span className="font-semibold text-gray-900">{fmtPrice(product.price)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">MSRP</span>
              <span className="font-semibold text-gray-900">{fmtPrice(product.msrp)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Min Sales Price</span>
              <span className="font-semibold text-gray-900">{fmtPrice(product.min_sales_price)}</span>
            </div>
            <div className="border-t border-gray-100 pt-2.5 flex justify-between text-sm">
              <span className="text-gray-500">Cost</span>
              <span className="font-semibold text-gray-900">{fmtPrice(product.cost)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Raw Cost</span>
              <span className="font-semibold text-gray-900">{fmtPrice(product.raw_cost)}</span>
            </div>
            <div className="border-t border-gray-100 pt-2.5 flex justify-between text-sm">
              <span className="text-gray-500">Taxable</span>
              <span className={`font-semibold ${product.is_taxable ? 'text-emerald-600' : 'text-gray-400'}`}>
                {product.is_taxable ? 'Yes' : 'No'}
              </span>
            </div>
            {product.tax_code && (
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Tax Code</span>
                <span className="font-semibold text-gray-900">{product.tax_code}</span>
              </div>
            )}
          </div>
        </div>

        {/* Accounting */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center">
              <FileText className="h-4 w-4 text-blue-600" />
            </div>
            <h3 className="text-sm font-bold text-gray-900">Accounting</h3>
          </div>
          <div className="space-y-2.5">
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Purchase Account</span>
              <span className="font-semibold text-gray-900">{product.purchase_account || '--'}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Sales Account</span>
              <span className="font-semibold text-gray-900">{product.sales_account || '--'}</span>
            </div>
            {product.chart_of_accounts && (
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Chart of Accounts</span>
                <span className="font-semibold text-gray-900">{product.chart_of_accounts}</span>
              </div>
            )}
            <div className="border-t border-gray-100 pt-2.5 flex justify-between text-sm">
              <span className="text-gray-500">Preferred Distributor</span>
              <span className="font-semibold text-gray-900">{product.preferred_distributor || '--'}</span>
            </div>
          </div>
        </div>

        {/* Installation */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-8 h-8 rounded-lg bg-amber-50 flex items-center justify-center">
              <Wrench className="h-4 w-4 text-amber-600" />
            </div>
            <h3 className="text-sm font-bold text-gray-900">Installation</h3>
          </div>
          <div className="space-y-2.5">
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Install Hours</span>
              <span className="font-semibold text-gray-900 flex items-center gap-1">
                {product.install_hours != null ? (
                  <><Clock className="h-3.5 w-3.5 text-gray-400" />{Number(product.install_hours)} hrs</>
                ) : '--'}
              </span>
            </div>
            {product.install_information && (
              <div className="pt-1">
                <p className="text-xs text-gray-400 font-medium uppercase tracking-wider mb-1">Install Notes</p>
                <p className="text-sm text-gray-600 leading-relaxed whitespace-pre-wrap">{product.install_information}</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Long description */}
      {product.long_description && (
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="text-sm font-bold text-gray-900 mb-2">Full Description</h2>
          <p className="text-sm text-gray-600 leading-relaxed whitespace-pre-wrap">{product.long_description}</p>
        </div>
      )}

      {/* Tabs */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="flex items-center justify-between border-b border-gray-200 pr-4">
          <div className="flex">
            {TABS.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-5 py-3.5 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === tab.id
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-800 hover:border-gray-300'
                }`}
              >
                <tab.icon className="h-4 w-4" />
                {tab.label}
                {tab.count !== undefined && tab.count > 0 && (
                  <span className="bg-gray-100 text-gray-600 text-xs font-bold rounded-full px-2 py-0.5">
                    {tab.count}
                  </span>
                )}
                {tab.id === 'notes' && flaggedCount > 0 && isAdmin && (
                  <span className="bg-red-500 text-white text-xs font-bold rounded-full px-1.5 py-0.5 min-w-[18px] text-center">
                    {flaggedCount}
                  </span>
                )}
              </button>
            ))}
          </div>
          {activeTab === 'photos' && isAdmin && (
            <button
              onClick={() => setShowPhotoModal(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors"
            >
              <Plus className="h-3.5 w-3.5" />
              Add Photo
            </button>
          )}
          {activeTab === 'documents' && isAdmin && (
            <button
              onClick={() => setShowDocModal(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors"
            >
              <Plus className="h-3.5 w-3.5" />
              Add Document
            </button>
          )}
        </div>

        <div className="p-6">
          {activeTab === 'photos' && (
            <PhotosSection photos={photos} productImage={product.image_url} onView={setLightboxUrl} onDelete={isAdmin ? deletePhoto : undefined} />
          )}
          {activeTab === 'documents' && (
            <DocumentsSection documents={documents} onDelete={isAdmin ? deleteDocument : undefined} />
          )}
          {activeTab === 'notes' && (
            <NotesSection
              notes={visibleNotes}
              newNote={newNote}
              setNewNote={setNewNote}
              authorName={authorName}
              setAuthorName={setAuthorName}
              submitting={submitting}
              onSubmit={submitNote}
              onApprove={approveNote}
              onDelete={deleteNote}
              isAdmin={isAdmin}
            />
          )}
        </div>
      </div>

      {/* Lightbox */}
      {lightboxUrl && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-8" onClick={() => setLightboxUrl(null)}>
          <img src={lightboxUrl} alt="" className="max-w-full max-h-full object-contain rounded-lg" />
        </div>
      )}

      {/* Modals */}
      {showPhotoModal && (
        <AddPhotoModal
          productId={productId}
          onClose={() => setShowPhotoModal(false)}
          onAdded={(photo) => { setPhotos(prev => [...prev, photo]); setShowPhotoModal(false); }}
        />
      )}
      {showDocModal && (
        <AddDocumentModal
          productId={productId}
          onClose={() => setShowDocModal(false)}
          onAdded={(doc) => { setDocuments(prev => [doc, ...prev]); setShowDocModal(false); }}
        />
      )}
      {showEditModal && product && (
        <EditProductModal
          product={product}
          onClose={() => setShowEditModal(false)}
          onSaved={(updated) => { setProduct(updated); setShowEditModal(false); }}
        />
      )}
    </div>
  );
}

function PhotosSection({ photos, productImage, onView, onDelete }: { photos: PCPhoto[]; productImage: string | null; onView: (url: string) => void; onDelete?: (id: string) => void }) {
  const allImages = productImage && photos.length === 0
    ? [{ id: 'main', url: productImage, title: 'Product Image', sort_order: 0, product_id: '', created_at: '' } as PCPhoto]
    : photos;

  if (allImages.length === 0) {
    return (
      <div className="text-center py-12">
        <Camera className="h-10 w-10 text-gray-300 mx-auto mb-3" />
        <p className="text-sm font-semibold text-gray-700 mb-1">No photos yet</p>
        <p className="text-xs text-gray-400">Product photos and images will appear here.</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
      {allImages.map(photo => (
        <div key={photo.id} className="relative group">
          <button
            onClick={() => onView(photo.url)}
            className="w-full aspect-square rounded-lg bg-gray-50 border border-gray-100 overflow-hidden hover:border-blue-300 hover:shadow-sm transition-all"
          >
            <img src={photo.url} alt={photo.title || ''} className="w-full h-full object-contain p-2 group-hover:scale-105 transition-transform" />
          </button>
          {photo.title && (
            <p className="text-xs text-gray-500 mt-1 truncate text-center">{photo.title}</p>
          )}
          {onDelete && photo.id !== 'main' && (
            <button
              onClick={() => onDelete(photo.id)}
              className="absolute top-2 right-2 p-1 bg-white/90 rounded-full text-red-400 hover:text-red-600 opacity-0 group-hover:opacity-100 transition-opacity shadow-sm"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      ))}
    </div>
  );
}

function DocumentsSection({ documents, onDelete }: { documents: PCDocument[]; onDelete?: (id: string) => void }) {
  if (documents.length === 0) {
    return (
      <div className="text-center py-12">
        <FileText className="h-10 w-10 text-gray-300 mx-auto mb-3" />
        <p className="text-sm font-semibold text-gray-700 mb-1">No documents yet</p>
        <p className="text-xs text-gray-400">Spec sheets, white papers, and install guides will appear here.</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {documents.map(doc => (
        <div key={doc.id} className="flex items-center gap-4 px-4 py-3 rounded-lg border border-gray-100 hover:border-blue-200 hover:bg-blue-50/30 transition-all group">
          <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center flex-shrink-0">
            <FileText className="h-5 w-5 text-blue-600" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-gray-900 group-hover:text-blue-700 transition-colors truncate">
              {doc.title}
            </p>
            <p className="text-xs text-gray-400">
              {DOC_TYPE_LABELS[doc.doc_type] || doc.doc_type}
              {doc.file_size_bytes ? ` · ${formatFileSize(doc.file_size_bytes)}` : ''}
              {' · '}
              {new Date(doc.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
            </p>
          </div>
          <a
            href={doc.url}
            target="_blank"
            rel="noopener noreferrer"
            className="p-2 text-gray-300 hover:text-blue-600 transition-colors"
          >
            <Download className="h-4 w-4" />
          </a>
          {onDelete && (
            <button onClick={() => onDelete(doc.id)} className="p-2 text-gray-300 hover:text-red-500 transition-colors">
              <Trash2 className="h-4 w-4" />
            </button>
          )}
        </div>
      ))}
    </div>
  );
}

interface NotesSectionProps {
  notes: PCNote[];
  newNote: string;
  setNewNote: (v: string) => void;
  authorName: string;
  setAuthorName: (v: string) => void;
  submitting: boolean;
  onSubmit: () => void;
  onApprove: (id: string) => void;
  onDelete: (id: string) => void;
  isAdmin: boolean;
}

function NotesSection({ notes, newNote, setNewNote, authorName, setAuthorName, submitting, onSubmit, onApprove, onDelete, isAdmin }: NotesSectionProps) {
  return (
    <div className="space-y-6">
      <div className="bg-gray-50 rounded-lg border border-gray-200 p-4">
        <h3 className="text-xs font-bold text-gray-700 uppercase tracking-wider mb-3">Add a Note</h3>
        <div className="flex gap-3 mb-3">
          <input
            type="text"
            placeholder="Your name"
            value={authorName}
            onChange={e => setAuthorName(e.target.value)}
            className="w-48 px-3 py-2 text-sm border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <textarea
          placeholder="Share tips, experiences, or notes about this product..."
          value={newNote}
          onChange={e => setNewNote(e.target.value)}
          rows={3}
          className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
        />
        <div className="flex items-center justify-between mt-3">
          <p className="text-xs text-gray-400">Notes with inappropriate language will be flagged for review.</p>
          <button
            onClick={onSubmit}
            disabled={submitting || !newNote.trim() || !authorName.trim()}
            className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <Send className="h-3.5 w-3.5" />
            Post Note
          </button>
        </div>
      </div>

      {notes.length === 0 ? (
        <div className="text-center py-8">
          <MessageSquare className="h-10 w-10 text-gray-300 mx-auto mb-3" />
          <p className="text-sm font-semibold text-gray-700 mb-1">No community notes yet</p>
          <p className="text-xs text-gray-400">Be the first to share your thoughts on this product.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {notes.map(note => (
            <div
              key={note.id}
              className={`rounded-lg border p-4 ${
                note.is_flagged && !note.is_approved ? 'border-amber-200 bg-amber-50/50' : 'border-gray-100 bg-white'
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-sm font-semibold text-gray-900">{note.author_name}</p>
                    <span className="text-xs text-gray-400">
                      {new Date(note.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </span>
                    {note.is_flagged && !note.is_approved && (
                      <span className="flex items-center gap-1 text-xs font-medium text-amber-700 bg-amber-100 px-2 py-0.5 rounded-full">
                        <AlertTriangle className="h-3 w-3" />
                        Under Review
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-gray-600 mt-1.5 leading-relaxed whitespace-pre-wrap">{note.content}</p>
                </div>
                {isAdmin && (
                  <div className="flex items-center gap-1 flex-shrink-0">
                    {note.is_flagged && !note.is_approved && (
                      <button onClick={() => onApprove(note.id)} className="p-1.5 text-emerald-500 hover:text-emerald-700 hover:bg-emerald-50 rounded-lg transition-colors" title="Approve">
                        <CheckCircle className="h-4 w-4" />
                      </button>
                    )}
                    <button onClick={() => onDelete(note.id)} className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors" title="Delete">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}


export default ProductDetail