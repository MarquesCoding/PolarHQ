import 'react-native-get-random-values';

import { QueryClientProvider } from '@tanstack/react-query';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useColorScheme } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { Colors } from '@/constants/theme';
import { bootstrapCore } from '@/lib/bootstrap';
import { queryClient } from '@/lib/query';

bootstrapCore();

export default function RootLayout() {
  const scheme = useColorScheme() === 'light' ? 'light' : 'dark';
  const background = Colors[scheme].background;

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <QueryClientProvider client={queryClient}>
          <StatusBar style={scheme === 'light' ? 'dark' : 'light'} />
          <Stack
            screenOptions={{
              headerShown: false,
              contentStyle: { backgroundColor: background },
              animation: 'fade',
            }}
          >
            <Stack.Screen name="index" />
            <Stack.Screen name="connect" />
            <Stack.Screen name="sign-in" />
            <Stack.Screen name="(tabs)" />
            <Stack.Screen name="photo/[id]" options={{ animation: 'fade' }} />
          </Stack>
        </QueryClientProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
