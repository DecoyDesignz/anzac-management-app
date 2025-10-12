"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { useSession } from "next-auth/react"

export default function Home() {
  const router = useRouter()
  const { data: session, status } = useSession()
  
  useEffect(() => {
    // Wait for auth to load
    if (status === "loading") return
    
    if (session) {
      router.push("/dashboard")
    } else {
      router.push("/login")
    }
  }, [session, status, router])
  
  // Show nothing while redirecting
  return null
}
