import { mutation, internalMutation, internalQuery } from "./_generated/server";
import { v } from "convex/values";
import { Id } from "./_generated/dataModel";

/**
 * Seed the database with initial data
 * This is now in seedActions.ts since it uses Node.js crypto
 */

/**
 * Internal mutation that does the actual database seeding
 */
export const seedDatabaseInternal = internalMutation({
  args: { passwordHash: v.string() },
  handler: async (ctx, args) => {
    // Check if already seeded (check if any schools exist)
    const existingSchools = await ctx.db.query("schools").first();
    if (existingSchools) {
      throw new Error("Database already seeded. Clear the database before reseeding.");
    }

    // 1. Create schools
    const pilotSchool = await ctx.db.insert("schools", {
      name: "Pilot School",
      abbreviation: "PILOT",
    });

    const infantrySchool = await ctx.db.insert("schools", {
      name: "Infantry School",
      abbreviation: "INF",
    });

    const armourSchool = await ctx.db.insert("schools", {
      name: "Armour School",
      abbreviation: "ARM",
    });

    const sapperSchool = await ctx.db.insert("schools", {
      name: "Sapper School",
      abbreviation: "SAP",
    });

    const medicalSchool = await ctx.db.insert("schools", {
      name: "Medical School",
      abbreviation: "MED",
    });

    const technicalSchool = await ctx.db.insert("schools", {
      name: "Technical School",
      abbreviation: "TECH",
    });

    const specializedSchool = await ctx.db.insert("schools", {
      name: "Specialized School",
      abbreviation: "SPEC",
    });

    const leadershipSchool = await ctx.db.insert("schools", {
      name: "Leadership School",
      abbreviation: "LEAD",
    });

    // 2. Create ranks (Australian military structure)
    const ranks = [
      { name: "Private", abbreviation: "PTE", order: 0 },
      { name: "Lance Corporal", abbreviation: "LCPL", order: 1 },
      { name: "Corporal", abbreviation: "CPL", order: 2 },
      { name: "Sergeant", abbreviation: "SGT", order: 3 },
      { name: "Staff Sergeant", abbreviation: "SSGT", order: 4 },
      { name: "Warrant Officer Class 2", abbreviation: "WO2", order: 5 },
      { name: "Warrant Officer Class 1", abbreviation: "WO1", order: 6 },
      { name: "Second Lieutenant", abbreviation: "2LT", order: 7 },
      { name: "Lieutenant", abbreviation: "LT", order: 8 },
      { name: "Captain", abbreviation: "CAPT", order: 9 },
      { name: "Major", abbreviation: "MAJ", order: 10 },
      { name: "Lieutenant Colonel", abbreviation: "LTCOL", order: 11 },
    ];

    for (const rank of ranks) {
      await ctx.db.insert("ranks", rank);
    }

    // 3. Create qualifications assigned to schools
    const qualifications = [
      // Infantry School
      { name: "Basic Infantry Training", abbreviation: "BIT", schoolId: infantrySchool },
      { name: "Commando Course", abbreviation: "CC", schoolId: infantrySchool },
      { name: "Advanced Marksmanship", abbreviation: "AM", schoolId: infantrySchool },
      { name: "Close Quarters Battle", abbreviation: "CQB", schoolId: infantrySchool },
      
      // Sapper School
      { name: "Demolitions", abbreviation: "DEMO", schoolId: sapperSchool },
      
      // Medical School
      { name: "Combat First Aid", abbreviation: "CFA", schoolId: medicalSchool },
      { name: "Combat Medic", abbreviation: "MEDIC", schoolId: medicalSchool },
      
      // Technical School
      { name: "Radio Operator", abbreviation: "RADIO", schoolId: technicalSchool },
      { name: "Driver Qualification", abbreviation: "DRIVER", schoolId: technicalSchool },
      { name: "Signals Intelligence", abbreviation: "SIGINT", schoolId: technicalSchool },
      
      // Leadership School
      { name: "Team Leader Course", abbreviation: "TLC", schoolId: leadershipSchool },
      { name: "Platoon Sergeant Course", abbreviation: "PSC", schoolId: leadershipSchool },
      
      // Specialized School
      { name: "Parachutist", abbreviation: "PARA", schoolId: specializedSchool },
      { name: "Sniper", abbreviation: "SNIPER", schoolId: specializedSchool },
      { name: "Diver", abbreviation: "DIVER", schoolId: specializedSchool },
      { name: "Pathfinder", abbreviation: "PATH", schoolId: specializedSchool },
      
      // Pilot School
      { name: "Rotary Wing Pilot", abbreviation: "RWP", schoolId: pilotSchool },
      { name: "Fixed Wing Pilot", abbreviation: "FWP", schoolId: pilotSchool },
      
      // Armour School
      { name: "Armoured Vehicle Crew", abbreviation: "AVC", schoolId: armourSchool },
      { name: "Tank Commander", abbreviation: "TC", schoolId: armourSchool },
    ];

    for (const qual of qualifications) {
      await ctx.db.insert("qualifications", qual);
    }

    // 4. Create event types for Training and Operations
    const eventTypes = [
      // Training Event Types
      { name: "Training - Basic", abbreviation: "TRG-BASIC", color: "#3b82f6" },
      { name: "Training - Advanced", abbreviation: "TRG-ADV", color: "#1d4ed8" },
      { name: "Training - Specialist", abbreviation: "TRG-SPEC", color: "#1e40af" },
      { name: "Training - Certification", abbreviation: "TRG-CERT", color: "#1e3a8a" },
      
      // Operation Event Types
      { name: "Operation - Combat", abbreviation: "OP-COMBAT", color: "#dc2626" },
      { name: "Operation - Training", abbreviation: "OP-TRAINING", color: "#b91c1c" },
      { name: "Operation - Joint", abbreviation: "OP-JOINT", color: "#991b1b" },
      { name: "Operation - Special", abbreviation: "OP-SPECIAL", color: "#7f1d1d" },
      
      // Other Event Types
      { name: "Drill", abbreviation: "DRILL", color: "#059669" },
      { name: "Testing", abbreviation: "TEST", color: "#0d9488" },
      { name: "Filming", abbreviation: "FILM", color: "#0891b2" },
      { name: "Planning", abbreviation: "PLAN", color: "#7c3aed" },
    ];

    for (const eventType of eventTypes) {
      await ctx.db.insert("eventTypes", eventType);
    }

    // 5. Create servers
    const servers = [
      { name: "Training Server", isActive: true },
      { name: "GM Server", isActive: true },
    ];

    for (const server of servers) {
      await ctx.db.insert("servers", server);
    }

    // 6. Create super admin with hashed password
    const superAdminId = await ctx.db.insert("systemUsers", {
      name: "admin",
      passwordHash: args.passwordHash,
      isActive: true,
      requirePasswordChange: false,
      lastPasswordChange: Date.now(),
    });

    // Create user roles for super admin (has all roles)
    await ctx.db.insert("userRoles", {
      userId: superAdminId,
      role: "super_admin",
    });
    await ctx.db.insert("userRoles", {
      userId: superAdminId,
      role: "administrator",
    });
    await ctx.db.insert("userRoles", {
      userId: superAdminId,
      role: "game_master",
    });
    await ctx.db.insert("userRoles", {
      userId: superAdminId,
      role: "instructor",
    });

    return {
      success: true,
      message: "Database seeded successfully including super admin account!",
      stats: {
        schools: 8,
        ranks: ranks.length,
        qualifications: qualifications.length,
        eventTypes: eventTypes.length,
        servers: servers.length,
      },
    };
  },
});

