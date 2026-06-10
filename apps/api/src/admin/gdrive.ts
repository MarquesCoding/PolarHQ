import { config } from "@workspace/config"

const AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth"
const TOKEN_URL = "https://oauth2.googleapis.com/token"
const SCOPE = "https://www.googleapis.com/auth/drive.file"

/** The OAuth redirect URI Google calls back; must be registered in the Google OAuth client. */
export const gdriveRedirectUri = (): string =>
  `${config.api.url}/api/v1/admin/backup/gdrive/callback`

/** Build the Google consent URL (offline access so we get a refresh token). */
export const buildConsentUrl = (state: string): string => {
  const params = new URLSearchParams({
    client_id: config.google.clientId ?? "",
    redirect_uri: gdriveRedirectUri(),
    response_type: "code",
    scope: SCOPE,
    access_type: "offline",
    prompt: "consent",
    state,
  })
  return `${AUTH_URL}?${params.toString()}`
}

/** Exchange an authorization code for a refresh token. */
export const exchangeCodeForRefreshToken = async (code: string): Promise<string> => {
  const response = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: config.google.clientId ?? "",
      client_secret: config.google.clientSecret ?? "",
      code,
      redirect_uri: gdriveRedirectUri(),
      grant_type: "authorization_code",
    }),
  })
  if (!response.ok) {
    throw new Error("admin.gdriveCodeExchangeFailed")
  }
  const json = (await response.json()) as { refresh_token?: string }
  if (!json.refresh_token) {
    throw new Error("admin.gdriveNoRefreshToken")
  }
  return json.refresh_token
}
