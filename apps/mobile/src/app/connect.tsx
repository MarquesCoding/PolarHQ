import { router } from 'expo-router';
import { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

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
    <SafeAreaView style={[styles.safe, { backgroundColor: c.background }]}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.hero}>
            <View style={[styles.badge, { backgroundColor: c.primary }]}>
              <Text style={styles.badgeText}>P</Text>
            </View>
            <Text style={[styles.title, { color: c.text }]}>Connect to PolarHQ</Text>
            <Text style={[styles.subtitle, { color: c.textSecondary }]}>
              Point the app at your own server to get started.
            </Text>
          </View>

          <View style={styles.form}>
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
            {error ? <Text style={[styles.error, { color: c.destructive }]}>{error}</Text> : null}
            <Button title="Connect" onPress={onConnect} loading={busy} />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  flex: { flex: 1 },
  content: { flexGrow: 1, justifyContent: 'center', padding: 24, gap: 36 },
  hero: { alignItems: 'center', gap: 12 },
  badge: { width: 64, height: 64, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  badgeText: { color: '#fff', fontSize: 32, fontWeight: '800' },
  title: { fontSize: 26, fontWeight: '700', marginTop: 8 },
  subtitle: { fontSize: 15, textAlign: 'center', lineHeight: 21 },
  form: { gap: 16 },
  error: { fontSize: 13, marginLeft: 2 },
});
