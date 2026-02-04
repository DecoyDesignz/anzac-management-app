import { mutation, internalMutation, action } from "./_generated/server";
import { internal } from "./_generated/api";
import type { Doc, Id } from "./_generated/dataModel";

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

/**
 * Migration: Add color field to existing schools
 * This should be run once to update existing schools with color values
 */
export const addColorsToSchools = mutation({
  args: {},
  handler: async (ctx) => {
    const schools = await ctx.db.query("schools").collect();
    
    // Define default colors for each school
    const schoolColors: Record<string, string> = {
      "Armour School": "#3b82f6",
      "Artillery School": "#6adae0",
      "Aviation School": "#992d22",
      "Pilot School": "#992d22", // Alias for Aviation
      "Sapper School": "#ff5500",
      "Infantry School": "#6b7280",
      "Medical School": "#dc2626",
      "Technical School": "#16a34a",
      "Specialized School": "#e91e63",
      "Leadership School": "#ea580c",
    };

    let updateCount = 0;
    for (const school of schools) {
      // Only update if color is missing or needs updating
      const color = schoolColors[school.name];
      if (color && school.color !== color) {
        await ctx.db.patch(school._id, { color });
        updateCount++;
      }
    }

    return { 
      success: true, 
      message: `Updated ${updateCount} schools with color field`,
      totalSchools: schools.length 
    };
  },
});

/**
 * Migration: Migrate from old userRoles system to new roles table
 * This creates the roles table and migrates existing user roles
 */
export const migrateToRolesTable = mutation({
  args: {},
  handler: async (ctx) => {
    // First, create the roles table entries
    const roleDefinitions = [
      { roleName: "super_admin", displayName: "Super Admin", color: "#FF0000", description: "Full system access and administration privileges" },
      { roleName: "administrator", displayName: "Administrator", color: "#FF0000", description: "Can manage most system features" },
      { roleName: "game_master", displayName: "Game Master", color: "#800080", description: "Can manage events and attendance" },
      { roleName: "instructor", displayName: "Instructor", color: "#FFA500", description: "Can award qualifications" },
      { roleName: "member", displayName: "Member", color: "#6B7280", description: "Read-only access to calendar and own records" }
    ];

    // Create roles if they don't exist
    const createdRoles: Record<string, Doc<"roles">> = {};
    for (const roleDef of roleDefinitions) {
      const existingRole = await ctx.db
        .query("roles")
        .withIndex("by_role_name", (q) => q.eq("roleName", roleDef.roleName))
        .first();
      
      if (!existingRole) {
        const roleId = await ctx.db.insert("roles", roleDef);
        const newRole = await ctx.db.get(roleId);
        if (newRole) {
          createdRoles[roleDef.roleName] = newRole;
        }
      } else {
        createdRoles[roleDef.roleName] = existingRole;
      }
    }

    // Get all existing user roles
    const allUserRoles = await ctx.db.query("userRoles").collect();
    
    let migratedCount = 0;
    let skippedCount = 0;
    let deletedCount = 0;

    type UserRoleWithLegacyRole = Doc<"userRoles"> & { role?: string };
    for (const userRole of allUserRoles) {
      const ur = userRole as UserRoleWithLegacyRole;

      // Check if this has the old structure (has 'role' string field)
      if ("role" in ur && typeof ur.role === "string") {
        const roleName = ur.role;
        const roleDefinition = createdRoles[roleName];

        if (roleDefinition && ur.personnelId) {
          await ctx.db.delete(ur._id);
          const existingProperRole = await ctx.db
            .query("userRoles")
            .withIndex("by_personnel_and_role", (q) =>
              q.eq("personnelId", ur.personnelId!).eq("roleId", roleDefinition._id)
            )
            .first();

          if (!existingProperRole) {
            await ctx.db.insert("userRoles", {
              personnelId: ur.personnelId,
              roleId: roleDefinition._id,
            });
          }
          migratedCount++;
        } else if (!ur.personnelId) {
          await ctx.db.delete(ur._id);
          deletedCount++;
        } else {
          console.warn(`Unknown role: ${roleName}`);
          skippedCount++;
        }
      } else if (!("roleId" in ur)) {
        await ctx.db.delete(ur._id);
        deletedCount++;
      } else {
        skippedCount++;
      }
    }

    return { 
      success: true, 
      message: `Migrated ${migratedCount} user roles, skipped ${skippedCount} already migrated, deleted ${deletedCount} broken records`,
      createdRoles: Object.keys(createdRoles).length,
      migratedUserRoles: migratedCount,
      skippedUserRoles: skippedCount,
      deletedUserRoles: deletedCount
    };
  },
});

