"use client"

import { Card } from "@/components/ui/card"
import { EventType } from "@/components/events"

interface MobileMonthCalendarProps {
  selectedMonth: Date
  events?: EventType[]
  onDayClick: (date: Date, isOverflow: boolean) => void
  onMonthChange?: (date: Date) => void
  getEventsForDate: (date: Date) => EventType[]
  isToday: (date: Date) => boolean
  getDayStyling: (date: Date, isOverflow?: boolean, hasEvents?: boolean) => string
  getTextStyling: (date: Date, isTitle?: boolean, isOverflow?: boolean) => string
}

export function MobileMonthCalendar({
  selectedMonth,
  onDayClick,
  getEventsForDate,
  getDayStyling,
  getTextStyling,
  // These props are passed but not used in this component
  events: _events,
  onMonthChange: _onMonthChange,
  isToday: _isToday,
}: MobileMonthCalendarProps) {
  
  // Get all days to display in calendar grid (including overflow from prev/next months)
  const getCalendarGridDays = () => {
    // Get the month/year from selectedMonth in Sydney timezone
    const sydneyDateStr = selectedMonth.toLocaleDateString('en-CA', { timeZone: 'Australia/Sydney' })
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

  return (
    <div className="space-y-2">
      {/* Day of Week Header */}
      <div className="grid grid-cols-7 gap-2">
        {['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'].map((day) => (
          <div key={day} className="text-center font-semibold text-primary text-xs">
            <span className="hidden sm:inline">{day}</span>
            <span className="sm:hidden">{day.substring(0, 3)}</span>
          </div>
        ))}
      </div>

      {/* Calendar Grid */}
      <div className="grid grid-cols-7 gap-2">
        {getCalendarGridDays().map((gridDay, index) => {
          const { dayNumber, fullDate, isOverflow } = gridDay
          const dayEvents = getEventsForDate(fullDate)
          const hasEvents = dayEvents.length > 0
          
          return (
            <Card 
              key={`${gridDay.month}-${dayNumber}-${index}`}
              variant="depth" 
              className={`${getDayStyling(fullDate, isOverflow, hasEvents)} cursor-pointer transition-all duration-200 hover:shadow-md hover:scale-[1.02] min-h-[60px] relative`}
              onClick={() => onDayClick(fullDate, isOverflow)}
            >
              <div className="flex flex-col items-center justify-center h-full p-1">
                <span className={`text-sm font-medium ${getTextStyling(fullDate, true, isOverflow)}`}>
                  {dayNumber}
                </span>
                
                {/* Event indicator dot */}
                {hasEvents && !isOverflow && (
                  <div className="absolute top-1 right-1 w-2 h-2 rounded-full bg-primary" />
                )}
              </div>
            </Card>
          )
        })}
      </div>
    </div>
  )
}
