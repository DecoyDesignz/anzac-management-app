/**
 * Query param used when signing out due to session/auth issues.
 * Keeps this separate from NextAuth's `error` param on `/login`.
 */
export const AUTH_SESSION_ERROR_QUERY = "authError"

const MESSAGES: Record<string, { title: string; description: string }> = {
  session_expired: {
    title: "Session expired",
    description:
      "Your session is no longer valid. Sign in again to access member-only features.",
  },
  auth_failed: {
    title: "Signed out",
    description:
      "You were signed out due to an authentication issue. Sign in again to continue.",
  },
  auth_stale_session: {
    title: "Session out of date",
    description:
      "Your login session is out of date. Please sign in again.",
  },
}

/**
 * Maps URL slug (from signOut callback or legacy `error` param) to toast copy.
 */
export function getAuthErrorToastContent(slug: string): {
  title: string
  description: string
} {
  const normalized = decodeURIComponent(slug).trim().toLowerCase()
  const direct = MESSAGES[normalized]
  if (direct) {
    return direct
  }
  if (normalized.startsWith("auth_")) {
    return {
      title: "Signed out",
      description: "Please sign in again to access your account.",
    }
  }
  return {
    title: "Sign-in required",
    description:
      "Something went wrong with your session. Sign in again, or use the public dashboard.",
  }
}
