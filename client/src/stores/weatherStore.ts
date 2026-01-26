import { create } from 'zustand';
import type { WeatherAlert } from '@/types/weather';
import { fetchActiveAlerts } from '@/lib/weather/api';

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

// Debounce timer for radar refresh
let radarRefreshTimer: ReturnType<typeof setTimeout> | null = null;
const RADAR_DEBOUNCE_MS = 100; // Refresh after 100ms of no slider movement
let radarRequestId = 0; // Track latest request to avoid race conditions

interface WeatherState {
  // Radar state
  radarEnabled: boolean;
  radarOpacity: number;
  radarTimeOffset: number; // Minutes offset from current time (0 = live, -5 = 5 min ago, etc.)
  radarTimeOptions: { value: number; label: string }[];

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
  refreshRadarTimeOptions: () => void;
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
    // Update state immediately for responsive UI
    set({ radarTimeOffset: offset });

    // Increment request ID to track latest request
    const currentRequestId = ++radarRequestId;

    // Debounce the actual tile refresh
    if (radarRefreshTimer) {
      clearTimeout(radarRefreshTimer);
    }
    radarRefreshTimer = setTimeout(() => {
      // Only dispatch if this is still the latest request
      if (currentRequestId === radarRequestId) {
        window.dispatchEvent(new CustomEvent('radar-time-change', { detail: { offset, requestId: currentRequestId } }));
      }
      radarRefreshTimer = null;
    }, RADAR_DEBOUNCE_MS);
  },

  refreshRadarTimeOptions: () => {
    set({ radarTimeOptions: generateRadarTimeOptions() });
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
