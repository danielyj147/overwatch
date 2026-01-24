import { create } from 'zustand';
import * as Y from 'yjs';
import { HocuspocusProvider } from '@hocuspocus/provider';
import type {
  ConnectionStatus,
  User,
  RemoteUserState,
  AwarenessState,
  ChatMessage,
} from '@/types/collaboration';
import type { OperationalFeature } from '@/types/operational';

interface CollaborationState {
  // Connection state
  ydoc: Y.Doc | null;
  provider: HocuspocusProvider | null;
  connectionStatus: ConnectionStatus;
  roomName: string | null;

  // User state
  localUser: User | null;
  remoteUsers: RemoteUserState[];

  // Actions
  connect: (roomName: string, user?: Partial<User>) => void;
  disconnect: () => void;
  setLocalUser: (user: User) => void;
  updateCursor: (x: number, y: number, longitude: number, latitude: number) => void;
  setActiveTool: (tool: string | null) => void;

  // Document accessors
  getAnnotations: () => Y.Array<OperationalFeature> | null;
  getMarkers: () => Y.Array<OperationalFeature> | null;
  getRoutes: () => Y.Array<OperationalFeature> | null;
  getZones: () => Y.Array<OperationalFeature> | null;
  getMessages: () => Y.Array<ChatMessage> | null;
  getMetadata: () => Y.Map<unknown> | null;
}

const generateRandomColor = (): string => {
  const colors = [
    '#E57373', '#F06292', '#BA68C8', '#9575CD',
    '#7986CB', '#64B5F6', '#4FC3F7', '#4DD0E1',
    '#4DB6AC', '#81C784', '#AED581', '#DCE775',
  ];
  return colors[Math.floor(Math.random() * colors.length)];
};

const generateUserId = (): string => {
  return `user-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
};

export const useCollaborationStore = create<CollaborationState>((set, get) => ({
  // Initial state
  ydoc: null,
  provider: null,
  connectionStatus: 'disconnected',
  roomName: null,
  localUser: null,
  remoteUsers: [],

  // Connect to a collaboration room
  connect: (roomName: string, user?: Partial<User>) => {
    const state = get();

    // Disconnect existing connection if any
    if (state.provider) {
      state.provider.destroy();
    }

    // Create new Yjs document
    const ydoc = new Y.Doc();

    // Create user info
    const localUser: User = {
      id: user?.id || generateUserId(),
      name: user?.name || `User ${Math.floor(Math.random() * 1000)}`,
      color: user?.color || generateRandomColor(),
    };

    // Create Hocuspocus provider
    const hocuspocusUrl = import.meta.env.VITE_HOCUSPOCUS_URL || 'ws://localhost:1234';
    const provider = new HocuspocusProvider({
      url: hocuspocusUrl,
      name: `operation:${roomName}`,
      document: ydoc,
      token: `${localUser.id}:${localUser.name}:${localUser.color}`,
      onConnect: () => {
        set({ connectionStatus: 'connected' });
        console.log('[Collaboration] Connected to room:', roomName);
      },
      onDisconnect: () => {
        set({ connectionStatus: 'disconnected' });
        console.log('[Collaboration] Disconnected from room:', roomName);
      },
      onStatus: ({ status }) => {
        if (status === 'connecting') {
          set({ connectionStatus: 'connecting' });
        }
      },
      onAwarenessUpdate: ({ states }) => {
        const remoteUsers: RemoteUserState[] = [];
        states.forEach((state, clientId) => {
          // Skip local user
          if (clientId === provider.awareness?.clientID) return;

          const awarenessState = state as AwarenessState;
          if (awarenessState.user) {
            remoteUsers.push({
              clientId,
              user: awarenessState.user,
              cursor: awarenessState.cursor,
              activeTool: awarenessState.activeTool,
            });
          }
        });
        set({ remoteUsers });
      },
    });

    // Set initial awareness state
    provider.awareness?.setLocalState({
      user: localUser,
      cursor: null,
      activeTool: null,
    } as AwarenessState);

    set({
      ydoc,
      provider,
      connectionStatus: 'connecting',
      roomName,
      localUser,
    });
  },

  // Disconnect from current room
  disconnect: () => {
    const { provider, ydoc } = get();

    if (provider) {
      provider.destroy();
    }

    if (ydoc) {
      ydoc.destroy();
    }

    set({
      ydoc: null,
      provider: null,
      connectionStatus: 'disconnected',
      roomName: null,
      remoteUsers: [],
    });
  },

  // Update local user
  setLocalUser: (user: User) => {
    const { provider } = get();
    set({ localUser: user });

    if (provider?.awareness) {
      const currentState = provider.awareness.getLocalState() as AwarenessState;
      provider.awareness.setLocalState({
        ...currentState,
        user,
      });
    }
  },

  // Update cursor position
  updateCursor: (x: number, y: number, longitude: number, latitude: number) => {
    const { provider } = get();

    if (provider?.awareness) {
      const currentState = provider.awareness.getLocalState() as AwarenessState;
      provider.awareness.setLocalState({
        ...currentState,
        cursor: { x, y, longitude, latitude },
      });
    }
  },

  // Set active drawing tool
  setActiveTool: (tool: string | null) => {
    const { provider } = get();

    if (provider?.awareness) {
      const currentState = provider.awareness.getLocalState() as AwarenessState;
      provider.awareness.setLocalState({
        ...currentState,
        activeTool: tool,
      });
    }
  },

  // Document accessors
  getAnnotations: () => {
    const { ydoc } = get();
    return ydoc?.getArray<OperationalFeature>('annotations') ?? null;
  },

  getMarkers: () => {
    const { ydoc } = get();
    return ydoc?.getArray<OperationalFeature>('markers') ?? null;
  },

  getRoutes: () => {
    const { ydoc } = get();
    return ydoc?.getArray<OperationalFeature>('routes') ?? null;
  },

  getZones: () => {
    const { ydoc } = get();
    return ydoc?.getArray<OperationalFeature>('zones') ?? null;
  },

  getMessages: () => {
    const { ydoc } = get();
    return ydoc?.getArray<ChatMessage>('messages') ?? null;
  },

  getMetadata: () => {
    const { ydoc } = get();
    return ydoc?.getMap('metadata') ?? null;
  },
}));
