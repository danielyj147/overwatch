import { ChevronLeft, ChevronRight, Layers, Users, Settings, Cloud } from 'lucide-react';
import { useState } from 'react';
import { LayerPanel } from '@/components/Sidebar/LayerPanel';
import { UsersPanel } from '@/components/Sidebar/UsersPanel';
import { WeatherPanel } from '@/components/Sidebar/WeatherPanel';
import { ThemeSelector } from '@/components/Settings/ThemeSelector';
import { clsx } from 'clsx';

interface SidebarProps {
  isOpen: boolean;
  onToggle: () => void;
}

type Tab = 'layers' | 'users' | 'weather' | 'settings';

export function Sidebar({ isOpen, onToggle }: SidebarProps) {
  const [activeTab, setActiveTab] = useState<Tab>('layers');

  return (
    <aside
      className={clsx(
        'sidebar-container relative flex flex-col border-r transition-all duration-300',
        isOpen ? 'w-72' : 'w-0'
      )}
      style={{
        backgroundColor: 'var(--color-surface)',
        borderColor: 'var(--color-border)',
      }}
    >
      {/* Toggle button */}
      <button
        onClick={onToggle}
        className="absolute -right-3 top-4 z-10 w-6 h-12 rounded-r-md flex items-center justify-center transition-colors"
        style={{
          backgroundColor: 'var(--color-surface-light)',
          borderColor: 'var(--color-border)',
          borderWidth: '1px',
          borderStyle: 'solid',
          color: 'var(--color-text-muted)',
        }}
        aria-label={isOpen ? 'Close sidebar' : 'Open sidebar'}
      >
        {isOpen ? <ChevronLeft size={16} /> : <ChevronRight size={16} />}
      </button>

      {isOpen && (
        <>
          {/* Tab navigation */}
          <div className="flex" style={{ borderBottom: '1px solid var(--color-border)' }}>
            <button
              onClick={() => setActiveTab('layers')}
              className={clsx(
                'flex-1 flex items-center justify-center gap-1 px-2 py-3 text-xs font-medium transition-colors',
              )}
              style={{
                color: activeTab === 'layers' ? 'var(--color-text-primary)' : 'var(--color-text-muted)',
                backgroundColor: activeTab === 'layers' ? 'var(--color-surface-light)' : 'transparent',
                borderBottom: activeTab === 'layers' ? '2px solid var(--color-accent)' : '2px solid transparent',
              }}
              title="Layers"
            >
              <Layers size={14} />
              <span className="hidden sm:inline">Layers</span>
            </button>
            <button
              onClick={() => setActiveTab('users')}
              className={clsx(
                'flex-1 flex items-center justify-center gap-1 px-2 py-3 text-xs font-medium transition-colors',
              )}
              style={{
                color: activeTab === 'users' ? 'var(--color-text-primary)' : 'var(--color-text-muted)',
                backgroundColor: activeTab === 'users' ? 'var(--color-surface-light)' : 'transparent',
                borderBottom: activeTab === 'users' ? '2px solid var(--color-accent)' : '2px solid transparent',
              }}
              title="Users"
            >
              <Users size={14} />
              <span className="hidden sm:inline">Users</span>
            </button>
            <button
              onClick={() => setActiveTab('weather')}
              className={clsx(
                'flex-1 flex items-center justify-center gap-1 px-2 py-3 text-xs font-medium transition-colors',
              )}
              style={{
                color: activeTab === 'weather' ? 'var(--color-text-primary)' : 'var(--color-text-muted)',
                backgroundColor: activeTab === 'weather' ? 'var(--color-surface-light)' : 'transparent',
                borderBottom: activeTab === 'weather' ? '2px solid var(--color-accent)' : '2px solid transparent',
              }}
              title="Weather"
            >
              <Cloud size={14} />
              <span className="hidden sm:inline">Weather</span>
            </button>
            <button
              onClick={() => setActiveTab('settings')}
              className={clsx(
                'flex-1 flex items-center justify-center gap-1 px-2 py-3 text-xs font-medium transition-colors',
              )}
              style={{
                color: activeTab === 'settings' ? 'var(--color-text-primary)' : 'var(--color-text-muted)',
                backgroundColor: activeTab === 'settings' ? 'var(--color-surface-light)' : 'transparent',
                borderBottom: activeTab === 'settings' ? '2px solid var(--color-accent)' : '2px solid transparent',
              }}
              title="Settings"
            >
              <Settings size={14} />
              <span className="hidden sm:inline">Settings</span>
            </button>
          </div>

          {/* Tab content */}
          <div className="flex-1 overflow-y-auto">
            {activeTab === 'layers' && <LayerPanel />}
            {activeTab === 'users' && <UsersPanel />}
            {activeTab === 'weather' && <WeatherPanel />}
            {activeTab === 'settings' && (
              <div className="p-4">
                <ThemeSelector />
              </div>
            )}
          </div>
        </>
      )}
    </aside>
  );
}
