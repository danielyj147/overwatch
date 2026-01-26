import { useEffect, useRef, useState, useCallback } from 'react';
import { PathLayer } from '@deck.gl/layers';
import type { Layer as DeckLayer } from '@deck.gl/core';
import { useWeatherStore } from '@/stores/weatherStore';
import { useMapStore } from '@/stores/mapStore';
import { getWindSpeedColor } from '@/lib/weather/wind';

interface WindParticle {
  positions: [number, number][];
  speed: number;
  age: number;
  maxAge: number;
}

interface PathData {
  id: number;
  path: [number, number][];
  speed: number;
  age: number;
  maxAge: number;
}

interface Bounds {
  west: number;
  east: number;
  south: number;
  north: number;
}

// Base values at reference zoom level 8
const REFERENCE_ZOOM = 8;
const BASE_PARTICLE_COUNT = 2500;
const BASE_MAX_AGE = 150;
const BASE_TRAIL_LENGTH = 25;
const BASE_SPEED = 0.008; // degrees per second per m/s wind

// Calculate visible bounds from viewport
function getVisibleBounds(center: [number, number], zoom: number): Bounds {
  const metersPerPixel = 156543.03392 * Math.cos(center[1] * Math.PI / 180) / Math.pow(2, zoom);
  const screenWidth = 1920;
  const screenHeight = 1080;

  const degreesLng = (metersPerPixel * screenWidth) / 111320;
  const degreesLat = (metersPerPixel * screenHeight) / 110540;

  return {
    west: center[0] - degreesLng / 2,
    east: center[0] + degreesLng / 2,
    south: Math.max(-85, center[1] - degreesLat / 2),
    north: Math.min(85, center[1] + degreesLat / 2),
  };
}

/**
 * Hook that creates animated wind particle layers
 */
