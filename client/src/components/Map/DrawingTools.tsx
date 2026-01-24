import { useEffect, useRef, useCallback } from 'react';
import type { Map as MapLibreMap } from 'maplibre-gl';
import { DrawingManager, type DrawingState } from '@/lib/drawing/DrawingManager';
import { useMapStore } from '@/stores/mapStore';
import { useCollaborationStore } from '@/stores/collaborationStore';
import type { OperationalFeature } from '@/types/operational';

interface DrawingToolsProps {
  map: MapLibreMap;
}

export function DrawingTools({ map }: DrawingToolsProps) {
  const drawingManagerRef = useRef<DrawingManager | null>(null);
  const { activeTool, drawingStyle, setIsDrawing } = useMapStore();
  const { getAnnotations, localUser, ydoc } = useCollaborationStore();

  // Handle feature creation - add to Yjs
  const handleFeatureCreated = useCallback(
    (feature: OperationalFeature) => {
      if (!ydoc) return;

      const annotations = getAnnotations();
      if (annotations) {
        ydoc.transact(() => {
          annotations.push([feature]);
        });
        console.log('[Drawing] Feature created and synced:', feature.properties?.id);
      }
    },
    [ydoc, getAnnotations]
  );

  // Handle drawing state changes
  const handleDrawingStateChange = useCallback(
    (state: DrawingState) => {
      setIsDrawing(state === 'drawing');
    },
    [setIsDrawing]
  );

  // Get current user ID
  const getUserId = useCallback(() => {
    return localUser?.id || 'anonymous';
  }, [localUser]);

  // Initialize drawing manager
  useEffect(() => {
    if (!map) return;

    drawingManagerRef.current = new DrawingManager({
      map,
      onFeatureCreated: handleFeatureCreated,
      onDrawingStateChange: handleDrawingStateChange,
      getUserId,
    });

    return () => {
      drawingManagerRef.current?.destroy();
      drawingManagerRef.current = null;
    };
  }, [map, handleFeatureCreated, handleDrawingStateChange, getUserId]);

  // Update tool when it changes
  useEffect(() => {
    if (drawingManagerRef.current) {
      drawingManagerRef.current.setTool(activeTool);

      // Update cursor based on tool
      const canvas = map.getCanvas();
      if (activeTool === 'select') {
        canvas.style.cursor = '';
      } else {
        canvas.style.cursor = 'crosshair';
      }
    }
  }, [activeTool, map]);

  // Update style when it changes
  useEffect(() => {
    if (drawingManagerRef.current) {
      drawingManagerRef.current.setStyle(drawingStyle);
    }
  }, [drawingStyle]);

  // This component doesn't render anything visible
  return null;
}
