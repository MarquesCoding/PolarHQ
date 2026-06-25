import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useColors } from '@/components/ui';
import { fetchAssets, fetchThumbnailUri, type AssetView, type GridAsset } from '@/lib/photos';

const VIEWS: { key: AssetView; label: string }[] = [
  { key: 'library', label: 'All' },
  { key: 'favourites', label: 'Favourites' },
  { key: 'trash', label: 'Trash' },
];

const EMPTY_COPY: Record<AssetView, { title: string; body: string }> = {
  library: {
    title: 'Your library, end to end',
    body: 'Photos you add on any device show up here, decrypted on this one.',
  },
  favourites: { title: 'No favourites yet', body: 'Tap the heart on a photo to find it here.' },
  trash: { title: 'Trash is empty', body: 'Deleted photos wait here before they’re removed.' },
};

const GAP = 2;
const COLUMNS = 3;
const EDGE = 2;

function PhotoTile({ asset, size }: { asset: GridAsset; size: number }) {
  const c = useColors();
  const { data: uri, isLoading } = useQuery({
    queryKey: ['thumb', asset.id],
    queryFn: () => fetchThumbnailUri(asset.id, asset.encrypted),
    staleTime: Infinity,
    retry: 1,
  });

  return (
    <Pressable
      onPress={() =>
        router.push({
          pathname: '/photo/[id]',
          params: {
            id: asset.id,
            encrypted: asset.encrypted ? '1' : '0',
            mime: asset.mimeType,
            fav: asset.isFavorite ? '1' : '0',
          },
        })
      }
      style={{ width: size, height: size, backgroundColor: c.backgroundElement }}
    >
      {uri ? (
        <Image source={{ uri }} style={{ width: size, height: size }} contentFit="cover" transition={120} />
      ) : (
        <View style={styles.tilePlaceholder}>
          {isLoading ? (
            <ActivityIndicator size="small" color={c.textSecondary} />
          ) : (
            <Ionicons name="lock-closed" size={16} color={c.textSecondary} />
          )}
        </View>
      )}
    </Pressable>
  );
}

function EmptyState({ view }: { view: AssetView }) {
  const c = useColors();
  const copy = EMPTY_COPY[view];
  return (
    <View style={styles.empty}>
      <View style={[styles.iconWrap, { backgroundColor: c.backgroundElement }]}>
        <Ionicons name="images-outline" size={34} color={c.primary} />
      </View>
      <Text style={[styles.emptyTitle, { color: c.text }]}>{copy.title}</Text>
      <Text style={[styles.emptyBody, { color: c.textSecondary }]}>{copy.body}</Text>
    </View>
  );
}

export default function Photos() {
  const c = useColors();
  const { width } = useWindowDimensions();
  const tile = (width - EDGE * 2 - GAP * (COLUMNS - 1)) / COLUMNS;
  const [view, setView] = useState<AssetView>('library');

  const { data, isLoading, isError, refetch, isRefetching } = useQuery({
    queryKey: ['assets', view],
    queryFn: () => fetchAssets({ view }),
  });
  const assets = data?.assets ?? [];

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: c.background }]} edges={['top']}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: c.text }]}>Photos</Text>
      </View>

      <View style={styles.pills}>
        {VIEWS.map((v) => {
          const active = v.key === view;
          return (
            <Pressable
              key={v.key}
              onPress={() => setView(v.key)}
              style={[styles.pill, { backgroundColor: active ? c.primary : c.backgroundElement }]}
            >
              <Text
                style={{
                  color: active ? c.primaryForeground : c.textSecondary,
                  fontWeight: '600',
                  fontSize: 13,
                }}
              >
                {v.label}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator color={c.primary} />
        </View>
      ) : isError ? (
        <View style={styles.center}>
          <Text style={{ color: c.textSecondary }}>Couldn’t load your library.</Text>
        </View>
      ) : assets.length === 0 ? (
        <EmptyState view={view} />
      ) : (
        <FlatList
          data={assets}
          keyExtractor={(a) => a.id}
          numColumns={COLUMNS}
          contentContainerStyle={{ padding: EDGE }}
          columnWrapperStyle={{ gap: GAP }}
          ItemSeparatorComponent={() => <View style={{ height: GAP }} />}
          renderItem={({ item }) => <PhotoTile asset={item} size={tile} />}
          onRefresh={refetch}
          refreshing={isRefetching}
          showsVerticalScrollIndicator={false}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  header: { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 8 },
  title: { fontSize: 30, fontWeight: '800' },
  pills: { flexDirection: 'row', paddingHorizontal: 16, paddingBottom: 12, gap: 8 },
  pill: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 999 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  tilePlaceholder: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32, gap: 14 },
  iconWrap: { width: 72, height: 72, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  emptyTitle: { fontSize: 18, fontWeight: '700' },
  emptyBody: { fontSize: 14, textAlign: 'center', lineHeight: 20, maxWidth: 300 },
});
