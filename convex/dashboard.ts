import { ConvexError, v } from "convex/values";
import { query } from "./_generated/server";
import { requireAuth, resolveUserIdToPersonnel } from "./helpers";
import { Doc, Id } from "./_generated/dataModel";
import { buildDashboardOverview } from "./dashboardOverviewShared";

/**
 * Get dashboard statistics
 */
export const getStatistics = query({
  args: {
    userId: v.string(), // Accept string to handle both old systemUsers IDs and personnel IDs during migration
  },
  handler: async (ctx, args) => {
    // Resolve userId to personnel ID (handles migration from systemUsers)
    let personnelId: Id<"personnel">;
    try {
      personnelId = await resolveUserIdToPersonnel(ctx, args.userId);
    } catch (error) {
      console.error("UserId resolution error in getStatistics:", {
        userId: args.userId,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }

    try {
      await requireAuth(ctx, personnelId);
    } catch (error) {
      console.error("Auth error in getStatistics:", error);
      throw error;
    }

    // Count total personnel
    let allPersonnel: Doc<"personnel">[] = [];
    try {
      allPersonnel = await ctx.db.query("personnel").collect();
    } catch (error) {
      console.error("Error fetching personnel in getStatistics:", error);
      allPersonnel = [];
    }
    const totalPersonnel = allPersonnel.length;
    const activePersonnel = allPersonnel.filter((p) => p.status === "active").length;

    // Count ranks
    let ranks: Doc<"ranks">[] = [];
    try {
      ranks = await ctx.db.query("ranks").collect();
    } catch (error) {
      console.error("Error fetching ranks:", error);
      ranks = [];
    }
    const totalRanks = ranks.length;

    // Count qualifications
    let qualifications: Doc<"qualifications">[] = [];
    try {
      qualifications = await ctx.db.query("qualifications").collect();
    } catch (error) {
      console.error("Error fetching qualifications:", error);
      qualifications = [];
    }
    const totalQualifications = qualifications.length;

    // Count schools
    let schools: Doc<"schools">[] = [];
    try {
      schools = await ctx.db.query("schools").collect();
    } catch (error) {
      console.error("Error fetching schools:", error);
      schools = [];
    }
    const totalSchools = schools.length;

    // Count users by role (personnel with system access)
    const personnelWithAccess = allPersonnel.filter(p => p.passwordHash !== undefined);
    
    let userRoles: Doc<"userRoles">[] = [];
    try {
      userRoles = await ctx.db.query("userRoles").collect();
    } catch (error) {
      console.error("Error fetching userRoles:", error);
      userRoles = [];
    }
    
    let roles: Doc<"roles">[] = [];
    try {
      roles = await ctx.db.query("roles").collect();
    } catch (error) {
      console.error("Error fetching roles:", error);
      roles = [];
    }
    
    // Create a map of role IDs to role names
    const roleMap = new Map(roles.map(role => [role._id, role.roleName]));
    
    const usersByRole = {
      super_admin: userRoles.filter((ur) => ur.roleId && roleMap.get(ur.roleId) === "super_admin").length,
      administrator: userRoles.filter((ur) => ur.roleId && roleMap.get(ur.roleId) === "administrator").length,
      game_master: userRoles.filter((ur) => ur.roleId && roleMap.get(ur.roleId) === "game_master").length,
      instructor: userRoles.filter((ur) => ur.roleId && roleMap.get(ur.roleId) === "instructor").length,
      member: userRoles.filter((ur) => ur.roleId && roleMap.get(ur.roleId) === "member").length,
    };

    return {
      totalPersonnel,
      activePersonnel,
      inactivePersonnel: totalPersonnel - activePersonnel,
      totalRanks,
      totalQualifications,
      totalSchools,
      totalUsers: personnelWithAccess.length,
      usersByRole,
    };
  },
});

/**
 * Get enhanced dashboard overview with qualifications and events
 */
export const getDashboardOverview = query({
  args: {
    userId: v.string(), // Accept string to handle both old systemUsers IDs and personnel IDs during migration
  },
  handler: async (ctx, args) => {
    // Resolve userId to personnel ID (handles migration from systemUsers)
    let personnelId: Id<"personnel">;
    try {
      personnelId = await resolveUserIdToPersonnel(ctx, args.userId);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error("UserId resolution error in getDashboardOverview:", {
        userId: args.userId,
        error: errorMessage,
        timestamp: new Date().toISOString()
      });
      
      if (error instanceof ConvexError) {
        throw error;
      }

      throw new ConvexError({
        code: "SESSION_EXPIRED",
        message: "Your session is invalid. Please log in again.",
        shouldLogout: true,
      });
    }

    // Validate and authenticate user with detailed error messages
    try {
      await requireAuth(ctx, personnelId);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error("Auth error in getDashboardOverview:", {
        userId: personnelId,
        error: errorMessage,
        timestamp: new Date().toISOString()
      });
      
      if (error instanceof ConvexError) {
        throw error;
      }

      throw new ConvexError({
        code: "AUTH_UNKNOWN",
        message: "Authentication failed. Please log in again.",
        shouldLogout: true,
      });
    }

    return await buildDashboardOverview(ctx, {
      userId: personnelId,
      source: "getDashboardOverview",
      forPublic: false,
    });
  },
});

/** Same payload as getDashboardOverview for unauthenticated public site visitors. */
export const getDashboardOverviewPublic = query({
  args: {},
  handler: async (ctx) => {
    return await buildDashboardOverview(ctx, {
      source: "getDashboardOverviewPublic",
      forPublic: true,
    });
  },
});

