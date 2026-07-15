/**
 * Avareno design tokens, ported from frontend/src/styles.css (--av-* variables).
 * Dark is the primary appearance; light mirrors the web light theme.
 */

import '@/global.css';

import { Platform } from 'react-native';

export const Colors = {
  light: {
    text: '#18201D',
    background: '#F5F7F5',
    backgroundElement: '#FFFFFF',
    backgroundSelected: '#EEF3F0',
    textSecondary: '#42504A',
    textMuted: '#67736D',
    accent: '#208D5D',
    accentBg: 'rgba(32,141,93,0.10)',
    border: 'rgba(12,24,20,0.10)',
    borderMedium: 'rgba(12,24,20,0.16)',
    inputBg: '#F8FAF9',
    inputBorder: 'rgba(12,24,20,0.13)',
    buttonPrimaryBg: '#123E32',
    buttonPrimaryText: '#FFFFFF',
    danger: '#B42318',
    dangerBg: 'rgba(180,35,24,0.09)',
    warning: '#9A6500',
    success: '#208D5D',
  },
  dark: {
    text: '#F2F5F3',
    background: '#080A09',
    backgroundElement: '#171B18',
    backgroundSelected: '#1D231F',
    textSecondary: '#AEB6B0',
    textMuted: '#8B938D',
    accent: '#3ECF8E',
    accentBg: 'rgba(62,207,142,0.12)',
    border: '#242B27',
    borderMedium: '#313A34',
    inputBg: 'rgba(255,255,255,0.04)',
    inputBorder: '#2A332D',
    buttonPrimaryBg: 'rgba(62,207,142,0.14)',
    buttonPrimaryText: '#F2F5F3',
    danger: '#EF7D7D',
    dangerBg: 'rgba(239,125,125,0.10)',
    warning: '#E8C56E',
    success: '#3ECF8E',
  },
} as const;

export type ThemeColor = keyof typeof Colors.light & keyof typeof Colors.dark;

export const Fonts = Platform.select({
  ios: {
    /** iOS `UIFontDescriptorSystemDesignDefault` */
    sans: 'system-ui',
    /** iOS `UIFontDescriptorSystemDesignSerif` */
    serif: 'ui-serif',
    /** iOS `UIFontDescriptorSystemDesignRounded` */
    rounded: 'ui-rounded',
    /** iOS `UIFontDescriptorSystemDesignMonospaced` */
    mono: 'ui-monospace',
  },
  default: {
    sans: 'normal',
    serif: 'serif',
    rounded: 'normal',
    mono: 'monospace',
  },
  web: {
    sans: 'var(--font-display)',
    serif: 'var(--font-serif)',
    rounded: 'var(--font-rounded)',
    mono: 'var(--font-mono)',
  },
});

export const Spacing = {
  half: 2,
  one: 4,
  two: 8,
  three: 16,
  four: 24,
  five: 32,
  six: 64,
} as const;

export const BottomTabInset = Platform.select({ ios: 50, android: 80 }) ?? 0;
export const MaxContentWidth = 800;
