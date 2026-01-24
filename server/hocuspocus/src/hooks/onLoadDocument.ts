import { onLoadDocumentPayload } from '@hocuspocus/server';
import * as Y from 'yjs';

/**
 * Initialize new documents with default structure
 * This hook is called when a document is first loaded
 */
export async function onLoadDocument(data: onLoadDocumentPayload): Promise<void> {
  const { document, documentName } = data;

  // Check if document is empty (new document)
  const isEmpty = document.store.clients.size === 0 &&
    Array.from(document.share.keys()).length === 0;

  if (!isEmpty) {
    console.log(`[Document] Loaded existing document: ${documentName}`);
    return;
  }

  console.log(`[Document] Initializing new document: ${documentName}`);

  // Initialize default document structure
  document.transact(() => {
    // Metadata map for document-level information
    const metadata = document.getMap('metadata');
    metadata.set('createdAt', Date.now());
    metadata.set('documentName', documentName);
    metadata.set('version', 1);

    // Annotations array for collaborative drawings
    const annotations = document.getArray('annotations');
    // Start empty - annotations will be added by users

    // Markers array for point features
    const markers = document.getArray('markers');

    // Routes array for line features
    const routes = document.getArray('routes');

    // Zones array for polygon features
    const zones = document.getArray('zones');

    // Chat messages for operational communication
    const messages = document.getArray('messages');

    // Viewport sync map (optional feature for "follow me" mode)
    const viewport = document.getMap('viewport');
    viewport.set('leader', null);

    console.log(`[Document] Document structure initialized: ${documentName}`);
  });
}

/**
 * Type definitions for Yjs document structure
 */
export interface AnnotationFeature {
  id: string;
  type: 'Feature';
  geometry: {
    type: 'Point' | 'LineString' | 'Polygon';
    coordinates: number[] | number[][] | number[][][];
  };
  properties: {
    name?: string;
    description?: string;
    featureType: 'point' | 'line' | 'polygon' | 'circle' | 'rectangle';
    style: {
      color?: string;
      fillColor?: string;
      fillOpacity?: number;
      strokeColor?: string;
      strokeWidth?: number;
    };
    createdBy: string;
    createdAt: number;
    updatedAt: number;
  };
}

export interface ChatMessage {
  id: string;
  userId: string;
  userName: string;
  content: string;
  timestamp: number;
}

export interface ViewportState {
  center: [number, number];
  zoom: number;
  bearing?: number;
  pitch?: number;
}
