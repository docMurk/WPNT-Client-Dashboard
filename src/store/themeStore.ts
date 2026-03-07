import { create } from 'zustand';

export type ThemeId = 'default' | 'dark' | 'minimal' | 'corporate';

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

export const useThemeStore = create<ThemeState>((set) => ({
  theme: (localStorage.getItem(STORAGE_KEY) as ThemeId) || 'default',
  setTheme: (theme) => {
    localStorage.setItem(STORAGE_KEY, theme);
    applyTheme(theme);
    set({ theme });
  },
}));
