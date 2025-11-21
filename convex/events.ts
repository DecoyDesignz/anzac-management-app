import { v } from "convex/values";
import { internalMutation, mutation, query } from "./_generated/server";
import { requireAuth, requireRole } from "./helpers";

/**
 * List all events within a date range
 */
export const listEvents = query({
  args: {
    userId: v.id("personnel"), // User ID from NextAuth session
    startDate: v.number(),
    endDate: v.number(),
    status: v.optional(
      v.union(
        v.literal("scheduled"),
        v.literal("in_progress"),
        v.literal("completed"),
        v.literal("cancelled")
      )
    ),
  },
  handler: async (ctx, args) => {
    await requireAuth(ctx, args.userId);

    let events = await ctx.db
      .query("events")
      .withIndex("by_date", (q) =>
        q.gte("startDate", args.startDate).lte("startDate", args.endDate)
      )
      .collect();

    // Filter by status if provided
    if (args.status) {
      events = events.filter((event) => event.status === args.status);
    }

    // Enrich with related data
    const eventsWithDetails = await Promise.all(
      events.map(async (event) => {
        const eventType = event.eventTypeId ? await ctx.db.get(event.eventTypeId) : null;
        const server = await ctx.db.get(event.serverId);
        const createdBy = event.createdBy ? await ctx.db.get(event.createdBy) : null;

        // Get event instructors/GMs
        const eventInstructors = await ctx.db
          .query("eventInstructors")
          .withIndex("by_event", (q) => q.eq("eventId", event._id))
          .collect();

        const instructorsWithDetails = await Promise.all(
          eventInstructors.map(async (ei) => {
            if (!ei.personnelId) return { ...ei, user: null };
            const person = await ctx.db.get(ei.personnelId);
            return {
              ...ei,
              user: person,
            };
          })
        );

        // Get participants
        const participants = await ctx.db
          .query("eventParticipants")
          .withIndex("by_event", (q) => q.eq("eventId", event._id))
          .collect();

        const participantsWithDetails = await Promise.all(
          participants.map(async (participant) => {
            const personnel = await ctx.db.get(participant.personnelId);
            return {
              ...participant,
              personnel,
            };
          })
        );

        return {
          ...event,
          eventType,
          server,
          instructors: instructorsWithDetails,
          createdBy,
          participants: participantsWithDetails,
        };
      })
    );

    return eventsWithDetails;
  },
});

/**
 * Get a specific event with full details
 */
export const getEvent = query({
  args: {
    userId: v.id("personnel"), // User ID from NextAuth session
    eventId: v.id("events")
  },
  handler: async (ctx, args) => {
    await requireAuth(ctx, args.userId);

    const event = await ctx.db.get(args.eventId);
    if (!event) {
      return null;
    }

    const eventType = event.eventTypeId ? await ctx.db.get(event.eventTypeId) : null;
    const server = await ctx.db.get(event.serverId);
    const createdBy = event.createdBy ? await ctx.db.get(event.createdBy) : null;

    // Get event instructors/GMs
    const eventInstructors = await ctx.db
      .query("eventInstructors")
      .withIndex("by_event", (q) => q.eq("eventId", event._id))
      .collect();

    const instructorsWithDetails = await Promise.all(
      eventInstructors.map(async (ei) => {
        if (!ei.personnelId) return { ...ei, user: null };
        const person = await ctx.db.get(ei.personnelId);
        return {
          ...ei,
          user: person,
        };
      })
    );

    // Get participants
    const participants = await ctx.db
      .query("eventParticipants")
      .withIndex("by_event", (q) => q.eq("eventId", event._id))
      .collect();

    const participantsWithDetails = await Promise.all(
      participants.map(async (participant) => {
        const personnel = await ctx.db.get(participant.personnelId);
        return {
          ...participant,
          personnel,
        };
      })
    );

    return {
      ...event,
      eventType,
      server,
      instructors: instructorsWithDetails,
      createdBy,
      participants: participantsWithDetails,
    };
  },
});

