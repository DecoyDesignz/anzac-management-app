// Database schema types for ANZAC 2nd Commandos Management System
// Using Convex as the backend

import { Id } from "../../convex/_generated/dataModel";

export type UserRole = "super_admin" | "administrator" | "game_master" | "instructor" | "member";

export interface Personnel {
  _id: Id<"personnel">
  // Personnel fields (always present)
  callSign: string // Username/callsign
  firstName?: string
  lastName?: string
  email?: string
  phone?: string
  rankId?: Id<"ranks">
  status: "active" | "inactive" | "leave" | "discharged"
  joinDate: number
  dischargeDate?: number
  notes?: string
  // System access fields (optional)
  passwordHash?: string
  isActive?: boolean
  requirePasswordChange?: boolean
  lastPasswordChange?: number
  _creationTime: number
}

export interface School {
  _id: Id<"schools">
  name: string
  abbreviation: string
  description?: string
  iconUrl?: string
  _creationTime: number
}

export interface InstructorSchool {
  _id: Id<"instructorSchools">
  personnelId: Id<"personnel">
  schoolId: Id<"schools">
  _creationTime: number
}

export interface Rank {
  _id: Id<"ranks">
  name: string
  abbreviation: string
  order?: number
  insigniaUrl?: string
  _creationTime: number
}

export interface Qualification {
  _id: Id<"qualifications">
  name: string
  abbreviation: string
  description?: string
  schoolId: Id<"schools">
  iconUrl?: string
  _creationTime: number
}

export interface PersonnelQualification {
  _id: Id<"personnelQualifications">
  personnelId: Id<"personnel">
  qualificationId: Id<"qualifications">
  awardedDate: number
  expiryDate?: number
  awardedBy?: Id<"personnel">
  notes?: string
  _creationTime: number
}

export interface RankHistory {
  _id: Id<"rankHistory">
  personnelId: Id<"personnel">
  rankId: Id<"ranks">
  promotionDate: number
  promotedBy?: Id<"personnel">
  notes?: string
  _creationTime: number
}

// DTOs (Data Transfer Objects) for query responses
export interface PersonnelWithDetails extends Personnel {
  rank: Rank | null
  qualifications: Array<Qualification & { awardedDate: number }>
}

export interface RankWithCount extends Rank {
  personnelCount: number
}

export interface QualificationWithCount extends Qualification {
  personnelCount: number
  school: School | null
}

export interface SchoolWithQualifications extends School {
  qualifications: Qualification[]
}

