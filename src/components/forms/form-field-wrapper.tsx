"use client"

import { Label } from "@/components/ui/label"
import { cn } from "@/lib/utils"

interface FormFieldWrapperProps {
  label: string
  children: React.ReactNode
  error?: string
  helpText?: string
  required?: boolean
  className?: string
  htmlFor?: string
}

export function FormFieldWrapper({
  label,
  children,
  error,
  helpText,
  required = false,
  className = "",
  htmlFor,
}: FormFieldWrapperProps) {
  return (
    <div className={cn("space-y-2", className)}>
      <Label htmlFor={htmlFor} className="text-foreground/90">
        {label}
        {required && <span className="text-destructive ml-1">*</span>}
      </Label>
      {children}
      {error && (
        <p className="text-sm text-destructive">{error}</p>
      )}
      {helpText && !error && (
        <p className="text-xs text-muted-foreground">{helpText}</p>
      )}
    </div>
  )
}

