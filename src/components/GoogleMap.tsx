import { useRef, useEffect, useCallback, useState } from 'react';
import { Loader } from '@googlemaps/js-api-loader';

let loaderInstance: Loader | null = null;
let loaderKey = '';
function getLoader(apiKey: string) {
  if (!loaderInstance || loaderKey !== apiKey) {
    loaderInstance = new Loader({ apiKey, version: 'weekly' });
    loaderKey = apiKey;
  }
  return loaderInstance;
}

export interface MapMarker {
  id: string;
  lat: number;
  lng: number;
  color: string;
  label?: string;
  title?: string;
  zIndex?: number;
}

interface GoogleMapProps {
  markers: MapMarker[];
  selectedId?: string | null;
  onMarkerClick?: (id: string) => void;
  className?: string;
  apiKey?: string;
}

const DEFAULT_CENTER = { lat: 35.5, lng: -98.0 };
const DEFAULT_ZOOM = 4;

const MAP_STYLES: google.maps.MapTypeStyle[] = [
  { featureType: 'poi', elementType: 'labels', stylers: [{ visibility: 'off' }] },
  { featureType: 'transit', elementType: 'labels', stylers: [{ visibility: 'off' }] },
  { featureType: 'water', elementType: 'geometry.fill', stylers: [{ color: '#dbeafe' }] },
  { featureType: 'landscape.man_made', elementType: 'geometry.fill', stylers: [{ color: '#f8fafc' }] },
  { featureType: 'road.highway', elementType: 'geometry.fill', stylers: [{ color: '#e2e8f0' }] },
  { featureType: 'road.highway', elementType: 'geometry.stroke', stylers: [{ color: '#cbd5e1' }] },
  { featureType: 'road.arterial', elementType: 'geometry.fill', stylers: [{ color: '#f1f5f9' }] },
];

