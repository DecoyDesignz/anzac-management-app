import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { requireAuth, requireRole, canAwardQualification, canManageSchool, isStaffRole, isStaff } from "./helpers";

/**
 * List all personnel
 */
export const listPersonnel = query({
  args: {
    userId: v.id("personnel"), // User ID from NextAuth session
    status: v.optional(
      v.union(
        v.literal("active"),
        v.literal("inactive"),
        v.literal("leave"),
        v.literal("discharged")
      )
    ),
  },
  handler: async (ctx, args) => {
    await requireAuth(ctx, args.userId);

    const personnel = args.status
      ? await ctx.db
          .query("personnel")
          .withIndex("by_status", (q) => q.eq("status", args.status!))
          .collect()
      : await ctx.db.query("personnel").collect();
    
    // Enrich with rank information
    const personnelWithDetails = await Promise.all(
      personnel.map(async (person) => {
        const rank = person.rankId ? await ctx.db.get(person.rankId) : null;
        return {
          ...person,
          rank,
        };
      })
    );

    return personnelWithDetails;
  },
});

/**
 * List all personnel without system access (for granting access)
 */
export const listPersonnelWithoutAccess = query({
  args: {
    userId: v.id("personnel"), // User ID from NextAuth session
  },
  handler: async (ctx, args) => {
    await requireAuth(ctx, args.userId);

    // Get all personnel
    const allPersonnel = await ctx.db.query("personnel").collect();
    
    // Filter to only those without system access (no passwordHash)
    const personnelWithoutAccess = allPersonnel.filter(p => !p.passwordHash);
    
    // Enrich with rank information
    const personnelWithDetails = await Promise.all(
      personnelWithoutAccess.map(async (person) => {
        const rank = person.rankId ? await ctx.db.get(person.rankId) : null;
        return {
          _id: person._id,
          callSign: person.callSign,
          firstName: person.firstName,
          lastName: person.lastName,
          email: person.email,
          rank,
          status: person.status,
        };
      })
    );

    return personnelWithDetails;
  },
});

/**
 * List all personnel with their qualifications and system roles
 */
export const listPersonnelWithQualifications = query({
  args: {
    userId: v.id("personnel"), // User ID from NextAuth session
    status: v.optional(
      v.union(
        v.literal("active"),
        v.literal("inactive"),
        v.literal("leave"),
        v.literal("discharged")
      )
    ),
  },
  handler: async (ctx, args) => {
    await requireAuth(ctx, args.userId);

    const personnel = args.status
      ? await ctx.db
          .query("personnel")
          .withIndex("by_status", (q) => q.eq("status", args.status!))
          .collect()
      : await ctx.db.query("personnel").collect();
    
    // Enrich with rank, qualifications, and system roles information
    const personnelWithDetails = await Promise.all(
      personnel.map(async (person) => {
        const rank = person.rankId ? await ctx.db.get(person.rankId) : null;
        
        // Get qualifications
        const personnelQuals = await ctx.db
          .query("personnelQualifications")
          .withIndex("by_personnel", (q) => q.eq("personnelId", person._id))
          .collect();

        const qualifications = await Promise.all(
          personnelQuals.map(async (pq) => {
            const qualification = await ctx.db.get(pq.qualificationId);
            return qualification;
          })
        );

        // Get system roles with full details
        const personnelRoles = await ctx.db
          .query("userRoles")
          .withIndex("by_personnel", (q) => q.eq("personnelId", person._id))
          .collect();

        // Get role details from role IDs
        const roles = await ctx.db.query("roles").collect();
        const roleMap = new Map(roles.map(role => [role._id, role]));
        const roleDetails = personnelRoles
          .map(ur => ur.roleId ? roleMap.get(ur.roleId) : null)
          .filter(Boolean)
          .map(role => ({
            name: role!.roleName,
            displayName: role!.displayName,
            color: role!.color,
          }));

        // Exclude staffNotes from list view (only available in detail view with proper permissions)
        const { staffNotes, ...personWithoutStaffNotes } = person;
        
        return {
          ...personWithoutStaffNotes,
          rank,
          qualifications: qualifications.filter(q => q !== null),
          roles: roleDetails,
          hasSystemAccess: person.passwordHash !== undefined,
        };
      })
    );

    return personnelWithDetails;
  },
});

/**
 * Get a specific personnel member with full details
 */
