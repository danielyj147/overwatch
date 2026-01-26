import { useThemeStore, themes, type ThemeId } from '@/stores/themeStore';
import { Palette, Check, Sparkles } from 'lucide-react';
import { clsx } from 'clsx';

export function ThemeSelector() {
  const { currentTheme, setTheme } = useThemeStore();

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 text-sm font-medium text-[var(--color-text-primary)]">
        <Palette size={16} />
        <span>Theme</span>
      </div>

      <div className="grid grid-cols-1 gap-2">
        {(Object.keys(themes) as ThemeId[]).map((themeId) => {
          const theme = themes[themeId];
          const isActive = currentTheme === themeId;
          const isSpecial = theme.effects.enableGlow;

          return (
            <button
              key={themeId}
              onClick={() => setTheme(themeId)}
              className={clsx(
                'relative flex items-center gap-3 p-3 rounded-lg border transition-all text-left',
                isActive
                  ? 'border-[var(--color-accent)] bg-[var(--color-accent)]/10'
                  : 'border-[var(--color-border)] hover:border-[var(--color-border-light)] hover:bg-[var(--color-surface-light)]'
              )}
            >
              {/* Color preview */}
              <div className="flex gap-1">
                <div
                  className="w-4 h-4 rounded-full"
                  style={{ backgroundColor: theme.colors.accent }}
                />
                <div
                  className="w-4 h-4 rounded-full"
                  style={{ backgroundColor: theme.colors.background }}
                />
                <div
                  className="w-4 h-4 rounded-full"
                  style={{ backgroundColor: theme.colors.textPrimary }}
                />
              </div>

              {/* Theme info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-[var(--color-text-primary)]">
                    {theme.name}
                  </span>
                  {isSpecial && (
                    <Sparkles size={12} className="text-[var(--color-accent)]" />
                  )}
                </div>
                <p className="text-xs text-[var(--color-text-muted)] truncate">
                  {theme.description}
                </p>
              </div>

              {/* Active indicator */}
              {isActive && (
                <div className="flex-shrink-0">
                  <Check size={16} className="text-[var(--color-accent)]" />
                </div>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
