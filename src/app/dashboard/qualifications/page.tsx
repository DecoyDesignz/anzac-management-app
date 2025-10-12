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
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table"
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Award, Users, Plus, Search, TrendingUp, CheckCircle, Clock, Edit, ChevronDown, ArrowUpDown, ArrowUp, ArrowDown } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { Id } from "../../../../convex/_generated/dataModel"

type QualificationWithSchool = {
  _id: string
  name: string
  abbreviation: string
  schoolId: string | Id<"schools">
  personnelCount?: number
}

type PersonnelWithQualification = {
  _id: string
  callSign: string
  firstName?: string
  lastName?: string
  rank?: { name: string; abbreviation: string } | null
  status: string
  qualificationDetails: {
    awardedDate: number
    awardedBy?: string
  }
}
import { SearchableSelect, SearchableSelectOption } from "@/components/ui/searchable-select"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import { 
  Tabs, 
  TabsContent, 
  TabsList, 
  TabsTrigger 
} from "@/components/ui/tabs"

export default function QualificationsPage() {
  const { toast } = useToast()
  const { data: session } = useSession()
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedSchool, setSelectedSchool] = useState<string>("all")
  const [awardModalOpen, setAwardModalOpen] = useState(false)
  const [addQualificationOpen, setAddQualificationOpen] = useState(false)
  const [openSchools, setOpenSchools] = useState<Record<string, boolean>>({})
  const [sortBy, setSortBy] = useState<"name" | "abbreviation" | "school" | "personnelCount">("name")
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc")
  
  // Add Qualification form state
  const [newQualName, setNewQualName] = useState("")
  const [newQualAbbr, setNewQualAbbr] = useState("")
  const [newQualSchoolId, setNewQualSchoolId] = useState<Id<"schools"> | "">("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  
  // Edit Qualification state
  const [editQualificationOpen, setEditQualificationOpen] = useState(false)
  const [editingQual, setEditingQual] = useState<{
    _id: Id<"qualifications">
    name: string
    abbreviation: string
    schoolId: Id<"schools">
  } | null>(null)
  const [editQualName, setEditQualName] = useState("")
  const [editQualAbbr, setEditQualAbbr] = useState("")
  const [editQualSchoolId, setEditQualSchoolId] = useState<Id<"schools"> | "">("")
  const [isEditSubmitting, setIsEditSubmitting] = useState(false)
  
  // View Personnel state
  const [viewPersonnelOpen, setViewPersonnelOpen] = useState(false)
  const [viewingQualificationId, setViewingQualificationId] = useState<Id<"qualifications"> | null>(null)
  
  // Award Qualification state
  const [selectedQualificationId, setSelectedQualificationId] = useState<Id<"qualifications"> | "">("")
  const [selectedPersonnelId, setSelectedPersonnelId] = useState<Id<"personnel"> | "">("")
  const [awardNotes, setAwardNotes] = useState("")
  const [isAwarding, setIsAwarding] = useState(false)
  
  // Check if user can add/edit qualifications (all roles except game_master)
  const canManageQualifications = session?.user?.role !== 'game_master'
  const isInstructor = session?.user?.role === 'instructor'

  // Fetch data
  const qualifications = useQuery(api.qualifications.listQualificationsWithCounts, {})
  const schools = useQuery(api.schools.listSchools, {})
  const managedSchools = useQuery(
    api.schools.listManagedSchools,
    session?.user?.name && session?.user?.role
      ? { username: session.user.name, role: session.user.role as "administrator" | "instructor" | "game_master" | "super_admin" }
      : "skip"
  )
  const personnel = useQuery(api.personnel.listPersonnel, { status: "active" })
  const personnelWithQualification = useQuery(
    api.qualifications.getPersonnelWithQualification,
    viewingQualificationId ? { qualificationId: viewingQualificationId } : "skip"
  )
  
  // Mutations
  const createQualification = useMutation(api.qualifications.createQualification)
  const updateQualification = useMutation(api.qualifications.updateQualification)
  const awardQualification = useMutation(api.personnel.awardQualification)
  
  // Handler for toggling school collapsible
  const toggleSchool = (schoolId: string) => {
    setOpenSchools(prev => ({
      ...prev,
      [schoolId]: !prev[schoolId]
    }))
  }
  
  // Handler for opening view dialog
  const handleOpenViewDialog = (qualificationId: Id<"qualifications">) => {
    setViewingQualificationId(qualificationId)
    setViewPersonnelOpen(true)
  }
  
  // Handler for opening edit dialog
  const handleOpenEditDialog = (qual: QualificationWithSchool) => {
    setEditingQual({
      _id: qual._id as Id<"qualifications">,
      name: qual.name,
      abbreviation: qual.abbreviation,
      schoolId: qual.schoolId as Id<"schools">
    })
    setEditQualName(qual.name)
    setEditQualAbbr(qual.abbreviation)
    setEditQualSchoolId(qual.schoolId as Id<"schools">)
    setEditQualificationOpen(true)
  }
  
  // Handler for updating a qualification
  const handleUpdateQualification = async () => {
    if (!editingQual || !editQualName.trim() || !editQualAbbr.trim() || !editQualSchoolId) {
      toast({
        title: "Validation Error",
        description: "Please fill in all required fields.",
        variant: "destructive",
      })
      return
    }
    
    setIsEditSubmitting(true)
    
    try {
      await updateQualification({
        qualificationId: editingQual._id,
        name: editQualName.trim(),
        abbreviation: editQualAbbr.trim(),
        schoolId: editQualSchoolId as Id<"schools">,
      })
      
      toast({
        title: "Qualification Updated",
        description: `${editQualName} has been successfully updated.`,
      })
      
      // Reset form and close dialog
      setEditingQual(null)
      setEditQualName("")
      setEditQualAbbr("")
      setEditQualSchoolId("")
      setEditQualificationOpen(false)
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to update qualification.",
        variant: "destructive",
      })
    } finally {
      setIsEditSubmitting(false)
    }
  }
  
  // Handler for creating a qualification
  const handleCreateQualification = async () => {
    if (!newQualName.trim() || !newQualAbbr.trim() || !newQualSchoolId) {
      toast({
        title: "Validation Error",
        description: "Please fill in all required fields.",
        variant: "destructive",
      })
      return
    }
    
    setIsSubmitting(true)
    
    try {
      await createQualification({
        name: newQualName.trim(),
        abbreviation: newQualAbbr.trim(),
        schoolId: newQualSchoolId as Id<"schools">,
      })
      
      toast({
        title: "Qualification Created",
        description: `${newQualName} has been successfully created.`,
      })
      
      // Reset form and close dialog
      setNewQualName("")
      setNewQualAbbr("")
      setNewQualSchoolId("")
      setAddQualificationOpen(false)
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to create qualification.",
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }
  
  // Handler for awarding a qualification
  const handleAwardQualification = async () => {
    if (!selectedQualificationId || !selectedPersonnelId) {
      toast({
        title: "Validation Error",
        description: "Please select both a qualification and personnel member.",
        variant: "destructive",
      })
      return
    }
    
    setIsAwarding(true)
    
    try {
      const selectedPerson = personnel?.find(p => p._id === selectedPersonnelId)
      const selectedQual = qualifications?.find(q => q._id === selectedQualificationId)
      
      await awardQualification({
        personnelId: selectedPersonnelId as Id<"personnel">,
        qualificationId: selectedQualificationId as Id<"qualifications">,
        awardedDate: Date.now(),
        notes: awardNotes.trim() || undefined,
      })
      
      toast({
        title: "Qualification Awarded",
        description: `${selectedQual?.name} has been awarded to ${selectedPerson?.callSign}.`,
      })
      
      // Reset form and close dialog
      setSelectedQualificationId("")
      setSelectedPersonnelId("")
      setAwardNotes("")
      setAwardModalOpen(false)
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to award qualification.",
        variant: "destructive",
      })
    } finally {
      setIsAwarding(false)
    }
  }
  
  // Handler for opening award dialog
  const handleOpenAwardDialog = () => {
    setSelectedQualificationId("")
    setSelectedPersonnelId("")
    setAwardNotes("")
    setAwardModalOpen(true)
  }
  
  // Handler for closing award dialog
  const handleCloseAwardDialog = (open: boolean) => {
    setAwardModalOpen(open)
    if (!open) {
      // Reset form when dialog closes
      setSelectedQualificationId("")
      setSelectedPersonnelId("")
      setAwardNotes("")
    }
  }

  // Filter and sort qualifications
  const filteredQualifications = useMemo(() => {
    const filtered = qualifications?.filter(qual => {
      const matchesSearch = qual.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           qual.abbreviation.toLowerCase().includes(searchTerm.toLowerCase())
      const matchesSchool = selectedSchool === "all" || qual.schoolId === selectedSchool
      return matchesSearch && matchesSchool
    }) || []

    // Sort qualifications
    filtered.sort((a, b) => {
      let aValue: string | number
      let bValue: string | number

      switch (sortBy) {
        case "name":
          aValue = a.name.toLowerCase()
          bValue = b.name.toLowerCase()
          break
        case "abbreviation":
          aValue = a.abbreviation.toLowerCase()
          bValue = b.abbreviation.toLowerCase()
          break
        case "school":
          const aSchool = schools?.find(s => s._id === a.schoolId)
          const bSchool = schools?.find(s => s._id === b.schoolId)
          aValue = aSchool?.name.toLowerCase() || ""
          bValue = bSchool?.name.toLowerCase() || ""
          break
        case "personnelCount":
          aValue = a.personnelCount || 0
          bValue = b.personnelCount || 0
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
  }, [qualifications, searchTerm, selectedSchool, sortBy, sortOrder, schools])

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
      const school = schools?.find(s => s._id === qual.schoolId)
      return {
        value: qual._id,
        label: `${qual.name} (${qual.abbreviation})`,
        group: school?.name || "Other"
      }
    })
  }, [qualifications, schools, managedSchools, isInstructor])

  // Prepare combobox options for personnel
  const personnelOptions: SearchableSelectOption[] = useMemo(() => {
    return personnel?.map(person => ({
      value: person._id,
      label: `${person.rank?.abbreviation ? `${person.rank.abbreviation}. ` : ''}${
        person.firstName || person.lastName 
          ? `${person.firstName || ''} ${person.lastName || ''}`.trim()
          : person.callSign
      }${person.callSign && (person.firstName || person.lastName) ? ` (${person.callSign})` : ''}`
    })) || []
  }, [personnel])

  // Prepare combobox options for schools (only managed schools for instructors)
  const schoolOptions: SearchableSelectOption[] = useMemo(() => {
    const schoolsToShow = isInstructor ? managedSchools : schools
    return schoolsToShow?.map(school => ({
      value: school._id,
      label: school.name
    })) || []
  }, [schools, managedSchools, isInstructor])
  
  // Check if a qualification can be managed by current user
  const canManageQualification = (qualificationSchoolId: Id<"schools">) => {
    if (!canManageQualifications) return false
    if (!isInstructor) return true // Admins can manage all
    return managedSchools?.some(school => school._id === qualificationSchoolId) || false
  }

  // Handle sort column click
  const handleSort = (column: "name" | "abbreviation" | "school" | "personnelCount") => {
    if (sortBy === column) {
      // Toggle order if same column
      setSortOrder(sortOrder === "asc" ? "desc" : "asc")
    } else {
      // Set new column and default to ascending
      setSortBy(column)
      setSortOrder("asc")
    }
  }

  // Render sort icon
  const SortIcon = ({ column }: { column: "name" | "abbreviation" | "school" | "personnelCount" }) => {
    if (sortBy !== column) {
      return <ArrowUpDown className="w-4 h-4 ml-1 opacity-50" />
    }
    return sortOrder === "asc" ? (
      <ArrowUp className="w-4 h-4 ml-1" />
    ) : (
      <ArrowDown className="w-4 h-4 ml-1" />
    )
  }

  // Group qualifications by school
  const qualificationsBySchool = schools?.reduce((acc, school) => {
    const schoolQuals = filteredQualifications.filter(q => q.schoolId === school._id)
    acc[school._id] = {
      school,
      qualifications: schoolQuals,
      totalAwarded: schoolQuals.reduce((sum, qual) => sum + (qual.personnelCount || 0), 0)
    }
    return acc
  }, {} as Record<string, { school: { _id: string; name: string; abbreviation: string }; qualifications: Array<{ _id: string; name: string; abbreviation: string; schoolId: string; personnelCount?: number }>; totalAwarded: number }>) || {}

  const totalQualifications = qualifications?.length || 0
  const totalAwarded = qualifications?.reduce((sum, qual) => sum + (qual.personnelCount || 0), 0) || 0
  const averagePerPerson = personnel?.length ? Math.round(totalAwarded / personnel.length) : 0

  const getSchoolColor = (schoolName: string) => {
    const colors = {
      "Infantry": "bg-yellow-500/20 border-yellow-500/30 text-yellow-700 dark:text-yellow-300",
      "Engineers": "bg-orange-500/20 border-orange-500/30 text-orange-700 dark:text-orange-300",
      "Armour": "bg-blue-500/20 border-blue-500/30 text-blue-700 dark:text-blue-300",
      "Artillery": "bg-cyan-500/20 border-cyan-500/30 text-cyan-700 dark:text-cyan-300",
      "Aviation": "bg-green-500/20 border-green-500/30 text-green-700 dark:text-green-300",
      "Command": "bg-purple-500/20 border-purple-500/30 text-purple-700 dark:text-purple-300",
    }
    return colors[schoolName as keyof typeof colors] || "bg-gray-500/20 border-gray-500/30"
  }

  return (
    <div className="space-y-6 md:space-y-8 relative pb-8">
      <div className="flex justify-between items-start md:items-center flex-col md:flex-row gap-4 animate-fade-in-down">
        <div className="space-y-1 relative">
          <div className="flex items-center gap-2 md:gap-3 flex-wrap">
            <h2 className="text-2xl md:text-3xl lg:text-4xl font-bold tracking-tight text-primary">
              Qualifications
            </h2>
            {/* Status indicator */}
            <div className="glass-subtle px-2 py-1 rounded-lg border border-green-500/30">
              <div className="flex items-center gap-1">
                <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
                <span className="text-xs text-green-400">{totalQualifications} Available</span>
              </div>
            </div>
          </div>
          <p className="text-muted-foreground text-sm md:text-base lg:text-lg">
            Manage and track personnel qualifications across all schools
          </p>
          {/* Decorative accent bar */}
          <div className="absolute -bottom-2 left-0 w-16 md:w-24 h-0.5 bg-primary rounded-full"></div>
        </div>
        
        <div className="flex items-center gap-2 flex-wrap w-full md:w-auto">
          {canManageQualifications && (
            <>
              <Button 
                variant="outline" 
                size="lg" 
                className="flex items-center gap-2"
                onClick={handleOpenAwardDialog}
              >
                <Award className="w-5 h-5" />
                Award Qualification
              </Button>
              
              <Dialog open={awardModalOpen} onOpenChange={handleCloseAwardDialog}>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Award Qualification</DialogTitle>
                <DialogDescription>
                  Award a qualification to a personnel member (will be dated today)
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="select-qualification">Select Qualification *</Label>
                  <SearchableSelect
                    id="select-qualification"
                    options={qualificationOptions}
                    value={selectedQualificationId as string}
                    onValueChange={(value) => setSelectedQualificationId(value as Id<"qualifications">)}
                    placeholder="Choose a qualification"
                    searchPlaceholder="Search qualifications..."
                    emptyMessage="No qualifications found."
                    disabled={isAwarding}
                    className="mt-1"
                  />
                </div>
                
                <div>
                  <Label htmlFor="select-personnel">Select Personnel *</Label>
                  <SearchableSelect
                    id="select-personnel"
                    options={personnelOptions}
                    value={selectedPersonnelId as string}
                    onValueChange={(value) => setSelectedPersonnelId(value as Id<"personnel">)}
                    placeholder="Choose personnel"
                    searchPlaceholder="Search personnel..."
                    emptyMessage="No personnel found."
                    disabled={isAwarding}
                    className="mt-1"
                  />
                </div>

                <div>
                  <Label htmlFor="award-notes">Notes (Optional)</Label>
                  <Input
                    id="award-notes"
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
                  onClick={() => setAwardModalOpen(false)}
                  disabled={isAwarding}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleAwardQualification}
                  disabled={isAwarding || !selectedQualificationId || !selectedPersonnelId}
                >
                  {isAwarding ? "Awarding..." : "Award Qualification"}
                </Button>
              </DialogFooter>
            </DialogContent>
              </Dialog>
            </>
          )}
          
          {canManageQualifications && (
            <Dialog open={addQualificationOpen} onOpenChange={(open) => {
              setAddQualificationOpen(open)
              if (!open) {
                setNewQualName("")
                setNewQualAbbr("")
                setNewQualSchoolId("")
              }
            }}>
              <DialogTrigger asChild>
                <Button variant="default" size="lg">
                  <Plus className="w-5 h-5 mr-2" />
                  Add Qualification
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Add New Qualification</DialogTitle>
                  <DialogDescription>
                    Create a new qualification and assign it to a school
                  </DialogDescription>
                </DialogHeader>
                {schoolOptions.length === 0 ? (
                  <div className="py-8 text-center">
                    <p className="text-muted-foreground">
                      {isInstructor 
                        ? "You are not assigned to any schools. Please contact an administrator to assign you to schools."
                        : "No schools available. Please create a school first."}
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="qual-name">Qualification Name *</Label>
                      <Input
                        id="qual-name"
                        placeholder="e.g., Basic Infantry Training"
                        value={newQualName}
                        onChange={(e) => setNewQualName(e.target.value)}
                        disabled={isSubmitting}
                      />
                    </div>
                    
                    <div>
                      <Label htmlFor="qual-abbr">Abbreviation *</Label>
                      <Input
                        id="qual-abbr"
                        placeholder="e.g., BIT"
                        value={newQualAbbr}
                        onChange={(e) => setNewQualAbbr(e.target.value)}
                        disabled={isSubmitting}
                      />
                    </div>
                    
                    <div>
                      <Label htmlFor="qual-school">School *</Label>
                      <SearchableSelect
                        id="qual-school"
                        options={schoolOptions}
                        value={newQualSchoolId as string}
                        onValueChange={(value) => setNewQualSchoolId(value as Id<"schools">)}
                        placeholder="Select a school"
                        searchPlaceholder="Search schools..."
                        emptyMessage="No schools found."
                        disabled={isSubmitting}
                        className="mt-1"
                      />
                    </div>
                  </div>
                )}
                <DialogFooter>
                  <Button
                    variant="outline"
                    onClick={() => setAddQualificationOpen(false)}
                    disabled={isSubmitting}
                  >
                    Cancel
                  </Button>
                  {schoolOptions.length > 0 && (
                    <Button
                      onClick={handleCreateQualification}
                      disabled={isSubmitting}
                    >
                      {isSubmitting ? "Creating..." : "Create Qualification"}
                    </Button>
                  )}
                </DialogFooter>
              </DialogContent>
            </Dialog>
          )}
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card variant="depth" className="animate-scale-in opacity-0 animate-delay-100">
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2">
              <Award className="w-4 h-4 text-primary" />
              <CardTitle className="text-sm font-medium text-foreground">Total Qualifications</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-primary">{totalQualifications}</p>
            <p className="text-xs text-muted-foreground">Across all schools</p>
          </CardContent>
        </Card>

        <Card variant="depth" className="animate-scale-in opacity-0 animate-delay-200">
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-green-500" />
              <CardTitle className="text-sm font-medium text-foreground">Awarded</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-green-500">{totalAwarded}</p>
            <p className="text-xs text-muted-foreground">Total awarded</p>
          </CardContent>
        </Card>

        <Card variant="depth" className="animate-scale-in opacity-0 animate-delay-300">
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-blue-500" />
              <CardTitle className="text-sm font-medium text-foreground">Average per Person</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-blue-500">{averagePerPerson}</p>
            <p className="text-xs text-muted-foreground">Qualifications per personnel</p>
          </CardContent>
        </Card>

        <Card variant="depth" className="animate-scale-in opacity-0 animate-delay-400">
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-orange-500" />
              <CardTitle className="text-sm font-medium text-foreground">Completion Rate</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-orange-500">
              {personnel?.length ? Math.round((totalAwarded / (totalQualifications * personnel.length)) * 100) : 0}%
            </p>
            <p className="text-xs text-muted-foreground">Overall completion</p>
          </CardContent>
        </Card>
      </div>

      {/* Search and Filter */}
      <Card variant="depth" className="animate-fade-in opacity-0 animate-delay-500">
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                <Input
                  placeholder="Search qualifications..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            
            <SearchableSelect
              options={[
                { value: "all", label: "All Schools" },
                ...schoolOptions
              ]}
              value={selectedSchool}
              onValueChange={setSelectedSchool}
              placeholder="Filter by school"
              searchPlaceholder="Search schools..."
              emptyMessage="No schools found."
              className="w-full sm:w-48"
            />
          </div>
        </CardContent>
      </Card>

      {/* Qualifications View Toggle */}
      <Tabs defaultValue="by-school" className="space-y-6">
        <TabsList className="grid w-full max-w-md mx-auto grid-cols-2">
          <TabsTrigger value="by-school">By School</TabsTrigger>
          <TabsTrigger value="all">All Qualifications</TabsTrigger>
        </TabsList>

        {/* Qualifications by School */}
        <TabsContent value="by-school" className="space-y-4">
          {Object.values(qualificationsBySchool)
            .filter(({ qualifications }) => qualifications.length > 0)
            .map(({ school, qualifications, totalAwarded }) => (
          <Collapsible
            key={school._id}
            open={openSchools[school._id]}
            onOpenChange={() => toggleSchool(school._id)}
          >
            <Card variant="depth">
              <CollapsibleTrigger asChild>
                <CardHeader className="cursor-pointer hover:bg-muted/10 transition-colors">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-primary/20 backdrop-blur-sm">
                        <Award className="w-6 h-6 text-primary" />
                      </div>
                      <div>
                        <CardTitle className="text-xl text-primary">
                          {school.name}
                        </CardTitle>
                        <CardDescription className="text-sm">
                          {qualifications.length} qualifications • {totalAwarded} total awarded
                        </CardDescription>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary" className="flex items-center gap-1">
                        <Users className="w-3 h-3" />
                        {totalAwarded}
                      </Badge>
                      <ChevronDown 
                        className={`w-5 h-5 text-muted-foreground transition-transform duration-200 ${
                          openSchools[school._id] ? 'transform rotate-180' : ''
                        }`}
                      />
                    </div>
                  </div>
                </CardHeader>
              </CollapsibleTrigger>
              
              <CollapsibleContent>
                <CardContent>
                  {qualifications.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      No qualifications found for this school
                    </div>
                  ) : (
                    <>
                      {/* Desktop Table View */}
                      <div className="hidden lg:block overflow-x-auto -mx-6 px-6">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>
                                <button
                                  onClick={() => handleSort("name")}
                                  className="flex items-center hover:text-primary transition-colors font-semibold"
                                >
                                  Qualification
                                  <SortIcon column="name" />
                                </button>
                              </TableHead>
                              <TableHead>
                                <button
                                  onClick={() => handleSort("abbreviation")}
                                  className="flex items-center hover:text-primary transition-colors font-semibold"
                                >
                                  Abbreviation
                                  <SortIcon column="abbreviation" />
                                </button>
                              </TableHead>
                              <TableHead>
                                <button
                                  onClick={() => handleSort("personnelCount")}
                                  className="flex items-center hover:text-primary transition-colors font-semibold"
                                >
                                  Personnel Count
                                  <SortIcon column="personnelCount" />
                                </button>
                              </TableHead>
                              <TableHead>Actions</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {qualifications.map((qual) => (
                              <TableRow key={qual._id}>
                                <TableCell>
                                  <div className="font-medium">{qual.name}</div>
                                </TableCell>
                                <TableCell>
                                  <Badge variant="outline">{qual.abbreviation}</Badge>
                                </TableCell>
                                <TableCell>
                                  <div className="flex items-center gap-2">
                                    <Users className="w-4 h-4 text-muted-foreground" />
                                    <span className="font-medium">{qual.personnelCount || 0}</span>
                                    <span className="text-sm text-muted-foreground">personnel</span>
                                  </div>
                                </TableCell>
                                <TableCell>
                                  <div className="flex gap-2">
                                    <Button 
                                      variant="outline" 
                                      size="sm"
                                      onClick={() => handleOpenViewDialog(qual._id as Id<"qualifications">)}
                                    >
                                      <Users className="w-4 h-4 mr-1" />
                                      View
                                    </Button>
                                    {canManageQualification(qual.schoolId as Id<"schools">) && (
                                      <Button 
                                        variant="outline" 
                                        size="sm"
                                        onClick={() => handleOpenEditDialog(qual)}
                                      >
                                        <Edit className="w-4 h-4 mr-1" />
                                        Edit
                                      </Button>
                                    )}
                                  </div>
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>

                      {/* Mobile Card View */}
                      <div className="lg:hidden space-y-3">
                        {qualifications.map((qual) => (
                          <Card key={qual._id} variant="depth" className="p-4">
                            <div className="space-y-3">
                              {/* Qualification Header */}
                              <div className="flex items-start justify-between">
                                <div className="flex-1">
                                  <div className="font-semibold text-lg">{qual.name}</div>
                                  <Badge variant="outline" className="mt-1">
                                    {qual.abbreviation}
                                  </Badge>
                                </div>
                                <div className="flex gap-1">
                                  <Button 
                                    variant="outline" 
                                    size="sm"
                                    onClick={() => handleOpenViewDialog(qual._id as Id<"qualifications">)}
                                  >
                                    <Users className="w-4 h-4" />
                                  </Button>
                                  {canManageQualification(qual.schoolId as Id<"schools">) && (
                                    <Button 
                                      variant="outline" 
                                      size="sm"
                                      onClick={() => handleOpenEditDialog(qual)}
                                    >
                                      <Edit className="w-4 h-4" />
                                    </Button>
                                  )}
                                </div>
                              </div>

                              {/* Personnel Count */}
                              <div className="flex items-center gap-2 pt-2 border-t">
                                <Users className="w-4 h-4 text-muted-foreground" />
                                <span className="font-medium">{qual.personnelCount || 0}</span>
                                <span className="text-sm text-muted-foreground">personnel</span>
                              </div>
                            </div>
                          </Card>
                        ))}
                      </div>
                    </>
                  )}
                </CardContent>
              </CollapsibleContent>
            </Card>
          </Collapsible>
        ))}
          
          {Object.values(qualificationsBySchool).filter(({ qualifications }) => qualifications.length > 0).length === 0 && (
            <Card variant="depth">
              <CardContent className="py-12">
                <div className="text-center text-muted-foreground">
                  <Award className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p className="text-lg font-medium">No qualifications found</p>
                  <p className="text-sm mt-2">Try adjusting your search or filter criteria</p>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* All Qualifications Table */}
        <TabsContent value="all">
          <Card variant="depth">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/20 backdrop-blur-sm">
              <Award className="w-6 h-6 text-primary" />
            </div>
            <div>
              <CardTitle className="text-xl text-primary">
                All Qualifications
              </CardTitle>
              <CardDescription className="mt-1">
                Complete list of all qualifications and their statistics
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {/* Desktop Table View */}
          <div className="hidden lg:block overflow-x-auto -mx-6 px-6">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>
                    <button
                      onClick={() => handleSort("name")}
                      className="flex items-center hover:text-primary transition-colors font-semibold"
                    >
                      Qualification
                      <SortIcon column="name" />
                    </button>
                  </TableHead>
                  <TableHead>
                    <button
                      onClick={() => handleSort("school")}
                      className="flex items-center hover:text-primary transition-colors font-semibold"
                    >
                      School
                      <SortIcon column="school" />
                    </button>
                  </TableHead>
                  <TableHead>
                    <button
                      onClick={() => handleSort("abbreviation")}
                      className="flex items-center hover:text-primary transition-colors font-semibold"
                    >
                      Abbreviation
                      <SortIcon column="abbreviation" />
                    </button>
                  </TableHead>
                  <TableHead>
                    <button
                      onClick={() => handleSort("personnelCount")}
                      className="flex items-center hover:text-primary transition-colors font-semibold"
                    >
                      Personnel Count
                      <SortIcon column="personnelCount" />
                    </button>
                  </TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredQualifications.map((qual) => {
                  const school = schools?.find(s => s._id === qual.schoolId)
                  return (
                    <TableRow key={qual._id}>
                      <TableCell>
                        <div className="font-medium">{qual.name}</div>
                      </TableCell>
                      <TableCell>
                        <Badge className="bg-gray-700 text-white">
                          {school?.name}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{qual.abbreviation}</Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Users className="w-4 h-4 text-muted-foreground" />
                          <span className="font-medium">{qual.personnelCount || 0}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => handleOpenViewDialog(qual._id)}
                          >
                            <Users className="w-4 h-4 mr-1" />
                            View
                          </Button>
                          {canManageQualification(qual.schoolId as Id<"schools">) && (
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => handleOpenEditDialog(qual)}
                            >
                              <Edit className="w-4 h-4 mr-1" />
                              Edit
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </div>

          {/* Mobile Card View */}
          <div className="lg:hidden space-y-3">
            {filteredQualifications.map((qual) => {
              const school = schools?.find(s => s._id === qual.schoolId)
              return (
                <Card key={qual._id} variant="depth" className="p-4">
                  <div className="space-y-3">
                    {/* Qualification Header */}
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="font-semibold text-lg">{qual.name}</div>
                        <div className="flex gap-2 mt-2">
                          <Badge className="bg-gray-700 text-white text-xs">
                            {school?.name}
                          </Badge>
                          <Badge variant="outline" className="text-xs">
                            {qual.abbreviation}
                          </Badge>
                        </div>
                      </div>
                      <div className="flex gap-1">
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => handleOpenViewDialog(qual._id)}
                        >
                          <Users className="w-4 h-4" />
                        </Button>
                        {canManageQualification(qual.schoolId as Id<"schools">) && (
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => handleOpenEditDialog(qual)}
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                        )}
                      </div>
                    </div>

                    {/* Personnel Count */}
                    <div className="flex items-center gap-2 pt-2 border-t">
                      <Users className="w-4 h-4 text-muted-foreground" />
                      <span className="font-medium">{qual.personnelCount || 0}</span>
                      <span className="text-sm text-muted-foreground">personnel</span>
                    </div>
                  </div>
                </Card>
              )
            })}
          </div>
          
          {filteredQualifications.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              No qualifications match your search criteria
            </div>
          )}
        </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* View Personnel Dialog */}
      <Dialog open={viewPersonnelOpen} onOpenChange={(open) => {
        setViewPersonnelOpen(open)
        if (!open) {
          setViewingQualificationId(null)
        }
      }}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Personnel with {personnelWithQualification?.qualification?.name}</DialogTitle>
            <DialogDescription>
              View all personnel who have been awarded this qualification
            </DialogDescription>
          </DialogHeader>
          
          {!personnelWithQualification ? (
            <div className="py-8 text-center text-muted-foreground">
              Loading...
            </div>
          ) : personnelWithQualification.personnel.length === 0 ? (
            <div className="py-8 text-center text-muted-foreground">
              <Users className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p className="text-lg font-medium">No personnel found</p>
              <p className="text-sm mt-2">This qualification has not been awarded to anyone yet</p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-between pb-4 border-b">
                <p className="text-sm text-muted-foreground">
                  {personnelWithQualification.personnel.length} {personnelWithQualification.personnel.length === 1 ? 'person' : 'people'} with this qualification
                </p>
              </div>
              
              {/* Desktop Table View */}
              <div className="hidden lg:block overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Personnel</TableHead>
                      <TableHead>Rank</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Awarded Date</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {personnelWithQualification.personnel.map((person: PersonnelWithQualification) => (
                      <TableRow key={person._id}>
                        <TableCell>
                          <div>
                            <div className="font-medium">
                              {person.firstName || person.lastName 
                                ? `${person.firstName || ''} ${person.lastName || ''}`.trim()
                                : person.callSign}
                            </div>
                            {person.callSign && (person.firstName || person.lastName) && (
                              <div className="text-sm text-muted-foreground">{person.callSign}</div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          {person.rank ? (
                            <Badge variant="outline">{person.rank.abbreviation}</Badge>
                          ) : (
                            <span className="text-muted-foreground text-sm">No rank</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge 
                            variant={person.status === 'active' ? 'default' : 'secondary'}
                            className={
                              person.status === 'active' ? 'bg-green-500/20 text-green-700 dark:text-green-300' :
                              person.status === 'leave' ? 'bg-yellow-500/20 text-yellow-700 dark:text-yellow-300' :
                              person.status === 'inactive' ? 'bg-gray-500/20 text-gray-700 dark:text-gray-300' :
                              'bg-red-500/20 text-red-700 dark:text-red-300'
                            }
                          >
                            {person.status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm">
                            {new Date(person.qualificationDetails.awardedDate).toLocaleDateString('en-US', { 
                              year: 'numeric', 
                              month: 'short', 
                              day: 'numeric' 
                            })}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm text-muted-foreground">
                            {person.qualificationDetails.awardedBy || 'Unknown'}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* Mobile Card View */}
              <div className="lg:hidden space-y-3">
                {personnelWithQualification.personnel.map((person: PersonnelWithQualification) => (
                  <Card key={person._id} variant="depth" className="p-4">
                    <div className="space-y-3">
                      {/* Personnel Header */}
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="font-semibold text-lg">
                            {person.firstName || person.lastName 
                              ? `${person.firstName || ''} ${person.lastName || ''}`.trim()
                              : person.callSign}
                          </div>
                          {person.callSign && (person.firstName || person.lastName) && (
                            <div className="text-sm text-muted-foreground">{person.callSign}</div>
                          )}
                        </div>
                        <div className="flex gap-2">
                          {person.rank ? (
                            <Badge variant="outline" className="text-xs">
                              {person.rank.abbreviation}
                            </Badge>
                          ) : (
                            <span className="text-muted-foreground text-xs">No rank</span>
                          )}
                        </div>
                      </div>

                      {/* Personnel Details */}
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium text-muted-foreground">Status</span>
                          <Badge 
                            variant={person.status === 'active' ? 'default' : 'secondary'}
                            className={`text-xs ${
                              person.status === 'active' ? 'bg-green-500/20 text-green-700 dark:text-green-300' :
                              person.status === 'leave' ? 'bg-yellow-500/20 text-yellow-700 dark:text-yellow-300' :
                              person.status === 'inactive' ? 'bg-gray-500/20 text-gray-700 dark:text-gray-300' :
                              'bg-red-500/20 text-red-700 dark:text-red-300'
                            }`}
                          >
                            {person.status}
                          </Badge>
                        </div>
                      </div>

                      {/* Award Information */}
                      <div className="pt-2 border-t space-y-2">
                        <div className="flex justify-between items-center">
                          <span className="text-sm font-medium text-muted-foreground">Awarded Date</span>
                          <span className="text-sm">
                            {new Date(person.qualificationDetails.awardedDate).toLocaleDateString('en-US', { 
                              year: 'numeric', 
                              month: 'short', 
                              day: 'numeric' 
                            })}
                          </span>
                        </div>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Edit Qualification Dialog */}
      <Dialog open={editQualificationOpen} onOpenChange={(open) => {
        setEditQualificationOpen(open)
        if (!open) {
          setEditingQual(null)
          setEditQualName("")
          setEditQualAbbr("")
          setEditQualSchoolId("")
        }
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Qualification</DialogTitle>
            <DialogDescription>
              Update qualification details
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="edit-qual-name">Qualification Name *</Label>
              <Input
                id="edit-qual-name"
                placeholder="e.g., Basic Infantry Training"
                value={editQualName}
                onChange={(e) => setEditQualName(e.target.value)}
                disabled={isEditSubmitting}
              />
            </div>
            
            <div>
              <Label htmlFor="edit-qual-abbr">Abbreviation *</Label>
              <Input
                id="edit-qual-abbr"
                placeholder="e.g., BIT"
                value={editQualAbbr}
                onChange={(e) => setEditQualAbbr(e.target.value)}
                disabled={isEditSubmitting}
              />
            </div>
            
            <div>
              <Label htmlFor="edit-qual-school">School *</Label>
              <SearchableSelect
                id="edit-qual-school"
                options={schoolOptions}
                value={editQualSchoolId as string}
                onValueChange={(value) => setEditQualSchoolId(value as Id<"schools">)}
                placeholder="Select a school"
                searchPlaceholder="Search schools..."
                emptyMessage="No schools found."
                disabled={isEditSubmitting}
                className="mt-1"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setEditQualificationOpen(false)}
              disabled={isEditSubmitting}
            >
              Cancel
            </Button>
            <Button
              onClick={handleUpdateQualification}
              disabled={isEditSubmitting}
            >
              {isEditSubmitting ? "Updating..." : "Update Qualification"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
