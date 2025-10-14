"use client"

import { useState, useMemo } from "react"
import { useQuery, useMutation } from "convex/react"
import { useSession } from "next-auth/react"
import { api } from "../../../../convex/_generated/api"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
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
  DialogTrigger,
} from "@/components/ui/dialog"
import { 
  Tabs, 
  TabsContent, 
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Users, Plus, Radio, Award, Grid, List, MoreVertical, Edit, Eye, Trash2, Calendar, Mail, Phone, TrendingUp, Shield, UserPlus, UserMinus } from "lucide-react"
import { QualificationMatrix } from "@/components/dashboard/qualification-matrix"
import { PersonnelQualifications } from "@/components/dashboard/personnel-qualifications"
import { SearchFilterBar, FilterMode, SystemRole } from "@/components/dashboard/search-filter-bar"
import { ConfirmationDialog } from "@/components/common/confirmation-dialog"
import { EmptyState } from "@/components/common/empty-state"
import { LoadingState } from "@/components/common/loading-state"
import { useToast } from "@/hooks/use-toast"
import { SearchableSelect, SearchableSelectOption } from "@/components/ui/searchable-select"
import { Id } from "../../../../convex/_generated/dataModel"
import { getUserFriendlyError, getThemeAwareColor, getTextColor } from "@/lib/utils"
import { useTheme } from "@/providers/theme-provider"

type PersonnelFormMode = "add" | "edit" | null

type PersonnelWithQualifications = {
  _id: string
  callSign: string
  firstName?: string
  lastName?: string
  rankId?: string
  rank?: { name: string; abbreviation: string; order?: number } | null
  status: string
  joinDate?: number
  qualifications?: Array<{ name: string; abbreviation: string }>
  roles?: Array<{ name: string; displayName: string; color: string }>
  hasSystemAccess?: boolean
}

