import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { type ReactElement, useMemo } from 'react';
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';

import { useColors } from '@/components/ui';
import { fetchThumbnailUri, type GridAsset } from '@/lib/photos';

const GAP = 3;
const COLUMNS = 3;
const EDGE = 3;

function PhotoTile({ asset, size, view }: { asset: GridAsset; size: number; view: string }) {
  const c = useColors();
  const { data: uri, isLoading } = useQuery({
    queryKey: ['thumb', asset.id],
    queryFn: () => fetchThumbnailUri(asset.id, asset.encrypted),
    staleTime: Infinity,
    retry: 1,
  });

  const durationLabel = asset.type === 'video' && asset.durationMs ? formatDuration(asset.durationMs) : null;

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
      style={({ pressed }) => [
        { width: size, height: size, backgroundColor: c.backgroundElement },
        pressed && { opacity: 0.7 },
      ]}
    >
      {uri ? (
        <Image source={{ uri }} style={{ width: size, height: size }} contentFit="cover" transition={200} />
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

type Row = { key: string; header: string } | { key: string; items: GridAsset[] };

/** Group a timeline-ordered asset list into month-headed rows of 3 for a sectioned FlatList. */
const buildRows = (assets: GridAsset[]): Row[] => {
  const rows: Row[] = [];
  let current = '';
  let bucket: GridAsset[] = [];
  const flush = () => {
    for (let i = 0; i < bucket.length; i += COLUMNS) {
      rows.push({ key: `r-${bucket[i].id}`, items: bucket.slice(i, i + COLUMNS) });
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

interface PhotoGridProps {
  assets: GridAsset[];
  /** Identifies the list in the query cache so the viewer can swipe through it. */
  view: string;
  /** Group into date sections with month headers (the main timeline). */
  grouped?: boolean;
  onRefresh?: () => void;
  refreshing?: boolean;
  ListHeaderComponent?: ReactElement | null;
}

export function PhotoGrid({ assets, view, grouped, onRefresh, refreshing, ListHeaderComponent }: PhotoGridProps) {
  const c = useColors();
  const { width } = useWindowDimensions();
  const tile = (width - EDGE * 2 - GAP * (COLUMNS - 1)) / COLUMNS;
  const rows = useMemo(() => (grouped ? buildRows(assets) : []), [grouped, assets]);

  if (!grouped) {
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

  return (
    <FlatList
      data={rows}
      keyExtractor={(r) => r.key}
      contentContainerStyle={{ paddingHorizontal: EDGE, paddingBottom: 12 }}
      renderItem={({ item }) =>
        'header' in item ? (
          <Text style={[styles.section, { color: c.text }]}>{item.header}</Text>
        ) : (
          <View style={{ flexDirection: 'row', gap: GAP, marginBottom: GAP }}>
            {item.items.map((a) => (
              <PhotoTile key={a.id} asset={a} size={tile} view={view} />
            ))}
          </View>
        )
      }
      onRefresh={onRefresh}
      refreshing={refreshing}
      ListHeaderComponent={ListHeaderComponent}
      showsVerticalScrollIndicator={false}
    />
  );
}

const styles = StyleSheet.create({
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
