import { useState, useEffect } from 'react';
import {
  Layers,
  Plus,
  Eye,
  EyeOff,
  Lock,
  Unlock,
  Trash2,
  Eraser,
  GripVertical,
  ChevronDown,
  ChevronRight,
} from 'lucide-react';
import { useCollaborationStore } from '@/stores/collaborationStore';
import { clsx } from 'clsx';
import type { Layer } from '@/types/operational';

export function LayerPanel() {
  const {
    ydoc,
    getLayers,
    getAnnotations,
    activeLayerId,
    setActiveLayerId,
    createLayer,
    deleteLayer,
    updateLayer,
  } = useCollaborationStore();

  const [layers, setLayers] = useState<Layer[]>([]);
  const [isCreating, setIsCreating] = useState(false);
  const [newLayerName, setNewLayerName] = useState('');
  const [isExpanded, setIsExpanded] = useState(true);

  // Subscribe to layers changes
  useEffect(() => {
    if (!ydoc) return;

    const yLayers = getLayers();
    if (!yLayers) return;

    const updateLayers = () => {
      setLayers(yLayers.toArray().sort((a, b) => b.zIndex - a.zIndex));
    };

    updateLayers();
    yLayers.observe(updateLayers);

    return () => {
      yLayers.unobserve(updateLayers);
    };
  }, [ydoc, getLayers]);

  const handleCreateLayer = () => {
    if (!newLayerName.trim()) return;
    createLayer(newLayerName.trim());
    setNewLayerName('');
    setIsCreating(false);
  };

  const handleToggleVisibility = (layer: Layer) => {
    updateLayer(layer.id, { visible: !layer.visible });
  };

  const handleToggleLock = (layer: Layer) => {
    updateLayer(layer.id, { locked: !layer.locked });
  };

  const handleDelete = (layer: Layer) => {
    if (layers.length <= 1) {
      alert('Cannot delete the last layer');
      return;
    }
    if (confirm(`Delete layer "${layer.name}"? All objects on this layer will be deleted.`)) {
      deleteLayer(layer.id);
    }
  };

  const handleClear = (layer: Layer) => {
    if (!ydoc) return;

    const annotations = getAnnotations();
    if (!annotations) return;

    const featureCount = annotations.toArray().filter(f => f.properties?.layerId === layer.id).length;
    if (featureCount === 0) {
      alert('Layer is already empty');
      return;
    }

    if (confirm(`Clear all ${featureCount} object(s) from "${layer.name}"?`)) {
      ydoc.transact(() => {
        // Find and delete all features belonging to this layer (in reverse order)
        const arr = annotations.toArray();
        for (let i = arr.length - 1; i >= 0; i--) {
          if (arr[i].properties?.layerId === layer.id) {
            annotations.delete(i, 1);
          }
        }
      });
      console.log('[LayerPanel] Cleared layer:', layer.name);
    }
  };

  return (
    <div className="border-b border-gray-700">
      {/* Header */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between p-3 hover:bg-surface-light transition-colors"
      >
        <div className="flex items-center gap-2">
          {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
          <Layers size={16} />
          <span className="text-sm font-medium">Layers</span>
        </div>
        <span className="text-xs text-gray-500">{layers.length}</span>
      </button>

      {isExpanded && (
        <div className="px-2 pb-2">
          {/* Add layer button */}
          {!isCreating ? (
            <button
              onClick={() => setIsCreating(true)}
              className="w-full flex items-center justify-center gap-1 p-2 mb-2 text-xs text-gray-400 hover:text-white hover:bg-surface-light rounded transition-colors"
            >
              <Plus size={14} />
              Add Layer
            </button>
          ) : (
            <div className="flex gap-1 mb-2">
              <input
                type="text"
                value={newLayerName}
                onChange={(e) => setNewLayerName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleCreateLayer();
                  if (e.key === 'Escape') {
                    setIsCreating(false);
                    setNewLayerName('');
                  }
                }}
                placeholder="Layer name"
                className="flex-1 px-2 py-1 text-xs bg-surface border border-gray-600 rounded focus:outline-none focus:border-accent"
                autoFocus
              />
              <button
                onClick={handleCreateLayer}
                className="px-2 py-1 text-xs bg-accent text-white rounded hover:bg-accent-dark"
              >
                Add
              </button>
            </div>
          )}

          {/* Layer list */}
          <div className="space-y-1">
            {layers.map((layer) => (
              <LayerItem
                key={layer.id}
                layer={layer}
                isActive={activeLayerId === layer.id}
                onSelect={() => setActiveLayerId(layer.id)}
                onToggleVisibility={() => handleToggleVisibility(layer)}
                onToggleLock={() => handleToggleLock(layer)}
                onClear={() => handleClear(layer)}
                onDelete={() => handleDelete(layer)}
              />
            ))}
          </div>

          {layers.length === 0 && (
            <div className="text-center py-4 text-gray-500 text-xs">
              No layers yet
            </div>
          )}
        </div>
      )}
    </div>
  );
}

interface LayerItemProps {
  layer: Layer;
  isActive: boolean;
  onSelect: () => void;
  onToggleVisibility: () => void;
  onToggleLock: () => void;
  onClear: () => void;
  onDelete: () => void;
}

function LayerItem({
  layer,
  isActive,
  onSelect,
  onToggleVisibility,
  onToggleLock,
  onClear,
  onDelete,
}: LayerItemProps) {
  return (
    <div
      className={clsx(
        'flex items-center gap-1 p-1.5 rounded transition-colors group',
        isActive
          ? 'bg-accent/20 border border-accent/50'
          : 'hover:bg-surface-light border border-transparent'
      )}
    >
      {/* Drag handle */}
      <div className="text-gray-600 cursor-grab opacity-0 group-hover:opacity-100 transition-opacity">
        <GripVertical size={12} />
      </div>

      {/* Color indicator */}
      <div
        className="w-3 h-3 rounded-sm flex-shrink-0"
        style={{ backgroundColor: layer.style.color || '#FFD700' }}
      />

      {/* Layer name - clickable to select */}
      <button
        onClick={onSelect}
        className={clsx(
          'flex-1 text-left text-xs truncate',
          isActive ? 'text-white font-medium' : 'text-gray-300',
          !layer.visible && 'opacity-50'
        )}
      >
        {layer.name}
      </button>

      {/* Action buttons */}
      <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
        <button
          onClick={(e) => {
            e.stopPropagation();
            onToggleVisibility();
          }}
          className={clsx(
            'p-1 rounded hover:bg-surface transition-colors',
            layer.visible ? 'text-gray-400' : 'text-gray-600'
          )}
          title={layer.visible ? 'Hide layer' : 'Show layer'}
        >
          {layer.visible ? <Eye size={12} /> : <EyeOff size={12} />}
        </button>

        <button
          onClick={(e) => {
            e.stopPropagation();
            onToggleLock();
          }}
          className={clsx(
            'p-1 rounded hover:bg-surface transition-colors',
            layer.locked ? 'text-yellow-500' : 'text-gray-400'
          )}
          title={layer.locked ? 'Unlock layer' : 'Lock layer'}
        >
          {layer.locked ? <Lock size={12} /> : <Unlock size={12} />}
        </button>

        <button
          onClick={(e) => {
            e.stopPropagation();
            onClear();
          }}
          className="p-1 rounded hover:bg-surface text-gray-400 hover:text-orange-400 transition-colors"
          title="Clear all objects on layer"
        >
          <Eraser size={12} />
        </button>

        <button
          onClick={(e) => {
            e.stopPropagation();
            onDelete();
          }}
          className="p-1 rounded hover:bg-surface text-gray-400 hover:text-red-400 transition-colors"
          title="Delete layer"
        >
          <Trash2 size={12} />
        </button>
      </div>
    </div>
  );
}
