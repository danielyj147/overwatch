import { useEffect, useState, useCallback, useMemo } from 'react';
import * as Y from 'yjs';
import { useCollaborationStore } from '@/stores/collaborationStore';
import type { OperationalFeature } from '@/types/operational';
import type { ChatMessage } from '@/types/collaboration';

/**
 * Hook for accessing Yjs arrays with reactive updates
 */
export function useYArray<T>(getName: () => Y.Array<T> | null): T[] {
  const { ydoc } = useCollaborationStore();
  const [data, setData] = useState<T[]>([]);

  useEffect(() => {
    if (!ydoc) return;

    const yarray = getName();
    if (!yarray) return;

    // Initial data
    setData(yarray.toArray());

    // Subscribe to changes
    const observer = () => {
      setData(yarray.toArray());
    };

    yarray.observe(observer);

    return () => {
      yarray.unobserve(observer);
    };
  }, [ydoc, getName]);

  return data;
}

/**
 * Hook for accessing Yjs maps with reactive updates
 */
export function useYMap<T>(getName: () => Y.Map<T> | null): Map<string, T> {
  const { ydoc } = useCollaborationStore();
  const [data, setData] = useState<Map<string, T>>(new Map());

  useEffect(() => {
    if (!ydoc) return;

    const ymap = getName();
    if (!ymap) return;

    // Initial data
    const initialData = new Map<string, T>();
    ymap.forEach((value, key) => {
      initialData.set(key, value);
    });
    setData(initialData);

    // Subscribe to changes
    const observer = () => {
      const newData = new Map<string, T>();
      ymap.forEach((value, key) => {
        newData.set(key, value);
      });
      setData(newData);
    };

    ymap.observe(observer);

    return () => {
      ymap.unobserve(observer);
    };
  }, [ydoc, getName]);

  return data;
}

/**
 * Hook for annotations with CRUD operations
 */
export function useAnnotations() {
  const { ydoc, getAnnotations, localUser } = useCollaborationStore();
  const annotations = useYArray<OperationalFeature>(getAnnotations);

  const addAnnotation = useCallback(
    (feature: OperationalFeature) => {
      if (!ydoc) return;
      const yarray = getAnnotations();
      if (yarray) {
        ydoc.transact(() => {
          yarray.push([feature]);
        });
      }
    },
    [ydoc, getAnnotations]
  );

  const updateAnnotation = useCallback(
    (id: string, updates: Partial<OperationalFeature>) => {
      if (!ydoc) return;
      const yarray = getAnnotations();
      if (!yarray) return;

      ydoc.transact(() => {
        const index = yarray.toArray().findIndex((f) => f.properties?.id === id);
        if (index !== -1) {
          const current = yarray.get(index);
          const updated = {
            ...current,
            ...updates,
            properties: {
              ...current.properties,
              ...updates.properties,
              updatedAt: Date.now(),
            },
          };
          yarray.delete(index, 1);
          yarray.insert(index, [updated as OperationalFeature]);
        }
      });
    },
    [ydoc, getAnnotations]
  );

  const deleteAnnotation = useCallback(
    (id: string) => {
      if (!ydoc) return;
      const yarray = getAnnotations();
      if (!yarray) return;

      ydoc.transact(() => {
        const index = yarray.toArray().findIndex((f) => f.properties?.id === id);
        if (index !== -1) {
          yarray.delete(index, 1);
        }
      });
    },
    [ydoc, getAnnotations]
  );

  const clearAnnotations = useCallback(() => {
    if (!ydoc) return;
    const yarray = getAnnotations();
    if (!yarray) return;

    ydoc.transact(() => {
      yarray.delete(0, yarray.length);
    });
  }, [ydoc, getAnnotations]);

  return {
    annotations,
    addAnnotation,
    updateAnnotation,
    deleteAnnotation,
    clearAnnotations,
  };
}

/**
 * Hook for chat messages
 */
export function useMessages() {
  const { ydoc, getMessages, localUser } = useCollaborationStore();
  const messages = useYArray<ChatMessage>(getMessages);

  const sendMessage = useCallback(
    (content: string) => {
      if (!ydoc || !localUser) return;
      const yarray = getMessages();
      if (!yarray) return;

      const message: ChatMessage = {
        id: `msg-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
        userId: localUser.id,
        userName: localUser.name,
        content,
        timestamp: Date.now(),
      };

      ydoc.transact(() => {
        yarray.push([message]);
      });
    },
    [ydoc, getMessages, localUser]
  );

  return {
    messages,
    sendMessage,
  };
}

/**
 * Hook for document metadata
 */
export function useMetadata() {
  const { getMetadata } = useCollaborationStore();
  const metadata = useYMap<unknown>(getMetadata);

  return useMemo(
    () => ({
      createdAt: metadata.get('createdAt') as number | undefined,
      documentName: metadata.get('documentName') as string | undefined,
      version: metadata.get('version') as number | undefined,
    }),
    [metadata]
  );
}
