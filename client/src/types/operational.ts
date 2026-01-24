import type { Feature, FeatureCollection, Point, LineString, Polygon, Position } from 'geojson';

/**
 * Unit affiliation based on NATO APP-6 standard
 */
export type Affiliation = 'friendly' | 'hostile' | 'neutral' | 'unknown';

/**
 * Operational status of units and features
 */
export type OperationalStatus = 'active' | 'inactive' | 'destroyed' | 'damaged';

/**
 * Layer types in the system
 */
export type LayerType = 'units' | 'annotations' | 'zones' | 'routes' | 'points';

/**
 * Feature types for drawn annotations
 */
export type FeatureType = 'point' | 'line' | 'polygon' | 'circle' | 'rectangle';

/**
 * Layer definition
 */
export interface Layer {
  id: string;
  name: string;
  description?: string;
  layerType: LayerType;
  style: LayerStyle;
  zIndex: number;
  visible: boolean;
  locked: boolean;
  createdBy?: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * Style configuration for layers
 */
export interface LayerStyle {
  color?: string;
  fillColor?: string;
  fillOpacity?: number;
  strokeColor?: string;
  strokeWidth?: number;
  strokeDasharray?: number[];
  icon?: string;
}

/**
 * Properties for map features
 */
export interface FeatureProperties {
  id: string;
  name?: string;
  description?: string;
  featureType: FeatureType;
  layerId: string;
  style: LayerStyle;
  createdBy?: string;
  createdAt: number;
  updatedAt: number;
  [key: string]: unknown;
}

/**
 * GeoJSON Feature with typed properties
 */
export type OperationalFeature = Feature<Point | LineString | Polygon, FeatureProperties>;

/**
 * GeoJSON FeatureCollection for operational data
 */
export type OperationalFeatureCollection = FeatureCollection<Point | LineString | Polygon, FeatureProperties>;

/**
 * Unit representation
 */
export interface Unit {
  id: string;
  callsign: string;
  unitType: UnitType;
  affiliation: Affiliation;
  position: Position; // [longitude, latitude]
  heading?: number;
  speed?: number;
  altitude?: number;
  status: OperationalStatus;
  strength?: number;
  properties: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

/**
 * Unit types (simplified military taxonomy)
 */
export type UnitType =
  | 'infantry'
  | 'armor'
  | 'artillery'
  | 'aviation'
  | 'naval'
  | 'logistics'
  | 'headquarters'
  | 'medical'
  | 'communications'
  | 'reconnaissance'
  | 'engineering'
  | 'other';

/**
 * Zone types for operational areas
 */
export type ZoneType =
  | 'AO' // Area of Operations
  | 'restricted'
  | 'nofly'
  | 'safe'
  | 'danger'
  | 'assembly'
  | 'objective'
  | 'custom';

/**
 * Zone properties
 */
export interface ZoneProperties extends FeatureProperties {
  zoneType: ZoneType;
  classification?: string;
  validFrom?: string;
  validTo?: string;
}

/**
 * Route properties
 */
export interface RouteProperties extends FeatureProperties {
  routeType: 'primary' | 'alternate' | 'emergency';
  waypoints?: Position[];
  estimatedTime?: number; // minutes
}

/**
 * Marker/Point of Interest properties
 */
export interface MarkerProperties extends FeatureProperties {
  markerType: 'waypoint' | 'poi' | 'checkpoint' | 'hazard' | 'custom';
  priority?: 'low' | 'medium' | 'high' | 'critical';
}

/**
 * Viewport state for map synchronization
 */
export interface ViewportState {
  center: [number, number]; // [longitude, latitude]
  zoom: number;
  bearing: number;
  pitch: number;
}
