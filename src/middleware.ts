import { auth } from "@/auth"
import { NextResponse } from "next/server"

export default auth((req) => {
  const { nextUrl } = req
  
  // Always allow access to login page - let the login page handle redirects client-side
  // This prevents issues where corrupted/invalid sessions block access
  if (nextUrl.pathname === "/login") {
    return NextResponse.next()
  }

  // Always allow access to maintenance page
  if (nextUrl.pathname === "/maintenance") {
    return NextResponse.next()
  }

  // Get auth status safely - req.auth may be null if session is invalid
  const isLoggedIn = !!req.auth
  const userRole = req.auth?.user?.role

  const isProtectedRoute = nextUrl.pathname.startsWith("/dashboard") || nextUrl.pathname === "/change-password"

  // Redirect to login if not logged in and trying to access protected route
  if (!isLoggedIn && isProtectedRoute) {
    const loginUrl = new URL("/login", nextUrl)
    loginUrl.searchParams.set("callbackUrl", nextUrl.pathname)
    return NextResponse.redirect(loginUrl)
  }

  // Member role restrictions - members can only access certain routes
  if (isLoggedIn && userRole === "member") {
    const memberAllowedRoutes = [
      "/dashboard",
      "/dashboard/calendar",
      "/change-password",
    ]
    
    const isAllowedRoute = memberAllowedRoutes.some(route => 
      nextUrl.pathname === route || nextUrl.pathname.startsWith(route + "/")
    )
    
    if (!isAllowedRoute && nextUrl.pathname.startsWith("/dashboard")) {
      // Redirect members to main dashboard if trying to access restricted routes
      return NextResponse.redirect(new URL("/dashboard", nextUrl))
    }
  }

  return NextResponse.next()
})

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
}

