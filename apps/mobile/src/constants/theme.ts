/**
 * Below are the colors that are used in the app. The colors are defined in the light and dark mode.
 * There are many other ways to style your app. For example, [Nativewind](https://www.nativewind.dev/), [Tamagui](https://tamagui.dev/), [unistyles](https://reactnativeunistyles.vercel.app), etc.
 */

import '@/global.css';

import { Platform } from 'react-native';

/**
 * PolarHQ palette — mirrors the web design tokens in
 * packages/ui/src/styles/globals.css (violet primary, dark-first).
 */
export const Colors = {
  light: {
    text: '#1a1a24',
    background: '#f6f5fb',
    card: '#ffffff',
    backgroundElement: '#eeedf5',
    backgroundSelected: '#e4e2f0',
    border: '#e4e2ee',
    textSecondary: '#6b6b80',
    primary: '#7c5cfc',
    primaryForeground: '#ffffff',
    destructive: '#e5484d',
  },
  dark: {
    text: '#f4f4f8',
    background: '#0b0b14',
    card: '#16161f',
    backgroundElement: '#1d1d28',
    backgroundSelected: '#23232f',
    border: '#272733',
    textSecondary: '#9a9ab4',
    primary: '#8b6cfb',
    primaryForeground: '#ffffff',
    destructive: '#fb5e7e',
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
