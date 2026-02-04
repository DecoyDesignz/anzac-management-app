import { v } from "convex/values";
import { mutation, internalMutation, query } from "./_generated/server";
import type { MutationCtx } from "./_generated/server";
import type { Doc } from "./_generated/dataModel";
import { internal } from "./_generated/api";

// Rate limiting configuration
const RATE_LIMIT_CONFIG = {
  MAX_ATTEMPTS_PER_IP: 5, // Max attempts per IP address
  MAX_ATTEMPTS_PER_USERNAME: 5, // Max attempts per username
  WINDOW_MS: 15 * 60 * 1000, // 15 minutes in milliseconds
  ACCOUNT_LOCKOUT_ATTEMPTS: 10, // Lock account after this many failed attempts
  ACCOUNT_LOCKOUT_DURATION_MS: 30 * 60 * 1000, // 30 minutes lockout
  CLEANUP_AGE_MS: 60 * 60 * 1000, // Clean up attempts older than 1 hour
} as const;

/**
 * Internal function to clean up old login attempts
 */
export const cleanupOldAttempts = internalMutation({
  args: {},
  handler: async (ctx) => {
    const cutoffTime = Date.now() - RATE_LIMIT_CONFIG.CLEANUP_AGE_MS;
    
    const oldAttempts = await ctx.db
      .query("loginAttempts")
      .withIndex("by_timestamp", (q) => q.lt("timestamp", cutoffTime))
      .collect();
    
    // Delete old attempts
    for (const attempt of oldAttempts) {
      await ctx.db.delete(attempt._id);
    }
    
    return { deleted: oldAttempts.length };
  },
});

/**
 * Check if an IP address is rate limited
 */
async function checkIpRateLimit(ctx: MutationCtx, ipAddress: string | undefined): Promise<{ limited: boolean; remaining: number }> {
  if (!ipAddress) {
    return { limited: false, remaining: RATE_LIMIT_CONFIG.MAX_ATTEMPTS_PER_IP };
  }

  const windowStart = Date.now() - RATE_LIMIT_CONFIG.WINDOW_MS;

  const attemptsByIp = await ctx.db
    .query("loginAttempts")
    .withIndex("by_ip", (q) => q.eq("ipAddress", ipAddress))
    .collect();

  const recentAttempts = attemptsByIp.filter(
    (a: Doc<"loginAttempts">) => a.timestamp >= windowStart
  );

  const failedAttempts = recentAttempts.filter((a: Doc<"loginAttempts">) => !a.success);
  const attempts = failedAttempts.length;
  
  return {
    limited: attempts >= RATE_LIMIT_CONFIG.MAX_ATTEMPTS_PER_IP,
    remaining: Math.max(0, RATE_LIMIT_CONFIG.MAX_ATTEMPTS_PER_IP - attempts),
  };
}

/**
 * Check if a username is rate limited or account is locked
 */
async function checkUsernameRateLimit(
  ctx: MutationCtx,
  username: string
): Promise<{ limited: boolean; locked: boolean; remaining: number; lockoutExpires?: number }> {
  const windowStart = Date.now() - RATE_LIMIT_CONFIG.WINDOW_MS;

  const allRecentAttempts = await ctx.db
    .query("loginAttempts")
    .withIndex("by_username", (q) => q.eq("username", username))
    .collect();

  const recentAttempts = allRecentAttempts.filter(
    (a: Doc<"loginAttempts">) => a.timestamp >= windowStart
  );

  const failedAttempts = recentAttempts.filter((a: Doc<"loginAttempts">) => !a.success);
  const attempts = failedAttempts.length;

  const lockoutWindowStart = Date.now() - RATE_LIMIT_CONFIG.ACCOUNT_LOCKOUT_DURATION_MS;
  const lockoutAttempts = allRecentAttempts.filter(
    (a: Doc<"loginAttempts">) => a.timestamp >= lockoutWindowStart
  );

  const lockoutFailedAttempts = lockoutAttempts.filter((a: Doc<"loginAttempts">) => !a.success);
  const isLocked = lockoutFailedAttempts.length >= RATE_LIMIT_CONFIG.ACCOUNT_LOCKOUT_ATTEMPTS;

  let lockoutExpires: number | undefined;
  if (isLocked && lockoutFailedAttempts.length > 0) {
    const oldestAttempt = lockoutFailedAttempts.reduce(
      (oldest: Doc<"loginAttempts">, current: Doc<"loginAttempts">) =>
        current.timestamp < oldest.timestamp ? current : oldest
    );
    lockoutExpires = oldestAttempt.timestamp + RATE_LIMIT_CONFIG.ACCOUNT_LOCKOUT_DURATION_MS;
  }
  
  return {
    limited: attempts >= RATE_LIMIT_CONFIG.MAX_ATTEMPTS_PER_USERNAME,
    locked: isLocked,
    remaining: Math.max(0, RATE_LIMIT_CONFIG.MAX_ATTEMPTS_PER_USERNAME - attempts),
    lockoutExpires,
  };
}

