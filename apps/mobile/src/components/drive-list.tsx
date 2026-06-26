import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import * as Haptics from 'expo-haptics';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';

import { useColors } from '@/components/ui';
import { downloadAndShareDriveFile } from '@/lib/drive-files';
import { fetchDriveThumbnailUri } from '@/lib/photos';
import { decryptNodeName, fetchNodes, type DriveNode } from '@/lib/drive';

const iconFor = (node: DriveNode): keyof typeof Ionicons.glyphMap => {
  if (node.kind === 'folder') return 'folder';
  const mime = node.mimeType ?? '';
  if (mime.startsWith('image/')) return 'image';
  if (mime.startsWith('video/')) return 'videocam';
  if (mime.startsWith('audio/')) return 'musical-notes';
  if (mime.includes('pdf')) return 'document-text';
  if (mime.includes('sheet') || mime.includes('excel')) return 'grid';
  if (mime.includes('zip') || mime.includes('compressed')) return 'archive';
  return 'document';
};

const formatSize = (bytes: number | null): string => {
  if (!bytes) return '';
  const units = ['B', 'KB', 'MB', 'GB'];
  let n = bytes;
  let i = 0;
  while (n >= 1024 && i < units.length - 1) {
    n /= 1024;
    i += 1;
  }
  return `${n.toFixed(n < 10 && i > 0 ? 1 : 0)} ${units[i]}`;
};

function Row({
  node,
  onOpenFolder,
  selectionMode,
  selected,
  onToggle,
  onEnterSelect,
}: {
  node: DriveNode;
  onOpenFolder: (n: DriveNode) => void;
  selectionMode?: boolean;
  selected?: boolean;
  onToggle: (n: DriveNode) => void;
  onEnterSelect: (n: DriveNode) => void;
}) {
  const c = useColors();
  const isFolder = node.kind === 'folder';
  const mime = node.mimeType ?? '';
  const isVideo = mime.startsWith('video/');
  const hasThumb = !isFolder && (node.thumbnailUrl != null || mime.startsWith('image/') || isVideo);

  const { data: thumbUri } = useQuery({
    queryKey: ['drive-thumb', node.id],
    queryFn: () => fetchDriveThumbnailUri(node.id, node.encrypted ?? false),
    enabled: hasThumb,
    staleTime: Infinity,
  });

  const onPress = () => {
    if (selectionMode) {
      onToggle(node);
    } else if (isFolder) {
      onOpenFolder(node);
    } else if (node.photoAssetId) {
      router.push({
        pathname: '/photo/[id]',
        params: { id: node.photoAssetId, encrypted: node.encrypted ? '1' : '0', mime: node.mimeType ?? 'image/jpeg' },
      });
    } else {
      void downloadAndShareDriveFile(node).catch(() => undefined);
    }
  };

  const onLongPress = () => {
    if (selectionMode) onToggle(node);
    else onEnterSelect(node);
  };

  return (
    <Pressable onPress={onPress} onLongPress={onLongPress} delayLongPress={220} style={styles.row}>
      {selectionMode ? (
        <View
          style={[styles.check, selected ? { backgroundColor: c.primary, borderColor: c.primary } : { borderColor: c.border }]}
        >
          {selected ? <Ionicons name="checkmark" size={14} color="#fff" /> : null}
        </View>
      ) : null}
      <View style={[styles.iconWrap, { backgroundColor: c.backgroundElement }]}>
        {thumbUri ? (
          <>
            <Image source={{ uri: thumbUri }} style={styles.thumb} contentFit="cover" transition={140} recyclingKey={node.id} />
            {isVideo ? (
              <View style={styles.playBadge}>
                <Ionicons name="play" size={9} color="#fff" />
              </View>
            ) : null}
          </>
        ) : (
          <Ionicons name={iconFor(node)} size={20} color={isFolder ? c.primary : c.textSecondary} />
        )}
      </View>
      <View style={styles.rowText}>
        <Text style={[styles.name, { color: c.text }]} numberOfLines={1}>
          {node.name}
        </Text>
        {!isFolder ? <Text style={[styles.meta, { color: c.textSecondary }]}>{formatSize(node.sizeBytes)}</Text> : null}
      </View>
      {isFolder ? <Ionicons name="chevron-forward" size={18} color={c.textSecondary} /> : null}
    </Pressable>
  );
}

/** The list contents of one Drive folder — no top bar (the Drive screen owns the persistent bar). */
export function DriveContent({
  parentId,
  topInset,
  onOpenFolder,
  selectionMode,
  selectedIds,
  onToggle,
  onEnterSelect,
}: {
  parentId: string | null;
  topInset: number;
  onOpenFolder: (node: DriveNode) => void;
  selectionMode?: boolean;
  selectedIds?: Set<string>;
  onToggle: (node: DriveNode) => void;
  onEnterSelect: (node: DriveNode) => void;
}) {
  const c = useColors();

  const { data, isLoading, isError, refetch, isRefetching } = useQuery({
    queryKey: ['nodes', parentId ?? 'root'],
    queryFn: () => fetchNodes(parentId),
  });

  const children = (data?.children ?? [])
    .map(decryptNodeName)
    .sort((a, b) => {
      if (a.kind !== b.kind) return a.kind === 'folder' ? -1 : 1;
      return a.name.localeCompare(b.name);
    });

  if (isLoading) {
    return (
      <View style={[styles.loading, { paddingTop: topInset + 40 }]}>
        <ActivityIndicator color={c.primary} />
      </View>
    );
  }
  if (isError) {
    return (
      <View style={[styles.center, { paddingTop: topInset }]}>
        <Text style={{ color: c.textSecondary }}>Couldn’t load this folder.</Text>
      </View>
    );
  }
  if (children.length === 0) {
    return (
      <View style={[styles.center, { paddingTop: topInset }]}>
        <Ionicons name="folder-open-outline" size={40} color={c.textSecondary} />
        <Text style={[styles.emptyText, { color: c.textSecondary }]}>This folder is empty</Text>
      </View>
    );
  }

  return (
    <FlatList
      data={children}
      keyExtractor={(n) => n.id}
      renderItem={({ item }) => (
        <Row
          node={item}
          onOpenFolder={onOpenFolder}
          selectionMode={selectionMode}
          selected={selectedIds?.has(item.id)}
          onToggle={onToggle}
          onEnterSelect={onEnterSelect}
        />
      )}
      contentContainerStyle={{ paddingTop: topInset, paddingBottom: 120 }}
      ItemSeparatorComponent={() => <View style={[styles.sep, { backgroundColor: c.border }]} />}
      onRefresh={refetch}
      refreshing={isRefetching}
    />
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  loading: { alignItems: 'center' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 10 },
  emptyText: { fontSize: 14 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingHorizontal: 18, paddingVertical: 11 },
  check: { width: 22, height: 22, borderRadius: 11, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
  iconWrap: { width: 40, height: 40, borderRadius: 11, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  thumb: { width: 40, height: 40 },
  playBadge: {
    position: 'absolute',
    right: 3,
    bottom: 3,
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: 'rgba(0,0,0,0.55)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowText: { flex: 1, gap: 2 },
  name: { fontSize: 15, fontWeight: '500' },
  meta: { fontSize: 12 },
  sep: { height: StyleSheet.hairlineWidth, marginLeft: 72 },
});
