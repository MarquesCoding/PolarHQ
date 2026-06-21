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

export interface GooglePhotoItem {
  id: string
  filename: string
  mimeType: string
  baseUrl: string
  createdAt: string | null
}

/** One page of the user's Google Photos library. */
export const listGooglePhotos = async (
  accessToken: string,
  pageToken?: string,
): Promise<{ items: GooglePhotoItem[]; nextPageToken?: string }> => {
  const params = new URLSearchParams({ pageSize: "100" })
  if (pageToken) params.set("pageToken", pageToken)
  const response = await fetch(`https://photoslibrary.googleapis.com/v1/mediaItems?${params}`, {
    headers: { authorization: `Bearer ${accessToken}` },
  })
  if (!response.ok) throw new Error("migrate.google.photosListFailed")
  const json = (await response.json()) as {
    mediaItems?: Array<{
      id: string
      filename: string
      mimeType: string
      baseUrl: string
      mediaMetadata?: { creationTime?: string }
    }>
    nextPageToken?: string
  }
  return {
    items: (json.mediaItems ?? []).map((m) => ({
      id: m.id,
      filename: m.filename,
      mimeType: m.mimeType,
      baseUrl: m.baseUrl,
      createdAt: m.mediaMetadata?.creationTime ?? null,
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
