import { create } from 'zustand';
import type { WeatherAlert } from '@/types/weather';
import { fetchActiveAlerts } from '@/lib/weather/api';
import type { WindData, WindForecastTime } from '@/lib/weather/wind';
import { generateWindTimeOptions } from '@/lib/weather/wind';

// Generate time options for the past 2 hours in 5-minute intervals
function generateRadarTimeOptions(): { value: number; label: string }[] {
  const options: { value: number; label: string }[] = [];
  const now = new Date();
  // Round down to nearest 5 minutes
  now.setMinutes(Math.floor(now.getMinutes() / 5) * 5, 0, 0);

  for (let i = 0; i <= 24; i++) {
    // 24 x 5min = 2 hours
    const time = new Date(now.getTime() - i * 5 * 60 * 1000);
    const label =
      i === 0
        ? 'Live'
        : `${time.getHours().toString().padStart(2, '0')}:${time.getMinutes().toString().padStart(2, '0')}`;
    options.push({ value: -i * 5, label }); // Negative minutes from now
  }
  return options;
}


interface WeatherState {
  // Radar state
  radarEnabled: boolean;
  radarOpacity: number;
  radarTimeOffset: number; // Minutes offset from current time (0 = live, -5 = 5 min ago, etc.)
  radarTimeOptions: { value: number; label: string }[];

  // Light pollution state
  lightPollutionEnabled: boolean;
  lightPollutionOpacity: number;

  // Wind state
  windEnabled: boolean;
  windOpacity: number;
  windForecastHour: number;
  windTimeOptions: WindForecastTime[];
  windData: WindData | null;
  isLoadingWind: boolean;
  windError: string | null;

  // Alerts state
  alertsEnabled: boolean;
  alerts: WeatherAlert[];
  isLoadingAlerts: boolean;
  alertsError: string | null;
  lastAlertsFetch: number | null;

  // Auto-refresh intervals
  radarRefreshInterval: ReturnType<typeof setInterval> | null;
  alertsRefreshInterval: ReturnType<typeof setInterval> | null;

  // Actions
  setRadarEnabled: (enabled: boolean) => void;
  setRadarOpacity: (opacity: number) => void;
  setRadarTimeOffset: (offset: number) => void;
  commitRadarTime: () => void;
  refreshRadarTimeOptions: () => void;
  setLightPollutionEnabled: (enabled: boolean) => void;
  setLightPollutionOpacity: (opacity: number) => void;
  setWindEnabled: (enabled: boolean) => void;
  setWindOpacity: (opacity: number) => void;
  setWindForecastHour: (hour: number) => void;
  commitWindTime: () => void;
  fetchWindData: (bounds: { west: number; south: number; east: number; north: number }) => Promise<void>;
  setAlertsEnabled: (enabled: boolean) => void;
  fetchAlerts: () => Promise<void>;
  startAutoRefresh: () => void;
  stopAutoRefresh: () => void;
}

const ALERTS_REFRESH_INTERVAL = 15 * 60 * 1000; // 15 minutes
const RADAR_REFRESH_INTERVAL = 5 * 60 * 1000; // 5 minutes

