/** Minimal Google Drive REST client for off-site backups (no SDK). */

const TOKEN_URL = "https://oauth2.googleapis.com/token"
const FILES_URL = "https://www.googleapis.com/drive/v3/files"
const UPLOAD_URL = "https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id"

/** Exchange a stored refresh token for a short-lived access token. */
export const getAccessToken = async (
  clientId: string,
  clientSecret: string,
  refreshToken: string,
): Promise<string> => {
  const response = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
      grant_type: "refresh_token",
    }),
  })
  if (!response.ok) {
    throw new Error(`Google token refresh failed: ${response.status} ${await response.text()}`)
  }
  return ((await response.json()) as { access_token: string }).access_token
}

/** Create a folder and return its id. */
export const createDriveFolder = async (
  accessToken: string,
  name: string,
  parentId?: string | null,
): Promise<string> => {
  const response = await fetch(`${FILES_URL}?fields=id`, {
    method: "POST",
    headers: { authorization: `Bearer ${accessToken}`, "content-type": "application/json" },
    body: JSON.stringify({
      name,
      mimeType: "application/vnd.google-apps.folder",
      parents: parentId ? [parentId] : undefined,
    }),
  })
  if (!response.ok) {
    throw new Error(`Drive folder create failed: ${response.status} ${await response.text()}`)
  }
  return ((await response.json()) as { id: string }).id
}

/** Multipart-upload a file into a folder. */
export const uploadDriveFile = async (
  accessToken: string,
  name: string,
  parentId: string,
  body: Buffer,
  mimeType = "application/octet-stream",
): Promise<void> => {
  const boundary = `polarhq${Math.random().toString(36).slice(2)}`
  const metadata = JSON.stringify({ name, parents: [parentId] })
  const head = `--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${metadata}\r\n--${boundary}\r\nContent-Type: ${mimeType}\r\n\r\n`
  const tail = `\r\n--${boundary}--`
  const payload = Buffer.concat([Buffer.from(head), body, Buffer.from(tail)])

  const response = await fetch(UPLOAD_URL, {
    method: "POST",
    headers: {
      authorization: `Bearer ${accessToken}`,
      "content-type": `multipart/related; boundary=${boundary}`,
    },
    body: payload,
  })
  if (!response.ok) {
    throw new Error(`Drive upload failed (${name}): ${response.status} ${await response.text()}`)
  }
}
