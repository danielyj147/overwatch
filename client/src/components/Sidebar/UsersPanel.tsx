import { Eye } from 'lucide-react';
import { useCollaborationStore } from '@/stores/collaborationStore';
import { useMapStore } from '@/stores/mapStore';
import { clsx } from 'clsx';
import type { User } from '@/types/collaboration';

export function UsersPanel() {
  const { localUser, remoteUsers } = useCollaborationStore();
  const { isFollowingUser, setFollowingUser } = useMapStore();

  const handleFollow = (userId: string) => {
    if (isFollowingUser === userId) {
      setFollowingUser(null);
    } else {
      setFollowingUser(userId);
    }
  };

  return (
    <div className="p-4">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-semibold text-white">Connected Users</h2>
        <span className="text-xs text-gray-400">{remoteUsers.length + 1} online</span>
      </div>

      <div className="space-y-2">
        {/* Local user (you) */}
        {localUser && (
          <UserItem
            user={localUser}
            isLocal={true}
            activeTool={null}
            isFollowing={false}
            onFollow={() => {}}
          />
        )}

        {/* Remote users */}
        {remoteUsers.map((remoteUser) => (
          <UserItem
            key={remoteUser.clientId}
            user={remoteUser.user}
            isLocal={false}
            activeTool={remoteUser.activeTool}
            isFollowing={isFollowingUser === remoteUser.user.id}
            onFollow={() => handleFollow(remoteUser.user.id)}
          />
        ))}

        {/* Empty state */}
        {remoteUsers.length === 0 && (
          <div className="text-center py-8 text-gray-500 text-sm">
            No other users connected
          </div>
        )}
      </div>
    </div>
  );
}

interface UserItemProps {
  user: User;
  isLocal: boolean;
  activeTool: string | null;
  isFollowing: boolean;
  onFollow: () => void;
}

function UserItem({ user, isLocal, activeTool, isFollowing, onFollow }: UserItemProps) {
  return (
    <div
      className={clsx(
        'flex items-center gap-3 p-2 rounded-lg transition-colors',
        'bg-surface-light hover:bg-surface border border-transparent hover:border-gray-600',
        isLocal && 'border-accent/30'
      )}
    >
      {/* Avatar */}
      <div
        className="w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-medium"
        style={{ backgroundColor: user.color }}
      >
        {user.name.charAt(0).toUpperCase()}
      </div>

      {/* User info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-sm text-white truncate">{user.name}</span>
          {isLocal && (
            <span className="text-xs text-gray-500">(you)</span>
          )}
        </div>
        {activeTool && (
          <div className="text-xs text-gray-400 capitalize">
            Drawing: {activeTool}
          </div>
        )}
      </div>

      {/* Actions */}
      {!isLocal && (
        <button
          onClick={onFollow}
          className={clsx(
            'p-1.5 rounded transition-colors',
            isFollowing
              ? 'bg-accent text-white'
              : 'text-gray-400 hover:text-white hover:bg-surface'
          )}
          title={isFollowing ? 'Stop following' : 'Follow user'}
        >
          <Eye size={14} />
        </button>
      )}
    </div>
  );
}