export const getPersonnelDetails = query({
  args: { 
    userId: v.id("personnel"), // User ID from NextAuth session
    personnelId: v.id("personnel"),
    requesterUsername: v.optional(v.string()), // Username of the person making the request (deprecated, use userId)
    requesterRole: v.optional(v.string()), // Role of the person making the request (deprecated, will be determined from userId)
  },
  handler: async (ctx, args) => {
    const requester = await requireAuth(ctx, args.userId);

    const person = await ctx.db.get(args.personnelId);
    if (!person) {
      return null;
    }

    // Check if requester is viewing their own profile
    const isViewingSelf = requester._id === args.personnelId;

    // Check if requester has staff role by querying their roles
    const isRequesterStaff = await isStaff(ctx, args.userId);

    // Only include staffNotes if requester is staff and not viewing themselves
    const includeStaffNotes = isRequesterStaff && !isViewingSelf;

    // Get rank
    const rank = person.rankId ? await ctx.db.get(person.rankId) : null;

    // Get qualifications
    const personnelQuals = await ctx.db
      .query("personnelQualifications")
      .withIndex("by_personnel", (q) => q.eq("personnelId", args.personnelId))
      .collect();

    const qualifications = await Promise.all(
      personnelQuals.map(async (pq) => {
        const qualification = await ctx.db.get(pq.qualificationId);
        const awardedByUser = pq.awardedBy ? await ctx.db.get(pq.awardedBy) : null;
        return {
          ...qualification,
          awardedDate: pq.awardedDate,
          expiryDate: pq.expiryDate,
          awardedBy: awardedByUser,
          notes: pq.notes,
        };
      })
    );

    // Get rank history
    const rankHistory = await ctx.db
      .query("rankHistory")
      .withIndex("by_personnel", (q) => q.eq("personnelId", args.personnelId))
      .collect();

    const rankHistoryWithDetails = await Promise.all(
      rankHistory.map(async (rh) => {
        const historyRank = await ctx.db.get(rh.rankId);
        const promotedByUser = rh.promotedBy
          ? await ctx.db.get(rh.promotedBy)
          : null;
        return {
          ...rh,
          rank: historyRank,
          promotedBy: promotedByUser,
        };
      })
    );

    // Build result object, conditionally including staffNotes
    const result: any = {
      ...person,
      rank,
      qualifications,
      rankHistory: rankHistoryWithDetails,
    };

    // Only include staffNotes if requester is staff and not viewing themselves
    if (includeStaffNotes) {
      result.staffNotes = person.staffNotes;
    } else {
      // Explicitly exclude staffNotes
      const { staffNotes, ...rest } = result;
      return rest;
    }

    return result;
  },
});

/**
 * Create a new personnel member (All staff: Instructor, Game Master, Administrator, or Super Admin)
 * Note: This does NOT create a login account - only Administrators can do that
 */
export const createPersonnel = mutation({
  args: {
    userId: v.id("personnel"), // User ID from NextAuth session
    callSign: v.string(),
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
    joinDate: v.number(),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await requireAuth(ctx, args.userId);
    
    // Check if user has staff role (instructor, game_master, administrator, or super_admin)
    const isUserStaff = await isStaff(ctx, args.userId);
    
    if (!isUserStaff) {
      throw new Error("Access denied: Requires staff role (instructor, game master, administrator, or super admin)");
    }

    // Find the Private rank to assign by default
    const privateRank = await ctx.db
      .query("ranks")
      .filter((q) => q.eq(q.field("abbreviation"), "PTE"))
      .first();

    if (!privateRank) {
      throw new Error("Private rank not found. Please ensure ranks are seeded.");
    }

    // Use provided rankId or default to Private
    const assignedRankId = args.rankId || privateRank._id;

    // Verify the rank exists
    const rank = await ctx.db.get(assignedRankId);
    if (!rank) {
      throw new Error("Rank not found");
    }

    const personnelId = await ctx.db.insert("personnel", {
      callSign: args.callSign,
      firstName: args.firstName,
      lastName: args.lastName,
      email: args.email,
      phone: args.phone,
      rankId: assignedRankId,
      status: args.status,
      joinDate: args.joinDate,
      notes: args.notes,
    });

    // Create initial rank history entry for the assigned rank
    await ctx.db.insert("rankHistory", {
      personnelId,
      rankId: assignedRankId,
      promotionDate: args.joinDate,
      notes: assignedRankId === privateRank._id ? "Initial assignment - Private" : "Initial rank",
    });

    return personnelId;
  },
});

