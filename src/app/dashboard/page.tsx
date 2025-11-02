"use client"

import { useQuery } from "convex/react"
import { useSession } from "next-auth/react"
import { api } from "../../../convex/_generated/api"
import { Id } from "../../../convex/_generated/dataModel"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Users, GraduationCap, Gamepad2, TrendingUp, Calendar, Clock, Shield } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { DashboardLoading } from "@/components/dashboard/dashboard-loading"
import { getThemeAwareColor, getTextColor } from "@/lib/utils"
import { useTheme } from "@/providers/theme-provider"

export default function DashboardPage() {
  const { theme } = useTheme()
  const { data: session } = useSession()
  const isDarkMode = theme === 'dark'
  const dashboardData = useQuery(
    api.dashboard.getDashboardOverview,
    session?.user?.id ? { userId: session.user.id as Id<"personnel"> } : "skip"
  )
  const weekSchedule = useQuery(
    api.events.getWeekSchedule,
    session?.user?.id ? { userId: session.user.id as Id<"personnel"> } : "skip"
  )
  const nextWeekSchedule = useQuery(
    api.events.getNextWeekSchedule,
    session?.user?.id ? { userId: session.user.id as Id<"personnel"> } : "skip"
  )
  const nextEvent = useQuery(
    api.events.getNextEvent,
    session?.user?.id ? { userId: session.user.id as Id<"personnel"> } : "skip"
  )

  if (!dashboardData || !weekSchedule || !nextWeekSchedule) {
    return <DashboardLoading />
  }

  // Helper function to format date and time in user's local timezone
  const formatDateTime = (timestamp: number) => {
    const date = new Date(timestamp)
    return {
      date: date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
      time: date.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit', hour12: false }),
      dayOfWeek: date.toLocaleDateString(undefined, { weekday: 'short' }),
    }
  }

  return (
    <div className="space-y-8 pb-8">
      {/* Page Header - 70% Neutral */}
      <div className="animate-fade-in-down">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl md:text-3xl lg:text-4xl font-bold tracking-tight text-primary">Dashboard</h1>
          <Badge variant="outline" className="text-xs hidden sm:flex">
            <Clock className="w-3 h-3 mr-1" />
            Local Time
          </Badge>
        </div>
      </div>

      {/* Stats Cards - 70% Neutral backgrounds, 10% Orange accent icons only */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 md:gap-6">
        {/* Total Personnel */}
        <Card variant="depth" className="transition-all duration-300 animate-scale-in opacity-0 animate-delay-100">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total Personnel</CardTitle>
              {/* 10% - Orange accent icon */}
              <Users className="w-5 h-5 text-primary" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex items-baseline gap-2">
              <p className="text-3xl md:text-4xl font-bold text-foreground">{dashboardData.personnel.total}</p>
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              {dashboardData.personnel.active} active · {dashboardData.personnel.inactive} inactive
            </p>
          </CardContent>
        </Card>

        {/* Instructors */}
        <Card variant="depth" className="transition-all duration-300 animate-scale-in opacity-0 animate-delay-200">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium text-muted-foreground">Instructors</CardTitle>
              {/* 10% - Orange accent icon */}
              <GraduationCap className="w-5 h-5 text-primary" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex items-baseline gap-2">
              <p className="text-3xl md:text-4xl font-bold text-foreground">{dashboardData.systemUsers.instructors}</p>
            </div>
            <p className="text-xs text-muted-foreground mt-2">Training Instructors</p>
          </CardContent>
        </Card>

        {/* Game Masters */}
        <Card variant="depth" className="transition-all duration-300 animate-scale-in opacity-0 animate-delay-300">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium text-muted-foreground">Game Masters</CardTitle>
              {/* 10% - Orange accent icon */}
              <Gamepad2 className="w-5 h-5 text-primary" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex items-baseline gap-2">
              <p className="text-3xl md:text-4xl font-bold text-foreground">{dashboardData.systemUsers.gameMasters}</p>
            </div>
            <p className="text-xs text-muted-foreground mt-2">Event coordinators</p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content - Two Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6">
        {/* Left Column - Upcoming Events & Recent Promotions */}
        <div className="space-y-4 md:space-y-6 lg:col-span-1">
          {/* Next Event */}
          <Card variant="depth" className="animate-slide-in-right opacity-0 animate-delay-400">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg font-semibold text-foreground">Next Event</CardTitle>
                {/* 10% - Orange accent icon */}
                <Calendar className="w-5 h-5 text-primary" />
              </div>
              <p className="text-xs text-muted-foreground">Closest upcoming event</p>
            </CardHeader>
            <CardContent className="space-y-3">
              {nextEvent ? (
                (() => {
                  const dateTime = formatDateTime(nextEvent.startDate)
                  return (
                    <div className="p-3 rounded-lg border border-border hover:border-primary/20 transition-all duration-300 space-y-2 animate-fade-in-up opacity-0 animate-delay-100 bg-secondary/10">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <h4 className="font-semibold text-sm text-foreground truncate">{nextEvent.title}</h4>
                          <p className="text-xs text-muted-foreground">{nextEvent.server}</p>
                        </div>
                        <Badge
                          className="text-xs shrink-0"
                          style={{ backgroundColor: nextEvent.eventTypeColor + '20', color: nextEvent.eventTypeColor, border: `1px solid ${nextEvent.eventTypeColor}40` }}
                        >
                          {dateTime.dayOfWeek}
                        </Badge>
                      </div>
                      <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <span className="flex items-center gap-1 text-military-cyan">
                          <Clock className="w-3 h-3" />
                          {dateTime.time}
                        </span>
                        <span className="flex items-center gap-1 text-military-cyan">
                          <Calendar className="w-3 h-3" />
                          {dateTime.date}
                        </span>
                      </div>
                    </div>
                  )
                })()
              ) : (
                <p className="text-sm text-muted-foreground text-center py-6">No upcoming events scheduled</p>
              )}
            </CardContent>
          </Card>

          {/* Recent Promotions */}
          <Card variant="depth" className="animate-slide-in-right opacity-0 animate-delay-500">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg font-semibold text-foreground">Recent Promotions</CardTitle>
                {/* 10% - Orange accent icon */}
                <TrendingUp className="w-5 h-5 text-primary" />
              </div>
              <p className="text-xs text-muted-foreground">Latest rank changes</p>
            </CardHeader>
            <CardContent className="space-y-3">
              {dashboardData.recentPromotions.length > 0 ? (
                dashboardData.recentPromotions.map((promotion, index) => {
                  const dateTime = formatDateTime(promotion.promotionDate)
                  return (
                    <div
                      key={index}
                      className={`p-3 rounded-lg border border-border hover:border-primary/20 space-y-2 animate-fade-in-up opacity-0 animate-delay-${(index + 1) * 100} bg-secondary/10 transition-all duration-300`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <h4 className="font-semibold text-sm text-foreground">{promotion.personnelName}</h4>
                          {/* System Roles */}
                          {promotion.hasSystemAccess && promotion.roles && promotion.roles.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-1">
                              {promotion.roles.map((role: { name: string; displayName: string; color: string }) => {
                                const adjustedColor = getThemeAwareColor(role.color, isDarkMode)
                                return (
                                  <Badge 
                                    key={role.name} 
                                    className="text-xs flex items-center gap-1"
                                    style={{
                                      backgroundColor: adjustedColor,
                                      color: getTextColor(adjustedColor),
                                      border: 'none'
                                    }}
                                  >
                                    <Shield className="w-2.5 h-2.5" />
                                    {role.displayName}
                                  </Badge>
                                )
                              })}
                            </div>
                          )}
                        </div>
                        <Badge variant="outline" className="text-xs shrink-0">
                          {promotion.rankAbbreviation}
                        </Badge>
                      </div>
                      <div className="text-xs text-muted-foreground space-y-1">
                        <p>Promoted to {promotion.rankName}</p>
                        <p className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {dateTime.date} · by {promotion.promotedByName}
                        </p>
                      </div>
                    </div>
                  )
                })
              ) : (
                <p className="text-sm text-muted-foreground text-center py-6">No recent promotions</p>
              )}
            </CardContent>
          </Card>
      </div>

        {/* Right Column - Week Schedule (Large) */}
        <div className="lg:col-span-2">
          <Card variant="depth" className="h-full animate-slide-in-left opacity-0 animate-delay-400">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-xl md:text-2xl font-bold text-foreground">This Week&apos;s Schedule</CardTitle>
                  <p className="text-xs md:text-sm text-muted-foreground mt-1">All scheduled events for the current week</p>
                </div>
                {/* 10% - Orange accent icon */}
                <Calendar className="w-6 h-6 md:w-7 md:h-7 text-primary" />
              </div>
            </CardHeader>
          <CardContent>
              <div className="space-y-3">
                {weekSchedule.length > 0 ? (
                  weekSchedule.map((event, idx) => {
                      const dateTime = formatDateTime(event.startDate)
                      const endTime = formatDateTime(event.endDate)
                      return (
                        <div
                          key={event._id}
                          className={`p-3 md:p-4 rounded-lg border border-border hover:border-primary/30 hover:shadow-md transition-all duration-300 animate-fade-in-up opacity-0 animate-delay-${Math.min((idx + 1) * 100, 500)} bg-secondary/10`}
                        >
                          <div className="flex items-start gap-3 md:gap-4">
                            {/* Date Badge */}
                            <div
                              className="shrink-0 w-14 h-14 md:w-16 md:h-16 rounded-lg flex flex-col items-center justify-center text-center"
                              style={{ backgroundColor: event.eventTypeColor + '20', border: `2px solid ${event.eventTypeColor}40` }}
                            >
                              <p className="text-xs font-medium" style={{ color: event.eventTypeColor }}>
                                {dateTime.dayOfWeek}
                              </p>
                              <p className="text-lg font-bold" style={{ color: event.eventTypeColor }}>
                                {dateTime.date.split(' ')[1]}
                              </p>
                              <p className="text-xs font-medium" style={{ color: event.eventTypeColor }}>
                                {dateTime.date.split(' ')[0]}
                              </p>
                            </div>

                            {/* Event Details */}
                            <div className="flex-1 min-w-0 space-y-2">
                              <div className="flex items-start justify-between gap-2">
                                <div className="flex-1 min-w-0">
                                  <h3 className="text-base md:text-lg font-semibold text-foreground truncate">{event.title}</h3>
                                  <p className="text-xs md:text-sm text-muted-foreground line-clamp-2">{event.description || 'No description provided'}</p>
                                </div>
                              </div>

                              <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2 md:gap-3 text-xs">
                                <div className="space-y-1">
                                  <p className="text-muted-foreground">Time</p>
                                  <p className="font-medium text-foreground flex items-center gap-1">
                                    <Clock className="w-3 h-3" />
                                    {dateTime.time} - {endTime.time}
                                  </p>
                                </div>
                                <div className="space-y-1">
                                  <p className="text-muted-foreground">Server</p>
                                  <p className="font-medium text-foreground">{event.server}</p>
                                </div>
                                <div className="space-y-1">
                                  <p className="text-muted-foreground">
                                    {event.title?.toLowerCase().includes('training') ? 'Instructors' : 'Game Masters'}
                                  </p>
                                  <p className="font-medium text-foreground">{event.instructorName}</p>
                                </div>
                              </div>

                              <div className="pt-1">
                                <Badge variant="outline" className="text-xs font-mono">
                                  Code: {event.bookingCode}
                                </Badge>
                              </div>
                    </div>
                  </div>
                </div>
                      )
                    })
                ) : (
                  <div className="text-center py-16">
                    <Calendar className="w-16 h-16 text-muted-foreground/30 mx-auto mb-4" />
                    <p className="text-lg font-medium text-muted-foreground">No events scheduled this week</p>
                    <p className="text-sm text-muted-foreground mt-2">Check back later or schedule a new event</p>
                  </div>
                )}
            </div>
          </CardContent>
        </Card>
      </div>
      </div>

      {/* Next Week's Schedule - Full Width */}
      <div className="animate-fade-in-up opacity-0 animate-delay-600">
        <Card variant="depth">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-xl md:text-2xl font-bold text-foreground">Next Week&apos;s Schedule</CardTitle>
                <p className="text-xs md:text-sm text-muted-foreground mt-1">Upcoming events for the next week</p>
              </div>
              <Calendar className="w-6 h-6 md:w-7 md:h-7 text-primary" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {nextWeekSchedule.length > 0 ? (
                nextWeekSchedule.map((event, idx) => {
                  const dateTime = formatDateTime(event.startDate)
                  const endTime = formatDateTime(event.endDate)
                  return (
                    <div
                      key={event._id}
                      className={`p-3 md:p-4 rounded-lg border border-border hover:border-primary/30 hover:shadow-md transition-all duration-300 animate-fade-in-up opacity-0 animate-delay-${Math.min((idx + 1) * 100, 500)} bg-secondary/10`}
                    >
                      <div className="flex items-start gap-3 md:gap-4">
                        {/* Date Badge */}
                        <div
                          className="shrink-0 w-14 h-14 md:w-16 md:h-16 rounded-lg flex flex-col items-center justify-center text-center"
                          style={{ backgroundColor: event.eventTypeColor + '20', border: `2px solid ${event.eventTypeColor}40` }}
                        >
                          <p className="text-xs font-medium" style={{ color: event.eventTypeColor }}>
                            {dateTime.dayOfWeek}
                          </p>
                          <p className="text-lg font-bold" style={{ color: event.eventTypeColor }}>
                            {dateTime.date.split(' ')[1]}
                          </p>
                          <p className="text-xs font-medium" style={{ color: event.eventTypeColor }}>
                            {dateTime.date.split(' ')[0]}
                          </p>
                        </div>

                        {/* Event Details */}
                        <div className="flex-1 min-w-0 space-y-2">
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex-1 min-w-0">
                              <h3 className="text-base md:text-lg font-semibold text-foreground truncate">{event.title}</h3>
                              <p className="text-xs md:text-sm text-muted-foreground line-clamp-2">{event.description || 'No description provided'}</p>
                            </div>
                          </div>

                          <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2 md:gap-3 text-xs">
                            <div className="space-y-1">
                              <p className="text-muted-foreground">Time</p>
                              <p className="font-medium text-foreground flex items-center gap-1">
                                <Clock className="w-3 h-3" />
                                {dateTime.time} - {endTime.time}
                              </p>
                            </div>
                            <div className="space-y-1">
                              <p className="text-muted-foreground">Server</p>
                              <p className="font-medium text-foreground">{event.server}</p>
                            </div>
                            <div className="space-y-1">
                              <p className="text-muted-foreground">
                                {event.title?.toLowerCase().includes('training') ? 'Instructors' : 'Game Masters'}
                              </p>
                              <p className="font-medium text-foreground">{event.instructorName}</p>
                            </div>
                          </div>

                          <div className="pt-1">
                            <Badge variant="outline" className="text-xs font-mono">
                              Code: {event.bookingCode}
                            </Badge>
                          </div>
                        </div>
                      </div>
                    </div>
                  )
                })
              ) : (
                <div className="text-center py-16">
                  <Calendar className="w-16 h-16 text-muted-foreground/30 mx-auto mb-4" />
                  <p className="text-lg font-medium text-muted-foreground">No events scheduled for next week</p>
                  <p className="text-sm text-muted-foreground mt-2">Schedule events for the upcoming week</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