/**
 * Create a new event (Instructor, Game Master, or Administrator)
 */
export const createEvent = mutation({
  args: {
    userId: v.id("personnel"), // User ID from NextAuth session
    title: v.string(),
    description: v.optional(v.string()),
    startDate: v.number(),
    endDate: v.number(),
    eventTypeId: v.optional(v.id("eventTypes")),
    serverId: v.id("servers"),
    instructorIds: v.array(v.id("personnel")),
    maxParticipants: v.optional(v.number()),
    isRecurring: v.boolean(),
    recurringPattern: v.optional(v.string()),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await requireAuth(ctx, args.userId);
    
    // Check if user has instructor, game_master, administrator, or super_admin role
    const personnelRoles = await ctx.db
      .query("userRoles")
      .withIndex("by_personnel", (q) => q.eq("personnelId", user._id))
      .collect();
    
    const roles = await ctx.db.query("roles").collect();
    const roleMap = new Map(roles.map(role => [role._id, role.roleName]));
    const roleNames = personnelRoles
      .map(ur => ur.roleId ? roleMap.get(ur.roleId) : null)
      .filter(Boolean) as string[];
    
    const canCreateEvent = roleNames.some(role => 
      role === "instructor" || 
      role === "game_master" || 
      role === "administrator" || 
      role === "super_admin"
    );
    
    if (!canCreateEvent) {
      throw new Error("Access denied: Requires instructor, game master, administrator, or super admin role");
    }

    // Verify event type exists (if provided)
    if (args.eventTypeId) {
      const eventType = await ctx.db.get(args.eventTypeId);
      if (!eventType) {
        throw new Error("Event type not found");
      }
    }

    // Verify server exists
    const server = await ctx.db.get(args.serverId);
    if (!server) {
      throw new Error("Server not found");
    }

    // Verify all instructors exist and have appropriate roles
    for (const instructorId of args.instructorIds) {
      const instructor = await ctx.db.get(instructorId);
      if (!instructor) {
        throw new Error("Instructor not found");
      }

      // Check if personnel has instructor or game_master role
      const userRoles = await ctx.db
        .query("userRoles")
        .withIndex("by_personnel", (q) => q.eq("personnelId", instructorId))
        .collect();

      const roles = await ctx.db.query("roles").collect();
      const roleMap = new Map(roles.map(role => [role._id, role.roleName]));
      
      const hasInstructorRole = userRoles.some(ur => ur.roleId && roleMap.get(ur.roleId) === "instructor");
      const hasGameMasterRole = userRoles.some(ur => ur.roleId && roleMap.get(ur.roleId) === "game_master");

      if (!hasInstructorRole && !hasGameMasterRole) {
        throw new Error("Personnel must be an instructor or game master");
      }
    }

    // Generate booking code
    const bookingCode = `A${Math.random().toString(36).substr(2, 4).toUpperCase()}`;

    const eventId = await ctx.db.insert("events", {
      title: args.title,
      description: args.description,
      startDate: args.startDate,
      endDate: args.endDate,
      eventTypeId: args.eventTypeId,
      serverId: args.serverId,
      bookingCode,
      maxParticipants: args.maxParticipants,
      currentParticipants: 0,
      isRecurring: args.isRecurring,
      recurringPattern: args.recurringPattern,
      status: "scheduled",
      notes: args.notes,
    });

    // Create event instructor assignments
    for (const instructorId of args.instructorIds) {
      // Determine role based on personnel roles
      const userRoles = await ctx.db
        .query("userRoles")
        .withIndex("by_personnel", (q) => q.eq("personnelId", instructorId))
        .collect();

      const roles = await ctx.db.query("roles").collect();
      const roleMap = new Map(roles.map(role => [role._id, role.roleName]));
      
      const hasInstructorRole = userRoles.some(ur => ur.roleId && roleMap.get(ur.roleId) === "instructor");
      const hasGameMasterRole = userRoles.some(ur => ur.roleId && roleMap.get(ur.roleId) === "game_master");

      // Assign the primary role (prefer game_master if both exist)
      const role = hasGameMasterRole ? "game_master" : "instructor";

      await ctx.db.insert("eventInstructors", {
        eventId,
        personnelId: instructorId,
        role,
      });
    }

    return eventId;
  },
});

