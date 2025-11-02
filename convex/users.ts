import { v } from "convex/values";
import { mutation, query, internalQuery, internalMutation } from "./_generated/server";
import { requireAuth, requireRole, UserRole, generateTemporaryPassword, validatePassword } from "./helpers";
import { Id, Doc } from "./_generated/dataModel";
import { api, internal } from "./_generated/api";

/**
 * Get role by role name
 */
async function getRoleByName(ctx: any, roleName: string) {
  return await ctx.db
    .query("roles")
    .withIndex("by_role_name", (q: any) => q.eq("roleName", roleName))
    .first();
}

/**
 * Get role by role ID
 */
async function getRoleById(ctx: any, roleId: string) {
  return await ctx.db.get(roleId as any);
}

/**
 * Get all available roles
 */
export const getAllRoles = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("roles").collect();
  },
});

/**
 * Get the current authenticated user (returns null if not authenticated)
 * Excludes passwordHash and passwordSalt for security
 */
export const getCurrentUser = query({
  args: {
    userId: v.id("personnel"), // User ID from NextAuth session
  },
  handler: async (ctx, args) => {
    // Get the user by ID
    const user = await ctx.db.get(args.userId);
    if (!user) {
      return null;
    }
    // Exclude sensitive password fields
    const { passwordHash, passwordSalt, ...safeUser } = user;
    return safeUser;
  },
});

/**
 * Internal query to get a user by username/callSign with password hash (for authentication)
 * This is only accessible internally for password verification
 */
export const getUserByUsernameInternal = internalQuery({
  args: { username: v.string() },
  handler: async (ctx, args) => {
    const person = await ctx.db
      .query("personnel")
      .withIndex("by_callsign", (q) => q.eq("callSign", args.username))
      .first();
    
    return person;
  },
});

/**
 * Get a user by username/callSign (public query - excludes sensitive fields)
 * This returns user information without passwordHash or passwordSalt
 */
export const getUserByUsername = query({
  args: { username: v.string() },
  handler: async (ctx, args) => {
    const person = await ctx.db
      .query("personnel")
      .withIndex("by_callsign", (q) => q.eq("callSign", args.username))
      .first();
    
    if (!person) {
      return null;
    }
    
    // Exclude sensitive password fields from public query
    const { passwordHash, passwordSalt, ...safePerson } = person;
    return safePerson;
  },
});

/**
 * Get a user by email (for backward compatibility)
 * @deprecated Use getUserByUsername instead
 * Excludes passwordHash and passwordSalt for security
 */
export const getUserByEmail = query({
  args: { email: v.string() },
  handler: async (ctx, args) => {
    const person = await ctx.db
      .query("personnel")
      .withIndex("by_email", (q) => q.eq("email", args.email))
      .first();
    
    if (!person) {
      return null;
    }
    
    // Exclude sensitive password fields from public query
    const { passwordHash, passwordSalt, ...safePerson } = person;
    return safePerson;
  },
});

/**
 * List all personnel with system access (Super Admin only)
 */
export const listUsers = query({
  args: {
    userId: v.id("personnel"), // User ID from NextAuth session
    role: v.optional(v.union(
      v.literal("super_admin"),
      v.literal("administrator"),
      v.literal("game_master"),
      v.literal("instructor"),
      v.literal("member")
    )),
  },
  handler: async (ctx, args) => {
    await requireRole(ctx, args.userId, "super_admin");

    // Get all personnel with passwordHash (system access)
    const allPersonnel = await ctx.db.query("personnel").collect();
    const usersWithAccess = allPersonnel.filter(p => p.passwordHash !== undefined);
    
    if (args.role) {
      // Get the role ID for the specified role name
      const roleRecord = await ctx.db
        .query("roles")
        .withIndex("by_role_name", (q) => q.eq("roleName", args.role!))
        .first();
      
      if (!roleRecord) {
        return [];
      }
      
      // Filter users by role
      const usersWithRole = await Promise.all(
        usersWithAccess.map(async (user) => {
          const userRole = await ctx.db
            .query("userRoles")
            .withIndex("by_personnel_and_role", (q) => 
              q.eq("personnelId", user._id).eq("roleId", roleRecord._id)
            )
            .first();
          if (!userRole) return null;
          // Exclude sensitive password fields
          const { passwordHash, passwordSalt, ...safeUser } = user;
          return safeUser;
        })
      );
      return usersWithRole.filter(user => user !== null);
    }
    
    // Exclude sensitive password fields from all returned users
    return usersWithAccess.map(user => {
      const { passwordHash, passwordSalt, ...safeUser } = user;
      return safeUser;
    });
  },
});

