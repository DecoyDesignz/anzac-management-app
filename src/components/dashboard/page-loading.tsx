import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"

// Generic Stats Cards Loading (4 cards)
export function StatsCardsLoading({ count = 4 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
      {Array.from({ length: count }).map((_, i) => (
        <Card key={i} className={`glass border-border/50 animate-scale-in opacity-0 animate-delay-${Math.min((i + 1) * 100, 500)}`}>
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2">
              <Skeleton className="h-4 w-4 rounded" />
              <Skeleton className="h-4 w-32" />
            </div>
          </CardHeader>
          <CardContent>
            <Skeleton className="h-8 w-16 mb-2" />
            <Skeleton className="h-3 w-full" />
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

// Table Loading Component
export function TableLoading({ rows = 5, columns = 4 }: { rows?: number; columns?: number }) {
  return (
    <div className="space-y-3">
      {/* Table Header */}
      <div className="flex gap-4 pb-3 border-b">
        {Array.from({ length: columns }).map((_, i) => (
          <Skeleton key={i} className="h-4 flex-1" />
        ))}
      </div>
      {/* Table Rows */}
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className={`flex gap-4 py-3 animate-fade-in-up opacity-0 animate-delay-${Math.min(i * 100, 500)}`}>
          {Array.from({ length: columns }).map((_, j) => (
            <Skeleton key={j} className="h-10 flex-1" />
          ))}
        </div>
      ))}
    </div>
  )
}

// Calendar Page Loading
export function CalendarPageLoading() {
  return (
    <div className="space-y-8 pb-8">
      {/* Header */}
      <div className="animate-fade-in-down">
        <Skeleton className="h-10 w-64 mb-2" />
        <Skeleton className="h-5 w-96" />
      </div>

      {/* Quick Stats */}
      <StatsCardsLoading count={4} />

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Calendar */}
        <div className="lg:col-span-2 animate-slide-in-right opacity-0 animate-delay-300">
          <Card variant="depth" className="h-full">
            <CardHeader>
              <Skeleton className="h-6 w-48" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-96 w-full rounded-lg" />
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6 animate-slide-in-left opacity-0 animate-delay-300">
          <Card variant="depth">
            <CardHeader>
              <Skeleton className="h-6 w-40" />
            </CardHeader>
            <CardContent className="space-y-3">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-24 w-full rounded-lg" />
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}

// Personnel Page Loading
export function PersonnelPageLoading() {
  return (
    <div className="space-y-8 pb-8">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div className="animate-fade-in-down space-y-2">
          <Skeleton className="h-10 w-48" />
          <Skeleton className="h-5 w-64" />
        </div>
        <Skeleton className="h-10 w-40" />
      </div>

      {/* Search Bar */}
      <div className="animate-fade-in opacity-0 animate-delay-100">
        <Skeleton className="h-16 w-full rounded-lg" />
      </div>

      {/* Content */}
      <div className="animate-fade-in-up opacity-0 animate-delay-200">
        <Card variant="depth">
          <CardHeader>
            <Skeleton className="h-6 w-40" />
            <Skeleton className="h-4 w-64 mt-2" />
          </CardHeader>
          <CardContent className="space-y-3">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <Skeleton key={i} className="h-20 w-full rounded-lg" />
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

// Qualifications Page Loading
export function QualificationsPageLoading() {
  return (
    <div className="space-y-8 pb-8">
      {/* Header */}
      <div className="flex justify-between items-center animate-fade-in-down">
        <div className="space-y-2">
          <Skeleton className="h-10 w-56" />
          <Skeleton className="h-5 w-80" />
        </div>
        <Skeleton className="h-10 w-48" />
      </div>

      {/* Quick Stats */}
      <StatsCardsLoading count={4} />

      {/* Search Bar */}
      <div className="animate-fade-in opacity-0 animate-delay-300">
        <Card variant="depth">
          <CardContent className="p-4">
            <Skeleton className="h-10 w-full" />
          </CardContent>
        </Card>
      </div>

      {/* Qualifications by School */}
      <div className="space-y-6">
        {[1, 2, 3].map((i) => (
          <Card key={i} className={`glass border-border/50 animate-fade-in-up opacity-0 animate-delay-${Math.min((i + 2) * 100, 500)}`}>
            <CardHeader>
              <Skeleton className="h-6 w-40" />
              <Skeleton className="h-4 w-64 mt-2" />
            </CardHeader>
            <CardContent>
              <TableLoading rows={3} columns={4} />
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}

// Schools Page Loading
export function SchoolsPageLoading() {
  return (
    <div className="space-y-8 pb-8">
      {/* Header */}
      <div className="flex justify-between items-center animate-fade-in-down">
        <div className="space-y-2">
          <Skeleton className="h-10 w-64" />
          <Skeleton className="h-5 w-96" />
        </div>
        <Skeleton className="h-10 w-40" />
      </div>

      {/* Schools Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <Card key={i} className={`glass border-border/50 animate-scale-in opacity-0 animate-delay-${Math.min(i * 100, 500)}`}>
            <CardHeader>
              <Skeleton className="h-6 w-32" />
              <Skeleton className="h-4 w-24 mt-2" />
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-3/4" />
              </div>
              <Skeleton className="h-10 w-full" />
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Table */}
      <div className="animate-fade-in opacity-0 animate-delay-400">
        <Card variant="depth">
          <CardHeader>
            <Skeleton className="h-6 w-40" />
          </CardHeader>
          <CardContent>
            <TableLoading rows={6} columns={5} />
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

// Settings Page Loading
export function SettingsPageLoading() {
  return (
    <div className="space-y-8 pb-8">
      {/* Header */}
      <div className="animate-fade-in-down space-y-2">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-5 w-80" />
      </div>

      {/* Two Column Grid */}
      <div className="grid gap-6 md:grid-cols-2">
        {[1, 2].map((i) => (
          <Card key={i} variant="depth" className={`animate-scale-in opacity-0 animate-delay-${i * 100}`}>
            <CardHeader>
              <Skeleton className="h-6 w-48" />
              <Skeleton className="h-4 w-64 mt-2" />
            </CardHeader>
            <CardContent className="space-y-5">
              <Skeleton className="h-24 w-full rounded-lg" />
              <Skeleton className="h-24 w-full rounded-lg" />
              <Skeleton className="h-24 w-full rounded-lg" />
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}

// System Management Page Loading
export function SystemPageLoading() {
  return (
    <div className="space-y-8 pb-8">
      {/* Header */}
      <div className="animate-fade-in-down space-y-2">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-5 w-96" />
      </div>

      {/* Three Column Grid */}
      <div className="grid gap-6 md:grid-cols-3">
        {[1, 2, 3].map((i) => (
          <Card key={i} variant="depth" className={`animate-scale-in opacity-0 animate-delay-${i * 100}`}>
            <CardHeader>
              <Skeleton className="h-6 w-40" />
              <Skeleton className="h-4 w-32 mt-2" />
            </CardHeader>
            <CardContent className="space-y-4">
              <Skeleton className="h-16 w-full" />
              <Skeleton className="h-10 w-full" />
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}

