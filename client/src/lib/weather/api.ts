import type { WeatherAlert, WeatherAlertsResponse } from '@/types/weather';

const NWS_API_BASE = 'https://api.weather.gov';

// NWS requires User-Agent header for API requests
const NWS_HEADERS = {
  'User-Agent': '(Overwatch COP Platform, contact@overwatch.local)',
  Accept: 'application/geo+json',
};

/**
 * Fetch active weather alerts from NWS API
 * Only returns alerts that have geometry (some alerts have no polygon)
 */
export async function fetchActiveAlerts(): Promise<WeatherAlert[]> {
  const response = await fetch(`${NWS_API_BASE}/alerts/active`, {
    headers: NWS_HEADERS,
  });

  if (!response.ok) {
    throw new Error(`NWS API error: ${response.status} ${response.statusText}`);
  }

  const data: WeatherAlertsResponse = await response.json();

  // Filter to only alerts with geometry
  return data.features.filter((alert) => alert.geometry !== null);
}

/**
 * Fetch alerts for a specific area (state, zone, or point)
 */
export async function fetchAlertsForArea(area: string): Promise<WeatherAlert[]> {
  const response = await fetch(`${NWS_API_BASE}/alerts/active?area=${encodeURIComponent(area)}`, {
    headers: NWS_HEADERS,
  });

  if (!response.ok) {
    throw new Error(`NWS API error: ${response.status} ${response.statusText}`);
  }

  const data: WeatherAlertsResponse = await response.json();
  return data.features.filter((alert) => alert.geometry !== null);
}

/**
 * Fetch alerts by severity level
 */
export async function fetchAlertsBySeverity(
  severity: 'Extreme' | 'Severe' | 'Moderate' | 'Minor'
): Promise<WeatherAlert[]> {
  const response = await fetch(`${NWS_API_BASE}/alerts/active?severity=${severity}`, {
    headers: NWS_HEADERS,
  });

  if (!response.ok) {
    throw new Error(`NWS API error: ${response.status} ${response.statusText}`);
  }

  const data: WeatherAlertsResponse = await response.json();
  return data.features.filter((alert) => alert.geometry !== null);
}
