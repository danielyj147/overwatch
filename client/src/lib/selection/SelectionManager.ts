import type { Map as MapLibreMap, MapMouseEvent } from 'maplibre-gl';
import type { SelectionBox } from '@/types/collaboration';
import { useMapStore } from '@/stores/mapStore';

export interface SelectionManagerOptions {
  map: MapLibreMap;
  onSelectionComplete: (bounds: SelectionBox, addToSelection: boolean) => void;
}

export class SelectionManager {
  private map: MapLibreMap;
  private onSelectionComplete: (bounds: SelectionBox, addToSelection: boolean) => void;
  private isEnabled: boolean = false;
  private isDragging: boolean = false;
  private isShiftHeld: boolean = false;
  private startPoint: { x: number; y: number; lng: number; lat: number } | null = null;

  private mouseDownHandler: ((e: MapMouseEvent) => void) | null = null;
  private mouseMoveHandler: ((e: MapMouseEvent) => void) | null = null;
  private mouseUpHandler: ((e: MapMouseEvent) => void) | null = null;
  private keyDownHandler: ((e: KeyboardEvent) => void) | null = null;
  private keyUpHandler: ((e: KeyboardEvent) => void) | null = null;

  constructor(options: SelectionManagerOptions) {
    this.map = options.map;
    this.onSelectionComplete = options.onSelectionComplete;
  }

  enable() {
    if (this.isEnabled) return;
    this.isEnabled = true;
    this.attachEventListeners();
  }

  disable() {
    if (!this.isEnabled) return;
    this.isEnabled = false;
    this.removeEventListeners();
    this.reset();
  }

  private attachEventListeners() {
    // Track shift key state
    this.keyDownHandler = (e: KeyboardEvent) => {
      if (e.key === 'Shift') {
        this.isShiftHeld = true;
        // Change cursor to indicate selection mode
        this.map.getCanvas().style.cursor = 'crosshair';
      }
    };

    this.keyUpHandler = (e: KeyboardEvent) => {
      if (e.key === 'Shift') {
        this.isShiftHeld = false;
        if (!this.isDragging) {
          this.map.getCanvas().style.cursor = '';
        }
      }
    };

    document.addEventListener('keydown', this.keyDownHandler);
    document.addEventListener('keyup', this.keyUpHandler);

    this.mouseDownHandler = (e: MapMouseEvent) => {
      // Only start selection on left click with Shift held
      if (e.originalEvent.button !== 0) return;
      if (!this.isShiftHeld) return;

      // Prevent default to avoid any zoom behavior
      e.preventDefault();

      this.isDragging = true;
      this.startPoint = {
        x: e.point.x,
        y: e.point.y,
        lng: e.lngLat.lng,
        lat: e.lngLat.lat,
      };

      // Prevent map panning while selecting
      this.map.dragPan.disable();
    };

    this.mouseMoveHandler = (e: MapMouseEvent) => {
      if (!this.isDragging || !this.startPoint) return;

      const selectionBox: SelectionBox = {
        startX: this.startPoint.x,
        startY: this.startPoint.y,
        endX: e.point.x,
        endY: e.point.y,
        startLng: this.startPoint.lng,
        startLat: this.startPoint.lat,
        endLng: e.lngLat.lng,
        endLat: e.lngLat.lat,
      };

      useMapStore.getState().setSelectionBox(selectionBox);
    };

    this.mouseUpHandler = (e: MapMouseEvent) => {
      if (!this.isDragging || !this.startPoint) {
        this.map.dragPan.enable();
        return;
      }

      const selectionBox: SelectionBox = {
        startX: this.startPoint.x,
        startY: this.startPoint.y,
        endX: e.point.x,
        endY: e.point.y,
        startLng: this.startPoint.lng,
        startLat: this.startPoint.lat,
        endLng: e.lngLat.lng,
        endLat: e.lngLat.lat,
      };

      // Only trigger selection if the box has meaningful size
      const width = Math.abs(selectionBox.endX - selectionBox.startX);
      const height = Math.abs(selectionBox.endY - selectionBox.startY);

      if (width > 5 && height > 5) {
        // Pass true to indicate adding to existing selection (shift is held)
        this.onSelectionComplete(selectionBox, this.isShiftHeld);
      }

      this.reset();
      this.map.dragPan.enable();
    };

    this.map.on('mousedown', this.mouseDownHandler);
    this.map.on('mousemove', this.mouseMoveHandler);
    this.map.on('mouseup', this.mouseUpHandler);
  }

  private removeEventListeners() {
    if (this.mouseDownHandler) {
      this.map.off('mousedown', this.mouseDownHandler);
      this.mouseDownHandler = null;
    }
    if (this.mouseMoveHandler) {
      this.map.off('mousemove', this.mouseMoveHandler);
      this.mouseMoveHandler = null;
    }
    if (this.mouseUpHandler) {
      this.map.off('mouseup', this.mouseUpHandler);
      this.mouseUpHandler = null;
    }
    if (this.keyDownHandler) {
      document.removeEventListener('keydown', this.keyDownHandler);
      this.keyDownHandler = null;
    }
    if (this.keyUpHandler) {
      document.removeEventListener('keyup', this.keyUpHandler);
      this.keyUpHandler = null;
    }
  }

  private reset() {
    this.isDragging = false;
    this.startPoint = null;
    useMapStore.getState().setSelectionBox(null);
    // Restore cursor based on shift state
    if (!this.isShiftHeld) {
      this.map.getCanvas().style.cursor = '';
    }
  }

  destroy() {
    this.disable();
  }
}
