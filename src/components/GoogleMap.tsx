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
  const shadow = selected
    ? 'box-shadow:0 0 0 3px #fff,0 2px 8px rgba(0,0,0,.35);transform:scale(1.1)'
    : 'box-shadow:0 0 0 2px rgba(255,255,255,.8),0 1px 4px rgba(0,0,0,.3)';
  const inner = Math.round(size * 0.35);
  return L.divIcon({
    className: '',
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
    html: `<div style="width:${size}px;height:${size}px;border-radius:50%;background:${color};${shadow};display:flex;align-items:center;justify-content:center;cursor:pointer;">
      <div style="width:${inner}px;height:${inner}px;border-radius:50%;background:rgba(255,255,255,0.9);"></div>
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
  const hasFitRef = useRef(false);

  useEffect(() => {
    if (!containerRef.current) return;

    if (mapRef.current) {
      mapRef.current.invalidateSize();
      return;
    }

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

    setTimeout(() => map.invalidateSize(), 100);
    setTimeout(() => map.invalidateSize(), 300);

    return () => {
      map.remove();
      mapRef.current = null;
      markerLayerRef.current = null;
      markerMapRef.current.clear();
      hasFitRef.current = false;
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const ro = new ResizeObserver(() => map.invalidateSize());
    if (containerRef.current) ro.observe(containerRef.current);
    return () => ro.disconnect();
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
    if (!map || markers.length === 0 || hasFitRef.current) return;

    map.invalidateSize();

    const valid = markers.filter(m => m.lat && m.lng && isFinite(m.lat) && isFinite(m.lng));
    if (valid.length === 0) return;

    const bounds = L.latLngBounds(valid.map(m => [m.lat, m.lng] as L.LatLngTuple));
    if (valid.length === 1) {
      map.setView(bounds.getCenter(), 14);
    } else {
      map.fitBounds(bounds, { padding: [50, 50] });
    }
    hasFitRef.current = true;
  }, [markers]);

  useEffect(() => {
    if (!selectedId || !mapRef.current) return;
    const m = markers.find(mk => mk.id === selectedId);
    if (m) {
      mapRef.current.panTo([m.lat, m.lng]);
    }
  }, [selectedId, markers]);

  return (
    <div className={`relative ${className}`} style={{ minHeight: 400 }}>
      <div ref={containerRef} className="absolute inset-0 z-0" style={{ height: '100%', width: '100%' }} />
    </div>
  );
}
