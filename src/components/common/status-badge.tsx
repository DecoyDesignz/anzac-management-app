"use client"

import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"

interface StatusBadgeProps {
  status: string
  type?: "personnel" | "event" | "user"
  className?: string
  showIndicator?: boolean
}

export function StatusBadge({
  status,
  type = "personnel",
  className = "",
  showIndicator = false,
}: StatusBadgeProps) {
  const getStatusStyles = () => {
    const normalizedStatus = status.toLowerCase()
    
    switch (type) {
      case "personnel":
        switch (normalizedStatus) {
          case "active":
            return "bg-green-500/20 text-green-700 dark:text-green-300 border-green-500/30"
          case "leave":
            return "bg-yellow-500/20 text-yellow-700 dark:text-yellow-300 border-yellow-500/30"
          case "inactive":
            return "bg-gray-500/20 text-gray-700 dark:text-gray-300 border-gray-500/30"
          case "archived":
            return "bg-red-500/20 text-red-700 dark:text-red-300 border-red-500/30"
          default:
            return "bg-muted/50 text-muted-foreground border-border"
        }
      
      case "event":
        switch (normalizedStatus) {
          case "scheduled":
            return "bg-blue-500/20 text-blue-700 dark:text-blue-300 border-blue-500/30"
          case "in_progress":
            return "bg-primary/20 text-primary border-primary/30"
          case "completed":
            return "bg-green-500/20 text-green-700 dark:text-green-300 border-green-500/30"
          case "cancelled":
            return "bg-gray-500/20 text-gray-700 dark:text-gray-300 border-gray-500/30"
          default:
            return "bg-muted/50 text-muted-foreground border-border"
        }
      
      case "user":
        switch (normalizedStatus) {
          case "active":
            return "bg-green-500/20 text-green-700 dark:text-green-300 border-green-500/30"
          case "inactive":
            return "bg-red-500/20 text-red-700 dark:text-red-300 border-red-500/30"
          default:
            return "bg-muted/50 text-muted-foreground border-border"
        }
      
      default:
        return "bg-muted/50 text-muted-foreground border-border"
    }
  }

  const getIndicatorColor = () => {
    const normalizedStatus = status.toLowerCase()
    if (normalizedStatus === "active") return "bg-green-500"
    if (normalizedStatus === "inactive" || normalizedStatus === "archived") return "bg-red-500"
    if (normalizedStatus === "leave") return "bg-yellow-500"
    if (normalizedStatus === "in_progress") return "bg-primary"
    return "bg-gray-500"
  }

  return (
    <Badge
      variant="secondary"
      className={cn(
        "border capitalize",
        getStatusStyles(),
        showIndicator && "flex items-center gap-1.5",
        className
      )}
    >
      {showIndicator && (
        <span className={cn("w-2 h-2 rounded-full animate-pulse", getIndicatorColor())} />
      )}
      {status.replace(/_/g, ' ')}
    </Badge>
  )
}