/**
 * Update an event (Instructor, Game Master, or Administrator)
 */
export const updateEvent = mutation({
  args: {
    userId: v.id("personnel"), // User ID from NextAuth session
    eventId: v.id("events"),
    title: v.optional(v.string()),
    description: v.optional(v.string()),
    startDate: v.optional(v.number()),
    endDate: v.optional(v.number()),
    eventTypeId: v.optional(v.id("eventTypes")),
    serverId: v.optional(v.id("servers")),
    instructorIds: v.optional(v.array(v.id("personnel"))),
    maxParticipants: v.optional(v.number()),
    status: v.optional(
      v.union(
        v.literal("scheduled"),
        v.literal("in_progress"),
        v.literal("completed"),
        v.literal("cancelled")
      )
    ),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await requireAuth(ctx, args.userId);
    
    // Check if user has instructor, game_master, administrator, or super_admin role
    const personnelRoles = await ctx.db
      .query("userRoles")
      .withIndex("by_personnel", (q) => q.eq("personnelId", user._id))
      .collect();
    
    const roles = await ctx.db.query("roles").collect();
    const roleMap = new Map(roles.map(role => [role._id, role.roleName]));
    const roleNames = personnelRoles
      .map(ur => ur.roleId ? roleMap.get(ur.roleId) : null)
      .filter(Boolean) as string[];
    
    const canUpdateEvent = roleNames.some(role => 
      role === "instructor" || 
      role === "game_master" || 
      role === "administrator" || 
      role === "super_admin"
    );
    
    if (!canUpdateEvent) {
      throw new Error("Access denied: Requires instructor, game master, administrator, or super admin role");
    }

    // Verify event exists
    const event = await ctx.db.get(args.eventId);
    if (!event) {
      throw new Error("Event not found");
    }

    // Verify event type exists (if provided)
    if (args.eventTypeId) {
      const eventType = await ctx.db.get(args.eventTypeId);
      if (!eventType) {
        throw new Error("Event type not found");
      }
    }

    // Verify server exists (if provided)
    if (args.serverId) {
      const server = await ctx.db.get(args.serverId);
      if (!server) {
        throw new Error("Server not found");
      }
    }

    // Handle instructor updates separately if provided
    if (args.instructorIds !== undefined) {
      // Verify all instructors exist and have appropriate roles
      for (const instructorId of args.instructorIds) {
        const instructor = await ctx.db.get(instructorId);
        if (!instructor) {
          throw new Error("Instructor not found");
        }

        // Check if personnel has instructor or game_master role
        const userRoles = await ctx.db
          .query("userRoles")
          .withIndex("by_personnel", (q) => q.eq("personnelId", instructorId))
          .collect();

        const roles = await ctx.db.query("roles").collect();
        const roleMap = new Map(roles.map(role => [role._id, role.roleName]));
        
        const hasInstructorRole = userRoles.some(ur => ur.roleId && roleMap.get(ur.roleId) === "instructor");
        const hasGameMasterRole = userRoles.some(ur => ur.roleId && roleMap.get(ur.roleId) === "game_master");

        if (!hasInstructorRole && !hasGameMasterRole) {
          throw new Error("Personnel must be an instructor or game master");
        }
      }

      // Delete existing event instructors
      const existingInstructors = await ctx.db
        .query("eventInstructors")
        .withIndex("by_event", (q) => q.eq("eventId", args.eventId))
        .collect();

      for (const instructor of existingInstructors) {
        await ctx.db.delete(instructor._id);
      }

      // Create new event instructor assignments
      for (const instructorId of args.instructorIds) {
        // Determine role based on personnel roles
        const userRoles = await ctx.db
          .query("userRoles")
          .withIndex("by_personnel", (q) => q.eq("personnelId", instructorId))
          .collect();

        const roles = await ctx.db.query("roles").collect();
        const roleMap = new Map(roles.map(role => [role._id, role.roleName]));
        
        const hasInstructorRole = userRoles.some(ur => ur.roleId && roleMap.get(ur.roleId) === "instructor");
        const hasGameMasterRole = userRoles.some(ur => ur.roleId && roleMap.get(ur.roleId) === "game_master");

        // Assign the primary role (prefer game_master if both exist)
        const role = hasGameMasterRole ? "game_master" : "instructor";

        await ctx.db.insert("eventInstructors", {
          eventId: args.eventId,
          personnelId: instructorId,
          role,
        });
      }
    }

    // Prepare updates for the event itself (exclude instructorIds)
    const { eventId, instructorIds, ...updates } = args;

    // Remove undefined values
    const cleanUpdates = Object.fromEntries(
      Object.entries(updates).filter(([_, v]) => v !== undefined)
    );

    // Only patch if there are updates
    if (Object.keys(cleanUpdates).length > 0) {
      await ctx.db.patch(eventId, cleanUpdates);
    }

    return { success: true };
  },
});

