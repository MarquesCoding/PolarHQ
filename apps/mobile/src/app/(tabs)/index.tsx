import { Ionicons } from '@expo/vector-icons';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { BlurView } from 'expo-blur';
import { router } from 'expo-router';
import { useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
  StyleSheet,
  Text,
  useColorScheme,
  View,
} from 'react-native';
import Animated, { clamp, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { PhotoGrid, type Row } from '@/components/photo-grid';
import { Glass } from '@/components/ui/glass';
import { Tappable } from '@/components/ui/tappable';
import { useColors } from '@/components/ui';
import { useBackupStatus } from '@/hooks/use-backup-status';
import { authClient } from '@/lib/auth';
import { fetchAssets } from '@/lib/photos';
import { pickAndUploadPhoto } from '@/lib/upload';

const BAR_H = 50;

export default function Photos() {
  const c = useColors();
  const scheme = useColorScheme() === 'light' ? 'light' : 'dark';
  const glass = scheme === 'dark' ? 'rgba(11,11,20,0.55)' : 'rgba(246,245,251,0.6)';
  const insets = useSafeAreaInsets();
  const barTotal = insets.top + BAR_H;

  const queryClient = useQueryClient();
  const backup = useBackupStatus();
  const { data: session } = authClient.useSession();
  const initial = (session?.user?.email ?? '?').trim().charAt(0).toUpperCase();
  const [uploading, setUploading] = useState(false);

  const { data, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['assets', 'library'],
    queryFn: () => fetchAssets({ view: 'library' }),
  });
  const assets = data?.assets ?? [];

  // Auto-hiding top bar + floating date badge driven by scroll.
  const barY = useSharedValue(0);
  const badge = useSharedValue(0);
  const lastY = useRef(0);
  const [date, setDate] = useState('');

  const onScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const y = e.nativeEvent.contentOffset.y;
    const dy = y - lastY.current;
    if (y <= 2) barY.value = withTiming(0, { duration: 180 });
    else if (dy > 5) barY.value = withTiming(-(barTotal + 14), { duration: 220 });
    else if (dy < -5) barY.value = withTiming(0, { duration: 220 });
    lastY.current = y;

    // Date badge stays while scrolled; only hides back at the very top.
    badge.value = withTiming(y > 40 ? 1 : 0, { duration: 160 });
  };

  const onViewable = ({ viewableItems }: { viewableItems: { item: Row }[] }) => {
    const first = viewableItems[0]?.item;
    if (!first) return;
    const label = 'header' in first ? first.header : first.month;
    if (label) setDate(label);
  };

  const onAdd = async () => {
    setUploading(true);
    try {
      const outcome = await pickAndUploadPhoto();
      if (outcome === 'uploaded') await queryClient.invalidateQueries({ queryKey: ['assets'] });
      else if (outcome === 'locked') Alert.alert('Locked', 'Sign in again to unlock encryption before uploading.');
      else if (outcome === 'denied') Alert.alert('Permission needed', 'Allow photo library access to upload.');
    } catch (e) {
      Alert.alert('Upload failed', String(e instanceof Error ? e.message : e));
    } finally {
      setUploading(false);
    }
  };

  const remaining = backup?.running ? Math.max(0, backup.total - backup.done) : 0;

  const barStyle = useAnimatedStyle(() => ({ transform: [{ translateY: barY.value }] }));
  // Badge sits near the top when the bar is hidden, and slides down below it as the bar reveals.
  const badgeStyle = useAnimatedStyle(() => {
    const factor = clamp(1 + barY.value / (barTotal + 14), 0, 1);
    return {
      opacity: badge.value,
      transform: [{ translateY: insets.top + 4 + factor * (BAR_H - 8) }],
    };
  });

  const empty = isLoading ? (
    <View style={[styles.center, { paddingTop: barTotal + 80 }]}>
      <ActivityIndicator color={c.primary} />
    </View>
  ) : (
    <View style={[styles.emptyState, { paddingTop: barTotal + 60 }]}>
      <View style={[styles.iconWrap, { backgroundColor: c.backgroundElement }]}>
        <Ionicons name="images-outline" size={34} color={c.primary} />
      </View>
      <Text style={[styles.emptyTitle, { color: c.text }]}>Your library, end to end</Text>
      <Text style={[styles.emptyBody, { color: c.textSecondary }]}>
        Photos you add on any device show up here, decrypted on this one.
      </Text>
    </View>
  );

  return (
    <View style={[styles.root, { backgroundColor: c.background }]}>
      <PhotoGrid
        assets={assets}
        view="library"
        grouped
        topInset={barTotal + 6}
        onScroll={onScroll}
        onViewableItemsChanged={onViewable}
        viewabilityConfig={{ itemVisiblePercentThreshold: 10 }}
        onRefresh={refetch}
        refreshing={isRefetching}
        ListEmptyComponent={empty}
      />

      {/* Floating date badge — stays while scrolled, slides with the bar. */}
      <Animated.View style={[styles.badgeWrap, badgeStyle]} pointerEvents="none">
        <BlurView intensity={40} tint={scheme} style={[styles.badge, { backgroundColor: glass, borderColor: c.border }]}>
          <Text style={[styles.badgeText, { color: c.text }]}>{date}</Text>
        </BlurView>
      </Animated.View>

      {/* Auto-hiding transparent top bar — buttons float over the content (no panel). */}
      <Animated.View
        style={[styles.topBar, { height: barTotal, paddingTop: insets.top }, barStyle]}
        pointerEvents="box-none"
      >
        <View style={styles.topBarInner} pointerEvents="box-none">
          {backup?.running ? (
            <View style={[styles.backupPill, { backgroundColor: c.backgroundElement }]}>
              <ActivityIndicator size="small" color={c.primary} />
              <Text style={[styles.backupText, { color: c.text }]}>Backing up {remaining}</Text>
            </View>
          ) : (
            <View style={{ flex: 1 }} />
          )}
          <Tappable onPress={onAdd} disabled={uploading}>
            <Glass style={styles.iconBtn} fallback={c.backgroundElement}>
              {uploading ? <ActivityIndicator size="small" color={c.primary} /> : <Ionicons name="add" size={24} color={c.primary} />}
            </Glass>
          </Tappable>
          <Tappable onPress={() => router.push('/account')} haptic="selection">
            <Glass style={styles.avatar} tint={c.primary}>
              <Text style={styles.avatarText}>{initial}</Text>
            </Glass>
          </Tappable>
        </View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  topBar: { position: 'absolute', top: 0, left: 0, right: 0 },
  topBarInner: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 16 },
  backupPill: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8, paddingLeft: 10, paddingRight: 14, height: 36, borderRadius: 18, alignSelf: 'center' },
  backupText: { fontSize: 14, fontWeight: '600' },
  iconBtn: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  avatar: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  avatarText: { color: '#fff', fontSize: 15, fontWeight: '700' },
  badgeWrap: { position: 'absolute', left: 0, right: 0, alignItems: 'center' },
  badge: { paddingHorizontal: 14, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center', borderWidth: StyleSheet.hairlineWidth, overflow: 'hidden' },
  badgeText: { fontSize: 13, fontWeight: '700' },
  center: { flex: 1, alignItems: 'center' },
  emptyState: { flex: 1, alignItems: 'center', padding: 32, gap: 14 },
  iconWrap: { width: 72, height: 72, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  emptyTitle: { fontSize: 18, fontWeight: '700' },
  emptyBody: { fontSize: 14, textAlign: 'center', lineHeight: 20, maxWidth: 300 },
});
