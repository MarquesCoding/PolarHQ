import { router } from 'expo-router';
import { useState } from 'react';
import { Text } from 'react-native';

import { AuthLayout } from '@/components/auth-layout';
import { Button, Field, useColors } from '@/components/ui';
import { normalizeServerUrl, saveServerUrl } from '@/lib/config';

/** Reachability check: a self-hosted PolarHQ server answers this with app metadata. */
const probe = async (url: string): Promise<boolean> => {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 6000);
  try {
    const res = await fetch(`${url}/api/v1/apps`, { signal: controller.signal });
    return res.ok || res.status === 401;
  } catch {
    return false;
  } finally {
    clearTimeout(timer);
  }
};

export default function Connect() {
  const c = useColors();
  const [value, setValue] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onConnect = async () => {
    const url = normalizeServerUrl(value);
    if (!url) {
      setError('Enter your server address');
      return;
    }
    setBusy(true);
    setError(null);
    const reachable = await probe(url);
    if (!reachable) {
      setBusy(false);
      setError("Couldn't reach that server. Check the address and try again.");
      return;
    }
    await saveServerUrl(url);
    setBusy(false);
    router.replace('/sign-in');
  };

  return (
    <AuthLayout
      title="Connect your server"
      tagline="Your digital life, under your control."
    >
      <Field
        label="Server address"
        value={value}
        onChangeText={setValue}
        placeholder="https://cloud.example.com"
        autoCapitalize="none"
        autoCorrect={false}
        keyboardType="url"
        inputMode="url"
        returnKeyType="go"
        onSubmitEditing={onConnect}
        editable={!busy}
      />
      {error ? <Text style={{ color: c.destructive, fontSize: 13, marginLeft: 2 }}>{error}</Text> : null}
      <Button title="Connect" onPress={onConnect} loading={busy} />
    </AuthLayout>
  );
}
