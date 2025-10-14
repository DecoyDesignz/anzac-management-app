"use client"

import { Label } from "@/components/ui/label"
import { LucideIcon } from "lucide-react"
import { cn } from "@/lib/utils"

interface InfoCardProps {
  label: string
  value: string | React.ReactNode
  icon?: LucideIcon
  className?: string
}

export function InfoCard({
  label,
  value,
  icon: Icon,
  className = "",
}: InfoCardProps) {
  return (
    <div className={cn("p-4 rounded-lg bg-secondary/20 border border-border/50", className)}>
      <Label className="text-xs text-muted-foreground mb-1 flex items-center gap-1.5">
        {Icon && <Icon className="w-3 h-3" />}
        {label}
      </Label>
      {typeof value === 'string' ? (
        <p className="font-medium text-foreground">{value}</p>
      ) : (
        value
      )}
    </div>
  )
}

