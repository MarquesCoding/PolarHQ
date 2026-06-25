import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { router, useLocalSearchParams } from 'expo-router';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { PhotoGrid } from '@/components/photo-grid';
import { useColors } from '@/components/ui';
import { fetchAlbum } from '@/lib/photos';

export default function AlbumDetail() {
  const c = useColors();
  const { id, title } = useLocalSearchParams<{ id: string; title?: string }>();
  const viewKey = `album:${id}`;

  const { data, isLoading } = useQuery({
    queryKey: ['assets', viewKey],
    queryFn: () => fetchAlbum(id).then((detail) => ({ assets: detail.assets })),
  });
  const assets = data?.assets ?? [];

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: c.background }]} edges={['top']}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={12} style={styles.back}>
          <Ionicons name="chevron-back" size={24} color={c.primary} />
        </Pressable>
        <Text style={[styles.title, { color: c.text }]} numberOfLines={1}>
          {title || 'Album'}
        </Text>
      </View>

      {isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator color={c.primary} />
        </View>
      ) : assets.length === 0 ? (
        <View style={styles.center}>
          <Text style={{ color: c.textSecondary }}>This album is empty.</Text>
        </View>
      ) : (
        <PhotoGrid assets={assets} view={viewKey} />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 12, paddingTop: 8, paddingBottom: 8 },
  back: { padding: 4 },
  title: { fontSize: 20, fontWeight: '700', flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
});
