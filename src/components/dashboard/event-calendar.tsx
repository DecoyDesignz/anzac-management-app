"use client"

import { useState } from "react"
import { useQuery, useMutation } from "convex/react"
import { useSession } from "next-auth/react"
import { api } from "../../../convex/_generated/api"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { 
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Id } from "../../../convex/_generated/dataModel"
import { EventCard, EventDetailView, EventType } from "@/components/events"
import { MobileMonthCalendar } from "./mobile-month-calendar"
import { CalendarDayCard } from "./calendar-day-card"

// EventType is now imported from @/components/events

interface EventCalendarProps {
  selectedWeek?: Date
  onWeekChange?: (date: Date) => void
  bookingModalOpen?: boolean
  onBookingModalOpenChange?: (open: boolean) => void
  onEditEvent?: (event: EventType) => void
  onBookingWithDate?: (date: Date) => void
}

// EventCard is now imported from @/components/events

export function EventCalendar({ selectedWeek = new Date(), onWeekChange, onBookingModalOpenChange, onEditEvent, onBookingWithDate }: EventCalendarProps) {
  const [editModalOpen, setEditModalOpen] = useState(false)
  const [selectedEvent, setSelectedEvent] = useState<EventType | null>(null)
  const [dayEventsModalOpen, setDayEventsModalOpen] = useState(false)
  const [selectedDayEvents, setSelectedDayEvents] = useState<EventType[]>([])
  const [selectedDayDate, setSelectedDayDate] = useState<Date | null>(null)
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set())
  const [isAnimating, setIsAnimating] = useState(false)
  const [viewMode, setViewMode] = useState<'week' | 'month'>('month')
  const { data: session } = useSession()
  
  // Check if we're viewing the current week
  const currentWeekStart = getWeekStart(new Date())
  const selectedWeekStart = getWeekStart(selectedWeek)
  
  const isCurrentWeek = selectedWeekStart.getTime() === currentWeekStart.getTime()
  
  // Animation functions
  const animateWeekChange = (newDate: Date) => {
    setIsAnimating(true)
    setTimeout(() => {
      onWeekChange?.(newDate)
      setTimeout(() => {
        setIsAnimating(false)
      }, 150) // Allow content to load before ending animation
    }, 150) // Fade out duration
  }
  
  const toggleGroupExpansion = (dayIndex: number, groupIndex: number) => {
    const key = `${dayIndex}-${groupIndex}`
    const newExpanded = new Set(expandedGroups)
    if (newExpanded.has(key)) {
      newExpanded.delete(key)
    } else {
      newExpanded.add(key)
    }
    setExpandedGroups(newExpanded)
  }

  // Fetch data based on view mode
  const events = useQuery(
    api.events.listEvents,
    session?.user?.id ? (viewMode === 'week' ? {
      userId: session.user.id as Id<"personnel">,
      startDate: getWeekStart(selectedWeek).getTime(),
      endDate: getWeekEnd(selectedWeek).getTime()
    } : {
      userId: session.user.id as Id<"personnel">,
      startDate: getMonthStart(selectedWeek).getTime(),
      endDate: getMonthEnd(selectedWeek).getTime()
    }) : "skip"
  )

  // Debug logging for events
  if (viewMode === 'month' && events) {
    console.log('Month view events:', events.length, events.map(e => ({ title: e.title, startDate: new Date(e.startDate).toLocaleDateString('en-CA', { timeZone: 'Australia/Sydney' }) })))
  }

  // Mutations
  const clearEventByCode = useMutation(api.events.clearEventByCode)

  // Helper functions
  // Get the start of the week (Monday 00:00 Sydney time) as a UTC timestamp
  function getWeekStart(date: Date): Date {
    // Get what date/time it is in Sydney timezone
    const sydneyDateStr = date.toLocaleDateString('en-CA', { timeZone: 'Australia/Sydney' }) // YYYY-MM-DD
    const [year, month, day] = sydneyDateStr.split('-').map(Number)
    
    // Determine the day of week for this Sydney date
    // Create a UTC date at noon to avoid any timezone edge cases when determining day of week
    const tempDate = new Date(`${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}T12:00:00Z`)
    const dayOfWeek = tempDate.getUTCDay() // 0 = Sunday, 1 = Monday, etc.
    
    // Calculate days to subtract to get to Monday
    const daysToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek
    
    // Get Monday's date
    const mondayDate = new Date(tempDate)
    mondayDate.setUTCDate(tempDate.getUTCDate() + daysToMonday)
    const mondayYear = mondayDate.getUTCFullYear()
    const mondayMonth = mondayDate.getUTCMonth() + 1
    const mondayDay = mondayDate.getUTCDate()
    
    // Create ISO string for Monday 00:00 in Sydney timezone
    const isDST = (mondayMonth > 10 || mondayMonth < 4) || (mondayMonth === 10 && mondayDay >= 1) || (mondayMonth === 4 && mondayDay < 1)
    const offset = isDST ? '+11:00' : '+10:00'
    const mondayISO = `${mondayYear}-${String(mondayMonth).padStart(2, '0')}-${String(mondayDay).padStart(2, '0')}T00:00:00${offset}`
    
    return new Date(mondayISO)
  }

  function getWeekEnd(date: Date): Date {
    const start = getWeekStart(date)
    const end = new Date(start)
    // Add 7 days minus 1 millisecond to get Sunday 23:59:59.999 Sydney time
    end.setTime(start.getTime() + (7 * 24 * 60 * 60 * 1000) - 1)
    return end
  }

  function getMonthStart(date: Date): Date {
    // Get what date/time it is in Sydney timezone
    const sydneyDateStr = date.toLocaleDateString('en-CA', { timeZone: 'Australia/Sydney' }) // YYYY-MM-DD
    const [year, month] = sydneyDateStr.split('-').map(Number)
    
    // Create a simple date for the first day of the month
    return new Date(year, month - 1, 1, 0, 0, 0, 0)
  }

  function getMonthName(date: Date): string {
    // Get the month name from the actual date being displayed, not from getMonthStart
    return date.toLocaleDateString('en-US', { 
      month: 'long',
      year: 'numeric',
      timeZone: 'Australia/Sydney'
    })
  }

  function getMonthEnd(date: Date): Date {
    const start = getMonthStart(date)
    // Get the last day of the month
    const year = start.getFullYear()
    const month = start.getMonth()
    const lastDay = new Date(year, month + 1, 0).getDate()
    
    // Create a simple date for the last day of the month
    return new Date(year, month, lastDay, 23, 59, 59, 999)
  }

  function formatDate(timestamp: number): string {
    return new Date(timestamp).toLocaleDateString('en-US', { 
      weekday: 'short',
      month: 'short', 
      day: 'numeric',
      timeZone: 'Australia/Sydney'
    })
  }


  // Get all days for the week view (Monday-Sunday)
  const getWeekGridDays = () => {
    // Get the week start (Monday) from selectedWeek
    const weekStart = getWeekStart(selectedWeek)
    
    // Build array of 7 days starting from Monday, ending with Sunday
    const weekDays: Array<{
      dayNumber: number
      fullDate: Date
      dayOfWeek: string
    }> = []
    
    for (let i = 0; i < 7; i++) {
      const currentDate = new Date(weekStart)
      currentDate.setDate(weekStart.getDate() + i)
      
      weekDays.push({
        dayNumber: currentDate.getDate(),
        fullDate: currentDate,
        dayOfWeek: currentDate.toLocaleDateString('en-US', { weekday: 'short', timeZone: 'Australia/Sydney' })
      })
    }
    
    return weekDays
  }

  // Get events for a specific date in week view
  const getEventsForWeekDay = (targetDate: Date) => {
    // Get the target date string in YYYY-MM-DD format in Sydney timezone
    const targetDateStr = targetDate.toLocaleDateString('en-CA', { timeZone: 'Australia/Sydney' })

    return events?.filter(event => {
      // Get the event's date in Sydney timezone
      const eventStart = new Date(event.startDate)
      const eventDateStr = eventStart.toLocaleDateString('en-CA', { timeZone: 'Australia/Sydney' })
      
      // Compare dates in Sydney timezone
      return eventDateStr === targetDateStr
    }).sort((a, b) => a.startDate - b.startDate) || []
  }

  // Check if events overlap
  const hasOverlap = (event1: EventType, event2: EventType) => {
    return event1.startDate < event2.endDate && event2.startDate < event1.endDate
  }

  // Group overlapping events
  const getEventGroups = (dayEvents: EventType[]) => {
    const groups: EventType[][] = []
    const processed = new Set<string>()

    dayEvents.forEach(event => {
      if (processed.has(event._id)) return

      const group = [event]
      processed.add(event._id)

      dayEvents.forEach(otherEvent => {
        if (otherEvent._id === event._id || processed.has(otherEvent._id)) return
        if (hasOverlap(event, otherEvent)) {
          group.push(otherEvent)
          processed.add(otherEvent._id)
        }
      })

      groups.push(group)
    })

    return groups
  }

  // Get all days to display in calendar grid (including overflow from prev/next months)
  const getCalendarGridDays = () => {
    // Get the month/year from selectedWeek in Sydney timezone
    const sydneyDateStr = selectedWeek.toLocaleDateString('en-CA', { timeZone: 'Australia/Sydney' })
    const [year, month] = sydneyDateStr.split('-').map(Number)
    const monthIndex = month - 1 // Convert to 0-based month index
    
    // Get the first day of the month and its day of week (0=Sunday, 6=Saturday)
    // Create the date in Sydney timezone by creating an ISO string
    const firstDayOfMonth = new Date(`${year}-${String(month).padStart(2, '0')}-01T12:00:00+10:00`)
    const firstDayOfWeek = firstDayOfMonth.getUTCDay() // Use UTC to avoid timezone conversion
    
    // Get days in current month
    const daysInMonth = new Date(year, monthIndex + 1, 0).getDate()
    
    // Calculate previous month days needed to fill the grid
    const prevMonthDays = firstDayOfWeek // If Sunday=0, no overflow; if Monday=1, 1 overflow day, etc.
    
    // Calculate total cells and next month days needed
    const totalDays = daysInMonth + prevMonthDays
    const nextMonthDays = totalDays % 7 === 0 ? 0 : 7 - (totalDays % 7)
    
    // Build array of day objects
    const gridDays: Array<{
      dayNumber: number
      month: 'prev' | 'current' | 'next'
      fullDate: Date
      isOverflow: boolean
    }> = []
    
    // Add previous month overflow days
    if (prevMonthDays > 0) {
      const prevMonthIndex = monthIndex === 0 ? 11 : monthIndex - 1
      const prevYear = monthIndex === 0 ? year - 1 : year
      const daysInPrevMonth = new Date(prevYear, prevMonthIndex + 1, 0).getDate()
      
      for (let i = prevMonthDays - 1; i >= 0; i--) {
        const dayNum = daysInPrevMonth - i
        // Create date in Sydney timezone
        const prevMonth = prevMonthIndex + 1
        const prevDate = new Date(`${prevYear}-${String(prevMonth).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}T12:00:00+10:00`)
        gridDays.push({
          dayNumber: dayNum,
          month: 'prev',
          fullDate: prevDate,
          isOverflow: true
        })
      }
    }
    
    // Add current month days
    for (let i = 1; i <= daysInMonth; i++) {
      // Create date in Sydney timezone
      const currentDate = new Date(`${year}-${String(month).padStart(2, '0')}-${String(i).padStart(2, '0')}T12:00:00+10:00`)
      gridDays.push({
        dayNumber: i,
        month: 'current',
        fullDate: currentDate,
        isOverflow: false
      })
    }
    
    // Add next month overflow days
    if (nextMonthDays > 0) {
      const nextMonthIndex = monthIndex === 11 ? 0 : monthIndex + 1
      const nextYear = monthIndex === 11 ? year + 1 : year
      
      for (let i = 1; i <= nextMonthDays; i++) {
        // Create date in Sydney timezone
        const nextMonth = nextMonthIndex + 1
        const nextDate = new Date(`${nextYear}-${String(nextMonth).padStart(2, '0')}-${String(i).padStart(2, '0')}T12:00:00+10:00`)
        gridDays.push({
          dayNumber: i,
          month: 'next',
          fullDate: nextDate,
          isOverflow: true
        })
      }
    }
    
    return gridDays
  }

  // Get events for a specific date (supports overflow days from prev/next months)
  const getEventsForDate = (targetDate: Date) => {
    // Ensure targetDate is a valid Date object
    if (!targetDate || !(targetDate instanceof Date) || isNaN(targetDate.getTime())) {
      return []
    }
    
    // Get the target date string in YYYY-MM-DD format in Sydney timezone
    const targetDateStr = targetDate.toLocaleDateString('en-CA', { timeZone: 'Australia/Sydney' })

    const filteredEvents = events?.filter(event => {
      // Get the event's date in Sydney timezone
      const eventDate = new Date(event.startDate)
      const eventDateStr = eventDate.toLocaleDateString('en-CA', { timeZone: 'Australia/Sydney' })
      
      // Compare dates in Sydney timezone
      return eventDateStr === targetDateStr
    }).sort((a, b) => a.startDate - b.startDate) || []

    return filteredEvents
  }

  // Check if a date is today
  const isToday = (date: Date) => {
    const today = new Date()
    const todayStr = today.toLocaleDateString('en-CA', { timeZone: 'Australia/Sydney' })
    const dateStr = date.toLocaleDateString('en-CA', { timeZone: 'Australia/Sydney' })
    return todayStr === dateStr
  }

  // Get day styling based on day type
  const getDayStyling = (date: Date, isOverflow: boolean = false, hasEvents: boolean = false) => {
    // Get the day of week in Sydney timezone to avoid timezone issues
    // Create a date in Sydney timezone and get the day of week
    const sydneyDate = new Date(date.toLocaleString('en-US', { timeZone: 'Australia/Sydney' }))
    const dayOfWeek = sydneyDate.getDay() // 0 = Sunday, 1 = Monday, etc.
    const isCurrentDay = isToday(date)
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6 // Sunday or Saturday
    
    // Overflow days (grayed out, no interaction)
    if (isOverflow) {
      return "flex flex-col cursor-default opacity-40 bg-muted/10 border-muted/20"
    }
    
    const baseClasses = "flex flex-col cursor-pointer transition-all duration-200 hover:shadow-md hover:scale-[1.02]"
    
    // Add subtle emphasis for days with events
    const eventEmphasis = hasEvents ? "ring-1 ring-accent/30 shadow-sm" : ""
    
    if (isCurrentDay) {
      // Today gets special treatment with primary colors
      return `${baseClasses} ring-2 ring-primary/65 border-primary/45 bg-primary/10 ${eventEmphasis}`
    } else if (isWeekend) {
      // Weekends get a subtle purple tint, enhanced if they have events
      const weekendBg = hasEvents ? "bg-purple-950/30" : "bg-purple-950/20"
      const weekendBorder = hasEvents ? "border-purple-700/40" : "border-purple-800/30"
      return `${baseClasses} ${weekendBg} ${weekendBorder} hover:border-purple-600/50 ${eventEmphasis}`
    } else {
      // Weekdays get the default styling with subtle blue tint, enhanced if they have events
      const weekdayBg = hasEvents ? "bg-blue-950/20" : "bg-blue-950/10"
      const weekdayBorder = hasEvents ? "border-blue-700/30" : "border-blue-800/20"
      return `${baseClasses} ${weekdayBg} ${weekdayBorder} hover:border-blue-600/40 ${eventEmphasis}`
    }
  }

  // Get text styling based on day type
  const getTextStyling = (date: Date, isTitle: boolean = false, isOverflow: boolean = false) => {
    // Overflow days get muted text with better contrast
    if (isOverflow) {
      return isTitle ? 'text-gray-600 dark:text-muted-foreground/70 font-normal' : 'text-gray-500 dark:text-muted-foreground/60'
    }
    
    // Get the day of week in Sydney timezone to avoid timezone issues
    // Create a date in Sydney timezone and get the day of week
    const sydneyDate = new Date(date.toLocaleString('en-US', { timeZone: 'Australia/Sydney' }))
    const dayOfWeek = sydneyDate.getDay() // 0 = Sunday, 1 = Monday, etc.
    const isCurrentDay = isToday(date)
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6
    
    if (isCurrentDay) {
      return isTitle ? 'text-primary font-bold' : 'text-primary font-medium'
    } else if (isWeekend) {
      // Use much darker colors for better readability in light mode
      return isTitle ? 'text-purple-900 dark:text-purple-300 font-semibold' : 'text-purple-800 dark:text-purple-200'
    } else {
      // Use much darker colors for better readability in light mode
      return isTitle ? 'text-blue-900 dark:text-blue-300 font-semibold' : 'text-blue-800 dark:text-blue-100'
    }
  }

  const handleClearEvent = async (bookingCode: string) => {
    try {
      if (!session?.user?.id) {
        throw new Error("Session expired. Please log in again.")
      }
      await clearEventByCode({
        userId: session.user.id as Id<"personnel">,
        bookingCode
      })
      setEditModalOpen(false)
    } catch (error) {
      console.error("Failed to clear event:", error)
      alert("Failed to clear event. Please check the booking code.")
    }
  }

  const handleDayClick = (dayDate: Date, isOverflow: boolean) => {
    // Don't allow clicks on overflow days
    if (isOverflow) return
    
    const dayEvents = getEventsForDate(dayDate)
    
    setSelectedDayEvents(dayEvents)
    setSelectedDayDate(dayDate)
    setDayEventsModalOpen(true)
  }


  return (
    <div className="space-y-6">
      {/* Calendar Header */}
      <div className="flex flex-col items-start justify-between gap-4">
        <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 w-full">
          <h3 className={`text-lg sm:text-2xl font-bold text-primary transition-all duration-300 ease-in-out ${
            isAnimating ? 'opacity-0 translate-y-2' : 'opacity-100 translate-y-0'
          }`}>
            {viewMode === 'week' ? (
              <>
                {getMonthName(selectedWeek)} - Week of {getWeekStart(selectedWeek).toLocaleDateString('en-US', { 
                  weekday: 'short',
                  month: 'short', 
                  day: 'numeric',
                  timeZone: 'Australia/Sydney'
                })}
              </>
            ) : (
              getMonthName(selectedWeek)
            )}
          </h3>
        </div>
        
        {/* View Mode and Navigation Controls */}
        <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
          {/* View Mode Toggle - Full width on mobile */}
          <div className="flex gap-2 w-full sm:w-auto">
            <Button 
              variant={viewMode === 'week' ? "default" : "outline"}
              size="sm"
              onClick={() => setViewMode('week')}
              disabled={isAnimating}
              className="flex-1 sm:flex-initial"
            >
              <span className="hidden sm:inline">Week View</span>
              <span className="sm:hidden">Week</span>
            </Button>
            <Button 
              variant={viewMode === 'month' ? "default" : "outline"}
              size="sm"
              onClick={() => setViewMode('month')}
              disabled={isAnimating}
              className="flex-1 sm:flex-initial"
            >
              <span className="hidden sm:inline">Month View</span>
              <span className="sm:hidden">Month</span>
            </Button>
          </div>
          
          {/* Navigation Controls - Full width on mobile */}
          <div className="flex gap-2 w-full sm:w-auto">
            <Button 
              variant={isCurrentWeek ? "default" : "outline"}
              size="sm"
              onClick={() => {
                if (!isCurrentWeek) {
                  animateWeekChange(new Date())
                }
              }}
              disabled={isAnimating}
              className="flex-1 sm:flex-initial"
            >
              <span className="hidden sm:inline">Current Week</span>
              <span className="sm:hidden">Today</span>
            </Button>
            <Button 
              variant="outline"
              size="sm"
              onClick={() => {
                if (viewMode === 'week') {
                  const prevWeek = new Date(selectedWeek)
                  prevWeek.setDate(prevWeek.getDate() - 7)
                  animateWeekChange(prevWeek)
                } else {
                  const prevMonth = new Date(selectedWeek)
                  prevMonth.setMonth(prevMonth.getMonth() - 1)
                  animateWeekChange(prevMonth)
                }
              }}
              disabled={isAnimating}
              className="flex-1 sm:flex-initial"
            >
              <span className="hidden sm:inline">Previous</span>
              <span className="sm:hidden">Prev</span>
            </Button>
            <Button 
              variant="outline"
              size="sm"
              onClick={() => {
                if (viewMode === 'week') {
                  const nextWeek = new Date(selectedWeek)
                  nextWeek.setDate(nextWeek.getDate() + 7)
                  animateWeekChange(nextWeek)
                } else {
                  const nextMonth = new Date(selectedWeek)
                  nextMonth.setMonth(nextMonth.getMonth() + 1)
                  animateWeekChange(nextMonth)
                }
              }}
              disabled={isAnimating}
              className="flex-1 sm:flex-initial"
            >
              Next
            </Button>
          </div>
        </div>
      </div>

      {/* Calendar Color Legend */}
      {viewMode === 'month' && (
        <div className="hidden md:flex flex-wrap gap-4 justify-center items-center p-3 bg-muted/20 rounded-lg border border-border/30">
          <div className="flex items-center gap-2 text-sm">
            <div className="w-3 h-3 rounded bg-blue-950/10 border border-blue-800/20"></div>
            <span className="text-blue-300">Weekdays</span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <div className="w-3 h-3 rounded bg-purple-950/20 border border-purple-800/30"></div>
            <span className="text-purple-300">Weekends</span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <div className="w-3 h-3 rounded bg-primary/10 border border-primary/45 ring-2 ring-primary/65"></div>
            <span className="text-primary font-medium">Today</span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <div className="w-3 h-3 rounded bg-muted/10 border border-muted/20 opacity-40"></div>
            <span className="text-muted-foreground/60">Overflow Days</span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <div className="w-3 h-3 rounded bg-blue-950/20 border border-blue-700/30 ring-1 ring-accent/30 shadow-sm"></div>
            <span className="text-accent font-medium">Days with Events</span>
          </div>
        </div>
      )}

      {/* Day of Week Header */}
      <div className={`${viewMode === 'month' ? 'hidden md:grid' : 'grid'} gap-2 sm:gap-3 md:gap-5 lg:gap-6 ${
        viewMode === 'week' 
          ? 'grid-cols-1 lg:grid-cols-7' 
          : 'grid-cols-7'
      }`}>
        {viewMode === 'week' 
          ? ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'].map((day) => (
              <div key={day} className={`text-center font-semibold text-primary text-xs sm:text-sm md:text-base ${
                viewMode === 'week' ? 'hidden lg:block' : ''
              }`}>
                <span className="hidden sm:inline">{day}</span>
                <span className="sm:hidden">{day.substring(0, 3)}</span>
              </div>
            ))
          : ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'].map((day) => (
              <div key={day} className="text-center font-semibold text-primary text-xs sm:text-sm md:text-base">
                <span className="hidden sm:inline">{day}</span>
                <span className="sm:hidden">{day.substring(0, 3)}</span>
              </div>
            ))
        }
      </div>

      {/* Calendar Grid */}
      <div className={`transition-all duration-300 ease-in-out ${
        isAnimating ? 'opacity-0 scale-95' : 'opacity-100 scale-100'
      }`}>
        {/* Mobile Calendar View for Month */}
        {viewMode === 'month' && (
          <div className="md:hidden">
            <MobileMonthCalendar
              selectedMonth={selectedWeek}
              events={events}
              onDayClick={handleDayClick}
              onMonthChange={onWeekChange}
              getEventsForDate={getEventsForDate}
              isToday={isToday}
              getDayStyling={getDayStyling}
              getTextStyling={getTextStyling}
            />
          </div>
        )}

        {/* Desktop Grid View */}
        <div className={`${viewMode === 'month' ? 'hidden md:grid' : 'grid'} gap-2 sm:gap-3 md:gap-5 lg:gap-6 ${
          viewMode === 'week' 
            ? 'grid-cols-1 lg:grid-cols-7' 
            : 'grid-cols-7'
        }`}>
        {viewMode === 'week' ? (
          // Week View
          getWeekGridDays().map((weekDay, dayIndex) => {
            const { dayNumber, fullDate, dayOfWeek } = weekDay
            const dayEvents = getEventsForWeekDay(fullDate)
            const eventGroups = getEventGroups(dayEvents)
            const hasEvents = dayEvents.length > 0
            
            return (
              <Card 
                key={`${dayNumber}-${dayIndex}`}
                variant="depth" 
                className={getDayStyling(fullDate, false, hasEvents)}
                onClick={() => handleDayClick(fullDate, false)}
              >
                <CardHeader className="pb-2 sm:pb-4">
                  <CardTitle className={`text-sm sm:text-base md:text-lg font-semibold ${getTextStyling(fullDate, true)}`}>
                    <span className="hidden sm:inline">{dayOfWeek}</span>
                    <span className="sm:hidden">{dayOfWeek}</span>
                  </CardTitle>
                  <p className={`text-xs sm:text-sm ${getTextStyling(fullDate, false)}`}>
                    {fullDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'Australia/Sydney' })}
                  </p>
                </CardHeader>
                <CardContent className="flex-1 space-y-2 sm:space-y-3 md:space-y-4 pt-0">
                  {eventGroups.length === 0 ? (
                    <div className="text-center py-4 sm:py-6 md:py-10 text-muted-foreground text-xs sm:text-sm">
                      No events
                    </div>
                  ) : (
                    eventGroups.map((group, groupIndex) => {
                      const primaryEvent = group[0]
                      const hasMultiple = group.length > 1
                      const groupKey = `${dayIndex}-${groupIndex}`
                      const isExpanded = expandedGroups.has(groupKey)

                      return (
                        <div key={groupIndex} className="space-y-3">
                          {/* Primary Event Card */}
                          <EventCard 
                            event={primaryEvent}
                            onClick={() => {
                              setSelectedEvent(primaryEvent)
                              setEditModalOpen(true)
                            }}
                          />
                          
                          {/* Show additional overlapping events */}
                          {hasMultiple && !isExpanded && (
                            <Button
                              variant="outline"
                              size="sm"
                              className="w-full h-7 sm:h-8 md:h-9 text-xs sm:text-sm"
                              onClick={(e) => {
                                e.stopPropagation()
                                toggleGroupExpansion(dayIndex, groupIndex)
                              }}
                            >
                              +{group.length - 1} more event{group.length - 1 > 1 ? 's' : ''}
                            </Button>
                          )}
                          
                          {hasMultiple && isExpanded && (
                            <>
                              {group.slice(1).map(event => (
                                <EventCard
                                  key={event._id}
                                  event={event}
                                  onClick={() => {
                                    setSelectedEvent(event)
                                    setEditModalOpen(true)
                                  }}
                                />
                              ))}
                              <Button
                                variant="ghost"
                                size="sm"
                                className="w-full h-7 sm:h-8 text-xs"
                                onClick={() => {
                                  toggleGroupExpansion(dayIndex, groupIndex)
                                }}
                              >
                                Show less
                              </Button>
                            </>
                          )}
                        </div>
                      )
                    })
                  )}
                </CardContent>
              </Card>
            )
          })
        ) : (
          // Month View
          getCalendarGridDays().map((gridDay, index) => {
            const { dayNumber, month, fullDate, isOverflow } = gridDay
            const dayEvents = getEventsForDate(fullDate)
            const dayOfWeek = fullDate.toLocaleDateString('en-US', { weekday: 'short', timeZone: 'Australia/Sydney' })
            const eventCount = dayEvents.length
            const hasEvents = eventCount > 0
            
            return (
              <CalendarDayCard
                key={`${month}-${dayNumber}-${index}`}
                dayNumber={dayNumber}
                fullDate={fullDate}
                dayOfWeek={dayOfWeek}
                isOverflow={isOverflow}
                hasEvents={hasEvents}
                eventCount={eventCount}
                isToday={isToday(fullDate)}
                dayStyling={getDayStyling(fullDate, isOverflow, hasEvents)}
                textStyling={{
                  title: getTextStyling(fullDate, true, isOverflow),
                  subtitle: getTextStyling(fullDate, false, isOverflow)
                }}
                onClick={() => handleDayClick(fullDate, isOverflow)}
              />
            )
          })
        )}
        </div>
      </div>

      {/* Event Details Modal */}
      <Dialog open={editModalOpen} onOpenChange={setEditModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Event Details</DialogTitle>
          </DialogHeader>
          {selectedEvent && (
            <EventDetailView
              event={selectedEvent}
              onEdit={(event) => {
                if (onEditEvent) {
                  onEditEvent(event);
                  setEditModalOpen(false);
                }
              }}
              onClearEvent={handleClearEvent}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Day Events Modal */}
      <Dialog open={dayEventsModalOpen} onOpenChange={setDayEventsModalOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {selectedDayDate && formatDate(selectedDayDate.getTime())} - Events
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {/* Book Event Button */}
            <div className="flex justify-center">
              <Button 
                onClick={() => {
                  setDayEventsModalOpen(false)
                  if (selectedDayDate && onBookingWithDate) {
                    onBookingWithDate(selectedDayDate)
                  } else if (onBookingModalOpenChange) {
                    onBookingModalOpenChange(true)
                  }
                }}
                className="w-full sm:w-auto"
              >
                Book New Event
              </Button>
            </div>
            
            {/* Existing Events */}
            {selectedDayEvents.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No events scheduled for this day
              </div>
            ) : (
              <>
                <div className="border-t pt-4">
                  <h4 className="text-sm font-medium text-muted-foreground mb-3">Existing Events</h4>
                  <div className="space-y-3">
                    {selectedDayEvents.map((event) => (
                      <div key={event._id} className="space-y-3">
                        <EventCard 
                          event={event}
                          onClick={() => {
                            setSelectedEvent(event)
                            setEditModalOpen(true)
                            setDayEventsModalOpen(false)
                          }}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
