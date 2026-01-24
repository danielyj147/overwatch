import { useEffect, useState } from 'react';
import { useCollaborationStore } from '@/stores/collaborationStore';
import type { OperationalFeature } from '@/types/operational';

/**
 * CollaborativeLayer subscribes to Yjs document changes and triggers
 * re-renders of the Deck.gl layers through the useDeckLayers hook.
 *
 * This component serves as the bridge between Yjs and the map visualization.
 */
export function CollaborativeLayer() {
  const { ydoc, getAnnotations, getMarkers, getRoutes, getZones } = useCollaborationStore();
  const [featureCount, setFeatureCount] = useState(0);

  useEffect(() => {
    if (!ydoc) return;

    const annotations = getAnnotations();
    const markers = getMarkers();
    const routes = getRoutes();
    const zones = getZones();

    // Count all features
    const updateCount = () => {
      const count =
        (annotations?.length || 0) +
        (markers?.length || 0) +
        (routes?.length || 0) +
        (zones?.length || 0);
      setFeatureCount(count);
    };

    // Initial count
    updateCount();

    // Subscribe to all arrays
    const observeArray = (arr: ReturnType<typeof getAnnotations>) => {
      if (arr) {
        arr.observe(updateCount);
        return () => arr.unobserve(updateCount);
      }
      return () => {};
    };

    const unsubscribers = [
      observeArray(annotations),
      observeArray(markers),
      observeArray(routes),
      observeArray(zones),
    ];

    return () => {
      unsubscribers.forEach((unsub) => unsub());
    };
  }, [ydoc, getAnnotations, getMarkers, getRoutes, getZones]);

  // This component doesn't render anything visible
  // It just manages subscriptions and triggers updates
  return null;
}
