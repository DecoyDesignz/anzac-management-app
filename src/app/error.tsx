"use client"

import { useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { AlertTriangle, RefreshCw, Home, Copy, Check } from "lucide-react"
import { useState } from "react"

interface ErrorPageProps {
  error: Error & { digest?: string }
  reset: () => void
}

export default function ErrorPage({ error, reset }: ErrorPageProps) {
  const [copied, setCopied] = useState(false)
  const [showDetails, setShowDetails] = useState(false)

  // Log error to console for debugging
  useEffect(() => {
    console.error("Error caught by error boundary:", error)
  }, [error])

  const errorDetails = {
    message: error.message,
    name: error.name,
    stack: error.stack,
    digest: error.digest,
    timestamp: new Date().toISOString(),
  }

  const errorString = JSON.stringify(errorDetails, null, 2)

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(errorString)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      console.error("Failed to copy:", err)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-2xl">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-destructive/20">
              <AlertTriangle className="w-6 h-6 text-destructive" />
            </div>
            <div>
              <CardTitle className="text-2xl text-destructive">
                Something went wrong
              </CardTitle>
              <CardDescription className="mt-1">
                An unexpected error occurred. Please try again or contact support.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Error Message */}
          <div className="p-4 rounded-lg bg-destructive/10 border border-destructive/20">
            <p className="text-sm font-medium text-destructive mb-1">Error Message:</p>
            <p className="text-sm text-foreground font-mono break-words">
              {error.message || "Unknown error occurred"}
            </p>
          </div>

          {/* Error Type */}
          {error.name && (
            <div className="p-3 rounded-lg bg-muted">
              <p className="text-xs text-muted-foreground mb-1">Error Type:</p>
              <p className="text-sm font-medium">{error.name}</p>
            </div>
          )}

          {/* Digest (Next.js error ID) */}
          {error.digest && (
            <div className="p-3 rounded-lg bg-muted">
              <p className="text-xs text-muted-foreground mb-1">Error ID:</p>
              <p className="text-sm font-mono">{error.digest}</p>
            </div>
          )}

          {/* Toggle Details */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowDetails(!showDetails)}
            className="w-full"
          >
            {showDetails ? "Hide" : "Show"} Error Details
          </Button>

          {/* Detailed Error Information */}
          {showDetails && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium">Full Error Details:</p>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={copyToClipboard}
                  className="h-8"
                >
                  {copied ? (
                    <>
                      <Check className="w-4 h-4 mr-2" />
                      Copied!
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4 mr-2" />
                      Copy
                    </>
                  )}
                </Button>
              </div>
              <div className="p-4 rounded-lg bg-muted border border-border overflow-auto max-h-96">
                <pre className="text-xs font-mono text-foreground whitespace-pre-wrap break-words">
                  {errorString}
                </pre>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-3 pt-4">
            <Button
              onClick={reset}
              className="flex-1"
              variant="default"
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Try Again
            </Button>
            <Button
              onClick={() => window.location.href = "/dashboard"}
              variant="outline"
              className="flex-1"
            >
              <Home className="w-4 h-4 mr-2" />
              Go to Dashboard
            </Button>
          </div>

          {/* Help Text */}
          <div className="pt-4 border-t">
            <p className="text-xs text-muted-foreground text-center">
              If this error persists, please copy the error details above and contact support.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

