import { useMemo, useCallback, useState, useEffect } from 'react';
import { PathLayer, PolygonLayer, ScatterplotLayer } from '@deck.gl/layers';
import type { PickingInfo, Layer } from '@deck.gl/core';
import type { Point, LineString, Polygon } from 'geojson';
import { useCollaborationStore } from '@/stores/collaborationStore';
import { useMapStore } from '@/stores/mapStore';
import type { OperationalFeature } from '@/types/operational';

export function useDeckLayers() {
  const { getAnnotations, ydoc } = useCollaborationStore();
  const { layerVisibility, selection, setSelection, drawingPreview, drawingStyle } = useMapStore();
  const [annotationsData, setAnnotationsData] = useState<OperationalFeature[]>([]);

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

  // Create layers based on visible data
  const layers = useMemo(() => {
    const activeLayers: Layer[] = [];

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

    // Annotations layer (user-drawn features)
    if (layerVisibility['b2c3d4e5-f6a7-5b6c-9d0e-1f2a3b4c5d6e'] !== false) {
      // Points layer for point annotations
      const pointFeatures = annotationsData.filter(
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
              const isSelected = selection.featureId === d.properties?.id;
              return isSelected ? [255, 255, 255, 255] : [255, 255, 255, 180];
            },
            getLineWidth: (d: OperationalFeature) => {
              const isSelected = selection.featureId === d.properties?.id;
              return isSelected ? 3 : 2;
            },
            radiusMinPixels: 6,
            radiusMaxPixels: 20,
          })
        );
      }

      // Lines layer for line annotations
      const lineFeatures = annotationsData.filter(
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
              const color = d.properties?.style?.strokeColor || '#FFD700';
              return hexToRgba(color, 255);
            },
            getWidth: (d: OperationalFeature) => {
              const isSelected = selection.featureId === d.properties?.id;
              return isSelected ? 4 : d.properties?.style?.strokeWidth || 2;
            },
          })
        );
      }

      // Polygons layer for polygon annotations
      const polygonFeatures = annotationsData.filter(
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
              const color = d.properties?.style?.strokeColor || '#FFD700';
              const isSelected = selection.featureId === d.properties?.id;
              return isSelected ? [255, 255, 255, 255] : hexToRgba(color, 255);
            },
            getLineWidth: (d: OperationalFeature) => {
              const isSelected = selection.featureId === d.properties?.id;
              return isSelected ? 3 : d.properties?.style?.strokeWidth || 2;
            },
            lineWidthMinPixels: 1,
          })
        );
      }
    }

    return activeLayers;
  }, [annotationsData, layerVisibility, selection.featureId, drawingPreview, drawingStyle]);

  // Handle click on features
  const handleClick = useCallback((info: PickingInfo) => {
    const feature = info.object as OperationalFeature | undefined;
    if (feature?.properties?.id) {
      setSelection({
        featureId: feature.properties.id,
        featureType: 'annotation',
        isEditing: false,
      });
    }
  }, [setSelection]);

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
