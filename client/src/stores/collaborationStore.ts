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
import type { OperationalFeature, Layer } from '@/types/operational';

interface CollaborationState {
  // Connection state
  ydoc: Y.Doc | null;
  provider: HocuspocusProvider | null;
  undoManager: Y.UndoManager | null;
  connectionStatus: ConnectionStatus;
  roomName: string | null;

  // User state
  localUser: User | null;
  remoteUsers: RemoteUserState[];

  // Undo/Redo state
  canUndo: boolean;
  canRedo: boolean;

  // Actions
  connect: (roomName: string, user?: Partial<User>) => void;
  disconnect: () => void;
  setLocalUser: (user: User) => void;
  updateCursor: (x: number, y: number, longitude: number, latitude: number) => void;
  setActiveTool: (tool: string | null) => void;
  undo: () => void;
  redo: () => void;

  // Layer management
  activeLayerId: string | null;
  setActiveLayerId: (layerId: string | null) => void;
  createLayer: (name: string, color?: string) => Layer | null;
  deleteLayer: (layerId: string) => void;
  updateLayer: (layerId: string, updates: Partial<Layer>) => void;
  reorderLayer: (layerId: string, newIndex: number) => void;

  // Document accessors
  getLayers: () => Y.Array<Layer> | null;
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

export const useCollaborationStore = create<CollaborationState>((set, get) => ({
  // Initial state
  ydoc: null,
  provider: null,
  undoManager: null,
  connectionStatus: 'disconnected',
  roomName: null,
  localUser: null,
  remoteUsers: [],
  canUndo: false,
  canRedo: false,
  activeLayerId: null,

  // Connect to a collaboration room
  connect: (roomName: string, user?: Partial<User>) => {
    const state = get();

    // Require user info for connection
    if (!user?.id || !user?.name) {
      console.error('[Collaboration] User info required to connect');
      return;
    }

    // Disconnect existing connection if any
    if (state.provider) {
      state.provider.destroy();
    }

    // Create new Yjs document
    const ydoc = new Y.Doc();

    // Create user info from provided user (authenticated)
    const localUser: User = {
      id: user.id,
      name: user.name,
      color: user.color || generateRandomColor(),
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

          const awarenessState = state as unknown as AwarenessState;
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

    // Create UndoManager for annotations (tracks all drawing operations)
    const layers = ydoc.getArray<Layer>('layers');
    const annotations = ydoc.getArray<OperationalFeature>('annotations');
    const markers = ydoc.getArray<OperationalFeature>('markers');
    const routes = ydoc.getArray<OperationalFeature>('routes');
    const zones = ydoc.getArray<OperationalFeature>('zones');

    const undoManager = new Y.UndoManager([annotations, markers, routes, zones], {
      trackedOrigins: new Set([null, ydoc.clientID]),
    });

    // Update canUndo/canRedo state when stack changes
    undoManager.on('stack-item-added', () => {
      set({
        canUndo: undoManager.undoStack.length > 0,
        canRedo: undoManager.redoStack.length > 0,
      });
    });

    undoManager.on('stack-item-popped', () => {
      set({
        canUndo: undoManager.undoStack.length > 0,
        canRedo: undoManager.redoStack.length > 0,
      });
    });

    // Initialize default layer AFTER sync (to avoid duplicates)
    provider.on('synced', () => {
      const currentLayers = layers.toArray();
      if (currentLayers.length === 0) {
        // Only create default layer if none exists after sync
        const defaultLayer: Layer = {
          id: `layer-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
          name: 'Default Layer',
          layerType: 'annotations',
          style: { color: '#FFD700', strokeWidth: 2, fillOpacity: 0.2 },
          zIndex: 0,
          visible: true,
          locked: false,
          createdBy: localUser.id,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        layers.push([defaultLayer]);
        set({ activeLayerId: defaultLayer.id });
        console.log('[Collaboration] Created default layer after sync');
      } else {
        // Set active layer to first existing layer
        set({ activeLayerId: currentLayers[0]?.id ?? null });
      }
    });

    set({
      ydoc,
      provider,
      undoManager,
      connectionStatus: 'connecting',
      roomName,
      localUser,
      canUndo: false,
      canRedo: false,
      activeLayerId: null, // Will be set after sync
    });
  },

  // Disconnect from current room
  disconnect: () => {
    const { provider, ydoc, undoManager } = get();

    if (undoManager) {
      undoManager.destroy();
    }

    if (provider) {
      provider.destroy();
    }

    if (ydoc) {
      ydoc.destroy();
    }

    set({
      ydoc: null,
      provider: null,
      undoManager: null,
      connectionStatus: 'disconnected',
      roomName: null,
      remoteUsers: [],
      canUndo: false,
      canRedo: false,
      activeLayerId: null,
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

  // Undo last action
  undo: () => {
    const { undoManager } = get();
    if (undoManager && undoManager.undoStack.length > 0) {
      undoManager.undo();
      console.log('[Collaboration] Undo');
    }
  },

  // Redo last undone action
  redo: () => {
    const { undoManager } = get();
    if (undoManager && undoManager.redoStack.length > 0) {
      undoManager.redo();
      console.log('[Collaboration] Redo');
    }
  },

  // Set active layer
  setActiveLayerId: (layerId: string | null) => {
    set({ activeLayerId: layerId });
  },

  // Create a new layer
  createLayer: (name: string, color?: string) => {
    const { ydoc, localUser } = get();
    if (!ydoc) return null;

    const layers = ydoc.getArray<Layer>('layers');
    const maxZIndex = layers.toArray().reduce((max, l) => Math.max(max, l.zIndex), -1);

    const newLayer: Layer = {
      id: `layer-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
      name,
      layerType: 'annotations',
      style: {
        color: color || '#FFD700',
        strokeWidth: 2,
        fillOpacity: 0.2,
      },
      zIndex: maxZIndex + 1,
      visible: true,
      locked: false,
      createdBy: localUser?.id,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    ydoc.transact(() => {
      layers.push([newLayer]);
    });

    set({ activeLayerId: newLayer.id });
    console.log('[Collaboration] Created layer:', newLayer.name);
    return newLayer;
  },

  // Delete a layer and its features
  deleteLayer: (layerId: string) => {
    const { ydoc, activeLayerId } = get();
    if (!ydoc) return;

    const layers = ydoc.getArray<Layer>('layers');
    const annotations = ydoc.getArray<OperationalFeature>('annotations');

    ydoc.transact(() => {
      // Remove all features belonging to this layer
      const featuresToRemove: number[] = [];
      annotations.forEach((feature, index) => {
        if (feature.properties?.layerId === layerId) {
          featuresToRemove.push(index);
        }
      });
      // Delete in reverse order to maintain indices
      for (let i = featuresToRemove.length - 1; i >= 0; i--) {
        annotations.delete(featuresToRemove[i], 1);
      }

      // Remove the layer
      const layerIndex = layers.toArray().findIndex((l) => l.id === layerId);
      if (layerIndex !== -1) {
        layers.delete(layerIndex, 1);
      }
    });

    // Update active layer if needed
    if (activeLayerId === layerId) {
      const remainingLayers = layers.toArray();
      set({ activeLayerId: remainingLayers[0]?.id ?? null });
    }

    console.log('[Collaboration] Deleted layer:', layerId);
  },

  // Update layer properties
  updateLayer: (layerId: string, updates: Partial<Layer>) => {
    const { ydoc } = get();
    if (!ydoc) return;

    const layers = ydoc.getArray<Layer>('layers');

    ydoc.transact(() => {
      const index = layers.toArray().findIndex((l) => l.id === layerId);
      if (index !== -1) {
        const current = layers.get(index);
        const updated: Layer = {
          ...current,
          ...updates,
          updatedAt: new Date().toISOString(),
        };
        layers.delete(index, 1);
        layers.insert(index, [updated]);
      }
    });
  },

  // Reorder layer
  reorderLayer: (layerId: string, newIndex: number) => {
    const { ydoc } = get();
    if (!ydoc) return;

    const layers = ydoc.getArray<Layer>('layers');

    ydoc.transact(() => {
      const layersArray = layers.toArray();
      const currentIndex = layersArray.findIndex((l) => l.id === layerId);
      if (currentIndex === -1 || currentIndex === newIndex) return;

      const [layer] = layersArray.splice(currentIndex, 1);

      // Update zIndex for all layers
      layersArray.splice(newIndex, 0, layer);
      layersArray.forEach((l, i) => {
        l.zIndex = i;
      });

      // Replace all layers
      layers.delete(0, layers.length);
      layers.push(layersArray);
    });
  },

  // Document accessors
  getLayers: () => {
    const { ydoc } = get();
    return ydoc?.getArray<Layer>('layers') ?? null;
  },
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
