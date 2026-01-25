import { useEffect, useRef, useCallback } from 'react';
import type { Map as MapLibreMap } from 'maplibre-gl';
import { SelectionManager } from '@/lib/selection/SelectionManager';
import { useMapStore } from '@/stores/mapStore';
import { useCollaborationStore } from '@/stores/collaborationStore';
import type { SelectionBox } from '@/types/collaboration';
import type { OperationalFeature } from '@/types/operational';
import type { Point, LineString, Polygon, Position } from 'geojson';

interface SelectionToolsProps {
  map: MapLibreMap;
}

export function SelectionTools({ map }: SelectionToolsProps) {
  const selectionManagerRef = useRef<SelectionManager | null>(null);
  const activeTool = useMapStore((state) => state.activeTool);
  const { getAnnotations, ydoc } = useCollaborationStore();
  const { setSelection, clearSelection } = useMapStore();

  // Find features within selection box
  const findFeaturesInBox = useCallback(
    (box: SelectionBox): string[] => {
      if (!ydoc) return [];

      const annotations = getAnnotations();
      if (!annotations) return [];

      const features = annotations.toArray();
      const selectedIds: string[] = [];

      // Get bounding box in geographic coordinates
      const minLng = Math.min(box.startLng, box.endLng);
      const maxLng = Math.max(box.startLng, box.endLng);
      const minLat = Math.min(box.startLat, box.endLat);
      const maxLat = Math.max(box.startLat, box.endLat);

      for (const feature of features) {
        const id = feature.properties?.id;
        if (!id) continue;

        if (isFeatureInBounds(feature, minLng, maxLng, minLat, maxLat)) {
          selectedIds.push(id);
        }
      }

      return selectedIds;
    },
    [ydoc, getAnnotations]
  );

  // Handle selection box completion
  const handleSelectionComplete = useCallback(
    (box: SelectionBox, addToExisting: boolean) => {
      const newSelectedIds = findFeaturesInBox(box);

      if (newSelectedIds.length > 0) {
        if (addToExisting) {
          // Add to existing selection
          const currentIds = useMapStore.getState().selection.featureIds;
          const combinedIds = [...new Set([...currentIds, ...newSelectedIds])];
          setSelection({
            featureIds: combinedIds,
            featureType: 'annotation',
            isEditing: false,
          });
        } else {
          // Replace selection
          setSelection({
            featureIds: newSelectedIds,
            featureType: 'annotation',
            isEditing: false,
          });
        }
        console.log('[Selection] Selected features:', newSelectedIds);
      } else if (!addToExisting) {
        clearSelection();
      }
    },
    [findFeaturesInBox, setSelection, clearSelection]
  );

  // Initialize selection manager
  useEffect(() => {
    if (!map || selectionManagerRef.current) return;

    selectionManagerRef.current = new SelectionManager({
      map,
      onSelectionComplete: handleSelectionComplete,
    });

    return () => {
      selectionManagerRef.current?.destroy();
      selectionManagerRef.current = null;
    };
  }, [map, handleSelectionComplete]);

  // Enable/disable based on active tool
  useEffect(() => {
    if (!selectionManagerRef.current) return;

    if (activeTool === 'select') {
      selectionManagerRef.current.enable();
    } else {
      selectionManagerRef.current.disable();
    }
  }, [activeTool]);

  // Disable double-click zoom when shift is held to prevent zoom on shift+click
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Shift') {
        map.doubleClickZoom.disable();
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.key === 'Shift') {
        map.doubleClickZoom.enable();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('keyup', handleKeyUp);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('keyup', handleKeyUp);
      // Re-enable on cleanup
      map.doubleClickZoom.enable();
    };
  }, [map]);

  return null;
}

// Helper function to check if a feature is within bounds
function isFeatureInBounds(
  feature: OperationalFeature,
  minLng: number,
  maxLng: number,
  minLat: number,
  maxLat: number
): boolean {
  const geometry = feature.geometry;

  switch (geometry.type) {
    case 'Point': {
      const [lng, lat] = (geometry as Point).coordinates;
      return lng >= minLng && lng <= maxLng && lat >= minLat && lat <= maxLat;
    }

    case 'LineString': {
      const coords = (geometry as LineString).coordinates;
      // Check if any point of the line is within bounds
      return coords.some(
        ([lng, lat]) => lng >= minLng && lng <= maxLng && lat >= minLat && lat <= maxLat
      );
    }

    case 'Polygon': {
      const coords = (geometry as Polygon).coordinates[0];
      // Check if any point of the polygon is within bounds
      // or if the polygon contains any corner of the selection box
      const hasPointInBounds = coords.some(
        ([lng, lat]) => lng >= minLng && lng <= maxLng && lat >= minLat && lat <= maxLat
      );

      if (hasPointInBounds) return true;

      // Check if selection box corners are inside the polygon
      const boxCorners: Position[] = [
        [minLng, minLat],
        [maxLng, minLat],
        [maxLng, maxLat],
        [minLng, maxLat],
      ];

      return boxCorners.some((corner) => isPointInPolygon(corner, coords));
    }

    default:
      return false;
  }
}

// Point-in-polygon test using ray casting algorithm
function isPointInPolygon(point: Position, polygon: Position[]): boolean {
  const [x, y] = point;
  let inside = false;

  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const [xi, yi] = polygon[i];
    const [xj, yj] = polygon[j];

    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) {
      inside = !inside;
    }
  }

  return inside;
}