export default function PersonnelPage() {
  const { toast } = useToast()
  const { data: session } = useSession()
  const { theme } = useTheme()
  const isDarkMode = theme === 'dark'
  const [viewMode, setViewMode] = useState<"list" | "matrix">("list")
  const [selectedPersonnelId, setSelectedPersonnelId] = useState<string | null>(null)
  const [personnelDetailOpen, setPersonnelDetailOpen] = useState(false)
  const [personnelFormOpen, setPersonnelFormOpen] = useState(false)
  const [personnelFormMode, setPersonnelFormMode] = useState<PersonnelFormMode>(null)
  const [promoteDialogOpen, setPromoteDialogOpen] = useState(false)
  const [selectedRankId, setSelectedRankId] = useState<string>("")
  
  // Award Qualification state
  const [awardQualDialogOpen, setAwardQualDialogOpen] = useState(false)
  const [selectedQualificationId, setSelectedQualificationId] = useState<string>("")
  const [awardNotes, setAwardNotes] = useState("")
  const [isAwarding, setIsAwarding] = useState(false)
  
  // Confirmation dialog state
  const [removeQualConfirm, setRemoveQualConfirm] = useState<{
    personnelId: string
    qualificationId: string
    qualName: string
  } | null>(null)
  const [archivePersonnelConfirm, setArchivePersonnelConfirm] = useState<PersonnelWithQualifications | null>(null)
  
  // Form state
  const [formData, setFormData] = useState({
    callSign: "",
  })
  
  // Search and filter state
  const [searchTerm, setSearchTerm] = useState("")
  const [filterMode, setFilterMode] = useState<FilterMode>("callsign")
  const [selectedRanks, setSelectedRanks] = useState<string[]>([])
  const [selectedRoles, setSelectedRoles] = useState<SystemRole[]>([])
  const [sortBy, setSortBy] = useState("rank")
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc")

  // Check user permissions
  const canPromote = session?.user?.role === 'administrator' || session?.user?.role === 'super_admin'
  const canEditPersonnel = session?.user?.role !== 'game_master'
  const isInstructor = session?.user?.role === 'instructor'

  const personnel = useQuery(api.personnel.listPersonnelWithQualifications, { status: "active" })
  const ranks = useQuery(api.ranks.listRanks, {})
  const qualifications = useQuery(api.qualifications.listQualificationsWithCounts, {})
  const managedSchools = useQuery(
    api.schools.listManagedSchools,
    session?.user?.name && session?.user?.role
      ? { username: session.user.name, role: session.user.role as "administrator" | "instructor" | "game_master" | "super_admin" }
      : "skip"
  )
  const createPersonnel = useMutation(api.personnel.createPersonnel)
  const updatePersonnel = useMutation(api.personnel.updatePersonnel)
  const promotePersonnel = useMutation(api.personnel.promotePersonnel)
  const awardQualification = useMutation(api.personnel.awardQualification)
  const removeQualification = useMutation(api.personnel.removeQualification)
  const deletePersonnel = useMutation(api.personnel.deletePersonnel)

  // Filter and sort personnel
  const filteredPersonnel = useMemo(() => {
    if (!personnel || !qualifications) return []

    // Hide ANZAC Administrator system user
    let filtered = personnel.filter(person => person.callSign !== "ANZAC Administrator")

    // Search filter based on selected mode
    if (searchTerm) {
      const term = searchTerm.toLowerCase()
      filtered = filtered.filter(person => {
        switch (filterMode) {
          case "callsign":
            return person.callSign.toLowerCase().includes(term)
          
          case "rank":
            const rankName = person.rank?.name?.toLowerCase() || ""
            const rankAbbr = person.rank?.abbreviation?.toLowerCase() || ""
            return rankName.includes(term) || rankAbbr.includes(term)
          
          case "qualification":
            // Check if any of their qualifications match the search term
            return (person as PersonnelWithQualifications).qualifications?.some((qual) => 
              qual.name.toLowerCase().includes(term) || 
              qual.abbreviation.toLowerCase().includes(term)
            ) || false
          
          default:
            return true
        }
      })
    }

    // Rank filter
    if (selectedRanks.length > 0) {
      filtered = filtered.filter(person => person.rankId && selectedRanks.includes(person.rankId))
    }

    // Role filter
    if (selectedRoles.length > 0) {
      filtered = filtered.filter(person => {
        // Only show personnel that have system access AND have at least one of the selected roles
        if (!person.hasSystemAccess || !person.roles) return false
        return person.roles.some(role => selectedRoles.includes(role.name as SystemRole))
      })
    }

    // Sort
    filtered.sort((a, b) => {
      let aValue: string | number
      let bValue: string | number

      switch (sortBy) {
        case "rank":
          aValue = a.rank?.order ?? 999
          bValue = b.rank?.order ?? 999
          break
        case "callSign":
          aValue = a.callSign.toLowerCase()
          bValue = b.callSign.toLowerCase()
          break
        case "firstName":
          aValue = (a.firstName || "").toLowerCase()
          bValue = (b.firstName || "").toLowerCase()
          break
        case "lastName":
          aValue = (a.lastName || "").toLowerCase()
          bValue = (b.lastName || "").toLowerCase()
          break
        case "joinDate":
          aValue = a.joinDate
          bValue = b.joinDate
          break
        case "qualificationCount":
          aValue = (a as PersonnelWithQualifications).qualifications?.length || 0
          bValue = (b as PersonnelWithQualifications).qualifications?.length || 0
          break
        default:
          return 0
      }

      if (sortOrder === "asc") {
        return aValue < bValue ? -1 : aValue > bValue ? 1 : 0
      } else {
        return aValue > bValue ? -1 : aValue < bValue ? 1 : 0
      }
    })

    return filtered
  }, [personnel, qualifications, searchTerm, filterMode, selectedRanks, selectedRoles, sortBy, sortOrder])

  const handleClearFilters = () => {
    setSearchTerm("")
    setSelectedRanks([])
    setSelectedRoles([])
    setSortBy("rank")
    setSortOrder("asc")
  }

  const handlePersonnelSelect = (personnelId: string) => {
    setSelectedPersonnelId(personnelId)
    setPersonnelDetailOpen(true)
  }

  const handleAddPersonnel = () => {
    setFormData({
      callSign: "",
    })
    setPersonnelFormMode("add")
    setPersonnelFormOpen(true)
  }

  const handleEditPersonnel = (person: PersonnelWithQualifications) => {
    setFormData({
      callSign: person.callSign || "",
    })
    setSelectedPersonnelId(person._id)
    setPersonnelFormMode("edit")
    setPersonnelFormOpen(true)
  }

  const handleSubmitPersonnel = async () => {
    try {
      if (personnelFormMode === "add") {
        await createPersonnel({
          callSign: formData.callSign,
          status: "active",
          joinDate: Date.now(),
        })
        toast({
          title: "Success",
          description: "Personnel added successfully with Private rank",
        })
      } else if (personnelFormMode === "edit" && selectedPersonnelId) {
        await updatePersonnel({
          personnelId: selectedPersonnelId as Id<"personnel">,
          callSign: formData.callSign,
        })
        toast({
          title: "Success",
          variant: "success",
          description: "Personnel updated successfully",
        })
      }
      setPersonnelFormOpen(false)
      setPersonnelFormMode(null)
    } catch (error) {
      toast({
        title: "Error",
        description: getUserFriendlyError(error),
        variant: "destructive",
      })
    }
  }

  const handlePromotePersonnel = (person: PersonnelWithQualifications) => {
    setSelectedPersonnelId(person._id)
    setSelectedRankId(person.rankId || "")
    setPromoteDialogOpen(true)
  }

  const handleSubmitPromotion = async () => {
    if (!selectedPersonnelId || !selectedRankId) return

    try {
      await promotePersonnel({
        personnelId: selectedPersonnelId as Id<"personnel">,
        newRankId: selectedRankId as Id<"ranks">,
        promotionDate: Date.now(),
        notes: "Promoted via quick promotion",
      })
      toast({
        title: "Success",
        description: "Personnel promoted successfully",
      })
      setPromoteDialogOpen(false)
      setSelectedRankId("")
    } catch (error: unknown) {
      toast({
        title: "Error",
        description: getUserFriendlyError(error),
        variant: "destructive",
      })
    }
  }

  const handleOpenAwardQualDialog = (personnelId: string) => {
    setSelectedPersonnelId(personnelId)
    setSelectedQualificationId("")
    setAwardNotes("")
    setAwardQualDialogOpen(true)
  }
  
  const handleCloseAwardQualDialog = (open: boolean) => {
    setAwardQualDialogOpen(open)
    if (!open) {
      // Reset form when dialog closes
      setSelectedQualificationId("")
      setAwardNotes("")
    }
  }

  const handleAwardQualification = async () => {
    if (!selectedPersonnelId || !selectedQualificationId) {
      toast({
        title: "Validation Error",
        description: "Please select a qualification.",
        variant: "destructive",
      })
      return
    }

    setIsAwarding(true)

    try {
      const selectedQual = qualifications?.find(q => q._id === selectedQualificationId)

      await awardQualification({
        personnelId: selectedPersonnelId as Id<"personnel">,
        qualificationId: selectedQualificationId as Id<"qualifications">,
        awardedDate: Date.now(),
        notes: awardNotes.trim() || undefined,
      })

      toast({
        title: "Qualification Awarded",
        description: `${selectedQual?.name} has been awarded successfully.`,
      })

      // Reset form and close dialog
      setSelectedQualificationId("")
      setAwardNotes("")
      setAwardQualDialogOpen(false)
    } catch (error: unknown) {
      toast({
        title: "Error",
        description: getUserFriendlyError(error),
        variant: "destructive",
      })
    } finally {
      setIsAwarding(false)
    }
  }

  const handleRemoveQualification = (personnelId: string, qualificationId: string, qualName: string) => {
    setRemoveQualConfirm({ personnelId, qualificationId, qualName })
  }

  const confirmRemoveQualification = async () => {
    if (!removeQualConfirm) return

    try {
      await removeQualification({
        personnelId: removeQualConfirm.personnelId as Id<"personnel">,
        qualificationId: removeQualConfirm.qualificationId as Id<"qualifications">,
      })

      toast({
        title: "Qualification Removed",
        description: `${removeQualConfirm.qualName} has been removed successfully.`,
      })
    } catch (error: unknown) {
      toast({
        title: "Error",
        description: getUserFriendlyError(error),
        variant: "destructive",
      })
    }
  }

  const handleArchivePersonnel = (person: PersonnelWithQualifications) => {
    setArchivePersonnelConfirm(person)
  }

  const confirmArchivePersonnel = async () => {
    if (!archivePersonnelConfirm) return

    try {
      await deletePersonnel({
        personnelId: archivePersonnelConfirm._id as Id<"personnel">,
      })

      toast({
        title: "Personnel Archived",
        description: `${archivePersonnelConfirm.callSign} has been permanently removed from the system.`,
      })
    } catch (error: unknown) {
      toast({
        title: "Error",
        description: getUserFriendlyError(error),
        variant: "destructive",
      })
    }
  }

  const selectedPerson = useMemo(() => {
    if (!selectedPersonnelId || !personnel) return null
    return personnel.find(p => p._id === selectedPersonnelId)
  }, [selectedPersonnelId, personnel])

  // Prepare combobox options for qualifications (filtered by instructor's schools)
  const qualificationOptions: SearchableSelectOption[] = useMemo(() => {
    if (!qualifications) return []
    
    // For instructors, only show qualifications from their schools
    const filteredQuals = isInstructor && managedSchools
      ? qualifications.filter(qual => 
          managedSchools.some(school => school._id === qual.schoolId)
        )
      : qualifications
    
    return filteredQuals.map(qual => {
      const school = qual.school
      return {
        value: qual._id,
        label: `${qual.name} (${qual.abbreviation})`,
        group: school?.name || "Other"
      }
    })
  }, [qualifications, managedSchools, isInstructor])

  // Prepare combobox options for ranks
  const rankOptions: SearchableSelectOption[] = useMemo(() => {
    return ranks?.map(rank => ({
      value: rank._id,
      label: `${rank.abbreviation} - ${rank.name}`
    })) || []
  }, [ranks])

  return (
    <div className="space-y-6 md:space-y-8 relative pb-8">
      <div className="flex justify-between items-start md:items-center flex-col md:flex-row gap-4 animate-fade-in-down">
        <div className="space-y-1 relative">
          <div className="flex items-center gap-3">
            <h2 className="text-2xl md:text-3xl lg:text-4xl font-bold tracking-tight text-primary">
              Personnel
            </h2>
          </div>
          <p className="text-muted-foreground text-sm md:text-base lg:text-lg">
            Manage unit members and their <span className="text-military-blue">qualifications</span>
          </p>
        </div>
        
        <div className="flex items-center gap-2 flex-wrap w-full md:w-auto">
          {/* View Mode Toggle */}
          <div className="flex items-center border rounded-lg p-1">
            <Button
              variant={viewMode === "list" ? "default" : "ghost"}
              size="sm"
              onClick={() => setViewMode("list")}
              className="flex items-center gap-2"
            >
              <List className="w-4 h-4" />
              List
            </Button>
            <Button
              variant={viewMode === "matrix" ? "default" : "ghost"}
              size="sm"
              onClick={() => setViewMode("matrix")}
              className="flex items-center gap-2"
            >
              <Grid className="w-4 h-4" />
              Overview
            </Button>
          </div>
          
          {canEditPersonnel && (
            <Button variant="default" size="lg" onClick={handleAddPersonnel}>
              <Plus className="w-5 h-5 mr-2" />
              Add Personnel
            </Button>
          )}
        </div>
      </div>

      {/* Search and Filter Bar */}
      <div className="animate-fade-in opacity-0 animate-delay-100">
        <SearchFilterBar
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        filterMode={filterMode}
        onFilterModeChange={setFilterMode}
        selectedRanks={selectedRanks}
        onRanksChange={setSelectedRanks}
        selectedSchools={undefined}
        onSchoolsChange={undefined}
        selectedRoles={selectedRoles}
        onRolesChange={setSelectedRoles}
        sortBy={sortBy}
        onSortByChange={setSortBy}
        sortOrder={sortOrder}
        onSortOrderChange={setSortOrder}
        onClearFilters={handleClearFilters}
      />
      </div>

      {/* Content based on view mode */}
      <Tabs value={viewMode} onValueChange={(value: string) => setViewMode(value as "list" | "matrix")}>
        <TabsContent value="matrix" className="space-y-6 animate-fade-in-up opacity-0 animate-delay-200">
          <Card variant="depth">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-primary/20 backdrop-blur-sm">
                    <Award className="w-6 h-6 text-primary" />
                  </div>
                  <div>
                    <CardTitle className="text-xl text-primary">
                      Qualification Overview
                    </CardTitle>
                    <CardDescription className="mt-1">
                      Compact view of personnel qualifications by school
                    </CardDescription>
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {!personnel ? (
                <LoadingState icon={Award} message="Loading personnel..." />
              ) : filteredPersonnel.length === 0 ? (
                <EmptyState
                  icon={Award}
                  title="No personnel to display"
                  description="Adjust your filters to see more results"
                />
              ) : (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {filteredPersonnel.map((person, index) => (
                    <Card 
                      key={person._id}
                      className="cursor-pointer hover:shadow-lg transition-all duration-300 hover:border-primary/50"
                      onClick={() => handlePersonnelSelect(person._id)}
                    >
                      <CardHeader className="pb-3">
                        <div className="flex items-center gap-3">
                          <div className="flex-1 min-w-0">
                            <CardTitle className="text-lg truncate">
                              {person.rank?.abbreviation && `${person.rank.abbreviation} `}
                              {person.firstName || person.lastName 
                                ? `${person.firstName || ''} ${person.lastName || ''}`.trim()
                                : person.callSign}
                            </CardTitle>
                            <p className="text-xs text-muted-foreground truncate">
                              {person.callSign}
                            </p>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <PersonnelQualifications 
                          personnelId={person._id}
                          compact={false}
                        />
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="list" className="space-y-6">
          <Card variant="depth" className="animate-fade-in-up opacity-0 animate-delay-200">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/20 backdrop-blur-sm">
                  <Users className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <CardTitle className="text-xl text-primary">
                    Personnel List
                  </CardTitle>
                  <CardDescription className="mt-1">
                    {filteredPersonnel.length} active members of ANZAC 2nd Commandos
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {!personnel ? (
                <LoadingState icon={Users} message="Loading personnel..." />
              ) : filteredPersonnel.length === 0 ? (
                <EmptyState
                  icon={Users}
                  title={personnel.length === 0 ? "No personnel records found" : "No personnel match your filters"}
                  description={personnel.length === 0 ? "Add your first member to get started" : "Try adjusting your search or filters"}
                  action={personnel.length === 0 ? {
                    label: "Add First Member",
                    onClick: handleAddPersonnel,
                    icon: Plus
                  } : undefined}
                />
              ) : (
                <div className="space-y-3">
                  {filteredPersonnel.map((person, index) => (
                    <div
                      key={person._id}
                      className="group relative p-4 rounded-xl border border-border/50 bg-secondary/10 hover:border-primary/50 hover:bg-primary/5 transition-all duration-300 animate-in slide-in-from-bottom-2 fade-in cursor-pointer hover:shadow-md"
                      style={{ animationDelay: `${index * 50}ms` }}
                      onDoubleClick={() => handlePersonnelSelect(person._id)}
                    >
                      <div className="flex items-start justify-between gap-4">
                        {/* Left side - Info */}
                        <div className="flex items-start gap-4 flex-1 min-w-0">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <h3 className="font-semibold text-lg text-foreground">
                                {person.rank?.abbreviation && `${person.rank.abbreviation}. `}
                                {person.firstName || person.lastName 
                                  ? `${person.firstName || ''} ${person.lastName || ''}`.trim()
                                  : person.callSign}
                              </h3>
                            </div>
                            
                            <p className="text-sm text-muted-foreground mb-2">
                              {person.rank?.name || "No rank assigned"}
                            </p>
                            
                            {/* System Roles */}
                            {person.hasSystemAccess && person.roles && person.roles.length > 0 && (
                              <div className="flex flex-wrap gap-1 mb-2">
                                {person.roles.map((role) => {
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
                                      <Shield className="w-3 h-3" />
                                      {role.displayName}
                                    </Badge>
                                  )
                                })}
                              </div>
                            )}
                            
                            {/* Contact Info */}
                            <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
                              {person.joinDate && (
                                <div className="flex items-center gap-1">
                                  <Calendar className="w-3 h-3" />
                                  <span>Joined {new Date(person.joinDate).toLocaleDateString()}</span>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                        
                        {/* Right side - Stats and Actions */}
                        <div className="flex items-start gap-3">
                          <div className="text-right space-y-2">
                            <Badge variant="secondary" className="flex items-center gap-1">
                              <Award className="w-3 h-3" />
                              {(person as PersonnelWithQualifications).qualifications?.length || 0} Quals
                            </Badge>
                            <p className="text-xs text-muted-foreground capitalize flex items-center gap-1 justify-end">
                              <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
                              {person.status}
                            </p>
                          </div>
                          
                          {/* Action Menu */}
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button 
                                variant="ghost" 
                                size="sm"
                                className="h-8 w-8 p-0"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuLabel>Actions</DropdownMenuLabel>
                              <DropdownMenuItem onClick={() => handlePersonnelSelect(person._id)}>
                                <Eye className="w-4 h-4 mr-2" />
                                View Details
                              </DropdownMenuItem>
                              {canEditPersonnel && (
                                <DropdownMenuItem onClick={() => handleEditPersonnel(person)}>
                                  <Edit className="w-4 h-4 mr-2" />
                                  Edit
                                </DropdownMenuItem>
                              )}
                              {canPromote && (
                                <DropdownMenuItem onClick={() => handlePromotePersonnel(person)}>
                                  <TrendingUp className="w-4 h-4 mr-2" />
                                  Promote
                                </DropdownMenuItem>
                              )}
                              {canPromote && (
                                <>
                                  <DropdownMenuSeparator />
                                  {!person.hasSystemAccess && (
                                    <DropdownMenuItem onClick={() => console.log("Grant system access to", person.callSign)}>
                                      <UserPlus className="w-4 h-4 mr-2" />
                                      Grant System Access
                                    </DropdownMenuItem>
                                  )}
                                  {person.hasSystemAccess && !person.roles?.some(r => r.name === "super_admin") && (
                                    <DropdownMenuItem 
                                      className="text-amber-600"
                                      onClick={() => console.log("Revoke system access from", person.callSign)}
                                    >
                                      <UserMinus className="w-4 h-4 mr-2" />
                                      Revoke System Access
                                    </DropdownMenuItem>
                                  )}
                                  <DropdownMenuItem 
                                    className="text-destructive"
                                    onClick={() => handleArchivePersonnel(person)}
                                  >
                                    <Trash2 className="w-4 h-4 mr-2" />
                                    Archive
                                  </DropdownMenuItem>
                                </>
                              )}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Personnel Detail Modal */}
      <Dialog open={personnelDetailOpen} onOpenChange={(open) => {
        setPersonnelDetailOpen(open)
        if (!open) {
          setSelectedPersonnelId(null)
        }
      }}>
        <DialogContent className="max-w-4xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              Personnel Details
            </DialogTitle>
            <DialogDescription>
              View comprehensive personnel information and qualifications
            </DialogDescription>
          </DialogHeader>
          {selectedPerson && (
            <div className="space-y-6">
              {/* Personal Information Card */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Personal Information</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-start gap-6">
                    <div className="flex-1 grid grid-cols-2 gap-4">
                      <div>
                        <Label className="text-xs text-muted-foreground">Call Sign</Label>
                        <p className="font-medium">{selectedPerson.callSign}</p>
                      </div>
                      <div>
                        <Label className="text-xs text-muted-foreground">Rank</Label>
                        <p className="font-medium">
                          {selectedPerson.rank 
                            ? `${selectedPerson.rank.abbreviation} - ${selectedPerson.rank.name}`
                            : "No rank assigned"}
                        </p>
                      </div>
                      <div>
                        <Label className="text-xs text-muted-foreground">Status</Label>
                        <div className="flex items-center gap-1">
                          <span className="w-2 h-2 rounded-full bg-green-500"></span>
                          <p className="font-medium capitalize">{selectedPerson.status}</p>
                        </div>
                      </div>
                      {selectedPerson.hasSystemAccess && selectedPerson.roles && selectedPerson.roles.length > 0 && (
                        <div className="col-span-2">
                          <Label className="text-xs text-muted-foreground">System Roles</Label>
                          <div className="flex flex-wrap gap-1 mt-1">
                            {selectedPerson.roles.map((role) => {
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
                                  <Shield className="w-3 h-3" />
                                  {role.displayName}
                                </Badge>
                              )
                            })}
                          </div>
                        </div>
                      )}
                      {selectedPerson.email && (
                        <div>
                          <Label className="text-xs text-muted-foreground">Email</Label>
                          <p className="font-medium text-sm">{selectedPerson.email}</p>
                        </div>
                      )}
                      {selectedPerson.phone && (
                        <div>
                          <Label className="text-xs text-muted-foreground">Phone</Label>
                          <p className="font-medium">{selectedPerson.phone}</p>
                        </div>
                      )}
                      {selectedPerson.joinDate && (
                        <div>
                          <Label className="text-xs text-muted-foreground">Join Date</Label>
                          <p className="font-medium">{new Date(selectedPerson.joinDate).toLocaleDateString()}</p>
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Qualifications Section */}
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base flex items-center gap-2">
                      <Award className="w-4 h-4" />
                      Qualifications ({(selectedPerson as PersonnelWithQualifications)?.qualifications?.length || 0})
                    </CardTitle>
                    <div className="flex gap-2">
                      {(isInstructor || canPromote) && (
                        <Button 
                          variant="default" 
                          size="sm"
                          onClick={() => {
                            handleOpenAwardQualDialog(selectedPersonnelId!)
                          }}
                        >
                          <Award className="w-4 h-4 mr-2" />
                          Award Qualification
                        </Button>
                      )}
                      {canPromote && (
                        <Button 
                          variant="default" 
                          size="sm"
                          onClick={() => {
                            setPersonnelDetailOpen(false)
                            handlePromotePersonnel(selectedPerson)
                          }}
                        >
                          <TrendingUp className="w-4 h-4 mr-2" />
                          Promote
                        </Button>
                      )}
                      {canEditPersonnel && (
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => {
                            setPersonnelDetailOpen(false)
                            handleEditPersonnel(selectedPerson)
                          }}
                        >
                          <Edit className="w-4 h-4 mr-2" />
                          Edit Personnel
                        </Button>
                      )}
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <PersonnelQualifications 
                    personnelId={selectedPersonnelId!} 
                    compact={true}
                    onRemove={(qualificationId: string, qualName: string) => 
                      handleRemoveQualification(selectedPersonnelId!, qualificationId, qualName)
                    }
                  />
                </CardContent>
              </Card>

              {/* Quick Stats */}
              <div className="grid grid-cols-3 gap-4">
                <Card>
                  <CardContent className="pt-6">
                    <div className="text-center">
                      <Award className="w-8 h-8 mx-auto mb-2 text-primary" />
                      <p className="text-2xl font-bold text-primary">
                        {(selectedPerson as PersonnelWithQualifications)?.qualifications?.length || 0}
                      </p>
                      <p className="text-xs text-muted-foreground">Qualifications</p>
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-6">
                    <div className="text-center">
                      <Calendar className="w-8 h-8 mx-auto mb-2 text-primary" />
                      <p className="text-2xl font-bold text-primary">
                        {selectedPerson.joinDate 
                          ? Math.floor((Date.now() - selectedPerson.joinDate) / (1000 * 60 * 60 * 24 * 30))
                          : 0}
                      </p>
                      <p className="text-xs text-muted-foreground">Months Service</p>
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-6">
                    <div className="text-center">
                      <Users className="w-8 h-8 mx-auto mb-2 text-primary" />
                      <p className="text-lg font-bold text-primary">
                        {selectedPerson.rank?.abbreviation || "N/A"}
                      </p>
                      <p className="text-xs text-muted-foreground">Current Rank</p>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Add/Edit Personnel Form Modal */}
      <Dialog open={personnelFormOpen} onOpenChange={(open) => {
        setPersonnelFormOpen(open)
        if (!open) {
          setPersonnelFormMode(null)
        }
      }}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {personnelFormMode === "add" ? "Add New Personnel" : "Edit Personnel"}
            </DialogTitle>
            <DialogDescription>
              {personnelFormMode === "add" 
                ? "Enter the call sign for the new personnel member. They will automatically be assigned the Private rank." 
                : "Update the personnel member's call sign."}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="callSign">Call Sign (Username) *</Label>
              <Input
                id="callSign"
                value={formData.callSign}
                onChange={(e) => setFormData({ ...formData, callSign: e.target.value })}
                placeholder="ALPHA-1"
                className="mt-1"
              />
              <p className="text-sm text-muted-foreground mt-1">
                This will be the personnel&apos;s unique identifier and they will automatically be assigned the Private (PTE) rank.
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => {
                setPersonnelFormOpen(false)
                setPersonnelFormMode(null)
              }}
            >
              Cancel
            </Button>
            <Button 
              onClick={handleSubmitPersonnel}
              disabled={!formData.callSign}
            >
              {personnelFormMode === "add" ? "Add Personnel" : "Update Personnel"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Promote Personnel Dialog */}
      <Dialog open={promoteDialogOpen} onOpenChange={(open) => {
        setPromoteDialogOpen(open)
        if (!open) {
          setSelectedRankId("")
        }
      }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-primary" />
              Promote Personnel
            </DialogTitle>
            <DialogDescription>
              Select the new rank for {selectedPerson?.callSign}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {selectedPerson && (
              <div className="p-4 bg-secondary/10 rounded-lg border border-border hover:border-primary/20 transition-all duration-300">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center border border-primary/30">
                    <span className="text-base font-bold text-primary">
                      {selectedPerson.callSign.substring(0, 2).toUpperCase()}
                    </span>
                  </div>
                  <div>
                    <p className="font-semibold">{selectedPerson.callSign}</p>
                    <p className="text-sm text-muted-foreground">
                      Current Rank: {selectedPerson.rank?.abbreviation || "N/A"} - {selectedPerson.rank?.name || "No rank"}
                    </p>
                  </div>
                </div>
              </div>
            )}
            
            <div>
              <Label htmlFor="newRank">New Rank *</Label>
              <SearchableSelect
                id="newRank"
                options={rankOptions}
                value={selectedRankId}
                onValueChange={setSelectedRankId}
                placeholder="Select new rank"
                searchPlaceholder="Search ranks..."
                emptyMessage="No ranks found."
                className="mt-1"
              />
              <p className="text-sm text-muted-foreground mt-1">
                This will update the personnel&apos;s rank and record the promotion in their history.
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => {
                setPromoteDialogOpen(false)
                setSelectedRankId("")
              }}
            >
              Cancel
            </Button>
            <Button 
              onClick={handleSubmitPromotion}
              disabled={!selectedRankId || selectedRankId === selectedPerson?.rankId}
            >
              Promote
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Award Qualification Dialog */}
      <Dialog open={awardQualDialogOpen} onOpenChange={handleCloseAwardQualDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Award className="w-5 h-5 text-primary" />
              Award Qualification
            </DialogTitle>
            <DialogDescription>
              Award a qualification to {selectedPerson?.callSign} (will be dated today)
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {selectedPerson && (
              <div className="p-4 bg-secondary/10 rounded-lg border border-border hover:border-primary/20 transition-all duration-300">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center border border-primary/30">
                    <span className="text-base font-bold text-primary">
                      {selectedPerson.callSign.substring(0, 2).toUpperCase()}
                    </span>
                  </div>
                  <div>
                    <p className="font-semibold">{selectedPerson.callSign}</p>
                    <p className="text-sm text-muted-foreground">
                      {selectedPerson.rank?.abbreviation} - {selectedPerson.rank?.name}
                    </p>
                  </div>
                </div>
              </div>
            )}

            <div>
              <Label htmlFor="qual-select">Select Qualification *</Label>
              <SearchableSelect
                id="qual-select"
                options={qualificationOptions}
                value={selectedQualificationId}
                onValueChange={setSelectedQualificationId}
                placeholder="Choose a qualification"
                searchPlaceholder="Search qualifications..."
                emptyMessage="No qualifications found."
                disabled={isAwarding}
                className="mt-1"
              />
            </div>

            <div>
              <Label htmlFor="award-notes-personnel">Notes (Optional)</Label>
              <Input
                id="award-notes-personnel"
                placeholder="e.g., Completed at training event..."
                value={awardNotes}
                onChange={(e) => setAwardNotes(e.target.value)}
                disabled={isAwarding}
                className="mt-1"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setAwardQualDialogOpen(false)
                setSelectedQualificationId("")
              }}
              disabled={isAwarding}
            >
              Cancel
            </Button>
            <Button
              onClick={handleAwardQualification}
              disabled={isAwarding || !selectedQualificationId}
            >
              {isAwarding ? "Awarding..." : "Award Qualification"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Confirmation Dialogs */}
      <ConfirmationDialog
        open={removeQualConfirm !== null}
        onOpenChange={(open) => !open && setRemoveQualConfirm(null)}
        title="Remove Qualification"
        description={`Are you sure you want to remove the ${removeQualConfirm?.qualName} qualification? This action cannot be undone.`}
        actionText="Remove"
        onConfirm={confirmRemoveQualification}
      />

      <ConfirmationDialog
        open={archivePersonnelConfirm !== null}
        onOpenChange={(open) => !open && setArchivePersonnelConfirm(null)}
        title={`Archive ${archivePersonnelConfirm?.callSign}?`}
        description="This will permanently delete their record and all associated data (qualifications, rank history, etc.). This action cannot be undone."
        actionText="Archive"
        onConfirm={confirmArchivePersonnel}
      />
    </div>
  )
}

