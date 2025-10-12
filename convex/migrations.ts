import { mutation } from "./_generated/server";

/**
 * Migration: Add order field to existing ranks
 * This should be run once to update existing ranks that don't have an order field
 */
export const addOrderToRanks = mutation({
  args: {},
  handler: async (ctx) => {
    const ranks = await ctx.db.query("ranks").collect();
    
    // Define the default order based on typical military rank structure
    const rankOrder: Record<string, number> = {
      "Private": 0,
      "Lance Corporal": 1,
      "Corporal": 2,
      "Sergeant": 3,
      "Staff Sergeant": 4,
      "Warrant Officer Class 2": 5,
      "Warrant Officer Class 1": 6,
      "Second Lieutenant": 7,
      "Lieutenant": 8,
      "Captain": 9,
      "Major": 10,
      "Lieutenant Colonel": 11,
    };

    let updateCount = 0;
    for (const rank of ranks) {
      // Only update if order is missing
      if (rank.order === undefined) {
        const order = rankOrder[rank.name] ?? 0;
        await ctx.db.patch(rank._id, { order });
        updateCount++;
      }
    }

    return { 
      success: true, 
      message: `Updated ${updateCount} ranks with order field`,
      totalRanks: ranks.length 
    };
  },
});

