import NextAuth from "next-auth"
import Credentials from "next-auth/providers/credentials"
import { fetchQuery, fetchAction } from "convex/nextjs"
import { api } from "../convex/_generated/api"

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [
    Credentials({
      name: "credentials",
      credentials: {
        username: { label: "Username", type: "text" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.username || !credentials?.password) {
          throw new Error("Please provide both username and password")
        }

        try {
          // Verify credentials using Convex action
          const result = await fetchAction(
            api.userActions.verifyCredentials,
            { 
              username: credentials.username as string,
              password: credentials.password as string
            },
            { url: process.env.NEXT_PUBLIC_CONVEX_URL! }
          )

          if (!result.success || !result.user) {
            throw new Error(result.error || "Invalid username or password")
          }

          // Return user object
          return {
            id: result.user._id,
            email: result.user.email || result.user.callSign, // Use callSign as email fallback for compatibility
            name: result.user.callSign || result.user.name, // Use callSign as name
            role: result.user.role || "member",
            requirePasswordChange: result.user.requirePasswordChange ?? false,
          }
        } catch (error: unknown) {
          console.error("Auth error:", error)
          throw new Error(error instanceof Error ? error.message : "Authentication failed")
        }
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id
        token.role = user.role
        token.requirePasswordChange = user.requirePasswordChange
      }
      return token
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string
        session.user.role = token.role as string
        session.user.requirePasswordChange = token.requirePasswordChange as boolean
      }
      return session
    },
  },
  pages: {
    signIn: "/login",
  },
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  secret: process.env.NEXTAUTH_SECRET,
})

