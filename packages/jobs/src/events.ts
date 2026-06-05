import { createRedisConnection } from "./connection"

/** Real-time event delivered to a user's WebSocket subscribers. */
export interface OrbitEvent {
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
  event: Omit<OrbitEvent, "ts">,
): Promise<void> => {
  const channel = userEventChannel(userId)
  const payload: OrbitEvent = { ...event, ts: Date.now() }
  try {
    await publisher.publish(channel, JSON.stringify(payload))
  } catch (error) {
    console.error(`[events] failed to publish to ${channel}: ${(error as Error).message}`)
  }
}

const safeParseEvent = (message: string): OrbitEvent | undefined => {
  try {
    return JSON.parse(message) as OrbitEvent
  } catch {
    return undefined
  }
}

/** Subscribe to a user's event channel. Returns an unsubscribe function. */
export const subscribeUserEvents = (
  userId: string,
  onEvent: (event: OrbitEvent) => void,
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
