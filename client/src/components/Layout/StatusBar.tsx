import { clsx } from 'clsx';
import { useMapStore } from '@/stores/mapStore';
import { useCollaborationStore } from '@/stores/collaborationStore';
import type { ConnectionStatus } from '@/types/collaboration';

interface StatusBarProps {
  connectionStatus: ConnectionStatus;
}

export function StatusBar({ connectionStatus }: StatusBarProps) {
  const { cursorCoordinates, viewport } = useMapStore();
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
    <footer className="h-7 bg-surface-dark border-t border-gray-700 flex items-center px-4 text-xs text-gray-400">
      {/* Connection status */}
      <div className="flex items-center gap-2 pr-4 border-r border-gray-700">
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
      <div className="flex items-center gap-2 px-4 border-r border-gray-700">
        <span>{remoteUsers.length + 1} users online</span>
      </div>

      {/* Cursor coordinates */}
      <div className="flex items-center gap-2 px-4 border-r border-gray-700">
        {cursorCoordinates ? (
          <>
            <span>
              {formatCoordinate(cursorCoordinates.lat, true)},{' '}
              {formatCoordinate(cursorCoordinates.lng, false)}
            </span>
          </>
        ) : (
          <span>-- , --</span>
        )}
      </div>

      {/* Zoom level */}
      <div className="flex items-center gap-2 px-4">
        <span>Zoom: {viewport.zoom.toFixed(1)}</span>
      </div>

      {/* Spacer */}
      <div className="flex-1" />

      {/* Version */}
      <div className="text-gray-500">Overwatch v1.0.0</div>
    </footer>
  );
}
