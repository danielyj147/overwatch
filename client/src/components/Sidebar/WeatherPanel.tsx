import { Radar, AlertTriangle, RefreshCw, ChevronDown, ChevronRight, Clock } from 'lucide-react';
import { useState } from 'react';
import { clsx } from 'clsx';
import { useWeatherStore } from '@/stores/weatherStore';
import { getSeverityHexColor, SEVERITY_LEVELS } from '@/lib/weather/colors';
import type { AlertSeverity } from '@/types/weather';

/**
 * Reusable toggle switch component
 */
function ToggleSwitch({ enabled, onChange }: { enabled: boolean; onChange: () => void }) {
  return (
    <button
      onClick={onChange}
      className={clsx(
        'relative w-10 h-5 rounded-full transition-colors flex-shrink-0',
        enabled ? 'bg-accent' : 'bg-gray-600'
      )}
      role="switch"
      aria-checked={enabled}
    >
      <span
        className={clsx(
          'absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white transition-transform',
          enabled && 'translate-x-5'
        )}
      />
    </button>
  );
}

export function WeatherPanel() {
  const {
    radarEnabled,
    radarOpacity,
    radarTimeOffset,
    radarTimeOptions,
    alertsEnabled,
    alerts,
    isLoadingAlerts,
    alertsError,
    lastAlertsFetch,
    setRadarEnabled,
    setRadarOpacity,
    setRadarTimeOffset,
    refreshRadarTimeOptions,
    setAlertsEnabled,
    fetchAlerts,
  } = useWeatherStore();

  const [isRadarExpanded, setIsRadarExpanded] = useState(true);
  const [isAlertsExpanded, setIsAlertsExpanded] = useState(true);

  // Count alerts by severity
  const alertCounts = alerts.reduce(
    (acc, alert) => {
      const severity = alert.properties?.severity || 'Unknown';
      acc[severity] = (acc[severity] || 0) + 1;
      return acc;
    },
    {} as Record<AlertSeverity, number>
  );

  // Format last fetch time
  const formatLastFetch = () => {
    if (!lastAlertsFetch) return 'Never';
    const diff = Date.now() - lastAlertsFetch;
    if (diff < 60000) return 'Just now';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    return `${Math.floor(diff / 3600000)}h ago`;
  };

  return (
    <div className="p-3 space-y-4">
      {/* Radar Section */}
      <div
        className="rounded-lg overflow-hidden"
        style={{ backgroundColor: 'var(--color-surface-light)' }}
      >
        <button
          onClick={() => setIsRadarExpanded(!isRadarExpanded)}
          className="w-full flex items-center justify-between p-3 hover:bg-opacity-80 transition-colors"
        >
          <div className="flex items-center gap-2">
            {isRadarExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
            <Radar size={16} />
            <span className="text-sm font-medium">NEXRAD Radar</span>
          </div>
          <div
            className={clsx(
              'w-2 h-2 rounded-full',
              radarEnabled ? 'bg-green-500' : 'bg-gray-500'
            )}
          />
        </button>

        {isRadarExpanded && (
          <div className="px-3 pb-3 space-y-3">
            {/* Radar Toggle */}
            <div className="flex items-center justify-between">
              <span className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>
                Show Radar
              </span>
              <ToggleSwitch enabled={radarEnabled} onChange={() => setRadarEnabled(!radarEnabled)} />
            </div>

            {/* Radar controls when enabled */}
            {radarEnabled && (
              <>
                {/* Opacity Slider */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
                      Opacity
                    </span>
                    <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
                      {Math.round(radarOpacity * 100)}%
                    </span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={radarOpacity * 100}
                    onChange={(e) => setRadarOpacity(Number(e.target.value) / 100)}
                    className="w-full h-1 rounded-full appearance-none cursor-pointer"
                    style={{
                      background: `linear-gradient(to right, var(--color-accent) ${radarOpacity * 100}%, var(--color-border) ${radarOpacity * 100}%)`,
                    }}
                  />
                </div>

                {/* Time Slider */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1">
                      <Clock size={12} style={{ color: 'var(--color-text-muted)' }} />
                      <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
                        Time
                      </span>
                    </div>
                    <span className="text-xs font-medium" style={{ color: 'var(--color-text-secondary)' }}>
                      {radarTimeOptions.find((o) => o.value === radarTimeOffset)?.label || 'Live'}
                    </span>
                  </div>
                  <input
                    type="range"
                    min={-120}
                    max={0}
                    step={5}
                    value={radarTimeOffset}
                    onChange={(e) => setRadarTimeOffset(Number(e.target.value))}
                    onMouseDown={() => refreshRadarTimeOptions()}
                    className="w-full h-1 rounded-full appearance-none cursor-pointer"
                    style={{
                      background: `linear-gradient(to right, var(--color-border) ${((radarTimeOffset + 120) / 120) * 100}%, var(--color-accent) ${((radarTimeOffset + 120) / 120) * 100}%)`,
                    }}
                  />
                  <div className="flex justify-between text-xs" style={{ color: 'var(--color-text-muted)' }}>
                    <span>-2h</span>
                    <span>Live</span>
                  </div>
                </div>
              </>
            )}

            <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
              NEXRAD precipitation radar from IEM.{' '}
              {radarTimeOffset === 0 ? 'Auto-refreshes every 5 minutes.' : 'Showing historical data.'}
            </p>
          </div>
        )}
      </div>

      {/* Alerts Section */}
      <div
        className="rounded-lg overflow-hidden"
        style={{ backgroundColor: 'var(--color-surface-light)' }}
      >
        <button
          onClick={() => setIsAlertsExpanded(!isAlertsExpanded)}
          className="w-full flex items-center justify-between p-3 hover:bg-opacity-80 transition-colors"
        >
          <div className="flex items-center gap-2">
            {isAlertsExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
            <AlertTriangle size={16} />
            <span className="text-sm font-medium">Weather Alerts</span>
          </div>
          {alertsEnabled && alerts.length > 0 && (
            <span
              className="px-1.5 py-0.5 text-xs font-medium rounded-full"
              style={{ backgroundColor: 'var(--color-accent)', color: 'white' }}
            >
              {alerts.length}
            </span>
          )}
        </button>

        {isAlertsExpanded && (
          <div className="px-3 pb-3 space-y-3">
            {/* Alerts Toggle */}
            <div className="flex items-center justify-between">
              <span className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>
                Show Alerts
              </span>
              <ToggleSwitch enabled={alertsEnabled} onChange={() => setAlertsEnabled(!alertsEnabled)} />
            </div>

            {/* Loading/Error States */}
            {alertsEnabled && isLoadingAlerts && (
              <div className="flex items-center gap-2 text-xs" style={{ color: 'var(--color-text-muted)' }}>
                <RefreshCw size={12} className="animate-spin" />
                <span>Loading alerts...</span>
              </div>
            )}

            {alertsEnabled && alertsError && (
              <div className="text-xs text-red-400">
                Error: {alertsError}
              </div>
            )}

            {/* Alert Summary */}
            {alertsEnabled && !isLoadingAlerts && !alertsError && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
                    Updated: {formatLastFetch()}
                  </span>
                  <button
                    onClick={() => fetchAlerts()}
                    className="p-1 rounded hover:bg-surface transition-colors"
                    style={{ color: 'var(--color-text-muted)' }}
                    title="Refresh alerts"
                  >
                    <RefreshCw size={12} />
                  </button>
                </div>

                {alerts.length === 0 ? (
                  <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
                    No active alerts
                  </p>
                ) : (
                  <div className="space-y-1">
                    {SEVERITY_LEVELS.map((severity) => {
                      const count = alertCounts[severity] || 0;
                      if (count === 0) return null;
                      return (
                        <div key={severity} className="flex items-center gap-2 text-xs">
                          <div
                            className="w-3 h-3 rounded-sm flex-shrink-0"
                            style={{ backgroundColor: getSeverityHexColor(severity) }}
                          />
                          <span style={{ color: 'var(--color-text-secondary)' }}>
                            {severity}
                          </span>
                          <span style={{ color: 'var(--color-text-muted)' }}>
                            ({count})
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* Severity Legend */}
            <div className="pt-2 border-t" style={{ borderColor: 'var(--color-border)' }}>
              <p className="text-xs font-medium mb-2" style={{ color: 'var(--color-text-muted)' }}>
                Severity Legend
              </p>
              <div className="grid grid-cols-2 gap-1">
                {SEVERITY_LEVELS.filter(s => s !== 'Unknown').map((severity) => (
                  <div key={severity} className="flex items-center gap-1.5 text-xs">
                    <div
                      className="w-2 h-2 rounded-sm flex-shrink-0"
                      style={{ backgroundColor: getSeverityHexColor(severity) }}
                    />
                    <span style={{ color: 'var(--color-text-muted)' }}>
                      {severity}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
              NWS alerts for the entire US. Auto-refreshes every 15 minutes.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
