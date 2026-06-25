import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';

import { useColors } from '@/components/ui';
import { fetchAlbums, fetchThumbnailUri, type Album } from '@/lib/photos';

function AlbumCard({ album, size }: { album: Album; size: number }) {
  const c = useColors();
  const { data: uri } = useQuery({
    queryKey: ['thumb', album.coverAssetId],
    queryFn: () => (album.coverAssetId ? fetchThumbnailUri(album.coverAssetId, album.coverEncrypted) : null),
    enabled: Boolean(album.coverAssetId),
    staleTime: Infinity,
  });

  return (
    <Pressable
      onPress={() => router.push({ pathname: '/album/[id]', params: { id: album.id, title: album.name } })}
      style={{ width: size }}
    >
      <View style={[styles.cover, { width: size, height: size, backgroundColor: c.backgroundElement }]}>
        {uri ? (
          <Image source={{ uri }} style={{ width: size, height: size }} contentFit="cover" transition={120} />
        ) : (
          <Ionicons name="albums" size={28} color={c.textSecondary} />
        )}
      </View>
      <Text style={[styles.name, { color: c.text }]} numberOfLines={1}>
        {album.name}
      </Text>
      <Text style={[styles.count, { color: c.textSecondary }]}>
        {album.assetCount} {album.assetCount === 1 ? 'photo' : 'photos'}
      </Text>
    </Pressable>
  );
}

export function AlbumGrid() {
  const c = useColors();
  const { width } = useWindowDimensions();
  const GAP = 14;
  const tile = (width - 16 * 2 - GAP) / 2;

  const { data, isLoading, isError, refetch, isRefetching } = useQuery({
    queryKey: ['albums'],
    queryFn: fetchAlbums,
  });
  const albums = data ?? [];

  if (isLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={c.primary} />
      </View>
    );
  }
  if (isError || albums.length === 0) {
    return (
      <View style={styles.center}>
        <Ionicons name="albums-outline" size={40} color={c.textSecondary} />
        <Text style={[styles.empty, { color: c.textSecondary }]}>
          {isError ? 'Couldn’t load albums.' : 'No albums yet'}
        </Text>
      </View>
    );
  }

  return (
    <FlatList
      data={albums}
      keyExtractor={(a) => a.id}
      numColumns={2}
      columnWrapperStyle={{ gap: GAP, paddingHorizontal: 16 }}
      contentContainerStyle={{ gap: 18, paddingVertical: 8 }}
      renderItem={({ item }) => <AlbumCard album={item} size={tile} />}
      onRefresh={refetch}
      refreshing={isRefetching}
      showsVerticalScrollIndicator={false}
    />
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 10 },
  empty: { fontSize: 14 },
  cover: { borderRadius: 14, overflow: 'hidden', alignItems: 'center', justifyContent: 'center' },
  name: { fontSize: 14, fontWeight: '600', marginTop: 8 },
  count: { fontSize: 12, marginTop: 1 },
});
