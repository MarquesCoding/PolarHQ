import { ActionSheetIOS, Alert, Platform } from 'react-native';

export interface MenuAction {
  label: string;
  destructive?: boolean;
  onPress: () => void;
}

/**
 * Present a native action sheet: the real `ActionSheetIOS` on iOS, and an `Alert`-based fallback on
 * Android (fine for the small menus we use — Drive row actions, the photo overflow). A trailing
 * Cancel is always added.
 */
export function showActionSheet(actions: MenuAction[], title?: string): void {
  if (Platform.OS === 'ios') {
    const labels = [...actions.map((a) => a.label), 'Cancel'];
    const destructiveButtonIndex = actions.findIndex((a) => a.destructive);
    ActionSheetIOS.showActionSheetWithOptions(
      {
        title,
        options: labels,
        cancelButtonIndex: labels.length - 1,
        destructiveButtonIndex: destructiveButtonIndex >= 0 ? destructiveButtonIndex : undefined,
      },
      (i) => {
        if (i != null && i < actions.length) actions[i].onPress();
      },
    );
    return;
  }

  Alert.alert(title ?? '', undefined, [
    ...actions.map((a) => ({
      text: a.label,
      style: (a.destructive ? 'destructive' : 'default') as 'destructive' | 'default',
      onPress: a.onPress,
    })),
    { text: 'Cancel', style: 'cancel' as const },
  ]);
}
