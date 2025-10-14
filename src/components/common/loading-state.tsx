"use client"

import { LucideIcon } from "lucide-react"
import { Skeleton } from "@/components/ui/skeleton"

interface LoadingStateProps {
  type?: "spinner" | "skeleton"
  message?: string
  icon?: LucideIcon
  count?: number
  className?: string
}

export function LoadingState({
  type = "spinner",
  message = "Loading...",
  icon: Icon,
  count = 5,
  className = "",
}: LoadingStateProps) {
  if (type === "skeleton") {
    return (
      <div className={`space-y-3 ${className}`}>
        {Array.from({ length: count }).map((_, i) => (
          <Skeleton key={i} className="h-16 w-full" />
        ))}
      </div>
    )
  }

  // Spinner type
  return (
    <div className={`text-center py-16 ${className}`}>
      <div className="inline-block animate-spin mb-4">
        {Icon ? (
          <Icon className="w-12 h-12 text-primary" />
        ) : (
          <div className="w-12 h-12 rounded-full border-4 border-primary border-t-transparent" />
        )}
      </div>
      {message && <p className="text-muted-foreground">{message}</p>}
    </div>
  )
}

