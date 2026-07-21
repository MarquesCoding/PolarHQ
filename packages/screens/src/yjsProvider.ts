import { secretboxOpen, secretboxSeal } from "@workspace/core/crypto"
import { coreConfig } from "@workspace/core/config"
import { getAuthToken } from "@workspace/core/authToken"
import * as decoding from "lib0/decoding"
import * as encoding from "lib0/encoding"
import {
  Awareness,
  applyAwarenessUpdate,
  encodeAwarenessUpdate,
  removeAwarenessStates,
} from "y-protocols/awareness"
import { readSyncMessage, writeSyncStep1, writeUpdate } from "y-protocols/sync"
import type * as Y from "yjs"

const MESSAGE_SYNC = 0
const MESSAGE_AWARENESS = 1
const RECONNECT_DELAY = 1500

const wsUrl = (nodeId: string): string => {
  const base = `${coreConfig().apiUrl.replace(/^http/, "ws")}/ws/doc?doc=${encodeURIComponent(nodeId)}`
  const token = getAuthToken()
  return token ? `${base}&token=${encodeURIComponent(token)}` : base
}

interface AwarenessChange {
  added: number[]
  updated: number[]
  removed: number[]
}

/**
 * Minimal Yjs network provider over Orbit's dumb /ws relay. Implements the
 * y-protocols sync + awareness handshake; the server only rebroadcasts opaque
 * blobs to the room, so peers reconcile state directly (the CRDT merges
 * client-side). Designed so Phase 3 can encrypt the blobs without server changes.
 */
export class RelayProvider {
  readonly awareness: Awareness
  private readonly doc: Y.Doc
  private readonly url: string
  private readonly contentKey: Uint8Array | undefined
  private ws: WebSocket | null = null
  private connected = false
  private destroyed = false
  private reconnectTimer: ReturnType<typeof setTimeout> | undefined

  constructor(nodeId: string, doc: Y.Doc, contentKey?: Uint8Array) {
    this.doc = doc
    this.url = wsUrl(nodeId)
    this.contentKey = contentKey
    this.awareness = new Awareness(doc)

    doc.on("update", this.handleDocUpdate)
    this.awareness.on("update", this.handleAwarenessUpdate)
    if (typeof window !== "undefined") {
      window.addEventListener("beforeunload", this.handleUnload)
    }

    this.connect()
  }

  private connect = (): void => {
    if (this.destroyed) return
    const ws = new WebSocket(this.url)
    ws.binaryType = "arraybuffer"
    this.ws = ws

    ws.onopen = () => {
      this.connected = true
      const encoder = encoding.createEncoder()
      encoding.writeVarUint(encoder, MESSAGE_SYNC)
      writeSyncStep1(encoder, this.doc)
      this.transmit(encoding.toUint8Array(encoder))
      if (this.awareness.getLocalState()) {
        const aenc = encoding.createEncoder()
        encoding.writeVarUint(aenc, MESSAGE_AWARENESS)
        encoding.writeVarUint8Array(
          aenc,
          encodeAwarenessUpdate(this.awareness, [this.doc.clientID]),
        )
        this.transmit(encoding.toUint8Array(aenc))
      }
    }

    ws.onmessage = (event) => {
      let data: Uint8Array = new Uint8Array(event.data as ArrayBuffer)
      if (this.contentKey) {
        try {
          data = secretboxOpen(data, this.contentKey)
        } catch {
          return
        }
      }
      this.handleMessage(data)
    }

    ws.onclose = () => {
      this.connected = false
      this.ws = null
      if (!this.destroyed) this.reconnectTimer = setTimeout(this.connect, RECONNECT_DELAY)
    }
    ws.onerror = () => ws.close()
  }

  private handleMessage(data: Uint8Array): void {
    const decoder = decoding.createDecoder(data)
    const messageType = decoding.readVarUint(decoder)
    if (messageType === MESSAGE_SYNC) {
      const encoder = encoding.createEncoder()
      encoding.writeVarUint(encoder, MESSAGE_SYNC)
      readSyncMessage(decoder, encoder, this.doc, this)
      if (encoding.length(encoder) > 1) this.transmit(encoding.toUint8Array(encoder))
    } else if (messageType === MESSAGE_AWARENESS) {
      applyAwarenessUpdate(this.awareness, decoding.readVarUint8Array(decoder), this)
    }
  }

  private handleDocUpdate = (update: Uint8Array, origin: unknown): void => {
    if (origin === this) return
    const encoder = encoding.createEncoder()
    encoding.writeVarUint(encoder, MESSAGE_SYNC)
    writeUpdate(encoder, update)
    this.transmit(encoding.toUint8Array(encoder))
  }

  private handleAwarenessUpdate = ({ added, updated, removed }: AwarenessChange): void => {
    const changed = added.concat(updated, removed)
    const encoder = encoding.createEncoder()
    encoding.writeVarUint(encoder, MESSAGE_AWARENESS)
    encoding.writeVarUint8Array(encoder, encodeAwarenessUpdate(this.awareness, changed))
    this.transmit(encoding.toUint8Array(encoder))
  }

  private handleUnload = (): void => {
    removeAwarenessStates(this.awareness, [this.doc.clientID], "unload")
  }

  private transmit(payload: Uint8Array): void {
    if (this.ws && this.connected && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(this.contentKey ? secretboxSeal(payload, this.contentKey) : payload)
    }
  }

  destroy(): void {
    this.destroyed = true
    clearTimeout(this.reconnectTimer)
    removeAwarenessStates(this.awareness, [this.doc.clientID], "destroy")
    this.doc.off("update", this.handleDocUpdate)
    this.awareness.off("update", this.handleAwarenessUpdate)
    if (typeof window !== "undefined") {
      window.removeEventListener("beforeunload", this.handleUnload)
    }
    this.ws?.close()
    this.awareness.destroy()
  }
}