/**
 * Delete an event (Administrator only)
 */
export const deleteEvent = mutation({
  args: {
    userId: v.id("personnel"), // User ID from NextAuth session
    eventId: v.id("events")
  },
  handler: async (ctx, args) => {
    await requireRole(ctx, args.userId, "administrator");

    // Delete all participants
    const participants = await ctx.db
      .query("eventParticipants")
      .withIndex("by_event", (q) => q.eq("eventId", args.eventId))
      .collect();

    for (const participant of participants) {
      await ctx.db.delete(participant._id);
    }

    // Delete all event instructors
    const eventInstructors = await ctx.db
      .query("eventInstructors")
      .withIndex("by_event", (q) => q.eq("eventId", args.eventId))
      .collect();

    for (const instructor of eventInstructors) {
      await ctx.db.delete(instructor._id);
    }

    // Delete the event
    await ctx.db.delete(args.eventId);
    return { success: true };
  },
});

/**
 * Clear event by booking code (Instructor, Game Master, or Administrator)
 */
export const clearEventByCode = mutation({
  args: {
    userId: v.id("personnel"), // User ID from NextAuth session
    bookingCode: v.string()
  },
  handler: async (ctx, args) => {
    const user = await requireAuth(ctx, args.userId);
    
    // Check if user has instructor, game_master, administrator, or super_admin role
    const personnelRoles = await ctx.db
      .query("userRoles")
      .withIndex("by_personnel", (q) => q.eq("personnelId", user._id))
      .collect();
    
    const roles = await ctx.db.query("roles").collect();
    const roleMap = new Map(roles.map(role => [role._id, role.roleName]));
    const roleNames = personnelRoles
      .map(ur => ur.roleId ? roleMap.get(ur.roleId) : null)
      .filter(Boolean) as string[];
    
    const canClearEvent = roleNames.some(role => 
      role === "instructor" || 
      role === "game_master" || 
      role === "administrator" || 
      role === "super_admin"
    );
    
    if (!canClearEvent) {
      throw new Error("Access denied: Requires instructor, game master, administrator, or super admin role");
    }

    const event = await ctx.db
      .query("events")
      .withIndex("by_booking_code", (q) =>
        q.eq("bookingCode", args.bookingCode)
      )
      .first();

    if (!event) {
      throw new Error("Event not found with this booking code");
    }

    // Delete all participants
    const participants = await ctx.db
      .query("eventParticipants")
      .withIndex("by_event", (q) => q.eq("eventId", event._id))
      .collect();

    for (const participant of participants) {
      await ctx.db.delete(participant._id);
    }

    // Delete all event instructors
    const eventInstructors = await ctx.db
      .query("eventInstructors")
      .withIndex("by_event", (q) => q.eq("eventId", event._id))
      .collect();

    for (const instructor of eventInstructors) {
      await ctx.db.delete(instructor._id);
    }

    // Delete the event
    await ctx.db.delete(event._id);
    return { success: true };
  },
});

