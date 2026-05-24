import React, {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { useColorScheme, type ColorSchemeName } from 'react-native';

import { themes } from './palettes';
import type { ColorScheme, Theme, ThemePreference } from './types';

export interface ThemeContextValue {
  /** Active palette (resolved from preference + system). */
  theme: Theme;
  /** Resolved appearance used for styling. */
  colorScheme: ColorScheme;
  /** Current user setting (may be `system`). */
  preference: ThemePreference;
  setPreference: (preference: ThemePreference) => void;
  /** Set an explicit light/dark preference (not system). */
  setColorScheme: (scheme: ColorScheme) => void;
  /** Toggle between light and dark (sets an explicit preference). */
  toggleColorScheme: () => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

function resolveColorScheme(
  preference: ThemePreference,
  systemScheme: ColorSchemeName,
): ColorScheme {
  if (preference === 'system') {
    return systemScheme === 'dark' ? 'dark' : 'light';
  }
  return preference;
}

export interface ThemeProviderProps {
  children: ReactNode;
  /** Initial preference; defaults to following the OS. */
  initialPreference?: ThemePreference;
}

export function ThemeProvider({
  children,
  initialPreference = 'system',
}: ThemeProviderProps) {
  const systemScheme = useColorScheme();
  const [preference, setPreference] = useState<ThemePreference>(initialPreference);

  const colorScheme = useMemo(
    () => resolveColorScheme(preference, systemScheme),
    [preference, systemScheme],
  );

  const theme = themes[colorScheme];

  const setColorScheme = useCallback((scheme: ColorScheme) => {
    setPreference(scheme);
  }, []);

  const toggleColorScheme = useCallback(() => {
    setPreference((current) => {
      const resolved = resolveColorScheme(current, systemScheme);
      return resolved === 'dark' ? 'light' : 'dark';
    });
  }, [systemScheme]);

  const value = useMemo<ThemeContextValue>(
    () => ({
      theme,
      colorScheme,
      preference,
      setPreference,
      setColorScheme,
      toggleColorScheme,
    }),
    [theme, colorScheme, preference, setColorScheme, toggleColorScheme],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useThemeContext(): ThemeContextValue {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useThemeContext must be used within a ThemeProvider');
  }
  return context;
}
