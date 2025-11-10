/**
 * Theme color schemes and utilities for the HsafaChat component
 */

export type Theme = 'dark' | 'light';

export type ColorScheme = {
  primaryColor: string;
  backgroundColor: string;
  borderColor: string;
  textColor: string;
  accentColor: string;
  mutedTextColor: string;
  inputBackground: string;
  cardBackground: string;
  hoverBackground: string;
};

export const themeColors: Record<Theme, ColorScheme> = {
  dark: {
    primaryColor: '#4D78FF',
    backgroundColor: '#0B0B0F',
    borderColor: '#2A2C33',
    textColor: '#EDEEF0',
    accentColor: '#17181C',
    mutedTextColor: '#9AA0A6',
    inputBackground: '#17181C',
    cardBackground: '#121318',
    hoverBackground: '#1c1e25',
  },
  light: {
    primaryColor: '#2563EB',
    backgroundColor: '#FFFFFF',
    borderColor: '#E5E7EB',
    textColor: '#111827',
    accentColor: '#F9FAFB',
    mutedTextColor: '#6B7280',
    inputBackground: '#F9FAFB',
    cardBackground: '#F3F4F6',
    hoverBackground: '#F3F4F6',
  }
};

export type ResolvedColors = ColorScheme;

export function resolveColors(
  theme: Theme,
  overrides: {
    primaryColor?: string;
    backgroundColor?: string;
    borderColor?: string;
    textColor?: string;
    accentColor?: string;
  } = {}
): ResolvedColors {
  const themeColorScheme = themeColors[theme];
  return {
    primaryColor: overrides.primaryColor || themeColorScheme.primaryColor,
    backgroundColor: overrides.backgroundColor || themeColorScheme.backgroundColor,
    borderColor: overrides.borderColor || themeColorScheme.borderColor,
    textColor: overrides.textColor || themeColorScheme.textColor,
    accentColor: overrides.accentColor || themeColorScheme.accentColor,
    mutedTextColor: themeColorScheme.mutedTextColor,
    inputBackground: themeColorScheme.inputBackground,
    cardBackground: themeColorScheme.cardBackground,
    hoverBackground: themeColorScheme.hoverBackground,
  };
}
