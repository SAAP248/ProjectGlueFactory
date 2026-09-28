import { useRef, useEffect, useCallback } from 'react';
import L from 'leaflet';

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

const DEFAULT_CENTER: L.LatLngExpression = [35.5, -98.0];
const DEFAULT_ZOOM = 4;

const TILE_URL = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';
const TILE_ATTR =
  '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>';

function pinIcon(color: string, selected: boolean): L.DivIcon {
  const size = selected ? 36 : 24;
  const border = selected ? 'ring-[3px] ring-white shadow-xl scale-110' : 'ring-2 ring-white/80 shadow-lg';
  return L.divIcon({
    className: '',
    iconSize: [size, size],
    iconAnchor: [size / 2, size],
    popupAnchor: [0, -size],
    html: `<div style="width:${size}px;height:${size}px;" class="relative flex flex-col items-center">
      <div class="rounded-full ${border} flex items-center justify-center transition-transform" style="width:${size}px;height:${size}px;background:${color};">
        <div class="rounded-full bg-white/90" style="width:${size * 0.35}px;height:${size * 0.35}px;"></div>
      </div>
    </div>`,
  });
}

export default function GoogleMap({
  markers,
  selectedId,
  onMarkerClick,
  className = '',
}: GoogleMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markerLayerRef = useRef<L.LayerGroup | null>(null);
  const markerMapRef = useRef<Map<string, L.Marker>>(new Map());
  const onMarkerClickRef = useRef(onMarkerClick);
  onMarkerClickRef.current = onMarkerClick;

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = L.map(containerRef.current, {
      center: DEFAULT_CENTER,
      zoom: DEFAULT_ZOOM,
      zoomControl: true,
      attributionControl: true,
    });

    L.tileLayer(TILE_URL, { attribution: TILE_ATTR, maxZoom: 19 }).addTo(map);

    const layer = L.layerGroup().addTo(map);
    markerLayerRef.current = layer;
    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
      markerLayerRef.current = null;
      markerMapRef.current.clear();
    };
  }, []);

  const syncMarkers = useCallback(() => {
    const map = mapRef.current;
    const layer = markerLayerRef.current;
    if (!map || !layer) return;

    const currentIds = new Set(markers.map(m => m.id));

    markerMapRef.current.forEach((mk, id) => {
      if (!currentIds.has(id)) {
        layer.removeLayer(mk);
        markerMapRef.current.delete(id);
      }
    });

    markers.forEach(m => {
      const isSelected = m.id === selectedId;
      const icon = pinIcon(m.color, isSelected);
      const existing = markerMapRef.current.get(m.id);

      if (existing) {
        existing.setLatLng([m.lat, m.lng]);
        existing.setIcon(icon);
        existing.setZIndexOffset(isSelected ? 1000 : (m.zIndex || 0));
        if (m.title) existing.bindTooltip(m.title);
      } else {
        const mk = L.marker([m.lat, m.lng], {
          icon,
          zIndexOffset: isSelected ? 1000 : (m.zIndex || 0),
        });
        if (m.title) mk.bindTooltip(m.title);
        const markerId = m.id;
        mk.on('click', () => onMarkerClickRef.current?.(markerId));
        mk.addTo(layer);
        markerMapRef.current.set(m.id, mk);
      }
    });
  }, [markers, selectedId]);

  useEffect(() => {
    syncMarkers();
  }, [syncMarkers]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || markers.length === 0) return;

    const bounds = L.latLngBounds(markers.map(m => [m.lat, m.lng] as L.LatLngTuple));
    if (markers.length === 1) {
      map.setView(bounds.getCenter(), 14);
    } else {
      map.fitBounds(bounds, { padding: [50, 50] });
    }
  }, [markers.length]);

  useEffect(() => {
    if (!selectedId || !mapRef.current) return;
    const m = markers.find(mk => mk.id === selectedId);
    if (m) {
      mapRef.current.panTo([m.lat, m.lng]);
    }
  }, [selectedId, markers]);

  return (
    <div className={`relative ${className}`}>
      <div ref={containerRef} className="absolute inset-0 z-0" />
    </div>
  );
}
