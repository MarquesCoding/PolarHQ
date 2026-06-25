import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { PhotoGrid } from '@/components/photo-grid';
import { useColors } from '@/components/ui';
import { assetName, fetchAssets } from '@/lib/photos';

export default function Search() {
  const c = useColors();
  const [q, setQ] = useState('');
  const { data } = useQuery({ queryKey: ['assets', 'library'], queryFn: () => fetchAssets({ view: 'library' }) });

  const query = q.trim().toLowerCase();
  const results = useMemo(() => {
    if (!query) return [];
    return (data?.assets ?? []).filter((a) => assetName(a).toLowerCase().includes(query));
  }, [data, query]);

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: c.background }]} edges={['top']}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={12} style={styles.back}>
          <Ionicons name="chevron-back" size={24} color={c.primary} />
        </Pressable>
        <View style={[styles.searchBar, { backgroundColor: c.backgroundElement }]}>
          <Ionicons name="search" size={16} color={c.textSecondary} />
          <TextInput
            value={q}
            onChangeText={setQ}
            placeholder="Search your photos"
            placeholderTextColor={c.textSecondary}
            autoFocus
            autoCapitalize="none"
            autoCorrect={false}
            style={[styles.input, { color: c.text }]}
          />
          {q ? (
            <Pressable onPress={() => setQ('')} hitSlop={8}>
              <Ionicons name="close-circle" size={16} color={c.textSecondary} />
            </Pressable>
          ) : null}
        </View>
      </View>

      {!query ? (
        <View style={styles.center}>
          <Ionicons name="search" size={34} color={c.textSecondary} />
          <Text style={[styles.hint, { color: c.textSecondary }]}>Search photos by name</Text>
        </View>
      ) : results.length === 0 ? (
        <View style={styles.center}>
          <Text style={{ color: c.textSecondary }}>No photos match “{q.trim()}”.</Text>
        </View>
      ) : (
        <PhotoGrid assets={results} view="library" />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingTop: 8, paddingBottom: 10 },
  back: { padding: 4 },
  searchBar: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 12, height: 40, borderRadius: 12 },
  input: { flex: 1, fontSize: 15, paddingVertical: 0 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 10 },
  hint: { fontSize: 14 },
});