/**
 * Record a login attempt
 */
export const recordLoginAttempt = internalMutation({
  args: {
    username: v.string(),
    ipAddress: v.optional(v.string()),
    success: v.boolean(),
    reason: v.optional(v.string()),
    personnelId: v.optional(v.id("personnel")),
  },
  handler: async (ctx, args) => {
    await ctx.db.insert("loginAttempts", {
      username: args.username,
      ipAddress: args.ipAddress,
      timestamp: Date.now(),
      success: args.success,
      reason: args.reason,
      personnelId: args.personnelId,
    });
    
    // Periodically clean up old attempts (every 10th attempt)
    // In production, you might want to use a cron job instead
    if (Math.random() < 0.1) {
      await ctx.scheduler.runAfter(0, internal.rateLimiting.cleanupOldAttempts, {});
    }
  },
});

/**
 * Check rate limits before authentication
 * Returns whether the attempt should be allowed
 */
export const checkRateLimit = internalMutation({
  args: {
    username: v.string(),
    ipAddress: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Check IP rate limit
    const ipLimit = await checkIpRateLimit(ctx, args.ipAddress);
    if (ipLimit.limited) {
      return {
        allowed: false,
        reason: "Too many login attempts from this IP address. Please try again in 15 minutes.",
        type: "ip_rate_limit" as const,
        remaining: 0,
      };
    }
    
    // Check username rate limit and account lockout
    const usernameLimit = await checkUsernameRateLimit(ctx, args.username);
    if (usernameLimit.locked) {
      const minutesRemaining = usernameLimit.lockoutExpires 
        ? Math.ceil((usernameLimit.lockoutExpires - Date.now()) / (60 * 1000))
        : 30;
      return {
        allowed: false,
        reason: `Account temporarily locked due to too many failed login attempts. Please try again in ${minutesRemaining} minute(s).`,
        type: "account_locked" as const,
        remaining: 0,
        lockoutExpires: usernameLimit.lockoutExpires,
      };
    }
    
    if (usernameLimit.limited) {
      return {
        allowed: false,
        reason: `Too many login attempts for this account. Please try again in 15 minutes. ${usernameLimit.remaining} attempt(s) remaining.`,
        type: "username_rate_limit" as const,
        remaining: usernameLimit.remaining,
      };
    }
    
    return {
      allowed: true,
      remaining: Math.min(ipLimit.remaining, usernameLimit.remaining),
    };
  },
});

/**
 * Get login attempt statistics for a username (for debugging/admin)
 */
export const getLoginAttemptStats = query({
  args: {
    username: v.string(),
    windowMinutes: v.optional(v.number()), // Default 60 minutes
  },
  handler: async (ctx, args) => {
    const windowMs = (args.windowMinutes || 60) * 60 * 1000;
    const windowStart = Date.now() - windowMs;
    
    const attempts = await ctx.db
      .query("loginAttempts")
      .withIndex("by_username_and_timestamp", (q) => 
        q.eq("username", args.username).gte("timestamp", windowStart)
      )
      .collect();
    
    const successful = attempts.filter(a => a.success).length;
    const failed = attempts.filter(a => !a.success).length;
    
    return {
      total: attempts.length,
      successful,
      failed,
      attempts: attempts.slice(-10), // Last 10 attempts
    };
  },
});

