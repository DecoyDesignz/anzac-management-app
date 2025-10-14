"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { EventType } from "@/components/events"

interface CalendarDayCardProps {
  dayNumber: number
  fullDate: Date
  dayOfWeek: string
  isOverflow: boolean
  hasEvents: boolean
  eventCount: number
  isToday: boolean
  dayStyling: string
  textStyling: {
    title: string
    subtitle: string
  }
  onClick: () => void
}

export function CalendarDayCard({
  dayNumber,
  fullDate,
  dayOfWeek,
  isOverflow,
  hasEvents,
  eventCount,
  isToday,
  dayStyling,
  textStyling,
  onClick
}: CalendarDayCardProps) {
  return (
    <Card 
      variant="depth" 
      className={`${dayStyling} h-24 sm:h-28 md:h-32 flex flex-col cursor-pointer transition-all duration-200 hover:shadow-md hover:scale-[1.02] relative p-3`}
      onClick={onClick}
    >
      {/* Date header positioned absolutely at top */}
      <div className="absolute top-2 left-2">
        <div className={`text-sm font-medium ${textStyling.subtitle}`}>
          {fullDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'Australia/Sydney' })}
        </div>
      </div>
      
      {/* Event count centered in the entire card */}
      <div className="flex-1 flex flex-col justify-center items-center">
        {hasEvents ? (
          <div className="flex flex-col items-center justify-center text-center">
            <div className={`text-lg sm:text-xl md:text-2xl font-bold ${isToday ? 'text-primary' : isOverflow ? 'text-muted-foreground/70' : (() => {
              const sydneyDate = new Date(fullDate.toLocaleString('en-US', { timeZone: 'Australia/Sydney' }))
              const dayOfWeek = sydneyDate.getDay()
              return dayOfWeek === 0 || dayOfWeek === 6 ? 'text-purple-900 dark:text-purple-300' : 'text-blue-900 dark:text-blue-300'
            })()}`}>
              {eventCount}
            </div>
            <div className={`text-xs ${isToday ? 'text-primary/80' : isOverflow ? 'text-muted-foreground/60' : (() => {
              const sydneyDate = new Date(fullDate.toLocaleString('en-US', { timeZone: 'Australia/Sydney' }))
              const dayOfWeek = sydneyDate.getDay()
              return dayOfWeek === 0 || dayOfWeek === 6 ? 'text-purple-800 dark:text-purple-200' : 'text-blue-800 dark:text-blue-200'
            })()}`}>
              {eventCount === 1 ? 'event' : 'events'}
            </div>
          </div>
        ) : (
          <div className={`flex items-center justify-center text-center text-xs ${isOverflow ? 'text-muted-foreground/60' : isToday ? 'text-primary/80' : 'text-muted-foreground'}`}>
            No events
          </div>
        )}
      </div>
    </Card>
  )
}
