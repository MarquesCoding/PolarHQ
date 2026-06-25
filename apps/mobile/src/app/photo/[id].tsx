import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import * as Haptics from 'expo-haptics';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import * as MediaLibrary from 'expo-media-library/legacy';
import { router, useLocalSearchParams } from 'expo-router';
import { useVideoPlayer, VideoView } from 'expo-video';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
  Platform,
  Pressable,
  Share,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  clamp,
  FadeIn,
  FadeOut,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

import { showActionSheet, type MenuAction } from '@/lib/action-menu';
import {
  addToAlbum,
  createAlbum,
  decryptOriginalToFile,
  deleteAssets,
  favoriteAssets,
  fetchAlbums,
  fetchOriginalFile,
  fetchOriginalUri,
  restoreAssets,
  trashAssets,
  type GridAsset,
} from '@/lib/photos';
import { queryClient } from '@/lib/query';
import { motion } from '@/theme/tokens';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
function formatDateTime(iso?: string): { date: string; time: string } | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  const hh = String(d.getHours()).padStart(2, '0');
  const mm = String(d.getMinutes()).padStart(2, '0');
  return { date: `${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`, time: `${hh}:${mm}` };
}

type Kind = 'image' | 'video' | 'audio';
interface Item {
  id: string;
  encrypted: boolean;
  mime: string;
  type: Kind;
  favorite: boolean;
  takenAt?: string;
  name?: string;
  width?: number | null;
  height?: number | null;
  sizeBytes?: number;
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
  const view = params.view ?? 'library';
  const isTrash = view === 'trash';

  const list = queryClient.getQueryData<{ assets: GridAsset[] }>(['assets', view]);
  const items: Item[] = list?.assets.length
    ? list.assets.map((a) => ({
        id: a.id,
        encrypted: a.encrypted,
        mime: a.mimeType,
        type: a.type,
        favorite: a.isFavorite,
        takenAt: a.takenAt ?? a.createdAt,
        name: a.originalFilename,
        width: a.width,
        height: a.height,
        sizeBytes: a.sizeBytes,
      }))
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
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const current = items[index] ?? items[0];
  const favorite = favOverrides[current.id] ?? current.favorite;
  const dt = formatDateTime(current.takenAt);

  // Drag-to-dismiss + pinch-to-peek.
  const translateY = useSharedValue(0);
  const dragScale = useSharedValue(1);
  const pinchScale = useSharedValue(1);
  const bg = useSharedValue(1);

