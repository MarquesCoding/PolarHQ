import { StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { DriveList } from '@/components/drive-list';
import { useColors } from '@/components/ui';

export default function Drive() {
  const c = useColors();
  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: c.background }]} edges={['top']}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: c.text }]}>Drive</Text>
      </View>
      <DriveList parentId={null} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  header: { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 8 },
  title: { fontSize: 30, fontWeight: '800' },
});