export const useWeatherStore = create<WeatherState>((set, get) => ({
  // Initial state
  radarEnabled: false,
  radarOpacity: 0.7,
  radarTimeOffset: 0, // Live
  radarTimeOptions: generateRadarTimeOptions(),
  lightPollutionEnabled: false,
  lightPollutionOpacity: 0.5,
  windEnabled: false,
  windOpacity: 0.8,
  windForecastHour: 0,
  windTimeOptions: generateWindTimeOptions(),
  windData: null,
  isLoadingWind: false,
  windError: null,
  alertsEnabled: false,
  alerts: [],
  isLoadingAlerts: false,
  alertsError: null,
  lastAlertsFetch: null,
  radarRefreshInterval: null,
  alertsRefreshInterval: null,

  // Actions
  setRadarEnabled: (enabled) => {
    set({ radarEnabled: enabled });
    if (enabled) {
      get().refreshRadarTimeOptions();
      get().startAutoRefresh();
    }
  },

  setRadarOpacity: (opacity) => {
    set({ radarOpacity: Math.max(0, Math.min(1, opacity)) });
  },

  setRadarTimeOffset: (offset) => {
    // Update state immediately for responsive UI (no tile fetch)
    set({ radarTimeOffset: offset });
  },

  commitRadarTime: () => {
    // Called when user releases slider - actually fetch tiles
    const { radarTimeOffset } = get();
    window.dispatchEvent(new CustomEvent('radar-time-change', { detail: { offset: radarTimeOffset } }));
  },

  refreshRadarTimeOptions: () => {
    set({ radarTimeOptions: generateRadarTimeOptions() });
  },

  setLightPollutionEnabled: (enabled) => {
    set({ lightPollutionEnabled: enabled });
  },

  setLightPollutionOpacity: (opacity) => {
    set({ lightPollutionOpacity: Math.max(0, Math.min(1, opacity)) });
  },

  setWindEnabled: (enabled) => {
    set({ windEnabled: enabled });
    if (!enabled) {
      set({ windData: null });
    }
  },

  setWindOpacity: (opacity) => {
    set({ windOpacity: Math.max(0, Math.min(1, opacity)) });
  },

  setWindForecastHour: (hour) => {
    set({ windForecastHour: hour });
  },

  commitWindTime: () => {
    // Trigger wind data refetch with new time
    window.dispatchEvent(new CustomEvent('wind-time-change'));
  },

  fetchWindData: async (bounds) => {
    set({ isLoadingWind: true, windError: null });

    try {
      // Dynamic import to avoid circular dependencies
      const { fetchWindData: fetchWind } = await import('@/lib/weather/wind');
      const { windForecastHour } = get();
      const data = await fetchWind(bounds, windForecastHour);
      set({ windData: data, isLoadingWind: false });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to fetch wind data';
      set({ windError: message, isLoadingWind: false });
      console.error('[Weather] Failed to fetch wind data:', message);
    }
  },

  setAlertsEnabled: (enabled) => {
    set({ alertsEnabled: enabled });
    if (enabled) {
      // Fetch immediately when enabled
      get().fetchAlerts();
      get().startAutoRefresh();
    }
  },

  fetchAlerts: async () => {
    set({ isLoadingAlerts: true, alertsError: null });

    try {
      const alerts = await fetchActiveAlerts();
      set({
        alerts,
        isLoadingAlerts: false,
        lastAlertsFetch: Date.now(),
      });
      console.log(`[Weather] Fetched ${alerts.length} active alerts`);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to fetch alerts';
      set({
        alertsError: message,
        isLoadingAlerts: false,
      });
      console.error('[Weather] Failed to fetch alerts:', message);
    }
  },

  startAutoRefresh: () => {
    const state = get();

    // Start alerts refresh if enabled and not already running
    if (state.alertsEnabled && !state.alertsRefreshInterval) {
      const alertsInterval = setInterval(() => {
        if (get().alertsEnabled) {
          get().fetchAlerts();
        }
      }, ALERTS_REFRESH_INTERVAL);
      set({ alertsRefreshInterval: alertsInterval });
    }

    // Radar refresh is handled by cache-busting in the tile URL
    // We trigger a map repaint periodically for radar updates
    if (state.radarEnabled && !state.radarRefreshInterval) {
      const radarInterval = setInterval(() => {
        // Emit a custom event for radar refresh
        // The map hook will listen to this and update the tile source
        window.dispatchEvent(new CustomEvent('radar-refresh'));
      }, RADAR_REFRESH_INTERVAL);
      set({ radarRefreshInterval: radarInterval });
    }
  },

  stopAutoRefresh: () => {
    const state = get();

    if (state.alertsRefreshInterval) {
      clearInterval(state.alertsRefreshInterval);
      set({ alertsRefreshInterval: null });
    }

    if (state.radarRefreshInterval) {
      clearInterval(state.radarRefreshInterval);
      set({ radarRefreshInterval: null });
    }
  },
}));
