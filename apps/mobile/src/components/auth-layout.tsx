import { type ReactNode } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';

import { useColors } from '@/components/ui';

const LOGO = require('@/assets/images/logo.png');

interface AuthLayoutProps {
  /** Headline shown on the form sheet. */
  title: string;
  /** Supporting line under the wordmark in the hero. */
  tagline: string;
  children: ReactNode;
  /** Optional row pinned under the form (e.g. "Change server"). */
  footer?: ReactNode;
}

/**
 * Branded entry chrome: a violet gradient hero (logo + wordmark + tagline) flowing into a rounded
 * form sheet. Shared by connect + sign-in so the whole onboarding reads as one polished flow.
 */
export function AuthLayout({ title, tagline, children, footer }: AuthLayoutProps) {
  const c = useColors();
  return (
    <LinearGradient
      colors={['#8b6cfb', '#6d5cf6', '#0b0b14']}
      locations={[0, 0.42, 1]}
      style={styles.fill}
    >
      <KeyboardAvoidingView
        style={styles.fill}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <SafeAreaView edges={['top']} style={styles.hero}>
            <View style={styles.logoWrap}>
              <Image source={LOGO} style={styles.logo} contentFit="contain" />
            </View>
            <Text style={styles.wordmark}>PolarHQ</Text>
            <Text style={styles.tagline}>{tagline}</Text>
          </SafeAreaView>

          <View style={[styles.sheet, { backgroundColor: c.card, borderColor: c.border }]}>
            <Text style={[styles.title, { color: c.text }]}>{title}</Text>
            <View style={styles.form}>{children}</View>
            {footer ? <View style={styles.footer}>{footer}</View> : null}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  scroll: { flexGrow: 1 },
  hero: { alignItems: 'center', paddingTop: 36, paddingBottom: 40, gap: 10 },
  logoWrap: {
    width: 92,
    height: 92,
    borderRadius: 24,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOpacity: 0.35,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 14 },
  },
  logo: { width: 92, height: 92 },
  wordmark: { color: '#fff', fontSize: 30, fontWeight: '800', marginTop: 8, letterSpacing: -0.5 },
  tagline: {
    color: 'rgba(255,255,255,0.82)',
    fontSize: 15,
    textAlign: 'center',
    maxWidth: 280,
    lineHeight: 21,
  },
  sheet: {
    flex: 1,
    minHeight: 360,
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 24,
    paddingTop: 30,
    paddingBottom: 36,
    gap: 22,
  },
  title: { fontSize: 22, fontWeight: '700' },
  form: { gap: 16 },
  footer: { alignItems: 'center', marginTop: 'auto' },
});
