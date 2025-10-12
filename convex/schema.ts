import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

const schema = defineSchema({
  
  // System users
  systemUsers: defineTable({
    email: v.optional(v.string()),
    name: v.string(), // Username - must be unique
    passwordHash: v.optional(v.string()), // Bcrypt password hash
    isActive: v.boolean(),
    requirePasswordChange: v.boolean(),
    lastPasswordChange: v.optional(v.number()),
  })
    .index("by_name", ["name"]) // Username index for uniqueness
    .index("by_email", ["email"]), // Keep for backward compatibility

  // User roles (junction table for multiple roles per user)
  userRoles: defineTable({
    userId: v.id("systemUsers"),
    role: v.union(
      v.literal("super_admin"),
      v.literal("administrator"),
      v.literal("game_master"),
      v.literal("instructor")
    ),
  })
    .index("by_user", ["userId"])
    .index("by_role", ["role"])
    .index("by_user_and_role", ["userId", "role"]),

  // Training schools (groups of qualifications)
  schools: defineTable({
    name: v.string(),
    abbreviation: v.string(),
    iconUrl: v.optional(v.string()),
  })
    .index("by_name", ["name"]),

  // Junction table: Instructors assigned to schools
  instructorSchools: defineTable({
    userId: v.id("systemUsers"),
    schoolId: v.id("schools"),
  })
    .index("by_user", ["userId"])
    .index("by_school", ["schoolId"])
    .index("by_user_and_school", ["userId", "schoolId"]),

  // Military ranks
  ranks: defineTable({
    name: v.string(),
    abbreviation: v.string(),
    order: v.optional(v.number()), // Order for promotion hierarchy (0 = lowest)
    insigniaUrl: v.optional(v.string()),
  })
    .index("by_name", ["name"]),

  // Unit members (no login capability)
  personnel: defineTable({
    callSign: v.string(), // Username/callsign only
    firstName: v.optional(v.string()),
    lastName: v.optional(v.string()),
    email: v.optional(v.string()),
    phone: v.optional(v.string()),
    rankId: v.optional(v.id("ranks")),
    status: v.union(
      v.literal("active"),
      v.literal("inactive"),
      v.literal("leave"),
      v.literal("discharged")
    ),
    joinDate: v.number(), // Timestamp
    dischargeDate: v.optional(v.number()),
    notes: v.optional(v.string()),
  })
    .index("by_rank", ["rankId"])
    .index("by_status", ["status"])
    .index("by_callsign", ["callSign"]),

  // Military qualifications
  qualifications: defineTable({
    name: v.string(),
    abbreviation: v.string(),
    schoolId: v.id("schools"), // Belongs to a school
    iconUrl: v.optional(v.string()),
  })
    .index("by_school", ["schoolId"])
    .index("by_name", ["name"]),

  // Junction table: Personnel qualifications
  personnelQualifications: defineTable({
    personnelId: v.id("personnel"),
    qualificationId: v.id("qualifications"),
    awardedDate: v.number(), // Timestamp
    expiryDate: v.optional(v.number()),
    awardedBy: v.optional(v.id("systemUsers")), // User who awarded it
    notes: v.optional(v.string()),
  })
    .index("by_personnel", ["personnelId"])
    .index("by_qualification", ["qualificationId"])
    .index("by_awarded_by", ["awardedBy"]),

  // Promotion history
  rankHistory: defineTable({
    personnelId: v.id("personnel"),
    rankId: v.id("ranks"),
    promotionDate: v.number(), // Timestamp
    promotedBy: v.optional(v.id("systemUsers")),
    notes: v.optional(v.string()),
  })
    .index("by_personnel", ["personnelId"])
    .index("by_rank", ["rankId"]),

  // Event types for calendar
  eventTypes: defineTable({
    name: v.string(),
    abbreviation: v.string(),
    color: v.string(), // Hex color for calendar display
  })
    .index("by_name", ["name"]),

  // Servers for events
  servers: defineTable({
    name: v.string(),
    isActive: v.boolean(),
  })
    .index("by_name", ["name"])
    .index("by_active", ["isActive"]),

  // Calendar events
  events: defineTable({
    title: v.string(),
    description: v.optional(v.string()),
    startDate: v.number(), // Timestamp
    endDate: v.number(), // Timestamp
    eventTypeId: v.optional(v.id("eventTypes")),
    serverId: v.id("servers"),
    createdBy: v.optional(v.id("systemUsers")),
    bookingCode: v.string(), // Auto-generated code for clearing
    maxParticipants: v.optional(v.number()),
    currentParticipants: v.number(), // Count of enrolled personnel
    isRecurring: v.boolean(),
    recurringPattern: v.optional(v.string()), // "weekly", "monthly", etc.
    status: v.union(
      v.literal("scheduled"),
      v.literal("in_progress"),
      v.literal("completed"),
      v.literal("cancelled")
    ),
    notes: v.optional(v.string()),
  })
    .index("by_date", ["startDate"])
    .index("by_event_type", ["eventTypeId"])
    .index("by_server", ["serverId"])
    .index("by_status", ["status"])
    .index("by_booking_code", ["bookingCode"]),

  // Event instructors/GMs (junction table for multiple instructors per event)
  eventInstructors: defineTable({
    eventId: v.id("events"),
    userId: v.id("systemUsers"),
    role: v.union(
      v.literal("instructor"),
      v.literal("game_master")
    ),
  })
    .index("by_event", ["eventId"])
    .index("by_user", ["userId"])
    .index("by_event_and_user", ["eventId", "userId"]),

  // Event participants (junction table)
  eventParticipants: defineTable({
    eventId: v.id("events"),
    personnelId: v.id("personnel"),
    enrolledDate: v.number(),
    status: v.union(
      v.literal("enrolled"),
      v.literal("attended"),
      v.literal("absent"),
      v.literal("excused")
    ),
    notes: v.optional(v.string()),
  })
    .index("by_event", ["eventId"])
    .index("by_personnel", ["personnelId"])
    .index("by_event_and_personnel", ["eventId", "personnelId"]),
});

export default schema;

