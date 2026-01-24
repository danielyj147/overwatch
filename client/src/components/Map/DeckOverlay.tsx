import { useEffect, useRef, useCallback } from 'react';
import { MapboxOverlay } from '@deck.gl/mapbox';
import type { Map as MapLibreMap } from 'maplibre-gl';
import { useDeckLayers } from '@/hooks/useDeckLayers';

interface DeckOverlayProps {
  map: MapLibreMap;
}

export function DeckOverlay({ map }: DeckOverlayProps) {
  const overlayRef = useRef<MapboxOverlay | null>(null);
  const { layers, handleClick, handleHover } = useDeckLayers();

  // Initialize Deck.gl overlay
  useEffect(() => {
    if (!map || overlayRef.current) return;

    const overlay = new MapboxOverlay({
      interleaved: true,
      layers: [],
      onClick: (info) => {
        if (info.picked) {
          handleClick(info);
        }
      },
      onHover: (info) => {
        handleHover(info);
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
  }, [map, handleClick, handleHover]);

  // Update layers when they change
  useEffect(() => {
    if (overlayRef.current) {
      overlayRef.current.setProps({ layers });
    }
  }, [layers]);

  return null; // This component doesn't render anything directly
}
