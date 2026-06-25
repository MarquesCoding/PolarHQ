/**
 * Notifications: local alerts (e.g. background-backup finished) plus push registration. We register
 * the device's Expo push token with the server so it can nudge idle devices to sync when new
 * content is added elsewhere. Notifications are content-less — the suite stays end-to-end encrypted.
 */
import Constants from 'expo-constants';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

import { apiFetch } from '@workspace/core/apiClient';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
  }),
});

const projectId = (): string | undefined =>
  Constants.expoConfig?.extra?.eas?.projectId ?? (Constants as { easConfig?: { projectId?: string } }).easConfig?.projectId;

const registerPushToken = async (): Promise<void> => {
  const id = projectId();
  if (!id) return; // Expo push needs an EAS project id; local notifications still work without it.
  try {
    const token = (await Notifications.getExpoPushTokenAsync({ projectId: id })).data;
    await apiFetch('/api/v1/account/push-token', {
      method: 'POST',
      body: JSON.stringify({ token, platform: Platform.OS }),
    });
  } catch {
    /* push registration is best-effort */
  }
};

/** Request notification permission (once) and register this device for push. Safe to call on launch. */
export const initNotifications = async (): Promise<void> => {
  try {
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'PolarHQ',
        importance: Notifications.AndroidImportance.DEFAULT,
      });
    }
    let status = (await Notifications.getPermissionsAsync()).status;
    if (status !== 'granted') status = (await Notifications.requestPermissionsAsync()).status;
    if (status !== 'granted') return;
    await registerPushToken();
  } catch {
    /* ignore — notifications are non-critical */
  }
};

/** Show an immediate local notification. */
export const notifyLocal = (title: string, body: string): Promise<string> =>
  Notifications.scheduleNotificationAsync({ content: { title, body }, trigger: null });
