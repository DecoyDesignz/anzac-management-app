"use client"

import { useMemo } from "react"
import { useSession } from "next-auth/react"
import { useQuery } from "convex/react"
import { api } from "../../convex/_generated/api"
import type { Id } from "../../convex/_generated/dataModel"

/**
 * Role-derived capabilities from Convex userRoles (source of truth), with session fallback while loading.
 * Fixes JWT-only {@link Session.user.role} when personnel hold multiple roles (e.g. instructor + game_master).
 */
export function usePersonnelRoleCapabilities() {
  const { data: session } = useSession()
  const userId = session?.user?.id as Id<"personnel"> | undefined

  const userRoles = useQuery(
    api.users.getUserRoles,
    userId ? { requesterUserId: userId, userId } : "skip"
  )

  return useMemo(() => {
    const sessionRole = session?.user?.role
    const fromDb =
      userRoles?.map((r) => r.roleName).filter((n): n is string => Boolean(n)) ??
      null

    const hasInstructorRole =
      fromDb !== null
        ? fromDb.includes("instructor")
        : sessionRole === "instructor"

    const isAdministratorRole =
      fromDb !== null
        ? fromDb.includes("administrator") || fromDb.includes("super_admin")
        : sessionRole === "administrator" || sessionRole === "super_admin"

    const hasGameMasterRole =
      fromDb !== null
        ? fromDb.includes("game_master")
        : sessionRole === "game_master"

    const isPureGameMaster =
      hasGameMasterRole && !hasInstructorRole && !isAdministratorRole

    /** Create / edit qualifications and award flows scoped by Convex (school assignment). */
    const hasQualificationsStaffCapability =
      hasInstructorRole || isAdministratorRole

    const isRolesLoading = Boolean(userId) && userRoles === undefined

    return {
      roleNames:
        fromDb ?? (sessionRole ? [sessionRole] : ([] as string[])),
      hasInstructorRole,
      hasGameMasterRole,
      isAdministratorRole,
      isPureGameMaster,
      hasQualificationsStaffCapability,
      isRolesLoading,
    }
  }, [session?.user?.role, userId, userRoles])
}
