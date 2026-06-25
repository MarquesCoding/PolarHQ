import { Ionicons } from '@expo/vector-icons';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AlbumGrid } from '@/components/album-grid';
import { PhotoGrid } from '@/components/photo-grid';
import { useColors } from '@/components/ui';
import { assetName, fetchAssets, type AssetView } from '@/lib/photos';
import { pickAndUploadPhoto } from '@/lib/upload';

type Tab = AssetView | 'albums';

const TABS: { key: Tab; label: string }[] = [
  { key: 'library', label: 'All' },
  { key: 'albums', label: 'Albums' },
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

function EmptyState({ view, searching }: { view: AssetView; searching: boolean }) {
  const c = useColors();
  const copy = searching
    ? { title: 'No matches', body: 'No photos match that name.' }
    : EMPTY_COPY[view];
  return (
    <View style={styles.empty}>
      <View style={[styles.iconWrap, { backgroundColor: c.backgroundElement }]}>
        <Ionicons name={searching ? 'search' : 'images-outline'} size={34} color={c.primary} />
      </View>
      <Text style={[styles.emptyTitle, { color: c.text }]}>{copy.title}</Text>
      <Text style={[styles.emptyBody, { color: c.textSecondary }]}>{copy.body}</Text>
    </View>
  );
}

export default function Photos() {
  const c = useColors();
  const [tab, setTab] = useState<Tab>('library');
  const [search, setSearch] = useState('');
  const [uploading, setUploading] = useState(false);
  const queryClient = useQueryClient();

  const view = (tab === 'albums' ? 'library' : tab) as AssetView;
  const { data, isLoading, isError, refetch, isRefetching } = useQuery({
    queryKey: ['assets', view],
    queryFn: () => fetchAssets({ view }),
    enabled: tab !== 'albums',
  });

  const query = search.trim().toLowerCase();
  const assets = useMemo(() => {
    const all = data?.assets ?? [];
    if (!query) return all;
    return all.filter((a) => assetName(a).toLowerCase().includes(query));
  }, [data, query]);

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

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: c.background }]} edges={['top']}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: c.text }]}>Photos</Text>
        <Pressable onPress={onAdd} disabled={uploading} hitSlop={10} style={[styles.add, { backgroundColor: c.backgroundElement }]}>
          {uploading ? (
            <ActivityIndicator size="small" color={c.primary} />
          ) : (
            <Ionicons name="add" size={24} color={c.primary} />
          )}
        </Pressable>
      </View>

      <View style={[styles.searchBar, { backgroundColor: c.backgroundElement }]}>
        <Ionicons name="search" size={16} color={c.textSecondary} />
        <TextInput
          value={search}
          onChangeText={setSearch}
          placeholder="Search"
          placeholderTextColor={c.textSecondary}
          autoCapitalize="none"
          autoCorrect={false}
          style={[styles.searchInput, { color: c.text }]}
        />
        {search ? (
          <Pressable onPress={() => setSearch('')} hitSlop={8}>
            <Ionicons name="close-circle" size={16} color={c.textSecondary} />
          </Pressable>
        ) : null}
      </View>

      <View style={styles.pills}>
        {TABS.map((t) => {
          const active = t.key === tab;
          return (
            <Pressable
              key={t.key}
              onPress={() => setTab(t.key)}
              style={[styles.pill, { backgroundColor: active ? c.primary : c.backgroundElement }]}
            >
              <Text style={{ color: active ? c.primaryForeground : c.textSecondary, fontWeight: '600', fontSize: 13 }}>
                {t.label}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {tab === 'albums' ? (
        <AlbumGrid />
      ) : isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator color={c.primary} />
        </View>
      ) : isError ? (
        <View style={styles.center}>
          <Text style={{ color: c.textSecondary }}>Couldn’t load your library.</Text>
        </View>
      ) : assets.length === 0 ? (
        <EmptyState view={view} searching={Boolean(query)} />
      ) : (
        <PhotoGrid assets={assets} view={view} onRefresh={refetch} refreshing={isRefetching} />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 8,
  },
  title: { fontSize: 30, fontWeight: '800' },
  add: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginHorizontal: 16,
    marginBottom: 10,
    paddingHorizontal: 12,
    height: 38,
    borderRadius: 12,
  },
  searchInput: { flex: 1, fontSize: 15, paddingVertical: 0 },
  pills: { flexDirection: 'row', paddingHorizontal: 16, paddingBottom: 12, gap: 8 },
  pill: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 999 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32, gap: 14 },
  iconWrap: { width: 72, height: 72, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  emptyTitle: { fontSize: 18, fontWeight: '700' },
  emptyBody: { fontSize: 14, textAlign: 'center', lineHeight: 20, maxWidth: 300 },
});