function pinSvg(fillColor: string, selected: boolean): string {
  const size = selected ? 40 : 28;
  const stroke = selected ? 'white' : '#1e293b';
  const sw = selected ? 3 : 1.5;
  const r = size * 0.35;
  const cx = size / 2;
  const cy = size * 0.38;
  return `data:image/svg+xml,${encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">` +
    `<path d="M${cx} ${size * 0.95} C${cx} ${size * 0.95} ${cx - r * 1.4} ${cy} ${cx - r * 1.4} ${cy - r * 0.15}` +
    ` A${r * 1.4} ${r * 1.4} 0 1 1 ${cx + r * 1.4} ${cy - r * 0.15}` +
    ` C${cx + r * 1.4} ${cy} ${cx} ${size * 0.95} ${cx} ${size * 0.95}Z"` +
    ` fill="${fillColor}" stroke="${stroke}" stroke-width="${sw}"/>` +
    `<circle cx="${cx}" cy="${cy}" r="${r * 0.45}" fill="white" opacity="0.9"/>` +
    `</svg>`
  )}`;
}

export default function GoogleMap({
  markers,
  selectedId,
  onMarkerClick,
  className = '',
  apiKey: apiKeyProp,
}: GoogleMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<google.maps.Map | null>(null);
  const markerRefs = useRef<Map<string, google.maps.marker.AdvancedMarkerElement | google.maps.Marker>>(new Map());
  const [ready, setReady] = useState(false);
  const [noKey, setNoKey] = useState(false);

  const resolvedKey = apiKeyProp || import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '';

  useEffect(() => {
    if (!resolvedKey) {
      setNoKey(true);
      setReady(true);
      return;
    }
    setNoKey(false);
    setReady(false);
    markerRefs.current.forEach(mk => { if ('setMap' in mk) (mk as google.maps.Marker).setMap(null); });
    markerRefs.current.clear();
    mapRef.current = null;

    let cancelled = false;
    (async () => {
      try {
        const { Map } = await getLoader(resolvedKey).importLibrary('maps');
        if (cancelled || !containerRef.current) return;
        const map = new Map(containerRef.current, {
          center: DEFAULT_CENTER,
          zoom: DEFAULT_ZOOM,
          disableDefaultUI: true,
          zoomControl: true,
          fullscreenControl: true,
          styles: MAP_STYLES,
          gestureHandling: 'greedy',
        });
        mapRef.current = map;
        setReady(true);
      } catch {
        setNoKey(true);
        setReady(true);
      }
    })();
    return () => { cancelled = true; };
  }, [resolvedKey]);

  const syncMarkers = useCallback(() => {
    const map = mapRef.current;
    if (!map || noKey) return;

    const currentIds = new Set(markers.map(m => m.id));
    markerRefs.current.forEach((mk, id) => {
      if (!currentIds.has(id)) {
        if ('setMap' in mk) (mk as google.maps.Marker).setMap(null);
        markerRefs.current.delete(id);
      }
    });

    markers.forEach(m => {
      const isSelected = m.id === selectedId;
      const iconUrl = pinSvg(m.color, isSelected);
      const existing = markerRefs.current.get(m.id) as google.maps.Marker | undefined;

      if (existing) {
        existing.setPosition({ lat: m.lat, lng: m.lng });
        existing.setIcon({
          url: iconUrl,
          scaledSize: new google.maps.Size(isSelected ? 40 : 28, isSelected ? 40 : 28),
          anchor: new google.maps.Point(isSelected ? 20 : 14, isSelected ? 38 : 26),
        });
        existing.setZIndex(isSelected ? 1000 : (m.zIndex || 1));
        existing.setTitle(m.title || '');
      } else {
        const mk = new google.maps.Marker({
          position: { lat: m.lat, lng: m.lng },
          map,
          icon: {
            url: iconUrl,
            scaledSize: new google.maps.Size(isSelected ? 40 : 28, isSelected ? 40 : 28),
            anchor: new google.maps.Point(isSelected ? 20 : 14, isSelected ? 38 : 26),
          },
          title: m.title || '',
          zIndex: isSelected ? 1000 : (m.zIndex || 1),
          optimized: true,
        });
        mk.addListener('click', () => onMarkerClick?.(m.id));
        markerRefs.current.set(m.id, mk);
      }
    });
  }, [markers, selectedId, onMarkerClick, noKey]);

  useEffect(() => {
    if (ready) syncMarkers();
  }, [ready, syncMarkers]);

  const fitBounds = useCallback(() => {
    const map = mapRef.current;
    if (!map || markers.length === 0) return;
    const bounds = new google.maps.LatLngBounds();
    markers.forEach(m => bounds.extend({ lat: m.lat, lng: m.lng }));
    if (markers.length === 1) {
      map.setCenter(bounds.getCenter());
      map.setZoom(14);
    } else {
      map.fitBounds(bounds, { top: 60, right: 60, bottom: 60, left: 60 });
    }
  }, [markers]);

  useEffect(() => {
    if (ready && !noKey) fitBounds();
  }, [ready, fitBounds, noKey]);

  useEffect(() => {
    if (!ready || noKey || !selectedId) return;
    const m = markers.find(mk => mk.id === selectedId);
    if (m) {
      mapRef.current?.panTo({ lat: m.lat, lng: m.lng });
    }
  }, [selectedId, ready, noKey, markers]);

  if (noKey) {
    return (
      <div className={`relative bg-gradient-to-br from-slate-100 via-slate-50 to-blue-50 ${className}`}>
        <FallbackMap markers={markers} selectedId={selectedId} onMarkerClick={onMarkerClick} />
      </div>
    );
  }

  return (
    <div className={`relative ${className}`}>
      <div ref={containerRef} className="absolute inset-0" />
      {!ready && (
        <div className="absolute inset-0 flex items-center justify-center bg-white/60 backdrop-blur-[1px]">
          <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
        </div>
      )}
    </div>
  );
}

function FallbackMap({
  markers,
  selectedId,
  onMarkerClick,
}: {
  markers: MapMarker[];
  selectedId?: string | null;
  onMarkerClick?: (id: string) => void;
}) {
  const bounds = markers.length > 0 ? {
    minLat: Math.min(...markers.map(m => m.lat)),
    maxLat: Math.max(...markers.map(m => m.lat)),
    minLng: Math.min(...markers.map(m => m.lng)),
    maxLng: Math.max(...markers.map(m => m.lng)),
  } : { minLat: 25, maxLat: 50, minLng: -125, maxLng: -65 };

  const padLat = Math.max((bounds.maxLat - bounds.minLat) * 0.15, 0.5);
  const padLng = Math.max((bounds.maxLng - bounds.minLng) * 0.15, 0.5);

  return (
    <div className="absolute inset-0 overflow-hidden">
      <div
        aria-hidden
        className="absolute inset-0 opacity-30"
        style={{
          backgroundImage:
            'linear-gradient(to right, rgba(148,163,184,0.25) 1px, transparent 1px), linear-gradient(to bottom, rgba(148,163,184,0.25) 1px, transparent 1px)',
          backgroundSize: '56px 56px',
        }}
      />
      <svg aria-hidden className="absolute inset-0 w-full h-full" preserveAspectRatio="none">
        <path d="M 0 220 Q 300 120 600 260 T 1200 220" stroke="rgba(148,163,184,0.5)" strokeWidth="14" fill="none" strokeLinecap="round" />
        <path d="M 0 420 Q 400 360 800 440 T 1600 420" stroke="rgba(148,163,184,0.35)" strokeWidth="10" fill="none" strokeLinecap="round" />
      </svg>

      <div className="absolute top-3 left-3 bg-white/95 backdrop-blur-sm rounded-lg px-3 py-1.5 shadow-sm border border-gray-200 text-xs text-gray-500">
        Add your Google Maps API key in Settings &rarr; Integrations
      </div>

      {markers.map(m => {
        const pctX = ((m.lng - (bounds.minLng - padLng)) / ((bounds.maxLng + padLng) - (bounds.minLng - padLng))) * 100;
        const pctY = (1 - (m.lat - (bounds.minLat - padLat)) / ((bounds.maxLat + padLat) - (bounds.minLat - padLat))) * 100;
        const isSelected = m.id === selectedId;
        return (
          <button
            key={m.id}
            onClick={() => onMarkerClick?.(m.id)}
            className="absolute -translate-x-1/2 -translate-y-full group"
            style={{ left: `${Math.min(Math.max(pctX, 3), 97)}%`, top: `${Math.min(Math.max(pctY, 5), 95)}%` }}
          >
            <div className={`relative flex flex-col items-center ${isSelected ? 'z-30' : 'z-10'}`}>
              <div
                className={`w-7 h-7 rounded-full shadow-lg flex items-center justify-center transition-all
                  ${isSelected ? 'ring-4 ring-white scale-125' : 'ring-2 ring-white/80 group-hover:scale-110'}`}
                style={{ backgroundColor: m.color }}
              >
                <div className="w-2 h-2 rounded-full bg-white/90" />
              </div>
              <div className="w-0.5 h-2" style={{ backgroundColor: m.color }} />
              {isSelected && m.title && (
                <div className="absolute top-full mt-1 left-1/2 -translate-x-1/2 bg-white px-2 py-1 rounded-lg shadow-xl border border-gray-200 whitespace-nowrap text-xs font-semibold text-gray-900 z-40">
                  {m.title}
                </div>
              )}
            </div>
          </button>
        );
      })}
    </div>
  );
}
