import { Ionicons } from '@expo/vector-icons';
import BottomSheet, {
  BottomSheetBackdrop,
  type BottomSheetBackdropProps,
  BottomSheetScrollView,
} from '@gorhom/bottom-sheet';
import { router, useLocalSearchParams } from 'expo-router';
import { useCallback, useRef } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { formatBytes } from '@workspace/core/format';

import { Card, useColors } from '@/components/ui';

const SNAP_POINTS = ['50%', '88%'];
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
  const insets = useSafeAreaInsets();
  const sheetRef = useRef<BottomSheet>(null);
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

  const renderBackdrop = useCallback(
    (props: BottomSheetBackdropProps) => (
      <BottomSheetBackdrop {...props} appearsOnIndex={0} disappearsOnIndex={-1} opacity={0.5} />
    ),
    [],
  );

  return (
    <BottomSheet
      ref={sheetRef}
      index={0}
      snapPoints={SNAP_POINTS}
      topInset={insets.top}
      enablePanDownToClose
      onClose={() => router.back()}
      handleIndicatorStyle={{ backgroundColor: c.border }}
      backgroundStyle={{ backgroundColor: c.background }}
      backdropComponent={renderBackdrop}
    >
      <BottomSheetScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.head}>
          <Text style={[styles.title, { color: c.text }]}>Details</Text>
          <Pressable onPress={() => sheetRef.current?.close()} hitSlop={12}>
            <Text style={[styles.doneText, { color: c.primary }]}>Done</Text>
          </Pressable>
        </View>

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
      </BottomSheetScrollView>
    </BottomSheet>
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
  flex: { flex: 1 },
  content: { paddingHorizontal: 20, paddingTop: 2, paddingBottom: 30, gap: 16 },
  head: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 2 },
  title: { fontSize: 20, fontWeight: '700' },
  doneText: { fontSize: 16, fontWeight: '600' },
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
