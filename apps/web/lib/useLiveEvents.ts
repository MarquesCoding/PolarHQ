import { useEffect, useRef } from "react"
import { API_URL } from "@lib/env"

export interface LiveEvent {
  type: string
  scope: string
  payload: unknown
  ts: number
}

const safeParse = (data: unknown): LiveEvent | null => {
  if (typeof data !== "string") return null
  try {
    return JSON.parse(data) as LiveEvent
  } catch {
    return null
  }
}

/**
 * Subscribe to the server's WebSocket event stream (no polling). Reconnects on
 * drop. The callback is held in a ref so the socket isn't torn down on re-render.
 */
export const useLiveEvents = (onEvent: (event: LiveEvent) => void): void => {
  const handlerRef = useRef(onEvent)
  handlerRef.current = onEvent

  useEffect(() => {
    const url = `${API_URL.replace(/^http/, "ws")}/ws`
    let socket: WebSocket | null = null
    let closed = false
    let retry: ReturnType<typeof setTimeout> | undefined

    const connect = () => {
      socket = new WebSocket(url)
      socket.onmessage = (event) => {
        const parsed = safeParse(event.data)
        if (parsed) handlerRef.current(parsed)
      }
      socket.onclose = () => {
        if (!closed) retry = setTimeout(connect, 2000)
      }
    }

    connect()

    return () => {
      closed = true
      if (retry) clearTimeout(retry)
      socket?.close()
    }
  }, [])
}
