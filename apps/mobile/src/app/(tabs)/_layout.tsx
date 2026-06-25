import { Ionicons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';

import { useColors } from '@/components/ui';

export default function TabsLayout() {
  const c = useColors();
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
        name="settings"
        options={{
          title: 'Settings',
          tabBarIcon: ({ color, size }) => <Ionicons name="settings" color={color} size={size} />,
        }}
      />
    </Tabs>
  );
}