/**
 * Enroll personnel in an event
 */
export const enrollPersonnel = mutation({
  args: {
    userId: v.id("personnel"), // User ID from NextAuth session
    eventId: v.id("events"),
    personnelId: v.id("personnel"),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await requireRole(ctx, args.userId, "instructor");

    // Verify event exists
    const event = await ctx.db.get(args.eventId);
    if (!event) {
      throw new Error("Event not found");
    }

    // Verify personnel exists
    const personnel = await ctx.db.get(args.personnelId);
    if (!personnel) {
      throw new Error("Personnel not found");
    }

    // Check if already enrolled
    const existingEnrollment = await ctx.db
      .query("eventParticipants")
      .withIndex("by_event_and_personnel", (q) =>
        q.eq("eventId", args.eventId).eq("personnelId", args.personnelId)
      )
      .first();

    if (existingEnrollment) {
      throw new Error("Personnel is already enrolled in this event");
    }

    // Check capacity
    if (event.maxParticipants) {
      if (event.currentParticipants >= event.maxParticipants) {
        throw new Error("Event is at maximum capacity");
      }
    }

    // Enroll personnel
    await ctx.db.insert("eventParticipants", {
      eventId: args.eventId,
      personnelId: args.personnelId,
      enrolledDate: Date.now(),
      status: "enrolled",
      notes: args.notes,
    });

    // Update participant count
    await ctx.db.patch(args.eventId, {
      currentParticipants: event.currentParticipants + 1,
    });

    return { success: true };
  },
});

/**
 * Remove personnel from an event
 */
export const removePersonnel = mutation({
  args: {
    userId: v.id("personnel"), // User ID from NextAuth session
    eventId: v.id("events"),
    personnelId: v.id("personnel"),
  },
  handler: async (ctx, args) => {
    await requireRole(ctx, args.userId, "instructor");

    // Find enrollment
    const enrollment = await ctx.db
      .query("eventParticipants")
      .withIndex("by_event_and_personnel", (q) =>
        q.eq("eventId", args.eventId).eq("personnelId", args.personnelId)
      )
      .first();

    if (!enrollment) {
      throw new Error("Personnel is not enrolled in this event");
    }

    // Remove enrollment
    await ctx.db.delete(enrollment._id);

    // Update participant count
    const event = await ctx.db.get(args.eventId);
    if (event) {
      await ctx.db.patch(args.eventId, {
        currentParticipants: Math.max(0, event.currentParticipants - 1),
      });
    }

    return { success: true };
  },
});

/**
 * Update participant status (attended, absent, etc.)
 */
export const updateParticipantStatus = mutation({
  args: {
    userId: v.id("personnel"), // User ID from NextAuth session
    participantId: v.id("eventParticipants"),
    status: v.union(
      v.literal("enrolled"),
      v.literal("attended"),
      v.literal("absent"),
      v.literal("excused")
    ),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await requireRole(ctx, args.userId, "instructor");

    const { participantId, ...updates } = args;

    // Remove undefined values
    const cleanUpdates = Object.fromEntries(
      Object.entries(updates).filter(([_, v]) => v !== undefined)
    );

    await ctx.db.patch(participantId, cleanUpdates);
    return { success: true };
  },
});

/**
 * List all event types
 */
export const listEventTypes = query({
  args: {
    userId: v.id("personnel"), // User ID from NextAuth session
  },
  handler: async (ctx, args) => {
    await requireAuth(ctx, args.userId);
    return await ctx.db.query("eventTypes").collect();
  },
});

/**
 * List all servers
 */
