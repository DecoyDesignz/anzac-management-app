import { NextRequest, NextResponse } from "next/server"
import { signOut } from "@/auth"

/**
 * API endpoint to force logout
 * This can be called programmatically to clear the session
 * 
 * Usage:
 *   fetch('/api/auth/logout', { method: 'POST' })
 */
export async function POST(request: NextRequest) {
  try {
    // Sign out using NextAuth
    await signOut({ redirect: false })
    
    return NextResponse.json(
      { success: true, message: "Logged out successfully" },
      {
        status: 200,
        headers: {
          // Clear auth cookies by setting them to expire
          "Set-Cookie": [
            "next-auth.session-token=; Path=/; Expires=Thu, 01 Jan 1970 00:00:00 GMT; HttpOnly; SameSite=Lax",
            "next-auth.csrf-token=; Path=/; Expires=Thu, 01 Jan 1970 00:00:00 GMT; HttpOnly; SameSite=Lax",
            "__Secure-next-auth.session-token=; Path=/; Expires=Thu, 01 Jan 1970 00:00:00 GMT; HttpOnly; SameSite=Lax; Secure",
            "__Host-next-auth.csrf-token=; Path=/; Expires=Thu, 01 Jan 1970 00:00:00 GMT; HttpOnly; SameSite=Lax; Secure",
          ].join(", "),
        },
      }
    )
  } catch (error) {
    console.error("Logout error:", error)
    return NextResponse.json(
      { success: false, error: "Failed to logout" },
      { status: 500 }
    )
  }
}

// Also allow GET requests for easier access
export async function GET(request: NextRequest) {
  return POST(request)
}