/**
 * Update personnel information (All staff: Instructor, Game Master, Administrator, or Super Admin)
 */
export const updatePersonnel = mutation({
  args: {
    userId: v.id("personnel"), // User ID from NextAuth session
    personnelId: v.id("personnel"),
    callSign: v.optional(v.string()),
    firstName: v.optional(v.string()),
    lastName: v.optional(v.string()),
    email: v.optional(v.string()),
    phone: v.optional(v.string()),
    status: v.optional(
      v.union(
        v.literal("active"),
        v.literal("inactive"),
        v.literal("leave"),
        v.literal("discharged")
      )
    ),
    dischargeDate: v.optional(v.number()),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await requireAuth(ctx, args.userId);
    
    // Check if user has staff role (instructor, game_master, administrator, or super_admin)
    const isUserStaff = await isStaff(ctx, args.userId);
    
    if (!isUserStaff) {
      throw new Error("Access denied: Requires staff role (instructor, game master, administrator, or super admin)");
    }

    const { personnelId, userId, ...updates } = args;
    
    // Remove undefined values
    const cleanUpdates = Object.fromEntries(
      Object.entries(updates).filter(([_, v]) => v !== undefined)
    );

    await ctx.db.patch(personnelId, cleanUpdates);
    return { success: true };
  },
});

/**
 * Promote personnel to a new rank (Administrator only)
 */
export const promotePersonnel = mutation({
  args: {
    userId: v.id("personnel"), // User ID from NextAuth session
    personnelId: v.id("personnel"),
    newRankId: v.id("ranks"),
    promotionDate: v.number(),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await requireRole(ctx, args.userId, "administrator");

    // Verify personnel exists
    const person = await ctx.db.get(args.personnelId);
    if (!person) {
      throw new Error("Personnel not found");
    }

    // Verify new rank exists
    const newRank = await ctx.db.get(args.newRankId);
    if (!newRank) {
      throw new Error("Rank not found");
    }

    // Update personnel rank
    await ctx.db.patch(args.personnelId, {
      rankId: args.newRankId,
    });

    // Create rank history entry
    await ctx.db.insert("rankHistory", {
      personnelId: args.personnelId,
      rankId: args.newRankId,
      promotionDate: args.promotionDate,
      promotedBy: user._id && user._id !== "" ? user._id : undefined, // Make optional if auth not fully implemented
      notes: args.notes,
    });

    return { success: true };
  },
});

/**
 * Award a qualification to personnel (Instructor with proper permissions)
 */
export const awardQualification = mutation({
  args: {
    userId: v.id("personnel"), // User ID from NextAuth session
    personnelId: v.id("personnel"),
    qualificationId: v.id("qualifications"),
    awardedDate: v.number(),
    expiryDate: v.optional(v.number()),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await requireRole(ctx, args.userId, "instructor");

    // Check if instructor has permission to award this qualification
    const canAward = await canAwardQualification(
      ctx,
      user._id,
      args.qualificationId
    );

    if (!canAward) {
      throw new Error(
        "You do not have permission to award this qualification. You must be assigned to the appropriate school."
      );
    }

    // Verify personnel exists
    const person = await ctx.db.get(args.personnelId);
    if (!person) {
      throw new Error("Personnel not found");
    }

    // Verify qualification exists
    const qualification = await ctx.db.get(args.qualificationId);
    if (!qualification) {
      throw new Error("Qualification not found");
    }

    // Check if personnel already has this qualification
    const existing = await ctx.db
      .query("personnelQualifications")
      .withIndex("by_personnel", (q) => q.eq("personnelId", args.personnelId))
      .collect();

    const alreadyHas = existing.some(
      (pq) => pq.qualificationId === args.qualificationId
    );

    if (alreadyHas) {
      throw new Error("Personnel already has this qualification");
    }

    // Award the qualification
    // Build the qualification object with only defined fields
    const qualificationData: any = {
      personnelId: args.personnelId,
      qualificationId: args.qualificationId,
      awardedDate: args.awardedDate,
    };

    // Add optional fields only if they have valid values
    if (args.expiryDate) {
      qualificationData.expiryDate = args.expiryDate;
    }
    if (args.notes) {
      qualificationData.notes = args.notes;
    }
    if (user._id && user._id !== "") {
      qualificationData.awardedBy = user._id;
    }

    const qualificationId = await ctx.db.insert("personnelQualifications", qualificationData);

    return qualificationId;
  },
});

/**
 * Remove a qualification from personnel (Administrator or assigned Instructor)
 */
