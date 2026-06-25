import { Tabs } from 'expo-router';
import { useEffect } from 'react';
import { e2eReady } from '@workspace/core/e2e';

import { FloatingTabBar } from '@/components/floating-tab-bar';
import { useLiveSync } from '@/hooks/use-live-sync';
import { isBackupEnabled, runBackup } from '@/lib/backup';

export default function TabsLayout() {
  // Silently restore the cached keypair on launch (it persists in the keychain after the first
  // sign-in unlocks it) so encrypted content decrypts with no prompt. Unlock itself happens at
  // sign-in — the account password is the E2E password. Then auto-backup any new photos if on.
  useEffect(() => {
    void (async () => {
      await e2eReady();
      if (isBackupEnabled()) void runBackup();
    })();
  }, []);

  // Live updates: refresh Photos/Drive when changes arrive from other devices.
  useLiveSync();

  return (
    <Tabs screenOptions={{ headerShown: false }} tabBar={(props) => <FloatingTabBar {...props} />}>
      <Tabs.Screen name="index" />
      <Tabs.Screen name="albums" />
      <Tabs.Screen name="drive" />
    </Tabs>
  );
}
