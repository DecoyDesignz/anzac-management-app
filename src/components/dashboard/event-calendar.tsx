"use client"

import { useState } from "react"
import { useQuery, useMutation } from "convex/react"
import { useSession } from "next-auth/react"
import { api } from "../../../convex/_generated/api"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Label } from "@/components/ui/label"
import { 
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Clock, Trash2, Edit, Users, Server, GraduationCap, Gamepad2 } from "lucide-react"
import { Id } from "../../../convex/_generated/dataModel"

type EventType = {
  _id: Id<"events">
  title: string
  startDate: number
  endDate: number
  status: string
  server?: { name: string } | null
  instructors: Array<{ user?: { name?: string } | null; role?: string }>
  eventTypeColor?: string
  eventType?: { color: string } | null
  bookingCode: string
  maxParticipants?: number
  currentParticipants?: number
  description?: string
}

interface EventCalendarProps {
  selectedWeek?: Date
  onWeekChange?: (date: Date) => void
  bookingModalOpen?: boolean
  onBookingModalOpenChange?: (open: boolean) => void
  onEditEvent?: (event: EventType) => void
}

interface EventCardProps {
  event: EventType
  onClick: () => void
}

function EventCard({ event, onClick }: EventCardProps) {
  const eventStart = new Date(event.startDate)
  const eventEnd = new Date(event.endDate)
  const durationMinutes = (eventEnd.getTime() - eventStart.getTime()) / (1000 * 60)
  const durationHours = durationMinutes / 60
  
  // Calculate timeline position (0-24 hours scale)
  const startHour = eventStart.getHours() + eventStart.getMinutes() / 60
  const startPercent = (startHour / 24) * 100
  const durationPercent = (durationHours / 24) * 100
  
  // Determine event type color
  const isTraining = event.title?.toLowerCase().includes('training')
  const eventColor = isTraining ? 'bg-primary' : 'bg-blue-600'
  const borderColor = isTraining ? 'border-primary' : 'border-blue-600'
  
  const formatTime = (timestamp: number) => {
    return new Date(timestamp).toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit',
      hour12: false,
      timeZone: 'Australia/Sydney'
    })
  }
  
  return (
    <div 
      className={`p-2 sm:p-3 rounded-lg border-2 ${borderColor} glass cursor-pointer transition-all duration-200 hover:shadow-lg hover:scale-[1.02] space-y-1 sm:space-y-2`}
      onClick={onClick}
    >
      {/* Title and Booking Code */}
      <div className="flex items-start justify-between gap-1 sm:gap-2">
        <h4 className="font-semibold text-xs sm:text-sm leading-tight flex-1">
          {event.title || 'Untitled Event'}
        </h4>
        {event.bookingCode && (
          <Badge variant="secondary" className="font-mono text-xs hidden sm:inline-flex">
            {event.bookingCode}
          </Badge>
        )}
      </div>
      
      {/* Timeline Bar - Hidden on mobile to save space */}
      <div className="hidden sm:block relative h-2 bg-muted rounded-full overflow-hidden">
        <div 
          className={`absolute h-full ${eventColor} rounded-full transition-all`}
          style={{
            left: `${startPercent}%`,
            width: `${durationPercent}%`
          }}
        />
        {/* Hour markers */}
        <div className="absolute inset-0 flex">
          {[0, 6, 12, 18, 24].map((hour) => (
            <div 
              key={hour}
              className="absolute h-full w-px bg-border/30"
              style={{ left: `${(hour / 24) * 100}%` }}
            />
          ))}
        </div>
      </div>
      
      {/* Time Display */}
      <div className="flex items-center gap-1 text-xs text-muted-foreground">
        <Clock className="w-3 h-3" />
        <span className="truncate">{formatTime(event.startDate)} - {formatTime(event.endDate)}</span>
        <span className="text-muted-foreground/70 hidden sm:inline">
          ({durationHours.toFixed(1)}h)
        </span>
      </div>
      
      {/* Server */}
      {event.server && (
        <div className="flex items-center gap-1 text-xs text-muted-foreground">
          <Server className="w-3 h-3" />
          <span className="truncate">{event.server.name}</span>
        </div>
      )}
      
      {/* Instructors */}
      {event.instructors && event.instructors.length > 0 && (
        <div className="flex items-center gap-1 text-xs text-muted-foreground">
          <GraduationCap className="w-3 h-3" />
          <span className="truncate">
            {event.instructors.map((inst) => inst.user?.name).join(', ')}
          </span>
        </div>
      )}
      
      {/* Participants */}
      {event.maxParticipants && (
        <div className="flex items-center gap-1 text-xs text-muted-foreground">
          <Users className="w-3 h-3" />
          <span>
            {event.currentParticipants || 0}/{event.maxParticipants}
          </span>
        </div>
      )}
    </div>
  )
}