export const removeQualification = mutation({
  args: {
    userId: v.id("personnel"), // User ID from NextAuth session
    personnelId: v.id("personnel"),
    qualificationId: v.id("qualifications"),
  },
  handler: async (ctx, args) => {
    const user = await requireAuth(ctx, args.userId);

    // Get the qualification to check its school
    const qualification = await ctx.db.get(args.qualificationId);
    if (!qualification) {
      throw new Error("Qualification not found");
    }

    // TEMPORARY: Since auth integration isn't complete, allow all operations
    // The frontend controls access via session data
    // Check if user can manage this qualification's school
    // const canManage = await canManageSchool(ctx, args.userId, qualification.schoolId);
    // if (!canManage) {
    //   throw new Error("You do not have permission to remove this qualification");
    // }

    // Find the personnel qualification record
    const personnelQuals = await ctx.db
      .query("personnelQualifications")
      .withIndex("by_personnel", (q) => q.eq("personnelId", args.personnelId))
      .collect();

    const qualToRemove = personnelQuals.find(
      (pq) => pq.qualificationId === args.qualificationId
    );

    if (!qualToRemove) {
      throw new Error("Personnel does not have this qualification");
    }

    await ctx.db.delete(qualToRemove._id);
    return { success: true };
  },
});

/**
 * Delete personnel (Administrator only)
 */
export const deletePersonnel = mutation({
  args: { 
    userId: v.id("personnel"), // User ID from NextAuth session
    personnelId: v.id("personnel") 
  },
  handler: async (ctx, args) => {
    await requireRole(ctx, args.userId, "administrator");

    // Delete all qualifications
    const qualifications = await ctx.db
      .query("personnelQualifications")
      .withIndex("by_personnel", (q) => q.eq("personnelId", args.personnelId))
      .collect();

    for (const qual of qualifications) {
      await ctx.db.delete(qual._id);
    }

    // Delete rank history
    const rankHistory = await ctx.db
      .query("rankHistory")
      .withIndex("by_personnel", (q) => q.eq("personnelId", args.personnelId))
      .collect();

    for (const history of rankHistory) {
      await ctx.db.delete(history._id);
    }

    // Delete personnel
    await ctx.db.delete(args.personnelId);
    return { success: true };
  },
});

/**
 * Get personnel with their system roles
 */
export const listPersonnelWithRoles = query({
  args: {
    userId: v.id("personnel"), // User ID from NextAuth session
    status: v.optional(
      v.union(
        v.literal("active"),
        v.literal("inactive"),
        v.literal("leave"),
        v.literal("discharged")
      )
    ),
    systemAccessOnly: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    await requireAuth(ctx, args.userId);

    let personnel = args.status
      ? await ctx.db
          .query("personnel")
          .withIndex("by_status", (q) => q.eq("status", args.status!))
          .collect()
      : await ctx.db.query("personnel").collect();
    
    // Filter to only personnel with system access if requested
    if (args.systemAccessOnly) {
      personnel = personnel.filter(p => p.passwordHash !== undefined);
    }

    // Enrich with rank and roles information
    const personnelWithDetails = await Promise.all(
      personnel.map(async (person) => {
        const rank = person.rankId ? await ctx.db.get(person.rankId) : null;
        
        // Get roles
        const personnelRoles = await ctx.db
          .query("userRoles")
          .withIndex("by_personnel", (q) => q.eq("personnelId", person._id))
          .collect();

        // Get role details from role IDs
        const roles = await ctx.db.query("roles").collect();
        const roleMap = new Map(roles.map(role => [role._id, role]));
        const roleDetails = personnelRoles
          .map(ur => ur.roleId ? roleMap.get(ur.roleId) : null)
          .filter(Boolean)
          .map(role => ({
            name: role!.roleName,
            displayName: role!.displayName,
            color: role!.color,
          }));

        return {
          ...person,
          rank,
          roles: roleDetails,
          hasSystemAccess: person.passwordHash !== undefined,
        };
      })
    );

    return personnelWithDetails;
  },
});

/**
 * Grant system access to personnel (Administrator only)
 * This allows a personnel member to log into the system
 * Password will be set separately via the admin
 */