/**
 * Initialize super admin account after they've signed up
 * This should be called after the super admin has created their account through the login page
 */
export const initializeSuperAdmin = mutation({
  args: {
    username: v.string(),
  },
  handler: async (ctx, args) => {
    // Check if super admin already exists
    const existingSuperAdmin = await ctx.db
      .query("userRoles")
      .withIndex("by_role", (q) => q.eq("role", "super_admin"))
      .first();
    
    if (existingSuperAdmin) {
      throw new Error("Super admin account already exists");
    }

    // Check if this username matches the expected super admin username
    if (args.username !== "admin") {
      throw new Error("Only 'admin' username can be initialized as super admin");
    }

    // Check if user record already exists
    const existingUser = await ctx.db
      .query("systemUsers")
      .withIndex("by_name", (q) => q.eq("name", args.username))
      .first();

    if (existingUser) {
      throw new Error("User record already exists");
    }

    // Create the super admin user record
    const userId = await ctx.db.insert("systemUsers", {
      name: args.username,
      isActive: true,
      requirePasswordChange: false,
      lastPasswordChange: Date.now(),
    });

    // Create super admin role
    await ctx.db.insert("userRoles", {
      userId,
      role: "super_admin",
    });

    return {
      success: true,
      message: "Super admin initialized successfully",
    };
  },
});

