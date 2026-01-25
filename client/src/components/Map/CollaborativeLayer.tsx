import { useEffect, useRef } from 'react';
import { useCollaborationStore } from '@/stores/collaborationStore';

/**
 * CollaborativeLayer sets up Yjs document subscriptions.
 * The actual rendering is handled by useDeckLayers hook.
 */
export function CollaborativeLayer() {
  const { ydoc, getAnnotations, getMarkers, getRoutes, getZones } = useCollaborationStore();
  const subscribedRef = useRef(false);

  useEffect(() => {
    if (!ydoc || subscribedRef.current) return;
    subscribedRef.current = true;

    // Initialize all Yjs arrays to ensure they exist
    getAnnotations();
    getMarkers();
    getRoutes();
    getZones();

    console.log('[CollaborativeLayer] Initialized Yjs arrays');

    return () => {
      subscribedRef.current = false;
    };
  }, [ydoc, getAnnotations, getMarkers, getRoutes, getZones]);

  // This component doesn't render anything visible
  return null;
}
