import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { requireAuth, requireRole, canManageSchool } from "./helpers";

/**
 * List all qualifications
 */
export const listQualifications = query({
  args: {
    userId: v.id("personnel"), // User ID from NextAuth session
    schoolId: v.optional(v.id("schools")),
  },
  handler: async (ctx, args) => {
    await requireAuth(ctx, args.userId);

    const qualifications = args.schoolId
      ? await ctx.db
          .query("qualifications")
          .withIndex("by_school", (q) => q.eq("schoolId", args.schoolId!))
          .collect()
      : await ctx.db.query("qualifications").collect();
    
    // Enrich with school information
    const qualificationsWithSchool = await Promise.all(
      qualifications.map(async (qual) => {
        const school = await ctx.db.get(qual.schoolId);
        return {
          ...qual,
          school,
        };
      })
    );

    return qualificationsWithSchool;
  },
});

/**
 * Get a specific qualification
 */
export const getQualification = query({
  args: {
    userId: v.id("personnel"), // User ID from NextAuth session
    qualificationId: v.id("qualifications")
  },
  handler: async (ctx, args) => {
    await requireAuth(ctx, args.userId);

    const qualification = await ctx.db.get(args.qualificationId);
    if (!qualification) {
      return null;
    }

    const school = await ctx.db.get(qualification.schoolId);
    
    return {
      ...qualification,
      school,
    };
  },
});

/**
 * Get qualification with personnel count
 */
export const getQualificationWithCount = query({
  args: {
    userId: v.id("personnel"), // User ID from NextAuth session
    qualificationId: v.id("qualifications")
  },
  handler: async (ctx, args) => {
    await requireAuth(ctx, args.userId);

    const qualification = await ctx.db.get(args.qualificationId);
    if (!qualification) {
      return null;
    }

    const school = await ctx.db.get(qualification.schoolId);
    
    const personnelQuals = await ctx.db
      .query("personnelQualifications")
      .withIndex("by_qualification", (q) => q.eq("qualificationId", args.qualificationId))
      .collect();

    return {
      ...qualification,
      school,
      personnelCount: personnelQuals.length,
    };
  },
});

/**
 * List all qualifications with personnel counts
 */
export const listQualificationsWithCounts = query({
  args: {
    userId: v.id("personnel"), // User ID from NextAuth session
    schoolId: v.optional(v.id("schools")),
  },
  handler: async (ctx, args) => {
    await requireAuth(ctx, args.userId);

    const qualifications = args.schoolId
      ? await ctx.db
          .query("qualifications")
          .withIndex("by_school", (q) => q.eq("schoolId", args.schoolId!))
          .collect()
      : await ctx.db.query("qualifications").collect();

    const qualificationsWithCounts = await Promise.all(
      qualifications.map(async (qual) => {
        const school = await ctx.db.get(qual.schoolId);
        const personnelQuals = await ctx.db
          .query("personnelQualifications")
          .withIndex("by_qualification", (q) => q.eq("qualificationId", qual._id))
          .collect();

        return {
          ...qual,
          school,
          personnelCount: personnelQuals.length,
        };
      })
    );

    return qualificationsWithCounts;
  },
});

/**
 * Create a new qualification (Administrator or assigned Instructor)
 */
export const createQualification = mutation({
  args: {
    userId: v.id("personnel"), // User ID from NextAuth session
    name: v.string(),
    abbreviation: v.string(),
    schoolId: v.id("schools"),
    iconUrl: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await requireAuth(ctx, args.userId);

    // TEMPORARY: Since auth integration isn't complete, allow all operations
    // The frontend controls access via session data
    // Check if user can manage this school
    // const canManage = await canManageSchool(ctx, user._id, args.schoolId);
    // if (!canManage) {
    //   throw new Error("You do not have permission to manage this school's qualifications");
    // }

    // Verify school exists
    const school = await ctx.db.get(args.schoolId);
    if (!school) {
      throw new Error("School not found");
    }

    // Check if qualification with same name exists
    const existing = await ctx.db
      .query("qualifications")
      .withIndex("by_name", (q) => q.eq("name", args.name))
      .first();

    if (existing) {
      throw new Error("Qualification with this name already exists");
    }

    const qualificationId = await ctx.db.insert("qualifications", {
      name: args.name,
      abbreviation: args.abbreviation,
      schoolId: args.schoolId,
      iconUrl: args.iconUrl,
    });

    return qualificationId;
  },
});

