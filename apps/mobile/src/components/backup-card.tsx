import { useEffect, useState } from 'react';
import { Alert, StyleSheet, Switch, Text, View } from 'react-native';

import { Button, Card, useColors } from '@/components/ui';
import { registerBackgroundSync, unregisterBackgroundSync } from '@/lib/background-sync';
import {
  backedUpCount,
  isBackupEnabled,
  runBackup,
  setBackupEnabled,
  type BackupProgress,
} from '@/lib/backup';

export function BackupCard() {
  const c = useColors();
  const [enabled, setEnabled] = useState(isBackupEnabled());
  const [count, setCount] = useState(0);
  const [progress, setProgress] = useState<BackupProgress | null>(null);

  useEffect(() => {
    void backedUpCount().then(setCount);
  }, [progress?.running]);

  const start = async () => {
    const result = await runBackup(setProgress);
    if (result === 'denied') Alert.alert('Permission needed', 'Allow photo library access to back up.');
    else if (result === 'locked') Alert.alert('Locked', 'Sign in to unlock encryption before backing up.');
    else if (result === 'nothing') Alert.alert('All backed up', 'Your photos are already backed up.');
    void backedUpCount().then(setCount);
  };

  const onToggle = async (value: boolean) => {
    setEnabled(value);
    await setBackupEnabled(value);
    if (value) {
      void registerBackgroundSync();
      void start();
    } else {
      void unregisterBackgroundSync();
    }
  };

  const running = progress?.running ?? false;

  return (
    <Card>
      <View style={styles.row}>
        <View style={styles.flex}>
          <Text style={[styles.title, { color: c.text }]}>Back up my photos</Text>
          <Text style={[styles.sub, { color: c.textSecondary }]}>
            Encrypt and upload new photos from this device automatically.
          </Text>
        </View>
        <Switch
          value={enabled}
          onValueChange={onToggle}
          trackColor={{ true: c.primary, false: c.backgroundElement }}
        />
      </View>

      <View style={[styles.divider, { backgroundColor: c.border }]} />

      <Text style={[styles.status, { color: c.textSecondary }]}>
        {running
          ? `Backing up ${progress?.done ?? 0} of ${progress?.total ?? 0}…`
          : `${count} photo${count === 1 ? '' : 's'} backed up from this device`}
      </Text>

      <Button title="Back up now" variant="secondary" onPress={start} loading={running} />
    </Card>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  flex: { flex: 1, gap: 3 },
  title: { fontSize: 15, fontWeight: '600' },
  sub: { fontSize: 13, lineHeight: 18 },
  divider: { height: StyleSheet.hairlineWidth, marginVertical: 4 },
  status: { fontSize: 13 },
});
