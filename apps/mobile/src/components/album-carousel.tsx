import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { useColors } from '@/components/ui';
import { fetchAlbums, fetchThumbnailUri, type Album } from '@/lib/photos';

const CARD_W = 124;
const CARD_H = 156;

function Card({ album, index }: { album: Album; index: number }) {
  const c = useColors();
  const { data: uri } = useQuery({
    queryKey: ['thumb', album.coverAssetId],
    queryFn: () => (album.coverAssetId ? fetchThumbnailUri(album.coverAssetId, album.coverEncrypted) : null),
    enabled: Boolean(album.coverAssetId),
    staleTime: Infinity,
  });

  return (
    <Animated.View entering={FadeInDown.delay(index * 55).duration(360)}>
      <Pressable
        onPress={() => router.push({ pathname: '/album/[id]', params: { id: album.id, title: album.name } })}
        style={({ pressed }) => [
          styles.card,
          { backgroundColor: c.backgroundElement, transform: [{ scale: pressed ? 0.96 : 1 }] },
        ]}
      >
        {uri ? (
          <Image source={{ uri }} style={styles.cover} contentFit="cover" transition={160} />
        ) : (
          <View style={styles.cover}>
            <Ionicons name="albums" size={26} color={c.textSecondary} />
          </View>
        )}
        <LinearGradient colors={['transparent', 'rgba(0,0,0,0.75)']} style={styles.shade} />
        <View style={styles.label}>
          <Text style={styles.name} numberOfLines={2}>
            {album.name}
          </Text>
          <Text style={styles.count}>{album.assetCount}</Text>
        </View>
      </Pressable>
    </Animated.View>
  );
}

export function AlbumCarousel() {
  const c = useColors();
  const { data } = useQuery({ queryKey: ['albums'], queryFn: fetchAlbums });
  const albums = data ?? [];
  if (albums.length === 0) return null;

  return (
    <View style={styles.wrap}>
      <Text style={[styles.heading, { color: c.text }]}>Albums</Text>
      <FlatList
        data={albums}
        keyExtractor={(a) => a.id}
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.row}
        renderItem={({ item, index }) => <Card album={item} index={index} />}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { paddingTop: 2, paddingBottom: 14 },
  heading: { fontSize: 17, fontWeight: '700', paddingHorizontal: 16, marginBottom: 10 },
  row: { paddingHorizontal: 16, gap: 10 },
  card: { width: CARD_W, height: CARD_H, borderRadius: 18, overflow: 'hidden', justifyContent: 'flex-end' },
  cover: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, alignItems: 'center', justifyContent: 'center' },
  shade: { position: 'absolute', left: 0, right: 0, bottom: 0, height: 80 },
  label: { padding: 10, gap: 1 },
  name: { color: '#fff', fontSize: 13, fontWeight: '600' },
  count: { color: 'rgba(255,255,255,0.7)', fontSize: 11 },
});
