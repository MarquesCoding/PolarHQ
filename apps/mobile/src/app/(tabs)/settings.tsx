import { router } from 'expo-router';
import { useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Constants from 'expo-constants';
import { coreConfig } from '@workspace/core/config';
import { lockKeys } from '@workspace/core/e2e';

import { BackupCard } from '@/components/backup-card';
import { Button, Card, useColors } from '@/components/ui';
import { authClient } from '@/lib/auth';
import { clearServerUrl } from '@/lib/config';

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

export default function Settings() {
  const c = useColors();
  const { data: session } = authClient.useSession();
  const [busy, setBusy] = useState(false);

  const onSignOut = async () => {
    setBusy(true);
    lockKeys();
    await authClient.signOut();
    setBusy(false);
    router.replace('/');
  };

  const onDisconnect = async () => {
    setBusy(true);
    await authClient.signOut().catch(() => undefined);
    await clearServerUrl();
    setBusy(false);
    router.replace('/connect');
  };

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: c.background }]} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={[styles.title, { color: c.text }]}>Settings</Text>

        <Card>
          <Row label="Account" value={session?.user?.email ?? 'Not signed in'} />
          <View style={[styles.divider, { backgroundColor: c.border }]} />
          <Row label="Server" value={coreConfig().apiUrl} />
          <View style={[styles.divider, { backgroundColor: c.border }]} />
          <Row
            label="Version"
            value={`v${Constants.expoConfig?.version ?? '0.5.0'} · mobile`}
          />
        </Card>

        <BackupCard />

        <View style={styles.actions}>
          <Button title="Sign out" variant="secondary" onPress={onSignOut} loading={busy} />
          <Button title="Disconnect server" variant="ghost" onPress={onDisconnect} disabled={busy} />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  content: { padding: 20, gap: 24 },
  title: { fontSize: 30, fontWeight: '800' },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 16, paddingVertical: 10 },
  rowLabel: { fontSize: 14 },
  rowValue: { fontSize: 14, fontWeight: '600', flexShrink: 1 },
  divider: { height: StyleSheet.hairlineWidth },
  actions: { gap: 12 },
});
