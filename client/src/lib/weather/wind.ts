/**
 * Wind data types and utilities
 */

export interface WindData {
  width: number;
  height: number;
  bounds: WindDataBounds;
  uMin: number;
  uMax: number;
  vMin: number;
  vMax: number;
  u: Float32Array;
  v: Float32Array;
}

export interface WindDataBounds {
  west: number;
  south: number;
  east: number;
  north: number;
}

export interface WindForecastTime {
  time: Date;
  label: string;
}

// Cache for wind data to avoid excessive API calls
let windCache: {
  data: WindData;
  bounds: WindDataBounds;
  forecastHour: number;
  timestamp: number;
} | null = null;

const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes
const MIN_REQUEST_INTERVAL = 10 * 1000; // 10 seconds minimum between requests
let lastRequestTime = 0;

/**
 * Check if cached data can be used for the given bounds
 */
function canUseCachedData(bounds: WindDataBounds, forecastHour: number): boolean {
  if (!windCache) return false;

  const now = Date.now();
  if (now - windCache.timestamp > CACHE_DURATION) return false;
  if (windCache.forecastHour !== forecastHour) return false;

  // Check if requested bounds are within cached bounds (with some margin)
  const margin = 5; // degrees
  return (
    bounds.west >= windCache.bounds.west - margin &&
    bounds.east <= windCache.bounds.east + margin &&
    bounds.south >= windCache.bounds.south - margin &&
    bounds.north <= windCache.bounds.north + margin
  );
}

/**
 * Fetch wind data from Open-Meteo API
 * Returns wind U and V components on a grid
 */
export async function fetchWindData(
  bounds: WindDataBounds,
  forecastHour: number = 0
): Promise<WindData> {
  // Check cache first
  if (canUseCachedData(bounds, forecastHour) && windCache) {
    console.log('[Wind] Using cached data');
    return windCache.data;
  }

  // Rate limiting - don't request too frequently
  const now = Date.now();
  if (now - lastRequestTime < MIN_REQUEST_INTERVAL) {
    console.log('[Wind] Rate limited, using existing data or calm');
    if (windCache) return windCache.data;
    return createCalmWindData(10, 10, bounds);
  }
  lastRequestTime = now;
  // Use a grid of actual data points
  // Open-Meteo allows multiple coordinates in one request
  const gridWidth = 10;
  const gridHeight = 10;
  const totalPoints = gridWidth * gridHeight;

  const latStep = (bounds.north - bounds.south) / (gridHeight - 1);
  const lonStep = (bounds.east - bounds.west) / (gridWidth - 1);

  // Build coordinate arrays for the grid
  const lats: number[] = [];
  const lons: number[] = [];

  for (let y = 0; y < gridHeight; y++) {
    for (let x = 0; x < gridWidth; x++) {
      const lat = bounds.north - y * latStep; // North to south
      const lon = bounds.west + x * lonStep;  // West to east
      lats.push(Number(lat.toFixed(2)));
      lons.push(Number(lon.toFixed(2)));
    }
  }

  const url = new URL('https://api.open-meteo.com/v1/forecast');
  url.searchParams.set('latitude', lats.join(','));
  url.searchParams.set('longitude', lons.join(','));
  url.searchParams.set('hourly', 'wind_speed_10m,wind_direction_10m');
  url.searchParams.set('wind_speed_unit', 'ms');
  url.searchParams.set('forecast_hours', String(Math.max(1, forecastHour + 1)));
  url.searchParams.set('timeformat', 'unixtime');

  try {
    console.log(`[Wind] Fetching ${totalPoints} grid points...`);
    const response = await fetch(url.toString());

    if (!response.ok) {
      if (response.status === 429) {
        console.warn('[Wind] Rate limited by API, using cached or calm data');
        if (windCache) return windCache.data;
        return createCalmWindData(gridWidth, gridHeight, bounds);
      }
      throw new Error(`Wind API error: ${response.status}`);
    }

    const data = await response.json();
    const windData = processWindResponse(data, gridWidth, gridHeight, forecastHour, bounds);
    console.log(`[Wind] Grid loaded: ${gridWidth}x${gridHeight}, speed range: ${windData.uMin.toFixed(1)} to ${windData.uMax.toFixed(1)} m/s`);

    // Cache the result
    windCache = {
      data: windData,
      bounds,
      forecastHour,
      timestamp: Date.now(),
    };

    return windData;
  } catch (error) {
    console.error('[Wind] Failed to fetch wind data:', error);
    if (windCache) return windCache.data;
    return createCalmWindData(gridWidth, gridHeight, bounds);
  }
}

