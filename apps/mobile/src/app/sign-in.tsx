import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, Text } from 'react-native';

import { AuthLayout } from '@/components/auth-layout';
import { unlockKeys } from '@workspace/core/e2e';

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
    if (err) {
      setBusy(false);
      setError(err.message ?? 'Sign in failed');
      return;
    }
    // The account password is also the E2E password — unlock the keypair now so encrypted content
    // decrypts on entry, with no separate prompt. Retry once in case the session cookie (which the
    // key-bundle fetch needs) hasn't settled the instant sign-in resolves.
    let unlocked = await unlockKeys(password).catch(() => false);
    if (!unlocked) {
      await new Promise((r) => setTimeout(r, 400));
      unlocked = await unlockKeys(password).catch(() => false);
    }
    setBusy(false);
    router.replace('/(tabs)');
  };

  const onChangeServer = async () => {
    await clearServerUrl();
    router.replace('/connect');
  };

  return (
    <AuthLayout
      title="Welcome back"
      tagline="Sign in to your private suite."
      footer={
        <Pressable onPress={onChangeServer} hitSlop={8}>
          <Text style={{ color: c.textSecondary, fontSize: 14, fontWeight: '500' }}>
            Change server
          </Text>
        </Pressable>
      }
    >
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
      {error ? <Text style={{ color: c.destructive, fontSize: 13, marginLeft: 2 }}>{error}</Text> : null}
      <Button title="Sign in" onPress={onSignIn} loading={busy} />
    </AuthLayout>
  );
}
