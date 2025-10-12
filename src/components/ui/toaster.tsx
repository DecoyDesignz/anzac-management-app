"use client"

import {
  Toast,
  ToastClose,
  ToastDescription,
  ToastProvider,
  ToastTitle,
  ToastViewport,
} from "@/components/ui/toast"
import { useToast } from "@/hooks/use-toast"
import { CheckCircle2, AlertCircle, Info, AlertTriangle, Bell } from "lucide-react"

export function Toaster() {
  const { toasts } = useToast()

  const getIcon = (variant?: string) => {
    switch (variant) {
      case "success":
        return <CheckCircle2 className="w-5 h-5 text-primary" />
      case "destructive":
        return <AlertCircle className="w-5 h-5 text-destructive" />
      case "warning":
        return <AlertTriangle className="w-5 h-5 text-[oklch(0.70_0.15_70)]" />
      case "info":
        return <Info className="w-5 h-5 text-[oklch(0.60_0.10_250)]" />
      case "important":
        return <Bell className="w-5 h-5 text-primary animate-pulse-ring" />
      default:
        return null
    }
  }

  return (
    <ToastProvider duration={Infinity}>
      {toasts.map(function ({ id, title, description, action, variant, duration, ...props }) {
        const icon = getIcon(variant)
        return (
          <Toast key={id} variant={variant} duration={duration} {...props}>
            <div className="flex items-start gap-3 flex-1">
              {icon && <div className="flex-shrink-0 mt-0.5">{icon}</div>}
              <div className="grid gap-1 flex-1">
                {title && <ToastTitle>{title}</ToastTitle>}
                {description && (
                  <ToastDescription>{description}</ToastDescription>
                )}
              </div>
            </div>
            {action}
            <ToastClose />
          </Toast>
        )
      })}
      <ToastViewport />
    </ToastProvider>
  )
}