export function EventCalendar({ selectedWeek = new Date(), onWeekChange, bookingModalOpen, onBookingModalOpenChange, onEditEvent }: EventCalendarProps) {
  const [editModalOpen, setEditModalOpen] = useState(false)
  const [selectedEvent, setSelectedEvent] = useState<EventType | null>(null)
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set())
  const [isAnimating, setIsAnimating] = useState(false)
  const { data: session } = useSession()
  
  // Check if we're at the boundaries
  const currentWeekStart = getWeekStart(new Date())
  const selectedWeekStart = getWeekStart(selectedWeek)
  const nextWeekStart = new Date(currentWeekStart)
  nextWeekStart.setDate(nextWeekStart.getDate() + 7)
  
  
  const isCurrentWeek = selectedWeekStart.getTime() === currentWeekStart.getTime()
  const isNextWeek = selectedWeekStart.getTime() === nextWeekStart.getTime()
  
  // Animation functions
  const animateWeekChange = (newWeek: Date) => {
    setIsAnimating(true)
    setTimeout(() => {
      onWeekChange?.(newWeek)
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

  // Fetch data
  const events = useQuery(api.events.listEvents, {
    startDate: getWeekStart(selectedWeek).getTime(),
    endDate: getWeekEnd(selectedWeek).getTime()
  })

  // Mutations
  const deleteEvent = useMutation(api.events.deleteEvent)
  const clearEventByCode = useMutation(api.events.clearEventByCode)

  // Helper functions
  function getWeekStart(date: Date): Date {
    const d = new Date(date)
    const day = d.getDay()
    const diff = d.getDate() - day + (day === 0 ? -6 : 1) // Adjust when day is Sunday
    return new Date(d.setDate(diff))
  }

  function getWeekEnd(date: Date): Date {
    const start = getWeekStart(date)
    const end = new Date(start)
    end.setDate(start.getDate() + 6)
    end.setHours(23, 59, 59, 999)
    return end
  }

  function formatTime(timestamp: number): string {
    return new Date(timestamp).toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit',
      hour12: false,
      timeZone: 'Australia/Sydney'
    })
  }

  function formatDate(timestamp: number): string {
    return new Date(timestamp).toLocaleDateString('en-US', { 
      weekday: 'short',
      month: 'short', 
      day: 'numeric',
      timeZone: 'Australia/Sydney'
    })
  }


  const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
  
  // Get events for each day
  const getEventsForDay = (dayIndex: number) => {
    const dayStart = new Date(getWeekStart(selectedWeek))
    dayStart.setDate(dayStart.getDate() + dayIndex)
    dayStart.setHours(0, 0, 0, 0)
    
    const dayEnd = new Date(dayStart)
    dayEnd.setHours(23, 59, 59, 999)

    return events?.filter(event => {
      const eventStart = new Date(event.startDate)
      return eventStart >= dayStart && eventStart <= dayEnd
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

  // Get date for a specific day
  const getDateForDay = (dayIndex: number) => {
    const date = new Date(getWeekStart(selectedWeek))
    date.setDate(date.getDate() + dayIndex)
    return date
  }

  const handleClearEvent = async (bookingCode: string) => {
    try {
      await clearEventByCode({ bookingCode })
      setEditModalOpen(false)
    } catch (error) {
      console.error("Failed to clear event:", error)
      alert("Failed to clear event. Please check the booking code.")
    }
  }


  return (
    <div className="space-y-6">
      {/* Calendar Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
          <h3 className={`text-lg sm:text-2xl font-bold text-primary transition-all duration-300 ease-in-out ${
            isAnimating ? 'opacity-0 translate-y-2' : 'opacity-100 translate-y-0'
          }`}>
            <span className="hidden sm:inline">Week of {formatDate(getWeekStart(selectedWeek).getTime())}</span>
            <span className="sm:hidden">{formatDate(getWeekStart(selectedWeek).getTime())}</span>
          </h3>
          <div className="flex gap-2">
            <Button 
              variant={isCurrentWeek ? "default" : "outline"}
              size="sm"
              onClick={() => {
                if (!isCurrentWeek) {
                  animateWeekChange(new Date())
                }
              }}
              disabled={isAnimating}
            >
              Current Week
            </Button>
            <Button 
              variant={isNextWeek ? "default" : "outline"}
              size="sm"
              onClick={() => {
                if (!isNextWeek) {
                  const nextWeek = new Date()
                  nextWeek.setDate(nextWeek.getDate() + 7)
                  animateWeekChange(nextWeek)
                }
              }}
              disabled={isAnimating}
            >
              Next Week
            </Button>
          </div>
        </div>
      </div>

      {/* Calendar Grid - Weekly Agenda View */}
      <div className={`grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-7 gap-4 transition-all duration-300 ease-in-out ${
        isAnimating ? 'opacity-0 scale-95' : 'opacity-100 scale-100'
      }`}>
        {days.map((day, dayIndex) => {
          const dayEvents = getEventsForDay(dayIndex)
          const eventGroups = getEventGroups(dayEvents)
          const dayDate = getDateForDay(dayIndex)
          
          return (
            <Card key={day} variant="depth" className="flex flex-col">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm sm:text-base font-semibold text-primary">
                  <span className="hidden sm:inline">{day}</span>
                  <span className="sm:hidden">{day.substring(0, 3)}</span>
                </CardTitle>
                <p className="text-xs text-muted-foreground">
                  {dayDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                </p>
              </CardHeader>
              <CardContent className="flex-1 space-y-2 sm:space-y-3 pt-0">
                {eventGroups.length === 0 ? (
                  <div className="text-center py-4 sm:py-8 text-muted-foreground text-xs sm:text-sm">
                    No events
                  </div>
                ) : (
                  eventGroups.map((group, groupIndex) => {
                    const primaryEvent = group[0]
                    const hasMultiple = group.length > 1
                    const groupKey = `${dayIndex}-${groupIndex}`
                    const isExpanded = expandedGroups.has(groupKey)

                    return (
                      <div key={groupIndex} className="space-y-2">
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
                            className="w-full h-6 sm:h-8 text-xs"
                            onClick={() => toggleGroupExpansion(dayIndex, groupIndex)}
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
                              className="w-full h-8 text-xs"
                              onClick={() => toggleGroupExpansion(dayIndex, groupIndex)}
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
        })}
      </div>

      {/* Event Details Modal */}
      <Dialog open={editModalOpen} onOpenChange={setEditModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Event Details</DialogTitle>
          </DialogHeader>
          {selectedEvent && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Event</Label>
                  <p className="text-sm font-medium">{selectedEvent.title}</p>
                </div>
                <div>
                  <Label>Booking Code</Label>
                  <p className="text-sm font-mono bg-muted px-2 py-1 rounded">{selectedEvent.bookingCode}</p>
                </div>
                <div>
                  <Label>Date & Time</Label>
                  <p className="text-sm">
                    {formatDate(selectedEvent.startDate)} • {formatTime(selectedEvent.startDate)} - {formatTime(selectedEvent.endDate)}
                  </p>
                </div>
                <div>
                  <Label>Category</Label>
                  <Badge variant="outline" className="flex items-center gap-1 w-fit">
                    {selectedEvent.title?.toLowerCase().includes('training') ? (
                      <>
                        <GraduationCap className="w-3 h-3" />
                        Training
                      </>
                    ) : (
                      <>
                        <Gamepad2 className="w-3 h-3" />
                        Operation
                      </>
                    )}
                  </Badge>
                </div>
                <div>
                  <Label>Server</Label>
                  <p className="text-sm">{selectedEvent.server?.name}</p>
                </div>
                <div>
                  <Label>
                    {selectedEvent.title?.toLowerCase().includes('training') ? 'Instructors' : 'Game Masters'}
                  </Label>
                  <div className="space-y-1">
                    {selectedEvent.instructors?.map((inst, index: number) => (
                      <div key={index} className="flex items-center gap-2">
                        <GraduationCap className="w-3 h-3" />
                        <span className="text-sm">{inst.user?.name}</span>
                        <Badge variant="outline" className="text-xs">
                          {inst.role?.replace('_', ' ') || 'Unknown'}
                        </Badge>
                      </div>
                    )) || <p className="text-sm text-muted-foreground">No instructors assigned</p>}
                  </div>
                </div>
              </div>
              
              {selectedEvent.description && (
                <div>
                  <Label>Description</Label>
                  <p className="text-sm text-muted-foreground">{selectedEvent.description}</p>
                </div>
              )}

              <div className="flex items-center gap-4">
                <div className="flex items-center gap-1 text-sm text-muted-foreground">
                  <Users className="w-4 h-4" />
                  {selectedEvent.currentParticipants}
                  {selectedEvent.maxParticipants && ` / ${selectedEvent.maxParticipants}`} participants
                </div>
                <Badge variant={selectedEvent.status === 'scheduled' ? 'default' : 'secondary'}>
                  {selectedEvent.status}
                </Badge>
              </div>

              <div className="flex gap-2 pt-4">
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => {
                    if (onEditEvent) {
                      onEditEvent(selectedEvent)
                      setEditModalOpen(false)
                    }
                  }}
                >
                  <Edit className="w-4 h-4 mr-2" />
                  Edit Event
                </Button>
                <Button 
                  variant="destructive" 
                  size="sm"
                  onClick={() => {
                    handleClearEvent(selectedEvent.bookingCode)
                    setEditModalOpen(false)
                  }}
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Clear Event
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
