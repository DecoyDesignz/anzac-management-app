"use client"

import { useState } from "react"
import { useQuery } from "convex/react"
import { useSession } from "next-auth/react"
import { api } from "../../../convex/_generated/api"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
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
import { Label } from "@/components/ui/label"
import { CheckCircle, Plus, Award, Users, StickyNote } from "lucide-react"
import { useMutation } from "convex/react"
import { Id } from "../../../convex/_generated/dataModel"
import { useToast } from "@/hooks/use-toast"
import { getUserFriendlyError } from "@/lib/utils"

type SchoolData = {
  _id: string
  name: string
  abbreviation: string
}

type QualificationData = {
  _id: string
  name: string
  abbreviation: string
}

interface QualificationMatrixProps {
  personnelId?: string
  onPersonnelSelect?: (personnelId: string) => void
  compact?: boolean
}

export function QualificationMatrix({ 
  personnelId, 
  onPersonnelSelect, 
  compact = false 
}: QualificationMatrixProps) {
  const { data: session } = useSession()
  const { toast } = useToast()
  const [selectedPersonnel, setSelectedPersonnel] = useState<string[]>([])
  const [selectedQualification, setSelectedQualification] = useState<string>("")
  const [awardModalOpen, setAwardModalOpen] = useState(false)

  // Fetch data
  const personnel = useQuery(
    api.personnel.listPersonnelWithQualifications,
    session?.user?.id ? { userId: session.user.id as Id<"personnel">, status: "active" } : "skip"
  )
  const qualifications = useQuery(api.qualifications.listQualificationsWithCounts, session?.user?.id ? { userId: session.user.id as Id<"personnel"> } : "skip")
  const schools = useQuery(api.schools.listSchools, session?.user?.id ? { userId: session.user.id as Id<"personnel"> } : "skip")

  // Mutations
  const awardQualification = useMutation(api.personnel.awardQualification)

  // Group qualifications by school (filtering happens later after personnelWithQuals is computed)
  const allQualificationsBySchool = schools?.reduce((acc, school) => {
    const schoolQuals = qualifications?.filter(q => q.schoolId === school._id) || []
    acc[school._id] = {
      school,
      qualifications: schoolQuals
    }
    return acc
  }, {} as Record<string, { school: SchoolData; qualifications: QualificationData[] }>) || {}

  const handleAwardQualification = async () => {
    if (!selectedQualification || selectedPersonnel.length === 0 || !session?.user?.id) return

    const selectedQual = qualifications?.find(q => q._id === selectedQualification)
    const successCount = { count: 0 }
    const errors: string[] = []

    try {
      for (const pId of selectedPersonnel) {
        try {
          await awardQualification({
            userId: session.user.id as Id<"personnel">,
            personnelId: pId as Id<"personnel">,
            qualificationId: selectedQualification as Id<"qualifications">,
            awardedDate: Date.now(),
            notes: `Awarded via qualification matrix`
          })
          successCount.count++
        } catch (err) {
          // Extract the personnel name from the error or use ID
          const errorMsg = getUserFriendlyError(err)
          errors.push(errorMsg)
        }
      }
      
      // Show success/error messages
      if (successCount.count > 0) {
        toast({
          title: "Qualification Awarded",
          description: `${selectedQual?.name} awarded to ${successCount.count} personnel.`,
        })
      }
      
      if (errors.length > 0) {
        // Show first error in detail, count others
        if (errors.length === 1) {
          toast({
            title: "Award Failed",
            description: errors[0],
            variant: "destructive",
          })
        } else {
          toast({
            title: "Some Awards Failed",
            description: `${errors.length} personnel already have this qualification. ${successCount.count > 0 ? `Successfully awarded to ${successCount.count} others.` : ''}`,
            variant: "destructive",
          })
        }
      }
      
      setAwardModalOpen(false)
      setSelectedPersonnel([])
      setSelectedQualification("")
    } catch (error) {
      toast({
        title: "Error",
        description: getUserFriendlyError(error),
        variant: "destructive",
      })
    }
  }

  // Get personnel with their qualifications
  const personnelWithQuals = personnel?.map(person => {
    const personQuals = new Set(person.qualifications?.map(q => q._id) || [])
    return {
      ...person,
      qualificationIds: personQuals
    }
  }) || []

  // Get set of qualification IDs that at least one person has
  const awardedQualificationIds = new Set<string>()
  personnelWithQuals.forEach(person => {
    person.qualificationIds.forEach(qualId => {
      awardedQualificationIds.add(qualId)
    })
  })

  // Filter qualifications to only show those that have been awarded to at least one person
  const qualificationsBySchool = Object.entries(allQualificationsBySchool).reduce((acc, [schoolId, data]) => {
    const awardedQuals = data.qualifications.filter(qual => awardedQualificationIds.has(qual._id))
    if (awardedQuals.length > 0) {
      acc[schoolId] = {
        school: data.school,
        qualifications: awardedQuals
      }
    }
    return acc
  }, {} as Record<string, { school: SchoolData; qualifications: QualificationData[] }>)

  if (compact) {
    // Compact view for personnel detail modal - only show qualifications the person has
    const personQualIds = personnelWithQuals.find(p => p._id === personnelId)?.qualificationIds || new Set()
    
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">Qualifications</h3>
          <Badge variant="secondary" className="flex items-center gap-1">
            <Award className="w-3 h-3" />
            {personQualIds.size}
          </Badge>
        </div>
        
        {personQualIds.size === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Award className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p className="text-sm">No qualifications awarded yet</p>
          </div>
        ) : (
          <div className="space-y-3">
            {Object.values(allQualificationsBySchool).map(({ school, qualifications }) => {
              const personSchoolQuals = qualifications.filter(qual => personQualIds.has(qual._id as Id<"qualifications">))
              
              if (personSchoolQuals.length === 0) return null
              
              return (
                <div key={school._id} className="space-y-2">
                  <h4 className="text-sm font-medium text-primary">{school.name}</h4>
                  <div className="grid grid-cols-2 gap-2">
                    {personSchoolQuals.map(qual => (
                      <div 
                        key={qual._id}
                        className="flex items-center gap-2 p-2 rounded-lg border bg-green-50 border-green-200 dark:bg-green-900/20 dark:border-green-800"
                      >
                        <CheckCircle className="w-4 h-4 text-green-600" />
                        <span className="text-sm font-medium">{qual.name}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    )
  }

  return (
    <Card variant="depth">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-xl text-primary flex items-center gap-2">
              <Award className="w-5 h-5" />
              Qualification Matrix
            </CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              Visual overview of personnel qualifications across all schools
            </p>
          </div>
          <Dialog open={awardModalOpen} onOpenChange={setAwardModalOpen}>
            <DialogTrigger asChild>
              <Button variant="default" size="sm" className="flex items-center gap-2">
                <Plus className="w-4 h-4" />
                Award Qualification
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Award Qualification</DialogTitle>
                <DialogDescription>
                  Select personnel and a qualification to award
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label>Select Qualification</Label>
                  <Select value={selectedQualification} onValueChange={setSelectedQualification}>
                    <SelectTrigger>
                      <SelectValue placeholder="Choose a qualification" />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.values(allQualificationsBySchool).map(({ school, qualifications }) => (
                        <div key={school._id}>
                          <div className="px-2 py-1 text-xs font-medium text-muted-foreground">
                            {school.name}
                          </div>
                          {qualifications.map(qual => (
                            <SelectItem key={qual._id} value={qual._id}>
                              {qual.name}
                            </SelectItem>
                          ))}
                        </div>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Select Personnel</Label>
                  <div className="max-h-60 overflow-y-auto border rounded-lg p-2 space-y-2">
                    {personnelWithQuals.map(person => {
                      // Check if person already has the selected qualification
                      const alreadyHasQual = !!(selectedQualification && person.qualificationIds.has(selectedQualification as Id<"qualifications">))
                      
                      return (
                        <div key={person._id} className="flex items-center space-x-2">
                          <Checkbox
                            id={person._id}
                            checked={selectedPersonnel.includes(person._id)}
                            disabled={alreadyHasQual}
                            onCheckedChange={(checked: boolean) => {
                              if (checked) {
                                setSelectedPersonnel([...selectedPersonnel, person._id])
                              } else {
                                setSelectedPersonnel(selectedPersonnel.filter(id => id !== person._id))
                              }
                            }}
                          />
                          <Label 
                            htmlFor={person._id}
                            className={`text-sm ${alreadyHasQual ? 'text-muted-foreground line-through cursor-not-allowed' : 'cursor-pointer'}`}
                          >
                            {person.rank?.abbreviation} {person.firstName || person.lastName 
                              ? `${person.firstName || ''} ${person.lastName || ''}`.trim()
                              : person.callSign}
                            {person.callSign && (person.firstName || person.lastName) && ` (${person.callSign})`}
                            {alreadyHasQual && (
                              <span className="ml-2 text-xs text-green-600 dark:text-green-400 font-medium">
                                ✓ Already has
                              </span>
                            )}
                          </Label>
                        </div>
                      )
                    })}
                  </div>
                  {selectedQualification && (
                    <p className="text-xs text-muted-foreground mt-2">
                      Personnel who already have this qualification are disabled
                    </p>
                  )}
                </div>
              </div>
              <DialogFooter>
                <Button 
                  onClick={handleAwardQualification}
                  disabled={!selectedQualification || selectedPersonnel.length === 0}
                >
                  Award Qualification
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[200px] sticky left-0 bg-background z-10">
                  Personnel
                </TableHead>
                {Object.values(qualificationsBySchool).map(({ school, qualifications }) => (
                  <TableHead key={school._id} colSpan={qualifications.length} className="text-center bg-muted/50">
                    <div className="flex items-center justify-center gap-2">
                      <Users className="w-4 h-4" />
                      {school.name}
                    </div>
                  </TableHead>
                ))}
              </TableRow>
              <TableRow>
                <TableHead className="sticky left-0 bg-background z-10"></TableHead>
                {Object.values(qualificationsBySchool).map(({ qualifications }) =>
                  qualifications.map(qual => (
                    <TableHead key={qual._id} className="text-center text-xs">
                      {qual.name}
                    </TableHead>
                  ))
                )}
              </TableRow>
            </TableHeader>
            <TableBody>
              {personnelWithQuals.map(person => (
                <TableRow 
                  key={person._id}
                  className="hover:bg-muted/50 cursor-pointer"
                  onClick={() => onPersonnelSelect?.(person._id)}
                >
                  <TableCell className="sticky left-0 bg-background z-10 font-medium">
                    <div>
                      <div className="font-semibold flex items-center gap-2">
                        <span>
                          {person.rank?.abbreviation} {person.firstName || person.lastName 
                            ? `${person.firstName || ''} ${person.lastName || ''}`.trim()
                            : person.callSign}
                        </span>
                        {(person.hasNotes || person.hasStaffNotes) && (
                          <StickyNote 
                            className="w-4 h-4 shrink-0 text-amber-500/90" 
                            aria-label="Has notes on profile"
                          />
                        )}
                      </div>
                      {person.callSign && (person.firstName || person.lastName) && (
                        <div className="text-xs text-muted-foreground">
                          {person.callSign}
                        </div>
                      )}
                    </div>
                  </TableCell>
                  {Object.values(qualificationsBySchool).map(({ qualifications }) =>
                    qualifications.map(qual => (
                      <TableCell key={qual._id} className="text-center">
                        {person.qualificationIds.has(qual._id as Id<"qualifications">) ? (
                          <CheckCircle className="w-5 h-5 text-green-600 mx-auto" />
                        ) : (
                          <div className="w-5 h-5 rounded-full border-2 border-muted-foreground mx-auto" />
                        )}
                      </TableCell>
                    ))
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
        
        {personnelWithQuals.length === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            No personnel data available
          </div>
        )}
      </CardContent>
    </Card>
  )
}
