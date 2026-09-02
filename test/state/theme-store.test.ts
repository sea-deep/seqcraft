import { beforeEach, describe, expect, it } from 'vitest';
import {
  applyThemePreference,
  resolveThemePreference,
  THEME_STORAGE_KEY,
  useThemeStore,
} from '../../src/state/theme-store';

describe('theme preference', () => {
  const storedValues = new Map<string, string>();
  const storage: Storage = {
    get length() {
      return storedValues.size;
    },
    clear: () => storedValues.clear(),
    getItem: (key) => storedValues.get(key) ?? null,
    key: (index) => [...storedValues.keys()][index] ?? null,
    removeItem: (key) => storedValues.delete(key),
    setItem: (key, value) => storedValues.set(key, value),
  };

  beforeEach(() => {
    Object.defineProperty(window, 'localStorage', {
      configurable: true,
      value: storage,
    });
    storage.clear();
    document.documentElement.removeAttribute('data-theme');
    document.documentElement.removeAttribute('data-theme-preference');
    document.documentElement.style.removeProperty('color-scheme');
    useThemeStore.setState({ preference: 'system' });
  });

  it('resolves explicit and system preferences deterministically', () => {
    expect(resolveThemePreference('light', true)).toBe('light');
    expect(resolveThemePreference('dark', false)).toBe('dark');
    expect(resolveThemePreference('system', false)).toBe('light');
    expect(resolveThemePreference('system', true)).toBe('dark');
  });

  it('applies the resolved theme to the document root', () => {
    expect(applyThemePreference('dark')).toBe('dark');
    expect(document.documentElement.dataset.theme).toBe('dark');
    expect(document.documentElement.dataset.themePreference).toBe('dark');
    expect(document.documentElement.style.colorScheme).toBe('dark');
  });

  it('persists user selection through the theme store', () => {
    useThemeStore.getState().setPreference('light');

    expect(useThemeStore.getState().preference).toBe('light');
    expect(storage.getItem(THEME_STORAGE_KEY)).toBe('light');
    expect(document.documentElement.dataset.theme).toBe('light');
  });
});
