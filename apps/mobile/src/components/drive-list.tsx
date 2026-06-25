import { Ionicons } from '@expo/vector-icons';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import * as Haptics from 'expo-haptics';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Alert, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';

import { FloatingTopBar, TopBarButton, useTopInset } from '@/components/floating-top-bar';
import { PromptModal } from '@/components/prompt-modal';
import { Tappable } from '@/components/ui/tappable';
import { useColors } from '@/components/ui';
import { showActionSheet } from '@/lib/action-menu';
import { fetchDriveThumbnailUri } from '@/lib/photos';
import {
  createDriveFolder,
  decryptNodeName,
  fetchNodes,
  renameDriveNode,
  trashDriveNode,
  type DriveNode,
} from '@/lib/drive';

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
  onRename,
  onDelete,
}: {
  node: DriveNode;
  onRename: (n: DriveNode) => void;
  onDelete: (n: DriveNode) => void;
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
    if (isFolder) {
      router.push({ pathname: '/folder/[id]', params: { id: node.id, title: node.name } });
    } else if (node.photoAssetId) {
      router.push({
        pathname: '/photo/[id]',
        params: { id: node.photoAssetId, encrypted: node.encrypted ? '1' : '0', mime: node.mimeType ?? 'image/jpeg' },
      });
    }
  };

  const onLongPress = () => {
    void Haptics.selectionAsync();
    showActionSheet(
      [
        { label: 'Rename', onPress: () => onRename(node) },
        { label: 'Delete', destructive: true, onPress: () => onDelete(node) },
      ],
      node.name,
    );
  };

  return (
    <Pressable onPress={onPress} onLongPress={onLongPress} style={styles.row}>
      <View style={[styles.iconWrap, { backgroundColor: c.backgroundElement }]}>
        {thumbUri ? (
          <>
            <Image source={{ uri: thumbUri }} style={styles.thumb} contentFit="cover" transition={140} />
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
        {!isFolder ? (
          <Text style={[styles.meta, { color: c.textSecondary }]}>{formatSize(node.sizeBytes)}</Text>
        ) : null}
      </View>
      {isFolder ? <Ionicons name="chevron-forward" size={18} color={c.textSecondary} /> : null}
    </Pressable>
  );
}

type Prompt = { mode: 'new' } | { mode: 'rename'; node: DriveNode };

export function DriveList({ parentId, title }: { parentId: string | null; title?: string }) {
  const c = useColors();
  const queryClient = useQueryClient();
  const topInset = useTopInset();
  const [prompt, setPrompt] = useState<Prompt | null>(null);
  const openNewFolder = () => setPrompt({ mode: 'new' });

  const { data, isLoading, isError, refetch, isRefetching } = useQuery({
    queryKey: ['nodes', parentId ?? 'root'],
    queryFn: () => fetchNodes(parentId),
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['nodes', parentId ?? 'root'] });

  const onDelete = (node: DriveNode) => {
    Alert.alert('Move to trash?', `“${node.name}” will be moved to the trash.`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          await trashDriveNode(node.id).catch(() => undefined);
          invalidate();
        },
      },
    ]);
  };

  const onSubmitPrompt = async (value: string) => {
    if (prompt?.mode === 'new') await createDriveFolder(parentId, value).catch(() => undefined);
    else if (prompt?.mode === 'rename') await renameDriveNode(prompt.node.id, value).catch(() => undefined);
    setPrompt(null);
    invalidate();
  };

  const children = (data?.children ?? [])
    .map(decryptNodeName)
    .sort((a, b) => {
      if (a.kind !== b.kind) return a.kind === 'folder' ? -1 : 1;
      return a.name.localeCompare(b.name);
    });

  const body = isLoading ? (
    <View style={[styles.center, { paddingTop: topInset }]}>
      <ActivityIndicator color={c.primary} />
    </View>
  ) : isError ? (
    <View style={[styles.center, { paddingTop: topInset }]}>
      <Text style={{ color: c.textSecondary }}>Couldn’t load this folder.</Text>
    </View>
  ) : children.length === 0 ? (
    <View style={[styles.center, { paddingTop: topInset }]}>
      <Ionicons name="folder-open-outline" size={40} color={c.textSecondary} />
      <Text style={[styles.emptyText, { color: c.textSecondary }]}>This folder is empty</Text>
    </View>
  ) : (
    <FlatList
      data={children}
      keyExtractor={(n) => n.id}
      renderItem={({ item }) => <Row node={item} onRename={(n) => setPrompt({ mode: 'rename', node: n })} onDelete={onDelete} />}
      contentContainerStyle={{ paddingTop: topInset, paddingBottom: 120 }}
      ItemSeparatorComponent={() => <View style={[styles.sep, { backgroundColor: c.border }]} />}
      onRefresh={refetch}
      refreshing={isRefetching}
    />
  );

  return (
    <View style={styles.fill}>
      {body}

      {title ? (
        <FloatingTopBar
          showAvatar={false}
          left={
            <Tappable onPress={() => router.back()} haptic="selection" style={styles.back}>
              <Ionicons name="chevron-back" size={24} color={c.primary} />
              <Text style={[styles.folderTitle, { color: c.text }]} numberOfLines={1}>
                {title}
              </Text>
            </Tappable>
          }
        >
          <TopBarButton icon="add" onPress={openNewFolder} />
        </FloatingTopBar>
      ) : (
        <FloatingTopBar>
          <TopBarButton icon="add" onPress={openNewFolder} />
        </FloatingTopBar>
      )}

      <PromptModal
        visible={prompt !== null}
        title={prompt?.mode === 'rename' ? 'Rename' : 'New folder'}
        placeholder={prompt?.mode === 'rename' ? 'New name' : 'Folder name'}
        initialValue={prompt?.mode === 'rename' ? prompt.node.name : ''}
        confirmLabel={prompt?.mode === 'rename' ? 'Rename' : 'Create'}
        onSubmit={onSubmitPrompt}
        onCancel={() => setPrompt(null)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 10 },
  emptyText: { fontSize: 14 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingHorizontal: 18, paddingVertical: 11 },
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
  back: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 2 },
  folderTitle: { fontSize: 19, fontWeight: '700', flexShrink: 1 },
});
