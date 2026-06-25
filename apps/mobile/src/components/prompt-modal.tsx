import { useEffect, useState } from 'react';
import { Modal, StyleSheet, Text, View } from 'react-native';

import { Button, Field, useColors } from '@/components/ui';

interface PromptModalProps {
  visible: boolean;
  title: string;
  placeholder?: string;
  initialValue?: string;
  confirmLabel?: string;
  onSubmit: (value: string) => void | Promise<void>;
  onCancel: () => void;
}

/** A small text-input dialog (RN's Alert.prompt is iOS-only) for naming folders, renaming, etc. */
export function PromptModal({
  visible,
  title,
  placeholder,
  initialValue = '',
  confirmLabel = 'Save',
  onSubmit,
  onCancel,
}: PromptModalProps) {
  const c = useColors();
  const [value, setValue] = useState(initialValue);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (visible) setValue(initialValue);
  }, [visible, initialValue]);

  const submit = async () => {
    const trimmed = value.trim();
    if (!trimmed) return;
    setBusy(true);
    try {
      await onSubmit(trimmed);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <View style={styles.overlay}>
        <View style={[styles.card, { backgroundColor: c.card, borderColor: c.border }]}>
          <Text style={[styles.title, { color: c.text }]}>{title}</Text>
          <Field
            label=""
            value={value}
            onChangeText={setValue}
            placeholder={placeholder}
            autoFocus
            autoCapitalize="sentences"
            returnKeyType="done"
            onSubmitEditing={submit}
            editable={!busy}
          />
          <View style={styles.actions}>
            <View style={styles.flex}>
              <Button title="Cancel" variant="secondary" onPress={onCancel} disabled={busy} />
            </View>
            <View style={styles.flex}>
              <Button title={confirmLabel} onPress={submit} loading={busy} />
            </View>
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
  card: { width: '100%', maxWidth: 380, borderRadius: 22, borderWidth: 1, padding: 20, gap: 16 },
  title: { fontSize: 18, fontWeight: '700' },
  actions: { flexDirection: 'row', gap: 12 },
  flex: { flex: 1 },
});
