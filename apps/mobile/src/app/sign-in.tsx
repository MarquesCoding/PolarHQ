import { router } from 'expo-router';
import { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button, Field, useColors } from '@/components/ui';
import { authClient } from '@/lib/auth';
import { clearServerUrl } from '@/lib/config';

export default function SignIn() {
  const c = useColors();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onSignIn = async () => {
    if (!email.trim() || !password) {
      setError('Enter your email and password');
      return;
    }
    setBusy(true);
    setError(null);
    const { error: err } = await authClient.signIn.email({ email: email.trim(), password });
    setBusy(false);
    if (err) {
      setError(err.message ?? 'Sign in failed');
      return;
    }
    router.replace('/(tabs)');
  };

  const onChangeServer = async () => {
    await clearServerUrl();
    router.replace('/connect');
  };

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: c.background }]}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <View style={styles.hero}>
            <Text style={[styles.title, { color: c.text }]}>Welcome back</Text>
            <Text style={[styles.subtitle, { color: c.textSecondary }]}>
              Sign in to your PolarHQ account.
            </Text>
          </View>

          <View style={styles.form}>
            <Field
              label="Email"
              value={email}
              onChangeText={setEmail}
              placeholder="you@example.com"
              autoCapitalize="none"
              autoComplete="email"
              autoCorrect={false}
              keyboardType="email-address"
              inputMode="email"
              editable={!busy}
            />
            <Field
              label="Password"
              value={password}
              onChangeText={setPassword}
              placeholder="••••••••"
              secureTextEntry
              autoCapitalize="none"
              returnKeyType="go"
              onSubmitEditing={onSignIn}
              editable={!busy}
            />
            {error ? <Text style={[styles.error, { color: c.destructive }]}>{error}</Text> : null}
            <Button title="Sign in" onPress={onSignIn} loading={busy} />
          </View>

          <Pressable onPress={onChangeServer} hitSlop={8} style={styles.changeServer}>
            <Text style={[styles.changeServerText, { color: c.textSecondary }]}>
              Change server
            </Text>
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  flex: { flex: 1 },
  content: { flexGrow: 1, justifyContent: 'center', padding: 24, gap: 32 },
  hero: { alignItems: 'center', gap: 8 },
  title: { fontSize: 26, fontWeight: '700' },
  subtitle: { fontSize: 15, textAlign: 'center' },
  form: { gap: 16 },
  error: { fontSize: 13, marginLeft: 2 },
  changeServer: { alignSelf: 'center', paddingVertical: 8 },
  changeServerText: { fontSize: 14, fontWeight: '500' },
});
