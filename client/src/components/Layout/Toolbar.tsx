import { useEffect, useCallback } from 'react';
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
  LogOut,
} from 'lucide-react';
import { useMapStore, type DrawingTool } from '@/stores/mapStore';
import { useCollaborationStore } from '@/stores/collaborationStore';
import { useAuthStore } from '@/stores/authStore';
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
  const {
    setActiveTool: setAwarenessTool,
    ydoc,
    getAnnotations,
    undo,
    redo,
    canUndo,
    canRedo,
    roomName,
  } = useCollaborationStore();
  const { user, logout } = useAuthStore();

  const handleToolSelect = (tool: DrawingTool) => {
    setActiveTool(tool);
    setAwarenessTool(tool === 'select' ? null : tool);
  };

  const handleUndo = useCallback(() => {
    undo();
  }, [undo]);

  const handleRedo = useCallback(() => {
    redo();
  }, [redo]);

  const handleDelete = useCallback(() => {
    if (selection.featureIds.length === 0 || !ydoc) return;

    const annotations = getAnnotations();
    if (!annotations) return;

    ydoc.transact(() => {
      // Delete in reverse order to avoid index shifting issues
      const arr = annotations.toArray();
      const indicesToDelete: number[] = [];

      for (let i = 0; i < arr.length; i++) {
        if (selection.featureIds.includes(arr[i].properties?.id || '')) {
          indicesToDelete.push(i);
        }
      }

      // Sort in descending order and delete
      indicesToDelete.sort((a, b) => b - a);
      for (const index of indicesToDelete) {
        annotations.delete(index, 1);
      }

      console.log('[Toolbar] Deleted features:', selection.featureIds);
    });

    clearSelection();
  }, [selection.featureIds, ydoc, getAnnotations, clearSelection]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't handle if user is typing in an input
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }

      // Undo: Ctrl+Z / Cmd+Z
      if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        handleUndo();
        return;
      }

      // Redo: Ctrl+Shift+Z / Cmd+Shift+Z or Ctrl+Y / Cmd+Y
      if ((e.ctrlKey || e.metaKey) && (e.key === 'y' || (e.key === 'z' && e.shiftKey))) {
        e.preventDefault();
        handleRedo();
        return;
      }

      // Delete: Delete or Backspace
      if ((e.key === 'Delete' || e.key === 'Backspace') && selection.featureIds.length > 0) {
        e.preventDefault();
        handleDelete();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [selection.featureIds, handleDelete, handleUndo, handleRedo]);

  return (
    <header
      className="toolbar-container h-12 flex items-center px-4 gap-2"
      style={{
        backgroundColor: 'var(--color-surface)',
        borderBottom: '1px solid var(--color-border)',
      }}
    >
      {/* Logo */}
      <div
        className="flex items-center gap-2 pr-4"
        style={{ borderRight: '1px solid var(--color-border)' }}
      >
        <div
          className="w-8 h-8 rounded-full flex items-center justify-center glow-box"
          style={{ backgroundColor: 'var(--color-accent)' }}
        >
          <div className="w-3 h-3 rounded-full border-2 border-white" />
        </div>
        <span
          className="font-semibold glow-text"
          style={{ color: 'var(--color-text-primary)' }}
        >
          Overwatch
        </span>
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
      <div className="w-px h-6" style={{ backgroundColor: 'var(--color-border)' }} />

      {/* Edit actions */}
      <div className="flex items-center gap-1 px-2">
        <button
          className={clsx('tool-btn', !canUndo && 'opacity-50 cursor-not-allowed')}
          title="Undo (Ctrl+Z)"
          onClick={handleUndo}
          disabled={!canUndo}
        >
          <Undo2 size={18} />
        </button>
        <button
          className={clsx('tool-btn', !canRedo && 'opacity-50 cursor-not-allowed')}
          title="Redo (Ctrl+Shift+Z)"
          onClick={handleRedo}
          disabled={!canRedo}
        >
          <Redo2 size={18} />
        </button>
        <button
          className={clsx('tool-btn', selection.featureIds.length === 0 && 'opacity-50 cursor-not-allowed')}
          title={`Delete selected (Del)${selection.featureIds.length > 1 ? ` - ${selection.featureIds.length} items` : ''}`}
          onClick={handleDelete}
          disabled={selection.featureIds.length === 0}
        >
          <Trash2 size={18} />
        </button>
      </div>

      {/* Spacer */}
      <div className="flex-1" />

      {/* Room name */}
      <div
        className="text-sm pr-4"
        style={{ color: 'var(--color-text-muted)', borderRight: '1px solid var(--color-border)' }}
      >
        Room: <span style={{ color: 'var(--color-text-primary)' }}>{roomName || 'default-operation'}</span>
      </div>

      {/* User info and logout */}
      {user && (
        <div className="flex items-center gap-3 pl-4">
          <div className="flex items-center gap-2">
            <div
              className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium text-white glow-box"
              style={{ backgroundColor: user.color }}
            >
              {user.name.charAt(0).toUpperCase()}
            </div>
            <span className="text-sm" style={{ color: 'var(--color-text-primary)' }}>{user.name}</span>
          </div>
          <button
            onClick={logout}
            className="tool-btn"
            style={{ color: 'var(--color-text-muted)' }}
            title="Logout"
          >
            <LogOut size={16} />
          </button>
        </div>
      )}
    </header>
  );
}
