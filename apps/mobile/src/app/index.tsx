import { Redirect } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, View } from 'react-native';

import { useColors } from '@/components/ui';
import { authClient } from '@/lib/auth';
import { bootstrapServerUrl } from '@/lib/config';

/**
 * Entry gate. Reads the saved server URL synchronously (so core is configured before the session
 * fetch fires), then routes: no server → connect, server but no session → sign-in, else → app.
 */
export default function Index() {
  const [serverUrl] = useState(() => bootstrapServerUrl());
  const { data: session, isPending } = authClient.useSession();
  const c = useColors();

  if (!serverUrl) return <Redirect href="/connect" />;
  if (isPending) {
    return (
      <View
        style={{
          flex: 1,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: c.background,
        }}
      >
        <ActivityIndicator color={c.primary} />
      </View>
    );
  }
  if (!session) return <Redirect href="/sign-in" />;
  return <Redirect href="/(tabs)" />;
}
