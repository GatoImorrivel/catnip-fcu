import type { Theme } from '@/theme/types';

export function invalidFieldBorderColor(theme: Theme): string {
  return theme.colors.error;
}

export function invalidFieldBackgroundColor(theme: Theme): string {
  return theme.colors.background;
}
