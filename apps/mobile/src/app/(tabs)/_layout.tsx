import { Ionicons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';
import { useEffect } from 'react';
import { e2eReady } from '@workspace/core/e2e';

import { useColors } from '@/components/ui';
import { useLiveSync } from '@/hooks/use-live-sync';

export default function TabsLayout() {
  const c = useColors();

  // Silently restore the cached keypair on launch (it persists in the keychain after the first
  // sign-in unlocks it) so encrypted content decrypts with no prompt. Unlock itself happens at
  // sign-in — the account password is the E2E password.
  useEffect(() => {
    void e2eReady();
  }, []);

  // Live updates: refresh Photos/Drive when changes arrive from other devices.
  useLiveSync();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: c.primary,
        tabBarInactiveTintColor: c.textSecondary,
        tabBarStyle: { backgroundColor: c.card, borderTopColor: c.border },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Photos',
          tabBarIcon: ({ color, size }) => <Ionicons name="images" color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="drive"
        options={{
          title: 'Drive',
          tabBarIcon: ({ color, size }) => <Ionicons name="folder" color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: 'Settings',
          tabBarIcon: ({ color, size }) => <Ionicons name="settings" color={color} size={size} />,
        }}
      />
    </Tabs>
  );
}
