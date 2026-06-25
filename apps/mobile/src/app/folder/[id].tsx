import { useLocalSearchParams } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { DriveList } from '@/components/drive-list';
import { useColors } from '@/components/ui';

export default function Folder() {
  const c = useColors();
  const { id, title } = useLocalSearchParams<{ id: string; title?: string }>();

  return (
    <View style={[styles.root, { backgroundColor: c.background }]}>
      <DriveList parentId={id} title={title || 'Folder'} />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
});
