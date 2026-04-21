import { useState, useEffect, useRef } from 'react';
import {
  Search, SlidersHorizontal, X, Camera, Tag, Building2, MapPin, Cpu,
  Image as ImageIcon, Eye, TrendingUp, ChevronDown
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import type { Photo, PhotoLabel, PhotoGalleryFilters } from './types';
import { usePhotoLabels, groupPhotosByDate } from './usePhotos';
import PhotoLightbox from './PhotoLightbox';
import PhotoUploadModal from './PhotoUploadModal';

interface PhotoWithContext extends Photo {
  company_name?: string;
  site_name?: string;
  system_name?: string;
}

const EMPTY_FILTERS: PhotoGalleryFilters = {
  search: '',
  labelIds: [],
  showPortalOnly: false,
  dateFrom: '',
  dateTo: '',
};

export default function PhotosPage() {
  const [photos, setPhotos] = useState<PhotoWithContext[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState<PhotoGalleryFilters>(EMPTY_FILTERS);
  const [searchInput, setSearchInput] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [lightboxPhoto, setLightboxPhoto] = useState<PhotoWithContext | null>(null);
  const [showUpload, setShowUpload] = useState(false);
  const [labelStats, setLabelStats] = useState<{ label: PhotoLabel; count: number }[]>([]);
  const searchTimer = useRef<ReturnType<typeof setTimeout>>();

  const { labels, createLabel } = usePhotoLabels();

  useEffect(() => { loadPhotos(); }, [filters]);

  async function loadPhotos() {
    setLoading(true);
    let query = supabase
      .from('photos')
      .select(`
        *,
        photo_label_assignments(label_id, photo_labels(id, name, color)),
        companies(name),
        sites(name),
        customer_systems(name)
      `)
      .order('taken_at', { ascending: false })
      .limit(500);

    if (filters.showPortalOnly) query = query.eq('show_in_portal', true);
    if (filters.dateFrom) query = query.gte('taken_at', filters.dateFrom);
    if (filters.dateTo) query = query.lte('taken_at', filters.dateTo + 'T23:59:59');

    const { data } = await query;
    if (data) {
      let mapped = (data as any[]).map(p => ({
        ...p,
        labels: (p.photo_label_assignments || []).map((a: any) => a.photo_labels).filter(Boolean),
        company_name: p.companies?.name,
        site_name: p.sites?.name,
        system_name: p.customer_systems?.name,
      })) as PhotoWithContext[];

      if (filters.search) {
        const q = filters.search.toLowerCase();
        mapped = mapped.filter(p =>
          p.caption?.toLowerCase().includes(q) ||
          p.uploaded_by?.toLowerCase().includes(q) ||
          p.company_name?.toLowerCase().includes(q) ||
          p.site_name?.toLowerCase().includes(q) ||
          p.system_name?.toLowerCase().includes(q) ||
          p.labels?.some((l: PhotoLabel) => l.name.toLowerCase().includes(q))
        );
      }

      if (filters.labelIds.length > 0) {
        mapped = mapped.filter(p =>
          filters.labelIds.every(lid => p.labels?.some((l: PhotoLabel) => l.id === lid))
        );
      }

      setPhotos(mapped);

      const counts: Record<string, number> = {};
      for (const photo of mapped) {
        for (const label of (photo.labels ?? [])) {
          counts[label.id] = (counts[label.id] || 0) + 1;
        }
      }
      const stats = labels
        .map(l => ({ label: l, count: counts[l.id] || 0 }))
        .filter(s => s.count > 0)
        .sort((a, b) => b.count - a.count);
      setLabelStats(stats);
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

  function toggleLabelFilter(id: string) {
    setFilters(f => ({
      ...f,
      labelIds: f.labelIds.includes(id) ? f.labelIds.filter(x => x !== id) : [...f.labelIds, id],
    }));
  }

  async function handleUpdate(id: string, updates: { caption?: string | null; show_in_portal?: boolean; labelIds?: string[] }) {
    const patch: Record<string, any> = {};
    if (updates.caption !== undefined) patch.caption = updates.caption;
    if (updates.show_in_portal !== undefined) patch.show_in_portal = updates.show_in_portal;
    if (Object.keys(patch).length > 0) {
      await supabase.from('photos').update(patch).eq('id', id);
    }
    if (updates.labelIds !== undefined) {
      await supabase.from('photo_label_assignments').delete().eq('photo_id', id);
      if (updates.labelIds.length > 0) {
        await supabase.from('photo_label_assignments').insert(
          updates.labelIds.map(lid => ({ photo_id: id, label_id: lid }))
        );
      }
    }
    await loadPhotos();
    if (lightboxPhoto?.id === id) {
      setLightboxPhoto(prev => prev ? {
        ...prev, ...updates,
        labels: updates.labelIds !== undefined
          ? labels.filter(l => updates.labelIds!.includes(l.id))
          : prev.labels,
      } : null);
    }
  }

  async function handleDelete(id: string) {
    await supabase.from('photos').delete().eq('id', id);
    setPhotos(prev => prev.filter(p => p.id !== id));
    const remaining = photos.filter(p => p.id !== id);
    if (remaining.length > 0 && lightboxPhoto) {
      const idx = photos.findIndex(p => p.id === id);
      setLightboxPhoto(remaining[Math.max(0, idx - 1)]);
    } else {
      setLightboxPhoto(null);
    }
  }

  const grouped = groupPhotosByDate(photos);
  const activeFilterCount = [
    filters.labelIds.length > 0,
    filters.showPortalOnly,
    !!filters.dateFrom,
    !!filters.dateTo,
  ].filter(Boolean).length;

  return (
    <div className="min-h-full bg-gray-50">
      <div className="bg-white border-b border-gray-200 px-6 py-5">
        <div className="flex items-center justify-between mb-5">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Photo Library</h1>
            <p className="text-sm text-gray-500 mt-0.5">
              All photos across customers, sites, and systems — {photos.length} total
            </p>
          </div>
          <button
            onClick={() => setShowUpload(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-semibold transition-colors"
          >
            <Camera className="h-4 w-4" />
            Upload Photos
          </button>
        </div>

        <div className="flex items-center gap-3">
          <div className="relative flex-1 max-w-lg">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              value={searchInput}
              onChange={e => handleSearch(e.target.value)}
              placeholder="Search by caption, label, customer, site, or uploader..."
              className="w-full pl-9 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
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
          <button
            onClick={() => setShowFilters(v => !v)}
            className={`flex items-center gap-2 px-3 py-2.5 rounded-xl border text-sm font-medium transition-colors ${
              showFilters || activeFilterCount > 0
                ? 'bg-blue-50 border-blue-200 text-blue-700'
                : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
            }`}
          >
            <SlidersHorizontal className="h-4 w-4" />
            Filters
            {activeFilterCount > 0 && (
              <span className="bg-blue-600 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center font-bold">
                {activeFilterCount}
              </span>
            )}
            <ChevronDown className={`h-4 w-4 transition-transform ${showFilters ? 'rotate-180' : ''}`} />
          </button>
        </div>

        {showFilters && (
          <div className="mt-4 bg-gray-50 border border-gray-200 rounded-2xl p-4 space-y-4">
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <Tag className="h-3.5 w-3.5" />
                Filter by Label
              </p>
              <div className="flex flex-wrap gap-2">
                {labels.map(label => {
                  const active = filters.labelIds.includes(label.id);
                  return (
                    <button
                      key={label.id}
                      onClick={() => toggleLabelFilter(label.id)}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium border transition-all ${
                        active
                          ? 'border-transparent text-white'
                          : 'border-gray-200 text-gray-600 bg-white hover:border-gray-300'
                      }`}
                      style={active ? { backgroundColor: label.color } : {}}
                    >
                      {label.name}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="flex items-center gap-6 flex-wrap">
              <div className="flex items-center gap-3">
                <div>
                  <label className="text-xs font-medium text-gray-500 block mb-1">From</label>
                  <input
                    type="date"
                    value={filters.dateFrom}
                    onChange={e => setFilters(f => ({ ...f, dateFrom: e.target.value }))}
                    className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-500 block mb-1">To</label>
                  <input
                    type="date"
                    value={filters.dateTo}
                    onChange={e => setFilters(f => ({ ...f, dateTo: e.target.value }))}
                    className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
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
                  className="text-sm text-red-500 hover:text-red-700 transition-colors flex items-center gap-1"
                >
                  <X className="h-3.5 w-3.5" />
                  Clear all
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      <div className="flex gap-6 p-6">
        <div className="flex-1 min-w-0">
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <div className="w-8 h-8 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin" />
            </div>
          ) : photos.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <div className="w-20 h-20 rounded-2xl bg-gray-100 flex items-center justify-center mb-4">
                <ImageIcon className="h-10 w-10 text-gray-300" />
              </div>
              <p className="text-base font-semibold text-gray-600 mb-1">No photos found</p>
              <p className="text-sm text-gray-400 mb-5">
                {activeFilterCount > 0 ? 'Try adjusting your filters' : 'Upload the first photo to get started'}
              </p>
              {activeFilterCount === 0 && (
                <button
                  onClick={() => setShowUpload(true)}
                  className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-semibold transition-colors"
                >
                  <Camera className="h-4 w-4" />
                  Upload First Photo
                </button>
              )}
            </div>
          ) : (
            <div className="space-y-8">
              {grouped.map(group => (
                <div key={group.dateLabel}>
                  <h3 className="text-sm font-semibold text-gray-500 mb-3 flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-blue-400 flex-shrink-0" />
                    {group.dateLabel}
                    <span className="text-gray-400 font-normal">· {group.photos.length} photo{group.photos.length !== 1 ? 's' : ''}</span>
                  </h3>
                  <div className="grid gap-3 grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6">
                    {group.photos.map(photo => (
                      <GlobalPhotoCard
                        key={photo.id}
                        photo={photo}
                        onClick={() => setLightboxPhoto(photo)}
                      />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {labelStats.length > 0 && (
          <div className="w-56 flex-shrink-0">
            <div className="bg-white rounded-2xl border border-gray-200 p-4 sticky top-6">
              <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                <TrendingUp className="h-3.5 w-3.5" />
                Label Insights
              </h3>
              <div className="space-y-2">
                {labelStats.map(({ label, count }) => (
                  <button
                    key={label.id}
                    onClick={() => toggleLabelFilter(label.id)}
                    className={`w-full flex items-center justify-between gap-2 px-3 py-2 rounded-xl text-sm transition-colors ${
                      filters.labelIds.includes(label.id)
                        ? 'bg-blue-50 text-blue-700'
                        : 'hover:bg-gray-50 text-gray-700'
                    }`}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <span
                        className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                        style={{ backgroundColor: label.color }}
                      />
                      <span className="truncate font-medium">{label.name}</span>
                    </div>
                    <span className={`text-xs font-bold flex-shrink-0 ${
                      filters.labelIds.includes(label.id) ? 'text-blue-600' : 'text-gray-400'
                    }`}>
                      {count}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {lightboxPhoto && (
        <PhotoLightbox
          photo={lightboxPhoto}
          photos={photos}
          allLabels={labels}
          onClose={() => setLightboxPhoto(null)}
          onNavigate={p => setLightboxPhoto(p as PhotoWithContext)}
          onUpdate={handleUpdate}
          onDelete={handleDelete}
        />
      )}

      {showUpload && (
        <PhotoUploadModal
          context={{}}
          allLabels={labels}
          onUpload={async (file, ctx, uploadedBy, caption, labelIds) => {
            let fileUrl = '';
            try {
              const ext = file.name.split('.').pop() ?? 'jpg';
              const path = `site-photos/global/${crypto.randomUUID()}.${ext}`;
              const { error } = await supabase.storage.from('site-photos').upload(path, file, { contentType: file.type });
              if (!error) {
                const { data: { publicUrl } } = supabase.storage.from('site-photos').getPublicUrl(path);
                fileUrl = publicUrl;
              } else {
                fileUrl = await toDataUrl(file);
              }
            } catch {
              fileUrl = await toDataUrl(file);
            }
            const { data: photo } = await supabase.from('photos').insert({
              file_url: fileUrl,
              caption: caption || null,
              uploaded_by: uploadedBy || 'Unknown',
              taken_at: new Date().toISOString(),
              show_in_portal: false,
            }).select().maybeSingle();
            if (photo && labelIds.length > 0) {
              await supabase.from('photo_label_assignments').insert(
                labelIds.map(lid => ({ photo_id: photo.id, label_id: lid }))
              );
            }
            return photo;
          }}
          onCreateLabel={createLabel}
          onClose={async () => { setShowUpload(false); await loadPhotos(); }}
        />
      )}
    </div>
  );
}

function GlobalPhotoCard({ photo, onClick }: { photo: PhotoWithContext; onClick: () => void }) {
  const [hovered, setHovered] = useState(false);

  return (
    <div
      className="relative aspect-square rounded-xl overflow-hidden cursor-pointer group bg-gray-100"
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <img
        src={photo.file_url}
        alt={photo.caption ?? ''}
        className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
        loading="lazy"
      />

      <div className={`absolute inset-0 bg-gradient-to-t from-gray-900/90 via-gray-900/20 to-transparent transition-opacity duration-200 ${
        hovered ? 'opacity-100' : 'opacity-0'
      }`} />

      {photo.labels && photo.labels.length > 0 && (
        <div className="absolute top-2 left-2 flex flex-wrap gap-1">
          {photo.labels.slice(0, 2).map((label: PhotoLabel) => (
            <span
              key={label.id}
              className="px-2 py-0.5 rounded-full text-xs font-bold text-white shadow-sm"
              style={{ backgroundColor: label.color }}
            >
              {label.name}
            </span>
          ))}
          {photo.labels.length > 2 && (
            <span className="px-2 py-0.5 rounded-full text-xs font-bold text-white bg-gray-700 shadow-sm">
              +{photo.labels.length - 2}
            </span>
          )}
        </div>
      )}

      {photo.show_in_portal && (
        <div className="absolute top-2 right-2">
          <div className="w-6 h-6 rounded-full bg-blue-600 flex items-center justify-center shadow-sm">
            <Eye className="h-3 w-3 text-white" />
          </div>
        </div>
      )}

      <div className={`absolute bottom-0 left-0 right-0 p-2.5 transition-opacity duration-200 ${
        hovered ? 'opacity-100' : 'opacity-0'
      }`}>
        {photo.caption && (
          <p className="text-xs text-white font-medium leading-snug line-clamp-1 mb-1">
            {photo.caption}
          </p>
        )}
        {(photo.company_name || photo.site_name) && (
          <div className="space-y-0.5">
            {photo.company_name && (
              <p className="text-xs text-gray-300 flex items-center gap-1 truncate">
                <Building2 className="h-3 w-3 flex-shrink-0" />
                {photo.company_name}
              </p>
            )}
            {photo.site_name && (
              <p className="text-xs text-gray-400 flex items-center gap-1 truncate">
                <MapPin className="h-3 w-3 flex-shrink-0" />
                {photo.site_name}
              </p>
            )}
            {photo.system_name && (
              <p className="text-xs text-gray-400 flex items-center gap-1 truncate">
                <Cpu className="h-3 w-3 flex-shrink-0" />
                {photo.system_name}
              </p>
            )}
          </div>
        )}
        <p className="text-xs text-gray-400 mt-1">
          {new Date(photo.taken_at).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
          {' · '}{photo.uploaded_by}
        </p>
      </div>
    </div>
  );
}

function toDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = e => resolve(e.target?.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}
