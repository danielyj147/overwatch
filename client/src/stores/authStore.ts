import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  color: string;
}

interface AuthState {
  token: string | null;
  user: AuthUser | null;
  isLoading: boolean;
  error: string | null;

  // Actions
  login: (email: string, password: string) => Promise<boolean>;
  signup: (email: string, password: string, name: string) => Promise<boolean>;
  logout: () => void;
  verifyToken: () => Promise<boolean>;
  updateProfile: (updates: { name?: string; color?: string }) => Promise<boolean>;
  clearError: () => void;
}

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:1235';

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      token: null,
      user: null,
      isLoading: false,
      error: null,

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
        set({ isLoading: true, error: null });
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

          set({
            token: data.token,
            user: data.user,
            isLoading: false,
            error: null,
          });

          console.log('[Auth] Signup successful:', data.user.email);
          return true;
        } catch (error) {
          console.error('[Auth] Signup error:', error);
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

      clearError: () => set({ error: null }),
    }),
    {
      name: 'overwatch-auth',
      partialize: (state) => ({ token: state.token, user: state.user }),
    }
  )
);
