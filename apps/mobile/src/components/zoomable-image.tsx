import { Image } from 'expo-image';
import * as Haptics from 'expo-haptics';
import { useState } from 'react';
import { StyleSheet } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  clamp,
  runOnJS,
  type SharedValue,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';

import { motion } from '@/theme/tokens';

const MAX_SCALE = 4;
const DOUBLE_TAP_SCALE = 2.5;

/**
 * A pinch/double-tap zoomable, pan-when-zoomed image with drag-to-dismiss when at 1×. Reports its
 * zoom state up so the pager can disable swiping (and the chrome can hide) while zoomed. `backdrop`
 * is the shared value driving the viewer's black backdrop + chrome opacity during a dismiss drag.
 */
export function ZoomableImage({
  uri,
  width,
  height,
  backdrop,
  onDismiss,
  onZoomChange,
}: {
  uri: string;
  width: number;
  height: number;
  backdrop: SharedValue<number>;
  onDismiss: () => void;
  onZoomChange: (zoomed: boolean) => void;
}) {
  const scale = useSharedValue(1);
  const savedScale = useSharedValue(1);
  const tx = useSharedValue(0);
  const ty = useSharedValue(0);
  const savedTx = useSharedValue(0);
  const savedTy = useSharedValue(0);
  const dragY = useSharedValue(0);
  const dragScale = useSharedValue(1);
  const [active, setActive] = useState(false);

  const changeZoom = (z: boolean) => {
    setActive(z);
    onZoomChange(z);
  };

  const reset = () => {
    'worklet';
    scale.value = withSpring(1, motion.springSoft);
    savedScale.value = 1;
    tx.value = withSpring(0, motion.springSoft);
    ty.value = withSpring(0, motion.springSoft);
    savedTx.value = 0;
    savedTy.value = 0;
  };

  const clampToBounds = () => {
    'worklet';
    const maxX = (width * (scale.value - 1)) / 2;
    const maxY = (height * (scale.value - 1)) / 2;
    const cx = clamp(tx.value, -maxX, maxX);
    const cy = clamp(ty.value, -maxY, maxY);
    tx.value = withSpring(cx, motion.springSoft);
    ty.value = withSpring(cy, motion.springSoft);
    savedTx.value = cx;
    savedTy.value = cy;
  };

  const pinch = Gesture.Pinch()
    .onUpdate((e) => {
      scale.value = clamp(savedScale.value * e.scale, 0.85, MAX_SCALE);
    })
    .onEnd(() => {
      if (scale.value <= 1) {
        reset();
        runOnJS(changeZoom)(false);
      } else {
        savedScale.value = scale.value;
        clampToBounds();
        runOnJS(changeZoom)(true);
      }
    });

  // When zoomed, the pan moves the image (claims any direction). When not zoomed it only claims
  // vertical drags (dismiss) and fails horizontal ones so the pager can swipe between photos.
  const pan = Gesture.Pan()
    .maxPointers(1)
    .activeOffsetX(active ? [-5, 5] : [-9999, 9999])
    .activeOffsetY(active ? [-5, 5] : [-14, 14])
    .failOffsetX(active ? [-9999, 9999] : [-16, 16])
    .onUpdate((e) => {
      if (savedScale.value > 1) {
        tx.value = savedTx.value + e.translationX;
        ty.value = savedTy.value + e.translationY;
      } else {
        dragY.value = e.translationY;
        dragScale.value = 1 - clamp(Math.abs(e.translationY) / 500, 0, 1) * 0.18;
        backdrop.value = 1 - clamp(Math.abs(e.translationY) / 360, 0, 0.9);
      }
    })
    .onEnd((e) => {
      if (savedScale.value > 1) {
        clampToBounds();
      } else if (e.translationY > 130 || e.velocityY > 900) {
        runOnJS(onDismiss)();
      } else {
        dragY.value = withSpring(0, motion.spring);
        dragScale.value = withSpring(1, motion.spring);
        backdrop.value = withSpring(1, motion.spring);
      }
    });

  const doubleTap = Gesture.Tap()
    .numberOfTaps(2)
    .maxDuration(260)
    .onEnd(() => {
      if (savedScale.value > 1) {
        reset();
        runOnJS(changeZoom)(false);
      } else {
        scale.value = withSpring(DOUBLE_TAP_SCALE, motion.springSoft);
        savedScale.value = DOUBLE_TAP_SCALE;
        runOnJS(Haptics.selectionAsync)();
        runOnJS(changeZoom)(true);
      }
    });

  const gesture = Gesture.Exclusive(doubleTap, Gesture.Simultaneous(pinch, pan));

  const imageStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: tx.value },
      { translateY: ty.value + dragY.value },
      { scale: scale.value * dragScale.value },
    ],
  }));

  return (
    <GestureDetector gesture={gesture}>
      <Animated.View style={[styles.page, { width, height }]}>
        <Animated.View style={imageStyle}>
          <Image source={{ uri }} style={{ width, height }} contentFit="contain" recyclingKey={uri} />
        </Animated.View>
      </Animated.View>
    </GestureDetector>
  );
}

const styles = StyleSheet.create({
  page: { alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
});
