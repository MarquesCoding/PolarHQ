import { StyleSheet, View } from 'react-native';

import { DriveList } from '@/components/drive-list';
import { useColors } from '@/components/ui';

export default function Drive() {
  const c = useColors();
  return (
    <View style={[styles.root, { backgroundColor: c.background }]}>
      <DriveList parentId={null} />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
});
