/**
 * Extract a user-facing message from Convex action/mutation errors.
 * Prefers ConvexError `data.message` (visible in production) over redacted Server Error text.
 */
export function getConvexErrorMessage(err: unknown, fallback = "Something went wrong"): string {
  if (!err) {
    return fallback
  }

  if (typeof err === "object" && err !== null && "data" in err) {
    const data = (err as { data: unknown }).data
    if (typeof data === "string" && data.trim()) {
      return data.trim()
    }
    if (data && typeof data === "object") {
      const message = (data as { message?: unknown }).message
      if (typeof message === "string" && message.trim()) {
        return message.trim()
      }
    }
  }

  if (err instanceof Error && err.message) {
    const uncaught = err.message.match(/Uncaught (?:Error|ConvexError):\s*(.+?)(?:\n|$)/)
    if (uncaught?.[1]?.trim()) {
      return uncaught[1].trim().replace(/^(Uncaught (?:Error|ConvexError):\s*)+/g, "")
    }

    // Avoid showing opaque Convex production wrappers as the primary message
    if (!err.message.includes("Server Error") || err.message.includes("Uncaught")) {
      return err.message
    }
  }

  return fallback
}
