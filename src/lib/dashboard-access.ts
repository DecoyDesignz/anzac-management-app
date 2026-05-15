"use client"

import { useSession } from "next-auth/react"

const STAFF_ROLES = new Set([
  "super_admin",
  "administrator",
  "instructor",
  "game_master",
])

/**
 * Session + edit capability for dashboard routes (public visitors vs members vs staff).
 */
export function useDashboardAccess() {
  const { data: session, status } = useSession()

  const isLoading = status === "loading"
  const isAuthed = status === "authenticated" && !!session?.user?.id
  const role = session?.user?.role
  const isUnitStaff = !!role && STAFF_ROLES.has(role)
  /** Logged-in unit staff (instructor+); used to show booking / admin UI. */
  const canEdit = isAuthed && isUnitStaff
  /** Member role: browse-only on shared pages even when logged in. */
  const isMemberOnly = isAuthed && role === "member"

  return {
    session,
    status,
    isLoading,
    isAuthed,
    isUnitStaff,
    canEdit,
    isMemberOnly,
    role,
  }
}
