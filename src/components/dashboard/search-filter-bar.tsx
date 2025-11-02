"use client"

import { useState } from "react"
import { useQuery } from "convex/react"
import { api } from "../../../convex/_generated/api"
import { Id } from "../../../convex/_generated/dataModel"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { 
  Tabs, 
  TabsList, 
  TabsTrigger 
} from "@/components/ui/tabs"
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { 
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { Checkbox } from "@/components/ui/checkbox"
import { Search, Filter, X, ChevronDown } from "lucide-react"

export type FilterMode = "callsign" | "rank" | "qualification"
export type SortOrder = "asc" | "desc"
export type SystemRole = "game_master" | "instructor" | "administrator"

interface SearchFilterBarProps {
  userId: Id<"personnel"> | null // User ID from NextAuth session
  searchTerm: string
  onSearchChange: (term: string) => void
  filterMode: FilterMode
  onFilterModeChange: (mode: FilterMode) => void
  selectedRanks: string[]
  onRanksChange: (ranks: string[]) => void
  selectedSchools?: string[]
  onSchoolsChange?: (schools: string[]) => void
  selectedRoles?: SystemRole[]
  onRolesChange?: (roles: SystemRole[]) => void
  sortBy: string
  onSortByChange: (sort: string) => void
  sortOrder: SortOrder
  onSortOrderChange: (order: SortOrder) => void
  onClearFilters: () => void
}

export function SearchFilterBar({
  userId,
  searchTerm,
  onSearchChange,
  filterMode,
  onFilterModeChange,
  selectedRanks,
  onRanksChange,
  selectedSchools = [],
  onSchoolsChange,
  selectedRoles = [],
  onRolesChange,
  sortBy,
  onSortByChange,
  sortOrder,
  onSortOrderChange,
  onClearFilters
}: SearchFilterBarProps) {
  const [rankFilterOpen, setRankFilterOpen] = useState(false)
  const [schoolFilterOpen, setSchoolFilterOpen] = useState(false)
  const [roleFilterOpen, setRoleFilterOpen] = useState(false)

  // Fetch data for filters - only if userId is available
  const ranks = useQuery(
    api.ranks.listRanks,
    userId ? { userId } : "skip"
  )
  const schools = useQuery(
    api.schools.listSchools,
    userId ? { userId } : "skip"
  )

  // Count active filters
  const activeFiltersCount = selectedRanks.length + (selectedSchools?.length || 0) + (selectedRoles?.length || 0)

  const handleRankToggle = (rankId: string) => {
    if (selectedRanks.includes(rankId)) {
      onRanksChange(selectedRanks.filter(id => id !== rankId))
    } else {
      onRanksChange([...selectedRanks, rankId])
    }
  }

  const handleSchoolToggle = (schoolId: string) => {
    if (!selectedSchools || !onSchoolsChange) return
    if (selectedSchools.includes(schoolId)) {
      onSchoolsChange(selectedSchools.filter(id => id !== schoolId))
    } else {
      onSchoolsChange([...selectedSchools, schoolId])
    }
  }

  const handleRoleToggle = (role: SystemRole) => {
    if (!selectedRoles || !onRolesChange) return
    if (selectedRoles.includes(role)) {
      onRolesChange(selectedRoles.filter(r => r !== role))
    } else {
      onRolesChange([...selectedRoles, role])
    }
  }

  const roleLabels: Record<SystemRole, string> = {
    game_master: "Game Master",
    instructor: "Instructor",
    administrator: "Administrator"
  }

  const getSortOptions = () => {
    switch (filterMode) {
      case "callsign":
        return [
          { value: "rank", label: "Rank" },
          { value: "callSign", label: "Call Sign" },
          { value: "joinDate", label: "Join Date" }
        ]
      case "rank":
        return [
          { value: "rank", label: "Rank" },
          { value: "callSign", label: "Call Sign" },
          { value: "joinDate", label: "Join Date" }
        ]
      case "qualification":
        return [
          { value: "rank", label: "Rank" },
          { value: "qualificationCount", label: "Qualification Count" },
          { value: "callSign", label: "Call Sign" },
          { value: "joinDate", label: "Join Date" }
        ]
      default:
        return []
    }
  }

  return (
    <Card className="border border-border/50 mb-6 bg-card">
      <CardContent className="p-6">
        <div className="space-y-6">
          {/* Search and Filter Mode */}
          <div className="flex flex-col lg:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                <Input
                  placeholder={`Search by ${filterMode === "callsign" ? "call sign" : filterMode === "rank" ? "rank" : "qualification name"}...`}
                  value={searchTerm}
                  onChange={(e) => onSearchChange(e.target.value)}
                  className="pl-10 h-11 text-base"
                />
              </div>
            </div>
            
            <div className="flex flex-col sm:flex-row gap-3">
              <Tabs value={filterMode} onValueChange={(value: string) => onFilterModeChange(value as FilterMode)}>
                <TabsList className="grid w-full grid-cols-3 sm:w-auto bg-muted/50">
                  <TabsTrigger value="callsign" className="text-sm">Call Sign</TabsTrigger>
                  <TabsTrigger value="rank" className="text-sm">Rank</TabsTrigger>
                  <TabsTrigger value="qualification" className="text-sm">Qualification</TabsTrigger>
                </TabsList>
              </Tabs>
            </div>
          </div>

          {/* Filters and Sort */}
          <div className="flex flex-wrap items-center gap-3">
            {/* Rank Filter */}
            <Popover open={rankFilterOpen} onOpenChange={setRankFilterOpen}>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm" className="flex items-center gap-2 h-9">
                  <Filter className="w-4 h-4" />
                  Ranks
                  {selectedRanks.length > 0 && (
                    <Badge variant="secondary" className="ml-1 h-5 text-xs">
                      {selectedRanks.length}
                    </Badge>
                  )}
                  <ChevronDown className="w-4 h-4" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-72" align="start">
                <div className="space-y-3">
                  <h4 className="font-semibold text-sm">Filter by Rank</h4>
                  <div className="max-h-60 overflow-y-auto space-y-2 p-1">
                    {ranks?.map(rank => (
                      <div key={rank._id} className="flex items-center space-x-3 group hover:bg-muted/30 rounded-md p-2 -m-2 transition-colors">
                        <Checkbox
                          id={`rank-${rank._id}`}
                          checked={selectedRanks.includes(rank._id)}
                          onCheckedChange={() => handleRankToggle(rank._id)}
                          className="border-border data-[state=checked]:bg-primary data-[state=checked]:border-primary"
                        />
                        <label 
                          htmlFor={`rank-${rank._id}`}
                          className="text-sm cursor-pointer flex-1 font-medium group-hover:text-primary transition-colors"
                        >
                          {rank.abbreviation} - {rank.name}
                        </label>
                      </div>
                    ))}
                  </div>
                </div>
              </PopoverContent>
            </Popover>

            {/* School Filter - Only show if onSchoolsChange is provided */}
            {onSchoolsChange && (
              <Popover open={schoolFilterOpen} onOpenChange={setSchoolFilterOpen}>
                <PopoverTrigger asChild>
                  <Button variant="outline" size="sm" className="flex items-center gap-2 h-9">
                    <Filter className="w-4 h-4" />
                    Schools
                    {(selectedSchools?.length || 0) > 0 && (
                      <Badge variant="secondary" className="ml-1 h-5 text-xs">
                        {selectedSchools?.length || 0}
                      </Badge>
                    )}
                    <ChevronDown className="w-4 h-4" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-72" align="start">
                  <div className="space-y-3">
                    <h4 className="font-semibold text-sm">Filter by School</h4>
                    <div className="max-h-60 overflow-y-auto space-y-2 p-1">
                      {schools?.map(school => (
                        <div key={school._id} className="flex items-center space-x-3 group hover:bg-muted/30 rounded-md p-2 -m-2 transition-colors">
                          <Checkbox
                            id={`school-${school._id}`}
                            checked={selectedSchools?.includes(school._id) || false}
                            onCheckedChange={() => handleSchoolToggle(school._id)}
                            className="border-border data-[state=checked]:bg-primary data-[state=checked]:border-primary"
                          />
                          <label 
                            htmlFor={`school-${school._id}`}
                            className="text-sm cursor-pointer flex-1 font-medium group-hover:text-primary transition-colors"
                          >
                            {school.name}
                          </label>
                        </div>
                      ))}
                    </div>
                  </div>
                </PopoverContent>
              </Popover>
            )}

            {/* System Role Filter - Only show if onRolesChange is provided */}
            {onRolesChange && (
              <Popover open={roleFilterOpen} onOpenChange={setRoleFilterOpen}>
                <PopoverTrigger asChild>
                  <Button variant="outline" size="sm" className="flex items-center gap-2 h-9">
                    <Filter className="w-4 h-4" />
                    System Roles
                    {(selectedRoles?.length || 0) > 0 && (
                      <Badge variant="secondary" className="ml-1 h-5 text-xs">
                        {selectedRoles?.length || 0}
                      </Badge>
                    )}
                    <ChevronDown className="w-4 h-4" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-72" align="start">
                  <div className="space-y-3">
                    <h4 className="font-semibold text-sm">Filter by System Role</h4>
                    <div className="max-h-60 overflow-y-auto space-y-2 p-1">
                      {(Object.keys(roleLabels) as SystemRole[]).map(role => (
                        <div key={role} className="flex items-center space-x-3 group hover:bg-muted/30 rounded-md p-2 -m-2 transition-colors">
                          <Checkbox
                            id={`role-${role}`}
                            checked={selectedRoles?.includes(role) || false}
                            onCheckedChange={() => handleRoleToggle(role)}
                            className="border-border data-[state=checked]:bg-primary data-[state=checked]:border-primary"
                          />
                          <label 
                            htmlFor={`role-${role}`}
                            className="text-sm cursor-pointer flex-1 font-medium group-hover:text-primary transition-colors"
                          >
                            {roleLabels[role]}
                          </label>
                        </div>
                      ))}
                    </div>
                  </div>
                </PopoverContent>
              </Popover>
            )}

            {/* Sort Options */}
            <div className="flex items-center gap-3 ml-auto">
              <span className="text-sm font-medium text-muted-foreground">Sort by:</span>
              <Select value={sortBy} onValueChange={onSortByChange}>
                <SelectTrigger className="w-36 h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {getSortOptions().map(option => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              
              <Button
                variant="outline"
                size="sm"
                onClick={() => onSortOrderChange(sortOrder === "asc" ? "desc" : "asc")}
                className="h-9 w-9 p-0"
                title={`Sort ${sortOrder === "asc" ? "Descending" : "Ascending"}`}
              >
                {sortOrder === "asc" ? "↑" : "↓"}
              </Button>
            </div>

            {/* Clear Filters */}
            {activeFiltersCount > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onClearFilters}
                className="flex items-center gap-2 h-9 text-muted-foreground hover:text-foreground"
              >
                <X className="w-4 h-4" />
                Clear ({activeFiltersCount})
              </Button>
            )}
          </div>

          {/* Active Filter Chips */}
          {(selectedRanks.length > 0 || (selectedSchools?.length || 0) > 0 || (selectedRoles?.length || 0) > 0) && (
            <div className="flex flex-wrap gap-2 pt-2 border-t border-border/50">
              <span className="text-xs font-medium text-muted-foreground self-center">Active filters:</span>
              {selectedRanks.map(rankId => {
                const rank = ranks?.find(r => r._id === rankId)
                return rank ? (
                  <Badge 
                    key={rankId} 
                    variant="secondary" 
                    className="flex items-center gap-1.5 text-xs"
                  >
                    Rank: {rank.abbreviation}
                    <X 
                      className="w-3 h-3 cursor-pointer hover:text-destructive transition-colors" 
                      onClick={() => handleRankToggle(rankId)}
                    />
                  </Badge>
                ) : null
              })}
              
              {selectedSchools?.map(schoolId => {
                const school = schools?.find(s => s._id === schoolId)
                return school ? (
                  <Badge 
                    key={schoolId} 
                    variant="secondary" 
                    className="flex items-center gap-1.5 text-xs"
                  >
                    School: {school.name}
                    <X 
                      className="w-3 h-3 cursor-pointer hover:text-destructive transition-colors" 
                      onClick={() => handleSchoolToggle(schoolId)}
                    />
                  </Badge>
                ) : null
              })}

              {selectedRoles?.map(role => (
                <Badge 
                  key={role} 
                  variant="secondary" 
                  className="flex items-center gap-1.5 text-xs"
                >
                  Role: {roleLabels[role]}
                  <X 
                    className="w-3 h-3 cursor-pointer hover:text-destructive transition-colors" 
                    onClick={() => handleRoleToggle(role)}
                  />
                </Badge>
              ))}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
