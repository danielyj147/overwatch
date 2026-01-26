import { clsx } from 'clsx';
import { useMapStore } from '@/stores/mapStore';
import { useCollaborationStore } from '@/stores/collaborationStore';
import type { ConnectionStatus } from '@/types/collaboration';

interface StatusBarProps {
  connectionStatus: ConnectionStatus;
}

export function StatusBar({ connectionStatus }: StatusBarProps) {
  const { cursorCoordinates, viewport, selection } = useMapStore();
  const { remoteUsers } = useCollaborationStore();

  const formatCoordinate = (value: number, isLat: boolean): string => {
    const direction = isLat ? (value >= 0 ? 'N' : 'S') : (value >= 0 ? 'E' : 'W');
    return `${Math.abs(value).toFixed(5)}${direction}`;
  };

  const getStatusText = (): string => {
    switch (connectionStatus) {
      case 'connected':
        return 'Connected';
      case 'connecting':
        return 'Connecting...';
      case 'disconnected':
        return 'Disconnected';
      case 'error':
        return 'Connection Error';
      default:
        return 'Unknown';
    }
  };

  return (
    <footer
      className="statusbar-container h-7 flex items-center px-4 text-xs"
      style={{
        backgroundColor: 'var(--color-surface-dark)',
        borderTop: '1px solid var(--color-border)',
        color: 'var(--color-text-muted)',
      }}
    >
      {/* Connection status */}
      <div
        className="flex items-center gap-2 pr-4"
        style={{ borderRight: '1px solid var(--color-border)' }}
      >
        <div
          className={clsx(
            'status-dot',
            connectionStatus === 'connected' && 'connected',
            connectionStatus === 'connecting' && 'connecting',
            (connectionStatus === 'disconnected' || connectionStatus === 'error') && 'disconnected'
          )}
        />
        <span>{getStatusText()}</span>
      </div>

      {/* Connected users */}
      <div
        className="flex items-center gap-2 px-4"
        style={{ borderRight: '1px solid var(--color-border)' }}
      >
        <span>{remoteUsers.length + 1} users online</span>
      </div>

      {/* Cursor coordinates */}
      <div
        className="flex items-center gap-2 px-4"
        style={{ borderRight: '1px solid var(--color-border)' }}
      >
        {cursorCoordinates ? (
          <span className="font-mono">
            {formatCoordinate(cursorCoordinates.lat, true)},{' '}
            {formatCoordinate(cursorCoordinates.lng, false)}
          </span>
        ) : (
          <span className="font-mono">-- , --</span>
        )}
      </div>

      {/* Zoom level */}
      <div
        className="flex items-center gap-2 px-4"
        style={{ borderRight: '1px solid var(--color-border)' }}
      >
        <span className="font-mono">Zoom: {viewport.zoom.toFixed(1)}</span>
      </div>

      {/* Selection count */}
      {selection.featureIds.length > 0 && (
        <div
          className="flex items-center gap-2 px-4 glow-text"
          style={{ color: 'var(--color-accent)' }}
        >
          <span>{selection.featureIds.length} selected</span>
        </div>
      )}

      {/* Spacer */}
      <div className="flex-1" />

      {/* Version */}
      <div style={{ color: 'var(--color-text-muted)' }}>Overwatch v1.0.0</div>
    </footer>
  );
}
