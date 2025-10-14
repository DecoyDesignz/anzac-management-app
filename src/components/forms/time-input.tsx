"use client"

import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"

interface TimeInputProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  disabled?: boolean
  className?: string
  id?: string
}

export function TimeInput({
  value,
  onChange,
  placeholder = "HHMM",
  disabled = false,
  className,
  id,
}: TimeInputProps) {
  const isValidTime = (timeStr: string) => {
    if (!timeStr || !/^\d{4}$/.test(timeStr)) return false
    const hours = parseInt(timeStr.substring(0, 2))
    const minutes = parseInt(timeStr.substring(2, 4))
    return hours >= 0 && hours <= 23 && minutes >= 0 && minutes <= 59
  }

  const formatTimeForDisplay = (timeStr: string) => {
    if (!timeStr || !isValidTime(timeStr)) return ""
    const hours = timeStr.substring(0, 2)
    const minutes = timeStr.substring(2, 4)
    return `${hours}:${minutes}`
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let newValue = e.target.value.replace(/\D/g, '')
    if (newValue.length > 4) newValue = newValue.substring(0, 4)
    onChange(newValue)
  }

  const hasError = value && !isValidTime(value)
  const formattedDisplay = isValidTime(value) ? formatTimeForDisplay(value) : null

  return (
    <div className="space-y-1">
      <Input
        id={id}
        type="text"
        value={value}
        onChange={handleChange}
        placeholder={placeholder}
        disabled={disabled}
        maxLength={4}
        className={cn(
          hasError && "border-destructive focus-visible:ring-destructive",
          className
        )}
      />
      {formattedDisplay && (
        <p className="text-xs text-muted-foreground">
          {formattedDisplay} (24-hour format)
        </p>
      )}
    </div>
  )
}

