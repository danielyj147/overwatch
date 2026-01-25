import type { Map as MapLibreMap, MapMouseEvent } from 'maplibre-gl';
import type { Position } from 'geojson';
import type { DrawingTool, DrawingStyle } from '@/stores/mapStore';
import { useMapStore } from '@/stores/mapStore';
import type { OperationalFeature } from '@/types/operational';
import {
  createPointFeature,
  createLineFeature,
  createPolygonFeature,
  createRectangleCoordinates,
  createCircleCoordinates,
  calculateDistance,
} from './geometry';

export type DrawingState = 'idle' | 'drawing' | 'completed';

export interface DrawingManagerOptions {
  map: MapLibreMap;
  onFeatureCreated: (feature: OperationalFeature) => void;
  onDrawingStateChange: (state: DrawingState) => void;
  getUserId: () => string;
  getActiveLayerId: () => string | null;
}

export class DrawingManager {
  private map: MapLibreMap;
  private onFeatureCreated: (feature: OperationalFeature) => void;
  private onDrawingStateChange: (state: DrawingState) => void;
  private getUserId: () => string;
  private getActiveLayerId: () => string | null;

  private currentTool: DrawingTool = 'select';
  private style: DrawingStyle = {
    color: '#FFD700',
    fillColor: '#FFD700',
    fillOpacity: 0.2,
    strokeWidth: 2,
  };

  private state: DrawingState = 'idle';
  private vertices: Position[] = [];
  private startPoint: Position | null = null;
  private currentMousePos: Position | null = null;

  private clickHandler: ((e: MapMouseEvent) => void) | null = null;
  private moveHandler: ((e: MapMouseEvent) => void) | null = null;
  private dblClickHandler: ((e: MapMouseEvent) => void) | null = null;
  private keyHandler: ((e: KeyboardEvent) => void) | null = null;

