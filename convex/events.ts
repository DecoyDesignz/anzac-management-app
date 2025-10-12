import { v } from "convex/values";
import { internalMutation, mutation, query } from "./_generated/server";
import { requireAuth, requireRole } from "./helpers";

/**
 * List all events within a date range
 */
export const listEvents = query({
  args: {
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
    await requireAuth(ctx);

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
            const user = await ctx.db.get(ei.userId);
            return {
              ...ei,
              user,
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
  args: { eventId: v.id("events") },
  handler: async (ctx, args) => {
    await requireAuth(ctx);

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
        const user = await ctx.db.get(ei.userId);
        return {
          ...ei,
          user,
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
 * Create a new event (Instructor or higher)
 */
export const createEvent = mutation({
  args: {
    title: v.string(),
    description: v.optional(v.string()),
    startDate: v.number(),
    endDate: v.number(),
    eventTypeId: v.optional(v.id("eventTypes")),
    serverId: v.id("servers"),
    instructorIds: v.array(v.id("systemUsers")),
    maxParticipants: v.optional(v.number()),
    isRecurring: v.boolean(),
    recurringPattern: v.optional(v.string()),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await requireRole(ctx, "instructor");

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

      // Check if user has instructor or game_master role
      const instructorRole = await ctx.db
        .query("userRoles")
        .withIndex("by_user_and_role", (q) => 
          q.eq("userId", instructorId).eq("role", "instructor")
        )
        .first();

      const gameMasterRole = await ctx.db
        .query("userRoles")
        .withIndex("by_user_and_role", (q) => 
          q.eq("userId", instructorId).eq("role", "game_master")
        )
        .first();

      if (!instructorRole && !gameMasterRole) {
        throw new Error("User must be an instructor or game master");
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
      // Determine role based on user roles
      const instructorRole = await ctx.db
        .query("userRoles")
        .withIndex("by_user_and_role", (q) => 
          q.eq("userId", instructorId).eq("role", "instructor")
        )
        .first();

      const gameMasterRole = await ctx.db
        .query("userRoles")
        .withIndex("by_user_and_role", (q) => 
          q.eq("userId", instructorId).eq("role", "game_master")
        )
        .first();

      // Assign the primary role (prefer game_master if both exist)
      const role = gameMasterRole ? "game_master" : "instructor";

      await ctx.db.insert("eventInstructors", {
        eventId,
        userId: instructorId,
        role,
      });
    }

    return eventId;
  },
});

/**
 * Update an event (Instructor or higher)
 */
export const updateEvent = mutation({
  args: {
    eventId: v.id("events"),
    title: v.optional(v.string()),
    description: v.optional(v.string()),
    startDate: v.optional(v.number()),
    endDate: v.optional(v.number()),
    eventTypeId: v.optional(v.id("eventTypes")),
    serverId: v.optional(v.id("servers")),
    instructorId: v.optional(v.id("systemUsers")),
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
    await requireRole(ctx, "instructor");

    const { eventId, ...updates } = args;

    // Remove undefined values
    const cleanUpdates = Object.fromEntries(
      Object.entries(updates).filter(([_, v]) => v !== undefined)
    );

    await ctx.db.patch(eventId, cleanUpdates);
    return { success: true };
  },
});

/**
 * Delete an event (Administrator only)
 */
export const deleteEvent = mutation({
  args: { eventId: v.id("events") },
  handler: async (ctx, args) => {
    await requireRole(ctx, "administrator");

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
 * Clear event by booking code (Instructor or higher)
 */
export const clearEventByCode = mutation({
  args: { bookingCode: v.string() },
  handler: async (ctx, args) => {
    await requireRole(ctx, "instructor");

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
    eventId: v.id("events"),
    personnelId: v.id("personnel"),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await requireRole(ctx, "instructor");

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
    eventId: v.id("events"),
    personnelId: v.id("personnel"),
  },
  handler: async (ctx, args) => {
    await requireRole(ctx, "instructor");

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
    await requireRole(ctx, "instructor");

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
  args: {},
  handler: async (ctx) => {
    await requireAuth(ctx);
    return await ctx.db.query("eventTypes").collect();
  },
});

/**
 * List all servers
 */
export const listServers = query({
  args: {
    activeOnly: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    await requireAuth(ctx);

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
  args: {},
  handler: async (ctx) => {
    await requireAuth(ctx);

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
            const user = await ctx.db.get(ei.userId);
            return user?.name || "Unknown";
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
 * Get the next upcoming event
 */
export const getNextEvent = query({
  args: {},
  handler: async (ctx) => {
    await requireAuth(ctx);

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
        const user = await ctx.db.get(ei.userId);
        return user?.name || "Unknown";
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
 * Clear weekly events (runs automatically every Sunday at midnight)
 * This is an internal mutation called by the cron job
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