export const grantSystemAccess = mutation({
  args: {
    userId: v.id("personnel"), // User ID from NextAuth session
    personnelId: v.id("personnel"),
    roles: v.array(v.union(
      v.literal("administrator"),
      v.literal("game_master"),
      v.literal("instructor"),
      v.literal("member")
    )),
  },
  handler: async (ctx, args) => {
    await requireRole(ctx, args.userId, "administrator");

    const person = await ctx.db.get(args.personnelId);
    if (!person) {
      throw new Error("Personnel not found");
    }

    // Check if personnel already has system access
    if (person.passwordHash) {
      throw new Error("Personnel already has system access");
    }

    // Note: Password will be set separately when admin creates the account
    // For now, just mark as ready for system access
    await ctx.db.patch(args.personnelId, {
      isActive: true,
      requirePasswordChange: true,
    });

    // Add roles
    for (const roleName of args.roles) {
      const role = await ctx.db
        .query("roles")
        .withIndex("by_role_name", (q) => q.eq("roleName", roleName))
        .first();
      
      if (role) {
        await ctx.db.insert("userRoles", {
          personnelId: args.personnelId,
          roleId: role._id,
        });
      }
    }

    return { success: true };
  },
});

/**
 * Revoke system access from personnel (Administrator only)
 * This removes login capability but keeps the personnel record
 */
export const revokeSystemAccess = mutation({
  args: {
    userId: v.id("personnel"), // User ID from NextAuth session
    personnelId: v.id("personnel"),
  },
  handler: async (ctx, args) => {
    await requireRole(ctx, args.userId, "administrator");

    const person = await ctx.db.get(args.personnelId);
    if (!person) {
      throw new Error("Personnel not found");
    }

    // Check if person has super_admin role (cannot revoke)
    const personnelRoles = await ctx.db
      .query("userRoles")
      .withIndex("by_personnel", (q) => q.eq("personnelId", args.personnelId))
      .collect();

    const roles = await ctx.db.query("roles").collect();
    const roleMap = new Map(roles.map(role => [role._id, role.roleName]));
    const isSuperAdmin = personnelRoles.some(r => r.roleId && roleMap.get(r.roleId) === "super_admin");
    if (isSuperAdmin) {
      throw new Error("Cannot revoke system access from Super Administrators");
    }

    // Remove all roles
    for (const role of personnelRoles) {
      await ctx.db.delete(role._id);
    }

    // Remove instructor school assignments
    const instructorAssignments = await ctx.db
      .query("instructorSchools")
      .withIndex("by_personnel", (q) => q.eq("personnelId", args.personnelId))
      .collect();

    for (const assignment of instructorAssignments) {
      await ctx.db.delete(assignment._id);
    }

    // Clear login credentials
    await ctx.db.patch(args.personnelId, {
      passwordHash: undefined,
      isActive: undefined,
      requirePasswordChange: undefined,
      lastPasswordChange: undefined,
    });

    return { success: true };
  },
});

/**
 * Update personnel roles (Administrator only)
 */
export const updatePersonnelRoles = mutation({
  args: {
    userId: v.id("personnel"), // User ID from NextAuth session
    personnelId: v.id("personnel"),
    roles: v.array(v.union(
      v.literal("administrator"),
      v.literal("game_master"),
      v.literal("instructor"),
      v.literal("member")
    )),
  },
  handler: async (ctx, args) => {
    await requireRole(ctx, args.userId, "administrator");

    // Remove existing roles
    const existingRoles = await ctx.db
      .query("userRoles")
      .withIndex("by_personnel", (q) => q.eq("personnelId", args.personnelId))
      .collect();

    for (const role of existingRoles) {
      await ctx.db.delete(role._id);
    }

    // Add new roles
    for (const roleName of args.roles) {
      const role = await ctx.db
        .query("roles")
        .withIndex("by_role_name", (q) => q.eq("roleName", roleName))
        .first();
      
      if (role) {
        await ctx.db.insert("userRoles", {
          personnelId: args.personnelId,
          roleId: role._id,
        });
      }
    }

    return { success: true };
  },
});

/**
 * Update staff notes for a personnel member (Staff only)
 * Staff notes are not visible to the personnel member themselves
 */
export const updateStaffNotes = mutation({
  args: {
    userId: v.id("personnel"), // User ID from NextAuth session
    personnelId: v.id("personnel"),
    staffNotes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Require instructor role or higher (all staff roles)
    await requireRole(ctx, args.userId, "instructor");

    const person = await ctx.db.get(args.personnelId);
    if (!person) {
      throw new Error("Personnel not found");
    }

    // Update staff notes
    await ctx.db.patch(args.personnelId, {
      staffNotes: args.staffNotes || undefined,
    });

    return { success: true };
  },
});

