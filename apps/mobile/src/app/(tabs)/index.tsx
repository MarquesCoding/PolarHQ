import { Ionicons } from '@expo/vector-icons';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { PhotoGrid } from '@/components/photo-grid';
import { useColors } from '@/components/ui';
import { useBackupStatus } from '@/hooks/use-backup-status';
import { authClient } from '@/lib/auth';
import { fetchAssets } from '@/lib/photos';
import { pickAndUploadPhoto } from '@/lib/upload';

export default function Photos() {
  const c = useColors();
  const queryClient = useQueryClient();
  const backup = useBackupStatus();
  const { data: session } = authClient.useSession();
  const initial = (session?.user?.email ?? '?').trim().charAt(0).toUpperCase();
  const [uploading, setUploading] = useState(false);

  const { data, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['assets', 'library'],
    queryFn: () => fetchAssets({ view: 'library' }),
  });
  const assets = data?.assets ?? [];

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

  const remaining = backup?.running ? Math.max(0, backup.total - backup.done) : 0;

  const header = (
    <View style={styles.topRow}>
      {backup?.running ? (
        <View style={[styles.backupPill, { backgroundColor: c.backgroundElement }]}>
          <ActivityIndicator size="small" color={c.primary} />
          <Text style={[styles.backupText, { color: c.text }]}>Backing up {remaining}</Text>
        </View>
      ) : (
        <View style={{ flex: 1 }} />
      )}
      <Pressable onPress={onAdd} disabled={uploading} hitSlop={10} style={[styles.add, { backgroundColor: c.backgroundElement }]}>
        {uploading ? <ActivityIndicator size="small" color={c.primary} /> : <Ionicons name="add" size={24} color={c.primary} />}
      </Pressable>
      <Pressable onPress={() => router.push('/account')} hitSlop={8} style={[styles.avatar, { backgroundColor: c.primary }]}>
        <Text style={styles.avatarText}>{initial}</Text>
      </Pressable>
    </View>
  );

  const empty = isLoading ? (
    <View style={styles.center}>
      <ActivityIndicator color={c.primary} />
    </View>
  ) : (
    <View style={styles.emptyState}>
      <View style={[styles.iconWrap, { backgroundColor: c.backgroundElement }]}>
        <Ionicons name="images-outline" size={34} color={c.primary} />
      </View>
      <Text style={[styles.emptyTitle, { color: c.text }]}>Your library, end to end</Text>
      <Text style={[styles.emptyBody, { color: c.textSecondary }]}>
        Photos you add on any device show up here, decrypted on this one.
      </Text>
    </View>
  );

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: c.background }]} edges={['top']}>
      <PhotoGrid
        assets={assets}
        view="library"
        grouped
        onRefresh={refetch}
        refreshing={isRefetching}
        ListHeaderComponent={header}
        ListEmptyComponent={empty}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  topRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 16, paddingTop: 6, paddingBottom: 12 },
  backupPill: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8, paddingLeft: 10, paddingRight: 14, height: 36, borderRadius: 18, alignSelf: 'flex-start' },
  backupText: { fontSize: 14, fontWeight: '600' },
  add: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  avatar: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: '#fff', fontSize: 15, fontWeight: '700' },
  center: { paddingTop: 120, alignItems: 'center' },
  emptyState: { paddingTop: 100, alignItems: 'center', padding: 32, gap: 14 },
  iconWrap: { width: 72, height: 72, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  emptyTitle: { fontSize: 18, fontWeight: '700' },
  emptyBody: { fontSize: 14, textAlign: 'center', lineHeight: 20, maxWidth: 300 },
});
