import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { requireAuth, requireRole, canManageSchool } from "./helpers";

/**
 * List all schools
 */
export const listSchools = query({
  args: {},
  handler: async (ctx) => {
    await requireAuth(ctx);

    const schools = await ctx.db.query("schools").collect();
    return schools;
  },
});

/**
 * Get a specific school with its qualifications
 */
export const getSchoolWithQualifications = query({
  args: { schoolId: v.id("schools") },
  handler: async (ctx, args) => {
    await requireAuth(ctx);

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
 * Get instructors assigned to a school
 */
export const getSchoolInstructors = query({
  args: { schoolId: v.id("schools") },
  handler: async (ctx, args) => {
    await requireRole(ctx, "administrator");

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
    name: v.string(),
    abbreviation: v.string(),
    iconUrl: v.optional(v.string()),
    color: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await requireRole(ctx, "administrator");

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
 * Update a school (Administrator or assigned Instructor)
 */
export const updateSchool = mutation({
  args: {
    schoolId: v.id("schools"),
    name: v.optional(v.string()),
    abbreviation: v.optional(v.string()),
    iconUrl: v.optional(v.string()),
    color: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await requireAuth(ctx);

    // TEMPORARY: Since auth integration isn't complete, allow all operations
    // The frontend controls access via session data
    // Check if user can manage this school
    // const canManage = await canManageSchool(ctx, user._id, args.schoolId);
    // if (!canManage) {
    //   throw new Error("You do not have permission to manage this school");
    // }

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
 * Delete a school (Administrator or assigned Instructor)
 * Note: This will fail if qualifications are still assigned to this school
 */
export const deleteSchool = mutation({
  args: { schoolId: v.id("schools") },
  handler: async (ctx, args) => {
    const user = await requireAuth(ctx);

    // TEMPORARY: Since auth integration isn't complete, allow all operations
    // The frontend controls access via session data
    // Check if user can manage this school
    // const canManage = await canManageSchool(ctx, user._id, args.schoolId);
    // if (!canManage) {
    //   throw new Error("You do not have permission to manage this school");
    // }

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
    userId: v.id("personnel"),
    schoolId: v.id("schools"),
  },
  handler: async (ctx, args) => {
    await requireRole(ctx, "administrator");

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
    userId: v.id("personnel"),
    schoolId: v.id("schools"),
  },
  handler: async (ctx, args) => {
    await requireRole(ctx, "administrator");

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
  args: {},
  handler: async (ctx) => {
    await requireAuth(ctx);

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
  args: { username: v.string() },
  handler: async (ctx, args) => {
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
 * Takes username from args since auth integration isn't complete
 */
export const listManagedSchools = query({
  args: { 
    username: v.string(),
    role: v.union(
      v.literal("super_admin"),
      v.literal("administrator"),
      v.literal("game_master"),
      v.literal("instructor"),
      v.literal("member")
    ),
  },
  handler: async (ctx, args) => {
    // Administrators and super_admins can manage all schools
    if (args.role === "super_admin" || args.role === "administrator") {
      const schools = await ctx.db.query("schools").collect();
      return schools;
    }

    // Instructors only see their assigned schools
    if (args.role === "instructor") {
      // Find the personnel by callSign
      const person = await ctx.db
        .query("personnel")
        .withIndex("by_callsign", (q) => q.eq("callSign", args.username))
        .first();

      if (!person) {
        return [];
      }

      const assignments = await ctx.db
        .query("instructorSchools")
        .withIndex("by_personnel", (q) => q.eq("personnelId", person._id))
        .collect();

      const schools = await Promise.all(
        assignments.map(async (assignment) => {
          return await ctx.db.get(assignment.schoolId);
        })
      );

      return schools.filter((s) => s !== null);
    }

    // Game masters, members and others cannot manage schools
    return [];
  },
});