/**
 * Process Open-Meteo response into wind grid data
 */
function processWindResponse(
  data: any,
  width: number,
  height: number,
  forecastHour: number,
  bounds: WindDataBounds
): WindData {
  const u = new Float32Array(width * height);
  const v = new Float32Array(width * height);

  // Open-Meteo returns array of results for each coordinate
  const results = Array.isArray(data) ? data : [data];

  let uMin = Infinity, uMax = -Infinity;
  let vMin = Infinity, vMax = -Infinity;
  let validPoints = 0;

  for (let i = 0; i < Math.min(results.length, width * height); i++) {
    const result = results[i];
    const hourly = result?.hourly;

    if (hourly && hourly.wind_speed_10m && hourly.wind_direction_10m) {
      const hourIndex = Math.min(forecastHour, hourly.wind_speed_10m.length - 1);
      const speed = hourly.wind_speed_10m[hourIndex];
      const direction = hourly.wind_direction_10m[hourIndex];

      if (speed != null && direction != null) {
        // Convert speed and direction to U/V components
        // Direction is where wind comes FROM, so we add 180 to get where it's going
        const dirRad = ((direction + 180) * Math.PI) / 180;
        const uVal = speed * Math.sin(dirRad);
        const vVal = speed * Math.cos(dirRad);

        u[i] = uVal;
        v[i] = vVal;

        uMin = Math.min(uMin, uVal);
        uMax = Math.max(uMax, uVal);
        vMin = Math.min(vMin, vVal);
        vMax = Math.max(vMax, vVal);
        validPoints++;
      }
    }
  }

  console.log(`[Wind] Processed ${validPoints}/${width * height} valid points`);

  return {
    width,
    height,
    bounds,
    uMin: isFinite(uMin) ? uMin : -10,
    uMax: isFinite(uMax) ? uMax : 10,
    vMin: isFinite(vMin) ? vMin : -10,
    vMax: isFinite(vMax) ? vMax : 10,
    u,
    v,
  };
}

/**
 * Create calm wind data (no wind)
 */
function createCalmWindData(width: number, height: number, bounds: WindDataBounds): WindData {
  return {
    width,
    height,
    bounds,
    uMin: 0,
    uMax: 0,
    vMin: 0,
    vMax: 0,
    u: new Float32Array(width * height),
    v: new Float32Array(width * height),
  };
}

/**
 * Generate forecast time options for the next 48 hours
 */
export function generateWindTimeOptions(): WindForecastTime[] {
  const options: WindForecastTime[] = [];
  const now = new Date();
  now.setMinutes(0, 0, 0);

  for (let i = 0; i <= 48; i += 3) {
    const time = new Date(now.getTime() + i * 60 * 60 * 1000);
    const label = i === 0 ? 'Now' : `+${i}h`;
    options.push({ time, label });
  }

  return options;
}

/**
 * Get wind speed color based on magnitude (m/s)
 */
export function getWindSpeedColor(speed: number): [number, number, number, number] {
  // Color scale similar to earth.nullschool.net
  if (speed < 1) return [98, 113, 183, 255];      // Light blue - calm
  if (speed < 3) return [57, 97, 159, 255];       // Blue
  if (speed < 5) return [74, 148, 169, 255];      // Teal
  if (speed < 7) return [77, 167, 145, 255];      // Green-teal
  if (speed < 9) return [85, 167, 100, 255];      // Green
  if (speed < 11) return [126, 175, 75, 255];     // Yellow-green
  if (speed < 13) return [184, 183, 63, 255];     // Yellow
  if (speed < 15) return [227, 176, 56, 255];     // Orange
  if (speed < 20) return [241, 138, 54, 255];     // Dark orange
  if (speed < 25) return [234, 93, 59, 255];      // Red-orange
  if (speed < 30) return [213, 56, 71, 255];      // Red
  return [183, 55, 121, 255];                      // Purple - extreme
}
