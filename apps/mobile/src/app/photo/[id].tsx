import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import * as Haptics from 'expo-haptics';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import * as MediaLibrary from 'expo-media-library/legacy';
import { router, useLocalSearchParams } from 'expo-router';
import { useVideoPlayer, VideoView } from 'expo-video';
import { useEffect, useRef, useState } from 'react';
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
import Animated, {
  FadeIn,
  FadeOut,
  type SharedValue,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Glass } from '@/components/ui/glass';
import { ZoomableImage } from '@/components/zoomable-image';
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
  fetchThumbnailUri,
  restoreAssets,
  trashAssets,
  type GridAsset,
} from '@/lib/photos';
import { queryClient } from '@/lib/query';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
function formatDateTime(iso?: string): { date: string; time: string } | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  const hh = String(d.getHours()).padStart(2, '0');
  const mm = String(d.getMinutes()).padStart(2, '0');
  return { date: `${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`, time: `${hh}:${mm}` };
}

const STRIP_THUMB = 44;
const STRIP_GAP = 5;
const STRIP_STRIDE = STRIP_THUMB + STRIP_GAP;

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

function ImagePage({
  item,
  width,
  height,
  backdrop,
  onDismiss,
  onZoomChange,
}: {
  item: Item;
  width: number;
  height: number;
  backdrop: SharedValue<number>;
  onDismiss: () => void;
  onZoomChange: (zoomed: boolean) => void;
}) {
  const { data: uri } = useQuery({
    queryKey: ['original', item.id],
    queryFn: () => fetchOriginalUri(item.id, item.encrypted, item.mime),
    staleTime: 5 * 60 * 1000,
  });
  const thumb = queryClient.getQueryData<string | null>(['thumb', item.id]);
  const source = uri ?? thumb ?? undefined;
  if (!source) {
    return (
      <View style={[styles.page, { width, height }]}>
        <ActivityIndicator color="#fff" />
      </View>
    );
  }
  return (
    <ZoomableImage
      uri={source}
      width={width}
      height={height}
      backdrop={backdrop}
      onDismiss={onDismiss}
      onZoomChange={onZoomChange}
    />
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

function StripThumb({ item, active, onPress }: { item: Item; active: boolean; onPress: () => void }) {
  const { data: uri } = useQuery({
    queryKey: ['thumb', item.id],
    queryFn: () => fetchThumbnailUri(item.id, item.encrypted),
    staleTime: Infinity,
  });
  return (
    <Pressable onPress={onPress} style={[styles.thumb, active && styles.thumbActive]}>
      {uri ? (
        <Image source={{ uri }} style={styles.thumbImg} contentFit="cover" recyclingKey={item.id} />
      ) : (
        <View style={styles.thumbImg} />
      )}
      {item.type === 'video' ? (
        <View style={styles.thumbVideo}>
          <Ionicons name="play" size={8} color="#fff" />
        </View>
      ) : null}
    </Pressable>
  );
}

function FilmStrip({ items, index, onSelect }: { items: Item[]; index: number; onSelect: (i: number) => void }) {
  const ref = useRef<FlatList<Item>>(null);
  useEffect(() => {
    ref.current?.scrollToIndex({ index, animated: true, viewPosition: 0.5 });
  }, [index]);
  return (
    <FlatList
      ref={ref}
      data={items}
      horizontal
      showsHorizontalScrollIndicator={false}
      keyExtractor={(i) => i.id}
      contentContainerStyle={styles.stripContent}
      getItemLayout={(_, i) => ({ length: STRIP_STRIDE, offset: STRIP_STRIDE * i, index: i })}
      onScrollToIndexFailed={() => undefined}
      renderItem={({ item, index: i }) => <StripThumb item={item} active={i === index} onPress={() => onSelect(i)} />}
    />
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
  const insets = useSafeAreaInsets();
  const view = params.view ?? 'library';
  const isTrash = view === 'trash';
  const listRef = useRef<FlatList<Item>>(null);

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
  const showStrip = items.length > 1;

  const bg = useSharedValue(1);
  const chrome = useSharedValue(1);
  const [zoomed, setZoomed] = useState(false);

  const dismiss = () => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.back();
  };

  const onZoomChange = (z: boolean) => {
    setZoomed(z);
    chrome.value = withTiming(z ? 0 : 1, { duration: 160 });
  };

  const flashToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 1600);
  };

  const jumpTo = (i: number) => {
    void Haptics.selectionAsync();
    setIndex(i);
    listRef.current?.scrollToIndex({ index: i, animated: true });
  };

  const bgStyle = useAnimatedStyle(() => ({ opacity: bg.value }));
  const chromeStyle = useAnimatedStyle(() => ({ opacity: bg.value * chrome.value }));

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

  const doTrash = async () => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    await trashAssets([current.id]).catch(() => undefined);
    queryClient.invalidateQueries({ queryKey: ['assets'] });
    router.back();
  };

  const onTrash = () => {
    const label = current.type === 'video' ? 'Move video to Trash' : 'Move photo to Trash';
    showActionSheet(
      [{ label, destructive: true, onPress: () => void doTrash() }],
      'It will move to Trash and you can restore it within 30 days.',
    );
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
      <View style={styles.fill}>
          <FlatList
            ref={listRef}
            data={items}
            keyExtractor={(i) => i.id}
            horizontal
            pagingEnabled
            scrollEnabled={!zoomed}
            showsHorizontalScrollIndicator={false}
            initialScrollIndex={startIndex}
            getItemLayout={(_, i) => ({ length: width, offset: width * i, index: i })}
            onMomentumScrollEnd={onScrollEnd}
            renderItem={({ item }) =>
              item.type === 'video' ? (
                <VideoPage item={item} width={width} height={height} />
              ) : (
                <ImagePage
                  item={item}
                  width={width}
                  height={height}
                  backdrop={bg}
                  onDismiss={dismiss}
                  onZoomChange={onZoomChange}
                />
              )
            }
            windowSize={3}
            maxToRenderPerBatch={3}
          />
        </View>

      <Animated.View style={[styles.chrome, chromeStyle]} pointerEvents="box-none">
        <LinearGradient colors={['rgba(0,0,0,0.5)', 'transparent']} style={styles.topScrim} pointerEvents="none" />
        <LinearGradient colors={['transparent', 'rgba(0,0,0,0.55)']} style={styles.bottomScrim} pointerEvents="none" />

        <View style={[styles.chromeInner, { paddingTop: insets.top + 6 }]} pointerEvents="box-none">
          {/* Top bar */}
          <View style={styles.topBar} pointerEvents="box-none">
            <Glass style={styles.circle}>
              <Pressable onPress={dismiss} style={styles.circlePress} hitSlop={4}>
                <Ionicons name="chevron-back" size={24} color="#fff" />
              </Pressable>
            </Glass>

            <Glass style={styles.datePill}>
              <Pressable onPress={openDetails} style={styles.datePillPress}>
                {dt ? (
                  <>
                    <Text style={styles.dateText}>{dt.date}</Text>
                    <Text style={styles.timeText}>{dt.time}</Text>
                  </>
                ) : (
                  <Text style={styles.dateText}>Photo</Text>
                )}
              </Pressable>
            </Glass>

            <View style={styles.circle} />
          </View>

          {toast ? (
            <Animated.View entering={FadeIn.duration(150)} exiting={FadeOut.duration(200)} style={styles.toast} pointerEvents="none">
              <Text style={styles.toastText}>{toast}</Text>
            </Animated.View>
          ) : null}

          {/* Bottom: filmstrip + glass action bar */}
          <View style={[styles.bottom, { paddingBottom: insets.bottom + 14 }]} pointerEvents="box-none">
            {showStrip ? <FilmStrip items={items} index={index} onSelect={jumpTo} /> : null}

            <View style={styles.actionRow} pointerEvents="box-none">
              {isTrash ? (
                <>
                  <GlassButton icon="refresh" onPress={onRestore} />
                  <Glass style={styles.capsule}>
                    <CapsuleBtn icon="download-outline" onPress={onDownload} />
                    <CapsuleBtn icon="information-circle-outline" onPress={openDetails} />
                  </Glass>
                  <GlassButton icon="trash-outline" tint="#fb5e7e" onPress={onDeleteForever} />
                </>
              ) : (
                <>
                  <GlassButton icon="share-outline" onPress={onShare} />
                  <Glass style={styles.capsule}>
                    <CapsuleBtn
                      icon={favorite ? 'heart' : 'heart-outline'}
                      tint={favorite ? '#fb5e7e' : '#fff'}
                      onPress={onToggleFavorite}
                    />
                    <CapsuleBtn icon="add" onPress={onAddTo} />
                    <CapsuleBtn icon="download-outline" onPress={onDownload} />
                    <CapsuleBtn icon="information-circle-outline" onPress={openDetails} />
                  </Glass>
                  <GlassButton icon="trash-outline" onPress={onTrash} />
                </>
              )}
            </View>
          </View>
        </View>
      </Animated.View>

      {busy ? (
        <View style={styles.busy} pointerEvents="auto">
          <ActivityIndicator color="#fff" />
        </View>
      ) : null}
    </View>
  );
}

