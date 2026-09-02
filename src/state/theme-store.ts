import { create } from 'zustand';

export type ThemePreference = 'system' | 'light' | 'dark';
export type ResolvedTheme = 'light' | 'dark';

export const THEME_STORAGE_KEY = 'seqcraft-theme';

export function isThemePreference(value: unknown): value is ThemePreference {
  return value === 'system' || value === 'light' || value === 'dark';
}

function readStoredThemePreference(): ThemePreference {
  if (typeof window === 'undefined') return 'system';

  try {
    const stored = window.localStorage.getItem(THEME_STORAGE_KEY);
    return isThemePreference(stored) ? stored : 'system';
  } catch {
    return 'system';
  }
}

function systemPrefersDark(): boolean {
  return typeof window !== 'undefined'
    && typeof window.matchMedia === 'function'
    && window.matchMedia('(prefers-color-scheme: dark)').matches;
}

export function resolveThemePreference(
  preference: ThemePreference,
  prefersDark = systemPrefersDark(),
): ResolvedTheme {
  if (preference === 'system') return prefersDark ? 'dark' : 'light';
  return preference;
}

export function applyThemePreference(preference: ThemePreference): ResolvedTheme {
  const resolvedTheme = resolveThemePreference(preference);

  if (typeof document !== 'undefined') {
    document.documentElement.dataset.theme = resolvedTheme;
    document.documentElement.dataset.themePreference = preference;
    document.documentElement.style.colorScheme = resolvedTheme;
  }

  return resolvedTheme;
}

interface ThemeState {
  preference: ThemePreference;
  setPreference: (preference: ThemePreference) => void;
}

export const useThemeStore = create<ThemeState>((set) => ({
  preference: readStoredThemePreference(),
  setPreference: (preference) => {
    try {
      window.localStorage.setItem(THEME_STORAGE_KEY, preference);
    } catch {
      // Theme selection should still work when storage is unavailable.
    }

    applyThemePreference(preference);
    set({ preference });
  },
}));
