import { useRef, useEffect, useState, useMemo } from "react";
import { useMapLibre } from "@/hooks/useMapLibre";
import { DeckOverlay } from "./DeckOverlay";
import { CollaborativeLayer } from "./CollaborativeLayer";
import { DrawingTools } from "./DrawingTools";
import { SelectionTools } from "./SelectionTools";
import { UserCursors } from "./UserCursors";
import { useMapStore } from "@/stores/mapStore";

export function MapContainer() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [container, setContainer] = useState<HTMLElement | null>(null);
  const { isMapReady } = useMapStore();

  // Set container after mount
  useEffect(() => {
    if (containerRef.current) {
      setContainer(containerRef.current);
    }
  }, []);

  // FIX: Memoize options to prevent infinite render loop.
  // Without this, a new object is created every render, triggering
  // useMapLibre -> setMap -> re-render -> new object -> useMapLibre...
  const mapOptions = useMemo(
    () => ({
      container,
      initialCenter: [-122.4194, 37.7749] as [number, number],
      initialZoom: 12,
    }),
    [container],
  );

  // Initialize MapLibre
  const { map } = useMapLibre(mapOptions);

  return (
    <div ref={containerRef} className="map-container relative w-full h-full">
      {/* Map renders here directly into the div */}

      {/* Deck.gl overlay for dynamic layers */}
      {isMapReady && map && <DeckOverlay map={map} />}

      {/* Collaborative annotations layer */}
      {isMapReady && <CollaborativeLayer />}

      {/* Drawing interaction layer */}
      {isMapReady && map && <DrawingTools map={map} />}

      {/* Selection tools for multi-select */}
      {isMapReady && map && <SelectionTools map={map} />}

      {/* Remote user cursors */}
      {isMapReady && <UserCursors />}

      {/* Loading state */}
      {!isMapReady && (
        <div className="absolute inset-0 flex items-center justify-center bg-surface z-50">
          <div className="flex flex-col items-center gap-4">
            <div className="w-12 h-12 border-4 border-accent border-t-transparent rounded-full animate-spin" />
            <span className="text-gray-400">Loading map...</span>
          </div>
        </div>
      )}
    </div>
  );
}
