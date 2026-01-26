import type { StyleSpecification, Map as MapLibreMap } from 'maplibre-gl';

/**
 * NEXRAD radar WMS URLs from Iowa Environmental Mesonet
 * n0r.cgi = current/live radar
 * n0r-t.cgi = time-enabled historical radar (supports TIME parameter)
 */
const RADAR_WMS_URL_LIVE = 'https://mesonet.agron.iastate.edu/cgi-bin/wms/nexrad/n0r.cgi';
const RADAR_WMS_URL_HISTORICAL = 'https://mesonet.agron.iastate.edu/cgi-bin/wms/nexrad/n0r-t.cgi';

/**
 * Radar source and layer IDs
 */
export const RADAR_SOURCE_ID = 'nexrad-radar';
export const RADAR_LAYER_ID = 'nexrad-radar-layer';

/**
 * Generate a MapLibre style specification for use with Martin tiles
 */
export function createMartinStyle(martinUrl: string): StyleSpecification {
  return {
    version: 8,
    name: 'Overwatch',
    sources: {
      // OpenStreetMap base map (using CartoDB dark matter)
      'carto-dark': {
        type: 'raster',
        tiles: [
          'https://a.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png',
          'https://b.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png',
          'https://c.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png',
        ],
        tileSize: 256,
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
      },
      // Martin vector tiles for features
      'martin-features': {
        type: 'vector',
        tiles: [`${martinUrl}/features/{z}/{x}/{y}`],
        minzoom: 0,
        maxzoom: 22,
      },
    },
    layers: [
      // Base map layer
      {
        id: 'base-map',
        type: 'raster',
        source: 'carto-dark',
        minzoom: 0,
        maxzoom: 22,
      },
      // Feature layers from Martin
      {
        id: 'features-zones-fill',
        type: 'fill',
        source: 'martin-features',
        'source-layer': 'features',
        filter: ['==', ['get', 'feature_type'], 'polygon'],
        paint: {
          'fill-color': ['coalesce', ['get', 'fillColor', ['get', 'style']], '#4A90D9'],
          'fill-opacity': ['coalesce', ['get', 'fillOpacity', ['get', 'style']], 0.2],
        },
      },
      {
        id: 'features-zones-outline',
        type: 'line',
        source: 'martin-features',
        'source-layer': 'features',
        filter: ['==', ['get', 'feature_type'], 'polygon'],
        paint: {
          'line-color': ['coalesce', ['get', 'strokeColor', ['get', 'style']], '#4A90D9'],
          'line-width': ['coalesce', ['get', 'strokeWidth', ['get', 'style']], 2],
        },
      },
      {
        id: 'features-lines',
        type: 'line',
        source: 'martin-features',
        'source-layer': 'features',
        filter: ['==', ['get', 'feature_type'], 'line'],
        paint: {
          'line-color': ['coalesce', ['get', 'strokeColor', ['get', 'style']], '#FFD700'],
          'line-width': ['coalesce', ['get', 'strokeWidth', ['get', 'style']], 2],
        },
      },
      {
        id: 'features-points',
        type: 'circle',
        source: 'martin-features',
        'source-layer': 'features',
        filter: ['==', ['get', 'feature_type'], 'point'],
        paint: {
          'circle-radius': 8,
          'circle-color': ['coalesce', ['get', 'color', ['get', 'style']], '#FF6B6B'],
          'circle-stroke-width': 2,
          'circle-stroke-color': '#ffffff',
        },
      },
    ],
    glyphs: 'https://demotiles.maplibre.org/font/{fontstack}/{range}.pbf',
  };
}

/**
 * Default dark style URL (CartoDB Dark Matter)
 */
export const DEFAULT_STYLE_URL = 'https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json';

/**
 * Get Martin style URL from environment or default
 */
export function getMapStyleUrl(): string {
  const martinUrl = import.meta.env.VITE_MARTIN_URL;
  if (martinUrl) {
    return `${martinUrl}/style.json`;
  }
  return DEFAULT_STYLE_URL;
}

/**
 * Add NEXRAD radar layer to the map
 * Uses WMS tiles from Iowa Environmental Mesonet
 */
