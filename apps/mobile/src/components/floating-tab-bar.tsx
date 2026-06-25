import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import { useEffect } from 'react';
import { Pressable, StyleSheet, Text, useColorScheme, useWindowDimensions, View } from 'react-native';
import Animated, {
  FadeIn,
  FadeOut,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useColors } from '@/components/ui';

const TABS: Record<string, { icon: keyof typeof Ionicons.glyphMap; label: string }> = {
  index: { icon: 'images', label: 'Photos' },
  albums: { icon: 'albums', label: 'Albums' },
  drive: { icon: 'folder', label: 'Drive' },
};

const PADDING = 6;
const PILL_H = 46;
const FAB = 52;

interface TabState {
  index: number;
  routes: { key: string; name: string }[];
}
interface TabNavigation {
  emit: (event: { type: 'tabPress'; target: string; canPreventDefault: true }) => { defaultPrevented: boolean };
  navigate: (name: string) => void;
}
interface TabBarProps {
  state: TabState;
  navigation: TabNavigation;
}

/** Floating bottom bar (Google-Photos influence): fixed-width pill nav where every tab shows its
 *  label and only the active tab reveals its icon, with a violet background that slides smoothly
 *  between tabs (no bounce). A separate search circle sits beside it. */
export function FloatingTabBar({ state, navigation }: TabBarProps) {
  const c = useColors();
  const scheme = useColorScheme() === 'light' ? 'light' : 'dark';
  const glass = scheme === 'dark' ? 'rgba(20,20,28,0.55)' : 'rgba(255,255,255,0.62)';
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();

  const tabs = state.routes.filter((r) => TABS[r.name]);
  const barWidth = Math.min(width - 24 - FAB - 10, 300);
  const slot = (barWidth - PADDING * 2) / tabs.length;

  const x = useSharedValue(state.index * slot);
  useEffect(() => {
    x.value = withTiming(state.index * slot, { duration: 240 });
  }, [state.index, slot, x]);
  const indicatorStyle = useAnimatedStyle(() => ({ transform: [{ translateX: x.value }] }));

  return (
    <View style={[styles.wrap, { bottom: Math.max(insets.bottom, 10) }]} pointerEvents="box-none">
      <View style={styles.group}>
        <View style={[styles.barShadow, { width: barWidth }]}>
          <BlurView
            intensity={48}
            tint={scheme}
            style={[styles.bar, { borderColor: c.border, backgroundColor: glass }]}
          >
            <Animated.View
              style={[styles.indicator, { width: slot, backgroundColor: c.primary }, indicatorStyle]}
              pointerEvents="none"
            />
            {tabs.map((route, index) => {
              const meta = TABS[route.name];
              const active = state.index === index;
              const onPress = () => {
                const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
                if (active) return;
                void Haptics.selectionAsync();
                if (!event.defaultPrevented) navigation.navigate(route.name);
              };
              return (
                <Pressable key={route.key} onPress={onPress} hitSlop={4} style={styles.tab}>
                  {active ? (
                    <Animated.View entering={FadeIn.duration(160)} exiting={FadeOut.duration(100)}>
                      <Ionicons name={meta.icon} size={19} color={c.primaryForeground} />
                    </Animated.View>
                  ) : null}
                  <Text
                    style={[styles.label, { color: active ? c.primaryForeground : c.textSecondary }]}
                    numberOfLines={1}
                  >
                    {meta.label}
                  </Text>
                </Pressable>
              );
            })}
          </BlurView>
        </View>

        <View style={styles.fabShadow}>
          <BlurView intensity={48} tint={scheme} style={[styles.fab, { borderColor: c.border, backgroundColor: glass }]}>
            <Pressable
              onPress={() => {
                void Haptics.selectionAsync();
                router.push('/search');
              }}
              style={styles.fabPress}
            >
              <Ionicons name="search" size={21} color={c.text} />
            </Pressable>
          </BlurView>
        </View>
      </View>
    </View>
  );
}

const FLOAT_SHADOW = {
  shadowColor: '#000',
  shadowOpacity: 0.32,
  shadowRadius: 18,
  shadowOffset: { width: 0, height: 8 },
  elevation: 12,
} as const;

const styles = StyleSheet.create({
  wrap: { position: 'absolute', left: 0, right: 0, alignItems: 'center' },
  group: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  barShadow: { borderRadius: 30, ...FLOAT_SHADOW },
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: PADDING,
    borderRadius: 30,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
  },
  indicator: { position: 'absolute', left: PADDING, top: PADDING, height: PILL_H, borderRadius: PILL_H / 2 },
  tab: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, height: PILL_H },
  label: { fontSize: 13.5, fontWeight: '600' },
  fabShadow: { borderRadius: FAB / 2, ...FLOAT_SHADOW },
  fab: {
    width: FAB,
    height: FAB,
    borderRadius: FAB / 2,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
  },
  fabPress: { width: FAB, height: FAB, alignItems: 'center', justifyContent: 'center' },
});