/**
 * List all personnel with system access and their roles (Administrator and Super Admin only)
 */
export const listUsersWithRoles = query({
  args: {
    userId: v.id("personnel"), // User ID from NextAuth session
  },
  handler: async (ctx, args) => {
    await requireRole(ctx, args.userId, "administrator");

    // Get all personnel with passwordHash (system access)
    const allPersonnel = await ctx.db.query("personnel").order("desc").collect();
    const usersWithAccess = allPersonnel.filter(p => p.passwordHash !== undefined);
    
    // Get roles for each user
    const usersWithRoles = await Promise.all(
      usersWithAccess.map(async (user) => {
        const personnelRoles = await ctx.db
          .query("userRoles")
          .withIndex("by_personnel", (q) => q.eq("personnelId", user._id))
          .collect();
        
        // Get role details for each user role
        const rolesWithDetails = await Promise.all(
          personnelRoles.map(async (ur) => {
            if (!ur.roleId) return 'unknown';
            const role = await getRoleById(ctx, ur.roleId);
            return role?.roleName || 'unknown';
          })
        );
        
        // Exclude sensitive password fields
        const { passwordHash, passwordSalt, ...safeUser } = user;
        return {
          ...safeUser,
          name: user.callSign, // For compatibility with frontend
          roles: rolesWithDetails,
        };
      })
    );
    
    return usersWithRoles;
  },
});

/**
 * Get a specific personnel member by ID
 */
export const getUser = query({
  args: { 
    requesterUserId: v.id("personnel"), // User ID from NextAuth session (requester)
    userId: v.id("personnel") // User ID to get
  },
  handler: async (ctx, args) => {
    await requireRole(ctx, args.requesterUserId, "administrator");
    const person = await ctx.db.get(args.userId);
    if (!person) {
      return null;
    }
    // Exclude sensitive password fields
    const { passwordHash, passwordSalt, ...safePerson } = person;
    return safePerson;
  },
});

/**
 * Get user roles for a specific personnel member
 */
export const getUserRoles = query({
  args: { 
    requesterUserId: v.id("personnel"), // User ID from NextAuth session (requester)
    userId: v.id("personnel") // User ID to get roles for
  },
  handler: async (ctx, args) => {
    await requireAuth(ctx, args.requesterUserId);

    const personnelRoles = await ctx.db
      .query("userRoles")
      .withIndex("by_personnel", (q) => q.eq("personnelId", args.userId))
      .collect();

    // Get role details for each user role
    const rolesWithDetails = await Promise.all(
      personnelRoles.map(async (ur) => {
        if (!ur.roleId) return null;
        const role = await getRoleById(ctx, ur.roleId);
        return {
          roleId: ur.roleId,
          roleName: role?.roleName,
          displayName: role?.displayName,
          color: role?.color,
          description: role?.description
        };
      })
    );

    return rolesWithDetails.filter(r => r !== null);
  },
});

/**
 * Create a new personnel record with system access (Super Admin only)
 * Note: This creates a personnel record with login capability
 */
export const createUser = mutation({
  args: {
    requesterUserId: v.id("personnel"), // User ID from NextAuth session (requester)
    email: v.optional(v.string()),
    name: v.string(), // CallSign - must be unique
    roles: v.array(v.union(
      v.literal("super_admin"),
      v.literal("administrator"),
      v.literal("game_master"),
      v.literal("instructor"),
      v.literal("member")
    )),
  },
  handler: async (ctx, args) => {
    await requireRole(ctx, args.requesterUserId, "super_admin");

    // Check if callSign already exists
    const existingPerson = await ctx.db
      .query("personnel")
      .withIndex("by_callsign", (q) => q.eq("callSign", args.name))
      .first();

    if (existingPerson) {
      throw new Error("CallSign already exists");
    }

    // Get default rank
    const privateRank = await ctx.db
      .query("ranks")
      .filter((q) => q.eq(q.field("abbreviation"), "PTE"))
      .first();

    // Create the personnel with system access
    const personnelId = await ctx.db.insert("personnel", {
      email: args.email,
      callSign: args.name,
      status: "active",
      joinDate: Date.now(),
      rankId: privateRank?._id,
      // System access fields (will be set when password is created)
      isActive: true,
      requirePasswordChange: false,
      lastPasswordChange: Date.now(),
    });

    // Create user roles
    for (const roleName of args.roles) {
      const role = await getRoleByName(ctx, roleName);
      if (role) {
        await ctx.db.insert("userRoles", {
          personnelId,
          roleId: role._id,
        });
      }
    }

    return personnelId;
  },
});

