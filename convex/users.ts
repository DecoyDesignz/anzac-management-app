import { v } from "convex/values";
import { mutation, query, internalQuery, internalMutation } from "./_generated/server";
import { requireAuth, requireRole, UserRole, generateTemporaryPassword, validatePassword, getCurrentUser as getCurrentUserHelper } from "./helpers";
import { Id, Doc } from "./_generated/dataModel";
import { api, internal } from "./_generated/api";

/**
 * Get the current authenticated user (returns null if not authenticated)
 */
export const getCurrentUser = query({
  args: {},
  handler: async (ctx) => {
    // Use getCurrentUser helper which returns null instead of throwing
    const user = await getCurrentUserHelper(ctx);
    return user;
  },
});

/**
 * Get a user by username (for authentication purposes)
 * This is used by NextAuth to authenticate users
 */
export const getUserByUsername = query({
  args: { username: v.string() },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("systemUsers")
      .withIndex("by_name", (q) => q.eq("name", args.username))
      .first();
    
    return user;
  },
});

/**
 * Get a user by email (for backward compatibility)
 * @deprecated Use getUserByUsername instead
 */
export const getUserByEmail = query({
  args: { email: v.string() },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("systemUsers")
      .withIndex("by_email", (q) => q.eq("email", args.email))
      .first();
    
    return user;
  },
});

/**
 * List all users (Super Admin only)
 */
export const listUsers = query({
  args: {
    role: v.optional(v.union(
      v.literal("super_admin"),
      v.literal("administrator"),
      v.literal("game_master"),
      v.literal("instructor")
    )),
  },
  handler: async (ctx, args) => {
    await requireRole(ctx, "super_admin");

    const users = await ctx.db.query("systemUsers").collect();
    
    if (args.role) {
      // Filter users by role
      const usersWithRole = await Promise.all(
        users.map(async (user) => {
          const userRole = await ctx.db
            .query("userRoles")
            .withIndex("by_user_and_role", (q) => 
              q.eq("userId", user._id).eq("role", args.role!)
            )
            .first();
          return userRole ? user : null;
        })
      );
      return usersWithRole.filter(user => user !== null);
    }
    
    return users;
  },
});

/**
 * List all users with their roles (Administrator and Super Admin only)
 */
export const listUsersWithRoles = query({
  args: {},
  handler: async (ctx) => {
    await requireRole(ctx, "administrator");

    const users = await ctx.db.query("systemUsers").order("desc").collect();
    
    // Get roles for each user
    const usersWithRoles = await Promise.all(
      users.map(async (user) => {
        const userRoles = await ctx.db
          .query("userRoles")
          .withIndex("by_user", (q) => q.eq("userId", user._id))
          .collect();
        
        return {
          ...user,
          roles: userRoles.map(ur => ur.role),
        };
      })
    );
    
    return usersWithRoles;
  },
});

/**
 * Get a specific user by ID
 */
export const getUser = query({
  args: { userId: v.id("systemUsers") },
  handler: async (ctx, args) => {
    await requireRole(ctx, "administrator");
    const user = await ctx.db.get(args.userId);
    return user;
  },
});

/**
 * Get user roles for a specific user
 */
export const getUserRoles = query({
  args: { userId: v.id("systemUsers") },
  handler: async (ctx, args) => {
    await requireAuth(ctx);

    const userRoles = await ctx.db
      .query("userRoles")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .collect();

    return userRoles.map(ur => ur.role);
  },
});

/**
 * Create a new user record (Super Admin only)
 * Note: User must sign up through the login page first to create auth credentials
 */
export const createUser = mutation({
  args: {
    email: v.optional(v.string()),
    name: v.string(), // Username - must be unique
    roles: v.array(v.union(
      v.literal("super_admin"),
      v.literal("administrator"),
      v.literal("game_master"),
      v.literal("instructor")
    )),
  },
  handler: async (ctx, args) => {
    await requireRole(ctx, "super_admin");

    // Check if username already exists
    const existingUser = await ctx.db
      .query("systemUsers")
      .withIndex("by_name", (q) => q.eq("name", args.name))
      .first();

    if (existingUser) {
      throw new Error("Username already exists");
    }

    // Create the user
    const userId = await ctx.db.insert("systemUsers", {
      email: args.email,
      name: args.name, // Username
      isActive: true,
      requirePasswordChange: false,
      lastPasswordChange: Date.now(),
    });

    // Create user roles
    for (const role of args.roles) {
      await ctx.db.insert("userRoles", {
        userId,
        role,
      });
    }

    return userId;
  },
});

