/** Batch actions for multi-selected photos: favourite, add-to-album, download, trash. */
import * as Haptics from 'expo-haptics';
import * as MediaLibrary from 'expo-media-library/legacy';
import { Alert, Platform } from 'react-native';

import { showActionSheet, type MenuAction } from '@/lib/action-menu';
import {
  addToAlbum,
  createAlbum,
  decryptOriginalToFile,
  favoriteAssets,
  fetchAlbums,
  trashAssets,
  type GridAsset,
} from '@/lib/photos';
import { queryClient } from '@/lib/query';

const invalidate = () => queryClient.invalidateQueries({ queryKey: ['assets'] });

export const batchFavorite = async (ids: string[]): Promise<void> => {
  void Haptics.selectionAsync();
  await favoriteAssets(ids, true).catch(() => undefined);
  invalidate();
};

export const batchTrash = (ids: string[], onDone: () => void): void => {
  showActionSheet(
    [
      {
        label: `Move ${ids.length} to Trash`,
        destructive: true,
        onPress: async () => {
          void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
          await trashAssets(ids).catch(() => undefined);
          invalidate();
          onDone();
        },
      },
    ],
    'They will move to Trash; you can restore them within 30 days.',
  );
};

export const batchAddToAlbum = async (ids: string[], onDone: () => void): Promise<void> => {
  const albums = await fetchAlbums().catch(() => []);
  const add = async (albumId: string) => {
    await addToAlbum(albumId, ids).catch(() => undefined);
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    onDone();
  };
  const actions: MenuAction[] = albums.map((al) => ({ label: al.name, onPress: () => void add(al.id) }));
  if (Platform.OS === 'ios') {
    actions.push({
      label: 'New album…',
      onPress: () =>
        Alert.prompt?.('New album', 'Name your album', async (name) => {
          const trimmed = name?.trim();
          if (!trimmed) return;
          const album = await createAlbum(trimmed).catch(() => null);
          if (album?.id) await add(album.id);
        }),
    });
  }
  if (!actions.length) {
    Alert.alert('No albums yet', 'Create an album first to add photos to it.');
    return;
  }
  showActionSheet(actions, 'Add to album');
};

/** Decrypt + save each selected original to the device camera roll. Returns how many saved. */
export const batchDownload = async (
  assets: GridAsset[],
  onProgress?: (done: number, total: number) => void,
): Promise<number> => {
  const perm = await MediaLibrary.requestPermissionsAsync();
  if (!perm.granted) {
    Alert.alert('Allow photo access', 'Enable photo library access to save originals to this device.');
    return 0;
  }
  let done = 0;
  for (const a of assets) {
    try {
      const uri = await decryptOriginalToFile(a.id, a.encrypted, a.mimeType);
      if (uri) await MediaLibrary.saveToLibraryAsync(uri);
    } catch {
      /* skip this asset */
    }
    done += 1;
    onProgress?.(done, assets.length);
  }
  void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  return done;
};