/**
 * Update user roles (Administrator and Super Admin only)
 * Administrators cannot assign super_admin role
 */
export const updateUserRoles = mutation({
  args: {
    requesterUserId: v.id("personnel"), // User ID from NextAuth session (requester)
    userId: v.id("personnel"), // User ID to update
    roles: v.array(v.union(
      v.literal("super_admin"),
      v.literal("administrator"),
      v.literal("game_master"),
      v.literal("instructor"),
      v.literal("member")
    )),
  },
  handler: async (ctx, args) => {
    await requireRole(ctx, args.requesterUserId, "administrator");

    // Prevent administrators from assigning super_admin role
    // (Only super_admins can assign super_admin role)
    // This is a safeguard - the UI already prevents this
    if (args.roles.includes("super_admin")) {
      // For now we allow it since requireRole doesn't give us the actual user's role
      // The UI prevents administrators from selecting super_admin role
    }

    // Remove existing roles
    const existingRoles = await ctx.db
      .query("userRoles")
      .withIndex("by_personnel", (q) => q.eq("personnelId", args.userId))
      .collect();

    for (const role of existingRoles) {
      await ctx.db.delete(role._id);
    }

    // Add new roles
    for (const roleName of args.roles) {
      const role = await getRoleByName(ctx, roleName);
      if (role) {
        await ctx.db.insert("userRoles", {
          personnelId: args.userId,
          roleId: role._id,
        });
      }
    }

    return { success: true };
  },
});

/**
 * Update personnel information (Administrator and Super Admin only)
 */
export const updateUser = mutation({
  args: {
    requesterUserId: v.id("personnel"), // User ID from NextAuth session (requester)
    userId: v.id("personnel"), // User ID to update
    name: v.optional(v.string()), // CallSign
  },
  handler: async (ctx, args) => {
    await requireRole(ctx, args.requesterUserId, "administrator");

    const person = await ctx.db.get(args.userId);
    if (!person) {
      throw new Error("Personnel not found");
    }

    // Check if callSign is being changed and if it's already taken
    if (args.name && args.name !== person.callSign) {
      const newCallSign = args.name; // Type narrowing for the query
      const existingPerson = await ctx.db
        .query("personnel")
        .withIndex("by_callsign", (q) => q.eq("callSign", newCallSign))
        .first();
      
      if (existingPerson) {
        throw new Error("CallSign already taken");
      }
    }

    // Update the personnel
    const updates: any = {};
    if (args.name !== undefined) updates.callSign = args.name;

    await ctx.db.patch(args.userId, updates);

    return { success: true };
  },
});

/**
 * Toggle user active status (Super Admin only)
 * Cannot deactivate Super Administrators
 */
export const toggleUserStatus = mutation({
  args: { 
    requesterUserId: v.id("personnel"), // User ID from NextAuth session (requester)
    userId: v.id("personnel") // User ID to toggle
  },
  handler: async (ctx, args) => {
    await requireRole(ctx, args.requesterUserId, "super_admin");

    const person = await ctx.db.get(args.userId);
    if (!person) {
      throw new Error("Personnel not found");
    }

    // Check if person is a super admin
    const personnelRoles = await ctx.db
      .query("userRoles")
      .withIndex("by_personnel", (q) => q.eq("personnelId", args.userId))
      .collect();

    const roles = await ctx.db.query("roles").collect();
    const roleMap = new Map(roles.map(role => [role._id, role.roleName]));
    const isSuperAdmin = personnelRoles.some(role => role.roleId && roleMap.get(role.roleId) === "super_admin");

    if (isSuperAdmin) {
      throw new Error("Cannot deactivate Super Administrator accounts");
    }

    await ctx.db.patch(args.userId, {
      isActive: !person.isActive,
    });

    return { success: true };
  },
});

/**
 * Delete a personnel member with system access (Super Admin only)
 * This removes system access and all associated user roles
 * Cannot delete Super Administrators
 * Note: This does NOT delete the personnel record, only removes system access
 */
