import { Eye, EyeOff, Lock, Unlock, GripVertical } from 'lucide-react';
import { useMapStore } from '@/stores/mapStore';
import { clsx } from 'clsx';
import type { Layer } from '@/types/operational';

// Sample layers for initial development
const SAMPLE_LAYERS: Layer[] = [
  {
    id: 'a1b2c3d4-e5f6-4a5b-8c9d-0e1f2a3b4c5d',
    name: 'Blue Force',
    description: 'Friendly units and assets',
    layerType: 'units',
    style: { color: '#4A90D9', icon: 'friendly-unit' },
    zIndex: 100,
    visible: true,
    locked: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'b2c3d4e5-f6a7-5b6c-9d0e-1f2a3b4c5d6e',
    name: 'Annotations',
    description: 'User-drawn annotations and markings',
    layerType: 'annotations',
    style: { color: '#FFD700', strokeWidth: 2 },
    zIndex: 200,
    visible: true,
    locked: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'c3d4e5f6-a7b8-6c7d-0e1f-2a3b4c5d6e7f',
    name: 'Objectives',
    description: 'Mission objectives and waypoints',
    layerType: 'points',
    style: { color: '#FF6B6B', icon: 'objective' },
    zIndex: 150,
    visible: true,
    locked: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'd4e5f6a7-b8c9-7d8e-1f2a-3b4c5d6e7f8a',
    name: 'Operational Zones',
    description: 'Area boundaries and zones of control',
    layerType: 'zones',
    style: { fillColor: '#4A90D9', fillOpacity: 0.2, strokeColor: '#4A90D9', strokeWidth: 2 },
    zIndex: 50,
    visible: true,
    locked: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

export function LayerPanel() {
  const { layerVisibility, toggleLayerVisibility, setLayers, layers } = useMapStore();

  // Initialize layers if empty
  if (layers.length === 0) {
    setLayers(SAMPLE_LAYERS);
  }

  const displayLayers = layers.length > 0 ? layers : SAMPLE_LAYERS;

  return (
    <div className="p-4">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-semibold text-white">Layers</h2>
        <button className="btn-ghost text-xs px-2 py-1">Add Layer</button>
      </div>

      <div className="space-y-2">
        {displayLayers.map((layer) => (
          <LayerItem
            key={layer.id}
            layer={layer}
            isVisible={layerVisibility[layer.id] ?? layer.visible}
            onToggleVisibility={() => toggleLayerVisibility(layer.id)}
          />
        ))}
      </div>
    </div>
  );
}

interface LayerItemProps {
  layer: Layer;
  isVisible: boolean;
  onToggleVisibility: () => void;
}

function LayerItem({ layer, isVisible, onToggleVisibility }: LayerItemProps) {
  const getLayerColor = (layer: Layer): string => {
    return layer.style.color || layer.style.fillColor || layer.style.strokeColor || '#888888';
  };

  return (
    <div
      className={clsx(
        'flex items-center gap-2 p-2 rounded-lg transition-colors',
        'bg-surface-light hover:bg-surface border border-transparent hover:border-gray-600'
      )}
    >
      {/* Drag handle */}
      <div className="cursor-grab text-gray-500 hover:text-gray-300">
        <GripVertical size={14} />
      </div>

      {/* Color indicator */}
      <div
        className="w-3 h-3 rounded-full flex-shrink-0"
        style={{ backgroundColor: getLayerColor(layer) }}
      />

      {/* Layer name */}
      <div className="flex-1 min-w-0">
        <div className="text-sm text-white truncate">{layer.name}</div>
        <div className="text-xs text-gray-500 capitalize">{layer.layerType}</div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-1">
        <button
          onClick={onToggleVisibility}
          className={clsx(
            'p-1 rounded transition-colors',
            isVisible ? 'text-white hover:text-gray-300' : 'text-gray-500 hover:text-gray-300'
          )}
          title={isVisible ? 'Hide layer' : 'Show layer'}
        >
          {isVisible ? <Eye size={14} /> : <EyeOff size={14} />}
        </button>
        <button
          className={clsx(
            'p-1 rounded transition-colors',
            layer.locked ? 'text-yellow-500' : 'text-gray-500 hover:text-gray-300'
          )}
          title={layer.locked ? 'Unlock layer' : 'Lock layer'}
        >
          {layer.locked ? <Lock size={14} /> : <Unlock size={14} />}
        </button>
      </div>
    </div>
  );
}