export function addRadarLayer(map: MapLibreMap, visible: boolean = false): void {
  // Ensure style is loaded
  if (!map.isStyleLoaded()) {
    map.once('style.load', () => addRadarLayer(map, visible));
    return;
  }

  // Don't add if already exists
  if (map.getSource(RADAR_SOURCE_ID)) {
    return;
  }

  try {
    // Add WMS source for radar (start with live radar URL)
    map.addSource(RADAR_SOURCE_ID, {
      type: 'raster',
      tiles: [buildRadarUrl(0)],
      tileSize: 256,
      attribution: '&copy; <a href="https://mesonet.agron.iastate.edu/">IEM NEXRAD</a>',
    });

    // Find a suitable layer to insert before (for proper z-ordering)
    const beforeLayerId = getFirstLabelLayerId(map);

    // Add radar layer
    map.addLayer(
      {
        id: RADAR_LAYER_ID,
        type: 'raster',
        source: RADAR_SOURCE_ID,
        paint: {
          'raster-opacity': 0.7,
          'raster-opacity-transition': { duration: 300 },
        },
        layout: {
          visibility: visible ? 'visible' : 'none',
        },
      },
      beforeLayerId
    );

  } catch (error) {
    console.error('[Map] Failed to add radar layer:', error);
  }
}

/**
 * Get the first label/symbol layer ID to insert radar layer before
 * This ensures radar appears above base map but below labels
 */
function getFirstLabelLayerId(map: MapLibreMap): string | undefined {
  const layers = map.getStyle()?.layers;
  if (!layers) return undefined;

  // Find first symbol/label layer to insert before
  for (const layer of layers) {
    if (layer.type === 'symbol') {
      return layer.id;
    }
  }

  // If no symbol layer found, return undefined (add on top)
  return undefined;
}

/**
 * Set radar layer visibility
 */
export function setRadarVisibility(map: MapLibreMap, visible: boolean): void {
  // Ensure style is loaded before modifying layers
  if (!map.isStyleLoaded()) {
    map.once('style.load', () => setRadarVisibility(map, visible));
    return;
  }

  if (!map.getLayer(RADAR_LAYER_ID)) {
    // If layer doesn't exist, add it
    addRadarLayer(map, visible);
    return;
  }

  map.setLayoutProperty(RADAR_LAYER_ID, 'visibility', visible ? 'visible' : 'none');
}

/**
 * Set radar layer opacity
 */
export function setRadarOpacity(map: MapLibreMap, opacity: number): void {
  if (!map.getLayer(RADAR_LAYER_ID)) return;

  map.setPaintProperty(RADAR_LAYER_ID, 'raster-opacity', Math.max(0, Math.min(1, opacity)));
}

/**
 * Build radar WMS URL with optional time parameter
 */
function buildRadarUrl(timeOffsetMinutes: number = 0): string {
  const baseParams = 'SERVICE=WMS&VERSION=1.1.1&REQUEST=GetMap&FORMAT=image/png&TRANSPARENT=true&LAYERS=nexrad-n0r-wmst&WIDTH=256&HEIGHT=256&SRS=EPSG:3857&BBOX={bbox-epsg-3857}';
  // Always add cache buster to force tile refresh
  const cacheBuster = `&_t=${Date.now()}`;

  if (timeOffsetMinutes === 0) {
    // Live radar - use the standard endpoint
    const liveParams = 'SERVICE=WMS&VERSION=1.1.1&REQUEST=GetMap&FORMAT=image/png&TRANSPARENT=true&LAYERS=nexrad-n0r&WIDTH=256&HEIGHT=256&SRS=EPSG:3857&BBOX={bbox-epsg-3857}';
    return `${RADAR_WMS_URL_LIVE}?${liveParams}${cacheBuster}`;
  }

  // Historical radar - use time-enabled endpoint with TIME parameter
  const targetTime = new Date(Date.now() + timeOffsetMinutes * 60 * 1000);
  // Round to nearest 5 minutes
  targetTime.setMinutes(Math.round(targetTime.getMinutes() / 5) * 5, 0, 0);
  const timeStr = targetTime.toISOString();

  return `${RADAR_WMS_URL_HISTORICAL}?${baseParams}&TIME=${timeStr}${cacheBuster}`;
}

/**
 * Refresh radar tiles by updating the source URL
 */
export function refreshRadarTiles(map: MapLibreMap, timeOffsetMinutes: number = 0): void {
  if (!map.isStyleLoaded()) return;

  const source = map.getSource(RADAR_SOURCE_ID);
  if (!source || source.type !== 'raster') return;

  const url = buildRadarUrl(timeOffsetMinutes);
  (source as maplibregl.RasterTileSource).setTiles([url]);
}

/**
 * Update radar time (for time slider)
 */
export function setRadarTime(map: MapLibreMap, timeOffsetMinutes: number): void {
  refreshRadarTiles(map, timeOffsetMinutes);
}
