"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { cn } from "@/lib/utils"

interface CalendarEvent {
  day: number
  highlight?: boolean
}

export function CalendarWidget({ 
  title, 
  subtitle,
  events = []
}: { 
  title: string
  subtitle: string
  events?: CalendarEvent[]
}) {
  const [currentMonth, setCurrentMonth] = useState(new Date())
  
  const monthNames = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ]
  
  const weekDays = ["S", "M", "T", "W", "T", "F", "S"]
  
  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear()
    const month = date.getMonth()
    const firstDay = new Date(year, month, 1)
    const lastDay = new Date(year, month + 1, 0)
    const daysInMonth = lastDay.getDate()
    const startingDayOfWeek = firstDay.getDay()
    
    const days = []
    
    // Add empty cells for days before the first day of the month
    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push(null)
    }
    
    // Add days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      days.push(day)
    }
    
    return days
  }
  
  const goToPreviousMonth = () => {
    setCurrentMonth(prev => new Date(prev.getFullYear(), prev.getMonth() - 1, 1))
  }
  
  const goToNextMonth = () => {
    setCurrentMonth(prev => new Date(prev.getFullYear(), prev.getMonth() + 1, 1))
  }
  
  const isEventDay = (day: number | null) => {
    if (!day) return false
    return events.some(event => event.day === day)
  }
  
  const isHighlightedDay = (day: number | null) => {
    if (!day) return false
    return events.some(event => event.day === day && event.highlight)
  }
  
  const days = getDaysInMonth(currentMonth)
  
  return (
    <Card variant="depth">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-sm font-medium text-foreground">{title}</CardTitle>
            <p className="text-xs text-muted-foreground">{subtitle}</p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={goToPreviousMonth}
              className="h-6 w-6 p-0"
            >
              <ChevronLeft className="h-3 w-3" />
            </Button>
            <span className="text-xs font-medium text-foreground min-w-[80px] text-center">
              {monthNames[currentMonth.getMonth()]}
            </span>
            <Button
              variant="ghost"
              size="sm"
              onClick={goToNextMonth}
              className="h-6 w-6 p-0"
            >
              <ChevronRight className="h-3 w-3" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {/* Week day headers */}
          <div className="grid grid-cols-7 gap-1">
            {weekDays.map((day, index) => (
              <div key={index} className="text-center">
                <span className="text-xs text-muted-foreground font-medium">{day}</span>
              </div>
            ))}
          </div>
          
          {/* Calendar grid */}
          <div className="grid grid-cols-7 gap-1">
            {days.map((day, index) => (
              <div
                key={index}
                className={cn(
                  "aspect-square flex items-center justify-center text-xs font-medium rounded-sm transition-all duration-200",
                  !day && "invisible",
                  day && !isEventDay(day) && "text-muted-foreground hover:text-foreground hover:bg-muted/20",
                  isEventDay(day) && !isHighlightedDay(day) && "text-foreground bg-primary/10 hover:bg-primary/20",
                  isHighlightedDay(day) && "text-primary-foreground bg-primary hover:bg-primary/80"
                )}
              >
                {day}
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