export function useWindLayer() {
  const { windEnabled, windOpacity, windData, fetchWindData } = useWeatherStore();
  const { viewport } = useMapStore();

  const particlesRef = useRef<WindParticle[]>([]);
  const frameRef = useRef<number>(0);
  const lastFetchRef = useRef<{ lng: number; lat: number } | null>(null);
  const windDataRef = useRef(windData);

  const [pathData, setPathData] = useState<PathData[]>([]);

  // Keep windData ref updated
  useEffect(() => {
    windDataRef.current = windData;
  }, [windData]);

  // Fetch wind data when enabled or viewport changes significantly
  useEffect(() => {
    if (!windEnabled) return;

    const shouldFetch =
      !lastFetchRef.current ||
      Math.abs(viewport.center[0] - lastFetchRef.current.lng) > 10 ||
      Math.abs(viewport.center[1] - lastFetchRef.current.lat) > 10;

    if (shouldFetch) {
      lastFetchRef.current = { lng: viewport.center[0], lat: viewport.center[1] };
      const bounds = {
        west: viewport.center[0] - 30,
        east: viewport.center[0] + 30,
        south: Math.max(-85, viewport.center[1] - 25),
        north: Math.min(85, viewport.center[1] + 25),
      };
      fetchWindData(bounds);
    }
  }, [windEnabled, viewport.center[0], viewport.center[1], fetchWindData]);

  // Listen for wind time changes
  useEffect(() => {
    if (!windEnabled) return;

    const handleWindTimeChange = () => {
      if (lastFetchRef.current) {
        const bounds = {
          west: lastFetchRef.current.lng - 30,
          east: lastFetchRef.current.lng + 30,
          south: Math.max(-85, lastFetchRef.current.lat - 25),
          north: Math.min(85, lastFetchRef.current.lat + 25),
        };
        fetchWindData(bounds);
      }
    };

    window.addEventListener('wind-time-change', handleWindTimeChange);
    return () => window.removeEventListener('wind-time-change', handleWindTimeChange);
  }, [windEnabled, fetchWindData]);

  // Get wind vector at a position using bilinear interpolation
  const getWindAt = useCallback((lng: number, lat: number): [number, number] => {
    const data = windDataRef.current;
    if (!data || !data.bounds) return [0, 0];

    const { width, height, u, v, bounds } = data;

    const nx = (lng - bounds.west) / (bounds.east - bounds.west);
    const ny = (bounds.north - lat) / (bounds.north - bounds.south);

    if (nx < 0 || nx > 1 || ny < 0 || ny > 1) {
      return [0, 0];
    }

    const gx = nx * (width - 1);
    const gy = ny * (height - 1);

    const x0 = Math.floor(gx);
    const y0 = Math.floor(gy);
    const x1 = Math.min(x0 + 1, width - 1);
    const y1 = Math.min(y0 + 1, height - 1);

    const fx = gx - x0;
    const fy = gy - y0;

    const i00 = y0 * width + x0;
    const i10 = y0 * width + x1;
    const i01 = y1 * width + x0;
    const i11 = y1 * width + x1;

    const u00 = u[i00] ?? 0;
    const u10 = u[i10] ?? 0;
    const u01 = u[i01] ?? 0;
    const u11 = u[i11] ?? 0;
    const uVal = u00 * (1 - fx) * (1 - fy) + u10 * fx * (1 - fy) + u01 * (1 - fx) * fy + u11 * fx * fy;

    const v00 = v[i00] ?? 0;
    const v10 = v[i10] ?? 0;
    const v01 = v[i01] ?? 0;
    const v11 = v[i11] ?? 0;
    const vVal = v00 * (1 - fx) * (1 - fy) + v10 * fx * (1 - fy) + v01 * (1 - fx) * fy + v11 * fx * fy;

    return [uVal, vVal];
  }, []);

  // Main animation loop
  useEffect(() => {
    if (!windEnabled || !windData) {
      if (frameRef.current) {
        cancelAnimationFrame(frameRef.current);
        frameRef.current = 0;
      }
      particlesRef.current = [];
      setPathData([]);
      return;
    }

    let lastTime = performance.now();
    let frameCount = 0;

    const animate = (time: number) => {
      const dt = Math.min((time - lastTime) / 1000, 0.05);
      lastTime = time;
      frameCount++;

      const zoom = viewport.zoom;

      // Calculate zoom-dependent parameters
      // zoomDiff: positive when zoomed in more than reference, negative when zoomed out
      const zoomDiff = zoom - REFERENCE_ZOOM;
      const zoomScale = Math.pow(2, zoomDiff);

      // Particle count: more particles when zoomed out (larger area), fewer when zoomed in
      // At zoom 8: BASE_PARTICLE_COUNT
      // At zoom 12: fewer particles (smaller area visible)
      // At zoom 4: more particles (larger area visible)
      const targetParticleCount = Math.round(BASE_PARTICLE_COUNT / Math.pow(zoomScale, 0.5));
      const clampedParticleCount = Math.max(500, Math.min(5000, targetParticleCount));

      // Max age: longer life when zoomed in (particles travel less distance visually)
      const maxAge = Math.round(BASE_MAX_AGE * Math.pow(zoomScale, 0.3));
      const clampedMaxAge = Math.max(50, Math.min(400, maxAge));

      // Trail length: longer trails when zoomed in for visual consistency
      const trailLength = Math.round(BASE_TRAIL_LENGTH * Math.pow(zoomScale, 0.4));
      const clampedTrailLength = Math.max(10, Math.min(60, trailLength));

      // Speed: slower geographic movement when zoomed in so visual speed stays consistent
      // When zoomed in, 1 degree covers more pixels, so we move fewer degrees
      const speedFactor = BASE_SPEED / zoomScale;

      // Get current visible bounds with padding
      const visibleBounds = getVisibleBounds(
        [viewport.center[0], viewport.center[1]],
        zoom
      );

      const padX = (visibleBounds.east - visibleBounds.west) * 0.3;
      const padY = (visibleBounds.north - visibleBounds.south) * 0.3;
      const spawnBounds: Bounds = {
        west: visibleBounds.west - padX,
        east: visibleBounds.east + padX,
        south: Math.max(-85, visibleBounds.south - padY),
        north: Math.min(85, visibleBounds.north + padY),
      };

      // Adjust particle array
      const particles = particlesRef.current;

      // Remove excess particles
      while (particles.length > clampedParticleCount) {
        particles.pop();
      }

      // Add new particles
      while (particles.length < clampedParticleCount) {
        const lng = spawnBounds.west + Math.random() * (spawnBounds.east - spawnBounds.west);
        const lat = spawnBounds.south + Math.random() * (spawnBounds.north - spawnBounds.south);
        particles.push({
          positions: [[lng, lat]],
          speed: 0,
          age: Math.floor(Math.random() * clampedMaxAge * 0.5),
          maxAge: clampedMaxAge + Math.floor(Math.random() * clampedMaxAge * 0.3),
        });
      }

      // Update particles
      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];
        p.age++;

        const lastPos = p.positions[p.positions.length - 1];

        // Check bounds
        const margin = Math.max(padX, padY);
        const outOfBounds =
          lastPos[0] < spawnBounds.west - margin ||
          lastPos[0] > spawnBounds.east + margin ||
          lastPos[1] < spawnBounds.south - margin ||
          lastPos[1] > spawnBounds.north + margin;

        if (p.age > p.maxAge || outOfBounds) {
          // Respawn
          const lng = spawnBounds.west + Math.random() * (spawnBounds.east - spawnBounds.west);
          const lat = spawnBounds.south + Math.random() * (spawnBounds.north - spawnBounds.south);
          p.positions = [[lng, lat]];
          p.speed = 0;
          p.age = 0;
          p.maxAge = clampedMaxAge + Math.floor(Math.random() * clampedMaxAge * 0.3);
          continue;
        }

        // Get wind
        const [wu, wv] = getWindAt(lastPos[0], lastPos[1]);
        const speed = Math.sqrt(wu * wu + wv * wv);
        p.speed = speed;

        // Move particle
        const movement = speedFactor * dt * 60;
        const newLng = lastPos[0] + wu * movement;
        const newLat = lastPos[1] + wv * movement;

        p.positions.push([newLng, newLat]);

        // Trim to current trail length
        while (p.positions.length > clampedTrailLength) {
          p.positions.shift();
        }
      }

      // Update state every 2 frames
      if (frameCount % 2 === 0) {
        const newPathData: PathData[] = [];
        for (let i = 0; i < particles.length; i++) {
          const p = particles[i];
          if (p.positions.length >= 2) {
            newPathData.push({
              id: i,
              path: p.positions.map(pos => [pos[0], pos[1]] as [number, number]),
              speed: p.speed,
              age: p.age,
              maxAge: p.maxAge,
            });
          }
        }
        setPathData(newPathData);
      }

      frameRef.current = requestAnimationFrame(animate);
    };

    frameRef.current = requestAnimationFrame(animate);

    return () => {
      if (frameRef.current) {
        cancelAnimationFrame(frameRef.current);
        frameRef.current = 0;
      }
    };
  }, [windEnabled, windData, viewport.center[0], viewport.center[1], viewport.zoom, getWindAt]);

  // Build the layer with zoom-dependent width
  const layers: DeckLayer[] = [];

  if (windEnabled && pathData.length > 0) {
    // Line width scales slightly with zoom for visibility
    const zoomDiff = viewport.zoom - REFERENCE_ZOOM;
    const lineWidth = Math.max(1, Math.min(3, 1.5 + zoomDiff * 0.1));

    layers.push(
      new PathLayer<PathData>({
        id: 'wind-particles',
        data: pathData,
        getPath: (d) => d.path,
        getColor: (d) => {
          const baseColor = getWindSpeedColor(d.speed);
          const ageFade = Math.max(0.15, 1 - d.age / d.maxAge);
          return [baseColor[0], baseColor[1], baseColor[2], Math.floor(255 * ageFade * windOpacity)];
        },
        getWidth: lineWidth,
        widthUnits: 'pixels',
        widthMinPixels: 1,
        widthMaxPixels: 4,
        capRounded: true,
        jointRounded: true,
        billboard: false,
        updateTriggers: {
          getPath: [pathData],
          getColor: [pathData, windOpacity],
        },
      })
    );
  }

  return { layers };
}
