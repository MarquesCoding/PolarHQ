/**
 * Background camera-roll backup. Defines an OS background task (iOS BGTaskScheduler / Android
 * WorkManager) that wakes periodically — even when the app is closed — restores the cached E2E keys
 * and runs the same backup loop. Registered only while the user has backup enabled.
 */
import * as BackgroundTask from 'expo-background-task';
import * as TaskManager from 'expo-task-manager';

import { e2eReady } from '@workspace/core/e2e';

import { isBackupEnabled, runBackup } from '@/lib/backup';
import { notifyLocal } from '@/lib/notifications';

const BACKUP_TASK = 'polarhq-backup-sync';

TaskManager.defineTask(BACKUP_TASK, async () => {
  try {
    if (!isBackupEnabled()) return BackgroundTask.BackgroundTaskResult.Success;
    await e2eReady();
    const result = await runBackup();
    if (result === 'done') {
      await notifyLocal('Backup complete', 'Your latest photos and videos are backed up.').catch(() => undefined);
    }
    return BackgroundTask.BackgroundTaskResult.Success;
  } catch {
    return BackgroundTask.BackgroundTaskResult.Failed;
  }
});

/** Schedule background backup (no-op if unavailable or already scheduled). */
export const registerBackgroundSync = async (): Promise<void> => {
  try {
    if ((await BackgroundTask.getStatusAsync()) === BackgroundTask.BackgroundTaskStatus.Restricted) return;
    if (await TaskManager.isTaskRegisteredAsync(BACKUP_TASK)) return;
    await BackgroundTask.registerTaskAsync(BACKUP_TASK, { minimumInterval: 60 });
  } catch {
    /* scheduling unavailable on this device — foreground backup still works */
  }
};

export const unregisterBackgroundSync = async (): Promise<void> => {
  try {
    if (await TaskManager.isTaskRegisteredAsync(BACKUP_TASK)) await BackgroundTask.unregisterTaskAsync(BACKUP_TASK);
  } catch {
    /* ignore */
  }
};
