import type { Feature, Polygon, MultiPolygon } from 'geojson';

/**
 * NWS Alert severity levels
 */
export type AlertSeverity = 'Extreme' | 'Severe' | 'Moderate' | 'Minor' | 'Unknown';

/**
 * NWS Alert urgency levels
 */
export type AlertUrgency = 'Immediate' | 'Expected' | 'Future' | 'Past' | 'Unknown';

/**
 * NWS Alert certainty levels
 */
export type AlertCertainty = 'Observed' | 'Likely' | 'Possible' | 'Unlikely' | 'Unknown';

/**
 * Properties from NWS alerts API
 */
export interface WeatherAlertProperties {
  '@id': string;
  '@type': string;
  id: string;
  areaDesc: string;
  geocode: {
    SAME: string[];
    UGC: string[];
  };
  affectedZones: string[];
  references: Array<{
    '@id': string;
    identifier: string;
    sender: string;
    sent: string;
  }>;
  sent: string;
  effective: string;
  onset: string | null;
  expires: string;
  ends: string | null;
  status: 'Actual' | 'Exercise' | 'System' | 'Test' | 'Draft';
  messageType: 'Alert' | 'Update' | 'Cancel' | 'Ack' | 'Error';
  category: string;
  severity: AlertSeverity;
  certainty: AlertCertainty;
  urgency: AlertUrgency;
  event: string;
  sender: string;
  senderName: string;
  headline: string | null;
  description: string;
  instruction: string | null;
  response: string;
  parameters: Record<string, string[]>;
}

/**
 * Weather alert as GeoJSON Feature
 */
export type WeatherAlert = Feature<Polygon | MultiPolygon, WeatherAlertProperties>;

/**
 * NWS Alerts API response
 */
export interface WeatherAlertsResponse {
  '@context': unknown;
  type: 'FeatureCollection';
  features: WeatherAlert[];
  title: string;
  updated: string;
}

/**
 * Radar layer configuration
 */
export interface RadarConfig {
  enabled: boolean;
  opacity: number;
  product: 'n0r' | 'n0q'; // n0r = base reflectivity, n0q = high-res
}
