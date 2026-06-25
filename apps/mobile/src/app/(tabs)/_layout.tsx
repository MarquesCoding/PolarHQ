import { MaterialIcons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';
import { NativeTabs } from 'expo-router/unstable-native-tabs';
import { useEffect } from 'react';
import { Platform } from 'react-native';
import { e2eReady } from '@workspace/core/e2e';

import { FloatingTabBar } from '@/components/floating-tab-bar';
import { useColors } from '@/components/ui';
import { useLiveSync } from '@/hooks/use-live-sync';
import { isBackupEnabled, runBackup } from '@/lib/backup';

const { Trigger } = NativeTabs;
const { Icon, Label, VectorIcon } = Trigger;

export default function TabsLayout() {
  const c = useColors();

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

  // iOS: the real UITabBar — Liquid Glass on iOS 26, minimizes on scroll, native search tab.
  if (Platform.OS === 'ios') {
    return (
      <NativeTabs tintColor={c.primary} minimizeBehavior="onScrollDown">
        <Trigger name="index">
          <Icon sf="photo.stack" src={<VectorIcon family={MaterialIcons} name="photo-library" />} />
          <Label>Photos</Label>
        </Trigger>
        <Trigger name="albums">
          <Icon sf="rectangle.stack" src={<VectorIcon family={MaterialIcons} name="photo-album" />} />
          <Label>Albums</Label>
        </Trigger>
        <Trigger name="drive">
          <Icon sf="folder" src={<VectorIcon family={MaterialIcons} name="folder" />} />
          <Label>Drive</Label>
        </Trigger>
        <Trigger name="search" role="search">
          <Icon sf="magnifyingglass" src={<VectorIcon family={MaterialIcons} name="search" />} />
          <Label>Search</Label>
        </Trigger>
      </NativeTabs>
    );
  }

  // Android: our custom floating Google-style pill (RN), with the search circle beside it.
  return (
    <Tabs screenOptions={{ headerShown: false }} tabBar={(props) => <FloatingTabBar {...props} />}>
      <Tabs.Screen name="index" />
      <Tabs.Screen name="albums" />
      <Tabs.Screen name="drive" />
      <Tabs.Screen name="search" />
    </Tabs>
  );
}
