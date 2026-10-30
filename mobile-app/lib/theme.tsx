import React, { createContext, useContext, useEffect, useState, useMemo } from 'react';
import { useColorScheme as useDeviceColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

export type ThemeMode = 'dark' | 'light' | 'system';

export interface ThemeColors {
  background: string;
  surface: string;
  card: string;
  cardElevated: string;
  cardTopRow: string;
  pill: string;
  pillActive: string;
  inputBg: string;
  border: string;
  borderDashed: string;
  borderSubtle: string;
  text: string;
  textSecondary: string;
  textMuted: string;
  accentGold: string;
  accentGoldBg: string;
  accentSoft: string;
  accentGreen: string;
  accentEmerald: string;
  statusBar: 'light' | 'dark';
  isDark: boolean;
}

export const DARK_THEME: ThemeColors = {
  background: '#0f1718',
  surface: '#0b2527',
  card: '#0c3033',
  cardElevated: '#123d41',
  cardTopRow: '#0b2527',
  pill: 'rgba(255, 255, 255, 0.06)',
  pillActive: '#e2a23b',
  inputBg: '#071617',
  border: 'rgba(226, 162, 59, 0.22)',
  borderDashed: 'rgba(226, 162, 59, 0.2)',
  borderSubtle: 'rgba(255, 255, 255, 0.08)',
  text: '#f3f7f6',
  textSecondary: '#d6e2e0',
  textMuted: '#94a4a2',
  accentGold: '#e2a23b',
  accentGoldBg: '#e2a23b',
  accentSoft: '#ffdda8',
  accentGreen: '#00ff66',
  accentEmerald: '#00ff66',
  statusBar: 'light',
  isDark: true,
};

export const LIGHT_THEME: ThemeColors = {
  background: '#F7F3E8',          // Warm alabaster parchment
  surface: '#EFE8D8',             // Warm sand
  card: '#FFFFFF',                // Crisp white card for high contrast
  cardElevated: '#F5EFE0',
  cardTopRow: '#F0E9DA',
  pill: 'rgba(15, 41, 42, 0.06)', // Soft contrast pill
  pillActive: '#B87914',
  inputBg: '#FFFFFF',
  border: 'rgba(15, 41, 42, 0.12)',
  borderDashed: 'rgba(15, 41, 42, 0.15)',
  borderSubtle: 'rgba(15, 41, 42, 0.08)',
  text: '#0F292A',                // Deep emerald-charcoal for crisp readability
  textSecondary: '#334E4F',
  textMuted: '#5C7475',
  accentGold: '#B87914',          // Accessible amber-gold on light canvas
  accentGoldBg: '#e2a23b',        // Primary CTA gold button background
  accentSoft: '#0F292A',          // Replaces pale headings on light cards
  accentGreen: '#059669',         // Accessible emerald green
  accentEmerald: '#059669',
  statusBar: 'dark',
  isDark: false,
};

interface ThemeContextType {
  themeMode: ThemeMode;
  isDark: boolean;
  colors: ThemeColors;
  setThemeMode: (mode: ThemeMode) => Promise<void>;
  toggleTheme: () => Promise<void>;
}

const THEME_STORAGE_KEY = '@deen_ai_theme_mode';

const ThemeContext = createContext<ThemeContextType>({
  themeMode: 'dark',
  isDark: true,
  colors: DARK_THEME,
  setThemeMode: async () => {},
  toggleTheme: async () => {},
});

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const deviceColorScheme = useDeviceColorScheme();
  const [themeMode, setThemeModeState] = useState<ThemeMode>('dark');

  useEffect(() => {
    AsyncStorage.getItem(THEME_STORAGE_KEY).then((stored) => {
      if (stored === 'light' || stored === 'dark' || stored === 'system') {
        setThemeModeState(stored);
      }
    }).catch(() => {});
  }, []);

  const setThemeMode = async (mode: ThemeMode) => {
    setThemeModeState(mode);
    try {
      await AsyncStorage.setItem(THEME_STORAGE_KEY, mode);
    } catch (e) {
      console.warn('Failed to persist themeMode:', e);
    }
  };

  const toggleTheme = async () => {
    const nextMode = isDark ? 'light' : 'dark';
    await setThemeMode(nextMode);
  };

  const isDark = useMemo(() => {
    if (themeMode === 'system') {
      return deviceColorScheme !== 'light';
    }
    return themeMode === 'dark';
  }, [themeMode, deviceColorScheme]);

  const colors = useMemo(() => {
    return isDark ? DARK_THEME : LIGHT_THEME;
  }, [isDark]);

  return (
    <ThemeContext.Provider
      value={{
        themeMode,
        isDark,
        colors,
        setThemeMode,
        toggleTheme,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => useContext(ThemeContext);
