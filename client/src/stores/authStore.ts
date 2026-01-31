import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  color: string;
  role?: string;
  status?: string;
}

export interface PendingUser {
  id: string;
  email: string;
  name: string;
  color: string;
  status: string;
  created_at: string;
}

interface AuthState {
  token: string | null;
  user: AuthUser | null;
  isLoading: boolean;
  error: string | null;
  signupMessage: string | null;

  // Actions
  login: (email: string, password: string) => Promise<boolean>;
  signup: (email: string, password: string, name: string) => Promise<boolean>;
  adminRegister: (email: string, password: string, name: string, adminSecret: string) => Promise<boolean>;
  logout: () => void;
  verifyToken: () => Promise<boolean>;
  updateProfile: (updates: { name?: string; color?: string }) => Promise<boolean>;
  clearError: () => void;

  // Admin actions
  getPendingUsers: () => Promise<PendingUser[]>;
  getAllUsers: () => Promise<AuthUser[]>;
  approveUser: (userId: string) => Promise<boolean>;
  rejectUser: (userId: string) => Promise<boolean>;
}

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:1235';

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      token: null,
      user: null,
      isLoading: false,
      error: null,
      signupMessage: null,

      login: async (email: string, password: string) => {
        set({ isLoading: true, error: null });
        try {
          const response = await fetch(`${API_URL}/api/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password }),
          });

          const data = await response.json();

          if (!response.ok) {
            set({ isLoading: false, error: data.error || 'Login failed' });
            return false;
          }

          set({
            token: data.token,
            user: data.user,
            isLoading: false,
            error: null,
          });

          console.log('[Auth] Login successful:', data.user.email);
          return true;
        } catch (error) {
          console.error('[Auth] Login error:', error);
          set({ isLoading: false, error: 'Network error. Please try again.' });
          return false;
        }
      },

      signup: async (email: string, password: string, name: string) => {
        set({ isLoading: true, error: null, signupMessage: null });
        try {
          const response = await fetch(`${API_URL}/api/auth/signup`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password, name }),
          });

          const data = await response.json();

          if (!response.ok) {
            set({ isLoading: false, error: data.error || 'Signup failed' });
            return false;
          }

          // Signup creates a pending user, so no token is returned
          set({
            isLoading: false,
            error: null,
            signupMessage: data.message || 'Registration successful. Please wait for admin approval.',
          });

          console.log('[Auth] Signup successful (pending approval):', data.user?.email);
          return true;
        } catch (error) {
          console.error('[Auth] Signup error:', error);
          set({ isLoading: false, error: 'Network error. Please try again.' });
          return false;
        }
      },

      adminRegister: async (email: string, password: string, name: string, adminSecret: string) => {
        set({ isLoading: true, error: null });
        try {
          const response = await fetch(`${API_URL}/api/auth/admin/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password, name, adminSecret }),
          });

          const data = await response.json();

          if (!response.ok) {
            set({ isLoading: false, error: data.error || 'Admin registration failed' });
            return false;
          }

          set({
            token: data.token,
            user: data.user,
            isLoading: false,
            error: null,
          });

          console.log('[Auth] Admin registered:', data.user.email);
          return true;
        } catch (error) {
          console.error('[Auth] Admin registration error:', error);
          set({ isLoading: false, error: 'Network error. Please try again.' });
          return false;
        }
      },

      logout: () => {
        set({ token: null, user: null, error: null });
        console.log('[Auth] Logged out');
      },

      verifyToken: async () => {
        const { token } = get();
        if (!token) return false;

        set({ isLoading: true });
        try {
          const response = await fetch(`${API_URL}/api/auth/verify`, {
            headers: { Authorization: `Bearer ${token}` },
          });

          if (!response.ok) {
            set({ token: null, user: null, isLoading: false });
            return false;
          }

          const data = await response.json();
          set({ user: data.user, isLoading: false });
          return true;
        } catch (error) {
          console.error('[Auth] Token verification error:', error);
          set({ isLoading: false });
          return false;
        }
      },

      updateProfile: async (updates: { name?: string; color?: string }) => {
        const { token } = get();
        if (!token) return false;

        set({ isLoading: true, error: null });
        try {
          const response = await fetch(`${API_URL}/api/auth/profile`, {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify(updates),
          });

          const data = await response.json();

          if (!response.ok) {
            set({ isLoading: false, error: data.error || 'Update failed' });
            return false;
          }

          set({
            token: data.token,
            user: data.user,
            isLoading: false,
          });

          return true;
        } catch (error) {
          console.error('[Auth] Profile update error:', error);
          set({ isLoading: false, error: 'Network error. Please try again.' });
          return false;
        }
      },

      clearError: () => set({ error: null, signupMessage: null }),

      // Admin actions
      getPendingUsers: async () => {
        const { token } = get();
        if (!token) return [];

        try {
          const response = await fetch(`${API_URL}/api/auth/admin/pending-users`, {
            headers: { Authorization: `Bearer ${token}` },
          });

          if (!response.ok) {
            return [];
          }

          const data = await response.json();
          return data.users;
        } catch (error) {
          console.error('[Auth] Get pending users error:', error);
          return [];
        }
      },

      getAllUsers: async () => {
        const { token } = get();
        if (!token) return [];

        try {
          const response = await fetch(`${API_URL}/api/auth/admin/users`, {
            headers: { Authorization: `Bearer ${token}` },
          });

          if (!response.ok) {
            return [];
          }

          const data = await response.json();
          return data.users;
        } catch (error) {
          console.error('[Auth] Get all users error:', error);
          return [];
        }
      },

      approveUser: async (userId: string) => {
        const { token } = get();
        if (!token) return false;

        try {
          const response = await fetch(`${API_URL}/api/auth/admin/approve/${userId}`, {
            method: 'POST',
            headers: { Authorization: `Bearer ${token}` },
          });

          if (!response.ok) {
            return false;
          }

          console.log('[Auth] User approved:', userId);
          return true;
        } catch (error) {
          console.error('[Auth] Approve user error:', error);
          return false;
        }
      },

      rejectUser: async (userId: string) => {
        const { token } = get();
        if (!token) return false;

        try {
          const response = await fetch(`${API_URL}/api/auth/admin/reject/${userId}`, {
            method: 'POST',
            headers: { Authorization: `Bearer ${token}` },
          });

          if (!response.ok) {
            return false;
          }

          console.log('[Auth] User rejected:', userId);
          return true;
        } catch (error) {
          console.error('[Auth] Reject user error:', error);
          return false;
        }
      },
    }),
    {
      name: 'overwatch-auth',
      partialize: (state) => ({ token: state.token, user: state.user }),
    }
  )
);