  constructor(options: DrawingManagerOptions) {
    this.map = options.map;
    this.onFeatureCreated = options.onFeatureCreated;
    this.onDrawingStateChange = options.onDrawingStateChange;
    this.getUserId = options.getUserId;
    this.getActiveLayerId = options.getActiveLayerId;

    // Set up escape key handler
    this.keyHandler = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && this.state === 'drawing') {
        this.cancelDrawing();
      }
    };
    document.addEventListener('keydown', this.keyHandler);
  }

  setTool(tool: DrawingTool) {
    this.cleanup();
    this.currentTool = tool;

    if (tool === 'select') {
      return;
    }

    this.attachEventListeners();
  }

  setStyle(style: Partial<DrawingStyle>) {
    this.style = { ...this.style, ...style };
  }

  private updatePreview() {
    const setDrawingPreview = useMapStore.getState().setDrawingPreview;

    if (this.state !== 'drawing' || !this.currentMousePos) {
      setDrawingPreview(null);
      return;
    }

    switch (this.currentTool) {
      case 'line': {
        if (this.vertices.length > 0) {
          const coords = [...this.vertices, this.currentMousePos] as [number, number][];
          setDrawingPreview({ type: 'line', coordinates: coords });
        }
        break;
      }
      case 'polygon': {
        if (this.vertices.length > 0) {
          // Close the polygon by adding first point at the end
          const coords = [...this.vertices, this.currentMousePos] as [number, number][];
          if (coords.length >= 2) {
            coords.push(coords[0]);
          }
          setDrawingPreview({ type: 'polygon', coordinates: coords });
        }
        break;
      }
      case 'rectangle': {
        if (this.startPoint) {
          const coords = createRectangleCoordinates(this.startPoint, this.currentMousePos);
          setDrawingPreview({ type: 'rectangle', coordinates: coords as [number, number][] });
        }
        break;
      }
      case 'circle': {
        if (this.startPoint) {
          const radius = calculateDistance(this.startPoint, this.currentMousePos);
          const coords = createCircleCoordinates(this.startPoint, radius);
          setDrawingPreview({ type: 'circle', coordinates: coords as [number, number][] });
        }
        break;
      }
    }
  }

  private attachEventListeners() {
    this.removeEventListeners();

    // Common mousemove handler for preview
    this.moveHandler = (e: MapMouseEvent) => {
      this.currentMousePos = [e.lngLat.lng, e.lngLat.lat];
      if (this.state === 'drawing') {
        this.updatePreview();
      }
    };
    this.map.on('mousemove', this.moveHandler);

    switch (this.currentTool) {
      case 'point':
        this.setupPointDrawing();
        break;
      case 'line':
        this.setupLineDrawing();
        break;
      case 'polygon':
        this.setupPolygonDrawing();
        break;
      case 'rectangle':
        this.setupRectangleDrawing();
        break;
      case 'circle':
        this.setupCircleDrawing();
        break;
    }
  }

  private setupPointDrawing() {
    this.clickHandler = (e: MapMouseEvent) => {
      const layerId = this.getActiveLayerId();
      if (!layerId) {
        console.warn('[Drawing] No active layer selected');
        return;
      }

      const coords: Position = [e.lngLat.lng, e.lngLat.lat];
      const feature = createPointFeature(
        coords,
        {
          fillColor: this.style.fillColor,
          strokeColor: this.style.color,
          strokeWidth: this.style.strokeWidth,
        },
        this.getUserId(),
        layerId
      );
      this.onFeatureCreated(feature);
    };

    this.map.on('click', this.clickHandler);
  }

  private setupLineDrawing() {
    this.clickHandler = (e: MapMouseEvent) => {
      const coords: Position = [e.lngLat.lng, e.lngLat.lat];
      this.vertices.push(coords);

      if (this.state === 'idle') {
        this.state = 'drawing';
        this.onDrawingStateChange('drawing');
      }
      this.updatePreview();
    };

    this.dblClickHandler = (e: MapMouseEvent) => {
      e.preventDefault();
      const layerId = this.getActiveLayerId();
      if (!layerId) {
        console.warn('[Drawing] No active layer selected');
        return;
      }

      if (this.vertices.length >= 2) {
        const feature = createLineFeature(
          this.vertices,
          {
            strokeColor: this.style.color,
            strokeWidth: this.style.strokeWidth,
          },
          this.getUserId(),
          layerId
        );
        this.onFeatureCreated(feature);
        this.resetDrawing();
      }
    };

    this.map.on('click', this.clickHandler);
    this.map.on('dblclick', this.dblClickHandler);
  }

  private setupPolygonDrawing() {
    this.clickHandler = (e: MapMouseEvent) => {
      const coords: Position = [e.lngLat.lng, e.lngLat.lat];
      this.vertices.push(coords);

      if (this.state === 'idle') {
        this.state = 'drawing';
        this.onDrawingStateChange('drawing');
      }
      this.updatePreview();
    };

    this.dblClickHandler = (e: MapMouseEvent) => {
      e.preventDefault();
      const layerId = this.getActiveLayerId();
      if (!layerId) {
        console.warn('[Drawing] No active layer selected');
        return;
      }

      if (this.vertices.length >= 3) {
        const feature = createPolygonFeature(
          this.vertices,
          {
            fillColor: this.style.fillColor,
            fillOpacity: this.style.fillOpacity,
            strokeColor: this.style.color,
            strokeWidth: this.style.strokeWidth,
          },
          this.getUserId(),
          layerId,
          'polygon'
        );
        this.onFeatureCreated(feature);
        this.resetDrawing();
      }
    };

    this.map.on('click', this.clickHandler);
    this.map.on('dblclick', this.dblClickHandler);
  }

  private setupRectangleDrawing() {
    this.clickHandler = (e: MapMouseEvent) => {
      const coords: Position = [e.lngLat.lng, e.lngLat.lat];

      if (!this.startPoint) {
        this.startPoint = coords;
        this.state = 'drawing';
        this.onDrawingStateChange('drawing');
      } else {
        const layerId = this.getActiveLayerId();
        if (!layerId) {
          console.warn('[Drawing] No active layer selected');
          return;
        }

        const rectangleCoords = createRectangleCoordinates(this.startPoint, coords);
        const feature = createPolygonFeature(
          rectangleCoords,
          {
            fillColor: this.style.fillColor,
            fillOpacity: this.style.fillOpacity,
            strokeColor: this.style.color,
            strokeWidth: this.style.strokeWidth,
          },
          this.getUserId(),
          layerId,
          'rectangle'
        );
        this.onFeatureCreated(feature);
        this.resetDrawing();
      }
    };

    this.map.on('click', this.clickHandler);
  }

  private setupCircleDrawing() {
    this.clickHandler = (e: MapMouseEvent) => {
      const coords: Position = [e.lngLat.lng, e.lngLat.lat];

      if (!this.startPoint) {
        this.startPoint = coords;
        this.state = 'drawing';
        this.onDrawingStateChange('drawing');
      } else {
        const layerId = this.getActiveLayerId();
        if (!layerId) {
          console.warn('[Drawing] No active layer selected');
          return;
        }

        const radius = calculateDistance(this.startPoint, coords);
        const circleCoords = createCircleCoordinates(this.startPoint, radius);
        const feature = createPolygonFeature(
          circleCoords,
          {
            fillColor: this.style.fillColor,
            fillOpacity: this.style.fillOpacity,
            strokeColor: this.style.color,
            strokeWidth: this.style.strokeWidth,
          },
          this.getUserId(),
          layerId,
          'circle'
        );
        this.onFeatureCreated(feature);
        this.resetDrawing();
      }
    };

    this.map.on('click', this.clickHandler);
  }

  private cancelDrawing() {
    this.resetDrawing();
  }

  private resetDrawing() {
    this.vertices = [];
    this.startPoint = null;
    this.currentMousePos = null;
    this.state = 'idle';
    this.onDrawingStateChange('idle');
    useMapStore.getState().setDrawingPreview(null);
  }

  private removeEventListeners() {
    if (this.clickHandler) {
      this.map.off('click', this.clickHandler);
      this.clickHandler = null;
    }
    if (this.moveHandler) {
      this.map.off('mousemove', this.moveHandler);
      this.moveHandler = null;
    }
    if (this.dblClickHandler) {
      this.map.off('dblclick', this.dblClickHandler);
      this.dblClickHandler = null;
    }
  }

  cleanup() {
    this.removeEventListeners();
    this.resetDrawing();
  }

  destroy() {
    this.cleanup();
    if (this.keyHandler) {
      document.removeEventListener('keydown', this.keyHandler);
      this.keyHandler = null;
    }
  }
}
