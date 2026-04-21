import { useState, useRef } from 'react';
import {
  Camera, Search, Filter, X, Eye, EyeOff, ChevronDown,
  Image as ImageIcon, Tag, SlidersHorizontal
} from 'lucide-react';
import type { Photo, PhotoLabel, PhotoUploadContext, PhotoGalleryFilters } from './types';
import { usePhotos, usePhotoLabels, groupPhotosByDate } from './usePhotos';
import PhotoLightbox from './PhotoLightbox';
import PhotoUploadModal from './PhotoUploadModal';

interface Props {
  context: PhotoUploadContext;
  compact?: boolean;
}

const EMPTY_FILTERS: PhotoGalleryFilters = {
  search: '',
  labelIds: [],
  showPortalOnly: false,
  dateFrom: '',
  dateTo: '',
};

export default function PhotoGallery({ context, compact = false }: Props) {
  const [filters, setFilters] = useState<PhotoGalleryFilters>(EMPTY_FILTERS);
  const [searchInput, setSearchInput] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [lightboxPhoto, setLightboxPhoto] = useState<Photo | null>(null);
  const [showUpload, setShowUpload] = useState(false);
  const searchTimer = useRef<ReturnType<typeof setTimeout>>();

  const { labels, createLabel } = usePhotoLabels();
  const { photos, loading, uploadPhoto, deletePhoto, updatePhoto } = usePhotos(context, filters);
  const grouped = groupPhotosByDate(photos);

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

  const activeFilterCount = [
    filters.labelIds.length > 0,
    filters.showPortalOnly,
    !!filters.dateFrom,
    !!filters.dateTo,
  ].filter(Boolean).length;

  return (
    <div className="flex flex-col h-full">
      <div className={`flex items-center gap-3 ${compact ? 'mb-4' : 'mb-5'}`}>
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            value={searchInput}
            onChange={e => handleSearch(e.target.value)}
            placeholder="Search captions, labels, or uploaders..."
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
        </button>

        <button
          onClick={() => setShowUpload(true)}
          className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-semibold transition-colors"
        >
          <Camera className="h-4 w-4" />
          {compact ? 'Add' : 'Add Photos'}
        </button>
      </div>

      {showFilters && (
        <div className="bg-gray-50 border border-gray-200 rounded-2xl p-4 mb-5 space-y-4">
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
              {filters.labelIds.length > 0 && (
                <button
                  onClick={() => setFilters(f => ({ ...f, labelIds: [] }))}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-full text-xs text-gray-400 hover:text-gray-600 border border-gray-200 bg-white transition-colors"
                >
                  <X className="h-3.5 w-3.5" />
                  Clear
                </button>
              )}
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
                Portal only
              </span>
            </label>

            {activeFilterCount > 0 && (
              <button
                onClick={() => setFilters(EMPTY_FILTERS)}
                className="text-sm text-red-500 hover:text-red-700 transition-colors flex items-center gap-1"
              >
                <X className="h-3.5 w-3.5" />
                Clear all filters
              </button>
            )}
          </div>
        </div>
      )}

      {loading ? (
        <div className="flex-1 flex items-center justify-center py-20">
          <div className="w-8 h-8 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin" />
        </div>
      ) : photos.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center py-20 text-center">
          <div className="w-20 h-20 rounded-2xl bg-gray-100 flex items-center justify-center mb-4">
            <ImageIcon className="h-10 w-10 text-gray-300" />
          </div>
          <p className="text-base font-semibold text-gray-600 mb-1">No photos yet</p>
          <p className="text-sm text-gray-400 mb-5">
            {activeFilterCount > 0
              ? 'No photos match the current filters'
              : 'Upload the first photo for this location'
            }
          </p>
          {activeFilterCount === 0 && (
            <button
              onClick={() => setShowUpload(true)}
              className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-semibold transition-colors"
            >
              <Camera className="h-4 w-4" />
              Add First Photo
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-8">
          <p className="text-sm text-gray-500">{photos.length} photo{photos.length !== 1 ? 's' : ''}</p>
          {grouped.map(group => (
            <div key={group.dateLabel}>
              <h3 className="text-sm font-semibold text-gray-500 mb-3 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-blue-400 flex-shrink-0" />
                {group.dateLabel}
              </h3>
              <div className={`grid gap-3 ${compact ? 'grid-cols-3' : 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5'}`}>
                {group.photos.map(photo => (
                  <PhotoCard
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

      {lightboxPhoto && (
        <PhotoLightbox
          photo={lightboxPhoto}
          photos={photos}
          allLabels={labels}
          onClose={() => setLightboxPhoto(null)}
          onNavigate={setLightboxPhoto}
          onUpdate={async (id, updates) => {
            await updatePhoto(id, updates);
            setLightboxPhoto(prev => prev ? { ...prev, ...updates, labels: updates.labelIds !== undefined
              ? labels.filter(l => updates.labelIds!.includes(l.id))
              : prev.labels
            } : null);
          }}
          onDelete={async (id) => {
            await deletePhoto(id);
            const remaining = photos.filter(p => p.id !== id);
            if (remaining.length > 0) {
              const idx = photos.findIndex(p => p.id === id);
              setLightboxPhoto(remaining[Math.max(0, idx - 1)]);
            } else {
              setLightboxPhoto(null);
            }
          }}
        />
      )}

      {showUpload && (
        <PhotoUploadModal
          context={context}
          allLabels={labels}
          onUpload={uploadPhoto}
          onCreateLabel={createLabel}
          onClose={() => setShowUpload(false)}
        />
      )}
    </div>
  );
}

function PhotoCard({ photo, onClick }: { photo: Photo; onClick: () => void }) {
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

      <div className={`absolute inset-0 bg-gradient-to-t from-gray-900/80 via-transparent to-transparent transition-opacity duration-200 ${
        hovered ? 'opacity-100' : 'opacity-0'
      }`} />

      {photo.labels && photo.labels.length > 0 && (
        <div className="absolute top-2 left-2 flex flex-wrap gap-1">
          {photo.labels.slice(0, 2).map(label => (
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
          <div className="w-6 h-6 rounded-full bg-blue-600 flex items-center justify-center shadow-sm" title="Visible in portal">
            <Eye className="h-3 w-3 text-white" />
          </div>
        </div>
      )}

      <div className={`absolute bottom-0 left-0 right-0 p-2.5 transition-opacity duration-200 ${
        hovered ? 'opacity-100' : 'opacity-0'
      }`}>
        <p className="text-xs text-white font-medium leading-snug line-clamp-2">
          {photo.caption || photo.uploaded_by}
        </p>
        <p className="text-xs text-gray-300 mt-0.5">
          {new Date(photo.taken_at).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
          {' · '}{photo.uploaded_by}
        </p>
      </div>
    </div>
  );
}
