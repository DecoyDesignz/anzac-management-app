import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

const schema = defineSchema({
  
  // DEPRECATED: Old systemUsers table - kept temporarily for migration
  // Will be removed after migration completes
  systemUsers: defineTable({
    email: v.optional(v.string()),
    name: v.string(),
    passwordHash: v.optional(v.string()),
    isActive: v.boolean(),
    requirePasswordChange: v.boolean(),
    lastPasswordChange: v.optional(v.number()),
  })
    .index("by_name", ["name"])
    .index("by_email", ["email"]),

  // Training schools (groups of qualifications)
  schools: defineTable({
    name: v.string(),
    abbreviation: v.string(),
    iconUrl: v.optional(v.string()),
    color: v.optional(v.string()), // Hex color for display
  })
    .index("by_name", ["name"]),

  // Military ranks
  ranks: defineTable({
    name: v.string(),
    abbreviation: v.string(),
    order: v.optional(v.number()), // Order for promotion hierarchy (0 = lowest)
    insigniaUrl: v.optional(v.string()),
  })
    .index("by_name", ["name"]),

  // Unified personnel table - includes both regular members and system users
  personnel: defineTable({
    // Personnel fields (always present)
    callSign: v.string(), // Username/callsign - must be unique
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
    
    // Login fields (optional - only present if user has system access)
    passwordHash: v.optional(v.string()), // Bcrypt password hash
    isActive: v.optional(v.boolean()), // System access active status
    requirePasswordChange: v.optional(v.boolean()),
    lastPasswordChange: v.optional(v.number()),
  })
    .index("by_rank", ["rankId"])
    .index("by_status", ["status"])
    .index("by_callsign", ["callSign"])
    .index("by_email", ["email"]),

  // System roles (master table for role definitions)
  roles: defineTable({
    roleName: v.string(), // e.g., "super_admin", "administrator", etc.
    displayName: v.string(), // e.g., "Super Admin", "Administrator", etc.
    color: v.string(), // Hex color for display
    description: v.optional(v.string()), // Role description
  })
    .index("by_role_name", ["roleName"]),

  // User roles (junction table for multiple roles per user)
  // MIGRATION: Both userId and personnelId are optional during transition
  userRoles: defineTable({
    personnelId: v.optional(v.id("personnel")), // New field - will be required after migration
    userId: v.optional(v.id("systemUsers")), // Old field - will be removed after migration
    roleId: v.optional(v.id("roles")), // Reference to roles table - TEMPORARILY OPTIONAL for migration
    // OLD FIELDS - TEMPORARILY ALLOWED for migration, will be removed by migration script
    role: v.optional(v.string()), // Old string-based role field - will be removed after migration
    color: v.optional(v.string()), // Old color field - will be removed after migration
  })
    .index("by_personnel", ["personnelId"])
    .index("by_role", ["roleId"])
    .index("by_personnel_and_role", ["personnelId", "roleId"])
    .index("by_user", ["userId"]), // Keep old index during migration

  // Junction table: Instructors assigned to schools
  // MIGRATION: Both userId and personnelId are optional during transition
  instructorSchools: defineTable({
    personnelId: v.optional(v.id("personnel")), // New field - will be required after migration
    userId: v.optional(v.id("systemUsers")), // Old field - will be removed after migration
    schoolId: v.id("schools"),
  })
    .index("by_personnel", ["personnelId"])
    .index("by_school", ["schoolId"])
    .index("by_personnel_and_school", ["personnelId", "schoolId"])
    .index("by_user", ["userId"]) // Keep old index during migration
    .index("by_user_and_school", ["userId", "schoolId"]), // Keep old index during migration

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
    awardedBy: v.optional(v.id("personnel")), // Personnel who awarded it (must have system access)
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
    promotedBy: v.optional(v.id("personnel")), // Personnel who promoted them (must have system access)
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
    createdBy: v.optional(v.id("personnel")), // Personnel who created it (must have system access)
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
  // MIGRATION: Both userId and personnelId are optional during transition
  eventInstructors: defineTable({
    eventId: v.id("events"),
    personnelId: v.optional(v.id("personnel")), // New field - will be required after migration
    userId: v.optional(v.id("systemUsers")), // Old field - will be removed after migration
    role: v.union(
      v.literal("instructor"),
      v.literal("game_master")
    ),
  })
    .index("by_event", ["eventId"])
    .index("by_personnel", ["personnelId"])
    .index("by_event_and_personnel", ["eventId", "personnelId"])
    .index("by_user", ["userId"]) // Keep old index during migration
    .index("by_event_and_user", ["eventId", "userId"]), // Keep old index during migration

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

  // System settings
  systemSettings: defineTable({
    key: v.string(), // Setting key (e.g., "maintenance_mode")
    value: v.string(), // Setting value (JSON string for complex values)
    updatedAt: v.number(), // Timestamp
    updatedBy: v.optional(v.id("personnel")), // Personnel who updated it
  })
    .index("by_key", ["key"]),
});

export default schema;

