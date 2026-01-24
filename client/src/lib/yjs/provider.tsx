import { createContext, useContext, type ReactNode } from 'react';
import { useCollaborationStore } from '@/stores/collaborationStore';
import type { CollaborationContext } from '@/types/collaboration';

const YjsContext = createContext<CollaborationContext | null>(null);

interface YjsProviderProps {
  children: ReactNode;
}

export function YjsProvider({ children }: YjsProviderProps) {
  const store = useCollaborationStore();

  const value: CollaborationContext = {
    ydoc: store.ydoc,
    provider: store.provider,
    connectionStatus: store.connectionStatus,
    localUser: store.localUser,
    remoteUsers: store.remoteUsers,
    getAnnotations: store.getAnnotations,
    getMarkers: store.getMarkers,
    getRoutes: store.getRoutes,
    getZones: store.getZones,
    getMessages: store.getMessages,
    getMetadata: store.getMetadata,
  };

  return <YjsContext.Provider value={value}>{children}</YjsContext.Provider>;
}

export function useYjsContext(): CollaborationContext {
  const context = useContext(YjsContext);
  if (!context) {
    throw new Error('useYjsContext must be used within a YjsProvider');
  }
  return context;
}
