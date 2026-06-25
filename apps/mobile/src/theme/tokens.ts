import type { TextStyle, ViewStyle } from 'react-native';

/** 4pt spacing scale. */
export const space = { xs: 4, sm: 8, md: 12, lg: 16, xl: 20, xxl: 28, xxxl: 40 } as const;

export const radius = { sm: 10, md: 14, lg: 20, xl: 26, pill: 999 } as const;

/** Type ramp — consistent weights/sizes across the app. */
export const type = {
  display: { fontSize: 30, fontWeight: '800', letterSpacing: -0.6 },
  title: { fontSize: 22, fontWeight: '700', letterSpacing: -0.3 },
  heading: { fontSize: 17, fontWeight: '700' },
  body: { fontSize: 15, fontWeight: '500' },
  bodyStrong: { fontSize: 15, fontWeight: '600' },
  caption: { fontSize: 13, fontWeight: '500' },
  label: { fontSize: 12, fontWeight: '600', letterSpacing: 0.2 },
} satisfies Record<string, TextStyle>;

/** Motion language — springs for tactile interactions, timings for slides/fades. */
export const motion = {
  spring: { damping: 18, stiffness: 220, mass: 0.7 },
  springSoft: { damping: 22, stiffness: 150, mass: 0.9 },
  springSnappy: { damping: 16, stiffness: 320, mass: 0.6 },
  duration: { fast: 150, base: 240, slow: 360 },
} as const;

export const shadow = {
  card: {
    shadowColor: '#000',
    shadowOpacity: 0.16,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 5 },
    elevation: 4,
  },
  float: {
    shadowColor: '#000',
    shadowOpacity: 0.32,
    shadowRadius: 22,
    shadowOffset: { width: 0, height: 10 },
    elevation: 12,
  },
} satisfies Record<string, ViewStyle>;
