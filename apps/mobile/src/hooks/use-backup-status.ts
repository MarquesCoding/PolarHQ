import { useEffect, useState } from 'react';

import { type BackupProgress, subscribeBackup } from '@/lib/backup';

/** Live backup progress (null when idle) for status pills. */
export function useBackupStatus(): BackupProgress | null {
  const [progress, setProgress] = useState<BackupProgress | null>(null);
  useEffect(() => subscribeBackup(setProgress), []);
  return progress;
}
