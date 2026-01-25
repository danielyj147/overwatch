import { useMemo, useCallback, useState, useEffect } from 'react';
import { PathLayer, PolygonLayer, ScatterplotLayer } from '@deck.gl/layers';
import type { PickingInfo, Layer as DeckLayer } from '@deck.gl/core';
import type { Point, LineString, Polygon } from 'geojson';
import { useCollaborationStore } from '@/stores/collaborationStore';
import { useMapStore } from '@/stores/mapStore';
import type { OperationalFeature, Layer } from '@/types/operational';

export function useDeckLayers() {
  const { getAnnotations, getLayers, ydoc } = useCollaborationStore();
  const { selection, toggleSelection, drawingPreview, drawingStyle, selectionBox } = useMapStore();
  const [annotationsData, setAnnotationsData] = useState<OperationalFeature[]>([]);
  const [layersData, setLayersData] = useState<Layer[]>([]);

  // Create a Set for fast selection lookup
  const selectedIds = useMemo(() => new Set(selection.featureIds), [selection.featureIds]);

  // Subscribe to Yjs annotations changes
  useEffect(() => {
    if (!ydoc) return;

    const annotations = getAnnotations();
    if (!annotations) return;

    // Initial load
    setAnnotationsData(annotations.toArray());

    // Subscribe to changes
    const observer = () => {
      setAnnotationsData(annotations.toArray());
    };

    annotations.observe(observer);

    return () => {
      annotations.unobserve(observer);
    };
  }, [ydoc, getAnnotations]);

  // Subscribe to Yjs layers changes
  useEffect(() => {
    if (!ydoc) return;

    const layers = getLayers();
    if (!layers) return;

    // Initial load
    setLayersData(layers.toArray());

    // Subscribe to changes
    const observer = () => {
      setLayersData(layers.toArray());
    };

    layers.observe(observer);

    return () => {
      layers.unobserve(observer);
    };
  }, [ydoc, getLayers]);

  // Create a map of layer visibility
  const layerVisibilityMap = useMemo(() => {
    const map = new Map<string, boolean>();
    layersData.forEach((layer) => {
      map.set(layer.id, layer.visible);
    });
    return map;
  }, [layersData]);

  // Filter annotations by visible layers
  const visibleAnnotations = useMemo(() => {
    return annotationsData.filter((feature) => {
      const layerId = feature.properties?.layerId;
      if (!layerId) return true; // Show features without layerId
      return layerVisibilityMap.get(layerId) !== false;
    });
  }, [annotationsData, layerVisibilityMap]);

  // Create layers based on visible data
  const layers = useMemo(() => {
    const activeLayers: DeckLayer[] = [];

    // Selection box layer (drag-to-select rectangle)
    if (selectionBox) {
      const boxCoords: [number, number][] = [
        [selectionBox.startLng, selectionBox.startLat],
        [selectionBox.endLng, selectionBox.startLat],
        [selectionBox.endLng, selectionBox.endLat],
        [selectionBox.startLng, selectionBox.endLat],
        [selectionBox.startLng, selectionBox.startLat],
      ];
      activeLayers.push(
        new PolygonLayer({
          id: 'selection-box',
          data: [{ polygon: boxCoords }],
          getPolygon: (d: { polygon: [number, number][] }) => d.polygon,
          getFillColor: [59, 130, 246, 30], // Blue with low opacity
          getLineColor: [59, 130, 246, 200], // Blue border
          getLineWidth: 1,
          lineWidthMinPixels: 1,
          stroked: true,
          filled: true,
        })
      );
    }

    // Drawing preview layer (in-progress drawing)
    if (drawingPreview && drawingPreview.coordinates.length > 0) {
      const previewColor = hexToRgba(drawingStyle.color, 255);
      const previewFill = hexToRgba(drawingStyle.fillColor, Math.floor(drawingStyle.fillOpacity * 255));

      if (drawingPreview.type === 'line') {
        activeLayers.push(
          new PathLayer({
            id: 'drawing-preview-line',
            data: [{ path: drawingPreview.coordinates }],
            getPath: (d: { path: [number, number][] }) => d.path,
            getColor: previewColor,
            getWidth: drawingStyle.strokeWidth,
            widthMinPixels: 2,
            getDashArray: [4, 2],
            dashJustified: true,
          })
        );
        // Show vertices as points
        activeLayers.push(
          new ScatterplotLayer({
            id: 'drawing-preview-vertices',
            data: drawingPreview.coordinates,
            getPosition: (d: [number, number]) => d,
            getRadius: 4,
            getFillColor: [255, 255, 255, 255],
            getLineColor: previewColor,
            getLineWidth: 2,
            stroked: true,
            radiusMinPixels: 4,
            radiusMaxPixels: 8,
          })
        );
      } else if (drawingPreview.type === 'polygon' || drawingPreview.type === 'rectangle' || drawingPreview.type === 'circle') {
        activeLayers.push(
          new PolygonLayer({
            id: 'drawing-preview-polygon',
            data: [{ polygon: drawingPreview.coordinates }],
            getPolygon: (d: { polygon: [number, number][] }) => d.polygon,
            getFillColor: previewFill,
            getLineColor: previewColor,
            getLineWidth: drawingStyle.strokeWidth,
            lineWidthMinPixels: 2,
            stroked: true,
            filled: true,
          })
        );
        // Show vertices as points (excluding the closing vertex for polygons)
        const vertices = drawingPreview.type === 'polygon'
          ? drawingPreview.coordinates.slice(0, -1)
          : drawingPreview.coordinates;
        activeLayers.push(
          new ScatterplotLayer({
            id: 'drawing-preview-vertices',
            data: vertices,
            getPosition: (d: [number, number]) => d,
            getRadius: 4,
            getFillColor: [255, 255, 255, 255],
            getLineColor: previewColor,
            getLineWidth: 2,
            stroked: true,
            radiusMinPixels: 4,
            radiusMaxPixels: 8,
          })
        );
      }
    }

    // Points layer for point annotations
    const pointFeatures = visibleAnnotations.filter(
      (f) => f.geometry.type === 'Point'
    );
    if (pointFeatures.length > 0) {
      activeLayers.push(
        new ScatterplotLayer({
          id: 'annotations-points',
          data: pointFeatures,
          pickable: true,
          stroked: true,
          filled: true,
          getPosition: (d: OperationalFeature) => {
            const coords = (d.geometry as Point).coordinates;
            return [coords[0], coords[1]];
          },
          getRadius: 8,
          getFillColor: (d: OperationalFeature) => {
            const color = d.properties?.style?.fillColor || '#FFD700';
            return hexToRgba(color, 200);
          },
          getLineColor: (d: OperationalFeature) => {
            const isSelected = selectedIds.has(d.properties?.id || '');
            return isSelected ? [59, 130, 246, 255] : [255, 255, 255, 180];
          },
          getLineWidth: (d: OperationalFeature) => {
            const isSelected = selectedIds.has(d.properties?.id || '');
            return isSelected ? 3 : 2;
          },
          radiusMinPixels: 6,
          radiusMaxPixels: 20,
          updateTriggers: {
            getLineColor: [selectedIds],
            getLineWidth: [selectedIds],
          },
        })
      );
    }

    // Lines layer for line annotations
    const lineFeatures = visibleAnnotations.filter(
      (f) => f.geometry.type === 'LineString'
    );
    if (lineFeatures.length > 0) {
      activeLayers.push(
        new PathLayer({
          id: 'annotations-lines',
          data: lineFeatures,
          pickable: true,
          widthScale: 1,
          widthMinPixels: 2,
          getPath: (d: OperationalFeature) => (d.geometry as LineString).coordinates as [number, number][],
          getColor: (d: OperationalFeature) => {
            const isSelected = selectedIds.has(d.properties?.id || '');
            if (isSelected) return [59, 130, 246, 255]; // Blue for selected
            const color = d.properties?.style?.strokeColor || '#FFD700';
            return hexToRgba(color, 255);
          },
          getWidth: (d: OperationalFeature) => {
            const isSelected = selectedIds.has(d.properties?.id || '');
            return isSelected ? 4 : d.properties?.style?.strokeWidth || 2;
          },
          updateTriggers: {
            getColor: [selectedIds],
            getWidth: [selectedIds],
          },
        })
      );
    }

    // Polygons layer for polygon annotations
    const polygonFeatures = visibleAnnotations.filter(
      (f) => f.geometry.type === 'Polygon'
    );
    if (polygonFeatures.length > 0) {
      activeLayers.push(
        new PolygonLayer({
          id: 'annotations-polygons',
          data: polygonFeatures,
          pickable: true,
          stroked: true,
          filled: true,
          extruded: false,
          getPolygon: (d: OperationalFeature) => (d.geometry as Polygon).coordinates[0] as [number, number][],
          getFillColor: (d: OperationalFeature) => {
            const color = d.properties?.style?.fillColor || '#FFD700';
            const opacity = d.properties?.style?.fillOpacity ?? 0.2;
            return hexToRgba(color, Math.floor(opacity * 255));
          },
          getLineColor: (d: OperationalFeature) => {
            const isSelected = selectedIds.has(d.properties?.id || '');
            if (isSelected) return [59, 130, 246, 255]; // Blue for selected
            const color = d.properties?.style?.strokeColor || '#FFD700';
            return hexToRgba(color, 255);
          },
          getLineWidth: (d: OperationalFeature) => {
            const isSelected = selectedIds.has(d.properties?.id || '');
            return isSelected ? 3 : d.properties?.style?.strokeWidth || 2;
          },
          lineWidthMinPixels: 1,
          updateTriggers: {
            getLineColor: [selectedIds],
            getLineWidth: [selectedIds],
          },
        })
      );
    }

    return activeLayers;
  }, [visibleAnnotations, selectedIds, drawingPreview, drawingStyle, selectionBox]);

  // Handle click on features
  const handleClick = useCallback((info: PickingInfo, event: { srcEvent: MouseEvent }) => {
    const feature = info.object as OperationalFeature | undefined;
    if (feature?.properties?.id) {
      const isShiftClick = event.srcEvent.shiftKey;
      toggleSelection(feature.properties.id, isShiftClick);
    }
  }, [toggleSelection]);

  // Handle hover on features
  const handleHover = useCallback((_info: PickingInfo) => {
    // Can be used for tooltips or highlighting
  }, []);

  return {
    layers,
    handleClick,
    handleHover,
  };
}

// Helper function to convert hex color to RGBA array
function hexToRgba(hex: string, alpha: number): [number, number, number, number] {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (result) {
    return [
      parseInt(result[1], 16),
      parseInt(result[2], 16),
      parseInt(result[3], 16),
      alpha,
    ];
  }
  return [255, 215, 0, alpha]; // Default gold color
}