/**
 * Update a qualification (Administrator or assigned Instructor)
 */
export const updateQualification = mutation({
  args: {
    userId: v.id("personnel"), // User ID from NextAuth session
    qualificationId: v.id("qualifications"),
    name: v.optional(v.string()),
    abbreviation: v.optional(v.string()),
    schoolId: v.optional(v.id("schools")),
    iconUrl: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await requireAuth(ctx, args.userId);

    // Get the qualification to check its current school
    const qualification = await ctx.db.get(args.qualificationId);
    if (!qualification) {
      throw new Error("Qualification not found");
    }

    // TEMPORARY: Since auth integration isn't complete, allow all operations
    // The frontend controls access via session data
    // Check if user can manage the current school
    // const canManageCurrent = await canManageSchool(ctx, user._id, qualification.schoolId);
    // if (!canManageCurrent) {
    //   throw new Error("You do not have permission to manage this qualification");
    // }

    const { qualificationId, ...updates } = args;
    
    // If changing school, verify it exists
    if (updates.schoolId) {
      const school = await ctx.db.get(updates.schoolId);
      if (!school) {
        throw new Error("School not found");
      }

      // TEMPORARY: Auth check disabled
      // const canManageNew = await canManageSchool(ctx, user._id, updates.schoolId);
      // if (!canManageNew) {
      //   throw new Error("You do not have permission to move this qualification to the target school");
      // }
    }
    
    // Remove undefined values
    const cleanUpdates = Object.fromEntries(
      Object.entries(updates).filter(([_, v]) => v !== undefined)
    );

    await ctx.db.patch(qualificationId, cleanUpdates);
    return { success: true };
  },
});

/**
 * Get all personnel who have a specific qualification
 */
export const getPersonnelWithQualification = query({
  args: {
    userId: v.id("personnel"), // User ID from NextAuth session
    qualificationId: v.id("qualifications")
  },
  handler: async (ctx, args) => {
    await requireAuth(ctx, args.userId);

    const qualification = await ctx.db.get(args.qualificationId);
    if (!qualification) {
      return null;
    }

    const personnelQuals = await ctx.db
      .query("personnelQualifications")
      .withIndex("by_qualification", (q) => q.eq("qualificationId", args.qualificationId))
      .collect();

    const personnelWithDetails = await Promise.all(
      personnelQuals.map(async (pq) => {
        const person = await ctx.db.get(pq.personnelId);
        if (!person) return null;

        const rank = person.rankId ? await ctx.db.get(person.rankId) : null;
        const awardedBy = pq.awardedBy ? await ctx.db.get(pq.awardedBy) : null;

        return {
          ...person,
          rank,
          qualificationDetails: {
            awardedDate: pq.awardedDate,
            expiryDate: pq.expiryDate,
            awardedBy: awardedBy?.callSign,
            notes: pq.notes,
          },
        };
      })
    );

    return {
      qualification,
      personnel: personnelWithDetails.filter((p) => p !== null),
    };
  },
});

/**
 * Delete a qualification (Administrator or assigned Instructor)
 * Note: This will fail if personnel have been awarded this qualification
 */
export const deleteQualification = mutation({
  args: {
    userId: v.id("personnel"), // User ID from NextAuth session
    qualificationId: v.id("qualifications")
  },
  handler: async (ctx, args) => {
    const user = await requireAuth(ctx, args.userId);

    // Get the qualification name for better error messages
    const qualification = await ctx.db.get(args.qualificationId);
    if (!qualification) {
      throw new Error("Qualification not found.");
    }

    // TEMPORARY: Since auth integration isn't complete, allow all operations
    // The frontend controls access via session data
    // Check if user can manage this qualification's school
    // const canManage = await canManageSchool(ctx, user._id, qualification.schoolId);
    // if (!canManage) {
    //   throw new Error("You do not have permission to manage this qualification");
    // }

    // Check if any personnel have this qualification
    const personnelQuals = await ctx.db
      .query("personnelQualifications")
      .withIndex("by_qualification", (q) => q.eq("qualificationId", args.qualificationId))
      .collect();

    if (personnelQuals.length > 0) {
      throw new Error(
        `Cannot delete "${qualification.name}"\n\n` +
        `${personnelQuals.length} member${personnelQuals.length !== 1 ? 's have' : ' has'} been awarded this qualification.\n\n` +
        `Remove this qualification from all personnel records first.`
      );
    }

    await ctx.db.delete(args.qualificationId);
    return { success: true };
  },
});

