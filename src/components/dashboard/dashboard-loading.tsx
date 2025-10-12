import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"

export function DashboardLoading() {
  return (
    <div className="space-y-8 pb-8">
      {/* Page Header Skeleton */}
      <div className="animate-fade-in-down">
        <Skeleton className="h-10 w-48 mb-2" />
        <Skeleton className="h-4 w-72" />
      </div>

      {/* Stats Cards Skeleton */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {[1, 2, 3].map((i) => (
          <Card 
            key={i} 
            variant="depth" 
            className={`animate-scale-in opacity-0 animate-delay-${i}00`}
          >
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-5 w-5 rounded" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex items-baseline gap-2">
                <Skeleton className="h-10 w-16" />
                <Skeleton className="h-4 w-20" />
              </div>
              <Skeleton className="h-3 w-40 mt-2" />
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Main Content Skeleton */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Upcoming Events & Recent Promotions */}
        <div className="space-y-6 lg:col-span-1">
          {/* Upcoming Events Skeleton */}
          <Card variant="depth" className="animate-slide-in-right opacity-0 animate-delay-400">
            <CardHeader>
              <div className="flex items-center justify-between">
                <Skeleton className="h-5 w-40" />
                <Skeleton className="h-5 w-5 rounded" />
              </div>
              <Skeleton className="h-3 w-36 mt-1" />
            </CardHeader>
            <CardContent className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="p-3 rounded-lg border border-border/50 space-y-2"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 space-y-2">
                      <Skeleton className="h-4 w-full" />
                      <Skeleton className="h-3 w-24" />
                    </div>
                    <Skeleton className="h-5 w-12 rounded-full" />
                  </div>
                  <div className="flex items-center justify-between">
                    <Skeleton className="h-3 w-20" />
                    <Skeleton className="h-3 w-16" />
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Recent Promotions Skeleton */}
          <Card variant="depth" className="animate-slide-in-right opacity-0 animate-delay-500">
            <CardHeader>
              <div className="flex items-center justify-between">
                <Skeleton className="h-5 w-40" />
                <Skeleton className="h-5 w-5 rounded" />
              </div>
              <Skeleton className="h-3 w-32 mt-1" />
            </CardHeader>
            <CardContent className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="p-3 rounded-lg border border-border/50 space-y-2"
                >
                  <div className="flex items-center justify-between">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-5 w-10 rounded-full" />
                  </div>
                  <div className="space-y-1">
                    <Skeleton className="h-3 w-full" />
                    <Skeleton className="h-3 w-40" />
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>

        {/* Right Column - Week Schedule Skeleton (Large) */}
        <div className="lg:col-span-2">
          <Card variant="depth" className="h-full animate-slide-in-left opacity-0 animate-delay-400">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="space-y-2">
                  <Skeleton className="h-7 w-56" />
                  <Skeleton className="h-4 w-80" />
                </div>
                <Skeleton className="h-7 w-7 rounded" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <div
                    key={i}
                    className="p-4 rounded-lg border border-border/50"
                  >
                    <div className="flex items-start gap-4">
                      {/* Date Badge Skeleton */}
                      <Skeleton className="shrink-0 w-16 h-16 rounded-lg" />

                      {/* Event Details Skeleton */}
                      <div className="flex-1 space-y-3">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 space-y-2">
                            <Skeleton className="h-5 w-full max-w-md" />
                            <Skeleton className="h-4 w-full max-w-lg" />
                          </div>
                          <Skeleton className="h-5 w-12 rounded-full" />
                        </div>

                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                          {[1, 2, 3, 4].map((j) => (
                            <div key={j} className="space-y-1">
                              <Skeleton className="h-3 w-16" />
                              <Skeleton className="h-4 w-24" />
                            </div>
                          ))}
                        </div>

                        <Skeleton className="h-5 w-32 rounded-full" />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}

export function StatsCardLoading() {
  return (
    <Card variant="depth" className="animate-scale-in opacity-0">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-5 w-5 rounded" />
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex items-baseline gap-2">
          <Skeleton className="h-10 w-16" />
          <Skeleton className="h-4 w-20" />
        </div>
        <Skeleton className="h-3 w-40 mt-2" />
      </CardContent>
    </Card>
  )
}

export function EventCardLoading() {
  return (
    <div className="p-3 rounded-lg border border-border/50 space-y-2 animate-shimmer">
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 space-y-2">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-3 w-24" />
        </div>
        <Skeleton className="h-5 w-12 rounded-full" />
      </div>
      <div className="flex items-center justify-between">
        <Skeleton className="h-3 w-20" />
        <Skeleton className="h-3 w-16" />
      </div>
    </div>
  )
}

export function WeekEventLoading() {
  return (
    <div className="p-4 rounded-lg border border-border/50 animate-shimmer">
      <div className="flex items-start gap-4">
        <Skeleton className="shrink-0 w-16 h-16 rounded-lg" />
        <div className="flex-1 space-y-3">
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 space-y-2">
              <Skeleton className="h-5 w-full max-w-md" />
              <Skeleton className="h-4 w-full max-w-lg" />
            </div>
            <Skeleton className="h-5 w-12 rounded-full" />
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[1, 2, 3, 4].map((j) => (
              <div key={j} className="space-y-1">
                <Skeleton className="h-3 w-16" />
                <Skeleton className="h-4 w-24" />
              </div>
            ))}
          </div>
          <Skeleton className="h-5 w-32 rounded-full" />
        </div>
      </div>
    </div>
  )
}

