import type { Doc as YDoc, Array as YArray, Map as YMap } from 'yjs';
import type { HocuspocusProvider } from '@hocuspocus/provider';
import type { OperationalFeature, ViewportState } from './operational';

/**
 * Connection status for collaboration
 */
export type ConnectionStatus = 'connecting' | 'connected' | 'disconnected' | 'error';

/**
 * User information for awareness
 */
export interface User {
  id: string;
  name: string;
  color: string;
}

/**
 * Cursor position for awareness
 */
export interface CursorPosition {
  x: number;
  y: number;
  longitude: number;
  latitude: number;
}

/**
 * Local awareness state
 */
export interface AwarenessState {
  user: User;
  cursor: CursorPosition | null;
  activeTool: string | null;
  viewport?: ViewportState;
  isFollowing?: string; // User ID being followed
}

/**
 * Remote user state (from awareness)
 */
export interface RemoteUserState {
  clientId: number;
  user: User;
  cursor: CursorPosition | null;
  activeTool: string | null;
}

/**
 * Chat message in collaboration
 */
export interface ChatMessage {
  id: string;
  userId: string;
  userName: string;
  content: string;
  timestamp: number;
}

/**
 * Yjs document structure type definitions
 */
export interface YjsDocumentTypes {
  metadata: YMap<unknown>;
  annotations: YArray<OperationalFeature>;
  markers: YArray<OperationalFeature>;
  routes: YArray<OperationalFeature>;
  zones: YArray<OperationalFeature>;
  messages: YArray<ChatMessage>;
  viewport: YMap<unknown>;
}

/**
 * Collaboration context provided to components
 */
export interface CollaborationContext {
  ydoc: YDoc | null;
  provider: HocuspocusProvider | null;
  connectionStatus: ConnectionStatus;
  localUser: User | null;
  remoteUsers: RemoteUserState[];
  // Document accessors
  getAnnotations: () => YArray<OperationalFeature> | null;
  getMarkers: () => YArray<OperationalFeature> | null;
  getRoutes: () => YArray<OperationalFeature> | null;
  getZones: () => YArray<OperationalFeature> | null;
  getMessages: () => YArray<ChatMessage> | null;
  getMetadata: () => YMap<unknown> | null;
}

/**
 * Drawing operation for undo/redo
 */
export interface DrawingOperation {
  type: 'add' | 'update' | 'delete';
  featureType: 'annotation' | 'marker' | 'route' | 'zone';
  featureId: string;
  previousState?: OperationalFeature;
  newState?: OperationalFeature;
  timestamp: number;
}

/**
 * Selection state (supports single and multi-selection)
 */
export interface SelectionState {
  featureIds: string[];
  featureType: 'annotation' | 'marker' | 'route' | 'zone' | null;
  isEditing: boolean;
}

/**
 * Selection box for drag-to-select
 */
export interface SelectionBox {
  startX: number;
  startY: number;
  endX: number;
  endY: number;
  startLng: number;
  startLat: number;
  endLng: number;
  endLat: number;
}
