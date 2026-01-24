import { ChevronLeft, ChevronRight, Layers, Users } from 'lucide-react';
import { useState } from 'react';
import { LayerPanel } from '@/components/Sidebar/LayerPanel';
import { UsersPanel } from '@/components/Sidebar/UsersPanel';
import { clsx } from 'clsx';

interface SidebarProps {
  isOpen: boolean;
  onToggle: () => void;
}

type Tab = 'layers' | 'users';

export function Sidebar({ isOpen, onToggle }: SidebarProps) {
  const [activeTab, setActiveTab] = useState<Tab>('layers');

  return (
    <aside
      className={clsx(
        'relative flex flex-col bg-surface border-r border-gray-700 transition-all duration-300',
        isOpen ? 'w-72' : 'w-0'
      )}
    >
      {/* Toggle button */}
      <button
        onClick={onToggle}
        className="absolute -right-3 top-4 z-10 w-6 h-12 bg-surface-light border border-gray-700 rounded-r-md flex items-center justify-center text-gray-400 hover:text-white hover:bg-surface transition-colors"
        aria-label={isOpen ? 'Close sidebar' : 'Open sidebar'}
      >
        {isOpen ? <ChevronLeft size={16} /> : <ChevronRight size={16} />}
      </button>

      {isOpen && (
        <>
          {/* Tab navigation */}
          <div className="flex border-b border-gray-700">
            <button
              onClick={() => setActiveTab('layers')}
              className={clsx(
                'flex-1 flex items-center justify-center gap-2 px-4 py-3 text-sm font-medium transition-colors',
                activeTab === 'layers'
                  ? 'text-white bg-surface-light border-b-2 border-accent'
                  : 'text-gray-400 hover:text-white hover:bg-surface-light'
              )}
            >
              <Layers size={16} />
              Layers
            </button>
            <button
              onClick={() => setActiveTab('users')}
              className={clsx(
                'flex-1 flex items-center justify-center gap-2 px-4 py-3 text-sm font-medium transition-colors',
                activeTab === 'users'
                  ? 'text-white bg-surface-light border-b-2 border-accent'
                  : 'text-gray-400 hover:text-white hover:bg-surface-light'
              )}
            >
              <Users size={16} />
              Users
            </button>
          </div>

          {/* Tab content */}
          <div className="flex-1 overflow-y-auto">
            {activeTab === 'layers' && <LayerPanel />}
            {activeTab === 'users' && <UsersPanel />}
          </div>
        </>
      )}
    </aside>
  );
}
