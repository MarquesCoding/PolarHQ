import { Ionicons } from '@expo/vector-icons';
import { useQueryClient } from '@tanstack/react-query';
import * as Haptics from 'expo-haptics';
import { useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { Easing, runOnJS, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { DriveContent } from '@/components/drive-list';
import { FloatingTopBar, TopBarButton, useTopInset } from '@/components/floating-top-bar';
import { PromptModal } from '@/components/prompt-modal';
import { Glass } from '@/components/ui/glass';
import { Tappable } from '@/components/ui/tappable';
import { useColors } from '@/components/ui';
import { showActionSheet } from '@/lib/action-menu';
import { createDriveFolder, renameDriveNode, trashDriveNode, type DriveNode } from '@/lib/drive';
import { downloadAndShareDriveFile, pickAndUploadFile } from '@/lib/drive-files';

interface Crumb {
  id: string | null;
  title: string;
}

type Prompt = { mode: 'new' } | { mode: 'rename'; node: DriveNode };

export default function Drive() {
  const c = useColors();
  const queryClient = useQueryClient();
  const topInset = useTopInset();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const [stack, setStack] = useState<Crumb[]>([{ id: null, title: '' }]);
  const [prompt, setPrompt] = useState<Prompt | null>(null);
  const [selected, setSelected] = useState<Map<string, DriveNode> | null>(null);

  const current = stack[stack.length - 1];
  const canPop = stack.length > 1;
  const selecting = selected !== null;
  const count = selected?.size ?? 0;
  const startX = useSharedValue(0);
  const tx = useSharedValue(0);
  const contentStyle = useAnimatedStyle(() => ({ transform: [{ translateX: tx.value }] }));

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['nodes', current.id ?? 'root'] });

  const slideFrom = (offset: number) => {
    tx.value = offset;
    tx.value = withTiming(0, { duration: 280, easing: Easing.out(Easing.cubic) });
  };

  const push = (node: DriveNode) => {
    setSelected(null);
    setStack((s) => [...s, { id: node.id, title: node.name }]);
    slideFrom(width);
  };
  const pop = () => {
    if (!canPop) return;
    setSelected(null);
    setStack((s) => s.slice(0, -1));
    slideFrom(-width);
  };

  const enterSelect = (node: DriveNode) => {
    void Haptics.selectionAsync();
    setSelected(new Map([[node.id, node]]));
  };
  const toggle = (node: DriveNode) =>
    setSelected((s) => {
      const n = new Map(s ?? []);
      if (n.has(node.id)) n.delete(node.id);
      else n.set(node.id, node);
      return n;
    });
  const cancelSelect = () => setSelected(null);
  const selectedNodes = () => [...(selected?.values() ?? [])];

  const onCreate = async (value: string) => {
    if (prompt?.mode === 'new') await createDriveFolder(current.id, value).catch(() => undefined);
    else if (prompt?.mode === 'rename') await renameDriveNode(prompt.node.id, value).catch(() => undefined);
    setPrompt(null);
    setSelected(null);
    invalidate();
  };

  const onUploadFile = async () => {
    const outcome = await pickAndUploadFile(current.id).catch(() => 'error' as const);
    if (outcome === 'uploaded') invalidate();
    else if (outcome === 'too-large') Alert.alert('File too large', 'Files must be under 120 MB to upload from mobile.');
    else if (outcome === 'locked') Alert.alert('Locked', 'Sign in to unlock encryption before uploading.');
    else if (outcome === 'error') Alert.alert('Upload failed', 'Could not upload this file. Please try again.');
  };

  const onPlus = () => {
    showActionSheet([
      { label: 'New folder', onPress: () => setPrompt({ mode: 'new' }) },
      { label: 'Upload file', onPress: () => void onUploadFile() },
    ]);
  };

  const onBatchDelete = () => {
    const nodes = selectedNodes();
    if (!nodes.length) return;
    showActionSheet(
      [
        {
          label: `Move ${nodes.length} to Trash`,
          destructive: true,
          onPress: async () => {
            void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
            for (const n of nodes) await trashDriveNode(n.id).catch(() => undefined);
            setSelected(null);
            invalidate();
          },
        },
      ],
      'They will move to Trash. You can restore them within 30 days.',
    );
  };

  const single = count === 1 ? selectedNodes()[0] : null;

  // Edge back-swipe: a rightward drag from the left edge pops the folder.
  const backSwipe = Gesture.Pan()
    .enabled(canPop && !selecting)
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
        <Animated.View style={[StyleSheet.absoluteFill, contentStyle]}>
          <DriveContent
            key={current.id ?? 'root'}
            parentId={current.id}
            topInset={topInset}
            onOpenFolder={push}
            selectionMode={selecting}
            selectedIds={selected ? new Set(selected.keys()) : undefined}
            onToggle={toggle}
            onEnterSelect={enterSelect}
          />
        </Animated.View>
      </GestureDetector>

      {selecting ? (
        <View style={[styles.selBar, { paddingTop: insets.top, height: topInset }]}>
          <Pressable onPress={cancelSelect} hitSlop={8} style={styles.selSide}>
            <Text style={[styles.selAction, { color: c.primary }]}>Cancel</Text>
          </Pressable>
          <Text style={[styles.selCount, { color: c.text }]}>{count ? `${count} selected` : 'Select items'}</Text>
          <View style={styles.selSide} />
        </View>
      ) : canPop ? (
        <FloatingTopBar
          left={
            <Tappable onPress={pop} haptic="selection" style={styles.back}>
              <Ionicons name="chevron-back" size={24} color={c.primary} />
              <Text style={[styles.folderTitle, { color: c.text }]} numberOfLines={1}>
                {current.title}
              </Text>
            </Tappable>
          }
        >
          <TopBarButton icon="add" onPress={onPlus} />
        </FloatingTopBar>
      ) : (
        <FloatingTopBar>
          <TopBarButton icon="add" onPress={onPlus} />
        </FloatingTopBar>
      )}

      {selecting ? (
        <View style={[styles.selActions, { paddingBottom: insets.bottom + 10 }]} pointerEvents="box-none">
          <Glass style={styles.selActionsGlass} fallback={c.backgroundElement}>
            <SelAction
              icon="download-outline"
              label="Download"
              disabled={!single}
              onPress={() => {
                if (single) void downloadAndShareDriveFile(single).catch(() => undefined);
                cancelSelect();
              }}
            />
            <SelAction
              icon="pencil"
              label="Rename"
              disabled={!single}
              onPress={() => single && setPrompt({ mode: 'rename', node: single })}
            />
            <SelAction icon="trash-outline" label="Trash" tint="#fb5e7e" disabled={!count} onPress={onBatchDelete} />
          </Glass>
        </View>
      ) : null}

      <PromptModal
        visible={prompt !== null}
        title={prompt?.mode === 'rename' ? 'Rename' : 'New folder'}
        placeholder={prompt?.mode === 'rename' ? 'New name' : 'Folder name'}
        initialValue={prompt?.mode === 'rename' ? prompt.node.name : ''}
        confirmLabel={prompt?.mode === 'rename' ? 'Rename' : 'Create'}
        onSubmit={onCreate}
        onCancel={() => setPrompt(null)}
      />
    </View>
  );
}

