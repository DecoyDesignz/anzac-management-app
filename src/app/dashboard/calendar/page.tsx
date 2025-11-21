"use client"

import { useState, useEffect, useMemo } from "react"
import { useQuery, useMutation } from "convex/react"
import { useSession } from "next-auth/react"
import { api } from "../../../../convex/_generated/api"
import { Id } from "../../../../convex/_generated/dataModel"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Clock, AlertCircle, Trash2, Plus, GraduationCap, Gamepad2 } from "lucide-react"
import { DatePicker } from "@/components/ui/date-picker"
import { EventCalendar } from "@/components/dashboard/event-calendar"
import { CheckboxList, CheckboxOption } from "@/components/forms/checkbox-list"
import { FormFieldWrapper } from "@/components/forms/form-field-wrapper"
import { TimeInput } from "@/components/forms/time-input"
import { cn } from "@/lib/utils"
import { isValidTime } from "@/lib/validation"
import { formatDateSydney, formatTimeRangeSydney } from "@/lib/formatting"
import { FormDialog } from "@/components/common/form-dialog"
import { LoadingState } from "@/components/common/loading-state"

export default function CalendarPage() {
  const { data: session } = useSession()
  const [selectedMonth, setSelectedMonth] = useState(new Date())
  const [bookingModalOpen, setBookingModalOpen] = useState(false)
  const [editModalOpen, setEditModalOpen] = useState(false)
  const [clearModalOpen, setClearModalOpen] = useState(false)
  const [clearCode, setClearCode] = useState("")
  const [selectedEvent, setSelectedEvent] = useState<unknown>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const [editFormError, setEditFormError] = useState<string | null>(null)
  const [clearFormError, setClearFormError] = useState<string | null>(null)

  // Form state for booking
  const [eventForm, setEventForm] = useState({
    title: "",
    date: undefined as Date | undefined,
    startTime: "", // HHMM format (24-hour)
    endTime: "", // HHMM format (24-hour)
    serverId: "",
    instructorIds: [] as string[],
    description: "",
    maxParticipants: "",
    eventCategory: "training" as "training" | "operation",
  })

  // Form state for editing
  const [editForm, setEditForm] = useState({
    title: "",
    date: undefined as Date | undefined,
    startTime: "", // HHMM format (24-hour)
    endTime: "", // HHMM format (24-hour)
    serverId: "",
    instructorIds: [] as string[],
    description: "",
    maxParticipants: "",
    status: "scheduled" as "scheduled" | "in_progress" | "completed" | "cancelled",
  })

  // Fetch data for form and upcoming events
  const servers = useQuery(
    api.events.listServers,
    session?.user?.id ? { userId: session.user.id as Id<"personnel">, activeOnly: true } : "skip"
  )
  const systemUsers = useQuery(
    api.users.listUsersWithRoles,
    session?.user?.id ? { userId: session.user.id as Id<"personnel"> } : "skip"
  )
  
  // Memoize the date range to prevent infinite re-renders
  // Update every minute to keep it relatively fresh
  const [currentMinute, setCurrentMinute] = useState(() => Math.floor(Date.now() / 60000))
  
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentMinute(Math.floor(Date.now() / 60000))
    }, 60000) // Update every minute
    
    return () => clearInterval(interval)
  }, [])
  
  const upcomingEventsDateRange = useMemo(() => {
    const now = currentMinute * 60000 // Convert back to milliseconds
    return {
      userId: session?.user?.id as Id<"personnel"> | undefined,
      startDate: now,
      endDate: now + (30 * 24 * 60 * 60 * 1000) // 30 days from now
    }
  }, [currentMinute, session?.user?.id])
  
  // Get all upcoming events (current time to 30 days out)
  const allUpcomingEvents = useQuery(
    api.events.listEvents,
    session?.user?.id && upcomingEventsDateRange.userId
      ? { userId: upcomingEventsDateRange.userId, startDate: upcomingEventsDateRange.startDate, endDate: upcomingEventsDateRange.endDate }
      : "skip"
  )

  // Mutations
  const createEvent = useMutation(api.events.createEvent)
  const updateEvent = useMutation(api.events.updateEvent)
  const clearEventByCode = useMutation(api.events.clearEventByCode)

  // Simple month change handler - buttons will always set valid months
  const handleMonthChange = (newMonth: Date) => {
    setSelectedMonth(newMonth)
  }

  const handleBookingModalOpen = () => {
    setBookingModalOpen(true)
  }

  const handleBookingWithDate = (date: Date) => {
    // Pre-fill the form with the selected date
    setEventForm(prev => ({
      ...prev,
      date: date
    }))
    setBookingModalOpen(true)
  }

  const handleClearModalOpen = () => {
    setClearModalOpen(true)
  }

  const handleEditModalOpen = (event: unknown) => {
    setSelectedEvent(event)
    
    // Populate edit form with event data, converting from UTC to Sydney time for display
    const eventData = event as { 
      startDate: number; 
      endDate: number; 
      title?: string; 
      serverId?: string; 
      instructors?: Array<{ personnelId?: Id<"personnel">; user?: { _id: Id<"personnel"> } }>; 
      description?: string; 
      maxParticipants?: number; 
      status?: string 
    }
    
    // Format the date/time in Sydney timezone
    const eventDate = new Date(eventData.startDate)
    const sydneyDateStr = eventDate.toLocaleDateString('en-CA', { timeZone: 'Australia/Sydney' }) // YYYY-MM-DD
    const sydneyTimeStr = eventDate.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'Australia/Sydney' })
    const startTime = sydneyTimeStr.replace(':', '')
    
    const endDate = new Date(eventData.endDate)
    const endTimeStr = endDate.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'Australia/Sydney' })
    const endTime = endTimeStr.replace(':', '')
    
    // Create a date object from the Sydney date string
    const [year, month, day] = sydneyDateStr.split('-').map(Number)
    const formDate = new Date(year, month - 1, day)
    
    // Extract instructor IDs - use personnelId if available, otherwise fall back to user._id
    const instructorIds = eventData.instructors?.map((inst) => inst.personnelId || inst.user?._id).filter((id): id is Id<"personnel"> => id !== undefined) || []
    
    setEditForm({
      title: eventData.title || "",
      date: formDate,
      startTime: startTime,
      endTime: endTime,
      serverId: eventData.serverId || "",
      instructorIds: instructorIds,
      description: eventData.description || "",
      maxParticipants: eventData.maxParticipants?.toString() || "",
      status: (eventData.status as "scheduled" | "in_progress" | "completed" | "cancelled") || "scheduled",
    })
    
    setEditModalOpen(true)
  }

  const handleUpdateEvent = async () => {
    if (!selectedEvent) return
    
    if (!editForm.title) {
      setEditFormError("Event title is required")
      return
    }
    
    if (!editForm.serverId) {
      setEditFormError("Server selection is required")
      return
    }
    
    if (editForm.instructorIds.length === 0) {
      setEditFormError("At least one instructor/GM must be selected")
      return
    }
    
    if (!isValidDate(editForm.date)) {
      setEditFormError("Date must be within the current month")
      return
    }
    
    if (!isValidTime(editForm.startTime) || !isValidTime(editForm.endTime)) {
      setEditFormError("Times must be in 24-hour format (HHMM)")
      return
    }
    
    setIsSubmitting(true)
    setEditFormError(null)
    
    try {
      const eventDate = editForm.date!
      
      // Create dates in Sydney timezone and convert to UTC
      const year = eventDate.getFullYear()
      const month = eventDate.getMonth()
      const day = eventDate.getDate()
      const startHour = parseInt(editForm.startTime.substring(0, 2))
      const startMinute = parseInt(editForm.startTime.substring(2, 4))
      const endHour = parseInt(editForm.endTime.substring(0, 2))
      const endMinute = parseInt(editForm.endTime.substring(2, 4))
      
      // Convert Sydney time to UTC timestamps
      const startTimestamp = sydneyTimeToUTC(year, month, day, startHour, startMinute)
      const endTimestamp = sydneyTimeToUTC(year, month, day, endHour, endMinute)
      
      if (!session?.user?.id) {
        throw new Error("Session expired. Please log in again.")
      }
      await updateEvent({
        userId: session.user.id as Id<"personnel">,
        eventId: (selectedEvent as { _id: Id<"events"> })._id,
        title: editForm.title,
        startDate: startTimestamp,
        endDate: endTimestamp,
        serverId: editForm.serverId as Id<"servers">,
        instructorIds: editForm.instructorIds.length > 0 ? editForm.instructorIds as Array<Id<"personnel">> : undefined,
        maxParticipants: editForm.maxParticipants ? parseInt(editForm.maxParticipants) : undefined,
        status: editForm.status,
        description: editForm.description,
      })

      setEditModalOpen(false)
      setSelectedEvent(null)
      setEditForm({
        title: "",
        date: undefined,
        startTime: "",
        endTime: "",
        serverId: "",
        instructorIds: [],
        description: "",
        maxParticipants: "",
        status: "scheduled",
      })
      setEditFormError(null)
    } catch (error) {
      console.error("Failed to update event:", error)
      setEditFormError("Failed to update event. Please try again.")
    } finally {
      setIsSubmitting(false)
    }
  }

  // Helper functions
  
  // Convert Sydney time to UTC timestamp
  function sydneyTimeToUTC(year: number, month: number, day: number, hour: number, minute: number): number {
    // Create ISO string in Sydney timezone format
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
    const timeStr = `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}:00`
    
    // Sydney is UTC+10 (AEST) or UTC+11 (AEDT)
    // DST in Sydney: First Sunday in October (02:00) to First Sunday in April (03:00)
    // Simplified DST check: Oct-Mar is AEDT (+11), Apr-Sep is AEST (+10)
    const isDST = (month > 9 || month < 3) || (month === 9 && day >= 1) || (month === 3 && day < 1)
    const offset = isDST ? '+11:00' : '+10:00'
    const isoString = `${dateStr}T${timeStr}${offset}`
    
    return new Date(isoString).getTime()
  }

  // Get the start of the week (Monday 00:00 Sydney time) as a UTC timestamp
  function getWeekStart(date: Date): Date {
    // Get what date/time it is in Sydney timezone
    const sydneyDateStr = date.toLocaleDateString('en-CA', { timeZone: 'Australia/Sydney' }) // YYYY-MM-DD
    const [year, month, day] = sydneyDateStr.split('-').map(Number)
    
    // Determine the day of week for this Sydney date
    // Create a UTC date at noon to avoid any timezone edge cases when determining day of week
    const tempDate = new Date(`${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}T12:00:00Z`)
    const dayOfWeek = tempDate.getUTCDay() // 0 = Sunday, 1 = Monday, etc.
    
    // Calculate days to subtract to get to Monday of the current week
    // If it's Sunday (0), go back 6 days to get Monday of the same week
    // If it's Monday (1), go back 0 days (already Monday)
    // If it's Tuesday (2), go back 1 day
    // etc.
    const daysToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek
    
    // Get Monday's date
    const mondayDate = new Date(tempDate)
    mondayDate.setUTCDate(tempDate.getUTCDate() + daysToMonday)
    const mondayYear = mondayDate.getUTCFullYear()
    const mondayMonth = mondayDate.getUTCMonth() + 1
    const mondayDay = mondayDate.getUTCDate()
    
    // Create a local date object for Monday at midnight (avoid timezone conversion issues)
    const mondayLocalDate = new Date(mondayYear, mondayMonth - 1, mondayDay, 0, 0, 0, 0)
    
    return mondayLocalDate
  }

  // Helper function to get the valid date range for booking (current month only)
  const getValidDateRange = () => {
    // Get current date in Sydney timezone
    const now = new Date()
    const sydneyToday = now.toLocaleDateString('en-CA', { timeZone: 'Australia/Sydney' })
    
    // Create a date object for yesterday at midnight in Sydney timezone to allow today
    const [year, month, day] = sydneyToday.split('-').map(Number)
    
    // Create ISO string for yesterday 00:00 in Sydney timezone (to allow today)
    const isDST = (month > 10 || month < 4) || (month === 10 && day >= 1) || (month === 4 && day < 1)
    const offset = isDST ? '+11:00' : '+10:00'
    const yesterdayISO = `${year}-${String(month).padStart(2, '0')}-${String(day - 1).padStart(2, '0')}T00:00:00${offset}`
    const yesterdayDate = new Date(yesterdayISO)
    
    // Calculate the end of current month
    const currentMonthEnd = new Date(year, month, 0) // Last day of current month
    
    return { currentWeekStart: yesterdayDate, nextWeekEnd: currentMonthEnd }
  }

  const isValidDate = (date: Date | undefined) => {
    if (!date) return false
    
    const { currentWeekStart, nextWeekEnd } = getValidDateRange()
    
    // Allow dates from current week Monday through next week Sunday
    return date >= currentWeekStart && date <= nextWeekEnd
  }

  const getAvailableInstructors = (eventCategory: "training" | "operation") => {
    if (!systemUsers) return []
    // Filter users based on event category
    return systemUsers.filter(user => {
      if (eventCategory === "training") {
        return user.roles?.includes("instructor")
      } else if (eventCategory === "operation") {
        return user.roles?.includes("game_master")
      }
      return false
    })
  }

  const getInstructorOptions = (eventCategory: "training" | "operation"): CheckboxOption[] => {
    return getAvailableInstructors(eventCategory).map(user => ({
      id: user._id,
      label: user.name,
      icon: eventCategory === "training" ? GraduationCap : Gamepad2,
    }))
  }

  const getAllUserOptions = (): CheckboxOption[] => {
    if (!systemUsers) return []
    return systemUsers.map(user => ({
      id: user._id,
      label: user.name,
      icon: GraduationCap,
    }))
  }

  const handleCreateEvent = async () => {
    if (!eventForm.title) {
      setFormError("Event title is required")
      return
    }
    
    if (!eventForm.serverId) {
      setFormError("Server selection is required")
      return
    }
    
    if (eventForm.instructorIds.length === 0) {
      setFormError("At least one instructor/GM must be selected")
      return
    }
    
    if (!isValidDate(eventForm.date)) {
      setFormError("Date must be within the current month")
      return
    }
    
    if (!isValidTime(eventForm.startTime) || !isValidTime(eventForm.endTime)) {
      setFormError("Times must be in 24-hour format (HHMM)")
      return
    }
    
    setIsSubmitting(true)
    setFormError(null)
    
    try {
      const eventDate = eventForm.date!
      
      // Create dates in Sydney timezone and convert to UTC
      const year = eventDate.getFullYear()
      const month = eventDate.getMonth()
      const day = eventDate.getDate()
      const startHour = parseInt(eventForm.startTime.substring(0, 2))
      const startMinute = parseInt(eventForm.startTime.substring(2, 4))
      const endHour = parseInt(eventForm.endTime.substring(0, 2))
      const endMinute = parseInt(eventForm.endTime.substring(2, 4))
      
      // Convert Sydney time to UTC timestamps
      const startTimestamp = sydneyTimeToUTC(year, month, day, startHour, startMinute)
      const endTimestamp = sydneyTimeToUTC(year, month, day, endHour, endMinute)
      
      // Auto-prefix title based on event category
      const prefix = eventForm.eventCategory === "training" ? "Training: " : "Operation: "
      const finalTitle = eventForm.title.startsWith(prefix) ? eventForm.title : prefix + eventForm.title
      
      if (!session?.user?.id) {
        throw new Error("Session expired. Please log in again.")
      }
      await createEvent({
        userId: session.user.id as Id<"personnel">,
        title: finalTitle,
        startDate: startTimestamp,
        endDate: endTimestamp,
        serverId: eventForm.serverId as Id<"servers">,
        instructorIds: eventForm.instructorIds as Array<Id<"personnel">>,
        description: eventForm.description,
        maxParticipants: eventForm.maxParticipants ? parseInt(eventForm.maxParticipants) : undefined,
        isRecurring: false,
      })

      setBookingModalOpen(false)
      setEventForm({
        title: "",
        date: undefined,
        startTime: "",
        endTime: "",
        serverId: "",
        instructorIds: [],
        description: "",
        maxParticipants: "",
        eventCategory: "training",
      })
      setFormError(null)
    } catch (error) {
      console.error("Failed to create event:", error)
      setFormError("Failed to create event. Please try again.")
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleClearEvent = async () => {
    if (!clearCode) {
      setClearFormError("Please enter a booking code")
      return
    }
    
    setIsSubmitting(true)
    setClearFormError(null)
    
    try {
      if (!session?.user?.id) {
        throw new Error("Session expired. Please log in again.")
      }
      await clearEventByCode({
        userId: session.user.id as Id<"personnel">,
        bookingCode: clearCode
      })
      setClearModalOpen(false)
      setClearCode("")
      setClearFormError(null)
    } catch (error) {
      console.error("Failed to clear event:", error)
      setClearFormError("Failed to clear event. Please check the booking code.")
    } finally {
      setIsSubmitting(false)
    }
  }

  // Auto-advance to new week on Sundays at midnight
  useEffect(() => {
    const checkWeekRollover = () => {
      const now = new Date()
      const dayOfWeek = now.getDay()
      const hour = now.getHours()
      
      // If it's Sunday (0) and between midnight and 1am, check if we need to advance
      if (dayOfWeek === 0 && hour === 0) {
        setSelectedMonth((currentWeek) => {
          const currentWeekStart = getWeekStart(currentWeek)
          const thisWeekStart = getWeekStart(now)
          
          // Only update if the selected week is older than the current week
          if (currentWeekStart.getTime() < thisWeekStart.getTime()) {
            return now
          }
          return currentWeek
        })
      }
    }

    // Check immediately on mount
    checkWeekRollover()

    // Check every minute
    const interval = setInterval(checkWeekRollover, 60000)

    return () => clearInterval(interval)
  }, [])

  // Get the next 3 upcoming events
  const upcomingEvents = useMemo(() => {
    if (!allUpcomingEvents) return []
    const now = currentMinute * 60000
    return allUpcomingEvents
      .filter(event => event.startDate >= now)
      .sort((a, b) => a.startDate - b.startDate)
      .slice(0, 3)
  }, [allUpcomingEvents, currentMinute])

  // Loading state
  if (!servers || !systemUsers) {
    return <LoadingState type="skeleton" count={5} />
  }

  return (
    <div className="space-y-6 md:space-y-8 relative pb-8">
      <div className="flex justify-between items-start md:items-center flex-col md:flex-row gap-4 animate-fade-in-down">
        <div className="space-y-1 relative">
          <div className="flex items-center gap-2 md:gap-3 flex-wrap">
            <h2 className="text-2xl md:text-3xl lg:text-4xl font-bold tracking-tight text-primary">
              Training & Operations
            </h2>
            <Badge variant="outline" className="text-xs">
              <Clock className="w-3 h-3 mr-1" />
              Sydney Time
            </Badge>
          </div>
          <p className="text-muted-foreground text-sm md:text-base lg:text-lg">
            Manage bookings
          </p>
        </div>
        
        <div className="flex gap-2 md:gap-3 flex-wrap w-full md:w-auto">
          <Button variant="outline" size="lg" onClick={handleClearModalOpen}>
            <Trash2 className="w-5 h-5 mr-2" />
            Clear by Code
          </Button>
          <Button variant="default" size="lg" onClick={handleBookingModalOpen}>
            <Plus className="w-5 h-5 mr-2" />
            Make Booking
          </Button>
        </div>
      </div>

      {/* Upcoming Events and Instructions - Above Calendar */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6 animate-slide-in-left opacity-0 animate-delay-300">
        {/* Upcoming Events */}
        <Card variant="depth">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/20 backdrop-blur-sm">
                <Clock className="w-5 h-5 text-primary" />
              </div>
              <div>
                <CardTitle className="text-lg text-primary">
                  Upcoming Events
                </CardTitle>
                <p className="text-sm text-muted-foreground">
                  Next scheduled activities
                </p>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {upcomingEvents.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground text-sm">
                No upcoming events scheduled
              </div>
            ) : (
              upcomingEvents.map((event) => (
                <div
                  key={event._id}
                  className="p-3 rounded-lg border border-border hover:border-primary/20 transition-all duration-300 bg-secondary/10"
                >
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <p className="font-semibold text-sm">{event.title || 'Untitled Event'}</p>
                      <p className="text-xs opacity-90">
                        {formatDateSydney(event.startDate)} • {formatTimeRangeSydney(event.startDate, event.endDate)}
                      </p>
                      <p className="text-xs opacity-75">
                        {event.instructors && event.instructors.length > 0 
                          ? (event.instructors as Array<{ user?: { callSign?: string } }>).map((inst) => inst.user?.callSign || 'Unknown').join(', ')
                          : 'No instructor'} • {event.server?.name || 'No server'}
                      </p>
                    </div>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        {/* Instructions */}
        <Card variant="depth">
          <CardHeader>
            <CardTitle className="text-lg text-primary flex items-center gap-2">
              <AlertCircle className="w-5 h-5" />
              Instructions
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-muted-foreground">
            <div>
              <p className="font-medium text-foreground mb-1">Make Booking:</p>
              <p>Enter event details and click &quot;Book Event&quot; to schedule training sessions.</p>
            </div>
            <div>
              <p className="font-medium text-foreground mb-1">Event Types:</p>
              <p>Operation, Training</p>
            </div>
            <div>
              <p className="font-medium text-foreground mb-1">Time Zone:</p>
              <p>All times are in Sydney timezone (AEDT/AEST).</p>
            </div>
            <div>
              <p className="font-medium text-foreground mb-1">Weekly View:</p>
              <p>Calendar displays one week at a time. Use Previous/Next buttons to navigate between weeks. The calendar will advance to the new week automatically on Sundays.</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Booking Modal */}
      <FormDialog
        open={bookingModalOpen}
        onOpenChange={setBookingModalOpen}
        title="Make Booking"
        description="Create a new training event or operation. Date must be within the current month."
        onSubmit={handleCreateEvent}
        submitText="Book Event"
        isSubmitting={isSubmitting}
        error={formError}
        maxWidth="2xl"
        maxHeight="90vh"
      >
        <div className="space-y-4">
          <div>
            <Label htmlFor="eventCategory">Event Category</Label>
            <Select value={eventForm.eventCategory} onValueChange={(value: string) => setEventForm({ ...eventForm, eventCategory: value as "training" | "operation", instructorIds: [] })}>
              <SelectTrigger>
                <SelectValue placeholder="Select category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="training">
                  <div className="flex items-center gap-2">
                    <GraduationCap className="w-4 h-4" />
                    Training
                  </div>
                </SelectItem>
                <SelectItem value="operation">
                  <div className="flex items-center gap-2">
                    <Gamepad2 className="w-4 h-4" />
                    Operation
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="title">Event Title</Label>
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground whitespace-nowrap">
                {eventForm.eventCategory === "training" ? "Training:" : "Operation:"}
              </span>
              <Input
                id="title"
                value={eventForm.title}
                onChange={(e) => setEventForm({ ...eventForm, title: e.target.value })}
                placeholder="Enter event name"
                className="flex-1"
              />
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label htmlFor="date">Date</Label>
              <DatePicker
                date={eventForm.date}
                onDateChange={(date) => setEventForm({ ...eventForm, date })}
                disabled={(date) => {
                  const { currentWeekStart, nextWeekEnd } = getValidDateRange()
                  
                  // Disable dates before today or after the end of current month
                  return date < currentWeekStart || date > nextWeekEnd
                }}
                placeholder="Pick a date"
                className={cn(
                  eventForm.date && !isValidDate(eventForm.date) && "border-red-500"
                )}
              />
              {eventForm.date && !isValidDate(eventForm.date) && (
                <p className="text-xs text-red-500 mt-1">Date must be within the current month</p>
              )}
              <p className="text-xs text-muted-foreground mt-1">
                Valid range: Today - End of current month
              </p>
            </div>
            <FormFieldWrapper label="Start Time" htmlFor="startTime">
              <TimeInput
                id="startTime"
                value={eventForm.startTime}
                onChange={(value) => setEventForm({ ...eventForm, startTime: value })}
                placeholder="1900"
              />
            </FormFieldWrapper>
            <FormFieldWrapper label="End Time" htmlFor="endTime">
              <TimeInput
                id="endTime"
                value={eventForm.endTime}
                onChange={(value) => setEventForm({ ...eventForm, endTime: value })}
                placeholder="2300"
              />
            </FormFieldWrapper>
          </div>

          <div>
            <Label htmlFor="server">Server</Label>
            <Select value={eventForm.serverId} onValueChange={(value: string) => setEventForm({ ...eventForm, serverId: value })}>
              <SelectTrigger>
                <SelectValue placeholder="Select server" />
              </SelectTrigger>
              <SelectContent>
                {servers?.map(server => (
                  <SelectItem key={server._id} value={server._id}>
                    {server.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <CheckboxList
            label={`${eventForm.eventCategory === "training" ? "Instructors" : "Game Masters"} (Multiple Selection)`}
            options={getInstructorOptions(eventForm.eventCategory)}
            selected={eventForm.instructorIds}
            onChange={(selected) => setEventForm({ ...eventForm, instructorIds: selected })}
            maxHeight="max-h-32"
          />

          <div>
            <Label htmlFor="description">Description (optional)</Label>
            <Input
              id="description"
              value={eventForm.description}
              onChange={(e) => setEventForm({ ...eventForm, description: e.target.value })}
              placeholder="Additional details..."
            />
          </div>
        </div>
      </FormDialog>

      {/* Clear by Code Modal */}
      <FormDialog
        open={clearModalOpen}
        onOpenChange={setClearModalOpen}
        title="Clear Event by Code"
        description="Enter the booking code of the event you want to clear."
        onSubmit={handleClearEvent}
        submitText="Clear Event"
        isSubmitting={isSubmitting}
        error={clearFormError}
      >
        <div className="space-y-4">
          <div>
            <Label htmlFor="clearCode">Booking Code</Label>
            <Input
              id="clearCode"
              value={clearCode}
              onChange={(e) => setClearCode(e.target.value.toUpperCase())}
              placeholder="e.g., ABC123"
              className="font-mono"
            />
          </div>
        </div>
      </FormDialog>

      {/* Edit Event Modal */}
      <FormDialog
        open={editModalOpen}
        onOpenChange={setEditModalOpen}
        title="Edit Event"
        description="Update the event details. Date must be within the current month."
        onSubmit={handleUpdateEvent}
        submitText="Update Event"
        isSubmitting={isSubmitting}
        error={editFormError}
        maxWidth="2xl"
        maxHeight="90vh"
      >
        <div className="space-y-4">
          <div>
            <Label htmlFor="edit-title">Event Title</Label>
            <Input
              id="edit-title"
              value={editForm.title}
              onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
              placeholder="Training: BT | Operation: NAME"
            />
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label htmlFor="edit-date">Date</Label>
              <DatePicker
                date={editForm.date}
                onDateChange={(date) => setEditForm({ ...editForm, date })}
                disabled={(date) => {
                  const { currentWeekStart, nextWeekEnd } = getValidDateRange()
                  
                  // Disable dates before today or after the end of current month
                  return date < currentWeekStart || date > nextWeekEnd
                }}
                placeholder="Pick a date"
                className={cn(
                  editForm.date && !isValidDate(editForm.date) && "border-red-500"
                )}
              />
              {editForm.date && !isValidDate(editForm.date) && (
                <p className="text-xs text-red-500 mt-1">Date must be within the current month</p>
              )}
            </div>
            <FormFieldWrapper label="Start Time" htmlFor="edit-startTime">
              <TimeInput
                id="edit-startTime"
                value={editForm.startTime}
                onChange={(value) => setEditForm({ ...editForm, startTime: value })}
                placeholder="1900"
              />
            </FormFieldWrapper>
            <FormFieldWrapper label="End Time" htmlFor="edit-endTime">
              <TimeInput
                id="edit-endTime"
                value={editForm.endTime}
                onChange={(value) => setEditForm({ ...editForm, endTime: value })}
                placeholder="2300"
              />
            </FormFieldWrapper>
          </div>

          <div>
            <Label htmlFor="edit-server">Server</Label>
            <Select value={editForm.serverId} onValueChange={(value: string) => setEditForm({ ...editForm, serverId: value })}>
              <SelectTrigger>
                <SelectValue placeholder="Select server" />
              </SelectTrigger>
              <SelectContent>
                {servers?.map(server => (
                  <SelectItem key={server._id} value={server._id}>
                    {server.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <CheckboxList
            label="Instructor/GM (Multiple Selection)"
            options={getAllUserOptions()}
            selected={editForm.instructorIds}
            onChange={(selected) => setEditForm({ ...editForm, instructorIds: selected })}
            maxHeight="max-h-32"
          />

          <div>
            <Label htmlFor="edit-maxParticipants">Max Participants (optional)</Label>
            <Input
              id="edit-maxParticipants"
              type="number"
              value={editForm.maxParticipants}
              onChange={(e) => setEditForm({ ...editForm, maxParticipants: e.target.value })}
              placeholder="Leave empty for no limit"
            />
          </div>

          <div>
            <Label htmlFor="edit-description">Description (optional)</Label>
            <Input
              id="edit-description"
              value={editForm.description}
              onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
              placeholder="Additional details..."
            />
          </div>

          <div>
            <Label htmlFor="edit-status">Status</Label>
            <Select value={editForm.status} onValueChange={(value: "scheduled" | "in_progress" | "completed" | "cancelled") => setEditForm({ ...editForm, status: value })}>
              <SelectTrigger>
                <SelectValue placeholder="Select status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="scheduled">Scheduled</SelectItem>
                <SelectItem value="in_progress">In Progress</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </FormDialog>

      {/* Calendar Component - Full Width */}
      <div className="animate-slide-in-right opacity-0 animate-delay-500">
        <EventCalendar 
          selectedWeek={selectedMonth}
          onWeekChange={handleMonthChange}
          bookingModalOpen={bookingModalOpen}
          onBookingModalOpenChange={setBookingModalOpen}
          onEditEvent={handleEditModalOpen}
          onBookingWithDate={handleBookingWithDate}
        />
      </div>
    </div>
  )
}
