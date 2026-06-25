/** Small set of themed primitives so screens read consistently (violet, dark-first). */
import { type ReactNode } from 'react';
import {
  ActivityIndicator,
  Pressable,
  type PressableProps,
  StyleSheet,
  Text,
  TextInput,
  type TextInputProps,
  View,
} from 'react-native';

import { useTheme } from '@/hooks/use-theme';

export const useColors = useTheme;

interface ButtonProps extends Omit<PressableProps, 'children'> {
  title: string;
  loading?: boolean;
  variant?: 'primary' | 'secondary' | 'ghost';
}

export function Button({ title, loading, variant = 'primary', disabled, style, ...rest }: ButtonProps) {
  const c = useColors();
  const isPrimary = variant === 'primary';
  const isGhost = variant === 'ghost';
  const bg = isPrimary ? c.primary : isGhost ? 'transparent' : c.backgroundElement;
  const fg = isPrimary ? c.primaryForeground : c.text;
  const inactive = disabled || loading;

  return (
    <Pressable
      disabled={inactive}
      style={(state) => [
        styles.button,
        { backgroundColor: bg, opacity: inactive ? 0.55 : state.pressed ? 0.85 : 1 },
        typeof style === 'function' ? style(state) : style,
      ]}
      {...rest}
    >
      {loading ? (
        <ActivityIndicator color={fg} />
      ) : (
        <Text style={[styles.buttonText, { color: fg }]}>{title}</Text>
      )}
    </Pressable>
  );
}

interface FieldProps extends TextInputProps {
  label: string;
}

export function Field({ label, style, ...rest }: FieldProps) {
  const c = useColors();
  return (
    <View style={styles.field}>
      <Text style={[styles.label, { color: c.textSecondary }]}>{label}</Text>
      <TextInput
        placeholderTextColor={c.textSecondary}
        style={[
          styles.input,
          { backgroundColor: c.backgroundElement, color: c.text, borderColor: c.border },
          style,
        ]}
        {...rest}
      />
    </View>
  );
}

export function Card({ children, style }: { children: ReactNode; style?: object }) {
  const c = useColors();
  return (
    <View style={[styles.card, { backgroundColor: c.card, borderColor: c.border }, style]}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  button: {
    height: 50,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  buttonText: { fontSize: 16, fontWeight: '600' },
  field: { gap: 7 },
  label: { fontSize: 13, fontWeight: '500', marginLeft: 2 },
  input: {
    height: 50,
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 16,
    fontSize: 16,
  },
  card: { borderRadius: 18, borderWidth: 1, padding: 18 },
});