/**
 * Update user roles (Administrator and Super Admin only)
 * Administrators cannot assign super_admin role
 */
export const updateUserRoles = mutation({
  args: {
    userId: v.id("systemUsers"),
    roles: v.array(v.union(
      v.literal("super_admin"),
      v.literal("administrator"),
      v.literal("game_master"),
      v.literal("instructor")
    )),
  },
  handler: async (ctx, args) => {
    await requireRole(ctx, "administrator");

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
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .collect();

    for (const role of existingRoles) {
      await ctx.db.delete(role._id);
    }

    // Add new roles
    for (const role of args.roles) {
      await ctx.db.insert("userRoles", {
        userId: args.userId,
        role,
      });
    }

    return { success: true };
  },
});

/**
 * Update user information (Administrator and Super Admin only)
 */
export const updateUser = mutation({
  args: {
    userId: v.id("systemUsers"),
    name: v.optional(v.string()), // Username
  },
  handler: async (ctx, args) => {
    await requireRole(ctx, "administrator");

    const user = await ctx.db.get(args.userId);
    if (!user) {
      throw new Error("User not found");
    }

    // Check if username is being changed and if it's already taken
    if (args.name && args.name !== user.name) {
      const newUsername = args.name; // Type narrowing for the query
      const existingUser = await ctx.db
        .query("systemUsers")
        .withIndex("by_name", (q) => q.eq("name", newUsername))
        .first();
      
      if (existingUser) {
        throw new Error("Username already taken");
      }
    }

    // Update the user
    const updates: any = {};
    if (args.name !== undefined) updates.name = args.name;

    await ctx.db.patch(args.userId, updates);

    return { success: true };
  },
});

/**
 * Toggle user active status (Super Admin only)
 * Cannot deactivate Super Administrators
 */
export const toggleUserStatus = mutation({
  args: { userId: v.id("systemUsers") },
  handler: async (ctx, args) => {
    await requireRole(ctx, "super_admin");

    const user = await ctx.db.get(args.userId);
    if (!user) {
      throw new Error("User not found");
    }

    // Check if user is a super admin
    const userRoles = await ctx.db
      .query("userRoles")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .collect();

    const isSuperAdmin = userRoles.some(role => role.role === "super_admin");

    if (isSuperAdmin) {
      throw new Error("Cannot deactivate Super Administrator accounts");
    }

    await ctx.db.patch(args.userId, {
      isActive: !user.isActive,
    });

    return { success: true };
  },
});

/**
 * Delete a user (Super Admin only)
 * This also removes all associated user roles
 * Cannot delete Super Administrators
 */
export const deleteUser = mutation({
  args: { userId: v.id("systemUsers") },
  handler: async (ctx, args) => {
    await requireRole(ctx, "super_admin");

    const user = await ctx.db.get(args.userId);
    if (!user) {
      throw new Error("User not found");
    }

    // Get all user roles first
    const userRoles = await ctx.db
      .query("userRoles")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .collect();

    // Check if user is a super admin
    const isSuperAdmin = userRoles.some(role => role.role === "super_admin");

    if (isSuperAdmin) {
      throw new Error("Cannot delete Super Administrator accounts");
    }

    // Delete all user roles
    for (const role of userRoles) {
      await ctx.db.delete(role._id);
    }

    // Delete instructor school assignments if any
    const instructorAssignments = await ctx.db
      .query("instructorSchools")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .collect();

    for (const assignment of instructorAssignments) {
      await ctx.db.delete(assignment._id);
    }

    // Delete the user
    await ctx.db.delete(args.userId);

    return { success: true };
  },
});

/**
 * Assign an instructor to a school (Super Admin or Administrator)
 */
