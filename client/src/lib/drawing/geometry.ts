import type { Point, LineString, Polygon, Position } from 'geojson';
import type { OperationalFeature, FeatureProperties, FeatureType } from '@/types/operational';

/**
 * Generate a unique feature ID
 */
export function generateFeatureId(): string {
  return `feature-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}

/**
 * Create a point feature
 */
export function createPointFeature(
  coordinates: Position,
  style: FeatureProperties['style'],
  userId: string,
  layerId: string,
  name?: string
): OperationalFeature {
  const now = Date.now();
  const id = generateFeatureId();

  return {
    type: 'Feature',
    geometry: {
      type: 'Point',
      coordinates,
    } as Point,
    properties: {
      id,
      name: name || `Point ${id.substring(0, 8)}`,
      featureType: 'point',
      layerId,
      style,
      createdBy: userId,
      createdAt: now,
      updatedAt: now,
    },
  };
}

/**
 * Create a line feature
 */
export function createLineFeature(
  coordinates: Position[],
  style: FeatureProperties['style'],
  userId: string,
  layerId: string,
  name?: string
): OperationalFeature {
  const now = Date.now();
  const id = generateFeatureId();

  return {
    type: 'Feature',
    geometry: {
      type: 'LineString',
      coordinates,
    } as LineString,
    properties: {
      id,
      name: name || `Line ${id.substring(0, 8)}`,
      featureType: 'line',
      layerId,
      style,
      createdBy: userId,
      createdAt: now,
      updatedAt: now,
    },
  };
}

/**
 * Create a polygon feature
 */
export function createPolygonFeature(
  coordinates: Position[],
  style: FeatureProperties['style'],
  userId: string,
  layerId: string,
  featureType: FeatureType = 'polygon',
  name?: string
): OperationalFeature {
  const now = Date.now();
  const id = generateFeatureId();

  // Ensure polygon is closed
  const closedCoords = [...coordinates];
  if (
    coordinates.length > 0 &&
    (coordinates[0][0] !== coordinates[coordinates.length - 1][0] ||
      coordinates[0][1] !== coordinates[coordinates.length - 1][1])
  ) {
    closedCoords.push(coordinates[0]);
  }

  return {
    type: 'Feature',
    geometry: {
      type: 'Polygon',
      coordinates: [closedCoords],
    } as Polygon,
    properties: {
      id,
      name: name || `${featureType.charAt(0).toUpperCase() + featureType.slice(1)} ${id.substring(0, 8)}`,
      featureType,
      layerId,
      style,
      createdBy: userId,
      createdAt: now,
      updatedAt: now,
    },
  };
}

/**
 * Create a rectangle from two corner points
 */
export function createRectangleCoordinates(
  start: Position,
  end: Position
): Position[] {
  return [
    [start[0], start[1]],
    [end[0], start[1]],
    [end[0], end[1]],
    [start[0], end[1]],
    [start[0], start[1]], // Close the polygon
  ];
}

/**
 * Create a circle approximation as a polygon
 */
export function createCircleCoordinates(
  center: Position,
  radiusInMeters: number,
  numPoints: number = 64
): Position[] {
  const coordinates: Position[] = [];
  const radiusInDegrees = radiusInMeters / 111320; // Approximate conversion

  for (let i = 0; i <= numPoints; i++) {
    const angle = (i / numPoints) * 2 * Math.PI;
    const lng = center[0] + radiusInDegrees * Math.cos(angle);
    const lat = center[1] + radiusInDegrees * Math.sin(angle);
    coordinates.push([lng, lat]);
  }

  return coordinates;
}

/**
 * Calculate distance between two points in meters
 */
export function calculateDistance(p1: Position, p2: Position): number {
  const R = 6371000; // Earth's radius in meters
  const lat1 = (p1[1] * Math.PI) / 180;
  const lat2 = (p2[1] * Math.PI) / 180;
  const deltaLat = ((p2[1] - p1[1]) * Math.PI) / 180;
  const deltaLng = ((p2[0] - p1[0]) * Math.PI) / 180;

  const a =
    Math.sin(deltaLat / 2) * Math.sin(deltaLat / 2) +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(deltaLng / 2) * Math.sin(deltaLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
}

/**
 * Calculate the center of a polygon
 */
export function calculatePolygonCenter(coordinates: Position[]): Position {
  let sumLng = 0;
  let sumLat = 0;
  const n = coordinates.length;

  for (const coord of coordinates) {
    sumLng += coord[0];
    sumLat += coord[1];
  }

  return [sumLng / n, sumLat / n];
}
