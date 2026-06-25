import { db, schema } from "@workspace/db"
import { and, eq, inArray, ne } from "drizzle-orm"

const EXPO_PUSH_URL = "https://exp.host/--/api/v2/push/send"
const BATCH_SIZE = 100

interface PushPayload {
  type: string
  title?: string
  body?: string
  data?: Record<string, unknown>
}

interface ExpoTicket {
  status: "ok" | "error"
  details?: { error?: string }
}

const chunk = <T>(items: T[], size: number): T[][] => {
  const chunks: T[][] = []
  for (let i = 0; i < items.length; i += size) chunks.push(items.slice(i, i + size))
  return chunks
}

const sendBatch = async (
  tokens: string[],
  payload: PushPayload,
): Promise<string[]> => {
  const messages = tokens.map((token) => ({
    to: token,
    title: payload.title,
    body: payload.body,
    sound: "default",
    data: payload.data ?? { type: payload.type },
  }))

  const response = await fetch(EXPO_PUSH_URL, {
    method: "POST",
    headers: { "content-type": "application/json", accept: "application/json" },
    body: JSON.stringify(messages),
  })
  if (!response.ok) {
    console.error(`[push] expo responded ${response.status}`)
    return []
  }

  const json = (await response.json()) as { data?: ExpoTicket[] }
  const tickets = json.data ?? []
  const unregistered: string[] = []
  tickets.forEach((ticket, index) => {
    if (ticket.status === "error" && ticket.details?.error === "DeviceNotRegistered") {
      const token = tokens[index]
      if (token) unregistered.push(token)
    }
  })
  return unregistered
}

/** Send a content-less push to a user's devices so idle ones know to sync. Never throws. */
export const sendPushToUser = async (
  userId: string,
  payload: PushPayload,
  opts?: { excludeToken?: string },
): Promise<void> => {
  try {
    const rows = await db
      .select({ token: schema.pushTokens.token })
      .from(schema.pushTokens)
      .where(
        opts?.excludeToken
          ? and(eq(schema.pushTokens.userId, userId), ne(schema.pushTokens.token, opts.excludeToken))
          : eq(schema.pushTokens.userId, userId),
      )

    const tokens = rows.map((row) => row.token)
    if (tokens.length === 0) return

    const unregistered: string[] = []
    for (const batch of chunk(tokens, BATCH_SIZE)) {
      unregistered.push(...(await sendBatch(batch, payload)))
    }

    if (unregistered.length > 0) {
      await db.delete(schema.pushTokens).where(inArray(schema.pushTokens.token, unregistered))
    }
  } catch (error) {
    console.error(`[push] failed to send to user ${userId}: ${(error as Error).message}`)
  }
}