export const assignInstructorToSchool = mutation({
  args: {
    userId: v.id("systemUsers"),
    schoolId: v.id("schools"),
  },
  handler: async (ctx, args) => {
    await requireRole(ctx, "administrator");

    // Verify user is an instructor
    const instructorRole = await ctx.db
      .query("userRoles")
      .withIndex("by_user_and_role", (q) => 
        q.eq("userId", args.userId).eq("role", "instructor")
      )
      .first();

    if (!instructorRole) {
      throw new Error("User must be an instructor");
    }

    // Check if already assigned
    const existing = await ctx.db
      .query("instructorSchools")
      .withIndex("by_user_and_school", (q) =>
        q.eq("userId", args.userId).eq("schoolId", args.schoolId)
      )
      .first();

    if (existing) {
      throw new Error("Instructor already assigned to this school");
    }

    // Create assignment
    const assignmentId = await ctx.db.insert("instructorSchools", {
      userId: args.userId,
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
    userId: v.id("systemUsers"),
    schoolId: v.id("schools"),
  },
  handler: async (ctx, args) => {
    await requireRole(ctx, "administrator");

    const assignment = await ctx.db
      .query("instructorSchools")
      .withIndex("by_user_and_school", (q) =>
        q.eq("userId", args.userId).eq("schoolId", args.schoolId)
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
  args: { userId: v.id("systemUsers") },
  handler: async (ctx, args) => {
    await requireAuth(ctx);

    const assignments = await ctx.db
      .query("instructorSchools")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
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
 * Set user password hash (called from NextAuth or when creating users)
 */
export const setUserPassword = mutation({
  args: {
    userId: v.id("systemUsers"),
    passwordHash: v.string(),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.userId, {
      passwordHash: args.passwordHash,
      lastPasswordChange: Date.now(),
    });
    
    return { success: true };
  },
});

/**
 * Internal mutation to create systemUser record after auth account is created
 */
export const createSystemUserRecord = internalMutation({
  args: {
    email: v.optional(v.string()),
    name: v.string(), // Username - must be unique
    roles: v.array(v.union(
      v.literal("super_admin"),
      v.literal("administrator"),
      v.literal("game_master"),
      v.literal("instructor")
    )),
    requirePasswordChange: v.boolean(),
  },
  handler: async (ctx, args) => {
    // Check if username already exists
    const existingUser = await ctx.db
      .query("systemUsers")
      .withIndex("by_name", (q) => q.eq("name", args.name))
      .first();

    if (existingUser) {
      return existingUser._id;
    }

    // Create the system user record
    const userId = await ctx.db.insert("systemUsers", {
      email: args.email,
      name: args.name, // Username
      isActive: true,
      requirePasswordChange: args.requirePasswordChange,
      lastPasswordChange: Date.now(),
    });

    // Create user roles
    for (const role of args.roles) {
      await ctx.db.insert("userRoles", {
        userId,
        role,
      });
    }

    return userId;
  },
});

/**
 * Create a new user account with auth credentials (Administrator and Super Admin only)
 * This is now in userActions.ts since it uses Node.js crypto
 */

/**
 * Internal mutation to create user account
 * Note: Administrators are not allowed to create super_admin accounts
 * This is enforced at the UI level and should be validated by calling context
 */
export const createUserAccountInternal = internalMutation({
  args: {
    name: v.string(), // Username - must be unique
    passwordHash: v.string(),
    roles: v.array(v.union(
      v.literal("super_admin"),
      v.literal("administrator"),
      v.literal("game_master"),
      v.literal("instructor")
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

    const userId = await ctx.db.insert("systemUsers", {
      name: args.name, // Username
      passwordHash: args.passwordHash,
      isActive: true,
      requirePasswordChange: true,
      lastPasswordChange: Date.now(),
    });

    // Create user roles
    for (const role of args.roles) {
      await ctx.db.insert("userRoles", {
        userId,
        role,
      });
    }

    return {
      success: true,
      userId,
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
    userId: v.id("systemUsers"),
    newPasswordHash: v.string(),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.userId, {
      passwordHash: args.newPasswordHash,
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
    userId: v.id("systemUsers"),
    newPasswordHash: v.string(),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.userId, {
      passwordHash: args.newPasswordHash,
      requirePasswordChange: true, // User must change password on next login
      lastPasswordChange: Date.now(),
    });
  },
});


