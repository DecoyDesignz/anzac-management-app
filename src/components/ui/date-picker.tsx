"use client"

import * as React from "react"
import { CalendarIcon } from "lucide-react"
import { format } from "date-fns"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"

interface DatePickerProps {
  date?: Date
  onDateChange?: (date: Date | undefined) => void
  disabled?: (date: Date) => boolean
  placeholder?: string
  className?: string
  fromDate?: Date
  toDate?: Date
  disablePast?: boolean
  disableFuture?: boolean
}

export function DatePicker({
  date,
  onDateChange,
  disabled,
  placeholder = "Pick a date",
  className,
  fromDate,
  toDate,
  disablePast = false,
  disableFuture = false,
}: DatePickerProps) {
  const [open, setOpen] = React.useState(false)

  // Combine all disabled conditions
  const combinedDisabled = React.useCallback(
    (date: Date) => {
      // Check custom disabled function
      if (disabled && disabled(date)) return true
      
      // Check past dates
      if (disablePast) {
        const today = new Date()
        today.setHours(0, 0, 0, 0)
        if (date < today) return true
      }
      
      // Check future dates
      if (disableFuture) {
        const today = new Date()
        today.setHours(23, 59, 59, 999)
        if (date > today) return true
      }
      
      return false
    },
    [disabled, disablePast, disableFuture]
  )

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className={cn(
            "w-full justify-start text-left font-normal",
            !date && "text-muted-foreground",
            className
          )}
        >
          <CalendarIcon className="mr-2 h-4 w-4" />
          {date ? format(date, "PPP") : <span>{placeholder}</span>}
        </Button>
      </PopoverTrigger>
      <PopoverContent 
        className="w-auto p-0"
        align="start"
      >
        <Calendar
          mode="single"
          selected={date}
          onSelect={(selectedDate) => {
            onDateChange?.(selectedDate)
            setOpen(false)
          }}
          disabled={combinedDisabled}
          fromDate={fromDate}
          toDate={toDate}
          initialFocus
          className="rounded-md border"
        />
      </PopoverContent>
    </Popover>
  )
}

interface DateRangePickerProps {
  dateRange?: { from: Date | undefined; to: Date | undefined }
  onDateRangeChange?: (range: { from: Date | undefined; to: Date | undefined }) => void
  disabled?: (date: Date) => boolean
  placeholder?: string
  className?: string
  fromDate?: Date
  toDate?: Date
}

export function DateRangePicker({
  dateRange,
  onDateRangeChange,
  disabled,
  placeholder = "Pick a date range",
  className,
  fromDate,
  toDate,
}: DateRangePickerProps) {
  const [open, setOpen] = React.useState(false)

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className={cn(
            "w-full justify-start text-left font-normal",
            !dateRange?.from && "text-muted-foreground",
            className
          )}
        >
          <CalendarIcon className="mr-2 h-4 w-4" />
          {dateRange?.from ? (
            dateRange.to ? (
              <>
                {format(dateRange.from, "LLL dd, y")} -{" "}
                {format(dateRange.to, "LLL dd, y")}
              </>
            ) : (
              format(dateRange.from, "LLL dd, y")
            )
          ) : (
            <span>{placeholder}</span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="range"
          selected={dateRange}
          onSelect={(range) => {
            onDateRangeChange?.(range as { from: Date | undefined; to: Date | undefined })
            // Only close if both dates are selected
            if (range?.from && range?.to) {
              setOpen(false)
            }
          }}
          disabled={disabled}
          fromDate={fromDate}
          toDate={toDate}
          initialFocus
          numberOfMonths={2}
          className="rounded-md border"
        />
      </PopoverContent>
    </Popover>
  )
}

