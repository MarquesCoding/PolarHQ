import { auth } from "@workspace/auth"

export interface SessionUser {
  id: string
  email: string
  name: string
}

/** Resolve the authenticated user from request headers, or null. */
export const getSessionUser = async (headers: Headers): Promise<SessionUser | null> => {
  const session = await auth.api.getSession({ headers })
  if (!session?.user) return null
  return {
    id: session.user.id,
    email: session.user.email,
    name: session.user.name,
  }
}
