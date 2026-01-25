import { useCollaborationStore } from '@/stores/collaborationStore';
import type { RemoteUserState } from '@/types/collaboration';

export function UserCursors() {
  const { remoteUsers } = useCollaborationStore();

  // Filter users with valid cursor positions
  const usersWithCursors = remoteUsers.filter(
    (user) => user.cursor && user.cursor.x > 0 && user.cursor.y > 0
  );

  if (usersWithCursors.length === 0) return null;

  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden z-50">
      {usersWithCursors.map((user) => (
        <UserCursor key={user.clientId} user={user} />
      ))}
    </div>
  );
}

interface UserCursorProps {
  user: RemoteUserState;
}

function UserCursor({ user }: UserCursorProps) {
  if (!user.cursor) return null;

  const { x, y } = user.cursor;

  return (
    <div
      className="user-cursor"
      style={{
        left: x,
        top: y,
        transition: 'left 0.1s ease-out, top 0.1s ease-out',
      }}
    >
      {/* Cursor dot */}
      <div
        className="user-cursor-dot"
        style={{ backgroundColor: user.user.color }}
      />

      {/* User label */}
      <div
        className="user-cursor-label"
        style={{ backgroundColor: user.user.color }}
      >
        {user.user.name}
        {user.activeTool && (
          <span className="ml-1 opacity-75">({user.activeTool})</span>
        )}
      </div>

      {/* Cursor pointer SVG */}
      <svg
        className="absolute -left-0.5 -top-0.5"
        width="16"
        height="16"
        viewBox="0 0 16 16"
        fill="none"
      >
        <path
          d="M1 1L1 11L4.5 7.5L7.5 14L9 13.5L6 6.5L11 6.5L1 1Z"
          fill={user.user.color}
          stroke="white"
          strokeWidth="1"
        />
      </svg>
    </div>
  );
}
