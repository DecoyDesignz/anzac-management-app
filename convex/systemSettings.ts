import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { requireRole } from "./helpers";

/**
 * Get a system setting by key
 */
export const getSetting = query({
  args: { key: v.string() },
  handler: async (ctx, args) => {
    const setting = await ctx.db
      .query("systemSettings")
      .withIndex("by_key", (q) => q.eq("key", args.key))
      .first();
    
    return setting ? JSON.parse(setting.value) : null;
  },
});

/**
 * Get maintenance mode status
 */
export const getMaintenanceMode = query({
  args: {},
  handler: async (ctx) => {
    const setting = await ctx.db
      .query("systemSettings")
      .withIndex("by_key", (q) => q.eq("key", "maintenance_mode"))
      .first();
    
    if (!setting) {
      return {
        enabled: false,
        message: "System is currently under maintenance. Please check back later.",
        updatedAt: null,
      };
    }
    
    return JSON.parse(setting.value);
  },
});

/**
 * Toggle maintenance mode (admin only)
 */
export const setMaintenanceMode = mutation({
  args: {
    enabled: v.boolean(),
    message: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Require administrator role (super_admin also allowed as it's higher privilege)
    const user = await requireRole(ctx, "administrator");
    
    const existing = await ctx.db
      .query("systemSettings")
      .withIndex("by_key", (q) => q.eq("key", "maintenance_mode"))
      .first();
    
    const value = {
      enabled: args.enabled,
      message: args.message || "System is currently under maintenance. Please check back later.",
      updatedAt: Date.now(),
    };
    
    if (existing) {
      await ctx.db.patch(existing._id, {
        value: JSON.stringify(value),
        updatedAt: Date.now(),
        updatedBy: user.personnelId,
      });
    } else {
      await ctx.db.insert("systemSettings", {
        key: "maintenance_mode",
        value: JSON.stringify(value),
        updatedAt: Date.now(),
        updatedBy: user.personnelId,
      });
    }
    
    return value;
  },
});

/**
 * Update a system setting (admin only)
 */
export const updateSetting = mutation({
  args: {
    key: v.string(),
    value: v.any(),
  },
  handler: async (ctx, args) => {
    // Require administrator role (super_admin also allowed as it's higher privilege)
    const user = await requireRole(ctx, "administrator");
    
    const existing = await ctx.db
      .query("systemSettings")
      .withIndex("by_key", (q) => q.eq("key", args.key))
      .first();
    
    const valueString = JSON.stringify(args.value);
    
    if (existing) {
      await ctx.db.patch(existing._id, {
        value: valueString,
        updatedAt: Date.now(),
        updatedBy: user.personnelId,
      });
    } else {
      await ctx.db.insert("systemSettings", {
        key: args.key,
        value: valueString,
        updatedAt: Date.now(),
        updatedBy: user.personnelId,
      });
    }
    
    return JSON.parse(valueString);
  },
});

