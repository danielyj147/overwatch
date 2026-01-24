import type { Map as MapLibreMap, MapMouseEvent } from 'maplibre-gl';
import type { Position } from 'geojson';
import type { DrawingTool, DrawingStyle } from '@/stores/mapStore';
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
}

export class DrawingManager {
  private map: MapLibreMap;
  private onFeatureCreated: (feature: OperationalFeature) => void;
  private onDrawingStateChange: (state: DrawingState) => void;
  private getUserId: () => string;

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

  private clickHandler: ((e: MapMouseEvent) => void) | null = null;
  private moveHandler: ((e: MapMouseEvent) => void) | null = null;
  private dblClickHandler: ((e: MapMouseEvent) => void) | null = null;

  constructor(options: DrawingManagerOptions) {
    this.map = options.map;
    this.onFeatureCreated = options.onFeatureCreated;
    this.onDrawingStateChange = options.onDrawingStateChange;
    this.getUserId = options.getUserId;
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

  private attachEventListeners() {
    // Remove existing listeners
    this.removeEventListeners();

    // Set up new listeners based on tool
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
      const coords: Position = [e.lngLat.lng, e.lngLat.lat];
      const feature = createPointFeature(
        coords,
        {
          fillColor: this.style.fillColor,
          strokeColor: this.style.color,
          strokeWidth: this.style.strokeWidth,
        },
        this.getUserId()
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
    };

    this.dblClickHandler = (e: MapMouseEvent) => {
      e.preventDefault();
      if (this.vertices.length >= 2) {
        const feature = createLineFeature(
          this.vertices,
          {
            strokeColor: this.style.color,
            strokeWidth: this.style.strokeWidth,
          },
          this.getUserId()
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
    };

    this.dblClickHandler = (e: MapMouseEvent) => {
      e.preventDefault();
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
          'circle'
        );
        this.onFeatureCreated(feature);
        this.resetDrawing();
      }
    };

    this.map.on('click', this.clickHandler);
  }

  private resetDrawing() {
    this.vertices = [];
    this.startPoint = null;
    this.state = 'idle';
    this.onDrawingStateChange('idle');
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
  }
}
