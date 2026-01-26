import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type ThemeId = 'dark' | 'light' | 'command-center' | 'cyberpunk' | 'tactical';

export interface Theme {
  id: ThemeId;
  name: string;
  description: string;
  colors: {
    // Base colors
    background: string;
    surface: string;
    surfaceLight: string;
    surfaceDark: string;

    // Text colors
    textPrimary: string;
    textSecondary: string;
    textMuted: string;

    // Accent colors
    accent: string;
    accentDark: string;
    accentGlow: string;

    // Status colors
    success: string;
    warning: string;
    error: string;
    info: string;

    // Border colors
    border: string;
    borderLight: string;

    // Special effects
    glow: string;
    glowIntense: string;
    scanline: string;
  };
  effects: {
    enableGlow: boolean;
    enableScanlines: boolean;
    enableAnimations: boolean;
    borderRadius: string;
    glowIntensity: number;
  };
}

export const themes: Record<ThemeId, Theme> = {
  dark: {
    id: 'dark',
    name: 'Dark',
    description: 'Default dark theme',
    colors: {
      background: '#0f172a',
      surface: '#1e293b',
      surfaceLight: '#334155',
      surfaceDark: '#0f172a',
      textPrimary: '#f8fafc',
      textSecondary: '#94a3b8',
      textMuted: '#64748b',
      accent: '#3b82f6',
      accentDark: '#2563eb',
      accentGlow: 'rgba(59, 130, 246, 0.5)',
      success: '#22c55e',
      warning: '#f59e0b',
      error: '#ef4444',
      info: '#06b6d4',
      border: '#334155',
      borderLight: '#475569',
      glow: 'rgba(59, 130, 246, 0.3)',
      glowIntense: 'rgba(59, 130, 246, 0.6)',
      scanline: 'transparent',
    },
    effects: {
      enableGlow: false,
      enableScanlines: false,
      enableAnimations: true,
      borderRadius: '0.5rem',
      glowIntensity: 0,
    },
  },

  light: {
    id: 'light',
    name: 'Light',
    description: 'Clean light theme',
    colors: {
      background: '#f8fafc',
      surface: '#ffffff',
      surfaceLight: '#f1f5f9',
      surfaceDark: '#e2e8f0',
      textPrimary: '#0f172a',
      textSecondary: '#475569',
      textMuted: '#94a3b8',
      accent: '#2563eb',
      accentDark: '#1d4ed8',
      accentGlow: 'rgba(37, 99, 235, 0.3)',
      success: '#16a34a',
      warning: '#d97706',
      error: '#dc2626',
      info: '#0891b2',
      border: '#e2e8f0',
      borderLight: '#cbd5e1',
      glow: 'rgba(37, 99, 235, 0.2)',
      glowIntense: 'rgba(37, 99, 235, 0.4)',
      scanline: 'transparent',
    },
    effects: {
      enableGlow: false,
      enableScanlines: false,
      enableAnimations: true,
      borderRadius: '0.5rem',
      glowIntensity: 0,
    },
  },

  'command-center': {
    id: 'command-center',
    name: 'Command Center',
    description: 'Futuristic spaceship control interface',
    colors: {
      background: '#000408',
      surface: '#0a0f18',
      surfaceLight: '#111927',
      surfaceDark: '#000204',
      textPrimary: '#00f0ff',
      textSecondary: '#0891b2',
      textMuted: '#155e75',
      accent: '#00f0ff',
      accentDark: '#00bcd4',
      accentGlow: 'rgba(0, 240, 255, 0.6)',
      success: '#00ff88',
      warning: '#ffaa00',
      error: '#ff3366',
      info: '#00f0ff',
      border: '#00f0ff33',
      borderLight: '#00f0ff55',
      glow: 'rgba(0, 240, 255, 0.4)',
      glowIntense: 'rgba(0, 240, 255, 0.8)',
      scanline: 'rgba(0, 240, 255, 0.03)',
    },
    effects: {
      enableGlow: true,
      enableScanlines: true,
      enableAnimations: true,
      borderRadius: '0.25rem',
      glowIntensity: 1,
    },
  },

  cyberpunk: {
    id: 'cyberpunk',
    name: 'Cyberpunk',
    description: 'Neon-lit cyber aesthetic',
    colors: {
      background: '#0d0221',
      surface: '#1a0a2e',
      surfaceLight: '#2d1b4e',
      surfaceDark: '#080112',
      textPrimary: '#ff00ff',
      textSecondary: '#bf00ff',
      textMuted: '#7c3aed',
      accent: '#ff00ff',
      accentDark: '#cc00cc',
      accentGlow: 'rgba(255, 0, 255, 0.6)',
      success: '#00ff66',
      warning: '#ffff00',
      error: '#ff0066',
      info: '#00ffff',
      border: '#ff00ff44',
      borderLight: '#ff00ff66',
      glow: 'rgba(255, 0, 255, 0.4)',
      glowIntense: 'rgba(255, 0, 255, 0.8)',
      scanline: 'rgba(255, 0, 255, 0.02)',
    },
    effects: {
      enableGlow: true,
      enableScanlines: true,
      enableAnimations: true,
      borderRadius: '0',
      glowIntensity: 1.2,
    },
  },

  tactical: {
    id: 'tactical',
    name: 'Tactical',
    description: 'Military operations theme',
    colors: {
      background: '#0a0c0a',
      surface: '#121612',
      surfaceLight: '#1c211c',
      surfaceDark: '#060806',
      textPrimary: '#39ff14',
      textSecondary: '#2eb810',
      textMuted: '#1e7a0e',
      accent: '#39ff14',
      accentDark: '#2eb810',
      accentGlow: 'rgba(57, 255, 20, 0.5)',
      success: '#39ff14',
      warning: '#ffcc00',
      error: '#ff3333',
      info: '#39ff14',
      border: '#39ff1433',
      borderLight: '#39ff1455',
      glow: 'rgba(57, 255, 20, 0.3)',
      glowIntense: 'rgba(57, 255, 20, 0.7)',
      scanline: 'rgba(57, 255, 20, 0.02)',
    },
    effects: {
      enableGlow: true,
      enableScanlines: true,
      enableAnimations: true,
      borderRadius: '0',
      glowIntensity: 0.8,
    },
  },
};