function GlassButton({
  icon,
  tint = '#fff',
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  tint?: string;
  onPress: () => void;
}) {
  return (
    <Glass style={styles.circle}>
      <Pressable onPress={onPress} style={styles.circlePress} hitSlop={4}>
        <Ionicons name={icon} size={22} color={tint} />
      </Pressable>
    </Glass>
  );
}

function CapsuleBtn({
  icon,
  tint = '#fff',
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  tint?: string;
  onPress: () => void;
}) {
  return (
    <Pressable onPress={onPress} style={styles.capsuleBtn} hitSlop={2}>
      <Ionicons name={icon} size={23} color={tint} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  fill: { flex: 1 },
  backdrop: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: '#000' },
  page: { alignItems: 'center', justifyContent: 'center' },
  chrome: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 },
  chromeInner: { flex: 1, justifyContent: 'space-between' },
  topScrim: { position: 'absolute', top: 0, left: 0, right: 0, height: 150 },
  bottomScrim: { position: 'absolute', bottom: 0, left: 0, right: 0, height: 220 },
  topBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 12 },
  circle: { width: 44, height: 44, borderRadius: 22, overflow: 'hidden' },
  circlePress: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  datePill: { borderRadius: 20, overflow: 'hidden' },
  datePillPress: { paddingHorizontal: 20, paddingVertical: 6, alignItems: 'center', minWidth: 150 },
  dateText: { color: '#fff', fontSize: 15, fontWeight: '600' },
  timeText: { color: 'rgba(255,255,255,0.7)', fontSize: 12, marginTop: 1 },
  bottom: { gap: 12, paddingHorizontal: 12 },
  stripContent: { paddingHorizontal: 12, gap: STRIP_GAP, alignItems: 'center' },
  thumb: { width: STRIP_THUMB, height: 54, borderRadius: 7, overflow: 'hidden', opacity: 0.55 },
  thumbActive: { opacity: 1, borderWidth: 2, borderColor: '#fff' },
  thumbImg: { flex: 1, backgroundColor: 'rgba(255,255,255,0.1)' },
  thumbVideo: { position: 'absolute', right: 2, bottom: 2, width: 12, height: 12, borderRadius: 6, backgroundColor: 'rgba(0,0,0,0.5)', alignItems: 'center', justifyContent: 'center' },
  actionRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
  capsule: { flexDirection: 'row', alignItems: 'center', borderRadius: 26, overflow: 'hidden' },
  capsuleBtn: { paddingHorizontal: 15, paddingVertical: 13 },
  toast: {
    position: 'absolute',
    alignSelf: 'center',
    top: '50%',
    backgroundColor: 'rgba(0,0,0,0.8)',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 22,
  },
  toastText: { color: '#fff', fontSize: 13, fontWeight: '500' },
  busy: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.25)' },
});
