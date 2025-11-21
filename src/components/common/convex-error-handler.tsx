"use client"

import { useEffect } from "react"
import { signOut } from "next-auth/react"

type AuthErrorData = {
  code: string
  message: string
  shouldLogout: boolean
}

const AUTH_CODE_PREFIX = "AUTH_"

let errorHandlerSetup = false
let isSigningOut = false

const LEGACY_SESSION_MATCHERS = ["ArgumentValidationError", "systemUsers", "personnel"]

function isLegacySessionMessage(message: string) {
  if (!message) {
    return false
  }
  return LEGACY_SESSION_MATCHERS.every((fragment) => message.includes(fragment))
}

function tryParseJson(value: string) {
  try {
    return JSON.parse(value)
  } catch {
    return null
  }
}

function normalizeAuthErrorData(data: unknown): AuthErrorData | null {
  if (!data || typeof data !== "object") {
    return null
  }

  const record = data as Record<string, unknown>
  const code = typeof record.code === "string" ? record.code : undefined
  const hasAuthCode = !!code && code.startsWith(AUTH_CODE_PREFIX)
  const hasLogoutFlag = typeof record.shouldLogout === "boolean"
  const shouldLogoutValue = hasLogoutFlag ? (record.shouldLogout as boolean) : hasAuthCode

  if (!shouldLogoutValue) {
    return null
  }

  const message =
    typeof record.message === "string" && record.message.length > 0
      ? record.message
      : "Authentication failed. Please log in again."

  return {
    code: code ?? "AUTH_UNKNOWN",
    message,
    shouldLogout: shouldLogoutValue,
  }
}

function extractAuthError(candidate: unknown, fallbackMessage?: string): AuthErrorData | null {
  if (!candidate && !fallbackMessage) {
    return null
  }

  const errorLike = candidate as { data?: unknown; message?: string }

  if (errorLike && typeof errorLike === "object" && "data" in errorLike) {
    const normalized = normalizeAuthErrorData(errorLike.data)
    if (normalized) {
      return normalized
    }
  }

  const message =
    typeof fallbackMessage === "string" && fallbackMessage.length > 0
      ? fallbackMessage
      : errorLike?.message || (typeof candidate === "string" ? candidate : "")

  if (typeof message === "string" && message.length > 0) {
    if (isLegacySessionMessage(message)) {
      return {
        code: "AUTH_STALE_SESSION",
        message: "Your login session is out of date. Please sign in again.",
        shouldLogout: true,
      }
    }

    const parsed = tryParseJson(message)
    const normalized = normalizeAuthErrorData(parsed)
    if (normalized) {
      return normalized
    }
  }

  return null
}

function triggerLogout(reason: string) {
  if (isSigningOut) {
    return
  }

  isSigningOut = true
  const reasonSlug = encodeURIComponent(reason?.toLowerCase() || "auth_failed")

  signOut({
    callbackUrl: `/login?error=${reasonSlug}`,
    redirect: true,
  })
}

function handleAuthErrorCandidate(candidate: unknown, fallbackMessage?: string): boolean {
  const authError = extractAuthError(candidate, fallbackMessage)

  if (!authError || !authError.shouldLogout) {
    return false
  }

  console.warn("Authentication error detected:", authError.code, authError.message)
  triggerLogout(authError.code)
  return true
}

/**
 * Global error handler for Convex errors
 * Detects authentication-related ConvexError payloads and logs the user out
 */
export function ConvexErrorHandler() {
  useEffect(() => {
    if (errorHandlerSetup) {
      return
    }

    errorHandlerSetup = true

    const handleError = (event: ErrorEvent) => {
      const handled = handleAuthErrorCandidate(event.error ?? event.message, event.message)
      if (handled) {
        event.preventDefault()
      }
    }

    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      const fallbackMessage =
        typeof event.reason === "string"
          ? event.reason
          : event.reason?.message ?? ""
      const handled = handleAuthErrorCandidate(event.reason, fallbackMessage)
      if (handled) {
        event.preventDefault()
      }
    }

    const originalConsoleError = console.error
    console.error = ((...args: Parameters<typeof console.error>) => {
      originalConsoleError(...args)

      for (const arg of args) {
        if (handleAuthErrorCandidate(arg)) {
          break
        }
      }
    }) as typeof console.error

    window.addEventListener("error", handleError)
    window.addEventListener("unhandledrejection", handleUnhandledRejection)

    return () => {
      window.removeEventListener("error", handleError)
      window.removeEventListener("unhandledrejection", handleUnhandledRejection)
      console.error = originalConsoleError
      errorHandlerSetup = false
      isSigningOut = false
    }
  }, [])

  return null
}

