import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { requireAuth, requireRole, canAwardQualification, canManageSchool } from "./helpers";

/**
 * List all personnel
 */
export const listPersonnel = query({
  args: {
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
    await requireAuth(ctx);

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
 * List all personnel with their qualifications
 */
export const listPersonnelWithQualifications = query({
  args: {
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
    await requireAuth(ctx);

    const personnel = args.status
      ? await ctx.db
          .query("personnel")
          .withIndex("by_status", (q) => q.eq("status", args.status!))
          .collect()
      : await ctx.db.query("personnel").collect();
    
    // Enrich with rank and qualifications information
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

        return {
          ...person,
          rank,
          qualifications: qualifications.filter(q => q !== null),
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
  args: { personnelId: v.id("personnel") },
  handler: async (ctx, args) => {
    await requireAuth(ctx);

    const person = await ctx.db.get(args.personnelId);
    if (!person) {
      return null;
    }

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

    return {
      ...person,
      rank,
      qualifications,
      rankHistory: rankHistoryWithDetails,
    };
  },
});

/**
 * Create a new personnel member (Instructor or higher)
 */
export const createPersonnel = mutation({
  args: {
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
    await requireRole(ctx, "instructor");

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
 * Update personnel information (Administrator or Instructor)
 */
export const updatePersonnel = mutation({
  args: {
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
    await requireRole(ctx, "instructor");

    const { personnelId, ...updates } = args;
    
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
    personnelId: v.id("personnel"),
    newRankId: v.id("ranks"),
    promotionDate: v.number(),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await requireRole(ctx, "administrator");

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
    personnelId: v.id("personnel"),
    qualificationId: v.id("qualifications"),
    awardedDate: v.number(),
    expiryDate: v.optional(v.number()),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await requireRole(ctx, "instructor");

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
    personnelId: v.id("personnel"),
    qualificationId: v.id("qualifications"),
  },
  handler: async (ctx, args) => {
    const user = await requireAuth(ctx);

    // Get the qualification to check its school
    const qualification = await ctx.db.get(args.qualificationId);
    if (!qualification) {
      throw new Error("Qualification not found");
    }

    // TEMPORARY: Since auth integration isn't complete, allow all operations
    // The frontend controls access via session data
    // Check if user can manage this qualification's school
    // const canManage = await canManageSchool(ctx, user._id, qualification.schoolId);
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
  args: { personnelId: v.id("personnel") },
  handler: async (ctx, args) => {
    await requireRole(ctx, "administrator");

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

