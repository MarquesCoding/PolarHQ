import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import * as Haptics from 'expo-haptics';
import { Image } from 'expo-image';
import { router, useLocalSearchParams } from 'expo-router';
import { useVideoPlayer, VideoView } from 'expo-video';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
  Pressable,
  StyleSheet,
  useWindowDimensions,
  View,
} from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  clamp,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

import {
  favoriteAssets,
  fetchOriginalFile,
  fetchOriginalUri,
  trashAssets,
  type GridAsset,
} from '@/lib/photos';
import { queryClient } from '@/lib/query';
import { motion } from '@/theme/tokens';

type Kind = 'image' | 'video' | 'audio';
interface Item {
  id: string;
  encrypted: boolean;
  mime: string;
  type: Kind;
  favorite: boolean;
}

function ImagePage({ item, width, height }: { item: Item; width: number; height: number }) {
  const { data: uri } = useQuery({
    queryKey: ['original', item.id],
    queryFn: () => fetchOriginalUri(item.id, item.encrypted, item.mime),
    staleTime: 5 * 60 * 1000,
  });
  const thumb = queryClient.getQueryData<string | null>(['thumb', item.id]);
  const source = uri ?? thumb ?? undefined;
  return (
    <View style={[styles.page, { width, height }]}>
      {source ? (
        <Image source={{ uri: source }} style={{ width, height }} contentFit="contain" transition={140} />
      ) : (
        <ActivityIndicator color="#fff" />
      )}
    </View>
  );
}

function VideoPage({ item, width, height }: { item: Item; width: number; height: number }) {
  const { data: uri } = useQuery({
    queryKey: ['video-file', item.id],
    queryFn: () => fetchOriginalFile(item.id, item.encrypted, item.mime),
    staleTime: 5 * 60 * 1000,
  });
  const player = useVideoPlayer(null, (p) => {
    p.loop = false;
  });
  useEffect(() => {
    if (uri) player.replace(uri);
  }, [uri, player]);
  return (
    <View style={[styles.page, { width, height }]}>
      {uri ? (
        <VideoView player={player} style={{ width, height }} contentFit="contain" nativeControls />
      ) : (
        <ActivityIndicator color="#fff" />
      )}
    </View>
  );
}

export default function PhotoViewer() {
  const params = useLocalSearchParams<{
    id: string;
    encrypted?: string;
    mime?: string;
    fav?: string;
    type?: string;
    view?: string;
  }>();
  const { width, height } = useWindowDimensions();

  const list = queryClient.getQueryData<{ assets: GridAsset[] }>(['assets', params.view ?? 'library']);
  const items: Item[] = list?.assets.length
    ? list.assets.map((a) => ({ id: a.id, encrypted: a.encrypted, mime: a.mimeType, type: a.type, favorite: a.isFavorite }))
    : [
        {
          id: params.id,
          encrypted: params.encrypted === '1',
          mime: params.mime ?? 'image/jpeg',
          type: (params.type as Kind) ?? 'image',
          favorite: params.fav === '1',
        },
      ];

  const startIndex = Math.max(0, items.findIndex((i) => i.id === params.id));
  const [index, setIndex] = useState(startIndex);
  const [favOverrides, setFavOverrides] = useState<Record<string, boolean>>({});

  const current = items[index] ?? items[0];
  const favorite = favOverrides[current.id] ?? current.favorite;

  // Drag-to-dismiss + pinch-to-peek.
  const translateY = useSharedValue(0);
  const dragScale = useSharedValue(1);
  const pinchScale = useSharedValue(1);
  const bg = useSharedValue(1);

  const dismiss = () => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.back();
  };

  const pan = Gesture.Pan()
    .activeOffsetY(16)
    .failOffsetX([-16, 16])
    .onUpdate((e) => {
      translateY.value = e.translationY;
      const p = clamp(Math.abs(e.translationY) / 500, 0, 1);
      dragScale.value = 1 - p * 0.18;
      bg.value = 1 - clamp(Math.abs(e.translationY) / 360, 0, 0.9);
    })
    .onEnd((e) => {
      if (e.translationY > 130 || e.velocityY > 900) {
        runOnJS(dismiss)();
      } else {
        translateY.value = withSpring(0, motion.spring);
        dragScale.value = withSpring(1, motion.spring);
        bg.value = withSpring(1, motion.spring);
      }
    });

  const pinch = Gesture.Pinch()
    .onUpdate((e) => {
      pinchScale.value = clamp(e.scale, 1, 4);
    })
    .onEnd(() => {
      pinchScale.value = withSpring(1, motion.springSoft);
    });

  const gesture = Gesture.Simultaneous(pan, pinch);

  const containerStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }, { scale: dragScale.value * pinchScale.value }],
  }));
  const bgStyle = useAnimatedStyle(() => ({ opacity: bg.value }));
  const chromeStyle = useAnimatedStyle(() => ({ opacity: bg.value }));

  const onScrollEnd = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const next = Math.round(e.nativeEvent.contentOffset.x / width);
    if (next !== index) setIndex(next);
  };

  const onToggleFavorite = async () => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const next = !favorite;
    setFavOverrides((m) => ({ ...m, [current.id]: next }));
    await favoriteAssets([current.id], next).catch(() => undefined);
    queryClient.invalidateQueries({ queryKey: ['assets'] });
  };

  const onTrash = async () => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    await trashAssets([current.id]).catch(() => undefined);
    queryClient.invalidateQueries({ queryKey: ['assets'] });
    router.back();
  };

  return (
    <View style={styles.root}>
      <Animated.View style={[styles.backdrop, bgStyle]} />
      <GestureDetector gesture={gesture}>
        <Animated.View style={[styles.fill, containerStyle]}>
          <FlatList
            data={items}
            keyExtractor={(i) => i.id}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            initialScrollIndex={startIndex}
            getItemLayout={(_, i) => ({ length: width, offset: width * i, index: i })}
            onMomentumScrollEnd={onScrollEnd}
            renderItem={({ item }) =>
              item.type === 'video' ? (
                <VideoPage item={item} width={width} height={height} />
              ) : (
                <ImagePage item={item} width={width} height={height} />
              )
            }
            windowSize={3}
            maxToRenderPerBatch={3}
          />
        </Animated.View>
      </GestureDetector>

      <Animated.View style={[styles.chrome, chromeStyle]} pointerEvents="box-none">
        <SafeAreaView style={styles.fill} edges={['top', 'bottom']} pointerEvents="box-none">
          <Pressable onPress={dismiss} hitSlop={12} style={styles.close}>
            <Ionicons name="chevron-down" size={26} color="#fff" />
          </Pressable>
          <View style={styles.actions}>
            <Pressable onPress={onToggleFavorite} hitSlop={12} style={styles.action}>
              <Ionicons name={favorite ? 'heart' : 'heart-outline'} size={26} color={favorite ? '#fb5e7e' : '#fff'} />
            </Pressable>
            <Pressable onPress={onTrash} hitSlop={12} style={styles.action}>
              <Ionicons name="trash-outline" size={24} color="#fff" />
            </Pressable>
          </View>
        </SafeAreaView>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  fill: { flex: 1 },
  backdrop: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: '#000' },
  page: { alignItems: 'center', justifyContent: 'center' },
  chrome: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 },
  close: {
    margin: 12,
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(0,0,0,0.45)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  actions: { flexDirection: 'row', justifyContent: 'center', gap: 28, paddingBottom: 12, marginTop: 'auto' },
  action: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: 'rgba(0,0,0,0.45)',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