function SelAction({
  icon,
  label,
  tint,
  disabled,
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  tint?: string;
  disabled?: boolean;
  onPress: () => void;
}) {
  const c = useColors();
  const color = disabled ? c.textSecondary : tint ?? c.text;
  return (
    <Pressable onPress={onPress} disabled={disabled} style={({ pressed }) => [styles.selBtn, { opacity: pressed ? 0.5 : disabled ? 0.4 : 1 }]}>
      <Ionicons name={icon} size={23} color={color} />
      <Text style={[styles.selBtnLabel, { color }]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  back: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 2 },
  folderTitle: { fontSize: 19, fontWeight: '700', flexShrink: 1 },
  selBar: { position: 'absolute', top: 0, left: 0, right: 0, flexDirection: 'row', alignItems: 'flex-end', paddingHorizontal: 16, paddingBottom: 10 },
  selSide: { flex: 1 },
  selAction: { fontSize: 16, fontWeight: '600' },
  selCount: { fontSize: 16, fontWeight: '700' },
  selActions: { position: 'absolute', left: 0, right: 0, bottom: 0, alignItems: 'center' },
  selActionsGlass: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-around', borderRadius: 24, overflow: 'hidden', paddingHorizontal: 6, width: '92%' },
  selBtn: { alignItems: 'center', justifyContent: 'center', gap: 4, paddingVertical: 12, minWidth: 72 },
  selBtnLabel: { fontSize: 11, fontWeight: '500' },
});
