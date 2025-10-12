"use client"

import { useQuery } from "convex/react"
import { api } from "../../../convex/_generated/api"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { CheckCircle2, Circle, Award, ChevronDown, ChevronRight, X } from "lucide-react"
import { useState } from "react"
import { cn } from "@/lib/utils"
import { Id } from "../../../convex/_generated/dataModel"

interface PersonnelQualificationsProps {
  personnelId: string
  compact?: boolean
  onRemove?: (qualificationId: string, qualName: string) => void
}

export function PersonnelQualifications({ 
  personnelId, 
  compact = false,
  onRemove 
}: PersonnelQualificationsProps) {
  const [expandedSchools, setExpandedSchools] = useState<Set<string>>(new Set())
  
  const personnel = useQuery(api.personnel.getPersonnelDetails, { 
    personnelId: personnelId as Id<"personnel"> 
  })
  const schools = useQuery(api.schools.listSchools, {})
  const allQualifications = useQuery(api.qualifications.listQualificationsWithCounts, {})

  if (!personnel || !schools || !allQualifications) {
    return <div className="text-sm text-muted-foreground">Loading qualifications...</div>
  }

  const personnelQualIds = new Set(
    personnel.qualifications?.map(q => q._id) || []
  )

  // Group qualifications by school - only show qualifications the person actually has
  const qualificationsBySchool = schools.map(school => {
    const schoolQuals = allQualifications.filter(q => q.schoolId === school._id)
    const earnedQuals = schoolQuals.filter(q => personnelQualIds.has(q._id))
    const earnedCount = earnedQuals.length
    const totalCount = schoolQuals.length
    const percentage = totalCount > 0 ? Math.round((earnedCount / totalCount) * 100) : 0
    
    return {
      school,
      qualifications: earnedQuals, // Only show earned qualifications
      earnedCount,
      totalCount,
      percentage,
    }
  }).filter(item => item.earnedCount > 0) // Only show schools where the person has at least one qualification

  const toggleSchool = (schoolId: string) => {
    const newExpanded = new Set(expandedSchools)
    if (newExpanded.has(schoolId)) {
      newExpanded.delete(schoolId)
    } else {
      newExpanded.add(schoolId)
    }
    setExpandedSchools(newExpanded)
  }

  const totalEarned = qualificationsBySchool.reduce((sum, item) => sum + item.earnedCount, 0)
  const totalAvailable = qualificationsBySchool.reduce((sum, item) => sum + item.totalCount, 0)

  if (compact) {
    // If no qualifications, show empty state
    if (totalEarned === 0) {
      return (
        <div className="text-center py-8 text-muted-foreground">
          <Award className="w-12 h-12 mx-auto mb-4 opacity-50" />
          <p className="text-sm">No qualifications awarded yet</p>
        </div>
      )
    }

    return (
      <div className="space-y-3">
        {/* Overall Summary */}
        <div className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
          <div className="flex items-center gap-2">
            <Award className="w-5 h-5 text-primary" />
            <span className="font-medium">Total Qualifications</span>
          </div>
          <Badge variant="secondary" className="text-base">
            {totalEarned} / {totalAvailable}
          </Badge>
        </div>

        {/* School Breakdown */}
        <div className="space-y-2">
          {qualificationsBySchool.map(({ school, qualifications, earnedCount, totalCount, percentage }) => {
            const isExpanded = expandedSchools.has(school._id)
            
            return (
              <div key={school._id} className="border rounded-lg overflow-hidden">
                {/* School Header */}
                <button
                  onClick={() => toggleSchool(school._id)}
                  className="w-full flex items-center justify-between p-3 hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-center gap-3 flex-1">
                    {isExpanded ? (
                      <ChevronDown className="w-4 h-4 text-muted-foreground" />
                    ) : (
                      <ChevronRight className="w-4 h-4 text-muted-foreground" />
                    )}
                    <div className="text-left">
                      <div className="font-medium text-sm">{school.name}</div>
                      <div className="text-xs text-muted-foreground">
                        <span className="text-military-blue">{earnedCount}</span> of <span className="text-military-cyan">{totalCount}</span> qualifications
                      </div>
                    </div>
                  </div>
                  
                  {/* Progress Bar */}
                  <div className="flex items-center gap-3 min-w-[120px]">
                    <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-primary transition-all duration-300"
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                    <span className="text-xs font-medium text-muted-foreground w-10 text-right">
                      {percentage}%
                    </span>
                  </div>
                </button>

                {/* Qualifications List */}
                {isExpanded && (
                  <div className="border-t bg-muted/20 p-3 space-y-2">
                    {qualifications.map(qual => {
                      // Since we only show earned qualifications now, all should have green styling
                      const qualData = personnel.qualifications?.find(q => q._id === qual._id)
                      
                      return (
                        <div 
                          key={qual._id}
                          className="flex items-start justify-between p-2 rounded-md transition-colors group"
                        >
                          <div className="flex items-start gap-2 flex-1">
                            <CheckCircle2 className="w-4 h-4 text-green-600 dark:text-green-400 mt-0.5 flex-shrink-0" />
                            <div className="flex-1">
                              <div className="text-sm font-medium text-foreground">{qual.name}</div>
                              {qualData?.awardedDate && (
                                <div className="text-xs text-gray-600 dark:text-gray-300 mt-1">
                                  Awarded: {new Date(qualData.awardedDate).toLocaleDateString()}
                                </div>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge variant="secondary" className="text-xs">
                              {qual.abbreviation}
                            </Badge>
                            {onRemove && (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                                onClick={() => onRemove(qual._id, qual.name)}
                              >
                                <X className="w-3 h-3 text-destructive" />
                              </Button>
                            )}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>
    )
  }

  // Non-compact view - show as badge grid
  // If no qualifications, show empty state
  if (totalEarned === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <Award className="w-12 h-12 mx-auto mb-4 opacity-50" />
        <p className="text-sm">No qualifications awarded yet</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {qualificationsBySchool.map(({ school, qualifications, earnedCount, totalCount }) => (
        <div key={school._id} className="space-y-2">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-semibold text-primary flex items-center gap-2">
              {school.name}
              <Badge variant="outline" className="ml-auto">
                {earnedCount} / {totalCount}
              </Badge>
            </h4>
          </div>
          <div className="flex flex-wrap gap-2">
            {qualifications.map(qual => {
              // Since we only show earned qualifications now, all badges should be earned
              return (
                <Badge
                  key={qual._id}
                  variant="default"
                  className="flex items-center gap-1.5 bg-primary/90"
                >
                  <CheckCircle2 className="w-3 h-3" />
                  {qual.abbreviation}
                </Badge>
              )
            })}
          </div>
        </div>
      ))}
    </div>
  )
}