  const dismiss = () => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.back();
  };

  const flashToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 1600);
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

  const withBusy = async (fn: () => Promise<void>) => {
    setBusy(true);
    try {
      await fn();
    } finally {
      setBusy(false);
    }
  };

  const onShare = () =>
    withBusy(async () => {
      const uri = await decryptOriginalToFile(current.id, current.encrypted, current.mime);
      if (uri) await Share.share({ url: uri }).catch(() => undefined);
    });

  const onDownload = () =>
    withBusy(async () => {
      const perm = await MediaLibrary.requestPermissionsAsync();
      if (!perm.granted) {
        Alert.alert('Allow photo access', 'Enable photo library access to save originals to this device.');
        return;
      }
      const uri = await decryptOriginalToFile(current.id, current.encrypted, current.mime);
      if (!uri) return;
      await MediaLibrary.saveToLibraryAsync(uri);
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      flashToast('Saved to device');
    });

  const addToAlbumId = async (albumId: string) => {
    await addToAlbum(albumId, [current.id]).catch(() => undefined);
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    flashToast('Added to album');
  };

  const promptNewAlbum = () => {
    Alert.prompt?.('New album', 'Name your album', async (name) => {
      const trimmed = name?.trim();
      if (!trimmed) return;
      const album = await createAlbum(trimmed).catch(() => null);
      if (album?.id) await addToAlbumId(album.id);
    });
  };

  const onAddTo = async () => {
    const albums = await fetchAlbums().catch(() => []);
    const actions: MenuAction[] = albums.map((al) => ({ label: al.name, onPress: () => void addToAlbumId(al.id) }));
    if (Platform.OS === 'ios') actions.push({ label: 'New album…', onPress: promptNewAlbum });
    if (!actions.length) {
      promptNewAlbum();
      return;
    }
    showActionSheet(actions, 'Add to album');
  };

  const onTrash = async () => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    await trashAssets([current.id]).catch(() => undefined);
    queryClient.invalidateQueries({ queryKey: ['assets'] });
    router.back();
  };

  const onRestore = async () => {
    await restoreAssets([current.id]).catch(() => undefined);
    queryClient.invalidateQueries({ queryKey: ['assets'] });
    router.back();
  };

  const onDeleteForever = () => {
    showActionSheet(
      [
        {
          label: 'Delete permanently',
          destructive: true,
          onPress: async () => {
            void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
            await deleteAssets([current.id]).catch(() => undefined);
            queryClient.invalidateQueries({ queryKey: ['assets'] });
            router.back();
          },
        },
      ],
      'This can’t be undone',
    );
  };

  const openDetails = () => {
    void Haptics.selectionAsync();
    router.push({
      pathname: '/photo-info',
      params: {
        name: current.name ?? '',
        takenAt: current.takenAt ?? '',
        sizeBytes: current.sizeBytes != null ? String(current.sizeBytes) : '',
        width: current.width != null ? String(current.width) : '',
        height: current.height != null ? String(current.height) : '',
        mime: current.mime,
        type: current.type,
        encrypted: current.encrypted ? '1' : '0',
      },
    });
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
        <LinearGradient colors={['rgba(0,0,0,0.55)', 'transparent']} style={styles.topScrim} pointerEvents="none" />
        <LinearGradient colors={['transparent', 'rgba(0,0,0,0.6)']} style={styles.bottomScrim} pointerEvents="none" />
        <SafeAreaView style={[styles.fill, styles.chromeInner]} edges={['top', 'bottom']} pointerEvents="box-none">
          {/* Top bar */}
          <View style={styles.topBar} pointerEvents="box-none">
            <Pressable onPress={dismiss} hitSlop={10} style={styles.iconBtn}>
              <Ionicons name="chevron-back" size={26} color="#fff" />
            </Pressable>

            <Pressable onPress={openDetails} hitSlop={8} style={styles.dateWrap}>
              {dt ? (
                <>
                  <View style={styles.dateRow}>
                    <Text style={styles.dateText}>{dt.date}</Text>
                    <Ionicons name="chevron-forward" size={15} color="rgba(255,255,255,0.85)" />
                  </View>
                  <Text style={styles.timeText}>{dt.time}</Text>
                </>
              ) : null}
            </Pressable>

            <View style={styles.topRight} pointerEvents="box-none">
              <Pressable onPress={onToggleFavorite} hitSlop={10} style={styles.iconBtn}>
                <Ionicons name={favorite ? 'heart' : 'heart-outline'} size={24} color={favorite ? '#fb5e7e' : '#fff'} />
              </Pressable>
              <Pressable onPress={openDetails} hitSlop={10} style={styles.iconBtn}>
                <Ionicons name="ellipsis-vertical" size={22} color="#fff" />
              </Pressable>
            </View>
          </View>

          {toast ? (
            <Animated.View entering={FadeIn.duration(150)} exiting={FadeOut.duration(200)} style={styles.toast} pointerEvents="none">
              <Text style={styles.toastText}>{toast}</Text>
            </Animated.View>
          ) : null}

          {/* Bottom bar */}
          <View style={styles.bottomBar} pointerEvents="box-none">
            {isTrash ? (
              <>
                <BarButton icon="refresh" label="Restore" onPress={onRestore} />
                <BarButton icon="download-outline" label="Download" onPress={onDownload} />
                <BarButton icon="trash-outline" label="Delete" tint="#fb5e7e" onPress={onDeleteForever} />
              </>
            ) : (
              <>
                <BarButton icon="share-outline" label="Share" onPress={onShare} />
                <BarButton icon="add-circle-outline" label="Add to" onPress={onAddTo} />
                <BarButton icon="download-outline" label="Download" onPress={onDownload} />
                <BarButton icon="trash-outline" label="Bin" onPress={onTrash} />
              </>
            )}
          </View>
        </SafeAreaView>
      </Animated.View>

      {busy ? (
        <View style={styles.busy} pointerEvents="auto">
          <ActivityIndicator color="#fff" />
        </View>
      ) : null}
    </View>
  );
}

function BarButton({
  icon,
  label,
  tint = '#fff',
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  tint?: string;
  onPress: () => void;
}) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.barBtn, { opacity: pressed ? 0.55 : 1 }]} hitSlop={6}>
      <Ionicons name={icon} size={24} color={tint} />
      <Text style={[styles.barLabel, { color: tint }]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  fill: { flex: 1 },
  backdrop: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: '#000' },
  page: { alignItems: 'center', justifyContent: 'center' },
  chrome: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 },
  chromeInner: { justifyContent: 'space-between' },
  topScrim: { position: 'absolute', top: 0, left: 0, right: 0, height: 150 },
  bottomScrim: { position: 'absolute', bottom: 0, left: 0, right: 0, height: 170 },
  topBar: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 6, paddingTop: 4 },
  iconBtn: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  dateWrap: { flex: 1, alignItems: 'center' },
  dateRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  dateText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  timeText: { color: 'rgba(255,255,255,0.7)', fontSize: 12, marginTop: 1 },
  topRight: { flexDirection: 'row', alignItems: 'center' },
  bottomBar: { flexDirection: 'row', justifyContent: 'space-around', alignItems: 'flex-end', paddingHorizontal: 8, paddingBottom: 6 },
  barBtn: { alignItems: 'center', justifyContent: 'center', gap: 5, minWidth: 60, paddingVertical: 6 },
  barLabel: { fontSize: 12, fontWeight: '500' },
  toast: {
    position: 'absolute',
    alignSelf: 'center',
    bottom: 96,
    backgroundColor: 'rgba(0,0,0,0.8)',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 22,
  },
  toastText: { color: '#fff', fontSize: 13, fontWeight: '500' },
  busy: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.25)' },
});
