import { Ionicons } from '@expo/vector-icons';
import { useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { runOnJS, SlideInLeft, SlideInRight, useSharedValue } from 'react-native-reanimated';

import { DriveContent } from '@/components/drive-list';
import { FloatingTopBar, TopBarButton, useTopInset } from '@/components/floating-top-bar';
import { PromptModal } from '@/components/prompt-modal';
import { Tappable } from '@/components/ui/tappable';
import { useColors } from '@/components/ui';
import { createDriveFolder, type DriveNode } from '@/lib/drive';

interface Crumb {
  id: string | null;
  title: string;
}

export default function Drive() {
  const c = useColors();
  const queryClient = useQueryClient();
  const topInset = useTopInset();
  const [stack, setStack] = useState<Crumb[]>([{ id: null, title: '' }]);
  const [dir, setDir] = useState<'forward' | 'back'>('forward');
  const [newFolder, setNewFolder] = useState(false);

  const current = stack[stack.length - 1];
  const canPop = stack.length > 1;
  const startX = useSharedValue(0);

  const push = (node: DriveNode) => {
    setDir('forward');
    setStack((s) => [...s, { id: node.id, title: node.name }]);
  };
  const pop = () => {
    setDir('back');
    setStack((s) => (s.length > 1 ? s.slice(0, -1) : s));
  };

  const onCreate = async (value: string) => {
    await createDriveFolder(current.id, value).catch(() => undefined);
    setNewFolder(false);
    queryClient.invalidateQueries({ queryKey: ['nodes', current.id ?? 'root'] });
  };

  // Edge back-swipe: a rightward drag from the left edge pops the folder.
  const backSwipe = Gesture.Pan()
    .enabled(canPop)
    .activeOffsetX(20)
    .failOffsetY([-12, 12])
    .onBegin((e) => {
      startX.value = e.absoluteX;
    })
    .onEnd((e) => {
      if (startX.value < 44 && e.translationX > 80) runOnJS(pop)();
    });

  return (
    <View style={[styles.root, { backgroundColor: c.background }]}>
      <GestureDetector gesture={backSwipe}>
        <View style={StyleSheet.absoluteFill}>
          <Animated.View
            key={current.id ?? 'root'}
            entering={(dir === 'forward' ? SlideInRight : SlideInLeft).duration(260)}
            style={StyleSheet.absoluteFill}
          >
            <DriveContent parentId={current.id} topInset={topInset} onOpenFolder={push} />
          </Animated.View>
        </View>
      </GestureDetector>

      {canPop ? (
        <FloatingTopBar
          showAvatar={false}
          left={
            <Tappable onPress={pop} haptic="selection" style={styles.back}>
              <Ionicons name="chevron-back" size={24} color={c.primary} />
              <Text style={[styles.folderTitle, { color: c.text }]} numberOfLines={1}>
                {current.title}
              </Text>
            </Tappable>
          }
        >
          <TopBarButton icon="add" onPress={() => setNewFolder(true)} />
        </FloatingTopBar>
      ) : (
        <FloatingTopBar>
          <TopBarButton icon="add" onPress={() => setNewFolder(true)} />
        </FloatingTopBar>
      )}

      <PromptModal
        visible={newFolder}
        title="New folder"
        placeholder="Folder name"
        confirmLabel="Create"
        onSubmit={onCreate}
        onCancel={() => setNewFolder(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  back: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 2 },
  folderTitle: { fontSize: 19, fontWeight: '700', flexShrink: 1 },
});
