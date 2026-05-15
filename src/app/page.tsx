"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { useSession } from "next-auth/react"

export default function Home() {
  const router = useRouter()
  const { status } = useSession()
  
  useEffect(() => {
    if (status === "loading") return
    // Home always goes to the dashboard (public when logged out; full app when logged in)
    router.replace("/dashboard")
  }, [status, router])
  
  // Show nothing while redirecting
  return null
}
