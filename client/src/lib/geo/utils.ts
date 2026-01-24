import type { Feature, FeatureCollection, Geometry, Position } from 'geojson';

/**
 * Create an empty GeoJSON FeatureCollection
 */
export function createFeatureCollection<G extends Geometry = Geometry, P = Record<string, unknown>>(
  features: Feature<G, P>[] = []
): FeatureCollection<G, P> {
  return {
    type: 'FeatureCollection',
    features,
  };
}

/**
 * Calculate the bounding box of a set of coordinates
 */
export function calculateBounds(coordinates: Position[]): [[number, number], [number, number]] {
  if (coordinates.length === 0) {
    return [
      [-180, -90],
      [180, 90],
    ];
  }

  let minLng = Infinity;
  let maxLng = -Infinity;
  let minLat = Infinity;
  let maxLat = -Infinity;

  for (const coord of coordinates) {
    minLng = Math.min(minLng, coord[0]);
    maxLng = Math.max(maxLng, coord[0]);
    minLat = Math.min(minLat, coord[1]);
    maxLat = Math.max(maxLat, coord[1]);
  }

  return [
    [minLng, minLat],
    [maxLng, maxLat],
  ];
}

/**
 * Format coordinates for display
 */
export function formatCoordinates(lng: number, lat: number, precision: number = 5): string {
  const latDir = lat >= 0 ? 'N' : 'S';
  const lngDir = lng >= 0 ? 'E' : 'W';
  return `${Math.abs(lat).toFixed(precision)}${latDir}, ${Math.abs(lng).toFixed(precision)}${lngDir}`;
}

/**
 * Format DMS (Degrees, Minutes, Seconds) coordinates
 */
export function formatDMS(lng: number, lat: number): string {
  const formatDegrees = (value: number, isLat: boolean): string => {
    const dir = isLat ? (value >= 0 ? 'N' : 'S') : (value >= 0 ? 'E' : 'W');
    const abs = Math.abs(value);
    const deg = Math.floor(abs);
    const minFloat = (abs - deg) * 60;
    const min = Math.floor(minFloat);
    const sec = ((minFloat - min) * 60).toFixed(1);
    return `${deg}°${min}'${sec}"${dir}`;
  };

  return `${formatDegrees(lat, true)} ${formatDegrees(lng, false)}`;
}

/**
 * Calculate area of a polygon in square meters (approximate)
 */
export function calculateArea(coordinates: Position[]): number {
  if (coordinates.length < 3) return 0;

  // Shoelace formula with spherical adjustment
  let area = 0;
  const n = coordinates.length;

  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n;
    area += coordinates[i][0] * coordinates[j][1];
    area -= coordinates[j][0] * coordinates[i][1];
  }

  area = Math.abs(area) / 2;

  // Convert from degrees to approximate square meters (at equator)
  // This is a rough approximation; for accurate measurements, use a proper projection
  const metersPerDegree = 111320;
  return area * metersPerDegree * metersPerDegree;
}

/**
 * Calculate length of a line in meters
 */
export function calculateLength(coordinates: Position[]): number {
  if (coordinates.length < 2) return 0;

  let length = 0;
  for (let i = 0; i < coordinates.length - 1; i++) {
    length += haversineDistance(coordinates[i], coordinates[i + 1]);
  }

  return length;
}

/**
 * Haversine distance between two points in meters
 */
export function haversineDistance(p1: Position, p2: Position): number {
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
 * Check if a point is inside a polygon
 */
export function pointInPolygon(point: Position, polygon: Position[]): boolean {
  const x = point[0];
  const y = point[1];
  let inside = false;

  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const xi = polygon[i][0];
    const yi = polygon[i][1];
    const xj = polygon[j][0];
    const yj = polygon[j][1];

    const intersect =
      yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi;
    if (intersect) inside = !inside;
  }

  return inside;
}

/**
 * Simplify a line using Douglas-Peucker algorithm
 */
export function simplifyLine(coordinates: Position[], tolerance: number = 0.0001): Position[] {
  if (coordinates.length <= 2) return coordinates;

  // Find the point with the maximum distance from the line
  let maxDistance = 0;
  let maxIndex = 0;

  const first = coordinates[0];
  const last = coordinates[coordinates.length - 1];

  for (let i = 1; i < coordinates.length - 1; i++) {
    const distance = perpendicularDistance(coordinates[i], first, last);
    if (distance > maxDistance) {
      maxDistance = distance;
      maxIndex = i;
    }
  }

  // If max distance is greater than tolerance, recursively simplify
  if (maxDistance > tolerance) {
    const left = simplifyLine(coordinates.slice(0, maxIndex + 1), tolerance);
    const right = simplifyLine(coordinates.slice(maxIndex), tolerance);
    return [...left.slice(0, -1), ...right];
  }

  return [first, last];
}

function perpendicularDistance(point: Position, lineStart: Position, lineEnd: Position): number {
  const dx = lineEnd[0] - lineStart[0];
  const dy = lineEnd[1] - lineStart[1];

  if (dx === 0 && dy === 0) {
    return haversineDistance(point, lineStart);
  }

  const t = ((point[0] - lineStart[0]) * dx + (point[1] - lineStart[1]) * dy) / (dx * dx + dy * dy);
  const clampedT = Math.max(0, Math.min(1, t));

  const closestPoint: Position = [
    lineStart[0] + clampedT * dx,
    lineStart[1] + clampedT * dy,
  ];

  return haversineDistance(point, closestPoint);
}
