"use client"

import { useState, useEffect, useMemo } from "react"
import { useQuery, useMutation } from "convex/react"
import { api } from "../../../../convex/_generated/api"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { Calendar, Clock, AlertCircle, CheckCircle, Trash2, Plus, GraduationCap, Gamepad2 } from "lucide-react"
import { EventCalendar } from "@/components/dashboard/event-calendar"
import { Id } from "../../../../convex/_generated/dataModel"

export default function CalendarPage() {
  const [selectedWeek, setSelectedWeek] = useState(new Date())
  const [bookingModalOpen, setBookingModalOpen] = useState(false)
  const [editModalOpen, setEditModalOpen] = useState(false)
  const [clearModalOpen, setClearModalOpen] = useState(false)
  const [clearCode, setClearCode] = useState("")
  const [selectedEvent, setSelectedEvent] = useState<unknown>(null)

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
  const servers = useQuery(api.events.listServers, { activeOnly: true })
  const systemUsers = useQuery(api.users.listUsersWithRoles, {})
  
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
      startDate: now,
      endDate: now + (14 * 24 * 60 * 60 * 1000) // 2 weeks from now
    }
  }, [currentMinute])
  
  // Get all upcoming events (current time to 2 weeks out)
  const allUpcomingEvents = useQuery(api.events.listEvents, upcomingEventsDateRange)

  // Mutations
  const createEvent = useMutation(api.events.createEvent)
  const updateEvent = useMutation(api.events.updateEvent)
  const clearEventByCode = useMutation(api.events.clearEventByCode)

  // Simple week change handler - buttons will always set valid weeks
  const handleWeekChange = (newWeek: Date) => {
    setSelectedWeek(newWeek)
  }

  const handleBookingModalOpen = () => {
    setBookingModalOpen(true)
  }

  const handleClearModalOpen = () => {
    setClearModalOpen(true)
  }

  const handleEditModalOpen = (event: unknown) => {
    setSelectedEvent(event)
    
    // Populate edit form with event data
    const eventData = event as { startDate: number; endDate: number; title?: string; serverId?: string; instructors?: Array<{ userId: string }>; description?: string; maxParticipants?: number; status?: string }
    const eventDate = new Date(eventData.startDate)
    const startTime = eventDate.toTimeString().slice(0, 5).replace(':', '')
    const endTime = new Date(eventData.endDate).toTimeString().slice(0, 5).replace(':', '')
    
    setEditForm({
      title: eventData.title || "",
      date: eventDate,
      startTime: startTime,
      endTime: endTime,
      serverId: eventData.serverId || "",
      instructorIds: eventData.instructors?.map((inst) => inst.userId) || [],
      description: eventData.description || "",
      maxParticipants: eventData.maxParticipants?.toString() || "",
      status: (eventData.status as "scheduled" | "in_progress" | "completed" | "cancelled") || "scheduled",
    })
    
    setEditModalOpen(true)
  }

  const handleUpdateEvent = async () => {
    try {
      if (!selectedEvent) return
      
      if (!editForm.title) {
        alert("Event title is required")
        return
      }
      
      if (!editForm.serverId) {
        alert("Server selection is required")
        return
      }
      
      if (editForm.instructorIds.length === 0) {
        alert("At least one instructor/GM must be selected")
        return
      }
      
      if (!isValidDate(editForm.date)) {
        alert("Date must be within the current or next week")
        return
      }
      
      if (!isValidTime(editForm.startTime) || !isValidTime(editForm.endTime)) {
        alert("Times must be in 24-hour format (HHMM)")
        return
      }
      
      const eventDate = editForm.date!
      
      const startHours = parseInt(editForm.startTime.substring(0, 2))
      const startMinutes = parseInt(editForm.startTime.substring(2, 4))
      const endHours = parseInt(editForm.endTime.substring(0, 2))
      const endMinutes = parseInt(editForm.endTime.substring(2, 4))
      
      const startDate = new Date(eventDate)
      startDate.setHours(startHours, startMinutes, 0, 0)
      
      const endDate = new Date(eventDate)
      endDate.setHours(endHours, endMinutes, 0, 0)
      
      await updateEvent({
        eventId: (selectedEvent as { _id: Id<"events"> })._id,
        title: editForm.title,
        startDate: startDate.getTime(),
        endDate: endDate.getTime(),
        serverId: editForm.serverId as Id<"servers">,
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
    } catch (error) {
      console.error("Failed to update event:", error)
      alert("Failed to update event. Please try again.")
    }
  }

  // Helper functions
  function getWeekStart(date: Date): Date {
    const d = new Date(date)
    const day = d.getDay()
    const diff = d.getDate() - day + (day === 0 ? -6 : 1)
    const weekStart = new Date(d.setDate(diff))
    weekStart.setHours(0, 0, 0, 0)
    return weekStart
  }

  const isValidDate = (date: Date | undefined) => {
    if (!date) return false
    
    const currentDate = new Date()
    const currentWeekStart = getWeekStart(currentDate)
    const nextWeekEnd = new Date(currentWeekStart)
    nextWeekEnd.setDate(nextWeekEnd.getDate() + 13)
    
    return date >= currentWeekStart && date <= nextWeekEnd
  }

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

  const handleCreateEvent = async () => {
    try {
      if (!eventForm.title) {
        alert("Event title is required")
        return
      }
      
      if (!eventForm.serverId) {
        alert("Server selection is required")
        return
      }
      
      if (eventForm.instructorIds.length === 0) {
        alert("At least one instructor/GM must be selected")
        return
      }
      
      if (!isValidDate(eventForm.date)) {
        alert("Date must be within the current or next week")
        return
      }
      
      if (!isValidTime(eventForm.startTime) || !isValidTime(eventForm.endTime)) {
        alert("Times must be in 24-hour format (HHMM)")
        return
      }
      
      const eventDate = eventForm.date!
      
      const startHours = parseInt(eventForm.startTime.substring(0, 2))
      const startMinutes = parseInt(eventForm.startTime.substring(2, 4))
      const endHours = parseInt(eventForm.endTime.substring(0, 2))
      const endMinutes = parseInt(eventForm.endTime.substring(2, 4))
      
      const startDate = new Date(eventDate)
      startDate.setHours(startHours, startMinutes, 0, 0)
      
      const endDate = new Date(eventDate)
      endDate.setHours(endHours, endMinutes, 0, 0)
      
      // Auto-prefix title based on event category
      const prefix = eventForm.eventCategory === "training" ? "Training: " : "Operation: "
      const finalTitle = eventForm.title.startsWith(prefix) ? eventForm.title : prefix + eventForm.title
      
      await createEvent({
        title: finalTitle,
        startDate: startDate.getTime(),
        endDate: endDate.getTime(),
        serverId: eventForm.serverId as Id<"servers">,
        instructorIds: eventForm.instructorIds as Array<Id<"systemUsers">>,
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
    } catch (error) {
      console.error("Failed to create event:", error)
    }
  }

  const handleClearEvent = async () => {
    try {
      if (!clearCode) {
        alert("Please enter a booking code")
        return
      }
      await clearEventByCode({ bookingCode: clearCode })
      setClearModalOpen(false)
      setClearCode("")
    } catch (error) {
      console.error("Failed to clear event:", error)
      alert("Failed to clear event. Please check the booking code.")
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
        setSelectedWeek((currentWeek) => {
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

  const getEventStatusColor = (status: string) => {
    switch (status) {
      case 'scheduled': return 'bg-secondary/50 border-border text-foreground'
      case 'in_progress': return 'bg-primary/20 border-primary/30 text-primary'
      case 'completed': return 'bg-muted/50 border-border text-muted-foreground'
      case 'cancelled': return 'bg-muted/30 border-border text-muted-foreground'
      default: return 'bg-muted/30 border-border text-muted-foreground'
    }
  }

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString('en-US', { 
      weekday: 'short',
      month: 'short', 
      day: 'numeric',
      timeZone: 'Australia/Sydney'
    })
  }

  const formatTime = (timestamp: number) => {
    return new Date(timestamp).toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit',
      hour12: false,
      timeZone: 'Australia/Sydney'
    })
  }

  const formatTimeRange = (startTime: number, endTime: number) => {
    return `${formatTime(startTime)} - ${formatTime(endTime)}`
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
          {/* Decorative accent bar */}
          <div className="absolute -bottom-2 left-0 w-16 md:w-24 h-0.5 bg-primary rounded-full"></div>
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
                        {formatDate(event.startDate)} • {formatTimeRange(event.startDate, event.endDate)}
                      </p>
                      <p className="text-xs opacity-75">
                        {event.instructors && event.instructors.length > 0 
                          ? (event.instructors as Array<{ user?: { name?: string } }>).map((inst) => inst.user?.name).join(', ')
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
              <p>Calendar times are displayed in Sydney time (automatically adjusts for DST). Dashboard shows your local time.</p>
            </div>
            <div>
              <p className="font-medium text-foreground mb-1">Weekly Auto-Clear:</p>
              <p>All events automatically clear at midnight (00:00) every Sunday. The calendar will advance to the new week automatically.</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Booking Modal */}
      <Dialog open={bookingModalOpen} onOpenChange={setBookingModalOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Make Booking</DialogTitle>
            <DialogDescription>
              Create a new training event or operation. Date must be within current or next week.
            </DialogDescription>
          </DialogHeader>
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
            
            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label htmlFor="date">Date</Label>
                <Input
                  id="date"
                  type="date"
                  min={getWeekStart(new Date()).toISOString().split('T')[0]}
                  max={new Date(new Date().setDate(new Date().getDate() + 13)).toISOString().split('T')[0]}
                  value={eventForm.date ? eventForm.date.toISOString().split('T')[0] : ""}
                  onChange={(e) => {
                    const date = e.target.value ? new Date(e.target.value) : undefined
                    setEventForm({ ...eventForm, date })
                  }}
                  className={`${eventForm.date && !isValidDate(eventForm.date) ? "border-red-500" : ""} [&::-webkit-calendar-picker-indicator]:opacity-100 [&::-webkit-calendar-picker-indicator]:cursor-pointer`}
                  style={{
                    colorScheme: 'dark'
                  }}
                />
                {eventForm.date && !isValidDate(eventForm.date) && (
                  <p className="text-xs text-red-500 mt-1">Date must be within current or next week</p>
                )}
                <p className="text-xs text-muted-foreground mt-1">
                  Valid range: {getWeekStart(new Date()).toLocaleDateString('en-AU', { day: '2-digit', month: 'short' })} - {new Date(new Date().setDate(new Date().getDate() + 13)).toLocaleDateString('en-AU', { day: '2-digit', month: 'short' })}
                </p>
              </div>
              <div>
                <Label htmlFor="startTime">Start Time (HHMM)</Label>
                <Input
                  id="startTime"
                  value={eventForm.startTime}
                  onChange={(e) => {
                    let value = e.target.value.replace(/\D/g, '')
                    if (value.length > 4) value = value.substring(0, 4)
                    setEventForm({ ...eventForm, startTime: value })
                  }}
                  placeholder="1900"
                  maxLength={4}
                  className={!eventForm.startTime || isValidTime(eventForm.startTime) ? "" : "border-red-500"}
                />
                {eventForm.startTime && isValidTime(eventForm.startTime) && (
                  <p className="text-xs text-muted-foreground mt-1">{formatTimeForDisplay(eventForm.startTime)}</p>
                )}
              </div>
              <div>
                <Label htmlFor="endTime">End Time (HHMM)</Label>
                <Input
                  id="endTime"
                  value={eventForm.endTime}
                  onChange={(e) => {
                    let value = e.target.value.replace(/\D/g, '')
                    if (value.length > 4) value = value.substring(0, 4)
                    setEventForm({ ...eventForm, endTime: value })
                  }}
                  placeholder="2300"
                  maxLength={4}
                  className={!eventForm.endTime || isValidTime(eventForm.endTime) ? "" : "border-red-500"}
                />
                {eventForm.endTime && isValidTime(eventForm.endTime) && (
                  <p className="text-xs text-muted-foreground mt-1">{formatTimeForDisplay(eventForm.endTime)}</p>
                )}
              </div>
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

            <div>
              <Label htmlFor="instructors">
                {eventForm.eventCategory === "training" ? "Instructors" : "Game Masters"} (Multiple Selection)
              </Label>
              <div className="space-y-2 max-h-32 overflow-y-auto border border-border/50 rounded-lg p-3 bg-muted/20">
                {getAvailableInstructors(eventForm.eventCategory).map(user => (
                  <div key={user._id} className="flex items-center space-x-3 group">
                    <Checkbox
                      id={`instructor-${user._id}`}
                      checked={eventForm.instructorIds.includes(user._id)}
                      onCheckedChange={(checked: boolean) => {
                        if (checked) {
                          setEventForm({
                            ...eventForm,
                            instructorIds: [...eventForm.instructorIds, user._id]
                          })
                        } else {
                          setEventForm({
                            ...eventForm,
                            instructorIds: eventForm.instructorIds.filter(id => id !== user._id)
                          })
                        }
                      }}
                      className="border-border data-[state=checked]:bg-primary data-[state=checked]:border-primary"
                    />
                    <label 
                      htmlFor={`instructor-${user._id}`} 
                      className="flex items-center gap-2 text-sm cursor-pointer flex-1 py-1 group-hover:text-primary transition-colors"
                    >
                      {eventForm.eventCategory === "training" ? (
                        <GraduationCap className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
                      ) : (
                        <Gamepad2 className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
                      )}
                      <span className="font-medium">{user.name}</span>
                    </label>
                  </div>
                ))}
              </div>
              {eventForm.instructorIds.length > 0 && (
                <p className="text-xs text-muted-foreground mt-2 flex items-center gap-1">
                  <span className="font-semibold text-primary">{eventForm.instructorIds.length}</span>
                  {eventForm.eventCategory === "training" ? "instructor(s)" : "game master(s)"} selected
                </p>
              )}
              {getAvailableInstructors(eventForm.eventCategory).length === 0 && (
                <p className="text-xs text-muted-foreground mt-2">
                  No {eventForm.eventCategory === "training" ? "instructors" : "game masters"} available
                </p>
              )}
            </div>

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
          <DialogFooter>
            <Button onClick={handleCreateEvent}>Book Event</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Clear by Code Modal */}
      <Dialog open={clearModalOpen} onOpenChange={setClearModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Clear Event by Code</DialogTitle>
            <DialogDescription>
              Enter the booking code of the event you want to clear.
            </DialogDescription>
          </DialogHeader>
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
          <DialogFooter>
            <Button variant="outline" onClick={() => setClearModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleClearEvent}>
              Clear Event
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Event Modal */}
      <Dialog open={editModalOpen} onOpenChange={setEditModalOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Event</DialogTitle>
            <DialogDescription>
              Update the event details. Date must be within current or next week.
            </DialogDescription>
          </DialogHeader>
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
            
            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label htmlFor="edit-date">Date</Label>
                <Input
                  id="edit-date"
                  type="date"
                  min={getWeekStart(new Date()).toISOString().split('T')[0]}
                  max={new Date(new Date().setDate(new Date().getDate() + 13)).toISOString().split('T')[0]}
                  value={editForm.date ? editForm.date.toISOString().split('T')[0] : ""}
                  onChange={(e) => {
                    const date = e.target.value ? new Date(e.target.value) : undefined
                    setEditForm({ ...editForm, date })
                  }}
                  className={`${editForm.date && !isValidDate(editForm.date) ? "border-red-500" : ""} [&::-webkit-calendar-picker-indicator]:opacity-100 [&::-webkit-calendar-picker-indicator]:cursor-pointer`}
                  style={{
                    colorScheme: 'dark'
                  }}
                />
                {editForm.date && !isValidDate(editForm.date) && (
                  <p className="text-xs text-red-500 mt-1">Date must be within current or next week</p>
                )}
              </div>
              <div>
                <Label htmlFor="edit-startTime">Start Time (HHMM)</Label>
                <Input
                  id="edit-startTime"
                  value={editForm.startTime}
                  onChange={(e) => {
                    let value = e.target.value.replace(/\D/g, '')
                    if (value.length > 4) value = value.substring(0, 4)
                    setEditForm({ ...editForm, startTime: value })
                  }}
                  placeholder="1900"
                  maxLength={4}
                  className={!editForm.startTime || isValidTime(editForm.startTime) ? "" : "border-red-500"}
                />
                {editForm.startTime && isValidTime(editForm.startTime) && (
                  <p className="text-xs text-muted-foreground mt-1">{formatTimeForDisplay(editForm.startTime)}</p>
                )}
              </div>
              <div>
                <Label htmlFor="edit-endTime">End Time (HHMM)</Label>
                <Input
                  id="edit-endTime"
                  value={editForm.endTime}
                  onChange={(e) => {
                    let value = e.target.value.replace(/\D/g, '')
                    if (value.length > 4) value = value.substring(0, 4)
                    setEditForm({ ...editForm, endTime: value })
                  }}
                  placeholder="2300"
                  maxLength={4}
                  className={!editForm.endTime || isValidTime(editForm.endTime) ? "" : "border-red-500"}
                />
                {editForm.endTime && isValidTime(editForm.endTime) && (
                  <p className="text-xs text-muted-foreground mt-1">{formatTimeForDisplay(editForm.endTime)}</p>
                )}
              </div>
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

            <div>
              <Label htmlFor="edit-instructors">Instructor/GM (Multiple Selection)</Label>
              <div className="space-y-2 max-h-32 overflow-y-auto border border-border/50 rounded-lg p-3 bg-muted/20">
                {systemUsers?.map(user => (
                  <div key={user._id} className="flex items-center space-x-3 group">
                    <Checkbox
                      id={`edit-instructor-${user._id}`}
                      checked={editForm.instructorIds.includes(user._id)}
                      onCheckedChange={(checked: boolean) => {
                        if (checked) {
                          setEditForm({
                            ...editForm,
                            instructorIds: [...editForm.instructorIds, user._id]
                          })
                        } else {
                          setEditForm({
                            ...editForm,
                            instructorIds: editForm.instructorIds.filter(id => id !== user._id)
                          })
                        }
                      }}
                      className="border-border data-[state=checked]:bg-primary data-[state=checked]:border-primary"
                    />
                    <label 
                      htmlFor={`edit-instructor-${user._id}`} 
                      className="flex items-center gap-2 text-sm cursor-pointer flex-1 py-1 group-hover:text-primary transition-colors"
                    >
                      <GraduationCap className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
                      <span className="font-medium">{user.name}</span>
                    </label>
                  </div>
                ))}
              </div>
              {editForm.instructorIds.length > 0 && (
                <p className="text-xs text-muted-foreground mt-2 flex items-center gap-1">
                  <span className="font-semibold text-primary">{editForm.instructorIds.length}</span>
                  instructor(s) selected
                </p>
              )}
            </div>

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
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditModalOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleUpdateEvent}>Update Event</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Calendar Component - Full Width */}
      <div className="animate-slide-in-right opacity-0 animate-delay-500">
        <EventCalendar 
          selectedWeek={selectedWeek}
          onWeekChange={handleWeekChange}
          bookingModalOpen={bookingModalOpen}
          onBookingModalOpenChange={setBookingModalOpen}
          onEditEvent={handleEditModalOpen}
        />
      </div>
    </div>
  )
}
