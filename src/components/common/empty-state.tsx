"use client"

import { LucideIcon } from "lucide-react"
import { Button } from "@/components/ui/button"

interface EmptyStateProps {
  icon: LucideIcon
  title: string
  description?: string
  action?: {
    label: string
    onClick: () => void
    icon?: LucideIcon
  }
  className?: string
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className = "",
}: EmptyStateProps) {
  return (
    <div className={`text-center py-12 space-y-4 ${className}`}>
      <div className="flex justify-center">
        <Icon className="w-16 h-16 text-muted-foreground/50" />
      </div>
      <div className="space-y-2">
        <p className="text-lg font-medium text-muted-foreground">{title}</p>
        {description && (
          <p className="text-sm text-muted-foreground/70 max-w-md mx-auto">
            {description}
          </p>
        )}
      </div>
      {action && (
        <Button 
          variant="outline" 
          onClick={action.onClick}
          className="mt-4"
        >
          {action.icon && <action.icon className="w-4 h-4 mr-2" />}
          {action.label}
        </Button>
      )}
    </div>
  )
}

