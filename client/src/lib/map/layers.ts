import { IconLayer, PathLayer, PolygonLayer, ScatterplotLayer } from '@deck.gl/layers';
import type { ScatterplotLayerProps, IconLayerProps, PathLayerProps, PolygonLayerProps } from '@deck.gl/layers';
import type { Point, LineString, Polygon } from 'geojson';
import type { OperationalFeature, Unit, LayerStyle } from '@/types/operational';

/**
 * Create a scatterplot layer for point features
 */
export function createPointLayer(
  id: string,
  data: OperationalFeature[],
  options: Partial<ScatterplotLayerProps<OperationalFeature>> = {}
) {
  return new ScatterplotLayer<OperationalFeature>({
    id,
    data,
    pickable: true,
    stroked: true,
    filled: true,
    getPosition: (d) => {
      const coords = (d.geometry as Point).coordinates;
      return [coords[0], coords[1]];
    },
    getRadius: 8,
    getFillColor: (d) => hexToRgb(d.properties?.style?.fillColor || '#4A90D9'),
    getLineColor: [255, 255, 255, 200],
    getLineWidth: 2,
    radiusMinPixels: 6,
    radiusMaxPixels: 20,
    ...options,
  });
}

/**
 * Create an icon layer for unit markers
 */
export function createIconLayer(
  id: string,
  data: Unit[],
  options: Partial<IconLayerProps<Unit>> = {}
) {
  return new IconLayer<Unit>({
    id,
    data,
    pickable: true,
    getPosition: (d) => [d.position[0], d.position[1]],
    getIcon: (d) => ({
      url: getUnitIconUrl(d),
      width: 48,
      height: 48,
      anchorY: 24,
    }),
    getSize: 40,
    sizeScale: 1,
    sizeMinPixels: 24,
    sizeMaxPixels: 64,
    ...options,
  });
}

/**
 * Create a path layer for routes and lines
 */
export function createPathLayer(
  id: string,
  data: OperationalFeature[],
  options: Partial<PathLayerProps<OperationalFeature>> = {}
) {
  return new PathLayer<OperationalFeature>({
    id,
    data,
    pickable: true,
    widthScale: 1,
    widthMinPixels: 2,
    getPath: (d) => (d.geometry as LineString).coordinates as [number, number][],
    getColor: (d) => hexToRgb(d.properties?.style?.strokeColor || '#FFD700'),
    getWidth: (d) => d.properties?.style?.strokeWidth || 2,
    ...options,
  });
}

/**
 * Create a polygon layer for zones
 */
export function createPolygonLayer(
  id: string,
  data: OperationalFeature[],
  options: Partial<PolygonLayerProps<OperationalFeature>> = {}
) {
  return new PolygonLayer<OperationalFeature>({
    id,
    data,
    pickable: true,
    stroked: true,
    filled: true,
    extruded: false,
    getPolygon: (d) => (d.geometry as Polygon).coordinates[0] as [number, number][],
    getFillColor: (d) => {
      const color = d.properties?.style?.fillColor || '#4A90D9';
      const opacity = d.properties?.style?.fillOpacity ?? 0.2;
      return [...hexToRgb(color), Math.floor(opacity * 255)] as [number, number, number, number];
    },
    getLineColor: (d) => hexToRgb(d.properties?.style?.strokeColor || '#4A90D9'),
    getLineWidth: (d) => d.properties?.style?.strokeWidth || 2,
    lineWidthMinPixels: 1,
    ...options,
  });
}

/**
 * Get icon URL for a unit based on its type and affiliation
 */
function getUnitIconUrl(unit: Unit): string {
  // Placeholder - in production, return actual icon URLs based on APP-6 symbology
  const baseUrl = '/sprites';
  return `${baseUrl}/${unit.affiliation}-${unit.unitType}.svg`;
}

/**
 * Convert hex color to RGB array
 */
function hexToRgb(hex: string): [number, number, number] {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (result) {
    return [
      parseInt(result[1], 16),
      parseInt(result[2], 16),
      parseInt(result[3], 16),
    ];
  }
  return [74, 144, 217]; // Default accent color
}

/**
 * Get style for a layer type
 */
export function getDefaultStyle(layerType: string): LayerStyle {
  switch (layerType) {
    case 'units':
      return { color: '#4A90D9', icon: 'unit' };
    case 'annotations':
      return { color: '#FFD700', strokeWidth: 2 };
    case 'zones':
      return { fillColor: '#4A90D9', fillOpacity: 0.2, strokeColor: '#4A90D9', strokeWidth: 2 };
    case 'routes':
      return { strokeColor: '#FFD700', strokeWidth: 3 };
    case 'points':
      return { color: '#FF6B6B', icon: 'marker' };
    default:
      return { color: '#888888' };
  }
}
