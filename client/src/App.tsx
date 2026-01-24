import { useEffect, useState } from 'react';
import { MapContainer } from '@/components/Map/MapContainer';
import { Sidebar } from '@/components/Layout/Sidebar';
import { Toolbar } from '@/components/Layout/Toolbar';
import { StatusBar } from '@/components/Layout/StatusBar';
import { YjsProvider } from '@/lib/yjs/provider';
import { useCollaborationStore } from '@/stores/collaborationStore';

function App() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const { connect, disconnect, connectionStatus } = useCollaborationStore();

  // Initialize collaboration connection
  useEffect(() => {
    // Get room name from URL or use default
    const params = new URLSearchParams(window.location.search);
    const room = params.get('room') || 'default-operation';

    connect(room);

    return () => {
      disconnect();
    };
  }, [connect, disconnect]);

  return (
    <YjsProvider>
      <div className="h-screen w-screen flex flex-col overflow-hidden bg-slate-900">
        {/* Top Toolbar */}
        <Toolbar />

        {/* Main Content */}
        <div className="flex-1 flex overflow-hidden">
          {/* Sidebar */}
          <Sidebar isOpen={isSidebarOpen} onToggle={() => setIsSidebarOpen(!isSidebarOpen)} />

          {/* Map */}
          <main className="flex-1 relative">
            <MapContainer />
          </main>
        </div>

        {/* Status Bar */}
        <StatusBar connectionStatus={connectionStatus} />
      </div>
    </YjsProvider>
  );
}

export default App;
