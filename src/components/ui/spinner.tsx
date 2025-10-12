import { cn } from "@/lib/utils"

export interface SpinnerProps extends React.HTMLAttributes<HTMLDivElement> {
  size?: "sm" | "md" | "lg" | "xl"
}

export function Spinner({ size = "md", className, ...props }: SpinnerProps) {
  const sizeClasses = {
    sm: "w-4 h-4 border-2",
    md: "w-8 h-8 border-2",
    lg: "w-12 h-12 border-3",
    xl: "w-16 h-16 border-4",
  }

  return (
    <div
      className={cn(
        "animate-spin rounded-full border-primary border-t-transparent",
        sizeClasses[size],
        className
      )}
      role="status"
      aria-label="Loading"
      {...props}
    />
  )
}

export function SpinnerWithText({ 
  text = "Loading...", 
  size = "md" 
}: { 
  text?: string
  size?: SpinnerProps["size"]
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-4 py-8">
      <Spinner size={size} />
      <p className="text-sm text-muted-foreground animate-pulse">{text}</p>
    </div>
  )
}

export function InlineSpinner({ 
  text, 
  size = "sm" 
}: { 
  text?: string
  size?: SpinnerProps["size"]
}) {
  return (
    <div className="flex items-center gap-2">
      <Spinner size={size} />
      {text && <span className="text-sm text-muted-foreground">{text}</span>}
    </div>
  )
}

