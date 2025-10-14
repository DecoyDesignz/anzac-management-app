import { query } from "./_generated/server";
import { requireAuth } from "./helpers";

/**
 * Get dashboard statistics
 */
export const getStatistics = query({
  args: {},
  handler: async (ctx) => {
    await requireAuth(ctx);

    // Count total personnel
    const allPersonnel = await ctx.db.query("personnel").collect();
    const totalPersonnel = allPersonnel.length;
    const activePersonnel = allPersonnel.filter((p) => p.status === "active").length;

    // Count ranks
    const ranks = await ctx.db.query("ranks").collect();
    const totalRanks = ranks.length;

    // Count qualifications
    const qualifications = await ctx.db.query("qualifications").collect();
    const totalQualifications = qualifications.length;

    // Count schools
    const schools = await ctx.db.query("schools").collect();
    const totalSchools = schools.length;

    // Count users by role (personnel with system access)
    const personnelWithAccess = allPersonnel.filter(p => p.passwordHash !== undefined);
    const userRoles = await ctx.db.query("userRoles").collect();
    const roles = await ctx.db.query("roles").collect();
    
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
  args: {},
  handler: async (ctx) => {
    await requireAuth(ctx);

    // Get basic statistics
    const allPersonnel = await ctx.db.query("personnel").collect();
    const totalPersonnel = allPersonnel.length;
    const activePersonnel = allPersonnel.filter((p) => p.status === "active").length;

    // Get qualifications data
    const qualifications = await ctx.db.query("qualifications").collect();
    const totalQualifications = qualifications.length;
    
    // Get personnel qualifications
    const personnelQualifications = await ctx.db.query("personnelQualifications").collect();
    const totalQualificationsAwarded = personnelQualifications.length;
    
    // Calculate average qualifications per person
    const avgQualificationsPerPerson = activePersonnel > 0 
      ? (totalQualificationsAwarded / activePersonnel).toFixed(1) 
      : "0";

    // Get top qualifications by personnel count with school colors
    const schools = await ctx.db.query("schools").collect();
    const schoolMap = new Map(schools.map(school => [school._id, school]));
    
    const qualificationCounts = qualifications.map((qual) => {
      const count = personnelQualifications.filter(
        (pq) => pq.qualificationId === qual._id
      ).length;
      const school = schoolMap.get(qual.schoolId);
      return {
        qualification: qual,
        school: {
          name: school?.name || "Unknown",
          color: school?.color || "#6B7280"
        },
        count,
        percentage: activePersonnel > 0 ? Math.round((count / activePersonnel) * 100) : 0,
      };
    });
    const topQualifications = qualificationCounts
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    // Get events data
    const now = Date.now();
    const oneWeekAgo = now - 7 * 24 * 60 * 60 * 1000;
    const oneWeekFromNow = now + 7 * 24 * 60 * 60 * 1000;

    const allEvents = await ctx.db.query("events").collect();
    
    const upcomingEvents = allEvents.filter(
      (event) => event.startDate >= now && event.startDate <= oneWeekFromNow && event.status === "scheduled"
    );
    
    const pastEvents = allEvents.filter(
      (event) => event.endDate < now && event.startDate >= oneWeekAgo
    );

    const eventsByStatus = {
      scheduled: allEvents.filter((e) => e.status === "scheduled").length,
      in_progress: allEvents.filter((e) => e.status === "in_progress").length,
      completed: allEvents.filter((e) => e.status === "completed").length,
      cancelled: allEvents.filter((e) => e.status === "cancelled").length,
    };

    // Get upcoming events with details (limit to 5 for other uses)
    const upcomingEventsWithDetails = await Promise.all(
      upcomingEvents.slice(0, 5).map(async (event) => {
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
          startDate: event.startDate,
          endDate: event.endDate,
          eventType: eventType?.name || "Unknown",
          eventTypeColor: eventType?.color || "#888888",
          server: server?.name || "Unknown",
          instructorName: instructorsWithDetails.join(", ") || "TBD",
          currentParticipants: event.currentParticipants,
          maxParticipants: event.maxParticipants,
        };
      })
    );

    // Get the next event closest to current time
    const nextEvent = upcomingEventsWithDetails.length > 0 
      ? upcomingEventsWithDetails
          .filter(event => event.startDate >= now)
          .sort((a, b) => a.startDate - b.startDate)[0]
      : null;

    // Get schools data
    const allSchools = await ctx.db.query("schools").collect();
    const schoolStats = await Promise.all(
      allSchools.map(async (school) => {
        const schoolQualifications = qualifications.filter((q) => q.schoolId === school._id);
        const instructors = await ctx.db
          .query("instructorSchools")
          .withIndex("by_school", (q) => q.eq("schoolId", school._id))
          .collect();
        
        return {
          name: school.name,
          abbreviation: school.abbreviation,
          qualificationCount: schoolQualifications.length,
          instructorCount: instructors.length,
        };
      })
    );

    // Get system users count (personnel with system access)
    const allPersonnelForCount = await ctx.db.query("personnel").collect();
    const systemUsers = allPersonnelForCount.filter(p => p.passwordHash !== undefined);
    const allUserRoles = await ctx.db.query("userRoles").collect();
    const allRoles = await ctx.db.query("roles").collect();
    
    // Create a map of role IDs to role names
    const roleMap = new Map(allRoles.map(role => [role._id, role.roleName]));
    
    const instructorCount = allUserRoles.filter((ur) => ur.roleId && roleMap.get(ur.roleId) === "instructor").length;
    const gameMasterCount = allUserRoles.filter((ur) => ur.roleId && roleMap.get(ur.roleId) === "game_master").length;

    // Get recent promotions (last 3) with roles
    const allRankHistory = await ctx.db.query("rankHistory").collect();
    const sortedRankHistory = allRankHistory.sort((a, b) => b.promotionDate - a.promotionDate);
    const recentPromotions = await Promise.all(
      sortedRankHistory.slice(0, 3).map(async (history) => {
        const person = await ctx.db.get(history.personnelId);
        const rank = await ctx.db.get(history.rankId);
        const promotedBy = history.promotedBy ? await ctx.db.get(history.promotedBy) : null;
        
        // Get person's roles if they have system access
        let roles: Array<{ name: string; displayName: string; color: string }> = [];
        if (person && person.passwordHash) {
          const personnelRoles = await ctx.db
            .query("userRoles")
            .withIndex("by_personnel", (q) => q.eq("personnelId", person._id))
            .collect();
          
          const roleDetails = personnelRoles
            .map(ur => ur.roleId ? roleMap.get(ur.roleId) : null)
            .filter(Boolean)
            .map(roleName => {
              const role = allRoles.find(r => r.roleName === roleName);
              return role ? {
                name: role.roleName,
                displayName: role.displayName,
                color: role.color
              } : null;
            })
            .filter(Boolean) as Array<{ name: string; displayName: string; color: string }>;
          
          roles = roleDetails;
        }
        
        return {
          personnelName: person?.callSign || "Unknown",
          rankName: rank?.name || "Unknown",
          rankAbbreviation: rank?.abbreviation || "N/A",
          promotionDate: history.promotionDate,
          promotedByName: promotedBy?.callSign || "System",
          notes: history.notes,
          roles,
          hasSystemAccess: person?.passwordHash !== undefined,
        };
      })
    );

    // Get week schedule (all events within the current week)
    const startOfWeek = new Date();
    startOfWeek.setHours(0, 0, 0, 0);
    startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay()); // Start of week (Sunday)
    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(endOfWeek.getDate() + 7); // End of week

    const weekEvents = allEvents.filter(
      (event) => event.startDate >= startOfWeek.getTime() && event.startDate < endOfWeek.getTime() && event.status === "scheduled"
    );

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
        };
      })
    );

    return {
      personnel: {
        total: totalPersonnel,
        active: activePersonnel,
        inactive: totalPersonnel - activePersonnel,
      },
      systemUsers: {
        instructors: instructorCount,
        gameMasters: gameMasterCount,
      },
      qualifications: {
        total: totalQualifications,
        awarded: totalQualificationsAwarded,
        avgPerPerson: avgQualificationsPerPerson,
        topQualifications,
      },
      events: {
        upcoming: upcomingEvents.length,
        recentPast: pastEvents.length,
        byStatus: eventsByStatus,
        upcomingDetails: upcomingEventsWithDetails,
        nextEvent: nextEvent,
      },
      schools: schoolStats,
      recentPromotions,
      weekSchedule,
    };
  },
});

