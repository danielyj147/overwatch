import { useEffect, useRef } from 'react';
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

  // Use selectors for only the values we need
  const activeTool = useMapStore((state) => state.activeTool);
  const drawingStyle = useMapStore((state) => state.drawingStyle);

  // Initialize drawing manager once
  useEffect(() => {
    if (!map || drawingManagerRef.current) return;

    drawingManagerRef.current = new DrawingManager({
      map,
      onFeatureCreated: (feature: OperationalFeature) => {
        const { ydoc, getAnnotations } = useCollaborationStore.getState();
        if (!ydoc) return;

        const annotations = getAnnotations();
        if (annotations) {
          ydoc.transact(() => {
            annotations.push([feature]);
          });
          console.log('[Drawing] Feature created and synced:', feature.properties?.id);
        }
      },
      onDrawingStateChange: (state: DrawingState) => {
        useMapStore.getState().setIsDrawing(state === 'drawing');
      },
      getUserId: () => {
        const { localUser } = useCollaborationStore.getState();
        return localUser?.id || 'anonymous';
      },
    });

    return () => {
      drawingManagerRef.current?.destroy();
      drawingManagerRef.current = null;
    };
  }, [map]);

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
