import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';

import { useColors } from '@/components/ui';
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

function Row({ node }: { node: DriveNode }) {
  const c = useColors();
  const isFolder = node.kind === 'folder';

  const onPress = () => {
    if (isFolder) {
      router.push({ pathname: '/folder/[id]', params: { id: node.id, title: node.name } });
    } else if (node.photoAssetId) {
      router.push({
        pathname: '/photo/[id]',
        params: { id: node.photoAssetId, encrypted: node.encrypted ? '1' : '0', mime: node.mimeType ?? 'image/jpeg' },
      });
    }
  };

  return (
    <Pressable onPress={onPress} style={styles.row}>
      <View style={[styles.iconWrap, { backgroundColor: c.backgroundElement }]}>
        <Ionicons name={iconFor(node)} size={20} color={isFolder ? c.primary : c.textSecondary} />
      </View>
      <View style={styles.rowText}>
        <Text style={[styles.name, { color: c.text }]} numberOfLines={1}>
          {node.name}
        </Text>
        {!isFolder ? (
          <Text style={[styles.meta, { color: c.textSecondary }]}>{formatSize(node.sizeBytes)}</Text>
        ) : null}
      </View>
      {isFolder ? <Ionicons name="chevron-forward" size={18} color={c.textSecondary} /> : null}
    </Pressable>
  );
}

export function DriveList({ parentId }: { parentId: string | null }) {
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
      <View style={styles.center}>
        <ActivityIndicator color={c.primary} />
      </View>
    );
  }
  if (isError) {
    return (
      <View style={styles.center}>
        <Text style={{ color: c.textSecondary }}>Couldn’t load this folder.</Text>
      </View>
    );
  }
  if (children.length === 0) {
    return (
      <View style={styles.center}>
        <Ionicons name="folder-open-outline" size={40} color={c.textSecondary} />
        <Text style={[styles.emptyText, { color: c.textSecondary }]}>This folder is empty</Text>
      </View>
    );
  }

  return (
    <FlatList
      data={children}
      keyExtractor={(n) => n.id}
      renderItem={({ item }) => <Row node={item} />}
      contentContainerStyle={{ paddingVertical: 6 }}
      ItemSeparatorComponent={() => <View style={[styles.sep, { backgroundColor: c.border }]} />}
      onRefresh={refetch}
      refreshing={isRefetching}
    />
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 10 },
  emptyText: { fontSize: 14 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingHorizontal: 18, paddingVertical: 11 },
  iconWrap: { width: 40, height: 40, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  rowText: { flex: 1, gap: 2 },
  name: { fontSize: 15, fontWeight: '500' },
  meta: { fontSize: 12 },
  sep: { height: StyleSheet.hairlineWidth, marginLeft: 72 },
});
