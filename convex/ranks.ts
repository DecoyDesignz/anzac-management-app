import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { requireAuth, requireRole, resolveUserIdToPersonnel } from "./helpers";

/**
 * List all ranks ordered by promotion hierarchy
 */
export const listRanks = query({
  args: {
    userId: v.string(), // User ID from NextAuth session (can be systemUsers or personnel ID)
  },
  handler: async (ctx, args) => {
    const personnelId = await resolveUserIdToPersonnel(ctx, args.userId);
    await requireAuth(ctx, personnelId);

    const ranks = await ctx.db
      .query("ranks")
      .collect();

    // Sort by order if available
    return ranks.sort((a, b) => (a.order ?? 999) - (b.order ?? 999));
  },
});

/**
 * Get a specific rank
 */
export const getRank = query({
  args: {
    userId: v.id("personnel"), // User ID from NextAuth session
    rankId: v.id("ranks")
  },
  handler: async (ctx, args) => {
    await requireAuth(ctx, args.userId);

    const rank = await ctx.db.get(args.rankId);
    return rank;
  },
});

/**
 * Get rank with personnel count
 */
export const getRankWithCount = query({
  args: {
    userId: v.id("personnel"), // User ID from NextAuth session
    rankId: v.id("ranks")
  },
  handler: async (ctx, args) => {
    await requireAuth(ctx, args.userId);

    const rank = await ctx.db.get(args.rankId);
    if (!rank) {
      return null;
    }

    const personnel = await ctx.db
      .query("personnel")
      .withIndex("by_rank", (q) => q.eq("rankId", args.rankId))
      .collect();

    return {
      ...rank,
      personnelCount: personnel.length,
    };
  },
});

/**
 * List all ranks with personnel counts ordered by promotion hierarchy
 */
export const listRanksWithCounts = query({
  args: {
    userId: v.id("personnel"), // User ID from NextAuth session
  },
  handler: async (ctx, args) => {
    await requireAuth(ctx, args.userId);

    const ranks = await ctx.db
      .query("ranks")
      .collect();

    const ranksWithCounts = await Promise.all(
      ranks.map(async (rank) => {
        const personnel = await ctx.db
          .query("personnel")
          .withIndex("by_rank", (q) => q.eq("rankId", rank._id))
          .collect();

        return {
          ...rank,
          personnelCount: personnel.length,
        };
      })
    );

    // Sort by order if available
    return ranksWithCounts.sort((a, b) => (a.order ?? 999) - (b.order ?? 999));
  },
});

/**
 * Create a new rank (Administrator or higher)
 */
export const createRank = mutation({
  args: {
    userId: v.id("personnel"), // User ID from NextAuth session
    name: v.string(),
    abbreviation: v.string(),
    insigniaUrl: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await requireRole(ctx, args.userId, "administrator");

    // Check if rank with same name exists
    const existing = await ctx.db
      .query("ranks")
      .withIndex("by_name", (q) => q.eq("name", args.name))
      .first();

    if (existing) {
      throw new Error("Rank with this name already exists");
    }

    // Get the highest order number and add 1
    const allRanks = await ctx.db.query("ranks").collect();
    const maxOrder = allRanks.reduce((max, rank) => Math.max(max, rank.order || 0), -1);

    const rankId = await ctx.db.insert("ranks", {
      name: args.name,
      abbreviation: args.abbreviation,
      order: maxOrder + 1,
      insigniaUrl: args.insigniaUrl,
    });

    return rankId;
  },
});

/**
 * Update a rank (Administrator or higher)
 */
export const updateRank = mutation({
  args: {
    userId: v.id("personnel"), // User ID from NextAuth session
    rankId: v.id("ranks"),
    name: v.optional(v.string()),
    abbreviation: v.optional(v.string()),
    insigniaUrl: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await requireRole(ctx, args.userId, "administrator");

    const { rankId, ...updates } = args;
    
    // Remove undefined values
    const cleanUpdates = Object.fromEntries(
      Object.entries(updates).filter(([_, v]) => v !== undefined)
    );

    await ctx.db.patch(rankId, cleanUpdates);
    return { success: true };
  },
});

/**
 * Delete a rank (Administrator or higher)
 * Note: This will fail if personnel are assigned to this rank
 */
export const deleteRank = mutation({
  args: {
    userId: v.id("personnel"), // User ID from NextAuth session
    rankId: v.id("ranks")
  },
  handler: async (ctx, args) => {
    await requireRole(ctx, args.userId, "administrator");

    // Get the rank name for better error messages
    const rank = await ctx.db.get(args.rankId);
    if (!rank) {
      throw new Error("Rank not found.");
    }

    // Check if any personnel are assigned to this rank
    const personnel = await ctx.db
      .query("personnel")
      .withIndex("by_rank", (q) => q.eq("rankId", args.rankId))
      .collect();

    if (personnel.length > 0) {
      throw new Error(
        `Cannot delete "${rank.name}"\n\n` +
        `${personnel.length} member${personnel.length !== 1 ? 's are' : ' is'} currently assigned this rank.\n\n` +
        `Please reassign ${personnel.length !== 1 ? 'them' : 'them'} to a different rank first.`
      );
    }

    // Check rank history
    const history = await ctx.db
      .query("rankHistory")
      .withIndex("by_rank", (q) => q.eq("rankId", args.rankId))
      .first();

    if (history) {
      throw new Error(
        `Cannot delete "${rank.name}"\n\n` +
        `This rank is referenced in promotion history.\n\n` +
        `Deleting ranks with historical records is not permitted to maintain data integrity.`
      );
    }

    await ctx.db.delete(args.rankId);
    return { success: true };
  },
});

/**
 * Update rank order/positions (for drag and drop reordering)
 */
export const updateRankOrder = mutation({
  args: {
    userId: v.id("personnel"), // User ID from NextAuth session
    updates: v.array(
      v.object({
        rankId: v.id("ranks"),
        order: v.number(),
      })
    ),
  },
  handler: async (ctx, args) => {
    await requireRole(ctx, args.userId, "administrator");

    // Update each rank's order
    for (const update of args.updates) {
      await ctx.db.patch(update.rankId, {
        order: update.order,
      });
    }

    return { success: true };
  },
});

