import { Ionicons } from '@expo/vector-icons';
import { FlashList } from '@shopify/flash-list';
import { useQuery } from '@tanstack/react-query';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { type ReactElement, useMemo } from 'react';
import {
  ActivityIndicator,
  FlatList,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
  Pressable,
  StyleSheet,
  Text,
  useWindowDimensions,
  type ViewabilityConfig,
  type ViewToken,
  View,
} from 'react-native';

import { useColors } from '@/components/ui';
import { fetchThumbnailUri, type GridAsset } from '@/lib/photos';

const GAP = 3;
const COLUMNS = 3;
const EDGE = 3;

interface TileProps {
  asset: GridAsset;
  size: number;
  view: string;
  selectionMode?: boolean;
  selected?: boolean;
  onPress?: (asset: GridAsset) => void;
  onLongPress?: (asset: GridAsset) => void;
}

function PhotoTile({ asset, size, view, selectionMode, selected, onPress, onLongPress }: TileProps) {
  const c = useColors();
  const { data: uri, isLoading } = useQuery({
    queryKey: ['thumb', asset.id],
    queryFn: () => fetchThumbnailUri(asset.id, asset.encrypted),
    staleTime: Infinity,
    retry: 1,
  });

  const durationLabel = asset.type === 'video' && asset.durationMs ? formatDuration(asset.durationMs) : null;

  const handlePress = () => {
    if (onPress) {
      onPress(asset);
      return;
    }
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
    });
  };

  return (
    <Pressable
      onPress={handlePress}
      onLongPress={() => onLongPress?.(asset)}
      delayLongPress={220}
      style={({ pressed }) => [
        { width: size, height: size, backgroundColor: c.backgroundElement },
        pressed && !selectionMode && { opacity: 0.7 },
      ]}
    >
      <View style={[styles.tileInner, selected && styles.tileSelected]}>
        {uri ? (
          <Image source={{ uri }} style={{ width: '100%', height: '100%' }} contentFit="cover" transition={200} recyclingKey={asset.id} />
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
          <View style={styles.videoBadge} pointerEvents="none">
            <Ionicons name="play" size={11} color="#fff" />
            {durationLabel ? <Text style={styles.duration}>{durationLabel}</Text> : null}
          </View>
        ) : null}
      </View>
      {selectionMode ? (
        <View style={[styles.check, selected ? { backgroundColor: c.primary, borderColor: c.primary } : styles.checkEmpty]} pointerEvents="none">
          {selected ? <Ionicons name="checkmark" size={14} color="#fff" /> : null}
        </View>
      ) : null}
    </Pressable>
  );
}

const formatDuration = (ms: number): string => {
  const total = Math.round(ms / 1000);
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
};

const monthLabel = (asset: GridAsset): string => {
  const iso = asset.takenAt ?? asset.createdAt;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return 'Earlier';
  return d.toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
};

export type Row = { key: string; header: string } | { key: string; items: GridAsset[]; month: string };

/** Group a timeline-ordered asset list into month-headed rows of 3 for a sectioned list. */
const buildRows = (assets: GridAsset[]): Row[] => {
  const rows: Row[] = [];
  let current = '';
  let bucket: GridAsset[] = [];
  const flush = () => {
    for (let i = 0; i < bucket.length; i += COLUMNS) {
      rows.push({ key: `r-${bucket[i].id}`, items: bucket.slice(i, i + COLUMNS), month: current });
    }
    bucket = [];
  };
  for (const asset of assets) {
    const label = monthLabel(asset);
    if (label !== current) {
      flush();
      current = label;
      rows.push({ key: `h-${label}-${asset.id}`, header: label });
    }
    bucket.push(asset);
  }
  flush();
  return rows;
};

const FLOATING_PAD = 110;