/**
 * Setup super admin account
 * This is now in seedActions.ts since it uses Node.js crypto
 */

export const checkSuperAdminExists = internalQuery({
  args: {},
  handler: async (ctx) => {
    const existingSuperAdmin = await ctx.db
      .query("userRoles")
      .withIndex("by_role", (q) => q.eq("role", "super_admin"))
      .first();
    return !!existingSuperAdmin;
  },
});

export const createSuperAdmin = internalMutation({
  args: { passwordHash: v.string() },
  handler: async (ctx, args) => {
    const userId = await ctx.db.insert("systemUsers", {
      name: "admin",
      passwordHash: args.passwordHash,
      isActive: true,
      requirePasswordChange: false,
      lastPasswordChange: Date.now(),
    });

    // Create super admin role
    await ctx.db.insert("userRoles", {
      userId,
      role: "super_admin",
    });

    return userId;
  },
});

/**
 * Clear all data from the database (use with caution!)
 */
export const clearDatabase = mutation({
  args: {},
  handler: async (ctx) => {
    // Delete all data in reverse dependency order
    
    // Event-related data
    const eventParticipants = await ctx.db.query("eventParticipants").collect();
    for (const ep of eventParticipants) {
      await ctx.db.delete(ep._id);
    }

    const eventInstructors = await ctx.db.query("eventInstructors").collect();
    for (const ei of eventInstructors) {
      await ctx.db.delete(ei._id);
    }

    const events = await ctx.db.query("events").collect();
    for (const e of events) {
      await ctx.db.delete(e._id);
    }

    const eventTypes = await ctx.db.query("eventTypes").collect();
    for (const et of eventTypes) {
      await ctx.db.delete(et._id);
    }

    const servers = await ctx.db.query("servers").collect();
    for (const s of servers) {
      await ctx.db.delete(s._id);
    }

    // User roles
    const userRoles = await ctx.db.query("userRoles").collect();
    for (const ur of userRoles) {
      await ctx.db.delete(ur._id);
    }

    // Personnel-related data
    const personnelQuals = await ctx.db.query("personnelQualifications").collect();
    for (const pq of personnelQuals) {
      await ctx.db.delete(pq._id);
    }

    const rankHistory = await ctx.db.query("rankHistory").collect();
    for (const rh of rankHistory) {
      await ctx.db.delete(rh._id);
    }

    const personnel = await ctx.db.query("personnel").collect();
    for (const p of personnel) {
      await ctx.db.delete(p._id);
    }

    const instructorSchools = await ctx.db.query("instructorSchools").collect();
    for (const is of instructorSchools) {
      await ctx.db.delete(is._id);
    }

    const qualifications = await ctx.db.query("qualifications").collect();
    for (const q of qualifications) {
      await ctx.db.delete(q._id);
    }

    const schools = await ctx.db.query("schools").collect();
    for (const s of schools) {
      await ctx.db.delete(s._id);
    }

    const ranks = await ctx.db.query("ranks").collect();
    for (const r of ranks) {
      await ctx.db.delete(r._id);
    }

    const users = await ctx.db.query("systemUsers").collect();
    for (const u of users) {
      await ctx.db.delete(u._id);
    }

    return { success: true, message: "Database cleared successfully" };
  },
});

/**
 * Remove description fields from qualifications
 */
export const removeQualificationDescriptions = mutation({
  args: {},
  handler: async (ctx) => {
    const qualifications = await ctx.db.query("qualifications").collect();
    
    let updatedCount = 0;
    for (const qual of qualifications) {
      // @ts-expect-error - removing field that shouldn't exist
      if (qual.description !== undefined) {
        await ctx.db.patch(qual._id, {
          // @ts-expect-error - removing field
          description: undefined,
        });
        updatedCount++;
      }
    }
    
    return { success: true, updated: updatedCount, total: qualifications.length };
  },
});

/**
 * Remove description fields from eventTypes
 */
export const removeEventTypeDescriptions = mutation({
  args: {},
  handler: async (ctx) => {
    const eventTypes = await ctx.db.query("eventTypes").collect();
    
    let updatedCount = 0;
    for (const eventType of eventTypes) {
      // @ts-expect-error - removing field that shouldn't exist
      if (eventType.description !== undefined) {
        await ctx.db.patch(eventType._id, {
          // @ts-expect-error - removing field
          description: undefined,
        });
        updatedCount++;
      }
    }
    
    return { success: true, updated: updatedCount, total: eventTypes.length };
  },
});
