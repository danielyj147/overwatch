import type { StyleSpecification } from 'maplibre-gl';

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
