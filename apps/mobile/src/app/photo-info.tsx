import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { formatBytes } from '@workspace/core/format';

import { Card, useColors } from '@/components/ui';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function formatDateTime(iso?: string): { date: string; time: string } | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  const date = `${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
  const hh = String(d.getHours()).padStart(2, '0');
  const mm = String(d.getMinutes()).padStart(2, '0');
  return { date, time: `${hh}:${mm}` };
}

function iconForType(type?: string, mime?: string): keyof typeof Ionicons.glyphMap {
  if (type === 'video' || mime?.startsWith('video/')) return 'videocam';
  if (type === 'audio' || mime?.startsWith('audio/')) return 'musical-notes';
  return 'image';
}

export default function PhotoInfo() {
  const c = useColors();
  const p = useLocalSearchParams<{
    name?: string;
    takenAt?: string;
    sizeBytes?: string;
    width?: string;
    height?: string;
    mime?: string;
    type?: string;
    encrypted?: string;
  }>();

  const dt = formatDateTime(p.takenAt);
  const w = p.width ? Number(p.width) : null;
  const h = p.height ? Number(p.height) : null;
  const mp = w && h ? (w * h) / 1_000_000 : null;
  const size = p.sizeBytes ? Number(p.sizeBytes) : null;

  return (
    <View style={[styles.root, { backgroundColor: c.background }]}>
      <View style={styles.head}>
        <Text style={[styles.title, { color: c.text }]}>Details</Text>
        <Pressable onPress={() => router.back()} hitSlop={10}>
          <Text style={[styles.done, { color: c.primary }]}>Done</Text>
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Card>
          <View style={styles.fileRow}>
            <View style={[styles.iconWrap, { backgroundColor: c.backgroundElement }]}>
              <Ionicons name={iconForType(p.type, p.mime)} size={22} color={c.primary} />
            </View>
            <View style={styles.flex}>
              <Text style={[styles.fileName, { color: c.text }]} numberOfLines={2}>
                {p.name || 'Untitled'}
              </Text>
              {p.mime ? <Text style={[styles.fileMime, { color: c.textSecondary }]}>{p.mime}</Text> : null}
            </View>
          </View>
        </Card>

        <Card>
          {dt ? <Row icon="calendar-outline" label="Date" value={`${dt.date} · ${dt.time}`} /> : null}
          {w && h ? (
            <Row icon="resize-outline" label="Dimensions" value={`${w} × ${h}${mp ? `  ·  ${mp.toFixed(1)} MP` : ''}`} />
          ) : null}
          {size ? <Row icon="document-outline" label="Size" value={formatBytes(size)} /> : null}
        </Card>

        {p.encrypted === '1' ? (
          <View style={styles.e2e}>
            <Ionicons name="lock-closed" size={14} color={c.textSecondary} />
            <Text style={[styles.e2eText, { color: c.textSecondary }]}>End-to-end encrypted</Text>
          </View>
        ) : null}
      </ScrollView>
    </View>
  );
}

function Row({ icon, label, value }: { icon: keyof typeof Ionicons.glyphMap; label: string; value: string }) {
  const c = useColors();
  return (
    <View style={styles.row}>
      <Ionicons name={icon} size={18} color={c.textSecondary} />
      <Text style={[styles.rowLabel, { color: c.textSecondary }]}>{label}</Text>
      <Text style={[styles.rowValue, { color: c.text }]} numberOfLines={1}>
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  flex: { flex: 1 },
  head: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 16, paddingBottom: 8 },
  title: { fontSize: 20, fontWeight: '700' },
  done: { fontSize: 16, fontWeight: '600' },
  content: { paddingHorizontal: 20, paddingBottom: 30, gap: 16 },
  fileRow: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  iconWrap: { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  fileName: { fontSize: 15, fontWeight: '600' },
  fileMime: { fontSize: 12, marginTop: 2 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 11 },
  rowLabel: { fontSize: 14, width: 92 },
  rowValue: { fontSize: 14, fontWeight: '600', flex: 1, textAlign: 'right' },
  e2e: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: 2 },
  e2eText: { fontSize: 12 },
});
