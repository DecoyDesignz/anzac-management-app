import { internalMutation, internalQuery } from "./_generated/server";
import { v } from "convex/values";

/**
 * Migration: Copy passwords from systemUsers to personnel
 * 
 * This migration:
 * 1. Finds matching personnel records for each systemUser (by callSign/name)
 * 2. Copies password fields: passwordHash, isActive, requirePasswordChange, lastPasswordChange
 * 3. Preserves existing personnel data
 * 4. Is idempotent - can be run multiple times safely
 */

/**
 * Get all systemUsers that need migration
 */
export const getSystemUsersForMigration = internalQuery({
  handler: async (ctx) => {
    const systemUsers = await ctx.db.query("systemUsers").collect();
    
    return systemUsers.map(user => ({
      _id: user._id,
      name: user.name,
      email: user.email,
      passwordHash: user.passwordHash,
      isActive: user.isActive,
      requirePasswordChange: user.requirePasswordChange,
      lastPasswordChange: user.lastPasswordChange,
    }));
  },
});

/**
 * Get all personnel records
 */
export const getAllPersonnel = internalQuery({
  handler: async (ctx) => {
    const personnel = await ctx.db.query("personnel").collect();
    
    return personnel.map(person => ({
      _id: person._id,
      callSign: person.callSign,
      email: person.email,
      firstName: person.firstName,
      lastName: person.lastName,
      hasPassword: !!person.passwordHash,
    }));
  },
});

/**
 * Migrate a single user's password to personnel
 */
export const migrateUserPassword = internalMutation({
  args: {
    personnelId: v.id("personnel"),
    passwordHash: v.optional(v.string()),
    isActive: v.boolean(),
    requirePasswordChange: v.boolean(),
    lastPasswordChange: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const personnel = await ctx.db.get(args.personnelId);
    
    if (!personnel) {
      throw new Error(`Personnel record ${args.personnelId} not found`);
    }
    
    // Update personnel with password fields
    await ctx.db.patch(args.personnelId, {
      passwordHash: args.passwordHash,
      isActive: args.isActive,
      requirePasswordChange: args.requirePasswordChange,
      lastPasswordChange: args.lastPasswordChange,
    });
    
    return {
      personnelId: args.personnelId,
      callSign: personnel.callSign,
      migrated: true,
    };
  },
});

/**
 * Main migration function - run this to migrate all passwords
 */
export const migrateAllPasswords = internalMutation({
  args: {
    dryRun: v.optional(v.boolean()), // If true, only reports what would be migrated
  },
  handler: async (ctx, args) => {
    const dryRun = args.dryRun ?? false;
    
    // Get all systemUsers
    const systemUsers = await ctx.db.query("systemUsers").collect();
    const personnel = await ctx.db.query("personnel").collect();
    
    // Create lookup maps
    const personnelByCallSign = new Map(
      personnel.map(p => [p.callSign.toLowerCase(), p])
    );
    const personnelByEmail = new Map(
      personnel.filter(p => p.email).map(p => [p.email!.toLowerCase(), p])
    );
    
    const results = {
      total: systemUsers.length,
      matched: 0,
      migrated: 0,
      skipped: 0,
      alreadyHasPassword: 0,
      notFound: [] as string[],
      migrations: [] as Array<{
        systemUserName: string;
        personnelCallSign: string;
        personnelId: string;
        method: "callSign" | "email";
        hadPassword: boolean;
      }>,
    };
    
    for (const user of systemUsers) {
      // Try to find matching personnel record
      // First by callSign (exact match)
      let matchedPersonnel = personnelByCallSign.get(user.name.toLowerCase());
      let matchMethod: "callSign" | "email" = "callSign";
      
      // If not found by callSign, try email
      if (!matchedPersonnel && user.email) {
        matchedPersonnel = personnelByEmail.get(user.email.toLowerCase());
        matchMethod = "email";
      }
      
      if (!matchedPersonnel) {
        results.notFound.push(user.name);
        results.skipped++;
        continue;
      }
      
      results.matched++;
      
      // Check if personnel already has a password
      const hadPassword = !!matchedPersonnel.passwordHash;
      if (hadPassword) {
        results.alreadyHasPassword++;
      }
      
      results.migrations.push({
        systemUserName: user.name,
        personnelCallSign: matchedPersonnel.callSign,
        personnelId: matchedPersonnel._id,
        method: matchMethod,
        hadPassword,
      });
      
      // Only migrate if not a dry run
      if (!dryRun) {
        await ctx.db.patch(matchedPersonnel._id, {
          passwordHash: user.passwordHash,
          isActive: user.isActive,
          requirePasswordChange: user.requirePasswordChange,
          lastPasswordChange: user.lastPasswordChange,
        });
        
        results.migrated++;
      }
    }
    
    return {
      dryRun,
      summary: {
        totalSystemUsers: results.total,
        matched: results.matched,
        migrated: results.migrated,
        skipped: results.skipped,
        alreadyHadPassword: results.alreadyHasPassword,
        notFoundCount: results.notFound.length,
      },
      notFound: results.notFound,
      migrations: results.migrations,
    };
  },
});

/**
 * Verify migration - check that all personnel with roles have passwords
 */
export const verifyPasswordMigration = internalQuery({
  handler: async (ctx) => {
    const personnel = await ctx.db.query("personnel").collect();
    const userRoles = await ctx.db.query("userRoles").collect();
    
    // Get all personnel IDs that have roles (should have passwords)
    const personnelWithRoles = new Set(
      userRoles
        .filter(ur => ur.personnelId)
        .map(ur => ur.personnelId!)
    );
    
    const results = {
      totalPersonnel: personnel.length,
      personnelWithRoles: personnelWithRoles.size,
      personnelWithPasswords: 0,
      missingPasswords: [] as Array<{
        callSign: string;
        personnelId: string;
        hasRoles: boolean;
      }>,
    };
    
    for (const person of personnel) {
      const hasPassword = !!person.passwordHash;
      const hasRoles = personnelWithRoles.has(person._id);
      
      if (hasPassword) {
        results.personnelWithPasswords++;
      }
      
      // Flag personnel with roles but no password
      if (hasRoles && !hasPassword) {
        results.missingPasswords.push({
          callSign: person.callSign,
          personnelId: person._id,
          hasRoles,
        });
      }
    }
    
    return results;
  },
});

/**
 * Rollback migration - remove passwords from personnel
 * USE WITH CAUTION - only for testing/emergency rollback
 */
export const rollbackPasswordMigration = internalMutation({
  args: {
    confirmRollback: v.boolean(),
  },
  handler: async (ctx, args) => {
    if (!args.confirmRollback) {
      throw new Error("Must confirm rollback by passing confirmRollback: true");
    }
    
    const personnel = await ctx.db.query("personnel").collect();
    let rolledBack = 0;
    
    for (const person of personnel) {
      if (person.passwordHash) {
        await ctx.db.patch(person._id, {
          passwordHash: undefined,
          isActive: undefined,
          requirePasswordChange: undefined,
          lastPasswordChange: undefined,
        });
        rolledBack++;
      }
    }
    
    return {
      rolledBack,
      total: personnel.length,
    };
  },
});

