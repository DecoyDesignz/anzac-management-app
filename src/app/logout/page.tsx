"use client"

import { useEffect } from "react"
import { signOut } from "next-auth/react"
import { useRouter } from "next/navigation"

/**
 * Force logout page
 * This page can be accessed directly to force clear the session and cookies
 * Useful when users are stuck with invalid sessions
 */
export default function LogoutPage() {
  const router = useRouter()

  useEffect(() => {
    // Force sign out - this clears the session and cookies
    signOut({ 
      callbackUrl: "/login?logout=success",
      redirect: true 
    }).catch((error) => {
      console.error("Error during logout:", error)
      
      // Fallback: Clear cookies manually and redirect
      // Clear all auth-related cookies
      if (typeof document !== "undefined") {
        // Clear NextAuth cookies
        document.cookie.split(";").forEach((c) => {
          const cookieName = c.trim().split("=")[0]
          if (
            cookieName.includes("next-auth") ||
            cookieName.includes("authjs") ||
            cookieName.startsWith("__Secure-") ||
            cookieName.startsWith("__Host-")
          ) {
            // Clear cookie by setting it to expire
            document.cookie = `${cookieName}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`
            document.cookie = `${cookieName}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; domain=${window.location.hostname};`
          }
        })
        
        // Clear session storage and local storage
        if (typeof window !== "undefined") {
          sessionStorage.clear()
          localStorage.clear()
        }
      }
      
      // Redirect to login after a short delay
      setTimeout(() => {
        router.push("/login?logout=success")
        router.refresh()
      }, 500)
    })
  }, [router])

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center space-y-4">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
        <p className="text-muted-foreground">Logging out...</p>
      </div>
    </div>
  )
}