interface PhotoGridProps {
  assets: GridAsset[];
  /** Identifies the list in the query cache so the viewer can swipe through it. */
  view: string;
  /** Group into date sections with month headers (the main timeline). */
  grouped?: boolean;
  onRefresh?: () => void;
  refreshing?: boolean;
  ListHeaderComponent?: ReactElement | null;
  ListEmptyComponent?: ReactElement | null;
  /** Top padding so content clears a floating/auto-hiding header. */
  topInset?: number;
  onScroll?: (e: NativeSyntheticEvent<NativeScrollEvent>) => void;
  onViewableItemsChanged?: (info: { viewableItems: ViewToken<Row>[] }) => void;
  viewabilityConfig?: ViewabilityConfig;
  selectionMode?: boolean;
  selectedIds?: Set<string>;
  onTilePress?: (asset: GridAsset) => void;
  onTileLongPress?: (asset: GridAsset) => void;
}

export function PhotoGrid({
  assets,
  view,
  grouped,
  onRefresh,
  refreshing,
  ListHeaderComponent,
  ListEmptyComponent,
  topInset = 0,
  onScroll,
  onViewableItemsChanged,
  viewabilityConfig,
  selectionMode,
  selectedIds,
  onTilePress,
  onTileLongPress,
}: PhotoGridProps) {
  const c = useColors();
  const { width } = useWindowDimensions();
  const tile = (width - EDGE * 2 - GAP * (COLUMNS - 1)) / COLUMNS;
  const rows = useMemo(() => (grouped ? buildRows(assets) : []), [grouped, assets]);

  const tileProps = (a: GridAsset) => ({
    selectionMode,
    selected: selectedIds?.has(a.id),
    onPress: onTilePress,
    onLongPress: onTileLongPress,
  });

  if (!grouped) {
    return (
      <FlatList
        data={assets}
        keyExtractor={(a) => a.id}
        numColumns={COLUMNS}
        contentContainerStyle={{ padding: EDGE, paddingBottom: FLOATING_PAD }}
        columnWrapperStyle={{ gap: GAP }}
        ItemSeparatorComponent={() => <View style={{ height: GAP }} />}
        renderItem={({ item }) => <PhotoTile asset={item} size={tile} view={view} {...tileProps(item)} />}
        onRefresh={onRefresh}
        refreshing={refreshing}
        ListHeaderComponent={ListHeaderComponent}
        ListEmptyComponent={ListEmptyComponent}
        showsVerticalScrollIndicator={false}
      />
    );
  }

  return (
    <FlashList
      data={rows}
      keyExtractor={(r) => r.key}
      contentContainerStyle={{ paddingHorizontal: EDGE, paddingTop: topInset, paddingBottom: FLOATING_PAD }}
      renderItem={({ item }) =>
        'header' in item ? (
          <Text style={[styles.section, { color: c.text }]}>{item.header}</Text>
        ) : (
          <View style={{ flexDirection: 'row', gap: GAP, marginBottom: GAP }}>
            {item.items.map((a) => (
              <PhotoTile key={a.id} asset={a} size={tile} view={view} {...tileProps(a)} />
            ))}
          </View>
        )
      }
      onScroll={onScroll}
      scrollEventThrottle={16}
      onViewableItemsChanged={onViewableItemsChanged}
      viewabilityConfig={viewabilityConfig}
      onRefresh={onRefresh}
      refreshing={refreshing}
      ListHeaderComponent={ListHeaderComponent}
      ListEmptyComponent={ListEmptyComponent}
      showsVerticalScrollIndicator={false}
    />
  );
}

const styles = StyleSheet.create({
  tileInner: { width: '100%', height: '100%' },
  tileSelected: { transform: [{ scale: 0.86 }], borderRadius: 6, overflow: 'hidden' },
  check: {
    position: 'absolute',
    top: 5,
    right: 5,
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
  },
  checkEmpty: { backgroundColor: 'rgba(0,0,0,0.25)', borderColor: 'rgba(255,255,255,0.9)' },
  placeholder: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  section: { fontSize: 15, fontWeight: '700', paddingTop: 16, paddingBottom: 8, paddingHorizontal: 4 },
  videoBadge: {
    position: 'absolute',
    right: 5,
    bottom: 5,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 5,
    height: 18,
    borderRadius: 9,
    backgroundColor: 'rgba(0,0,0,0.55)',
  },
  duration: { color: '#fff', fontSize: 10, fontWeight: '600' },
});