/**
 * PUBLIC WRAPPER: Run the merge migration
 * Call this from the Convex dashboard to execute the migration
 */
export const runMergeSystemUsersAndPersonnel = action({
  args: {},
  handler: async (ctx): Promise<{
    success: boolean;
    log: string[];
    message?: string;
    error?: string;
    stats?: {
      systemUsersProcessed: number;
      personnelMatched: number;
      personnelCreated: number;
      rolesUpdated: number;
      instructorSchoolsUpdated: number;
      eventInstructorsUpdated: number;
      eventsUpdated: number;
      qualificationsUpdated: number;
      rankHistoryUpdated: number;
    };
  }> => {
    const result = await ctx.runMutation(internal.migrations.mergeSystemUsersAndPersonnel, {});
    return result;
  },
});

/**
 * Migration: Merge systemUsers and personnel tables
 * WARNING: This is a one-time migration. Run only after deploying the new schema.
 * This migration:
 * 1. Links existing systemUsers to matching personnel records
 * 2. Creates personnel records for systemUsers without matches
 * 3. Updates all foreign key references
 * 4. The old systemUsers table will become empty (remove from schema after migration)
 */
export const mergeSystemUsersAndPersonnel = internalMutation({
  args: {},
  handler: async (ctx) => {
    const log: string[] = [];
    
    try {
      // Get all existing systemUsers (if table still exists)
      let systemUsers: Doc<"systemUsers">[] = [];
      try {
        systemUsers = await ctx.db.query("systemUsers").collect();
        log.push(`Found ${systemUsers.length} system users to migrate`);
      } catch {
        log.push("systemUsers table not found - assuming already migrated or schema updated");
        return { success: true, log, message: "No migration needed" };
      }

      const personnel = await ctx.db.query("personnel").collect();
      log.push(`Found ${personnel.length} existing personnel records`);

      // Map to track systemUser -> personnel ID mapping
      const userToPersonnelMap = new Map<Id<"systemUsers">, Id<"personnel">>();
      let matched = 0;
      let created = 0;

      // Process each systemUser
      for (const systemUser of systemUsers) {
        // Try to find matching personnel by callSign or email
        const matchingPersonnel = personnel.find(
          (p) => p.callSign === systemUser.name || 
                 (p.email && systemUser.email && p.email === systemUser.email)
        );

        if (matchingPersonnel) {
          // Update existing personnel with login credentials
          await ctx.db.patch(matchingPersonnel._id, {
            passwordHash: systemUser.passwordHash,
            isActive: systemUser.isActive,
            requirePasswordChange: systemUser.requirePasswordChange,
            lastPasswordChange: systemUser.lastPasswordChange,
          });
          userToPersonnelMap.set(systemUser._id, matchingPersonnel._id);
          matched++;
          log.push(`Matched user "${systemUser.name}" to personnel "${matchingPersonnel.callSign}"`);
        } else {
          // Create new personnel record for this systemUser
          const privateRank = await ctx.db
            .query("ranks")
            .filter((q) => q.eq(q.field("abbreviation"), "PTE"))
            .first();

          const newPersonnelId = await ctx.db.insert("personnel", {
            callSign: systemUser.name,
            email: systemUser.email,
            status: "active" as const,
            joinDate: Date.now(),
            rankId: privateRank?._id,
            // Login credentials
            passwordHash: systemUser.passwordHash,
            isActive: systemUser.isActive,
            requirePasswordChange: systemUser.requirePasswordChange,
            lastPasswordChange: systemUser.lastPasswordChange,
          });
          userToPersonnelMap.set(systemUser._id, newPersonnelId);
          created++;
          log.push(`Created new personnel record for user "${systemUser.name}"`);
        }
      }

      log.push(`Migration complete: ${matched} matched, ${created} created`);

      // Update userRoles table
      const userRoles = await ctx.db.query("userRoles").collect();
      log.push(`Updating ${userRoles.length} user roles...`);
      
      for (const role of userRoles) {
        // Skip if already has personnelId
        if (role.personnelId) {
          log.push(`Role ${role._id} already has personnelId, skipping`);
          continue;
        }
        
        const oldUserId = role.userId;
        if (!oldUserId) {
          log.push(`Role ${role._id} has no userId, skipping`);
          continue;
        }
        
        const personnelId = userToPersonnelMap.get(oldUserId);
        if (personnelId) {
          await ctx.db.patch(role._id, { personnelId });
        }
      }
      log.push("User roles updated");

      // Update instructorSchools table
      const instructorSchools = await ctx.db.query("instructorSchools").collect();
      log.push(`Updating ${instructorSchools.length} instructor school assignments...`);
      
      for (const assignment of instructorSchools) {
        // Skip if already has personnelId
        if (assignment.personnelId) {
          continue;
        }
        
        const oldUserId = assignment.userId;
        if (!oldUserId) continue;
        const personnelId = userToPersonnelMap.get(oldUserId);
        if (personnelId) {
          await ctx.db.patch(assignment._id, { personnelId });
        }
      }
      log.push("Instructor schools updated");

      // Update eventInstructors table
      const eventInstructors = await ctx.db.query("eventInstructors").collect();
      log.push(`Updating ${eventInstructors.length} event instructors...`);
      
      for (const eventInstructor of eventInstructors) {
        // Skip if already has personnelId
        if (eventInstructor.personnelId) {
          continue;
        }
        
        const oldUserId = eventInstructor.userId;
        if (!oldUserId) continue;
        const personnelId = userToPersonnelMap.get(oldUserId);
        if (personnelId) {
          await ctx.db.patch(eventInstructor._id, { personnelId });
        }
      }
      log.push("Event instructors updated");

      // Update events createdBy field
      const events = await ctx.db.query("events").collect();
      log.push(`Updating ${events.length} events...`);
      
      for (const event of events) {
        if (event.createdBy) {
          const personnelId = userToPersonnelMap.get(event.createdBy as unknown as Id<"systemUsers">);
          if (personnelId) {
            await ctx.db.patch(event._id, { createdBy: personnelId });
          }
        }
      }
      log.push("Events updated");

      // Update personnelQualifications awardedBy field
      const personnelQualifications = await ctx.db.query("personnelQualifications").collect();
      log.push(`Updating ${personnelQualifications.length} personnel qualifications...`);
      
      for (const pq of personnelQualifications) {
        if (pq.awardedBy) {
          const personnelId = userToPersonnelMap.get(pq.awardedBy as unknown as Id<"systemUsers">);
          if (personnelId) {
            await ctx.db.patch(pq._id, { awardedBy: personnelId });
          }
        }
      }
      log.push("Personnel qualifications updated");

      // Update rankHistory promotedBy field
      const rankHistory = await ctx.db.query("rankHistory").collect();
      log.push(`Updating ${rankHistory.length} rank history records...`);

      for (const rh of rankHistory) {
        if (rh.promotedBy) {
          const personnelId = userToPersonnelMap.get(rh.promotedBy as unknown as Id<"systemUsers">);
          if (personnelId) {
            await ctx.db.patch(rh._id, { promotedBy: personnelId });
          }
        }
      }
      log.push("Rank history updated");

      // Note: systemUsers table entries remain but are no longer referenced
      // Admin should remove systemUsers table from schema after confirming migration success
      log.push("✓ Migration completed successfully!");
      log.push("⚠ IMPORTANT: Remove 'systemUsers' table from schema.ts after verifying everything works");

      return {
        success: true,
        log,
        stats: {
          systemUsersProcessed: systemUsers.length,
          personnelMatched: matched,
          personnelCreated: created,
          rolesUpdated: userRoles.length,
          instructorSchoolsUpdated: instructorSchools.length,
          eventInstructorsUpdated: eventInstructors.length,
          eventsUpdated: events.length,
          qualificationsUpdated: personnelQualifications.length,
          rankHistoryUpdated: rankHistory.length,
        },
      };
    } catch (error) {
      log.push(`❌ Error during migration: ${error}`);
      return {
        success: false,
        log,
        error: String(error),
      };
    }
  },
});

