"use client"

import { useState } from "react"
import { useQuery, useMutation } from "convex/react"
import { useSession } from "next-auth/react"
import { api } from "../../../../convex/_generated/api"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
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
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { useToast } from "@/hooks/use-toast"
import { GraduationCap, UserCheck, Settings, Plus, Edit, Trash2, X } from "lucide-react"
import { Id } from "../../../../convex/_generated/dataModel"
import { getUserFriendlyError, getSchoolIndicatorColor } from "@/lib/utils"
import { ColorPicker } from "@/components/ui/color-picker"
import { useTheme } from "@/providers/theme-provider"
import { ConfirmationDialog } from "@/components/common/confirmation-dialog"
import { FormDialog } from "@/components/common/form-dialog"
import { LoadingState } from "@/components/common/loading-state"
import { EmptyState } from "@/components/common/empty-state"

export default function SchoolsPage() {
  const { toast } = useToast()
  const { data: session } = useSession()
  const { theme } = useTheme()
  const isDarkMode = theme === 'dark'
  const [selectedSchoolId, setSelectedSchoolId] = useState<Id<"schools"> | null>(null)
  const [instructorAssignmentOpen, setInstructorAssignmentOpen] = useState(false)
  const [createSchoolOpen, setCreateSchoolOpen] = useState(false)
  const [editSchoolOpen, setEditSchoolOpen] = useState(false)
  const [deleteSchoolId, setDeleteSchoolId] = useState<Id<"schools"> | null>(null)
  const [editingSchool, setEditingSchool] = useState<{ _id: Id<"schools">, name: string, abbreviation: string, color?: string } | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  
  // Form states
  const [newSchoolName, setNewSchoolName] = useState("")
  const [newSchoolAbbr, setNewSchoolAbbr] = useState("")
  const [newSchoolColor, setNewSchoolColor] = useState("")

  // Check if user is admin
  const isAdmin = session?.user?.role === 'administrator' || session?.user?.role === 'super_admin'
  const isInstructor = session?.user?.role === 'instructor'

  // Fetch data
  const schoolsWithInstructors = useQuery(
    api.schools.listSchoolsWithInstructors,
    session?.user?.id ? { userId: session.user.id as Id<"personnel"> } : "skip"
  )
  const managedSchools = useQuery(
    api.schools.listManagedSchools, 
    session?.user?.id
      ? { userId: session.user.id as Id<"personnel">, username: session.user.name, role: session.user.role as "administrator" | "instructor" | "game_master" | "super_admin" }
      : "skip"
  )
  const qualifications = useQuery(
    api.qualifications.listQualificationsWithCounts,
    session?.user?.id ? { userId: session.user.id as Id<"personnel"> } : "skip"
  )
  const systemUsers = useQuery(
    api.users.listUsersWithRoles,
    session?.user?.id && isAdmin ? { userId: session.user.id as Id<"personnel"> } : "skip"
  )

  // Mutations
  const assignInstructor = useMutation(api.schools.assignInstructor)
  const unassignInstructor = useMutation(api.schools.unassignInstructor)
  const createSchool = useMutation(api.schools.createSchool)
  const updateSchool = useMutation(api.schools.updateSchool)
  const deleteSchool = useMutation(api.schools.deleteSchool)

  // Group qualifications by school
  const schoolsWithDetails = schoolsWithInstructors?.map(school => {
    const schoolQualifications = qualifications?.filter(q => q.schoolId === school._id) || []
    const canManage = managedSchools?.some(ms => ms._id === school._id) || false
    return {
      ...school,
      qualifications: schoolQualifications,
      qualificationCount: schoolQualifications.length,
      totalPersonnelWithQuals: schoolQualifications.reduce((sum, qual) => sum + (qual.personnelCount || 0), 0),
      canManage
    }
  }) || []

  // Get currently selected school's instructors
  const selectedSchool = schoolsWithDetails.find(s => s._id === selectedSchoolId)
  const selectedSchoolInstructorIds = selectedSchool?.instructors?.map(i => i._id) || []

  // Handler functions
  const handleToggleInstructor = async (userId: Id<"personnel">, isChecked: boolean) => {
    if (!selectedSchoolId) return

    try {
      if (!session?.user?.id) {
        throw new Error("Session expired. Please log in again.")
      }
      if (isChecked) {
        await assignInstructor({
          requesterUserId: session.user.id as Id<"personnel">,
          userId,
          schoolId: selectedSchoolId
        })
        toast({
          title: "Instructor assigned",
          description: "The instructor has been successfully assigned to this school.",
        })
      } else {
        await unassignInstructor({
          requesterUserId: session.user.id as Id<"personnel">,
          userId,
          schoolId: selectedSchoolId
        })
        toast({
          title: "Instructor removed",
          description: "The instructor has been removed from this school.",
        })
      }
    } catch (error) {
      toast({
        title: "Error",
        description: getUserFriendlyError(error),
        variant: "destructive",
      })
    }
  }

  const handleCreateSchool = async () => {
    if (!newSchoolName.trim() || !newSchoolAbbr.trim()) {
      setFormError("Please provide both name and abbreviation")
      return
    }

    setIsSubmitting(true)
    setFormError(null)

    try {
      if (!session?.user?.id) {
        throw new Error("Session expired. Please log in again.")
      }
      await createSchool({
        userId: session.user.id as Id<"personnel">,
        name: newSchoolName.trim(),
        abbreviation: newSchoolAbbr.trim(),
        color: newSchoolColor.trim() || undefined,
      })
      toast({
        title: "School created",
        description: `${newSchoolName} has been successfully created.`,
      })
      setNewSchoolName("")
      setNewSchoolAbbr("")
      setNewSchoolColor("")
      setCreateSchoolOpen(false)
      setFormError(null)
    } catch (error) {
      setFormError(getUserFriendlyError(error))
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleUpdateSchool = async () => {
    if (!editingSchool) return

    setIsSubmitting(true)
    setFormError(null)

    try {
      if (!session?.user?.id) {
        throw new Error("Session expired. Please log in again.")
      }
      await updateSchool({
        userId: session.user.id as Id<"personnel">,
        schoolId: editingSchool._id,
        name: editingSchool.name,
        abbreviation: editingSchool.abbreviation,
        color: editingSchool.color,
      })
      toast({
        title: "School updated",
        description: "The school has been successfully updated.",
      })
      setEditingSchool(null)
      setEditSchoolOpen(false)
      setFormError(null)
    } catch (error) {
      setFormError(getUserFriendlyError(error))
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDeleteSchool = async () => {
    if (!deleteSchoolId) return

    try {
      if (!session?.user?.id) {
        throw new Error("Session expired. Please log in again.")
      }
      await deleteSchool({
        userId: session.user.id as Id<"personnel">,
        schoolId: deleteSchoolId
      })
      toast({
        title: "School deleted",
        description: "The school has been successfully deleted.",
      })
      setDeleteSchoolId(null)
    } catch (error) {
      toast({
        title: "Error",
        description: getUserFriendlyError(error),
        variant: "destructive",
      })
    }
  }

  const openEditDialog = (school: { _id: Id<"schools">, name: string, abbreviation: string, color?: string }) => {
    setEditingSchool({ ...school })
    setEditSchoolOpen(true)
  }

  // Loading state
  if (!schoolsWithInstructors || !qualifications || !managedSchools || (isAdmin && !systemUsers)) {
    return <LoadingState type="skeleton" count={5} />
  }

  return (
    <div className="space-y-6 md:space-y-8 relative pb-8">
      <div className="flex justify-between items-start md:items-center flex-col md:flex-row gap-4 animate-fade-in-down">
        <div className="space-y-1 relative">
          <div className="flex items-center gap-3">
            <h2 className="text-2xl md:text-3xl lg:text-4xl font-bold tracking-tight text-primary">
              Schools & Instructors
            </h2>
          </div>
          <p className="text-muted-foreground text-sm md:text-base lg:text-lg">
            Manage training schools, instructors, and qualifications
          </p>
        </div>
        
        <div className="flex items-center gap-2 flex-wrap w-full md:w-auto">
          {isAdmin && (
            <>
              <Button 
                variant="default" 
                size="lg" 
                className="flex items-center gap-2"
                onClick={() => setCreateSchoolOpen(true)}
              >
                <Plus className="w-5 h-5" />
                Create School
              </Button>
              <Dialog open={instructorAssignmentOpen} onOpenChange={setInstructorAssignmentOpen}>
                <DialogTrigger asChild>
                  <Button variant="outline" size="lg" className="flex items-center gap-2">
                    <Settings className="w-5 h-5" />
                    Manage Instructors
                  </Button>
                </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Instructor Assignments</DialogTitle>
                <DialogDescription>
                  Assign system users (not regular personnel) as instructors to training schools
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label>Select School</Label>
                  <Select 
                    value={selectedSchoolId || ""} 
                    onValueChange={(value: string) => setSelectedSchoolId(value as Id<"schools">)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Choose a school" />
                    </SelectTrigger>
                    <SelectContent>
                      {schoolsWithDetails.map(school => (
                        <SelectItem key={school._id} value={school._id}>
                          {school.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                {selectedSchoolId && (
                  <div>
                    <Label>Assign System Users as Instructors</Label>
                    <p className="text-xs text-muted-foreground mb-2">
                      Only system users with Instructor role or higher can be assigned to schools
                    </p>
                    {selectedSchool && selectedSchool.instructorCount > 0 && (
                      <div className="mb-3">
                        <p className="text-sm font-medium mb-2">Current Instructors:</p>
                        <div className="flex flex-wrap gap-2">
                          {selectedSchool.instructors.map(instructor => (
                            <Badge key={instructor._id} variant="secondary" className="flex items-center gap-1">
                              {instructor.name}
                              <X 
                                className="w-3 h-3 cursor-pointer hover:text-destructive" 
                                onClick={() => handleToggleInstructor(instructor._id, false)}
                              />
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}
                    <div className="max-h-60 overflow-y-auto border rounded-lg p-4 space-y-3">
                      {systemUsers
                        ?.filter(user => 
                          user.isActive && 
                          (user.roles.includes('instructor') || 
                           user.roles.includes('administrator') || 
                           user.roles.includes('super_admin'))
                        )
                        .map(user => {
                          const isAssigned = selectedSchoolInstructorIds.includes(user._id)
                          return (
                            <div key={user._id} className="flex items-start space-x-3">
                              <Checkbox
                                id={`instructor-${user._id}`}
                                checked={isAssigned}
                                onCheckedChange={(checked: boolean) => 
                                  handleToggleInstructor(user._id, checked)
                                }
                              />
                              <Label 
                                htmlFor={`instructor-${user._id}`}
                                className="text-sm cursor-pointer flex-1"
                              >
                                <span className="font-medium">{user.name}</span>
                                {user.email && <span className="text-muted-foreground ml-2 text-xs">({user.email})</span>}
                                <div className="flex gap-1 mt-1">
                                  {user.roles.map((role, idx) => (
                                    <Badge key={idx} variant="outline" className="text-xs">
                                      {role.replace('_', ' ')}
                                    </Badge>
                                  ))}
                                </div>
                              </Label>
                            </div>
                          )
                        })}
                      {!systemUsers?.filter(user => 
                        user.isActive && 
                        (user.roles.includes('instructor') || 
                         user.roles.includes('administrator') || 
                         user.roles.includes('super_admin'))
                      ).length && (
                        <p className="text-sm text-muted-foreground text-center py-4">
                          No system users with instructor role or higher available
                        </p>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </DialogContent>
          </Dialog>
            </>
          )}
        </div>
      </div>

      {/* Detailed View Table */}
      <Card variant="depth" className="animate-fade-in">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/20 backdrop-blur-sm">
              <GraduationCap className="w-6 h-6 text-primary" />
            </div>
            <div>
              <CardTitle className="text-xl text-primary">
                School Overview
              </CardTitle>
              <CardDescription className="mt-1">
                Comprehensive view of all schools and their qualifications
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {schoolsWithDetails.length === 0 ? (
            <EmptyState
              icon={GraduationCap}
              title="No schools found"
              description="Get started by creating your first training school"
              action={
                isAdmin
                  ? {
                      label: "Create School",
                      onClick: () => setCreateSchoolOpen(true),
                      icon: Plus,
                    }
                  : undefined
              }
            />
          ) : (
            <>
              {/* Desktop Table View */}
              <div className="hidden lg:block overflow-x-auto -mx-6 px-6">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>School</TableHead>
                      <TableHead>Instructors</TableHead>
                      <TableHead>Qualifications</TableHead>
                      <TableHead>Total Awarded</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {schoolsWithDetails.map((school) => (
                  <TableRow key={school._id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div 
                          className="w-3 h-3 rounded-full" 
                          style={{ backgroundColor: getSchoolIndicatorColor(school.color, 0.6, isDarkMode) }}
                        ></div>
                        <div>
                          <div className="font-medium">{school.name}</div>
                          <div className="text-sm text-muted-foreground">{school.abbreviation}</div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <span className="text-sm">{school.instructorCount} assigned</span>
                        {school.instructorCount > 0 && (
                          <div className="flex -space-x-1">
                            {school.instructors.slice(0, 3).map(instructor => (
                              <Badge 
                                key={instructor._id} 
                                variant="secondary" 
                                className="text-xs"
                                title={instructor.name}
                              >
                                {instructor.name.substring(0, 3)}
                              </Badge>
                            ))}
                            {school.instructorCount > 3 && (
                              <Badge variant="secondary" className="text-xs">
                                +{school.instructorCount - 3}
                              </Badge>
                            )}
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">
                        {school.qualificationCount} qualifications
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary">
                        {school.totalPersonnelWithQuals} total
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        {school.canManage ? (
                          <>
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => openEditDialog(school)}
                            >
                              <Edit className="w-4 h-4 mr-1" />
                              Edit
                            </Button>
                            {isAdmin && (
                              <Button 
                                variant="outline" 
                                size="sm"
                                onClick={() => {
                                  setSelectedSchoolId(school._id)
                                  setInstructorAssignmentOpen(true)
                                }}
                              >
                                <UserCheck className="w-4 h-4 mr-1" />
                                Instructors
                              </Button>
                            )}
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => setDeleteSchoolId(school._id)}
                              className="text-destructive hover:text-destructive"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </>
                        ) : (
                          <span className="text-sm text-muted-foreground italic">
                            {isInstructor ? "Not your school" : "Admin access required"}
                          </span>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {/* Mobile Card View */}
          <div className="lg:hidden space-y-4">
            {schoolsWithDetails.map((school) => (
              <Card key={school._id} variant="depth" className="p-4">
                <div className="space-y-4">
                  {/* School Header */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div 
                        className="w-4 h-4 rounded-full" 
                        style={{ backgroundColor: getSchoolIndicatorColor(school.color, 0.6, isDarkMode) }}
                      ></div>
                      <div>
                        <div className="font-semibold text-lg">{school.name}</div>
                        <div className="text-sm text-muted-foreground">{school.abbreviation}</div>
                      </div>
                    </div>
                    {school.canManage && (
                      <div className="flex gap-1">
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => openEditDialog(school)}
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        {isAdmin && (
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => {
                              setSelectedSchoolId(school._id)
                              setInstructorAssignmentOpen(true)
                            }}
                          >
                            <UserCheck className="w-4 h-4" />
                          </Button>
                        )}
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => setDeleteSchoolId(school._id)}
                          className="text-destructive hover:text-destructive"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    )}
                  </div>

                  {/* School Stats */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <div className="text-sm font-medium text-muted-foreground">Instructors</div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm">{school.instructorCount} assigned</span>
                      </div>
                      {school.instructorCount > 0 && (
                        <div className="flex flex-wrap gap-1">
                          {school.instructors.slice(0, 4).map(instructor => (
                            <Badge 
                              key={instructor._id} 
                              variant="secondary" 
                              className="text-xs"
                              title={instructor.name}
                            >
                              {instructor.name.substring(0, 4)}
                            </Badge>
                          ))}
                          {school.instructorCount > 4 && (
                            <Badge variant="secondary" className="text-xs">
                              +{school.instructorCount - 4}
                            </Badge>
                          )}
                        </div>
                      )}
                    </div>

                    <div className="space-y-2">
                      <div className="text-sm font-medium text-muted-foreground">Qualifications</div>
                      <div className="text-sm">{school.qualificationCount} qualifications</div>
                    </div>
                  </div>

                  {/* Total Awarded */}
                  <div className="flex items-center justify-between pt-2 border-t">
                    <span className="text-sm font-medium text-muted-foreground">Total Awarded</span>
                    <Badge variant="secondary">
                      {school.totalPersonnelWithQuals} total
                    </Badge>
                  </div>

                  {/* Access Message for non-managers */}
                  {!school.canManage && (
                    <div className="text-sm text-muted-foreground italic pt-2 border-t">
                      {isInstructor ? "Not your school" : "Admin access required"}
                    </div>
                  )}
                </div>
              </Card>
            ))}
          </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Create School Dialog */}
      <FormDialog
        open={createSchoolOpen}
        onOpenChange={setCreateSchoolOpen}
        title="Create New School"
        description="Add a new training school to the system"
        onSubmit={handleCreateSchool}
        submitText="Create School"
        isSubmitting={isSubmitting}
        error={formError}
      >
        <div className="space-y-4">
          <div>
            <Label htmlFor="school-name">School Name</Label>
            <Input
              id="school-name"
              placeholder="e.g., Infantry"
              value={newSchoolName}
              onChange={(e) => setNewSchoolName(e.target.value)}
            />
          </div>
          <div>
            <Label htmlFor="school-abbr">Abbreviation</Label>
            <Input
              id="school-abbr"
              placeholder="e.g., INF"
              value={newSchoolAbbr}
              onChange={(e) => setNewSchoolAbbr(e.target.value)}
            />
          </div>
          <div>
            <Label htmlFor="school-color">School Color</Label>
            <div className="flex items-center gap-3">
              <ColorPicker
                value={newSchoolColor || '#6b7280'}
                onChange={(color: string) => setNewSchoolColor(color)}
              />
              <span className="text-sm text-muted-foreground">
                {newSchoolColor || '#6b7280'}
              </span>
            </div>
          </div>
        </div>
      </FormDialog>

      {/* Edit School Dialog */}
      <FormDialog
        open={editSchoolOpen}
        onOpenChange={setEditSchoolOpen}
        title="Edit School"
        description="Update school information"
        onSubmit={handleUpdateSchool}
        submitText="Save Changes"
        isSubmitting={isSubmitting}
        error={formError}
      >
        {editingSchool && (
          <div className="space-y-4">
            <div>
              <Label htmlFor="edit-school-name">School Name</Label>
              <Input
                id="edit-school-name"
                value={editingSchool.name}
                onChange={(e) => setEditingSchool({ ...editingSchool, name: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="edit-school-abbr">Abbreviation</Label>
              <Input
                id="edit-school-abbr"
                value={editingSchool.abbreviation}
                onChange={(e) => setEditingSchool({ ...editingSchool, abbreviation: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="edit-school-color">School Color</Label>
              <div className="flex items-center gap-3">
                <ColorPicker
                  value={editingSchool.color || '#6b7280'}
                  onChange={(color: string) => setEditingSchool({ ...editingSchool, color })}
                />
                <span className="text-sm text-muted-foreground">
                  {editingSchool.color || '#6b7280'}
                </span>
              </div>
            </div>
          </div>
        )}
      </FormDialog>

      {/* Delete School Confirmation */}
      <ConfirmationDialog
        open={!!deleteSchoolId}
        onOpenChange={(open) => !open && setDeleteSchoolId(null)}
        title="Are you sure?"
        description={
          <>
            This will permanently delete the school. This action cannot be undone.
            {deleteSchoolId && (() => {
              const school = schoolsWithDetails.find(s => s._id === deleteSchoolId)
              if (school && school.qualificationCount > 0) {
                return (
                  <div className="mt-2 text-destructive font-medium">
                    Warning: This school has {school.qualificationCount} qualification{school.qualificationCount !== 1 ? 's' : ''} assigned. 
                    You must delete or reassign them first.
                  </div>
                )
              }
              return null
            })()}
          </>
        }
        actionText="Delete School"
        onConfirm={handleDeleteSchool}
        variant="destructive"
      />
    </div>
  )
}
