import { router } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { DriveList } from '@/components/drive-list';
import { useColors } from '@/components/ui';
import { authClient } from '@/lib/auth';

export default function Drive() {
  const c = useColors();
  const { data: session } = authClient.useSession();
  const initial = (session?.user?.email ?? '?').trim().charAt(0).toUpperCase();

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: c.background }]} edges={['top']}>
      <DriveList
        parentId={null}
        header={
          <View style={styles.header}>
            <View style={{ flex: 1 }} />
            <Pressable onPress={() => router.push('/account')} hitSlop={8} style={[styles.avatar, { backgroundColor: c.primary }]}>
              <Text style={styles.avatarText}>{initial}</Text>
            </Pressable>
          </View>
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingTop: 6, paddingBottom: 10 },
  avatar: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: '#fff', fontSize: 15, fontWeight: '700' },
});
