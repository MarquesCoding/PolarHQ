import { GlassView, isLiquidGlassAvailable } from 'expo-glass-effect';
import { type ReactNode } from 'react';
import { Platform, View, type StyleProp, type ViewStyle } from 'react-native';

/** True when the device renders real iOS 26 Liquid Glass; else we fall back to a solid fill. */
export const liquidGlass = Platform.OS === 'ios' && isLiquidGlassAvailable();

/**
 * A Liquid-Glass surface on iOS 26, falling back to a translucent solid elsewhere. Pass `tint`
 * to colour the glass, `fallback` for the non-glass background.
 */
export function Glass({
  style,
  tint,
  fallback = 'rgba(28,28,33,0.9)',
  interactive = true,
  children,
}: {
  style?: StyleProp<ViewStyle>;
  tint?: string;
  fallback?: string;
  interactive?: boolean;
  children?: ReactNode;
}) {
  if (liquidGlass) {
    return (
      <GlassView glassEffectStyle="regular" tintColor={tint} isInteractive={interactive} style={style}>
        {children}
      </GlassView>
    );
  }
  return <View style={[style, { backgroundColor: tint ?? fallback }]}>{children}</View>;
}
