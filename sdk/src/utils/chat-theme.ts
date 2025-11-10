// Theme color schemes
export const themeColors = {
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

export type ThemeColors = typeof themeColors.dark;

export interface ThemeProps {
  theme?: 'light' | 'dark';
  primaryColor?: string;
  backgroundColor?: string;
  borderColor?: string;
  textColor?: string;
  accentColor?: string;
}

export function resolveThemeColors(
  theme: 'light' | 'dark',
  overrides: Omit<ThemeProps, 'theme'> = {}
): ThemeColors {
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

export function createContainerStyles(
  resolvedColors: ThemeColors,
  height: string,
  dir: string
) {
  return {
    backgroundColor: resolvedColors.backgroundColor,
    color: resolvedColors.textColor,
    height,
    display: 'flex',
    width: '100%',
    fontFamily: 'Rubik, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, "Noto Sans", sans-serif'
  };
}

export function createChatPanelStyles(width: number | string, maxWidth: number | string) {
  return {
    width: typeof width === 'number' ? `${width}px` : width,
    maxWidth: typeof maxWidth === 'number' ? `${maxWidth}px` : maxWidth,
    display: 'flex',
    flexDirection: 'column' as const,
    transition: 'all 0.3s ease-out',
    overflow: 'hidden'
  };
}

export function createFloatingButtonStyles(
  floatingButtonPosition: {
    bottom?: number | string;
    top?: number | string;
    left?: number | string;
    right?: number | string;
  }
) {
  return {
    position: 'fixed' as const,
    bottom: typeof floatingButtonPosition.bottom === 'number' ? `${floatingButtonPosition.bottom}px` : floatingButtonPosition.bottom,
    right: floatingButtonPosition.right ? (typeof floatingButtonPosition.right === 'number' ? `${floatingButtonPosition.right}px` : floatingButtonPosition.right) : undefined,
    top: floatingButtonPosition.top ? (typeof floatingButtonPosition.top === 'number' ? `${floatingButtonPosition.top}px` : floatingButtonPosition.top) : undefined,
    left: floatingButtonPosition.left ? (typeof floatingButtonPosition.left === 'number' ? `${floatingButtonPosition.left}px` : floatingButtonPosition.left) : undefined,
    zIndex: 1000
  };
}
