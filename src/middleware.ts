import { auth } from "@/auth"
import { NextResponse } from "next/server"

export default auth((req) => {
  const { nextUrl } = req
  const isLoggedIn = !!req.auth

  const isPublicRoute = nextUrl.pathname === "/login" || nextUrl.pathname === "/"
  const isProtectedRoute = nextUrl.pathname.startsWith("/dashboard") || nextUrl.pathname === "/change-password"

  // Redirect to dashboard if logged in and trying to access login
  if (isLoggedIn && nextUrl.pathname === "/login") {
    return NextResponse.redirect(new URL("/dashboard", nextUrl))
  }

  // Redirect to login if not logged in and trying to access protected route
  if (!isLoggedIn && isProtectedRoute) {
    const loginUrl = new URL("/login", nextUrl)
    loginUrl.searchParams.set("callbackUrl", nextUrl.pathname)
    return NextResponse.redirect(loginUrl)
  }

  return NextResponse.next()
})

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
}

