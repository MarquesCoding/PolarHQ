import { db, schema } from "@workspace/db"
import { eq } from "drizzle-orm"
import { accessTokenFromRefresh } from "./google"

export const saveGoogleAccount = async (
  userId: string,
  refreshToken: string,
  email: string | null,
): Promise<void> => {
  await db
    .insert(schema.googleAccount)
    .values({ userId, refreshToken, email })
    .onConflictDoUpdate({
      target: schema.googleAccount.userId,
      set: { refreshToken, email, connectedAt: new Date() },
    })
}

export const getGoogleAccount = async (userId: string) =>
  (await db.select().from(schema.googleAccount).where(eq(schema.googleAccount.userId, userId)))[0] ??
  null

export const disconnectGoogle = async (userId: string): Promise<void> => {
  await db.delete(schema.googleAccount).where(eq(schema.googleAccount.userId, userId))
}

/** A fresh short-lived access token for the user's connected Google account, or null if not linked. */
export const googleAccessToken = async (userId: string): Promise<string | null> => {
  const account = await getGoogleAccount(userId)
  if (!account) return null
  return accessTokenFromRefresh(account.refreshToken)
}

const PICKER_BASE = "https://photospicker.googleapis.com/v1"

/** Parse a protobuf duration string like "5s" into milliseconds (default 3s). */
const durationToMs = (value: string | undefined, fallback: number): number => {
  const seconds = value ? Number(value.replace(/s$/, "")) : NaN
  return Number.isFinite(seconds) ? seconds * 1000 : fallback
}

export interface PickerSession {
  id: string
  /** The URL the user opens (in Google Photos) to choose what to import. */
  pickerUri: string
  /** Whether the user has finished selecting; once true, the picked items can be listed. */
  mediaItemsSet: boolean
  /** How often the client should poll the session while waiting, in ms. */
  pollIntervalMs: number
}

interface PickerSessionResponse {
  id: string
  pickerUri: string
  mediaItemsSet?: boolean
  pollingConfig?: { pollInterval?: string }
}

const toPickerSession = (json: PickerSessionResponse): PickerSession => ({
  id: json.id,
  pickerUri: json.pickerUri,
  mediaItemsSet: Boolean(json.mediaItemsSet),
  pollIntervalMs: durationToMs(json.pollingConfig?.pollInterval, 3000),
})

/** Create a Picker session — the user opens `pickerUri` and chooses the media to import. */
export const createPickerSession = async (accessToken: string): Promise<PickerSession> => {
  const response = await fetch(`${PICKER_BASE}/sessions`, {
    method: "POST",
    headers: { authorization: `Bearer ${accessToken}`, "content-type": "application/json" },
  })
  if (!response.ok) throw new Error("migrate.google.pickerSessionFailed")
  return toPickerSession((await response.json()) as PickerSessionResponse)
}

/** Poll a Picker session to see whether the user has finished selecting. */
export const getPickerSession = async (
  accessToken: string,
  sessionId: string,
): Promise<PickerSession> => {
  const response = await fetch(`${PICKER_BASE}/sessions/${sessionId}`, {
    headers: { authorization: `Bearer ${accessToken}` },
  })
  if (!response.ok) throw new Error("migrate.google.pickerSessionFailed")
  return toPickerSession((await response.json()) as PickerSessionResponse)
}

/** Best-effort: delete a finished/abandoned Picker session. */
export const deletePickerSession = async (
  accessToken: string,
  sessionId: string,
): Promise<void> => {
  await fetch(`${PICKER_BASE}/sessions/${sessionId}`, {
    method: "DELETE",
    headers: { authorization: `Bearer ${accessToken}` },
  }).catch(() => undefined)
}

export interface GooglePhotoItem {
  id: string
  filename: string
  mimeType: string
  baseUrl: string
  createdAt: string | null
}

/** One page of the media the user picked in a Picker session. */
export const listPickedMediaItems = async (
  accessToken: string,
  sessionId: string,
  pageToken?: string,
): Promise<{ items: GooglePhotoItem[]; nextPageToken?: string }> => {
  const params = new URLSearchParams({ sessionId, pageSize: "100" })
  if (pageToken) params.set("pageToken", pageToken)
  const response = await fetch(`${PICKER_BASE}/mediaItems?${params}`, {
    headers: { authorization: `Bearer ${accessToken}` },
  })
  if (!response.ok) throw new Error("migrate.google.photosListFailed")
  const json = (await response.json()) as {
    mediaItems?: Array<{
      id: string
      createTime?: string
      mediaFile?: { baseUrl: string; mimeType: string; filename: string }
    }>
    nextPageToken?: string
  }
  return {
    items: (json.mediaItems ?? [])
      .filter((m): m is typeof m & { mediaFile: NonNullable<(typeof m)["mediaFile"]> } =>
        Boolean(m.mediaFile),
      )
      .map((m) => ({
        id: m.id,
        filename: m.mediaFile.filename,
        mimeType: m.mediaFile.mimeType,
        baseUrl: m.mediaFile.baseUrl,
        createdAt: m.createTime ?? null,
      })),
    nextPageToken: json.nextPageToken,
  }
}

export interface GoogleDriveFile {
  id: string
  name: string
  mimeType: string
  size: number | null
  modifiedAt: string | null
  parents: string[]
}

/** One page of the user's Google Drive files (excluding trashed). */
export const listGoogleDriveFiles = async (
  accessToken: string,
  pageToken?: string,
): Promise<{ files: GoogleDriveFile[]; nextPageToken?: string }> => {
  const params = new URLSearchParams({
    pageSize: "200",
    q: "trashed = false",
    fields: "nextPageToken, files(id, name, mimeType, size, parents, modifiedTime)",
  })
  if (pageToken) params.set("pageToken", pageToken)
  const response = await fetch(`https://www.googleapis.com/drive/v3/files?${params}`, {
    headers: { authorization: `Bearer ${accessToken}` },
  })
  if (!response.ok) throw new Error("migrate.google.driveListFailed")
  const json = (await response.json()) as {
    files?: Array<{
      id: string
      name: string
      mimeType: string
      size?: string
      parents?: string[]
      modifiedTime?: string
    }>
    nextPageToken?: string
  }
  return {
    files: (json.files ?? []).map((f) => ({
      id: f.id,
      name: f.name,
      mimeType: f.mimeType,
      size: f.size ? Number(f.size) : null,
      modifiedAt: f.modifiedTime ?? null,
      parents: f.parents ?? [],
    })),
    nextPageToken: json.nextPageToken,
  }
}

/** Stream the original bytes of a Google Photos item (`=d` image / `=dv` video) for the download proxy. */
export const fetchGooglePhotoBytes = (
  accessToken: string,
  baseUrl: string,
  isVideo: boolean,
): Promise<Response> =>
  fetch(`${baseUrl}=${isVideo ? "dv" : "d"}`, {
    headers: { authorization: `Bearer ${accessToken}` },
  })

/** Stream the raw bytes of a Google Drive file for the download proxy. */
export const fetchGoogleDriveBytes = (accessToken: string, fileId: string): Promise<Response> =>
  fetch(`https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`, {
    headers: { authorization: `Bearer ${accessToken}` },
  })
