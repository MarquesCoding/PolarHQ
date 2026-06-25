/**
 * Live updates over the server's /ws event stream. The shared web `useLiveEvents` relies on the
 * browser auto-sending the session cookie; RN must pass it explicitly via the WebSocket headers
 * option. On a photos/drive event we invalidate the matching queries so the UI refreshes in
 * real time (new uploads, edits, deletes from other devices). Reconnects on drop.
 */
import { useQueryClient } from '@tanstack/react-query';
import { coreConfig } from '@workspace/core/config';
import { useEffect } from 'react';

import { authClient } from '@/lib/auth';

export function useLiveSync(enabled = true) {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!enabled) return;
    const url = `${coreConfig().apiUrl.replace(/^http/, 'ws')}/ws`;
    let socket: WebSocket | null = null;
    let closed = false;
    let retry: ReturnType<typeof setTimeout> | undefined;

    const connect = () => {
      const cookie = authClient.getCookie();
      const options = cookie ? { headers: { Cookie: cookie } } : undefined;
      socket = new (WebSocket as unknown as {
        new (url: string, protocols?: string | string[], options?: unknown): WebSocket;
      })(url, undefined, options);

      socket.onmessage = (event) => {
        try {
          const ev = JSON.parse(String(event.data)) as { type?: string };
          if (typeof ev.type !== 'string') return;
          if (ev.type.startsWith('photos.')) {
            queryClient.invalidateQueries({ queryKey: ['assets'] });
          } else if (ev.type.startsWith('drive.')) {
            queryClient.invalidateQueries({ queryKey: ['nodes'] });
          }
        } catch {
          /* ignore non-JSON frames */
        }
      };
      socket.onclose = () => {
        if (!closed) retry = setTimeout(connect, 2000);
      };
    };

    connect();
    return () => {
      closed = true;
      if (retry) clearTimeout(retry);
      socket?.close();
    };
  }, [enabled, queryClient]);
}
