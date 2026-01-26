import { useEffect, useRef, useMemo } from 'react';
import { MapboxOverlay } from '@deck.gl/mapbox';
import type { Map as MapLibreMap } from 'maplibre-gl';
import { useDeckLayers } from '@/hooks/useDeckLayers';
import { useWeatherLayers } from '@/hooks/useWeatherLayers';

interface DeckOverlayProps {
  map: MapLibreMap;
}

export function DeckOverlay({ map }: DeckOverlayProps) {
  const overlayRef = useRef<MapboxOverlay | null>(null);
  const { layers: annotationLayers, handleClick, handleHover } = useDeckLayers();
  const { layers: weatherLayers } = useWeatherLayers();

  // Combine layers: weather layers render below annotation layers
  const layers = useMemo(
    () => [...weatherLayers, ...annotationLayers],
    [weatherLayers, annotationLayers]
  );

  // Store callbacks in refs to avoid re-creating overlay
  const handleClickRef = useRef(handleClick);
  const handleHoverRef = useRef(handleHover);
  handleClickRef.current = handleClick;
  handleHoverRef.current = handleHover;

  // Initialize Deck.gl overlay once
  useEffect(() => {
    if (!map || overlayRef.current) return;

    const overlay = new MapboxOverlay({
      interleaved: true,
      layers: [],
      onClick: (info, event) => {
        // Prevent default behavior (like zoom) when shift is held
        if (event.srcEvent?.shiftKey) {
          event.srcEvent.preventDefault();
          event.srcEvent.stopPropagation();
        }
        if (info.picked) {
          handleClickRef.current(info, event);
        }
      },
      onHover: (info) => {
        handleHoverRef.current(info);
        // Change cursor on hover
        map.getCanvas().style.cursor = info.picked ? 'pointer' : '';
      },
    });

    map.addControl(overlay as unknown as maplibregl.IControl);
    overlayRef.current = overlay;

    console.log('[DeckOverlay] Initialized');

    return () => {
      if (overlayRef.current) {
        map.removeControl(overlayRef.current as unknown as maplibregl.IControl);
        overlayRef.current = null;
      }
    };
  }, [map]);

  // Update layers when they change
  useEffect(() => {
    if (overlayRef.current) {
      overlayRef.current.setProps({ layers });
    }
  }, [layers]);

  return null; // This component doesn't render anything directly
}
