import { useState, useEffect } from 'react';
import { useAuthStore, PendingUser, AuthUser } from '@/stores/authStore';
import { Shield, Users, UserCheck, UserX, Loader2, LogOut } from 'lucide-react';
import { clsx } from 'clsx';

type TabMode = 'pending' | 'all';

export function AdminDashboard() {
  const [tab, setTab] = useState<TabMode>('pending');
  const [pendingUsers, setPendingUsers] = useState<PendingUser[]>([]);
  const [allUsers, setAllUsers] = useState<AuthUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const { user, logout, getPendingUsers, getAllUsers, approveUser, rejectUser } = useAuthStore();

  const loadData = async () => {
    setIsLoading(true);
    if (tab === 'pending') {
      const users = await getPendingUsers();
      setPendingUsers(users);
    } else {
      const users = await getAllUsers();
      setAllUsers(users);
    }
    setIsLoading(false);
  };

  useEffect(() => {
    loadData();
  }, [tab]);

  const handleApprove = async (userId: string) => {
    setActionLoading(userId);
    const success = await approveUser(userId);
    if (success) {
      await loadData();
    }
    setActionLoading(null);
  };

  const handleReject = async (userId: string) => {
    setActionLoading(userId);
    const success = await rejectUser(userId);
    if (success) {
      await loadData();
    }
    setActionLoading(null);
  };

  const handleLogout = () => {
    logout();
  };

  return (
    <div
      className="min-h-screen p-6"
      style={{ backgroundColor: 'var(--color-background)' }}
    >
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div
          className="rounded-lg p-6 mb-6 glow-border"
          style={{
            backgroundColor: 'var(--color-surface)',
            border: '1px solid var(--color-border)',
          }}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div
                className="w-12 h-12 rounded-full flex items-center justify-center glow-box"
                style={{ backgroundColor: 'var(--color-accent)' }}
              >
                <Shield size={24} style={{ color: '#fff' }} />
              </div>
              <div>
                <h1
                  className="text-2xl font-bold glow-text"
                  style={{ color: 'var(--color-text-primary)' }}
                >
                  Admin Dashboard
                </h1>
                <p style={{ color: 'var(--color-text-muted)' }}>
                  Welcome, {user?.name}
                </p>
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 px-4 py-2 rounded transition-all btn-secondary"
              style={{
                backgroundColor: 'var(--color-surface-dark)',
                border: '1px solid var(--color-border)',
                color: 'var(--color-text-secondary)',
              }}
            >
              <LogOut size={18} />
              Logout
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-6">
          <button
            onClick={() => setTab('pending')}
            className={clsx(
              'flex items-center gap-2 px-4 py-2 rounded transition-all',
              tab === 'pending' ? 'btn-primary' : 'btn-secondary'
            )}
          >
            <UserCheck size={18} />
            Pending Approvals
          </button>
          <button
            onClick={() => setTab('all')}
            className={clsx(
              'flex items-center gap-2 px-4 py-2 rounded transition-all',
              tab === 'all' ? 'btn-primary' : 'btn-secondary'
            )}
          >
            <Users size={18} />
            All Users
          </button>
        </div>

        {/* Content */}
        <div
          className="rounded-lg p-6 glow-border"
          style={{
            backgroundColor: 'var(--color-surface)',
            border: '1px solid var(--color-border)',
          }}
        >
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 size={32} className="animate-spin" style={{ color: 'var(--color-accent)' }} />
            </div>
          ) : tab === 'pending' ? (
            <div>
              <h2
                className="text-lg font-semibold mb-4"
                style={{ color: 'var(--color-text-primary)' }}
              >
                Pending User Registrations
              </h2>
              {pendingUsers.length === 0 ? (
                <p style={{ color: 'var(--color-text-muted)' }}>
                  No pending registrations.
                </p>
              ) : (
                <div className="space-y-3">
                  {pendingUsers.map((pendingUser) => (
                    <div
                      key={pendingUser.id}
                      className="flex items-center justify-between p-4 rounded-lg"
                      style={{
                        backgroundColor: 'var(--color-surface-dark)',
                        border: '1px solid var(--color-border)',
                      }}
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className="w-10 h-10 rounded-full flex items-center justify-center"
                          style={{ backgroundColor: pendingUser.color }}
                        >
                          <span className="text-white font-medium">
                            {pendingUser.name.charAt(0).toUpperCase()}
                          </span>
                        </div>
                        <div>
                          <p
                            className="font-medium"
                            style={{ color: 'var(--color-text-primary)' }}
                          >
                            {pendingUser.name}
                          </p>
                          <p
                            className="text-sm"
                            style={{ color: 'var(--color-text-muted)' }}
                          >
                            {pendingUser.email}
                          </p>
                          <p
                            className="text-xs"
                            style={{ color: 'var(--color-text-muted)' }}
                          >
                            Registered: {new Date(pendingUser.created_at).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleApprove(pendingUser.id)}
                          disabled={actionLoading === pendingUser.id}
                          className={clsx(
                            'flex items-center gap-2 px-4 py-2 rounded transition-all',
                            actionLoading === pendingUser.id
                              ? 'opacity-50 cursor-not-allowed'
                              : 'hover:brightness-110'
                          )}
                          style={{
                            backgroundColor: '#22c55e',
                            color: '#fff',
                          }}
                        >
                          {actionLoading === pendingUser.id ? (
                            <Loader2 size={16} className="animate-spin" />
                          ) : (
                            <UserCheck size={16} />
                          )}
                          Approve
                        </button>
                        <button
                          onClick={() => handleReject(pendingUser.id)}
                          disabled={actionLoading === pendingUser.id}
                          className={clsx(
                            'flex items-center gap-2 px-4 py-2 rounded transition-all',
                            actionLoading === pendingUser.id
                              ? 'opacity-50 cursor-not-allowed'
                              : 'hover:brightness-110'
                          )}
                          style={{
                            backgroundColor: '#ef4444',
                            color: '#fff',
                          }}
                        >
                          {actionLoading === pendingUser.id ? (
                            <Loader2 size={16} className="animate-spin" />
                          ) : (
                            <UserX size={16} />
                          )}
                          Reject
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div>
              <h2
                className="text-lg font-semibold mb-4"
                style={{ color: 'var(--color-text-primary)' }}
              >
                All Users
              </h2>
              <div className="space-y-3">
                {allUsers.map((userData) => (
                  <div
                    key={userData.id}
                    className="flex items-center justify-between p-4 rounded-lg"
                    style={{
                      backgroundColor: 'var(--color-surface-dark)',
                      border: '1px solid var(--color-border)',
                    }}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className="w-10 h-10 rounded-full flex items-center justify-center"
                        style={{ backgroundColor: userData.color }}
                      >
                        <span className="text-white font-medium">
                          {userData.name.charAt(0).toUpperCase()}
                        </span>
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <p
                            className="font-medium"
                            style={{ color: 'var(--color-text-primary)' }}
                          >
                            {userData.name}
                          </p>
                          {userData.role === 'admin' && (
                            <span
                              className="text-xs px-2 py-0.5 rounded"
                              style={{
                                backgroundColor: 'var(--color-accent)',
                                color: '#fff',
                              }}
                            >
                              Admin
                            </span>
                          )}
                        </div>
                        <p
                          className="text-sm"
                          style={{ color: 'var(--color-text-muted)' }}
                        >
                          {userData.email}
                        </p>
                      </div>
                    </div>
                    <div>
                      <span
                        className={clsx(
                          'text-xs px-3 py-1 rounded',
                          userData.status === 'approved' && 'bg-green-500/20 text-green-500',
                          userData.status === 'pending' && 'bg-yellow-500/20 text-yellow-500',
                          userData.status === 'rejected' && 'bg-red-500/20 text-red-500'
                        )}
                      >
                        {userData.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
