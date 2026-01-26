import { useEffect, useState } from 'react';
import { MapContainer } from '@/components/Map/MapContainer';
import { Sidebar } from '@/components/Layout/Sidebar';
import { Toolbar } from '@/components/Layout/Toolbar';
import { StatusBar } from '@/components/Layout/StatusBar';
import { AuthScreen } from '@/components/Auth/AuthScreen';
import { YjsProvider } from '@/lib/yjs/provider';
import { useCollaborationStore } from '@/stores/collaborationStore';
import { useAuthStore } from '@/stores/authStore';

function App() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isInitializing, setIsInitializing] = useState(true);
  const connectionStatus = useCollaborationStore((state) => state.connectionStatus);
  const { user, token, verifyToken } = useAuthStore();

  // Verify token on mount
  useEffect(() => {
    const init = async () => {
      if (token) {
        await verifyToken();
      }
      setIsInitializing(false);
    };
    init();
  }, []);

  // Initialize collaboration connection when user is authenticated
  useEffect(() => {
    if (!user) return;

    // Get room name from URL or use default
    const params = new URLSearchParams(window.location.search);
    const room = params.get('room') || 'default-operation';

    // Connect with authenticated user info
    useCollaborationStore.getState().connect(room, {
      id: user.id,
      name: user.name,
      color: user.color,
    });

    return () => {
      useCollaborationStore.getState().disconnect();
    };
  }, [user]);

  // Show loading state while verifying token
  if (isInitializing) {
    return (
      <div
        className="h-screen w-screen flex items-center justify-center"
        style={{ backgroundColor: 'var(--color-background)' }}
      >
        <div className="flex flex-col items-center gap-4">
          <div
            className="w-12 h-12 border-4 border-t-transparent rounded-full animate-spin"
            style={{ borderColor: 'var(--color-accent)', borderTopColor: 'transparent' }}
          />
          <span style={{ color: 'var(--color-text-muted)' }}>Loading...</span>
        </div>
      </div>
    );
  }

  // Show auth screen if not logged in
  if (!user) {
    return <AuthScreen />;
  }

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
