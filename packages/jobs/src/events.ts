import { createRedisConnection } from "./connection"

/** Real-time event delivered to a user's WebSocket subscribers. */
export interface VaultEvent {
  type: string
  scope: string
  payload: unknown
  ts: number
}

export const userEventChannel = (userId: string): string => `events:user:${userId}`

const publisher = createRedisConnection()

/** Publish an event to a user's channel; fanned out by the WS gateway. */
export const publishUserEvent = async (
  userId: string,
  event: Omit<VaultEvent, "ts">,
): Promise<void> => {
  const channel = userEventChannel(userId)
  const payload: VaultEvent = { ...event, ts: Date.now() }
  try {
    await publisher.publish(channel, JSON.stringify(payload))
  } catch (error) {
    console.error(`[events] failed to publish to ${channel}: ${(error as Error).message}`)
  }
}

const safeParseEvent = (message: string): VaultEvent | undefined => {
  try {
    return JSON.parse(message) as VaultEvent
  } catch {
    return undefined
  }
}

/**
 * A relayed document-sync frame: an opaque (base64) Yjs/awareness blob tagged with
 * the originating connection so the gateway can avoid echoing it back to the sender.
 * The relay never inspects `data` — Phase 3 can make it ciphertext with no changes here.
 */
export interface DocSyncMessage {
  origin: string
  data: string
}

export const docSyncChannel = (nodeId: string): string => `doc:sync:${nodeId}`

/** Broadcast an opaque doc-sync blob to everyone in a document's room. */
export const publishDocSync = async (nodeId: string, message: DocSyncMessage): Promise<void> => {
  const channel = docSyncChannel(nodeId)
  try {
    await publisher.publish(channel, JSON.stringify(message))
  } catch (error) {
    console.error(`[events] failed to publish to ${channel}: ${(error as Error).message}`)
  }
}

const safeParseDocSync = (message: string): DocSyncMessage | undefined => {
  try {
    return JSON.parse(message) as DocSyncMessage
  } catch {
    return undefined
  }
}

/** Subscribe to a document's sync room. Returns an unsubscribe function. */
export const subscribeDocRoom = (
  nodeId: string,
  onMessage: (message: DocSyncMessage) => void,
): (() => Promise<void>) => {
  const subscriber = createRedisConnection()
  const channel = docSyncChannel(nodeId)
  subscriber.subscribe(channel).catch((error: Error) => {
    console.error(`[events] failed to subscribe to ${channel}: ${error.message}`)
  })
  subscriber.on("message", (_channel, message) => {
    const parsed = safeParseDocSync(message)
    if (parsed) onMessage(parsed)
  })
  return async () => {
    try {
      await subscriber.unsubscribe(channel)
      await subscriber.quit()
    } catch (error) {
      console.error(`[events] failed to tear down ${channel}: ${(error as Error).message}`)
    }
  }
}

/** Subscribe to a user's event channel. Returns an unsubscribe function. */
export const subscribeUserEvents = (
  userId: string,
  onEvent: (event: VaultEvent) => void,
): (() => Promise<void>) => {
  const subscriber = createRedisConnection()
  const channel = userEventChannel(userId)
  subscriber.subscribe(channel).catch((error: Error) => {
    console.error(`[events] failed to subscribe to ${channel}: ${error.message}`)
  })
  subscriber.on("message", (_channel, message) => {
    const parsed = safeParseEvent(message)
    if (parsed) onEvent(parsed)
  })
  return async () => {
    try {
      await subscriber.unsubscribe(channel)
      await subscriber.quit()
    } catch (error) {
      console.error(`[events] failed to tear down ${channel}: ${(error as Error).message}`)
    }
  }
}
