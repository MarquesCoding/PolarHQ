import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useColors } from '@/components/ui';
import { authClient } from '@/lib/auth';
import { fetchAlbums, fetchThumbnailUri, type Album } from '@/lib/photos';

type Item =
  | { kind: 'collection'; key: string; view: string; label: string; icon: keyof typeof Ionicons.glyphMap }
  | { kind: 'album'; key: string; album: Album };

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
      style={({ pressed }) => [{ width: size, opacity: pressed ? 0.85 : 1 }]}
    >
      <View style={[styles.cover, { width: size, height: size, backgroundColor: c.backgroundElement }]}>
        {uri ? (
          <Image source={{ uri }} style={{ width: size, height: size }} contentFit="cover" transition={160} />
        ) : (
          <Ionicons name="albums" size={28} color={c.textSecondary} />
        )}
        <LinearGradient colors={['transparent', 'rgba(0,0,0,0.7)']} style={styles.shade} />
      </View>
      <Text style={[styles.name, { color: c.text }]} numberOfLines={1}>
        {album.name}
      </Text>
      <Text style={[styles.count, { color: c.textSecondary }]}>{album.assetCount}</Text>
    </Pressable>
  );
}

export default function Albums() {
  const c = useColors();
  const { width } = useWindowDimensions();
  const { data: session } = authClient.useSession();
  const initial = (session?.user?.email ?? '?').trim().charAt(0).toUpperCase();
  const GAP = 14;
  const tile = (width - 16 * 2 - GAP) / 2;

  const { data, isLoading, refetch, isRefetching } = useQuery({ queryKey: ['albums'], queryFn: fetchAlbums });
  const items: Item[] = [
    { kind: 'collection', key: 'fav', view: 'favourites', label: 'Favourites', icon: 'heart' },
    { kind: 'collection', key: 'trash', view: 'trash', label: 'Trash', icon: 'trash' },
    ...(data ?? []).map((album) => ({ kind: 'album' as const, key: album.id, album })),
  ];

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: c.background }]} edges={['top']}>
      {isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator color={c.primary} />
        </View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(i) => i.key}
          numColumns={2}
          columnWrapperStyle={{ gap: GAP, paddingHorizontal: 16 }}
          contentContainerStyle={{ gap: 18, paddingBottom: 110 }}
          onRefresh={refetch}
          refreshing={isRefetching}
          showsVerticalScrollIndicator={false}
          ListHeaderComponent={
            <View style={styles.header}>
              <Text style={[styles.heading, { color: c.text }]}>Albums</Text>
              <Pressable onPress={() => router.push('/account')} hitSlop={8} style={[styles.avatar, { backgroundColor: c.primary }]}>
                <Text style={styles.avatarText}>{initial}</Text>
              </Pressable>
            </View>
          }
          renderItem={({ item }) =>
            item.kind === 'collection' ? (
              <Pressable
                onPress={() => router.push({ pathname: '/collection/[view]', params: { view: item.view, title: item.label } })}
                style={({ pressed }) => [
                  styles.cover,
                  styles.collection,
                  { width: tile, height: tile, backgroundColor: c.backgroundElement, opacity: pressed ? 0.85 : 1 },
                ]}
              >
                <Ionicons name={item.icon} size={32} color={c.primary} />
                <Text style={[styles.collectionLabel, { color: c.text }]}>{item.label}</Text>
              </Pressable>
            ) : (
              <AlbumCard album={item.album} size={tile} />
            )
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingTop: 8, paddingBottom: 14 },
  heading: { fontSize: 28, fontWeight: '800' },
  avatar: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: '#fff', fontSize: 15, fontWeight: '700' },
  cover: { borderRadius: 16, overflow: 'hidden', alignItems: 'center', justifyContent: 'center' },
  collection: { gap: 10 },
  collectionLabel: { fontSize: 14, fontWeight: '600' },
  shade: { position: 'absolute', left: 0, right: 0, bottom: 0, height: 50 },
  name: { fontSize: 14, fontWeight: '600', marginTop: 8 },
  count: { fontSize: 12, marginTop: 1 },
});
