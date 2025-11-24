import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { requireAuth, requireRole, canManageSchool, resolveUserIdToPersonnel } from "./helpers";

/**
 * List all schools
 */
export const listSchools = query({
  args: {
    userId: v.string(), // User ID from NextAuth session (can be systemUsers or personnel ID)
  },
  handler: async (ctx, args) => {
    const personnelId = await resolveUserIdToPersonnel(ctx, args.userId);
    await requireAuth(ctx, personnelId);

    const schools = await ctx.db.query("schools").collect();
    return schools;
  },
});

/**
 * Get a specific school with its qualifications
 */
export const getSchoolWithQualifications = query({
  args: {
    userId: v.id("personnel"), // User ID from NextAuth session
    schoolId: v.id("schools")
  },
  handler: async (ctx, args) => {
    await requireAuth(ctx, args.userId);

    const school = await ctx.db.get(args.schoolId);
    if (!school) {
      throw new Error("School not found");
    }

    const qualifications = await ctx.db
      .query("qualifications")
      .withIndex("by_school", (q) => q.eq("schoolId", args.schoolId))
      .collect();

    return {
      ...school,
      qualifications,
    };
  },
});

/**
 * Get instructors assigned to a school (all authenticated users can view)
 */
export const getSchoolInstructors = query({
  args: {
    userId: v.id("personnel"), // User ID from NextAuth session
    schoolId: v.id("schools")
  },
  handler: async (ctx, args) => {
    await requireAuth(ctx, args.userId);

    const assignments = await ctx.db
      .query("instructorSchools")
      .withIndex("by_school", (q) => q.eq("schoolId", args.schoolId))
      .collect();

    const instructors = await Promise.all(
      assignments.map(async (assignment) => {
        if (!assignment.personnelId) return null;
        const person = await ctx.db.get(assignment.personnelId);
        return person ? { ...person, name: person.callSign } : null;
      })
    );

    return instructors.filter((i) => i !== null);
  },
});

/**
 * Create a new school (Administrator or higher)
 */
export const createSchool = mutation({
  args: {
    userId: v.id("personnel"), // User ID from NextAuth session
    name: v.string(),
    abbreviation: v.string(),
    iconUrl: v.optional(v.string()),
    color: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await requireRole(ctx, args.userId, "administrator");

    // Check if school with same name exists
    const existing = await ctx.db
      .query("schools")
      .withIndex("by_name", (q) => q.eq("name", args.name))
      .first();

    if (existing) {
      throw new Error("School with this name already exists");
    }

    const schoolId = await ctx.db.insert("schools", {
      name: args.name,
      abbreviation: args.abbreviation,
      iconUrl: args.iconUrl,
      color: args.color,
    });

    return schoolId;
  },
});

/**
 * Update a school (Administrator or assigned Instructor only - Game Masters cannot edit)
 */
export const updateSchool = mutation({
  args: {
    userId: v.id("personnel"), // User ID from NextAuth session
    schoolId: v.id("schools"),
    name: v.optional(v.string()),
    abbreviation: v.optional(v.string()),
    iconUrl: v.optional(v.string()),
    color: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await requireAuth(ctx, args.userId);

    // Check if user can manage this school (administrator or assigned instructor)
    const canManage = await canManageSchool(ctx, user._id, args.schoolId);
    if (!canManage) {
      throw new Error("You do not have permission to manage this school. Only administrators and assigned instructors can edit schools.");
    }

    const { schoolId, ...updates } = args;
    
    // Remove undefined values
    const cleanUpdates = Object.fromEntries(
      Object.entries(updates).filter(([_, v]) => v !== undefined)
    );

    await ctx.db.patch(schoolId, cleanUpdates);
    return { success: true };
  },
});

/**
 * Delete a school (Administrator or assigned Instructor only - Game Masters cannot delete)
 * Note: This will fail if qualifications are still assigned to this school
 */
