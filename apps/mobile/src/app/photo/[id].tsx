import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { Image } from 'expo-image';
import { router, useLocalSearchParams } from 'expo-router';
import { useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
  Pressable,
  StyleSheet,
  useWindowDimensions,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { favoriteAssets, fetchOriginalUri, trashAssets, type GridAsset } from '@/lib/photos';
import { queryClient } from '@/lib/query';

interface Item {
  id: string;
  encrypted: boolean;
  mime: string;
  favorite: boolean;
}

function Page({ item, width, height }: { item: Item; width: number; height: number }) {
  const { data: uri } = useQuery({
    queryKey: ['original', item.id],
    queryFn: () => fetchOriginalUri(item.id, item.encrypted, item.mime),
    staleTime: 5 * 60 * 1000,
  });
  const thumb = queryClient.getQueryData<string | null>(['thumb', item.id]);
  const source = uri ?? thumb ?? undefined;

  return (
    <View style={{ width, height, alignItems: 'center', justifyContent: 'center' }}>
      {source ? (
        <Image source={{ uri: source }} style={{ width, height }} contentFit="contain" transition={120} />
      ) : (
        <ActivityIndicator color="#fff" />
      )}
    </View>
  );
}

export default function PhotoViewer() {
  const params = useLocalSearchParams<{
    id: string;
    encrypted?: string;
    mime?: string;
    fav?: string;
    view?: string;
  }>();
  const { width, height } = useWindowDimensions();

  // Pull the list the photo was opened from (Photos grid) so the viewer can swipe between items.
  // Falls back to a single item (e.g. opened from Drive) when there's no list in cache.
  const list = queryClient.getQueryData<{ assets: GridAsset[] }>(['assets', params.view ?? 'library']);
  const items: Item[] = list?.assets.length
    ? list.assets.map((a) => ({ id: a.id, encrypted: a.encrypted, mime: a.mimeType, favorite: a.isFavorite }))
    : [{ id: params.id, encrypted: params.encrypted === '1', mime: params.mime ?? 'image/jpeg', favorite: params.fav === '1' }];

  const startIndex = Math.max(0, items.findIndex((i) => i.id === params.id));
  const [index, setIndex] = useState(startIndex);
  const [favOverrides, setFavOverrides] = useState<Record<string, boolean>>({});
  const listRef = useRef<FlatList<Item>>(null);

  const current = items[index] ?? items[0];
  const favorite = favOverrides[current.id] ?? current.favorite;

  const onScrollEnd = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const next = Math.round(e.nativeEvent.contentOffset.x / width);
    if (next !== index) setIndex(next);
  };

  const onToggleFavorite = async () => {
    const next = !favorite;
    setFavOverrides((m) => ({ ...m, [current.id]: next }));
    await favoriteAssets([current.id], next).catch(() => undefined);
    queryClient.invalidateQueries({ queryKey: ['assets'] });
  };

  const onTrash = async () => {
    await trashAssets([current.id]).catch(() => undefined);
    queryClient.invalidateQueries({ queryKey: ['assets'] });
    router.back();
  };

  return (
    <View style={styles.root}>
      <FlatList
        ref={listRef}
        data={items}
        keyExtractor={(i) => i.id}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        initialScrollIndex={startIndex}
        getItemLayout={(_, i) => ({ length: width, offset: width * i, index: i })}
        onMomentumScrollEnd={onScrollEnd}
        renderItem={({ item }) => <Page item={item} width={width} height={height} />}
        windowSize={3}
        maxToRenderPerBatch={3}
      />

      <SafeAreaView style={styles.chrome} edges={['top', 'bottom']} pointerEvents="box-none">
        <Pressable onPress={() => router.back()} hitSlop={12} style={styles.close}>
          <Ionicons name="chevron-down" size={26} color="#fff" />
        </Pressable>
        <View style={styles.actions}>
          <Pressable onPress={onToggleFavorite} hitSlop={12} style={styles.action}>
            <Ionicons
              name={favorite ? 'heart' : 'heart-outline'}
              size={26}
              color={favorite ? '#fb5e7e' : '#fff'}
            />
          </Pressable>
          <Pressable onPress={onTrash} hitSlop={12} style={styles.action}>
            <Ionicons name="trash-outline" size={24} color="#fff" />
          </Pressable>
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#000' },
  chrome: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, justifyContent: 'space-between' },
  close: {
    margin: 12,
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(0,0,0,0.45)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  actions: { flexDirection: 'row', justifyContent: 'center', gap: 28, paddingBottom: 12 },
  action: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: 'rgba(0,0,0,0.45)',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
