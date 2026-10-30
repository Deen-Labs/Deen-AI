import React, { createContext, useContext, useEffect, useState, useMemo } from 'react';

/**
 * Shared Theme Definitions matching Deen-AI APK (mobile-app/lib/theme.tsx)
 */
export const DARK_THEME = {
  background: '#0f1718',
  surface: '#0b2527',
  card: '#0c3033',
  cardElevated: '#123d41',
  cardTopRow: '#0b2527',
  pill: 'rgba(255, 255, 255, 0.06)',
  pillActive: '#e2a23b',
  inputBg: '#071617',
  border: 'rgba(226, 162, 59, 0.22)',
  borderSubtle: 'rgba(255, 255, 255, 0.08)',
  text: '#f3f7f6',
  textSecondary: '#d6e2e0',
  textMuted: '#94a4a2',
  accentGold: '#e2a23b',
  accentSoft: '#ffdda8',
  accentGreen: '#00ff66',
  isDark: true,
};

export const LIGHT_THEME = {
  background: '#F7F3E8',          // Warm alabaster parchment
  surface: '#EFE8D8',             // Warm sand
  card: '#FFFFFF',                // Crisp white card for high contrast
  cardElevated: '#F5EFE0',
  cardTopRow: '#F0E9DA',
  pill: 'rgba(15, 41, 42, 0.06)', // Soft contrast pill
  pillActive: '#B87914',          // Accessible amber-gold on light canvas
  inputBg: '#FFFFFF',
  border: 'rgba(15, 41, 42, 0.12)',
  borderSubtle: 'rgba(15, 41, 42, 0.08)',
  text: '#0F292A',                // Deep emerald-charcoal for crisp readability
  textSecondary: '#334E4F',
  textMuted: '#5C7475',
  accentGold: '#B87914',
  accentSoft: '#0F292A',
  accentGreen: '#059669',         // Accessible emerald green
  isDark: false,
};

const THEME_STORAGE_KEY = 'deen_theme_mode';

const ThemeContext = createContext({
  themeMode: 'dark',
  isDark: true,
  colors: DARK_THEME,
  setThemeMode: () => {},
  toggleTheme: () => {},
});

export function ThemeProvider({ children }) {
  const [themeMode, setThemeModeState] = useState(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem(THEME_STORAGE_KEY);
      if (stored === 'light' || stored === 'dark' || stored === 'system') {
        return stored;
      }
    }
    return 'dark';
  });

  const [systemIsDark, setSystemIsDark] = useState(() => {
    if (typeof window !== 'undefined' && window.matchMedia) {
      return !window.matchMedia('(prefers-color-scheme: light)').matches;
    }
    return true;
  });

  // Track OS system preference changes when in 'system' mode
  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return;
    const media = window.matchMedia('(prefers-color-scheme: light)');
    const handler = (e) => setSystemIsDark(!e.matches);
    media.addEventListener('change', handler);
    return () => media.removeEventListener('change', handler);
  }, []);

  const isDark = useMemo(() => {
    if (themeMode === 'system') return systemIsDark;
    return themeMode === 'dark';
  }, [themeMode, systemIsDark]);

  // Synchronize DOM attributes and localStorage
  useEffect(() => {
    if (typeof document === 'undefined') return;
    const root = document.documentElement;
    root.setAttribute('data-theme', isDark ? 'dark' : 'light');
    if (isDark) {
      root.classList.add('dark');
      root.classList.remove('light');
    } else {
      root.classList.add('light');
      root.classList.remove('dark');
    }
    try {
      localStorage.setItem(THEME_STORAGE_KEY, themeMode);
    } catch (e) {}
  }, [isDark, themeMode]);

  // Synchronize across multiple browser tabs
  useEffect(() => {
    const handleStorage = (e) => {
      if (e.key === THEME_STORAGE_KEY && e.newValue) {
        if (e.newValue === 'light' || e.newValue === 'dark' || e.newValue === 'system') {
          setThemeModeState(e.newValue);
        }
      }
    };
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, []);

  const setThemeMode = (mode) => {
    setThemeModeState(mode);
  };

  const toggleTheme = () => {
    setThemeModeState((prev) => (prev === 'light' ? 'dark' : 'light'));
  };

  const colors = isDark ? DARK_THEME : LIGHT_THEME;

  return (
    <ThemeContext.Provider value={{ themeMode, setThemeMode, isDark, toggleTheme, colors }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}
