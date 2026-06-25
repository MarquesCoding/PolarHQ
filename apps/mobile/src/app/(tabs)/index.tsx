import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useColors } from '@/components/ui';

export default function Photos() {
  const c = useColors();
  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: c.background }]} edges={['top']}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: c.text }]}>Photos</Text>
      </View>

      <View style={styles.empty}>
        <View style={[styles.iconWrap, { backgroundColor: c.backgroundElement }]}>
          <Ionicons name="images-outline" size={34} color={c.primary} />
        </View>
        <Text style={[styles.emptyTitle, { color: c.text }]}>Your library, end to end</Text>
        <Text style={[styles.emptyBody, { color: c.textSecondary }]}>
          Photo sync arrives in the next build — once your keypair unlocks on device, every
          thumbnail decrypts right here.
        </Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  header: { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 4 },
  title: { fontSize: 30, fontWeight: '800' },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32, gap: 14 },
  iconWrap: { width: 72, height: 72, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  emptyTitle: { fontSize: 18, fontWeight: '700' },
  emptyBody: { fontSize: 14, textAlign: 'center', lineHeight: 20, maxWidth: 300 },
});
