import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { Image } from 'expo-image';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, useWindowDimensions, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { queryClient } from '@/lib/query';
import { favoriteAssets, fetchOriginalUri, trashAssets } from '@/lib/photos';

export default function PhotoViewer() {
  const { id, encrypted, mime, fav } = useLocalSearchParams<{
    id: string;
    encrypted?: string;
    mime?: string;
    fav?: string;
  }>();
  const { width, height } = useWindowDimensions();
  const [favorite, setFavorite] = useState(fav === '1');
  const [busy, setBusy] = useState(false);

  const { data: uri, isLoading } = useQuery({
    queryKey: ['original', id],
    queryFn: () => fetchOriginalUri(id, encrypted === '1', mime || 'image/jpeg'),
    staleTime: 5 * 60 * 1000,
    enabled: Boolean(id),
  });

  // Instant placeholder: reuse the already-decrypted grid thumbnail while the original loads.
  const thumb = queryClient.getQueryData<string | null>(['thumb', id]);
  const source = uri ?? thumb ?? undefined;

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['assets'] });

  const onToggleFavorite = async () => {
    const next = !favorite;
    setFavorite(next);
    await favoriteAssets([id], next).catch(() => setFavorite(!next));
    invalidate();
  };

  const onTrash = async () => {
    setBusy(true);
    await trashAssets([id]).catch(() => undefined);
    invalidate();
    router.back();
  };

  return (
    <View style={styles.root}>
      {source ? (
        <Image source={{ uri: source }} style={{ width, height }} contentFit="contain" transition={150} />
      ) : null}

      {isLoading && !uri ? (
        <View style={styles.center}>
          <ActivityIndicator color="#fff" />
        </View>
      ) : null}

      <SafeAreaView style={styles.chrome} edges={['top', 'bottom']} pointerEvents="box-none">
        <Pressable onPress={() => router.back()} hitSlop={12} style={styles.close}>
          <Ionicons name="chevron-down" size={26} color="#fff" />
        </Pressable>

        <View style={styles.actions}>
          <Pressable onPress={onToggleFavorite} hitSlop={12} style={styles.action} disabled={busy}>
            <Ionicons
              name={favorite ? 'heart' : 'heart-outline'}
              size={26}
              color={favorite ? '#fb5e7e' : '#fff'}
            />
          </Pressable>
          <Pressable onPress={onTrash} hitSlop={12} style={styles.action} disabled={busy}>
            <Ionicons name="trash-outline" size={24} color="#fff" />
          </Pressable>
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#000', alignItems: 'center', justifyContent: 'center' },
  center: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chrome: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'space-between',
  },
  close: {
    margin: 12,
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(0,0,0,0.45)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 28,
    paddingBottom: 12,
  },
  action: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: 'rgba(0,0,0,0.45)',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
