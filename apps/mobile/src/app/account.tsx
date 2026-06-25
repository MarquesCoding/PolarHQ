import { Ionicons } from '@expo/vector-icons';
import BottomSheet, {
  BottomSheetBackdrop,
  type BottomSheetBackdropProps,
  BottomSheetScrollView,
} from '@gorhom/bottom-sheet';
import { useQuery } from '@tanstack/react-query';
import Constants from 'expo-constants';
import { router } from 'expo-router';
import { useCallback, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { coreConfig } from '@workspace/core/config';
import { lockKeys } from '@workspace/core/e2e';
import { formatBytes } from '@workspace/core/format';
import { fetchUsage } from '@workspace/core/photos';

import { BackupCard } from '@/components/backup-card';
import { Button, Card, useColors } from '@/components/ui';
import { authClient } from '@/lib/auth';
import { clearServerUrl } from '@/lib/config';

const SNAP_POINTS = ['62%', '100%'];

export default function Account() {
  const c = useColors();
  const insets = useSafeAreaInsets();
  const sheetRef = useRef<BottomSheet>(null);
  const { data: session } = authClient.useSession();
  const [busy, setBusy] = useState(false);

  const email = session?.user?.email ?? '';
  const rawName = session?.user?.name?.trim() || email.split('@')[0] || 'there';
  const firstWord = rawName.split(/[ ._-]+/)[0] || 'there';
  const firstName = firstWord.charAt(0).toUpperCase() + firstWord.slice(1);
  const initial = (email || '?').charAt(0).toUpperCase();

  const { data: usage } = useQuery({ queryKey: ['usage'], queryFn: fetchUsage });
  const pct = usage?.quotaBytes ? Math.min(100, Math.round((usage.usedBytes / usage.quotaBytes) * 100)) : null;

  const onSignOut = async () => {
    setBusy(true);
    lockKeys();
    await authClient.signOut();
    router.replace('/');
  };
  const onDisconnect = async () => {
    setBusy(true);
    await authClient.signOut().catch(() => undefined);
    await clearServerUrl();
    router.replace('/connect');
  };

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
          <View style={styles.flex} />
          <Pressable onPress={() => sheetRef.current?.close()} hitSlop={12}>
            <Text style={[styles.doneText, { color: c.primary }]}>Done</Text>
          </Pressable>
        </View>

        <View style={styles.hero}>
          <View style={[styles.avatar, { backgroundColor: c.primary }]}>
            <Text style={styles.avatarText}>{initial}</Text>
          </View>
          <Text style={[styles.greeting, { color: c.text }]}>Hi, {firstName}!</Text>
          <Text style={[styles.email, { color: c.textSecondary }]} numberOfLines={1}>
            {email}
          </Text>
        </View>

        <Card>
          <View style={styles.storageTop}>
            <Ionicons name="cloud" size={20} color={c.primary} />
            <Text style={[styles.storagePct, { color: c.text }]}>
              {pct !== null ? `${pct}% of ${formatBytes(usage!.quotaBytes!)} used` : usage ? `${formatBytes(usage.usedBytes)} used` : 'Storage'}
            </Text>
          </View>
          <View style={[styles.track, { backgroundColor: c.backgroundElement }]}>
            <View style={[styles.fill, { backgroundColor: c.primary, width: `${pct ?? 0}%` }]} />
          </View>
          {usage ? (
            <Text style={[styles.storageSub, { color: c.textSecondary }]}>
              {formatBytes(usage.usedBytes)}
              {usage.quotaBytes ? ` of ${formatBytes(usage.quotaBytes)}` : ''}
            </Text>
          ) : null}
        </Card>

        <Text style={[styles.section, { color: c.textSecondary }]}>More from PolarHQ</Text>
        <BackupCard />

        <Card>
          <Row label="Server" value={coreConfig().apiUrl} />
          <View style={[styles.divider, { backgroundColor: c.border }]} />
          <Row label="Version" value={`v${Constants.expoConfig?.version ?? '0.5.0'} · mobile`} />
        </Card>

        <View style={styles.actions}>
          <Button title="Sign out" variant="secondary" onPress={onSignOut} loading={busy} />
          <Button title="Disconnect server" variant="ghost" onPress={onDisconnect} disabled={busy} />
        </View>
      </BottomSheetScrollView>
    </BottomSheet>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  const c = useColors();
  return (
    <View style={styles.row}>
      <Text style={[styles.rowLabel, { color: c.textSecondary }]}>{label}</Text>
      <Text style={[styles.rowValue, { color: c.text }]} numberOfLines={1}>
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: 20, paddingTop: 2, paddingBottom: 40, gap: 18 },
  head: { flexDirection: 'row', alignItems: 'center' },
  flex: { flex: 1 },
  doneText: { fontSize: 16, fontWeight: '600' },
  hero: { alignItems: 'center', gap: 8 },
  avatar: { width: 72, height: 72, borderRadius: 36, alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: '#fff', fontSize: 30, fontWeight: '700' },
  greeting: { fontSize: 22, fontWeight: '700' },
  email: { fontSize: 14, marginTop: 2 },
  storageTop: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  storagePct: { fontSize: 16, fontWeight: '700' },
  track: { height: 6, borderRadius: 3, overflow: 'hidden', marginTop: 12 },
  fill: { height: '100%', borderRadius: 3 },
  storageSub: { fontSize: 13, marginTop: 8 },
  section: { fontSize: 13, fontWeight: '600', marginTop: 4, marginLeft: 4 },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 16, paddingVertical: 10 },
  rowLabel: { fontSize: 14 },
  rowValue: { fontSize: 14, fontWeight: '600', flexShrink: 1 },
  divider: { height: StyleSheet.hairlineWidth },
  actions: { gap: 12, marginTop: 4 },
});
