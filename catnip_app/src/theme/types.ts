export type ColorScheme = 'light' | 'dark';

/** User-facing setting: fixed light/dark, or follow the OS. */
export type ThemePreference = ColorScheme | 'system';

export interface ThemeColors {
  background: string;
  foreground: string;
  muted: string;
  border: string;
  primary: string;
  primaryForeground: string;
}

export interface Theme {
  colors: ThemeColors;
}
