import { useMemo } from 'react';
import { GeoJsonLayer } from '@deck.gl/layers';
import type { Layer as DeckLayer, PickingInfo } from '@deck.gl/core';
import { useWeatherStore } from '@/stores/weatherStore';
import { getSeverityColor, getSeverityBorderColor } from '@/lib/weather/colors';
import type { WeatherAlert, AlertSeverity } from '@/types/weather';

export interface WeatherLayerPickInfo extends PickingInfo {
  object?: WeatherAlert;
}

export function useWeatherLayers() {
  const { alertsEnabled, alerts } = useWeatherStore();

  const layers = useMemo(() => {
    const activeLayers: DeckLayer[] = [];

    if (!alertsEnabled || alerts.length === 0) {
      return activeLayers;
    }

    // Create GeoJSON layer for weather alerts
    activeLayers.push(
      new GeoJsonLayer({
        id: 'weather-alerts',
        data: {
          type: 'FeatureCollection',
          features: alerts,
        },
        pickable: true,
        stroked: true,
        filled: true,
        extruded: false,
        getFillColor: (d) => {
          const feature = d as unknown as WeatherAlert;
          const severity = feature.properties?.severity || 'Unknown';
          return getSeverityColor(severity as AlertSeverity);
        },
        getLineColor: (d) => {
          const feature = d as unknown as WeatherAlert;
          const severity = feature.properties?.severity || 'Unknown';
          return getSeverityBorderColor(severity as AlertSeverity);
        },
        getLineWidth: 2,
        lineWidthMinPixels: 1,
        lineWidthMaxPixels: 3,
        // Sort by severity so extreme alerts render on top
        getElevation: (d) => {
          const feature = d as unknown as WeatherAlert;
          const severityOrder: Record<string, number> = {
            Unknown: 0,
            Minor: 1,
            Moderate: 2,
            Severe: 3,
            Extreme: 4,
          };
          return severityOrder[feature.properties?.severity || 'Unknown'] || 0;
        },
        updateTriggers: {
          getFillColor: [alerts],
          getLineColor: [alerts],
        },
      })
    );

    return activeLayers;
  }, [alertsEnabled, alerts]);

  return { layers };
}