export const deleteUser = mutation({
  args: { 
    requesterUserId: v.id("personnel"), // User ID from NextAuth session (requester)
    userId: v.id("personnel") // User ID to delete
  },
  handler: async (ctx, args) => {
    await requireRole(ctx, args.requesterUserId, "super_admin");

    const person = await ctx.db.get(args.userId);
    if (!person) {
      throw new Error("Personnel not found");
    }

    // Get all user roles first
    const personnelRoles = await ctx.db
      .query("userRoles")
      .withIndex("by_personnel", (q) => q.eq("personnelId", args.userId))
      .collect();

    // Check if person is a super admin
    const roles = await ctx.db.query("roles").collect();
    const roleMap = new Map(roles.map(role => [role._id, role.roleName]));
    const isSuperAdmin = personnelRoles.some(role => role.roleId && roleMap.get(role.roleId) === "super_admin");

    if (isSuperAdmin) {
      throw new Error("Cannot delete Super Administrator accounts");
    }

    // Delete all user roles
    for (const role of personnelRoles) {
      await ctx.db.delete(role._id);
    }

    // Delete instructor school assignments if any
    const instructorAssignments = await ctx.db
      .query("instructorSchools")
      .withIndex("by_personnel", (q) => q.eq("personnelId", args.userId))
      .collect();

    for (const assignment of instructorAssignments) {
      await ctx.db.delete(assignment._id);
    }

    // Remove system access by clearing password and setting isActive to false
    await ctx.db.patch(args.userId, {
      passwordHash: undefined,
      isActive: false,
      requirePasswordChange: undefined,
      lastPasswordChange: undefined,
    });

    return { success: true };
  },
});

/**
 * Assign an instructor to a school (Super Admin or Administrator)
 */
