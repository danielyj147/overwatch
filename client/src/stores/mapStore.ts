import { create } from 'zustand';
import type { Map as MapLibreMap } from 'maplibre-gl';
import type { ViewportState, FeatureType, Layer } from '@/types/operational';
import type { SelectionState } from '@/types/collaboration';

/**
 * Drawing tool types
 */
export type DrawingTool = 'select' | 'point' | 'line' | 'polygon' | 'rectangle' | 'circle';

/**
 * Drawing style configuration
 */
export interface DrawingStyle {
  color: string;
  fillColor: string;
  fillOpacity: number;
  strokeWidth: number;
}

interface MapState {
  // Map instance
  map: MapLibreMap | null;
  isMapReady: boolean;

  // Viewport
  viewport: ViewportState;
  isFollowingUser: string | null;

  // Drawing state
  activeTool: DrawingTool;
  drawingStyle: DrawingStyle;
  isDrawing: boolean;

  // Selection
  selection: SelectionState;

  // Layers
  layers: Layer[];
  layerVisibility: Record<string, boolean>;

  // Coordinates display
  cursorCoordinates: { lng: number; lat: number } | null;

  // Actions
  setMap: (map: MapLibreMap | null) => void;
  setMapReady: (ready: boolean) => void;
  setViewport: (viewport: Partial<ViewportState>) => void;
  setActiveTool: (tool: DrawingTool) => void;
  setDrawingStyle: (style: Partial<DrawingStyle>) => void;
  setIsDrawing: (isDrawing: boolean) => void;
  setSelection: (selection: Partial<SelectionState>) => void;
  clearSelection: () => void;
  setLayers: (layers: Layer[]) => void;
  toggleLayerVisibility: (layerId: string) => void;
  setCursorCoordinates: (coords: { lng: number; lat: number } | null) => void;
  setFollowingUser: (userId: string | null) => void;
}

const DEFAULT_VIEWPORT: ViewportState = {
  center: [-122.4194, 37.7749], // San Francisco
  zoom: 12,
  bearing: 0,
  pitch: 0,
};

const DEFAULT_DRAWING_STYLE: DrawingStyle = {
  color: '#FFD700',
  fillColor: '#FFD700',
  fillOpacity: 0.2,
  strokeWidth: 2,
};

export const useMapStore = create<MapState>((set, get) => ({
  // Initial state
  map: null,
  isMapReady: false,
  viewport: DEFAULT_VIEWPORT,
  isFollowingUser: null,
  activeTool: 'select',
  drawingStyle: DEFAULT_DRAWING_STYLE,
  isDrawing: false,
  selection: {
    featureId: null,
    featureType: null,
    isEditing: false,
  },
  layers: [],
  layerVisibility: {},
  cursorCoordinates: null,

  // Actions
  setMap: (map) => set({ map }),

  setMapReady: (ready) => set({ isMapReady: ready }),

  setViewport: (viewport) =>
    set((state) => ({
      viewport: { ...state.viewport, ...viewport },
    })),

  setActiveTool: (tool) => {
    set({ activeTool: tool });
    // Clear selection when switching to a drawing tool
    if (tool !== 'select') {
      get().clearSelection();
    }
  },

  setDrawingStyle: (style) =>
    set((state) => ({
      drawingStyle: { ...state.drawingStyle, ...style },
    })),

  setIsDrawing: (isDrawing) => set({ isDrawing }),

  setSelection: (selection) =>
    set((state) => ({
      selection: { ...state.selection, ...selection },
    })),

  clearSelection: () =>
    set({
      selection: {
        featureId: null,
        featureType: null,
        isEditing: false,
      },
    }),

  setLayers: (layers) => {
    const visibility: Record<string, boolean> = {};
    layers.forEach((layer) => {
      visibility[layer.id] = layer.visible;
    });
    set({ layers, layerVisibility: visibility });
  },

  toggleLayerVisibility: (layerId) =>
    set((state) => ({
      layerVisibility: {
        ...state.layerVisibility,
        [layerId]: !state.layerVisibility[layerId],
      },
    })),

  setCursorCoordinates: (coords) => set({ cursorCoordinates: coords }),

  setFollowingUser: (userId) => set({ isFollowingUser: userId }),
}));
