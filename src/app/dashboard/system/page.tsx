"use client"

import { useState, useEffect } from "react"
import { useQuery, useMutation, useAction } from "convex/react"
import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { api } from "../../../../convex/_generated/api"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
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
import { ConfirmationDialog } from "@/components/common/confirmation-dialog"
import { EmptyState } from "@/components/common/empty-state"
import { LoadingState } from "@/components/common/loading-state"
import { CheckboxList, CheckboxOption } from "@/components/forms/checkbox-list"
import { Id } from "../../../../convex/_generated/dataModel"
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core'
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { Star, GraduationCap, School, Shield, Users2, Copy, Check, Eye, EyeOff, Pencil, Trash2, GripVertical, KeyRound, Wrench } from "lucide-react"
import { formatRole, generateTemporaryPassword } from "../../../../convex/helpers"
import { getRoleColorStyles } from "@/lib/utils"
import { useTheme } from "@/providers/theme-provider"

// Sortable Rank Item Component
type RankItem = {
  _id: Id<"ranks">
  name: string
  abbreviation: string
  personnelCount: number
  order?: number
}

type QualificationItem = {
  _id: Id<"qualifications">
  name: string
  abbreviation: string
  schoolId: Id<"schools">
  description?: string
  personnelCount: number
  school?: { name: string; abbreviation: string } | null
}

type SchoolItem = {
  _id: Id<"schools">
  name: string
  abbreviation: string
  description?: string
}

type SystemUser = {
  _id: Id<"personnel">
  name: string
  roles: string[]
  isActive?: boolean
  requirePasswordChange?: boolean
}

function SortableRankItem({ rank, onEdit, onDelete }: {
  rank: RankItem
  onEdit: (rank: RankItem) => void
  onDelete: (rankId: Id<"ranks">) => void
}) {
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: rank._id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  return (
    <>
      <div
        ref={setNodeRef}
        style={style}
        className="flex items-center justify-between p-3 border rounded-lg bg-background"
      >
        <div className="flex items-center gap-3 flex-1">
          <div
            {...attributes}
            {...listeners}
            className="cursor-grab active:cursor-grabbing hover:text-primary transition-colors"
            title="Drag to reorder"
          >
            <GripVertical className="w-5 h-5 text-muted-foreground" />
          </div>
          <div>
            <p className="font-medium">{rank.name}</p>
            <p className="text-sm text-muted-foreground">
              {rank.abbreviation} • {rank.personnelCount} member{rank.personnelCount !== 1 ? 's' : ''}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => onEdit(rank)}>
            Edit
          </Button>
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => setDeleteDialogOpen(true)}
          >
            Delete
          </Button>
        </div>
      </div>

      <ConfirmationDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        title="Delete Rank"
        description={`Are you sure you want to delete the rank "${rank.name}"? This action cannot be undone.`}
        actionText="Delete"
        onConfirm={() => onDelete(rank._id)}
      />
    </>
  )
}

