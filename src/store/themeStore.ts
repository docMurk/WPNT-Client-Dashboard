import { create } from 'zustand';

export type ThemeId = 'default' | 'dark' | 'minimal' | 'original';

const STORAGE_KEY = 'wpnt-theme';

interface ThemeState {
  theme: ThemeId;
  setTheme: (theme: ThemeId) => void;
}

function applyTheme(theme: ThemeId) {
  if (theme === 'default') {
    document.documentElement.removeAttribute('data-theme');
  } else {
    document.documentElement.setAttribute('data-theme', theme);
  }
}

function migrateTheme(): ThemeId {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored === 'corporate') {
    localStorage.setItem(STORAGE_KEY, 'default');
    return 'default';
  }
  return (stored as ThemeId) || 'default';
}

export const useThemeStore = create<ThemeState>((set) => ({
  theme: migrateTheme(),
  setTheme: (theme) => {
    localStorage.setItem(STORAGE_KEY, theme);
    applyTheme(theme);
    set({ theme });
  },
}));