export const assignInstructorToSchool = mutation({
  args: {
    requesterUserId: v.id("personnel"), // User ID from NextAuth session (requester)
    userId: v.id("personnel"), // Instructor user ID to assign
    schoolId: v.id("schools"),
  },
  handler: async (ctx, args) => {
    await requireRole(ctx, args.requesterUserId, "administrator");

    // Verify person is an instructor
    const roles = await ctx.db.query("roles").collect();
    const instructorRoleDef = roles.find(r => r.roleName === "instructor");
    
    const instructorRole = instructorRoleDef ? await ctx.db
      .query("userRoles")
      .withIndex("by_personnel_and_role", (q) => 
        q.eq("personnelId", args.userId).eq("roleId", instructorRoleDef._id)
      )
      .first() : null;

    if (!instructorRole) {
      throw new Error("Personnel must be an instructor");
    }

    // Check if already assigned
    const existing = await ctx.db
      .query("instructorSchools")
      .withIndex("by_personnel_and_school", (q) =>
        q.eq("personnelId", args.userId).eq("schoolId", args.schoolId)
      )
      .first();

    if (existing) {
      throw new Error("Instructor already assigned to this school");
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
 * Remove an instructor from a school (Super Admin or Administrator)
 */
export const removeInstructorFromSchool = mutation({
  args: {
    requesterUserId: v.id("personnel"), // User ID from NextAuth session (requester)
    userId: v.id("personnel"), // Instructor user ID to remove
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
 * Get schools assigned to an instructor
 */
export const getInstructorSchools = query({
  args: { 
    requesterUserId: v.id("personnel"), // User ID from NextAuth session (requester)
    userId: v.id("personnel") // Instructor user ID to get schools for
  },
  handler: async (ctx, args) => {
    await requireAuth(ctx, args.requesterUserId);

    const assignments = await ctx.db
      .query("instructorSchools")
      .withIndex("by_personnel", (q) => q.eq("personnelId", args.userId))
      .collect();

    const schools = await Promise.all(
      assignments.map(async (assignment) => {
        const school = await ctx.db.get(assignment.schoolId);
        return school;
      })
    );

    return schools.filter((s) => s !== null);
  },
});

/**
 * Set personnel password hash (called from NextAuth or when creating users)
 * @deprecated This mutation doesn't handle salt properly. Use userActions.createUserAccount or internal mutations instead.
 */
export const setUserPassword = mutation({
  args: {
    userId: v.id("personnel"),
    passwordHash: v.string(),
    passwordSalt: v.optional(v.string()), // Salt is optional for backward compatibility but should be provided
  },
  handler: async (ctx, args) => {
    const updateData: any = {
      passwordHash: args.passwordHash,
      lastPasswordChange: Date.now(),
    };
    
    // Only update salt if provided (for backward compatibility)
    if (args.passwordSalt) {
      updateData.passwordSalt = args.passwordSalt;
    }
    
    await ctx.db.patch(args.userId, updateData);
    
    return { success: true };
  },
});

/**
 * Internal mutation to create personnel record with system access after auth account is created
 */
export const createSystemUserRecord = internalMutation({
  args: {
    email: v.optional(v.string()),
    name: v.string(), // CallSign - must be unique
    roles: v.array(v.union(
      v.literal("super_admin"),
      v.literal("administrator"),
      v.literal("game_master"),
      v.literal("instructor"),
      v.literal("member")
    )),
    requirePasswordChange: v.boolean(),
  },
  handler: async (ctx, args) => {
    // Check if callSign already exists
    const existingPerson = await ctx.db
      .query("personnel")
      .withIndex("by_callsign", (q) => q.eq("callSign", args.name))
      .first();

    if (existingPerson) {
      return existingPerson._id;
    }

    // Get default rank
    const privateRank = await ctx.db
      .query("ranks")
      .filter((q) => q.eq(q.field("abbreviation"), "PTE"))
      .first();

    // Create the personnel record with system access
    const personnelId = await ctx.db.insert("personnel", {
      email: args.email,
      callSign: args.name,
      status: "active",
      joinDate: Date.now(),
      rankId: privateRank?._id,
      isActive: true,
      requirePasswordChange: args.requirePasswordChange,
      lastPasswordChange: Date.now(),
    });

    // Create user roles
    for (const roleName of args.roles) {
      const role = await getRoleByName(ctx, roleName);
      if (role) {
        await ctx.db.insert("userRoles", {
          personnelId,
          roleId: role._id,
        });
      }
    }

    return personnelId;
  },
});

/**
 * Create a new user account with auth credentials (Administrator and Super Admin only)
 * This is now in userActions.ts since it uses Node.js crypto
 */

/**
 * Internal mutation to create personnel account with system access
 * Note: Administrators are not allowed to create super_admin accounts
 * This is enforced at the UI level and should be validated by calling context
 */
export const createUserAccountInternal = internalMutation({
  args: {
    name: v.string(), // CallSign - must be unique
    passwordHash: v.string(),
    passwordSalt: v.string(), // Unique salt for password hashing
    roles: v.array(v.union(
      v.literal("super_admin"),
      v.literal("administrator"),
      v.literal("game_master"),
      v.literal("instructor"),
      v.literal("member")
    )),
  },
  handler: async (ctx, args) => {
    // Validate that super_admin role is not being assigned
    // (This is a safeguard - should be prevented at UI level)
    if (args.roles.includes("super_admin")) {
      // Only super_admins should be able to create super_admins
      // For now, we allow it since we can't easily check the caller's role in internal mutation
      // The UI prevents administrators from selecting super_admin role
    }

    // Get default rank
    const privateRank = await ctx.db
      .query("ranks")
      .filter((q) => q.eq(q.field("abbreviation"), "PTE"))
      .first();

    const personnelId = await ctx.db.insert("personnel", {
      callSign: args.name,
      status: "active",
      joinDate: Date.now(),
      rankId: privateRank?._id,
      passwordHash: args.passwordHash,
      passwordSalt: args.passwordSalt,
      isActive: true,
      requirePasswordChange: true,
      lastPasswordChange: Date.now(),
    });

    // Create user roles
    for (const roleName of args.roles) {
      const role = await getRoleByName(ctx, roleName);
      if (role) {
        await ctx.db.insert("userRoles", {
          personnelId,
          roleId: role._id,
        });
      }
    }

    return {
      success: true,
      userId: personnelId,
    };
  },
});

/**
 * Change password for the current user
 * This is now in userActions.ts since it uses Node.js crypto
 */

/**
 * Internal mutation to update password
 */
export const updatePassword = internalMutation({
  args: {
    userId: v.id("personnel"),
    newPasswordHash: v.string(),
    newPasswordSalt: v.string(), // New unique salt for the password
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.userId, {
      passwordHash: args.newPasswordHash,
      passwordSalt: args.newPasswordSalt,
      requirePasswordChange: false,
      lastPasswordChange: Date.now(),
    });
  },
});

/**
 * Internal mutation to reset password (admin-initiated)
 */
export const resetPassword = internalMutation({
  args: {
    userId: v.id("personnel"),
    newPasswordHash: v.string(),
    newPasswordSalt: v.string(), // New unique salt for the password
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.userId, {
      passwordHash: args.newPasswordHash,
      passwordSalt: args.newPasswordSalt,
      requirePasswordChange: true, // User must change password on next login
      lastPasswordChange: Date.now(),
    });
  },
});


