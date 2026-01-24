import { useEffect, useRef, useCallback } from 'react';
import maplibregl, { Map as MapLibreMap, MapOptions } from 'maplibre-gl';
import { useMapStore } from '@/stores/mapStore';
import { useCollaborationStore } from '@/stores/collaborationStore';

interface UseMapLibreOptions {
  container: HTMLElement | null;
  style?: string;
  initialCenter?: [number, number];
  initialZoom?: number;
}

const DEFAULT_STYLE = 'https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json';

export function useMapLibre({
  container,
  style = DEFAULT_STYLE,
  initialCenter = [-122.4194, 37.7749],
  initialZoom = 12,
}: UseMapLibreOptions) {
  const mapRef = useRef<MapLibreMap | null>(null);
  const initializedRef = useRef(false);

  // Initialize map only once
  useEffect(() => {
    if (!container || initializedRef.current) return;
    initializedRef.current = true;

    const mapOptions: MapOptions = {
      container,
      style,
      center: initialCenter,
      zoom: initialZoom,
      attributionControl: false,
      maxPitch: 60,
    };

    const map = new maplibregl.Map(mapOptions);
    mapRef.current = map;

    // Add attribution control in bottom-right
    map.addControl(
      new maplibregl.AttributionControl({ compact: true }),
      'bottom-right'
    );

    // Add navigation controls
    map.addControl(
      new maplibregl.NavigationControl({ visualizePitch: true }),
      'top-right'
    );

    // Add scale control
    map.addControl(
      new maplibregl.ScaleControl({ maxWidth: 100, unit: 'metric' }),
      'bottom-left'
    );

    // Handle map load
    map.on('load', () => {
      useMapStore.getState().setMap(map);
      useMapStore.getState().setMapReady(true);
      console.log('[Map] MapLibre GL loaded');
    });

    // Track viewport changes
    map.on('moveend', () => {
      const center = map.getCenter();
      useMapStore.getState().setViewport({
        center: [center.lng, center.lat],
        zoom: map.getZoom(),
        bearing: map.getBearing(),
        pitch: map.getPitch(),
      });
    });

    // Track cursor position
    let cursorUpdateTimeout: ReturnType<typeof setTimeout> | null = null;
    map.on('mousemove', (e) => {
      useMapStore.getState().setCursorCoordinates({ lng: e.lngLat.lng, lat: e.lngLat.lat });

      // Debounce awareness updates
      if (cursorUpdateTimeout) clearTimeout(cursorUpdateTimeout);
      cursorUpdateTimeout = setTimeout(() => {
        const { provider } = useCollaborationStore.getState();
        if (provider) {
          useCollaborationStore.getState().updateCursor(e.point.x, e.point.y, e.lngLat.lng, e.lngLat.lat);
        }
      }, 50);
    });

    map.on('mouseout', () => {
      useMapStore.getState().setCursorCoordinates(null);
    });

    // Cleanup
    return () => {
      if (cursorUpdateTimeout) clearTimeout(cursorUpdateTimeout);
      map.remove();
      mapRef.current = null;
      initializedRef.current = false;
      useMapStore.getState().setMap(null);
      useMapStore.getState().setMapReady(false);
    };
  }, [container, style, initialCenter, initialZoom]);

  // Fly to location
  const flyTo = useCallback((center: [number, number], zoom?: number) => {
    mapRef.current?.flyTo({
      center,
      zoom: zoom ?? mapRef.current.getZoom(),
      duration: 1500,
    });
  }, []);

  // Fit bounds
  const fitBounds = useCallback(
    (bounds: [[number, number], [number, number]], padding = 50) => {
      mapRef.current?.fitBounds(bounds, { padding, duration: 1500 });
    },
    []
  );

  return {
    map: mapRef.current,
    flyTo,
    fitBounds,
  };
}
