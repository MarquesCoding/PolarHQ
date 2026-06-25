import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { type ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Tappable } from '@/components/ui/tappable';
import { useColors } from '@/components/ui';
import { authClient } from '@/lib/auth';

/** Shared height of the floating top bar across Photos/Albums/Drive. */
export const TOP_BAR_H = 50;

/** Top inset every scroll view should use so content clears the floating bar. */
export const useTopInset = () => useSafeAreaInsets().top + TOP_BAR_H;

/** A circular top-bar action button (e.g. add / new folder), matching the Photos `+`. */
export function TopBarButton({ icon, onPress }: { icon: keyof typeof Ionicons.glyphMap; onPress: () => void }) {
  const c = useColors();
  return (
    <Tappable onPress={onPress} style={[styles.btn, { backgroundColor: c.backgroundElement }]}>
      <Ionicons name={icon} size={23} color={c.primary} />
    </Tappable>
  );
}

/**
 * Transparent floating top bar: buttons float over the content (no panel), at a consistent height
 * and position across every tab. `left` fills the leading slot (else a spacer); `children` are
 * trailing actions; the account avatar always sits at the far right.
 */
export function FloatingTopBar({
  left,
  children,
  showAvatar = true,
}: {
  left?: ReactNode;
  children?: ReactNode;
  showAvatar?: boolean;
}) {
  const c = useColors();
  const insets = useSafeAreaInsets();
  const { data: session } = authClient.useSession();
  const initial = (session?.user?.email ?? '?').trim().charAt(0).toUpperCase();

  return (
    <View style={[styles.bar, { paddingTop: insets.top, height: insets.top + TOP_BAR_H }]} pointerEvents="box-none">
      <View style={styles.inner} pointerEvents="box-none">
        {left ?? <View style={styles.flex} />}
        {children}
        {showAvatar ? (
          <Tappable onPress={() => router.push('/account')} haptic="selection" style={[styles.avatar, { backgroundColor: c.primary }]}>
            <Text style={styles.avatarText}>{initial}</Text>
          </Tappable>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: { position: 'absolute', top: 0, left: 0, right: 0 },
  inner: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 16 },
  flex: { flex: 1 },
  btn: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  avatar: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: '#fff', fontSize: 15, fontWeight: '700' },
});