export const listServers = query({
  args: {
    userId: v.id("personnel"), // User ID from NextAuth session
    activeOnly: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    await requireAuth(ctx, args.userId);

    if (args.activeOnly) {
      return await ctx.db
        .query("servers")
        .withIndex("by_active", (q) => q.eq("isActive", true))
        .collect();
    }

    return await ctx.db.query("servers").collect();
  },
});

/**
 * Get this week's schedule - all events for the current week
 */
export const getWeekSchedule = query({
  args: {
    userId: v.id("personnel"), // User ID from NextAuth session
  },
  handler: async (ctx, args) => {
    await requireAuth(ctx, args.userId);

    // Calculate the start and end of the current week (Sunday to Saturday)
    const now = new Date();
    const startOfWeek = new Date(now);
    startOfWeek.setHours(0, 0, 0, 0);
    startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay()); // Start of week (Sunday)
    
    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(endOfWeek.getDate() + 7); // End of week (next Sunday)
    endOfWeek.setHours(23, 59, 59, 999);

    // Get all scheduled events within the current week using the date index
    const weekEvents = await ctx.db
      .query("events")
      .withIndex("by_date", (q) =>
        q.gte("startDate", startOfWeek.getTime()).lt("startDate", endOfWeek.getTime())
      )
      .filter((q) => q.eq(q.field("status"), "scheduled"))
      .collect();

    // Enrich events with full details
    const weekSchedule = await Promise.all(
      weekEvents.map(async (event) => {
        const eventType = event.eventTypeId ? await ctx.db.get(event.eventTypeId) : null;
        const server = await ctx.db.get(event.serverId);
        
        // Get event instructors
        const eventInstructors = await ctx.db
          .query("eventInstructors")
          .withIndex("by_event", (q) => q.eq("eventId", event._id))
          .collect();

        const instructorsWithDetails = await Promise.all(
          eventInstructors.map(async (ei) => {
            if (!ei.personnelId) return "Unknown";
            const person = await ctx.db.get(ei.personnelId);
            return person?.callSign || "Unknown";
          })
        );
        
        return {
          _id: event._id,
          title: event.title,
          description: event.description,
          startDate: event.startDate,
          endDate: event.endDate,
          eventType: eventType?.name || "Unknown",
          eventTypeAbbr: eventType?.abbreviation || "N/A",
          eventTypeColor: eventType?.color || "#888888",
          server: server?.name || "Unknown",
          instructorName: instructorsWithDetails.join(", ") || "TBD",
          currentParticipants: event.currentParticipants,
          maxParticipants: event.maxParticipants,
          bookingCode: event.bookingCode,
          status: event.status,
        };
      })
    );

    // Sort by start date
    return weekSchedule.sort((a, b) => a.startDate - b.startDate);
  },
});

/**
 * Get next week's schedule - all events for the next week
 */
