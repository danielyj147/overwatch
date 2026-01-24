/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // NATO APP-6 standard colors for unit affiliation
        friendly: {
          DEFAULT: '#4A90D9',
          light: '#80B3E6',
          dark: '#2E6BB3',
        },
        hostile: {
          DEFAULT: '#FF6B6B',
          light: '#FF9999',
          dark: '#CC4444',
        },
        neutral: {
          DEFAULT: '#4CAF50',
          light: '#81C784',
          dark: '#388E3C',
        },
        unknown: {
          DEFAULT: '#FFD54F',
          light: '#FFE082',
          dark: '#FFC107',
        },
        // UI colors
        surface: {
          DEFAULT: '#1E1E2E',
          light: '#2A2A3E',
          dark: '#15151F',
        },
        accent: {
          DEFAULT: '#4A90D9',
          light: '#80B3E6',
          dark: '#2E6BB3',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'Consolas', 'monospace'],
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'spin-slow': 'spin 2s linear infinite',
      },
      boxShadow: {
        'glow': '0 0 15px rgba(74, 144, 217, 0.5)',
        'glow-hostile': '0 0 15px rgba(255, 107, 107, 0.5)',
      },
    },
  },
  plugins: [],
}
