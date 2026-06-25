import * as Haptics from 'expo-haptics';
import { type ReactNode } from 'react';
import { Pressable, type PressableProps, type StyleProp, type ViewStyle } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';

import { motion } from '@/theme/tokens';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

type HapticKind = 'light' | 'medium' | 'selection' | 'none';

interface TappableProps extends Omit<PressableProps, 'style' | 'children'> {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  /** How far to scale down while pressed. */
  scaleTo?: number;
  haptic?: HapticKind;
}

const fire = (kind: HapticKind) => {
  if (kind === 'none') return;
  if (kind === 'selection') void Haptics.selectionAsync();
  else
    void Haptics.impactAsync(
      kind === 'medium' ? Haptics.ImpactFeedbackStyle.Medium : Haptics.ImpactFeedbackStyle.Light,
    );
};

/** Tappable surface with a spring press-scale + haptic — the base interaction for the whole app. */
export function Tappable({ children, style, scaleTo = 0.95, haptic = 'light', onPress, ...rest }: TappableProps) {
  const scale = useSharedValue(1);
  const animatedStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  return (
    <AnimatedPressable
      onPressIn={() => {
        scale.value = withSpring(scaleTo, motion.springSnappy);
      }}
      onPressOut={() => {
        scale.value = withSpring(1, motion.spring);
      }}
      onPress={(e) => {
        fire(haptic);
        onPress?.(e);
      }}
      style={[animatedStyle, style]}
      {...rest}
    >
      {children}
    </AnimatedPressable>
  );
}