export const getNextWeekSchedule = query({
  args: {
    userId: v.id("personnel"), // User ID from NextAuth session
  },
  handler: async (ctx, args) => {
    await requireAuth(ctx, args.userId);

    // Calculate the start and end of next week (Sunday to Saturday)
    const now = new Date();
    const startOfNextWeek = new Date(now);
    startOfNextWeek.setHours(0, 0, 0, 0);
    // Move to start of next week (Sunday)
    startOfNextWeek.setDate(startOfNextWeek.getDate() - startOfNextWeek.getDay() + 7);
    
    const endOfNextWeek = new Date(startOfNextWeek);
    endOfNextWeek.setDate(endOfNextWeek.getDate() + 7); // End of next week (following Sunday)
    endOfNextWeek.setHours(23, 59, 59, 999);

    // Get all scheduled events within next week using the date index
    const nextWeekEvents = await ctx.db
      .query("events")
      .withIndex("by_date", (q) =>
        q.gte("startDate", startOfNextWeek.getTime()).lt("startDate", endOfNextWeek.getTime())
      )
      .filter((q) => q.eq(q.field("status"), "scheduled"))
      .collect();

    // Enrich events with full details
    const nextWeekSchedule = await Promise.all(
      nextWeekEvents.map(async (event) => {
        const eventType = event.eventTypeId ? await ctx.db.get(event.eventTypeId) : null;
        const server = await ctx.db.get(event.serverId);
        
        // Get event instructors
        const eventInstructors = await ctx.db
          .query("eventInstructors")
          .withIndex("by_event", (q) => q.eq("eventId", event._id))
          .collect();

        const instructorsWithDetails = await Promise.all(
          eventInstructors.map(async (ei) => {
            if (!ei.personnelId) return "Unknown";
            const person = await ctx.db.get(ei.personnelId);
            return person?.callSign || "Unknown";
          })
        );
        
        return {
          _id: event._id,
          title: event.title,
          description: event.description,
          startDate: event.startDate,
          endDate: event.endDate,
          eventType: eventType?.name || "Unknown",
          eventTypeAbbr: eventType?.abbreviation || "N/A",
          eventTypeColor: eventType?.color || "#888888",
          server: server?.name || "Unknown",
          instructorName: instructorsWithDetails.join(", ") || "TBD",
          currentParticipants: event.currentParticipants,
          maxParticipants: event.maxParticipants,
          bookingCode: event.bookingCode,
          status: event.status,
        };
      })
    );

    // Sort by start date
    return nextWeekSchedule.sort((a, b) => a.startDate - b.startDate);
  },
});

/**
 * Get the next upcoming event
 */
export const getNextEvent = query({
  args: {
    userId: v.id("personnel"), // User ID from NextAuth session
  },
  handler: async (ctx, args) => {
    await requireAuth(ctx, args.userId);

    const now = Date.now();
    const oneWeekFromNow = now + 7 * 24 * 60 * 60 * 1000;

    // Get the next scheduled event
    const upcomingEvents = await ctx.db
      .query("events")
      .withIndex("by_date", (q) =>
        q.gte("startDate", now).lt("startDate", oneWeekFromNow)
      )
      .filter((q) => q.eq(q.field("status"), "scheduled"))
      .collect();

    if (upcomingEvents.length === 0) {
      return null;
    }

    // Get the closest event
    const nextEvent = upcomingEvents.sort((a, b) => a.startDate - b.startDate)[0];

    // Enrich with details
    const eventType = nextEvent.eventTypeId ? await ctx.db.get(nextEvent.eventTypeId) : null;
    const server = await ctx.db.get(nextEvent.serverId);
    
    // Get event instructors
    const eventInstructors = await ctx.db
      .query("eventInstructors")
      .withIndex("by_event", (q) => q.eq("eventId", nextEvent._id))
      .collect();

    const instructorsWithDetails = await Promise.all(
      eventInstructors.map(async (ei) => {
        if (!ei.personnelId) return "Unknown";
        const person = await ctx.db.get(ei.personnelId);
        return person?.callSign || "Unknown";
      })
    );
    
    return {
      _id: nextEvent._id,
      title: nextEvent.title,
      startDate: nextEvent.startDate,
      endDate: nextEvent.endDate,
      eventType: eventType?.name || "Unknown",
      eventTypeAbbr: eventType?.abbreviation || "N/A",
      eventTypeColor: eventType?.color || "#888888",
      server: server?.name || "Unknown",
      instructorName: instructorsWithDetails.join(", ") || "TBD",
      currentParticipants: nextEvent.currentParticipants,
      maxParticipants: nextEvent.maxParticipants,
      bookingCode: nextEvent.bookingCode,
    };
  },
});

/**
 * Clear old events from previous months
 * Runs on the last day of each month at midnight Sydney time
 * Keeps events from the current month onwards, deletes all events from previous months
 */