export default function SystemManagementPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const { theme } = useTheme()
  const isDarkMode = theme === 'dark'

  // School detail state (must be before queries that depend on it)
  const [viewingSchoolId, setViewingSchoolId] = useState<Id<"schools"> | null>(null)

  // Data queries - ALL HOOKS MUST BE CALLED BEFORE ANY CONDITIONAL RETURNS
  const ranks = useQuery(
    api.ranks.listRanksWithCounts,
    session?.user?.id ? { userId: session.user.id as Id<"personnel"> } : "skip"
  )
  const qualifications = useQuery(
    api.qualifications.listQualificationsWithCounts,
    session?.user?.id ? { userId: session.user.id as Id<"personnel"> } : "skip"
  )
  const schools = useQuery(
    api.schools.listSchools,
    session?.user?.id ? { userId: session.user.id as Id<"personnel"> } : "skip"
  )
  const schoolInstructors = useQuery(
    api.schools.getSchoolInstructors,
    viewingSchoolId && session?.user?.id ? { userId: session.user.id as Id<"personnel">, schoolId: viewingSchoolId } : "skip"
  )
  const systemUsers = useQuery(
    api.users.listUsersWithRoles,
    session?.user?.id ? { userId: session.user.id as Id<"personnel"> } : "skip"
  )
  const availableRoles = useQuery(api.users.getAllRoles, {})
  const maintenanceMode = useQuery(api.systemSettings.getMaintenanceMode, {})

  // Mutations
  const createRank = useMutation(api.ranks.createRank)
  const updateRank = useMutation(api.ranks.updateRank)
  const updateRankOrder = useMutation(api.ranks.updateRankOrder)
  const deleteRank = useMutation(api.ranks.deleteRank)
  const createQualification = useMutation(api.qualifications.createQualification)
  const updateQualification = useMutation(api.qualifications.updateQualification)
  const deleteQualification = useMutation(api.qualifications.deleteQualification)
  const createSchool = useMutation(api.schools.createSchool)
  const updateSchool = useMutation(api.schools.updateSchool)
  const deleteSchool = useMutation(api.schools.deleteSchool)
  const createUserAccount = useAction(api.userActions.createUserAccount)
  const updateUser = useMutation(api.users.updateUser)
  const updateUserRoles = useMutation(api.users.updateUserRoles)
  const toggleUserStatus = useMutation(api.users.toggleUserStatus)
  const deleteUser = useMutation(api.users.deleteUser)
  const resetUserPassword = useAction(api.userActions.resetUserPassword)
  const setMaintenanceMode = useMutation(api.systemSettings.setMaintenanceMode)

  // Dialog states
  const [ranksOpen, setRanksOpen] = useState(false)
  const [qualificationsOpen, setQualificationsOpen] = useState(false)
  const [schoolsOpen, setSchoolsOpen] = useState(false)
  const [usersOpen, setUsersOpen] = useState(false)

  // Add dialogs
  const [addRankOpen, setAddRankOpen] = useState(false)
  const [addQualOpen, setAddQualOpen] = useState(false)
  const [addSchoolOpen, setAddSchoolOpen] = useState(false)
  const [addUserOpen, setAddUserOpen] = useState(false)

  // Edit dialogs and selected items
  const [editRankOpen, setEditRankOpen] = useState(false)
  const [editQualOpen, setEditQualOpen] = useState(false)
  const [editSchoolOpen, setEditSchoolOpen] = useState(false)
  const [editUserOpen, setEditUserOpen] = useState(false)
  const [editUserRolesOpen, setEditUserRolesOpen] = useState(false)
  const [resetPasswordOpen, setResetPasswordOpen] = useState(false)
  const [editingRankId, setEditingRankId] = useState<Id<"ranks"> | null>(null)
  const [editingQualId, setEditingQualId] = useState<Id<"qualifications"> | null>(null)
  const [editingSchoolId, setEditingSchoolId] = useState<Id<"schools"> | null>(null)
  const [editingUserId, setEditingUserId] = useState<Id<"personnel"> | null>(null)
  const [resetPasswordUserId, setResetPasswordUserId] = useState<Id<"personnel"> | null>(null)
  const [resetPasswordUsername, setResetPasswordUsername] = useState("")

  // Delete confirmation states
  const [deleteQualId, setDeleteQualId] = useState<Id<"qualifications"> | null>(null)
  const [deleteSchoolId, setDeleteSchoolId] = useState<Id<"schools"> | null>(null)
  const [deleteUserId, setDeleteUserId] = useState<Id<"personnel"> | null>(null)

  // Form states
  const [rankForm, setRankForm] = useState({ name: "", abbreviation: "" })
  const [qualForm, setQualForm] = useState({ name: "", abbreviation: "", schoolId: "", description: "" })
  const [schoolForm, setSchoolForm] = useState({ name: "", abbreviation: "", description: "" })
  const [userForm, setUserForm] = useState({ name: "", password: "", roles: [] as string[] })
  const [editUserForm, setEditUserForm] = useState({ name: "" })
  const [editRolesForm, setEditRolesForm] = useState<string[]>([])

  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [generatedPassword, setGeneratedPassword] = useState("")
  const [passwordCopied, setPasswordCopied] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [resetTemporaryPassword, setResetTemporaryPassword] = useState("")
  const [resetPasswordCopied, setResetPasswordCopied] = useState(false)
  const [showResetPassword, setShowResetPassword] = useState(false)

  // Search state
  const [qualificationSearch, setQualificationSearch] = useState("")
  const [userSearch, setUserSearch] = useState("")
  
  // Maintenance mode state
  const [maintenanceDialogOpen, setMaintenanceDialogOpen] = useState(false)
  const [maintenanceMessage, setMaintenanceMessage] = useState("")
  const [isTogglingMaintenance, setIsTogglingMaintenance] = useState(false)

  // Drag and drop sensors
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  // Local state for ranks ordering
  const [localRanks, setLocalRanks] = useState<typeof ranks>(ranks)

  // Filter qualifications based on search
  const filteredQualifications = qualifications?.filter(qual => 
    qual.name.toLowerCase().includes(qualificationSearch.toLowerCase()) ||
    qual.abbreviation.toLowerCase().includes(qualificationSearch.toLowerCase()) ||
    qual.school?.name.toLowerCase().includes(qualificationSearch.toLowerCase())
  )

  // Update local ranks when data changes
  if (ranks && localRanks !== ranks) {
    setLocalRanks(ranks)
  }

  // Handle drag end for rank reordering
  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event

    if (!over || active.id === over.id || !localRanks) {
      return
    }

    const oldIndex = localRanks.findIndex((rank) => rank._id === active.id)
    const newIndex = localRanks.findIndex((rank) => rank._id === over.id)

    const reorderedRanks = arrayMove(localRanks, oldIndex, newIndex)
    
    // Update local state immediately for smooth UX
    setLocalRanks(reorderedRanks)

    // Prepare updates with new order values
    const updates = reorderedRanks.map((rank, index) => ({
      rankId: rank._id,
      order: index,
    }))

    // Save to database
    try {
      if (!session?.user?.id) {
        throw new Error("Session expired. Please log in again.")
      }
      await updateRankOrder({
        userId: session.user.id as Id<"personnel">,
        updates
      })
    } catch (err: unknown) {
      console.error("Failed to reorder ranks:", err)
      // Revert on error
      setLocalRanks(ranks)
      alert("Failed to reorder ranks. Please try again.")
    }
  }

  // Rank handlers
  const handleAddRank = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setIsSubmitting(true)
    try {
      if (!session?.user?.id) {
        throw new Error("Session expired. Please log in again.")
      }
      await createRank({
        userId: session.user.id as Id<"personnel">,
        name: rankForm.name,
        abbreviation: rankForm.abbreviation,
      })
      setRankForm({ name: "", abbreviation: "" })
      setAddRankOpen(false)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to create rank")
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleEditRank = (rank: RankItem) => {
    setEditingRankId(rank._id)
    setRankForm({
      name: rank.name,
      abbreviation: rank.abbreviation,
    })
    setEditRankOpen(true)
  }

  const handleUpdateRank = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingRankId) return
    setError(null)
    setIsSubmitting(true)
    try {
      if (!session?.user?.id) {
        throw new Error("Session expired. Please log in again.")
      }
      await updateRank({
        userId: session.user.id as Id<"personnel">,
        rankId: editingRankId,
        name: rankForm.name,
        abbreviation: rankForm.abbreviation,
      })
      setRankForm({ name: "", abbreviation: "" })
      setEditRankOpen(false)
      setEditingRankId(null)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to update rank")
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDeleteRank = async (rankId: Id<"ranks">) => {
    try {
      if (!session?.user?.id) {
        throw new Error("Session expired. Please log in again.")
      }
      await deleteRank({
        userId: session.user.id as Id<"personnel">,
        rankId
      })
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : "Failed to delete rank"
      setError(errorMessage)
      alert(errorMessage)
      setTimeout(() => setError(null), 5000)
    }
  }

  // Update local ranks when data changes
  if (ranks && localRanks !== ranks) {
    setLocalRanks(ranks)
  }


  // Qualification handlers
  const handleAddQualification = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    if (!qualForm.schoolId) {
      setError("Please select a school")
      return
    }
    setIsSubmitting(true)
    try {
      if (!session?.user?.id) {
        throw new Error("Session expired. Please log in again.")
      }
      await createQualification({
        userId: session.user.id as Id<"personnel">,
        name: qualForm.name,
        abbreviation: qualForm.abbreviation,
        schoolId: qualForm.schoolId as Id<"schools">,
      })
      setQualForm({ name: "", abbreviation: "", schoolId: "", description: "" })
      setAddQualOpen(false)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to create qualification")
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleEditQualification = (qual: QualificationItem) => {
    setEditingQualId(qual._id)
    setQualForm({
      name: qual.name,
      abbreviation: qual.abbreviation,
      schoolId: qual.schoolId,
      description: qual.description || "",
    })
    setEditQualOpen(true)
  }

  const handleUpdateQualification = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingQualId) return
    setError(null)
    if (!qualForm.schoolId) {
      setError("Please select a school")
      return
    }
    setIsSubmitting(true)
    try {
      if (!session?.user?.id) {
        throw new Error("Session expired. Please log in again.")
      }
      await updateQualification({
        userId: session.user.id as Id<"personnel">,
        qualificationId: editingQualId,
        name: qualForm.name,
        abbreviation: qualForm.abbreviation,
        schoolId: qualForm.schoolId as Id<"schools">,
      })
      setQualForm({ name: "", abbreviation: "", schoolId: "", description: "" })
      setEditQualOpen(false)
      setEditingQualId(null)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to update qualification")
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDeleteQualification = async (qualificationId: Id<"qualifications">) => {
    try {
      if (!session?.user?.id) {
        throw new Error("Session expired. Please log in again.")
      }
      await deleteQualification({
        userId: session.user.id as Id<"personnel">,
        qualificationId
      })
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : "Failed to delete qualification"
      setError(errorMessage)
      alert(errorMessage)
      setTimeout(() => setError(null), 5000)
    }
  }

  // School handlers
  const handleAddSchool = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setIsSubmitting(true)
    try {
      if (!session?.user?.id) {
        throw new Error("Session expired. Please log in again.")
      }
      await createSchool({
        userId: session.user.id as Id<"personnel">,
        name: schoolForm.name,
        abbreviation: schoolForm.abbreviation,
      })
      setSchoolForm({ name: "", abbreviation: "", description: "" })
      setAddSchoolOpen(false)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to create school")
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleEditSchool = (school: SchoolItem) => {
    setEditingSchoolId(school._id)
    setSchoolForm({
      name: school.name,
      abbreviation: school.abbreviation,
      description: school.description || "",
    })
    setEditSchoolOpen(true)
  }

  const handleUpdateSchool = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingSchoolId) return
    setError(null)
    setIsSubmitting(true)
    try {
      if (!session?.user?.id) {
        throw new Error("Session expired. Please log in again.")
      }
      await updateSchool({
        userId: session.user.id as Id<"personnel">,
        schoolId: editingSchoolId,
        name: schoolForm.name,
        abbreviation: schoolForm.abbreviation,
      })
      setSchoolForm({ name: "", abbreviation: "", description: "" })
      setEditSchoolOpen(false)
      setEditingSchoolId(null)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to update school")
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDeleteSchool = async (schoolId: Id<"schools">) => {
    try {
      if (!session?.user?.id) {
        throw new Error("Session expired. Please log in again.")
      }
      await deleteSchool({
        userId: session.user.id as Id<"personnel">,
        schoolId
      })
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : "Failed to delete school"
      // Show error in a more user-friendly way
      setError(errorMessage)
      // Also show as alert for immediate feedback
      alert(errorMessage)
      // Clear error after a delay
      setTimeout(() => setError(null), 5000)
    }
  }

  // User handlers
  const handleGeneratePassword = () => {
    const password = generateTemporaryPassword(16)
    setGeneratedPassword(password)
    setUserForm({ ...userForm, password })
    setPasswordCopied(false)
  }

  const handleCopyPassword = () => {
    if (generatedPassword) {
      navigator.clipboard.writeText(generatedPassword)
      setPasswordCopied(true)
      setTimeout(() => setPasswordCopied(false), 2000)
    }
  }

  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    
    if (userForm.roles.length === 0) {
      setError("Please select at least one role")
      return
    }
    
    if (!userForm.password) {
      setError("Please generate a password")
      return
    }
    
    setIsSubmitting(true)
    try {
      if (!session?.user?.id) {
        throw new Error("Session expired. Please log in again.")
      }
      await createUserAccount({
        requesterUserId: session.user.id as Id<"personnel">,
        name: userForm.name,
        password: userForm.password,
        roles: userForm.roles as Array<"administrator" | "game_master" | "instructor">,
      })
      setUserForm({ name: "", password: "", roles: [] })
      setGeneratedPassword("")
      setPasswordCopied(false)
      setShowPassword(false)
      setAddUserOpen(false)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to create user")
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleEditUser = (user: SystemUser) => {
    setEditingUserId(user._id)
    setEditUserForm({
      name: user.name,
    })
    setEditUserOpen(true)
  }

  const handleUpdateUser = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingUserId) return
    setError(null)
    setIsSubmitting(true)
    try {
      if (!session?.user?.id) {
        throw new Error("Session expired. Please log in again.")
      }
      await updateUser({
        requesterUserId: session.user.id as Id<"personnel">,
        userId: editingUserId,
        name: editUserForm.name,
      })
      setEditUserForm({ name: "" })
      setEditUserOpen(false)
      setEditingUserId(null)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to update user")
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleEditUserRoles = (user: SystemUser) => {
    setEditingUserId(user._id)
    setEditRolesForm(user.roles)
    setEditUserRolesOpen(true)
  }

  const handleUpdateUserRoles = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingUserId) return
    setError(null)
    
    if (editRolesForm.length === 0) {
      setError("User must have at least one role")
      return
    }
    
    setIsSubmitting(true)
    try {
      if (!session?.user?.id) {
        throw new Error("Session expired. Please log in again.")
      }
      await updateUserRoles({
        requesterUserId: session.user.id as Id<"personnel">,
        userId: editingUserId,
        roles: editRolesForm as Array<"administrator" | "game_master" | "instructor">,
      })
      setEditRolesForm([])
      setEditUserRolesOpen(false)
      setEditingUserId(null)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to update roles")
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDeleteUser = async (userId: Id<"personnel">) => {
    try {
      if (!session?.user?.id) {
        throw new Error("Session expired. Please log in again.")
      }
      await deleteUser({
        requesterUserId: session.user.id as Id<"personnel">,
        userId
      })
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : "Failed to delete user"
      setError(errorMessage)
      alert(errorMessage)
      setTimeout(() => setError(null), 5000)
    }
  }

  const handleToggleUserStatus = async (userId: Id<"personnel">) => {
    try {
      if (!session?.user?.id) {
        throw new Error("Session expired. Please log in again.")
      }
      await toggleUserStatus({
        requesterUserId: session.user.id as Id<"personnel">,
        userId
      })
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : "Failed to toggle user status"
      setError(errorMessage)
      alert(errorMessage)
      setTimeout(() => setError(null), 5000)
    }
  }

  const getRoleOptions = (): CheckboxOption[] => {
    if (!availableRoles) return []
    return availableRoles.map(role => ({
      id: role.roleName,
      label: role.displayName,
      description: role.description,
    }))
  }

  const handleResetPassword = (user: SystemUser) => {
    setResetPasswordUserId(user._id)
    setResetPasswordUsername(user.name)
    setResetTemporaryPassword("")
    setResetPasswordCopied(false)
    setShowResetPassword(false)
    setResetPasswordOpen(true)
  }

  const handleConfirmResetPassword = async () => {
    if (!resetPasswordUserId) return
    setError(null)
    setIsSubmitting(true)
    
    try {
      if (!session?.user?.id) {
        throw new Error("Session expired. Please log in again.")
      }
      const result = await resetUserPassword({
        requesterUserId: session.user.id as Id<"personnel">,
        userId: resetPasswordUserId
      })
      setResetTemporaryPassword(result.temporaryPassword)
      // Keep dialog open to show the password
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to reset password")
      setResetPasswordOpen(false)
      alert(err instanceof Error ? err.message : "Failed to reset password")
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleCopyResetPassword = () => {
    if (resetTemporaryPassword) {
      navigator.clipboard.writeText(resetTemporaryPassword)
      setResetPasswordCopied(true)
      setTimeout(() => setResetPasswordCopied(false), 2000)
    }
  }

  const handleCloseResetPassword = () => {
    setResetPasswordOpen(false)
    setResetPasswordUserId(null)
    setResetPasswordUsername("")
    setResetTemporaryPassword("")
    setResetPasswordCopied(false)
    setShowResetPassword(false)
  }

  // Filter users based on search
  const filteredUsers = systemUsers?.filter(user => 
    user.name.toLowerCase().includes(userSearch.toLowerCase()) ||
    user.roles.some(role => formatRole(role as "administrator" | "game_master" | "instructor" | "super_admin").toLowerCase().includes(userSearch.toLowerCase()))
  )
  
  // Maintenance mode handlers
  const handleToggleMaintenance = async (enabled: boolean) => {
    setIsTogglingMaintenance(true)
    try {
      if (!session?.user?.id) {
        throw new Error("Session expired. Please log in again.")
      }
      await setMaintenanceMode({
        userId: session.user.id as Id<"personnel">,
        enabled,
        message: maintenanceMessage || undefined,
      })
      setMaintenanceDialogOpen(false)
      setMaintenanceMessage("")
    } catch (err: unknown) {
      console.error("Failed to toggle maintenance mode:", err)
      alert(err instanceof Error ? err.message : "Failed to toggle maintenance mode")
    } finally {
      setIsTogglingMaintenance(false)
    }
  }

  // Check authorization - only administrators and super_admins can access this page
  // This MUST be after all hooks to avoid React hooks rule violations
  useEffect(() => {
    if (status === "loading") return
    
    if (!session?.user) {
      router.push("/login")
      return
    }

    const userRole = session.user.role
    if (userRole !== "administrator" && userRole !== "super_admin") {
      router.push("/dashboard")
      return
    }
  }, [session, status, router])

  // Show loading while checking authentication
  if (status === "loading") {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <LoadingState message="Loading..." />
      </div>
    )
  }

  // Don't render content if user doesn't have permission
  if (!session?.user || (session.user.role !== "administrator" && session.user.role !== "super_admin")) {
    return null
  }

  return (
    <div className="space-y-8 relative pb-8">
      {/* Floating Admin Badge */}
      <div className="absolute -top-4 right-4 glass-strong px-4 py-2 rounded-full border border-destructive/30 shadow-lg shadow-destructive/20 animate-float z-20 animate-fade-in opacity-0 animate-delay-200">
        <div className="flex items-center gap-2">
          <Shield className="w-3 h-3 text-destructive" />
          <span className="text-xs font-bold text-destructive">Admin Only</span>
        </div>
      </div>

      <div className="space-y-1 relative animate-fade-in-down">
        <h2 className="text-4xl font-bold tracking-tight text-primary">
          System Management
        </h2>
        <p className="text-muted-foreground text-lg">
          Manage ranks, qualifications, training schools, and system users
        </p>
      </div>

      {/* Maintenance Mode Card */}
      <Card variant="depth" className="animate-fade-in opacity-0">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Wrench className="w-5 h-5 text-primary" />
                <CardTitle className="text-primary">Maintenance Mode</CardTitle>
              </div>
              <CardDescription>
                Control system-wide maintenance status
              </CardDescription>
            </div>
            <div className="flex items-center gap-3">
              <div className="text-right">
                <div className={`text-sm font-medium ${maintenanceMode?.enabled ? 'text-amber-600' : 'text-green-600'}`}>
                  {maintenanceMode?.enabled ? 'ACTIVE' : 'Inactive'}
                </div>
                {maintenanceMode?.enabled && maintenanceMode.updatedAt && (
                  <div className="text-xs text-muted-foreground">
                    Since {new Date(maintenanceMode.updatedAt).toLocaleString()}
                  </div>
                )}
              </div>
              <Dialog open={maintenanceDialogOpen} onOpenChange={setMaintenanceDialogOpen}>
                <DialogTrigger asChild>
                  <Button 
                    variant={maintenanceMode?.enabled ? "destructive" : "default"}
                    onClick={() => {
                      setMaintenanceMessage(maintenanceMode?.message || "System is currently under maintenance. Please check back later.")
                    }}
                  >
                    {maintenanceMode?.enabled ? 'Disable' : 'Enable'}
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>
                      {maintenanceMode?.enabled ? 'Disable' : 'Enable'} Maintenance Mode
                    </DialogTitle>
                    <DialogDescription>
                      {maintenanceMode?.enabled 
                        ? 'This will allow users to access the system normally.'
                        : 'This will prevent non-admin users from accessing the system and display a maintenance message.'}
                    </DialogDescription>
                  </DialogHeader>
                  {!maintenanceMode?.enabled && (
                    <div className="grid gap-4 py-4">
                      <div className="grid gap-2">
                        <Label htmlFor="maintenance-message">Maintenance Message</Label>
                        <Input
                          id="maintenance-message"
                          value={maintenanceMessage}
                          onChange={(e) => setMaintenanceMessage(e.target.value)}
                          placeholder="System is currently under maintenance. Please check back later."
                        />
                        <p className="text-xs text-muted-foreground">
                          This message will be displayed to users attempting to access the system.
                        </p>
                      </div>
                    </div>
                  )}
                  <DialogFooter>
                    <Button type="button" variant="outline" onClick={() => setMaintenanceDialogOpen(false)}>
                      Cancel
                    </Button>
                    <Button 
                      type="button"
                      variant={maintenanceMode?.enabled ? "default" : "destructive"}
                      onClick={() => handleToggleMaintenance(!maintenanceMode?.enabled)}
                      disabled={isTogglingMaintenance}
                    >
                      {isTogglingMaintenance 
                        ? (maintenanceMode?.enabled ? 'Disabling...' : 'Enabling...') 
                        : (maintenanceMode?.enabled ? 'Disable Maintenance Mode' : 'Enable Maintenance Mode')}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>
          </div>
        </CardHeader>
        {maintenanceMode?.enabled && (
          <CardContent>
            <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-lg">
              <p className="text-sm text-amber-900 dark:text-amber-200">
                <strong>Active Message:</strong> {maintenanceMode.message}
              </p>
            </div>
          </CardContent>
        )}
      </Card>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        {/* Ranks Card */}
        <Card variant="depth" className="animate-scale-in opacity-0 animate-delay-100">
          <CardHeader>
            <div className="flex items-center gap-2 mb-2">
              <Star className="w-5 h-5 text-primary" />
              <CardTitle className="text-primary">Ranks</CardTitle>
            </div>
            <CardDescription>
              {ranks ? `${ranks.length} rank${ranks.length !== 1 ? 's' : ''}` : 'Loading...'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              Manage the rank structure and hierarchy for your unit
            </p>
            <Dialog open={ranksOpen} onOpenChange={setRanksOpen}>
              <DialogTrigger asChild>
                <Button className="w-full">Manage Ranks</Button>
              </DialogTrigger>
              <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Manage Ranks</DialogTitle>
                  <DialogDescription>
                    Add, view, and remove military ranks. Drag ranks to reorder them by promotion hierarchy (top = lowest, bottom = highest).
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <Dialog open={addRankOpen} onOpenChange={setAddRankOpen}>
                    <DialogTrigger asChild>
                      <Button className="w-full">Add New Rank</Button>
                    </DialogTrigger>
                    <DialogContent>
                      <form onSubmit={handleAddRank}>
                        <DialogHeader>
                          <DialogTitle>Add New Rank</DialogTitle>
                        </DialogHeader>
                        <div className="grid gap-4 py-4">
                          <div className="grid gap-2">
                            <Label htmlFor="rank-name">Rank Name</Label>
                            <Input
                              id="rank-name"
                              value={rankForm.name}
                              onChange={(e) => setRankForm({ ...rankForm, name: e.target.value })}
                              placeholder="e.g., Private"
                              required
                            />
                          </div>
                          <div className="grid gap-2">
                            <Label htmlFor="rank-abbr">Abbreviation</Label>
                            <Input
                              id="rank-abbr"
                              value={rankForm.abbreviation}
                              onChange={(e) => setRankForm({ ...rankForm, abbreviation: e.target.value })}
                              placeholder="e.g., PVT"
                              required
                            />
                          </div>
                          {error && (
                            <div className="bg-destructive/10 text-destructive text-sm p-3 rounded-md">
                              {error}
                            </div>
                          )}
                        </div>
                        <DialogFooter>
                          <Button type="button" variant="outline" onClick={() => setAddRankOpen(false)}>
                            Cancel
                          </Button>
                          <Button type="submit" disabled={isSubmitting}>
                            {isSubmitting ? "Creating..." : "Create"}
                          </Button>
                        </DialogFooter>
                      </form>
                    </DialogContent>
                  </Dialog>

                  {!localRanks ? (
                    <LoadingState message="Loading ranks..." />
                  ) : localRanks.length === 0 ? (
                    <EmptyState
                      icon={Star}
                      title="No ranks defined"
                      description="Add your first rank to get started"
                    />
                  ) : (
                    <DndContext
                      sensors={sensors}
                      collisionDetection={closestCenter}
                      onDragEnd={handleDragEnd}
                    >
                      <SortableContext
                        items={localRanks.map(r => r._id)}
                        strategy={verticalListSortingStrategy}
                      >
                        <div className="space-y-2">
                          {localRanks.map((rank) => (
                            <SortableRankItem
                              key={rank._id}
                              rank={rank}
                              onEdit={handleEditRank}
                              onDelete={handleDeleteRank}
                            />
                          ))}
                        </div>
                      </SortableContext>
                    </DndContext>
                  )}
                </div>

                {/* Edit Rank Dialog */}
                <Dialog open={editRankOpen} onOpenChange={setEditRankOpen}>
                  <DialogContent>
                    <form onSubmit={handleUpdateRank}>
                      <DialogHeader>
                        <DialogTitle>Edit Rank</DialogTitle>
                      </DialogHeader>
                      <div className="grid gap-4 py-4">
                        <div className="grid gap-2">
                          <Label htmlFor="edit-rank-name">Rank Name</Label>
                          <Input
                            id="edit-rank-name"
                            value={rankForm.name}
                            onChange={(e) => setRankForm({ ...rankForm, name: e.target.value })}
                            required
                          />
                        </div>
                        <div className="grid gap-2">
                          <Label htmlFor="edit-rank-abbr">Abbreviation</Label>
                          <Input
                            id="edit-rank-abbr"
                            value={rankForm.abbreviation}
                            onChange={(e) => setRankForm({ ...rankForm, abbreviation: e.target.value })}
                            required
                          />
                        </div>
                        {error && (
                          <div className="bg-destructive/10 text-destructive text-sm p-3 rounded-md">
                            {error}
                          </div>
                        )}
                      </div>
                      <DialogFooter>
                        <Button type="button" variant="outline" onClick={() => setEditRankOpen(false)}>
                          Cancel
                        </Button>
                        <Button type="submit" disabled={isSubmitting}>
                          {isSubmitting ? "Saving..." : "Save Changes"}
                        </Button>
                      </DialogFooter>
                    </form>
                  </DialogContent>
                </Dialog>
              </DialogContent>
            </Dialog>
          </CardContent>
        </Card>

        {/* Qualifications Card */}
        <Card variant="depth" className="animate-scale-in opacity-0 animate-delay-200">
          <CardHeader>
            <div className="flex items-center gap-2 mb-2">
              <GraduationCap className="w-5 h-5 text-primary" />
              <CardTitle className="text-primary">Qualifications</CardTitle>
            </div>
            <CardDescription>
              {qualifications ? `${qualifications.length} qualification${qualifications.length !== 1 ? 's' : ''}` : 'Loading...'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              Manage certifications and specializations for personnel
            </p>
            <Dialog open={qualificationsOpen} onOpenChange={setQualificationsOpen}>
              <DialogTrigger asChild>
                <Button className="w-full">Manage Qualifications</Button>
              </DialogTrigger>
              <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Manage Qualifications</DialogTitle>
                  <DialogDescription>
                    Add, view, and remove qualifications. Search to filter.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <div className="flex gap-2">
                      <Input
                        placeholder="Search qualifications..."
                        value={qualificationSearch}
                        onChange={(e) => setQualificationSearch(e.target.value)}
                        className="flex-1"
                      />
                      <Dialog open={addQualOpen} onOpenChange={setAddQualOpen}>
                        <DialogTrigger asChild>
                          <Button>Add New</Button>
                        </DialogTrigger>
                        <DialogContent>
                      <form onSubmit={handleAddQualification}>
                        <DialogHeader>
                          <DialogTitle>Add New Qualification</DialogTitle>
                        </DialogHeader>
                        <div className="grid gap-4 py-4">
                          <div className="grid gap-2">
                            <Label htmlFor="qual-name">Name</Label>
                            <Input
                              id="qual-name"
                              value={qualForm.name}
                              onChange={(e) => setQualForm({ ...qualForm, name: e.target.value })}
                              placeholder="e.g., Marksman"
                              required
                            />
                          </div>
                          <div className="grid gap-2">
                            <Label htmlFor="qual-abbr">Abbreviation</Label>
                            <Input
                              id="qual-abbr"
                              value={qualForm.abbreviation}
                              onChange={(e) => setQualForm({ ...qualForm, abbreviation: e.target.value })}
                              placeholder="e.g., MKS"
                              required
                            />
                          </div>
                          <div className="grid gap-2">
                            <Label htmlFor="qual-school">School</Label>
                            <select
                              id="qual-school"
                              value={qualForm.schoolId}
                              onChange={(e) => setQualForm({ ...qualForm, schoolId: e.target.value })}
                              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                              required
                            >
                              <option value="">Select a school...</option>
                              {schools?.map((school) => (
                                <option key={school._id} value={school._id}>
                                  {school.name}
                                </option>
                              ))}
                            </select>
                          </div>
                          <div className="grid gap-2">
                            <Label htmlFor="qual-desc">Description</Label>
                            <Input
                              id="qual-desc"
                              value={qualForm.description}
                              onChange={(e) => setQualForm({ ...qualForm, description: e.target.value })}
                              placeholder="Optional"
                            />
                          </div>
                          {error && (
                            <div className="bg-destructive/10 text-destructive text-sm p-3 rounded-md">
                              {error}
                            </div>
                          )}
                        </div>
                        <DialogFooter>
                          <Button type="button" variant="outline" onClick={() => setAddQualOpen(false)}>
                            Cancel
                          </Button>
                          <Button type="submit" disabled={isSubmitting || !schools || schools.length === 0}>
                            {isSubmitting ? "Creating..." : "Create"}
                          </Button>
                        </DialogFooter>
                      </form>
                    </DialogContent>
                      </Dialog>
                    </div>
                    {qualificationSearch && (
                      <p className="text-sm text-muted-foreground">
                        Showing {filteredQualifications?.length || 0} of {qualifications?.length || 0} qualifications
                      </p>
                    )}
                  </div>

                  {!qualifications ? (
                    <LoadingState message="Loading qualifications..." />
                  ) : filteredQualifications && filteredQualifications.length === 0 ? (
                    <EmptyState
                      icon={GraduationCap}
                      title={qualificationSearch ? "No qualifications match your search" : "No qualifications defined"}
                      description={qualificationSearch ? "Try adjusting your search criteria" : "Add your first qualification to get started"}
                    />
                  ) : (
                    <div className="space-y-2">
                      {filteredQualifications?.map((qual) => (
                        <div
                          key={qual._id}
                          className="flex items-center justify-between p-3 border rounded-lg"
                        >
                          <div>
                            <p className="font-medium">{qual.name} ({qual.abbreviation})</p>
                            <p className="text-sm text-muted-foreground">
                              {qual.school?.name} • {qual.personnelCount} member{qual.personnelCount !== 1 ? 's' : ''}
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            <Button variant="outline" size="sm" onClick={() => handleEditQualification(qual)}>
                              Edit
                            </Button>
                            <Button 
                              variant="destructive" 
                              size="sm"
                              onClick={() => setDeleteQualId(qual._id)}
                            >
                              Delete
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Edit Qualification Dialog */}
                <Dialog open={editQualOpen} onOpenChange={setEditQualOpen}>
                  <DialogContent>
                    <form onSubmit={handleUpdateQualification}>
                      <DialogHeader>
                        <DialogTitle>Edit Qualification</DialogTitle>
                      </DialogHeader>
                      <div className="grid gap-4 py-4">
                        <div className="grid gap-2">
                          <Label htmlFor="edit-qual-name">Name</Label>
                          <Input
                            id="edit-qual-name"
                            value={qualForm.name}
                            onChange={(e) => setQualForm({ ...qualForm, name: e.target.value })}
                            required
                          />
                        </div>
                        <div className="grid gap-2">
                          <Label htmlFor="edit-qual-abbr">Abbreviation</Label>
                          <Input
                            id="edit-qual-abbr"
                            value={qualForm.abbreviation}
                            onChange={(e) => setQualForm({ ...qualForm, abbreviation: e.target.value })}
                            required
                          />
                        </div>
                        <div className="grid gap-2">
                          <Label htmlFor="edit-qual-school">School</Label>
                          <select
                            id="edit-qual-school"
                            value={qualForm.schoolId}
                            onChange={(e) => setQualForm({ ...qualForm, schoolId: e.target.value })}
                            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                            required
                          >
                            <option value="">Select a school...</option>
                            {schools?.map((school) => (
                              <option key={school._id} value={school._id}>
                                {school.name}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div className="grid gap-2">
                          <Label htmlFor="edit-qual-desc">Description</Label>
                          <Input
                            id="edit-qual-desc"
                            value={qualForm.description}
                            onChange={(e) => setQualForm({ ...qualForm, description: e.target.value })}
                          />
                        </div>
                        {error && (
                          <div className="bg-destructive/10 text-destructive text-sm p-3 rounded-md">
                            {error}
                          </div>
                        )}
                      </div>
                      <DialogFooter>
                        <Button type="button" variant="outline" onClick={() => setEditQualOpen(false)}>
                          Cancel
                        </Button>
                        <Button type="submit" disabled={isSubmitting}>
                          {isSubmitting ? "Saving..." : "Save Changes"}
                        </Button>
                      </DialogFooter>
                    </form>
                  </DialogContent>
                </Dialog>
              </DialogContent>
            </Dialog>
          </CardContent>
        </Card>

        {/* Schools Card */}
        <Card variant="depth" className="animate-scale-in opacity-0 animate-delay-300">
          <CardHeader>
            <div className="flex items-center gap-2 mb-2">
              <School className="w-5 h-5 text-primary" />
              <CardTitle className="text-primary">Training Schools</CardTitle>
            </div>
            <CardDescription>
              {schools ? `${schools.length} school${schools.length !== 1 ? 's' : ''}` : 'Loading...'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              Manage training schools that group qualifications
            </p>
            <Dialog open={schoolsOpen} onOpenChange={setSchoolsOpen}>
              <DialogTrigger asChild>
                <Button className="w-full">Manage Schools</Button>
              </DialogTrigger>
              <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Manage Schools</DialogTitle>
                  <DialogDescription>
                    Add, view, and remove training schools
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <Dialog open={addSchoolOpen} onOpenChange={setAddSchoolOpen}>
                    <DialogTrigger asChild>
                      <Button className="w-full">Add New School</Button>
                    </DialogTrigger>
                    <DialogContent>
                      <form onSubmit={handleAddSchool}>
                        <DialogHeader>
                          <DialogTitle>Add New School</DialogTitle>
                        </DialogHeader>
                        <div className="grid gap-4 py-4">
                          <div className="grid gap-2">
                            <Label htmlFor="school-name">School Name</Label>
                            <Input
                              id="school-name"
                              value={schoolForm.name}
                              onChange={(e) => setSchoolForm({ ...schoolForm, name: e.target.value })}
                              placeholder="e.g., Infantry School"
                              required
                            />
                          </div>
                          <div className="grid gap-2">
                            <Label htmlFor="school-abbr">Abbreviation</Label>
                            <Input
                              id="school-abbr"
                              value={schoolForm.abbreviation}
                              onChange={(e) => setSchoolForm({ ...schoolForm, abbreviation: e.target.value })}
                              placeholder="e.g., INF"
                              required
                            />
                          </div>
                          <div className="grid gap-2">
                            <Label htmlFor="school-desc">Description</Label>
                            <Input
                              id="school-desc"
                              value={schoolForm.description}
                              onChange={(e) => setSchoolForm({ ...schoolForm, description: e.target.value })}
                              placeholder="Optional"
                            />
                          </div>
                          {error && (
                            <div className="bg-destructive/10 text-destructive text-sm p-3 rounded-md">
                              {error}
                            </div>
                          )}
                        </div>
                        <DialogFooter>
                          <Button type="button" variant="outline" onClick={() => setAddSchoolOpen(false)}>
                            Cancel
                          </Button>
                          <Button type="submit" disabled={isSubmitting}>
                            {isSubmitting ? "Creating..." : "Create"}
                          </Button>
                        </DialogFooter>
                      </form>
                    </DialogContent>
                  </Dialog>

                  {!schools ? (
                    <LoadingState message="Loading schools..." />
                  ) : schools.length === 0 ? (
                    <EmptyState
                      icon={School}
                      title="No schools defined"
                      description="Add your first training school to get started"
                    />
                  ) : (
                    <div className="space-y-2">
                      {schools.map((school) => (
                        <div
                          key={school._id}
                          className="flex items-center justify-between p-3 border rounded-lg"
                        >
                          <div className="flex-1">
                            <p className="font-medium">{school.name}</p>
                            <p className="text-sm text-muted-foreground">
                              {school.abbreviation}
                              {(() => {
                                const schoolQuals = qualifications?.filter(q => q.schoolId === school._id) || []
                                return schoolQuals.length > 0 ? ` • ${schoolQuals.length} qualification${schoolQuals.length !== 1 ? 's' : ''}` : ''
                              })()}
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            <Button variant="outline" size="sm" onClick={() => setViewingSchoolId(school._id)}>
                              View
                            </Button>
                            <Button variant="outline" size="sm" onClick={() => handleEditSchool(school)}>
                              Edit
                            </Button>
                            <Button 
                              variant="destructive" 
                              size="sm"
                              onClick={() => setDeleteSchoolId(school._id)}
                            >
                              Delete
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* School Detail View Dialog */}
                <Dialog open={viewingSchoolId !== null} onOpenChange={(open) => !open && setViewingSchoolId(null)}>
                  <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                    <DialogHeader>
                      <DialogTitle>
                        {schools?.find(s => s._id === viewingSchoolId)?.name || "School Details"}
                      </DialogTitle>
                      <DialogDescription>
                        Qualifications in this school
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                      {(() => {
                        const schoolQuals = qualifications?.filter(q => q.schoolId === viewingSchoolId) || []
                        const currentSchool = schools?.find(s => s._id === viewingSchoolId)
                        
                        return (
                          <>
                            {(currentSchool as SchoolItem & { description?: string })?.description && (
                              <div className="p-3 bg-muted/50 rounded-lg">
                                <p className="text-sm">{(currentSchool as SchoolItem & { description?: string }).description}</p>
                              </div>
                            )}
                            
                            {/* Instructors Section */}
                            <div>
                              <h3 className="font-semibold mb-3">
                                Instructors ({schoolInstructors?.length || 0})
                              </h3>
                              {!schoolInstructors ? (
                                <p className="text-center text-muted-foreground py-4 text-sm">Loading...</p>
                              ) : schoolInstructors.length === 0 ? (
                                <p className="text-center text-muted-foreground py-4 text-sm">
                                  No instructors assigned to this school
                                </p>
                              ) : (
                                <div className="grid gap-2 grid-cols-2">
                                  {schoolInstructors.map((instructor) => (
                                    <div
                                      key={instructor._id}
                                      className="p-2 border rounded-md bg-muted/30"
                                    >
                                      <p className="text-sm font-medium">{instructor.name}</p>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>

                            {/* Qualifications Section */}
                            <div>
                              <h3 className="font-semibold mb-3">
                                Qualifications ({schoolQuals.length})
                              </h3>
                              {schoolQuals.length === 0 ? (
                                <p className="text-center text-muted-foreground py-8">
                                  No qualifications in this school yet
                                </p>
                              ) : (
                                <div className="space-y-2">
                                  {schoolQuals.map((qual) => (
                                    <div
                                      key={qual._id}
                                      className="flex items-center justify-between p-3 border rounded-lg"
                                    >
                                      <div>
                                        <p className="font-medium">{qual.name}</p>
                                        <p className="text-sm text-muted-foreground">
                                          {qual.abbreviation}
                                        </p>
                                        <p className="text-xs text-muted-foreground mt-1">
                                          {qual.personnelCount} member{qual.personnelCount !== 1 ? 's' : ''} qualified
                                        </p>
                                      </div>
                                      <div className="flex items-center gap-2">
                                        <Button 
                                          variant="outline" 
                                          size="sm" 
                                          onClick={() => {
                                            setViewingSchoolId(null)
                                            handleEditQualification(qual)
                                          }}
                                        >
                                          Edit
                                        </Button>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          </>
                        )
                      })()}
                    </div>
                    <DialogFooter>
                      <Button onClick={() => setViewingSchoolId(null)}>Close</Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>

                {/* Edit School Dialog */}
                <Dialog open={editSchoolOpen} onOpenChange={setEditSchoolOpen}>
                  <DialogContent>
                    <form onSubmit={handleUpdateSchool}>
                      <DialogHeader>
                        <DialogTitle>Edit School</DialogTitle>
                      </DialogHeader>
                      <div className="grid gap-4 py-4">
                        <div className="grid gap-2">
                          <Label htmlFor="edit-school-name">School Name</Label>
                          <Input
                            id="edit-school-name"
                            value={schoolForm.name}
                            onChange={(e) => setSchoolForm({ ...schoolForm, name: e.target.value })}
                            required
                          />
                        </div>
                        <div className="grid gap-2">
                          <Label htmlFor="edit-school-abbr">Abbreviation</Label>
                          <Input
                            id="edit-school-abbr"
                            value={schoolForm.abbreviation}
                            onChange={(e) => setSchoolForm({ ...schoolForm, abbreviation: e.target.value })}
                            required
                          />
                        </div>
                        <div className="grid gap-2">
                          <Label htmlFor="edit-school-desc">Description</Label>
                          <Input
                            id="edit-school-desc"
                            value={schoolForm.description}
                            onChange={(e) => setSchoolForm({ ...schoolForm, description: e.target.value })}
                          />
                        </div>
                        {error && (
                          <div className="bg-destructive/10 text-destructive text-sm p-3 rounded-md">
                            {error}
                          </div>
                        )}
                      </div>
                      <DialogFooter>
                        <Button type="button" variant="outline" onClick={() => setEditSchoolOpen(false)}>
                          Cancel
                        </Button>
                        <Button type="submit" disabled={isSubmitting}>
                          {isSubmitting ? "Saving..." : "Save Changes"}
                        </Button>
                      </DialogFooter>
                    </form>
                  </DialogContent>
                </Dialog>
              </DialogContent>
            </Dialog>
          </CardContent>
        </Card>

        {/* System Users Card */}
        <Card variant="depth" className="animate-scale-in opacity-0 animate-delay-400">
          <CardHeader>
            <div className="flex items-center gap-2 mb-2">
              <Users2 className="w-5 h-5 text-primary" />
              <CardTitle className="text-primary">System Users</CardTitle>
            </div>
            <CardDescription>
              {systemUsers ? `${systemUsers.length} user${systemUsers.length !== 1 ? 's' : ''}` : 'Loading...'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              Manage user accounts and access permissions
            </p>
            <Dialog open={usersOpen} onOpenChange={setUsersOpen}>
              <DialogTrigger asChild>
                <Button className="w-full">Manage Users</Button>
              </DialogTrigger>
              <DialogContent className="max-w-5xl max-h-[85vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Manage System Users</DialogTitle>
                  <DialogDescription>
                    Create and manage user accounts with their roles and permissions
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <div className="flex gap-2">
                      <Input
                        placeholder="Search users..."
                        value={userSearch}
                        onChange={(e) => setUserSearch(e.target.value)}
                        className="flex-1"
                      />
                      <Dialog open={addUserOpen} onOpenChange={setAddUserOpen}>
                        <DialogTrigger asChild>
                          <Button>Add New User</Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-2xl">
                          <form onSubmit={handleAddUser}>
                            <DialogHeader>
                              <DialogTitle>Create New User</DialogTitle>
                              <DialogDescription>
                                Add a new system user with login credentials
                              </DialogDescription>
                            </DialogHeader>
                            <div className="grid gap-4 py-4">
                              <div className="grid gap-2">
                                <Label htmlFor="user-name">Username</Label>
                                <Input
                                  id="user-name"
                                  value={userForm.name}
                                  onChange={(e) => setUserForm({ ...userForm, name: e.target.value })}
                                  placeholder="e.g., jsmith or john.smith"
                                  required
                                />
                              </div>
                              <div className="grid gap-2">
                                <Label>Temporary Password</Label>
                                <div className="flex gap-2">
                                  <div className="relative flex-1">
                                    <Input
                                      type={showPassword ? "text" : "password"}
                                      value={generatedPassword}
                                      readOnly
                                      placeholder="Click Generate to create password"
                                      className="pr-10"
                                    />
                                    {generatedPassword && (
                                      <button
                                        type="button"
                                        onClick={() => setShowPassword(!showPassword)}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                                      >
                                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                      </button>
                                    )}
                                  </div>
                                  <Button type="button" variant="outline" onClick={handleGeneratePassword}>
                                    Generate
                                  </Button>
                                  {generatedPassword && (
                                    <Button 
                                      type="button" 
                                      variant="outline" 
                                      onClick={handleCopyPassword}
                                      className="w-10 p-0"
                                    >
                                      {passwordCopied ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
                                    </Button>
                                  )}
                                </div>
                                <p className="text-xs text-muted-foreground">
                                  User will be required to change password on first login
                                </p>
                              </div>
                              <CheckboxList
                                label="Roles"
                                options={getRoleOptions()}
                                selected={userForm.roles}
                                onChange={(selected) => setUserForm({ ...userForm, roles: selected })}
                              />
                              <p className="text-xs text-muted-foreground -mt-2">
                                Note: Only Super Admins can create Super Admin accounts
                              </p>
                              {error && (
                                <div className="bg-destructive/10 text-destructive text-sm p-3 rounded-md">
                                  {error}
                                </div>
                              )}
                            </div>
                            <DialogFooter>
                              <Button type="button" variant="outline" onClick={() => {
                                setAddUserOpen(false)
                                setUserForm({ name: "", password: "", roles: [] })
                                setGeneratedPassword("")
                                setPasswordCopied(false)
                                setShowPassword(false)
                              }}>
                                Cancel
                              </Button>
                              <Button type="submit" disabled={isSubmitting || !generatedPassword}>
                                {isSubmitting ? "Creating..." : "Create User"}
                              </Button>
                            </DialogFooter>
                          </form>
                        </DialogContent>
                      </Dialog>
                    </div>
                    {userSearch && (
                      <p className="text-sm text-muted-foreground">
                        Showing {filteredUsers?.length || 0} of {systemUsers?.length || 0} users
                      </p>
                    )}
                  </div>

                  {!systemUsers ? (
                    <LoadingState message="Loading users..." />
                  ) : filteredUsers && filteredUsers.length === 0 ? (
                    <EmptyState
                      icon={Users2}
                      title={userSearch ? "No users match your search" : "No users defined"}
                      description={userSearch ? "Try adjusting your search criteria" : "Add your first user to get started"}
                    />
                  ) : (
                    <div className="border rounded-lg overflow-hidden">
                      <table className="w-full">
                        <thead className="bg-muted/50">
                          <tr>
                            <th className="text-left p-3 text-sm font-semibold">Username</th>
                            <th className="text-left p-3 text-sm font-semibold">Roles</th>
                            <th className="text-left p-3 text-sm font-semibold">Status</th>
                            <th className="text-right p-3 text-sm font-semibold">Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {filteredUsers?.map((user) => (
                            <tr key={user._id} className="border-t hover:bg-muted/30 transition-colors">
                              <td className="p-3">
                                <div className="font-medium">{user.name}</div>
                                {user.requirePasswordChange && (
                                  <span className="text-xs text-amber-600">Requires password change</span>
                                )}
                              </td>
                              <td className="p-3">
                                <div className="flex flex-wrap gap-1">
                                  {user.roles.map((roleName) => {
                                    // Find the role details from available roles
                                    const roleDetails = availableRoles?.find(r => r.roleName === roleName)
                                    const roleStyles = getRoleColorStyles(roleName, roleDetails?.color, isDarkMode)
                                    return (
                                      <span
                                        key={roleName}
                                        className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border"
                                        style={{
                                          backgroundColor: roleStyles.backgroundColor,
                                          borderColor: roleStyles.borderColor,
                                          color: roleStyles.color,
                                        }}
                                      >
                                        {roleDetails?.displayName || formatRole(roleName as "administrator" | "game_master" | "instructor" | "super_admin")}
                                      </span>
                                    )
                                  })}
                                </div>
                              </td>
                              <td className="p-3">
                                <span
                                  className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                                    user.isActive
                                      ? "bg-green-500/10 text-green-600 border border-green-500/20"
                                      : "bg-red-500/10 text-red-600 border border-red-500/20"
                                  }`}
                                >
                                  {user.isActive ? "Active" : "Inactive"}
                                </span>
                              </td>
                              <td className="p-3">
                                <div className="flex items-center justify-end gap-2">
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleEditUser(user)}
                                    className="h-8 w-8 p-0"
                                    title="Edit user info"
                                  >
                                    <Pencil className="w-4 h-4" />
                                  </Button>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => handleEditUserRoles(user)}
                                  >
                                    Edit Roles
                                  </Button>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => handleResetPassword(user)}
                                    title="Reset password"
                                  >
                                    <KeyRound className="w-4 h-4 mr-1" />
                                    Reset Password
                                  </Button>
                                  {!user.roles.includes("super_admin") && (
                                    <Button
                                      variant={user.isActive ? "destructive" : "default"}
                                      size="sm"
                                      onClick={() => handleToggleUserStatus(user._id)}
                                    >
                                      {user.isActive ? "Deactivate" : "Activate"}
                                    </Button>
                                  )}
                                  {user.roles.includes("super_admin") && (
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      disabled
                                      title="Super Administrators cannot be deactivated"
                                    >
                                      Protected
                                    </Button>
                                  )}
                                  {!user.roles.includes("super_admin") && (
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className="h-8 w-8 p-0 text-destructive hover:text-destructive hover:bg-destructive/10"
                                      title="Delete user"
                                      onClick={() => setDeleteUserId(user._id)}
                                    >
                                      <Trash2 className="w-4 h-4" />
                                    </Button>
                                  )}
                                  {user.roles.includes("super_admin") && (
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className="h-8 w-8 p-0"
                                      disabled
                                      title="Super Administrators cannot be deleted"
                                    >
                                      <Shield className="w-4 h-4 text-primary" />
                                    </Button>
                                  )}
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>

                {/* Edit User Info Dialog */}
                <Dialog open={editUserOpen} onOpenChange={setEditUserOpen}>
                  <DialogContent>
                    <form onSubmit={handleUpdateUser}>
                      <DialogHeader>
                        <DialogTitle>Edit Username</DialogTitle>
                        <DialogDescription>
                          Update the username for this user
                        </DialogDescription>
                      </DialogHeader>
                      <div className="grid gap-4 py-4">
                        <div className="grid gap-2">
                          <Label htmlFor="edit-user-name">Username</Label>
                          <Input
                            id="edit-user-name"
                            value={editUserForm.name}
                            onChange={(e) => setEditUserForm({ ...editUserForm, name: e.target.value })}
                            placeholder="e.g., jsmith"
                            required
                          />
                        </div>
                        {error && (
                          <div className="bg-destructive/10 text-destructive text-sm p-3 rounded-md">
                            {error}
                          </div>
                        )}
                      </div>
                      <DialogFooter>
                        <Button type="button" variant="outline" onClick={() => {
                          setEditUserOpen(false)
                          setEditUserForm({ name: "" })
                          setEditingUserId(null)
                        }}>
                          Cancel
                        </Button>
                        <Button type="submit" disabled={isSubmitting}>
                          {isSubmitting ? "Saving..." : "Save Changes"}
                        </Button>
                      </DialogFooter>
                    </form>
                  </DialogContent>
                </Dialog>

                {/* Edit User Roles Dialog */}
                <Dialog open={editUserRolesOpen} onOpenChange={setEditUserRolesOpen}>
                  <DialogContent>
                    <form onSubmit={handleUpdateUserRoles}>
                      <DialogHeader>
                        <DialogTitle>Edit User Roles</DialogTitle>
                        <DialogDescription>
                          Update the roles assigned to this user
                        </DialogDescription>
                      </DialogHeader>
                      <div className="grid gap-4 py-4">
                        <CheckboxList
                          label="Roles"
                          options={getRoleOptions()}
                          selected={editRolesForm}
                          onChange={setEditRolesForm}
                        />
                        <p className="text-xs text-muted-foreground -mt-2">
                          Note: Only Super Admins can assign Super Admin role
                        </p>
                        {error && (
                          <div className="bg-destructive/10 text-destructive text-sm p-3 rounded-md">
                            {error}
                          </div>
                        )}
                      </div>
                      <DialogFooter>
                        <Button type="button" variant="outline" onClick={() => {
                          setEditUserRolesOpen(false)
                          setEditRolesForm([])
                          setEditingUserId(null)
                        }}>
                          Cancel
                        </Button>
                        <Button type="submit" disabled={isSubmitting}>
                          {isSubmitting ? "Saving..." : "Save Changes"}
                        </Button>
                      </DialogFooter>
                    </form>
                  </DialogContent>
                </Dialog>

                {/* Reset Password Dialog */}
                <Dialog open={resetPasswordOpen} onOpenChange={(open) => !open && handleCloseResetPassword()}>
                  <DialogContent className="max-w-md">
                    <DialogHeader>
                      <DialogTitle className="flex items-center gap-2">
                        <KeyRound className="w-5 h-5 text-primary" />
                        Reset Password
                      </DialogTitle>
                      <DialogDescription>
                        {!resetTemporaryPassword 
                          ? `Generate a new temporary password for ${resetPasswordUsername}`
                          : "Password has been reset successfully"}
                      </DialogDescription>
                    </DialogHeader>
                    
                    {!resetTemporaryPassword ? (
                      <div className="space-y-4 py-4">
                        <div className="p-4 bg-amber-500/10 border border-amber-500/30 rounded-lg">
                          <p className="text-sm text-amber-900 dark:text-amber-200">
                            <strong>Warning:</strong> This will generate a new temporary password for <strong>{resetPasswordUsername}</strong>. 
                            The user will be required to change this password on their next login.
                          </p>
                        </div>
                        {error && (
                          <div className="bg-destructive/10 text-destructive text-sm p-3 rounded-md">
                            {error}
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="space-y-4 py-4">
                        <div className="p-4 bg-green-500/10 border border-green-500/30 rounded-lg">
                          <p className="text-sm text-green-900 dark:text-green-200 mb-3">
                            Password has been reset successfully. The user will be required to change this password on their next login.
                          </p>
                          <div className="space-y-2">
                            <Label className="text-green-900 dark:text-green-200">Temporary Password</Label>
                            <div className="flex gap-2">
                              <div className="relative flex-1">
                                <Input
                                  type={showResetPassword ? "text" : "password"}
                                  value={resetTemporaryPassword}
                                  readOnly
                                  className="pr-10 font-mono bg-background"
                                />
                                <button
                                  type="button"
                                  onClick={() => setShowResetPassword(!showResetPassword)}
                                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                                >
                                  {showResetPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                </button>
                              </div>
                              <Button 
                                type="button" 
                                variant="outline" 
                                onClick={handleCopyResetPassword}
                                className="w-10 p-0"
                              >
                                {resetPasswordCopied ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
                              </Button>
                            </div>
                            <p className="text-xs text-muted-foreground">
                              Make sure to save this password and share it securely with the user.
                            </p>
                          </div>
                        </div>
                      </div>
                    )}

                    <DialogFooter>
                      {!resetTemporaryPassword ? (
                        <>
                          <Button type="button" variant="outline" onClick={handleCloseResetPassword}>
                            Cancel
                          </Button>
                          <Button 
                            type="button" 
                            onClick={handleConfirmResetPassword}
                            disabled={isSubmitting}
                          >
                            {isSubmitting ? "Resetting..." : "Reset Password"}
                          </Button>
                        </>
                      ) : (
                        <Button type="button" onClick={handleCloseResetPassword}>
                          Done
                        </Button>
                      )}
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </DialogContent>
            </Dialog>
          </CardContent>
        </Card>
      </div>

      {/* Delete Confirmation Dialogs */}
      <ConfirmationDialog
        open={deleteQualId !== null}
        onOpenChange={(open) => !open && setDeleteQualId(null)}
        title={`Delete ${qualifications?.find(q => q._id === deleteQualId)?.name}?`}
        description={
          deleteQualId ? (
            <div>
              <p>This action cannot be undone.</p>
              {(() => {
                const qual = qualifications?.find(q => q._id === deleteQualId)
                return qual && qual.personnelCount > 0 ? (
                  <p className="mt-2 text-destructive font-medium">
                    Warning: Awarded to {qual.personnelCount} member(s).
                  </p>
                ) : null
              })()}
            </div>
          ) : ""
        }
        actionText="Delete"
        onConfirm={() => {
          if (deleteQualId) handleDeleteQualification(deleteQualId)
        }}
      />

      <ConfirmationDialog
        open={deleteSchoolId !== null}
        onOpenChange={(open) => !open && setDeleteSchoolId(null)}
        title={`Delete ${schools?.find(s => s._id === deleteSchoolId)?.name}?`}
        description="This will remove all instructor assignments. Cannot delete if qualifications are assigned."
        actionText="Delete"
        onConfirm={() => {
          if (deleteSchoolId) handleDeleteSchool(deleteSchoolId)
        }}
      />

      <ConfirmationDialog
        open={deleteUserId !== null}
        onOpenChange={(open) => !open && setDeleteUserId(null)}
        title={`Delete ${systemUsers?.find(u => u._id === deleteUserId)?.name}?`}
        description="This action cannot be undone. This will permanently delete the user account and remove all associated data including roles and instructor assignments."
        actionText="Delete"
        onConfirm={() => {
          if (deleteUserId) handleDeleteUser(deleteUserId)
        }}
      />
    </div>
  )
}

