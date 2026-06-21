import { config } from "@workspace/config"

const AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth"
const TOKEN_URL = "https://oauth2.googleapis.com/token"

/** Read-only access to the user's Google Photos library and Drive, plus their email for display. */
const SCOPES = [
  "https://www.googleapis.com/auth/photoslibrary.readonly",
  "https://www.googleapis.com/auth/drive.readonly",
  "https://www.googleapis.com/auth/userinfo.email",
  "openid",
].join(" ")

/** The OAuth redirect URI Google calls back; must be registered on the Google OAuth client. */
export const migrateRedirectUri = (): string =>
  `${config.api.url}/api/v1/migrate/google/callback`

/** Build the Google consent URL (offline access so we get a refresh token). */
export const buildConsentUrl = (state: string): string => {
  const params = new URLSearchParams({
    client_id: config.google.clientId ?? "",
    redirect_uri: migrateRedirectUri(),
    response_type: "code",
    scope: SCOPES,
    access_type: "offline",
    prompt: "consent",
    state,
  })
  return `${AUTH_URL}?${params.toString()}`
}

interface TokenResponse {
  refresh_token?: string
  access_token?: string
  id_token?: string
}

/** Exchange an authorization code for a refresh + first access token. */
export const exchangeCode = async (
  code: string,
): Promise<{ refreshToken: string; accessToken: string; email: string | null }> => {
  const response = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: config.google.clientId ?? "",
      client_secret: config.google.clientSecret ?? "",
      code,
      redirect_uri: migrateRedirectUri(),
      grant_type: "authorization_code",
    }),
  })
  if (!response.ok) throw new Error("migrate.google.codeExchangeFailed")
  const json = (await response.json()) as TokenResponse
  if (!json.refresh_token || !json.access_token) throw new Error("migrate.google.noRefreshToken")
  return {
    refreshToken: json.refresh_token,
    accessToken: json.access_token,
    email: emailFromIdToken(json.id_token),
  }
}

/** Mint a fresh short-lived access token from a stored refresh token. */
export const accessTokenFromRefresh = async (refreshToken: string): Promise<string> => {
  const response = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: config.google.clientId ?? "",
      client_secret: config.google.clientSecret ?? "",
      refresh_token: refreshToken,
      grant_type: "refresh_token",
    }),
  })
  if (!response.ok) throw new Error("migrate.google.refreshFailed")
  const json = (await response.json()) as TokenResponse
  if (!json.access_token) throw new Error("migrate.google.refreshFailed")
  return json.access_token
}

/** Best-effort email from the OIDC id_token's payload (display only). */
const emailFromIdToken = (idToken?: string): string | null => {
  const payload = idToken?.split(".")[1]
  if (!payload) return null
  try {
    const json = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as { email?: string }
    return json.email ?? null
  } catch {
    return null
  }
}