export const clearOldEvents = internalMutation({
  args: {},
  handler: async (ctx) => {
    // Get current date/time in Sydney timezone
    const now = Date.now();
    const currentDate = new Date(now);
    
    // Calculate the start of the current month in Sydney timezone
    const sydneyOffset = 10 * 60 * 60 * 1000; // Base offset (AEST = UTC+10)
    const sydneyDate = new Date(now + sydneyOffset);
    
    // Get first day of current month at 00:00:00 Sydney time
    const monthStart = new Date(
      Date.UTC(
        sydneyDate.getUTCFullYear(),
        sydneyDate.getUTCMonth(),
        1,
        0,
        0,
        0,
        0
      )
    );
    // Convert back to UTC timestamp
    const monthStartUTC = monthStart.getTime() - sydneyOffset;
    
    // Get all events that ended before the start of current month
    const allEvents = await ctx.db.query("events").collect();
    const eventsToDelete = allEvents.filter(event => event.endDate < monthStartUTC);
    
    console.log(
      `Clearing ${eventsToDelete.length} old events from before ${monthStart.toISOString()} (Sydney time)`
    );
    
    // Delete each event and its related data
    for (const event of eventsToDelete) {
      // Delete all participants
      const participants = await ctx.db
        .query("eventParticipants")
        .withIndex("by_event", (q) => q.eq("eventId", event._id))
        .collect();
      
      for (const participant of participants) {
        await ctx.db.delete(participant._id);
      }
      
      // Delete all event instructors
      const eventInstructors = await ctx.db
        .query("eventInstructors")
        .withIndex("by_event", (q) => q.eq("eventId", event._id))
        .collect();
      
      for (const instructor of eventInstructors) {
        await ctx.db.delete(instructor._id);
      }
      
      // Delete the event itself
      await ctx.db.delete(event._id);
    }
    
    return {
      success: true,
      deletedCount: eventsToDelete.length,
      monthStart: monthStart.toISOString(),
      message: `Cleared ${eventsToDelete.length} events from before ${monthStart.toISOString()}`,
    };
  },
});

/**
 * Legacy weekly cleanup function - kept for backwards compatibility
 * This is no longer used by the cron job but can be called manually if needed
 */
export const clearWeeklyEvents = internalMutation({
  args: {},
  handler: async (ctx) => {
    // Get current date (Sunday at midnight when this runs)
    const now = Date.now();
    
    // Calculate the start of the current week (Monday) that just ended
    const currentDate = new Date(now);
    const dayOfWeek = currentDate.getDay(); // 0 = Sunday
    const daysToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1; // Days since Monday
    const weekStart = new Date(currentDate);
    weekStart.setDate(currentDate.getDate() - daysToMonday - 7); // Previous week's Monday
    weekStart.setHours(0, 0, 0, 0);
    
    const weekEnd = new Date(currentDate);
    weekEnd.setHours(23, 59, 59, 999);
    
    // Get all events from the week that just ended
    const eventsToDelete = await ctx.db
      .query("events")
      .withIndex("by_date", (q) =>
        q.gte("startDate", weekStart.getTime()).lte("startDate", weekEnd.getTime())
      )
      .collect();
    
    console.log(`Clearing ${eventsToDelete.length} events from week ${weekStart.toISOString()}`);
    
    // Delete each event and its related data
    for (const event of eventsToDelete) {
      // Delete all participants
      const participants = await ctx.db
        .query("eventParticipants")
        .withIndex("by_event", (q) => q.eq("eventId", event._id))
        .collect();
      
      for (const participant of participants) {
        await ctx.db.delete(participant._id);
      }
      
      // Delete all event instructors
      const eventInstructors = await ctx.db
        .query("eventInstructors")
        .withIndex("by_event", (q) => q.eq("eventId", event._id))
        .collect();
      
      for (const instructor of eventInstructors) {
        await ctx.db.delete(instructor._id);
      }
      
      // Delete the event itself
      await ctx.db.delete(event._id);
    }
    
    return {
      success: true,
      deletedCount: eventsToDelete.length,
      weekStart: weekStart.toISOString(),
      weekEnd: weekEnd.toISOString(),
    };
  },
});