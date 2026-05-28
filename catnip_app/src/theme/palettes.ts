import type { Theme } from './types';

/** Replace or extend these palettes with your own design tokens. */
export const lightTheme: Theme = {
  colors: {
    background: '#ffffff',
    foreground: '#0a0a0a',
    muted: '#737373',
    border: '#e5e5e5',
    primary: '#171717',
    primaryForeground: '#fafafa',
    error: '#dc2626',
    destructive: '#dc2626',
    destructiveForeground: '#ffffff',
  },
};

export const darkTheme: Theme = {
  colors: {
    background: '#0a0a0a',
    foreground: '#fafafa',
    muted: '#a3a3a3',
    border: '#262626',
    primary: '#fafafa',
    primaryForeground: '#171717',
    error: '#f87171',
    destructive: '#ef4444',
    destructiveForeground: '#ffffff',
  },
};

export const themes = {
  light: lightTheme,
  dark: darkTheme,
} as const satisfies Record<'light' | 'dark', Theme>;
