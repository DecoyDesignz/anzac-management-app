"use client"

import { useQuery } from "convex/react"
import { useSession } from "next-auth/react"
import { usePathname, useRouter } from "next/navigation"
import { useEffect } from "react"
import { api } from "../../../convex/_generated/api"

export function MaintenanceCheck() {
  const { data: session } = useSession()
  const router = useRouter()
  const pathname = usePathname()
  const maintenanceMode = useQuery(api.systemSettings.getMaintenanceMode, {})

  useEffect(() => {
    // Don't do anything if we're still loading
    if (maintenanceMode === undefined) return

    const isAdmin = session?.user?.role === "administrator" || session?.user?.role === "super_admin"
    const isOnMaintenancePage = pathname === "/maintenance"
    const isOnLoginPage = pathname === "/login" || pathname === "/"

    // If maintenance mode is enabled
    if (maintenanceMode?.enabled) {
      // Admins can access the system
      if (isAdmin) {
        // If admin is on maintenance page, redirect to dashboard
        if (isOnMaintenancePage) {
          router.push("/dashboard")
        }
        // Otherwise, let them continue
        return
      }

      // Allow everyone to access login page during maintenance
      // so administrators can login
      if (isOnLoginPage) {
        return
      }

      // Non-admins should be redirected to maintenance page
      if (!isOnMaintenancePage) {
        router.push("/maintenance")
      }
    } else {
      // If maintenance mode is disabled and user is on maintenance page
      if (isOnMaintenancePage) {
        if (session?.user) {
          router.push("/dashboard")
        } else {
          router.push("/login")
        }
      }
    }
  }, [maintenanceMode, session, pathname, router])

  // This component doesn't render anything
  return null
}