export const deleteSchool = mutation({
  args: {
    userId: v.id("personnel"), // User ID from NextAuth session
    schoolId: v.id("schools")
  },
  handler: async (ctx, args) => {
    const user = await requireAuth(ctx, args.userId);

    // Check if user can manage this school (administrator or assigned instructor)
    const canManage = await canManageSchool(ctx, user._id, args.schoolId);
    if (!canManage) {
      throw new Error("You do not have permission to delete this school. Only administrators and assigned instructors can delete schools.");
    }

    // Get the school name for better error messages
    const school = await ctx.db.get(args.schoolId);
    if (!school) {
      throw new Error("School not found.");
    }

    // Check if any qualifications are assigned to this school
    const qualifications = await ctx.db
      .query("qualifications")
      .withIndex("by_school", (q) => q.eq("schoolId", args.schoolId))
      .collect();

    if (qualifications.length > 0) {
      const qualNames = qualifications.slice(0, 3).map(q => q.name).join(", ");
      const remaining = qualifications.length > 3 ? ` and ${qualifications.length - 3} more` : "";
      throw new Error(
        `Cannot delete "${school.name}"\n\n` +
        `This school has ${qualifications.length} qualification${qualifications.length !== 1 ? 's' : ''} assigned:\n` +
        `${qualNames}${remaining}\n\n` +
        `Please delete or reassign these qualifications first.`
      );
    }

    // Delete all instructor assignments for this school
    const assignments = await ctx.db
      .query("instructorSchools")
      .withIndex("by_school", (q) => q.eq("schoolId", args.schoolId))
      .collect();

    for (const assignment of assignments) {
      await ctx.db.delete(assignment._id);
    }

    // Delete the school
    await ctx.db.delete(args.schoolId);
    return { success: true };
  },
});

/**
 * Assign an instructor to a school
 */
export const assignInstructor = mutation({
  args: {
    requesterUserId: v.id("personnel"), // User ID from NextAuth session (requester)
    userId: v.id("personnel"), // Instructor user ID to assign
    schoolId: v.id("schools"),
  },
  handler: async (ctx, args) => {
    await requireRole(ctx, args.requesterUserId, "administrator");

    // Check if assignment already exists
    const existing = await ctx.db
      .query("instructorSchools")
      .withIndex("by_personnel_and_school", (q) =>
        q.eq("personnelId", args.userId).eq("schoolId", args.schoolId)
      )
      .first();

    if (existing) {
      throw new Error("Instructor is already assigned to this school");
    }

    // Verify personnel exists and has appropriate role
    const person = await ctx.db.get(args.userId);
    if (!person) {
      throw new Error("Personnel not found");
    }

    // Check personnel roles
    const personnelRoles = await ctx.db
      .query("userRoles")
      .withIndex("by_personnel", (q) => q.eq("personnelId", args.userId))
      .collect();

    const roles = await ctx.db.query("roles").collect();
    const roleMap = new Map(roles.map(role => [role._id, role.roleName]));
    const roleNames = personnelRoles.map((r) => r.roleId ? roleMap.get(r.roleId) : null).filter(Boolean);
    
    const canBeInstructor =
      roleNames.includes("instructor") ||
      roleNames.includes("administrator") ||
      roleNames.includes("super_admin");

    if (!canBeInstructor) {
      throw new Error("Personnel must have instructor role or higher");
    }

    // Create assignment
    const assignmentId = await ctx.db.insert("instructorSchools", {
      personnelId: args.userId,
      schoolId: args.schoolId,
    });

    return assignmentId;
  },
});

/**
 * Remove an instructor from a school
 */
export const unassignInstructor = mutation({
  args: {
    requesterUserId: v.id("personnel"), // User ID from NextAuth session (requester)
    userId: v.id("personnel"), // Instructor user ID to unassign
    schoolId: v.id("schools"),
  },
  handler: async (ctx, args) => {
    await requireRole(ctx, args.requesterUserId, "administrator");

    const assignment = await ctx.db
      .query("instructorSchools")
      .withIndex("by_personnel_and_school", (q) =>
        q.eq("personnelId", args.userId).eq("schoolId", args.schoolId)
      )
      .first();

    if (!assignment) {
      throw new Error("Assignment not found");
    }

    await ctx.db.delete(assignment._id);
    return { success: true };
  },
});

/**
 * List all schools with their instructor counts
 */
