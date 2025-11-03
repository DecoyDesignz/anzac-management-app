"use client"

import { useEffect } from "react"
import { signOut } from "next-auth/react"

// Global flag to track if we've already set up error handling
let errorHandlerSetup = false

/**
 * Global error handler for Convex errors
 * Detects ArgumentValidationError for old systemUsers IDs and logs the user out
 */
export function ConvexErrorHandler() {
  useEffect(() => {
    // Only set up error handling once globally
    if (errorHandlerSetup) {
      return
    }
    
    errorHandlerSetup = true

    // Listen for unhandled errors in the browser console
    const handleError = (event: ErrorEvent) => {
      // Check if this is an ArgumentValidationError about systemUsers IDs
      const errorMessage = event.message || ""
      
      if (
        errorMessage.includes("ArgumentValidationError") &&
        errorMessage.includes("systemUsers") &&
        errorMessage.includes("personnel")
      ) {
        console.error("Detected old systemUsers ID in session. Logging out user...")
        
        // Sign out the user and redirect to login
        signOut({ 
          callbackUrl: "/login",
          redirect: true 
        })
      }
    }

    // Listen for unhandled promise rejections
    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      const error = event.reason
      const errorMessage = error?.message || String(error) || ""
      
      if (
        errorMessage.includes("ArgumentValidationError") &&
        errorMessage.includes("systemUsers") &&
        errorMessage.includes("personnel")
      ) {
        console.error("Detected old systemUsers ID in session (promise rejection). Logging out user...")
        
        event.preventDefault() // Prevent the error from showing in console
        
        // Sign out the user and redirect to login
        signOut({ 
          callbackUrl: "/login",
          redirect: true 
        })
      }
    }

    // Listen for console errors by intercepting console.error
    const originalConsoleError = console.error
    console.error = (...args: unknown[]) => {
      originalConsoleError(...args)
      
      // Check if this is an ArgumentValidationError about systemUsers IDs
      const errorString = args.map(arg => String(arg)).join(" ")
      
      if (
        errorString.includes("ArgumentValidationError") &&
        errorString.includes("systemUsers") &&
        errorString.includes("personnel")
      ) {
        originalConsoleError("Detected old systemUsers ID in session. Logging out user...")
        
        // Sign out the user and redirect to login
        signOut({ 
          callbackUrl: "/login",
          redirect: true 
        })
      }
    }

    window.addEventListener("error", handleError)
    window.addEventListener("unhandledrejection", handleUnhandledRejection)

    return () => {
      // Cleanup only runs if component unmounts (unlikely for root component)
      window.removeEventListener("error", handleError)
      window.removeEventListener("unhandledrejection", handleUnhandledRejection)
    }
  }, [])

  return null
}

