import {
  MousePointer2,
  Circle,
  Square,
  Minus,
  Pentagon,
  MapPin,
  Undo2,
  Redo2,
  Trash2,
} from 'lucide-react';
import { useMapStore, type DrawingTool } from '@/stores/mapStore';
import { useCollaborationStore } from '@/stores/collaborationStore';
import { clsx } from 'clsx';

const tools: { id: DrawingTool; icon: React.ReactNode; label: string }[] = [
  { id: 'select', icon: <MousePointer2 size={18} />, label: 'Select' },
  { id: 'point', icon: <MapPin size={18} />, label: 'Point' },
  { id: 'line', icon: <Minus size={18} />, label: 'Line' },
  { id: 'polygon', icon: <Pentagon size={18} />, label: 'Polygon' },
  { id: 'rectangle', icon: <Square size={18} />, label: 'Rectangle' },
  { id: 'circle', icon: <Circle size={18} />, label: 'Circle' },
];

export function Toolbar() {
  const { activeTool, setActiveTool, selection, clearSelection } = useMapStore();
  const { setActiveTool: setAwarenessTool } = useCollaborationStore();

  const handleToolSelect = (tool: DrawingTool) => {
    setActiveTool(tool);
    setAwarenessTool(tool === 'select' ? null : tool);
  };

  const handleDelete = () => {
    if (selection.featureId) {
      // TODO: Delete feature from Yjs
      clearSelection();
    }
  };

  return (
    <header className="h-12 bg-surface border-b border-gray-700 flex items-center px-4 gap-2">
      {/* Logo */}
      <div className="flex items-center gap-2 pr-4 border-r border-gray-700">
        <div className="w-8 h-8 rounded-full bg-accent flex items-center justify-center">
          <div className="w-3 h-3 rounded-full border-2 border-white" />
        </div>
        <span className="font-semibold text-white">Overwatch</span>
      </div>

      {/* Drawing tools */}
      <div className="flex items-center gap-1 px-2">
        {tools.map((tool) => (
          <button
            key={tool.id}
            onClick={() => handleToolSelect(tool.id)}
            className={clsx('tool-btn', activeTool === tool.id && 'active')}
            title={tool.label}
          >
            {tool.icon}
          </button>
        ))}
      </div>

      {/* Separator */}
      <div className="w-px h-6 bg-gray-700" />

      {/* Edit actions */}
      <div className="flex items-center gap-1 px-2">
        <button className="tool-btn" title="Undo" disabled>
          <Undo2 size={18} />
        </button>
        <button className="tool-btn" title="Redo" disabled>
          <Redo2 size={18} />
        </button>
        <button
          className={clsx('tool-btn', !selection.featureId && 'opacity-50 cursor-not-allowed')}
          title="Delete selected"
          onClick={handleDelete}
          disabled={!selection.featureId}
        >
          <Trash2 size={18} />
        </button>
      </div>

      {/* Spacer */}
      <div className="flex-1" />

      {/* Room name */}
      <div className="text-sm text-gray-400">
        Room: <span className="text-white">default-operation</span>
      </div>
    </header>
  );
}
