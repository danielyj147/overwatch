import type { HocuspocusProvider } from '@hocuspocus/provider';
import type { AwarenessState, CursorPosition, User } from '@/types/collaboration';

/**
 * Update the local awareness state with cursor position
 */
export function updateCursorPosition(
  provider: HocuspocusProvider,
  position: CursorPosition | null
): void {
  if (!provider.awareness) return;

  const currentState = provider.awareness.getLocalState() as AwarenessState;
  provider.awareness.setLocalState({
    ...currentState,
    cursor: position,
  });
}

/**
 * Update the local awareness state with active tool
 */
export function updateActiveTool(
  provider: HocuspocusProvider,
  tool: string | null
): void {
  if (!provider.awareness) return;

  const currentState = provider.awareness.getLocalState() as AwarenessState;
  provider.awareness.setLocalState({
    ...currentState,
    activeTool: tool,
  });
}

/**
 * Update the local user information
 */
export function updateLocalUser(
  provider: HocuspocusProvider,
  user: User
): void {
  if (!provider.awareness) return;

  const currentState = provider.awareness.getLocalState() as AwarenessState;
  provider.awareness.setLocalState({
    ...currentState,
    user,
  });
}

/**
 * Get all remote users from awareness
 */
export function getRemoteUsers(provider: HocuspocusProvider): AwarenessState[] {
  if (!provider.awareness) return [];

  const states: AwarenessState[] = [];
  const localClientId = provider.awareness.clientID;

  provider.awareness.getStates().forEach((state, clientId) => {
    if (clientId !== localClientId && state.user) {
      states.push(state as AwarenessState);
    }
  });

  return states;
}

/**
 * Debounce function for cursor updates
 */
export function createDebouncedCursorUpdate(
  provider: HocuspocusProvider,
  delay: number = 50
): (position: CursorPosition | null) => void {
  let timeoutId: ReturnType<typeof setTimeout> | null = null;

  return (position: CursorPosition | null) => {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }

    timeoutId = setTimeout(() => {
      updateCursorPosition(provider, position);
      timeoutId = null;
    }, delay);
  };
}