export const listSchoolsWithInstructors = query({
  args: {
    userId: v.id("personnel"), // User ID from NextAuth session
  },
  handler: async (ctx, args) => {
    await requireAuth(ctx, args.userId);

    const schools = await ctx.db.query("schools").collect();

    const schoolsWithInstructors = await Promise.all(
      schools.map(async (school) => {
        const assignments = await ctx.db
          .query("instructorSchools")
          .withIndex("by_school", (q) => q.eq("schoolId", school._id))
          .collect();

        const instructors = await Promise.all(
          assignments.map(async (assignment) => {
            if (!assignment.personnelId) return null;
            const person = await ctx.db.get(assignment.personnelId);
            if (!person) return null;

            const personnelRoles = await ctx.db
              .query("userRoles")
              .withIndex("by_personnel", (q) => q.eq("personnelId", person._id))
              .collect();

            // Get role names from role IDs
            const roles = await ctx.db.query("roles").collect();
            const roleMap = new Map(roles.map(role => [role._id, role.roleName]));
            const roleNames = personnelRoles.map((r) => r.roleId ? roleMap.get(r.roleId) : null).filter(Boolean);

            return {
              _id: person._id,
              name: person.callSign,
              email: person.email,
              roles: roleNames,
            };
          })
        );

        return {
          ...school,
          instructors: instructors.filter((i) => i !== null),
          instructorCount: instructors.filter((i) => i !== null).length,
        };
      })
    );

    return schoolsWithInstructors;
  },
});

/**
 * Get instructor school assignments by callSign
 * Helper query to check which schools an instructor is assigned to
 */
export const getInstructorAssignmentsByName = query({
  args: {
    userId: v.id("personnel"), // User ID from NextAuth session
    username: v.string()
  },
  handler: async (ctx, args) => {
    await requireAuth(ctx, args.userId);
    // Find the personnel by callSign
    const person = await ctx.db
      .query("personnel")
      .withIndex("by_callsign", (q) => q.eq("callSign", args.username))
      .first();

    if (!person) {
      return { error: "Personnel not found" };
    }

    // Get school assignments
    const assignments = await ctx.db
      .query("instructorSchools")
      .withIndex("by_personnel", (q) => q.eq("personnelId", person._id))
      .collect();

    // Get school details
    const schools = await Promise.all(
      assignments.map(async (assignment) => {
        return await ctx.db.get(assignment.schoolId);
      })
    );

    return {
      userId: person._id,
      username: person.callSign,
      assignedSchools: schools.filter((s) => s !== null),
    };
  },
});

/**
 * List schools that the current user is authorized to manage
 * - Administrators and Super Admins: Can manage all schools
 * - Instructors: Can manage only their assigned schools
 * - Game Masters: Can view all schools (read-only, returned here for visibility)
 * - Others: Cannot manage schools
 */
export const listManagedSchools = query({
  args: { 
    userId: v.string(), // User ID from NextAuth session (can be systemUsers or personnel ID)
    username: v.optional(v.string()), // Deprecated - use userId instead
    role: v.optional(v.union(
      v.literal("super_admin"),
      v.literal("administrator"),
      v.literal("game_master"),
      v.literal("instructor"),
      v.literal("member")
    )), // Deprecated - will be determined from userId
  },
  handler: async (ctx, args) => {
    const personnelId = await resolveUserIdToPersonnel(ctx, args.userId);
    const requester = await requireAuth(ctx, personnelId);
    // Get requester's roles from database
    const personnelRoles = await ctx.db
      .query("userRoles")
      .withIndex("by_personnel", (q) => q.eq("personnelId", requester._id))
      .collect();

    const roles = await ctx.db.query("roles").collect();
    const roleMap = new Map(roles.map(role => [role._id, role.roleName]));
    const roleNames = personnelRoles
      .map(ur => ur.roleId ? roleMap.get(ur.roleId) : null)
      .filter(Boolean) as string[];
    
    // Administrators and super_admins can manage all schools
    if (roleNames.includes("super_admin") || roleNames.includes("administrator")) {
      const schools = await ctx.db.query("schools").collect();
      return schools;
    }

    // Instructors only see their assigned schools
    if (roleNames.includes("instructor")) {
      const assignments = await ctx.db
        .query("instructorSchools")
        .withIndex("by_personnel", (q) => q.eq("personnelId", requester._id))
        .collect();

      const schools = await Promise.all(
        assignments.map(async (assignment) => {
          return await ctx.db.get(assignment.schoolId);
        })
      );

      return schools.filter((s) => s !== null);
    }

    // Game masters can view all schools (read-only)
    if (roleNames.includes("game_master")) {
      const schools = await ctx.db.query("schools").collect();
      return schools;
    }

    // Members and others cannot manage schools
    return [];
  },
});

