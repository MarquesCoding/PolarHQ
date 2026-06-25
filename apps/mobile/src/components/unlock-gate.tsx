/**
 * Shows a password prompt whenever the account is enrolled in E2E but the keypair isn't unlocked
 * (a fresh launch with no cached key, or a session that signed in before keys were set up). Unlocking
 * here decrypts everything without forcing a sign-out. Mirrors the web UnlockDialog.
 */
import { Ionicons } from '@expo/vector-icons';
import { useQueryClient } from '@tanstack/react-query';
import { e2eReady, isEnrolled, isUnlocked, unlockKeys } from '@workspace/core/e2e';
import { useEffect, useState } from 'react';
import { Modal, StyleSheet, Text, View } from 'react-native';

import { Button, Field, useColors } from '@/components/ui';

export function UnlockGate() {
  const c = useColors();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void (async () => {
      await e2eReady();
      if (!isUnlocked() && (await isEnrolled().catch(() => false))) setOpen(true);
    })();
  }, []);

  const onUnlock = async () => {
    if (!password) return;
    setBusy(true);
    setError(null);
    const ok = await unlockKeys(password).catch(() => false);
    setBusy(false);
    if (!ok) {
      setError('That password didn’t unlock your keys. Try again.');
      return;
    }
    setPassword('');
    setOpen(false);
    queryClient.invalidateQueries();
  };

  return (
    <Modal visible={open} transparent animationType="fade" onRequestClose={() => undefined}>
      <View style={styles.overlay}>
        <View style={[styles.card, { backgroundColor: c.card, borderColor: c.border }]}>
          <View style={[styles.iconWrap, { backgroundColor: c.backgroundElement }]}>
            <Ionicons name="lock-closed" size={26} color={c.primary} />
          </View>
          <Text style={[styles.title, { color: c.text }]}>Unlock your library</Text>
          <Text style={[styles.body, { color: c.textSecondary }]}>
            Enter your password to decrypt your photos and files on this device.
          </Text>
          <View style={styles.form}>
            <Field
              label="Password"
              value={password}
              onChangeText={setPassword}
              placeholder="••••••••"
              secureTextEntry
              autoCapitalize="none"
              autoFocus
              returnKeyType="go"
              onSubmitEditing={onUnlock}
              editable={!busy}
            />
            {error ? <Text style={{ color: c.destructive, fontSize: 13 }}>{error}</Text> : null}
            <Button title="Unlock" onPress={onUnlock} loading={busy} />
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  card: { width: '100%', maxWidth: 380, borderRadius: 24, borderWidth: 1, padding: 24, gap: 12, alignItems: 'center' },
  iconWrap: { width: 60, height: 60, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 20, fontWeight: '700' },
  body: { fontSize: 14, textAlign: 'center', lineHeight: 20 },
  form: { alignSelf: 'stretch', gap: 14, marginTop: 8 },
});