interface ThemeState {
  currentTheme: ThemeId;
  setTheme: (theme: ThemeId) => void;
  getTheme: () => Theme;
}

export const useThemeStore = create<ThemeState>()(
  persist(
    (set, get) => ({
      currentTheme: 'dark',

      setTheme: (themeId: ThemeId) => {
        set({ currentTheme: themeId });
        applyTheme(themes[themeId]);
      },

      getTheme: () => themes[get().currentTheme],
    }),
    {
      name: 'overwatch-theme',
      onRehydrateStorage: () => (state) => {
        if (state) {
          applyTheme(themes[state.currentTheme]);
        }
      },
    }
  )
);

// Apply theme CSS variables to document
function applyTheme(theme: Theme) {
  const root = document.documentElement;
  const { colors, effects } = theme;

  // Set CSS variables
  root.style.setProperty('--color-background', colors.background);
  root.style.setProperty('--color-surface', colors.surface);
  root.style.setProperty('--color-surface-light', colors.surfaceLight);
  root.style.setProperty('--color-surface-dark', colors.surfaceDark);
  root.style.setProperty('--color-text-primary', colors.textPrimary);
  root.style.setProperty('--color-text-secondary', colors.textSecondary);
  root.style.setProperty('--color-text-muted', colors.textMuted);
  root.style.setProperty('--color-accent', colors.accent);
  root.style.setProperty('--color-accent-dark', colors.accentDark);
  root.style.setProperty('--color-accent-glow', colors.accentGlow);
  root.style.setProperty('--color-success', colors.success);
  root.style.setProperty('--color-warning', colors.warning);
  root.style.setProperty('--color-error', colors.error);
  root.style.setProperty('--color-info', colors.info);
  root.style.setProperty('--color-border', colors.border);
  root.style.setProperty('--color-border-light', colors.borderLight);
  root.style.setProperty('--color-glow', colors.glow);
  root.style.setProperty('--color-glow-intense', colors.glowIntense);
  root.style.setProperty('--color-scanline', colors.scanline);
  root.style.setProperty('--border-radius', effects.borderRadius);
  root.style.setProperty('--glow-intensity', effects.glowIntensity.toString());

  // Set effect classes on body
  document.body.classList.toggle('theme-glow', effects.enableGlow);
  document.body.classList.toggle('theme-scanlines', effects.enableScanlines);
  document.body.classList.toggle('theme-animations', effects.enableAnimations);

  // Set theme ID as data attribute
  document.body.setAttribute('data-theme', theme.id);
}

// Initialize theme on load
if (typeof window !== 'undefined') {
  const stored = localStorage.getItem('overwatch-theme');
  if (stored) {
    try {
      const { state } = JSON.parse(stored);
      if (state?.currentTheme && themes[state.currentTheme as ThemeId]) {
        applyTheme(themes[state.currentTheme as ThemeId]);
      }
    } catch {
      applyTheme(themes.dark);
    }
  } else {
    applyTheme(themes.dark);
  }
}
