import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { ActivityIndicator, FlatList, Pressable, StyleSheet, useWindowDimensions, View } from 'react-native';

import { useColors } from '@/components/ui';
import { fetchThumbnailUri, type GridAsset } from '@/lib/photos';

const GAP = 2;
const COLUMNS = 3;
const EDGE = 2;

function PhotoTile({ asset, size, view }: { asset: GridAsset; size: number; view: string }) {
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
            type: asset.type,
            view,
          },
        })
      }
      style={{ width: size, height: size, backgroundColor: c.backgroundElement }}
    >
      {uri ? (
        <Image source={{ uri }} style={{ width: size, height: size }} contentFit="cover" transition={120} />
      ) : (
        <View style={styles.placeholder}>
          {isLoading ? (
            <ActivityIndicator size="small" color={c.textSecondary} />
          ) : (
            <Ionicons name="lock-closed" size={16} color={c.textSecondary} />
          )}
        </View>
      )}
      {asset.type === 'video' ? (
        <View style={styles.playBadge} pointerEvents="none">
          <Ionicons name="play" size={12} color="#fff" />
        </View>
      ) : null}
    </Pressable>
  );
}

interface PhotoGridProps {
  assets: GridAsset[];
  /** Identifies the list in the query cache so the viewer can swipe through it. */
  view: string;
  onRefresh?: () => void;
  refreshing?: boolean;
  ListHeaderComponent?: React.ComponentProps<typeof FlatList>['ListHeaderComponent'];
}

export function PhotoGrid({ assets, view, onRefresh, refreshing, ListHeaderComponent }: PhotoGridProps) {
  const { width } = useWindowDimensions();
  const tile = (width - EDGE * 2 - GAP * (COLUMNS - 1)) / COLUMNS;

  return (
    <FlatList
      data={assets}
      keyExtractor={(a) => a.id}
      numColumns={COLUMNS}
      contentContainerStyle={{ padding: EDGE }}
      columnWrapperStyle={{ gap: GAP }}
      ItemSeparatorComponent={() => <View style={{ height: GAP }} />}
      renderItem={({ item }) => <PhotoTile asset={item} size={tile} view={view} />}
      onRefresh={onRefresh}
      refreshing={refreshing}
      ListHeaderComponent={ListHeaderComponent}
      showsVerticalScrollIndicator={false}
    />
  );
}

const styles = StyleSheet.create({
  placeholder: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  playBadge: {
    position: 'absolute',
    right: 6,
    bottom: 6,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: 'rgba(0,0,0,0.55)',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
