import type { QueryCtx } from "./_generated/server";
import type { Doc, Id } from "./_generated/dataModel";

/** Upcoming event with resolved details for dashboard */
type UpcomingEventWithDetails = {
  _id: Id<"events">;
  title: string;
  startDate: number;
  endDate: number;
  eventType: string;
  eventTypeColor: string;
  server: string;
  instructorName: string;
  currentParticipants: number;
  maxParticipants: number | undefined;
};

/** School stat for dashboard */
type SchoolStat = {
  name: string;
  abbreviation: string;
  qualificationCount: number;
  instructorCount: number;
};

/** Recent promotion with resolved details */
type RecentPromotionWithDetails = {
  personnelName: string;
  rankName: string;
  rankAbbreviation: string;
  promotionDate: number;
  promotedByName: string;
  notes: string | undefined;
  roles: Array<{ name: string; displayName: string; color: string }>;
  hasSystemAccess: boolean;
};

/** Week schedule event with resolved details */
type WeekScheduleEvent = {
  _id: Id<"events">;
  title: string;
  description: string | undefined;
  startDate: number;
  endDate: number;
  eventType: string;
  eventTypeAbbr: string;
  eventTypeColor: string;
  server: string;
  instructorName: string;
  currentParticipants: number;
  maxParticipants: number | undefined;
  bookingCode?: string;
};

type BuildLogCtx = { userId?: Id<"personnel">; source: string; forPublic?: boolean };

/**
 * Shared dashboard payload for authenticated and public site views.
 */
export async function buildDashboardOverview(ctx: QueryCtx, logCtx?: BuildLogCtx) {
  const forPublic = logCtx?.forPublic === true;

  let allPersonnel: Doc<"personnel">[] = [];
  try {
    allPersonnel = await ctx.db.query("personnel").collect();
  } catch (error) {
    console.error("Error fetching personnel:", error);
    allPersonnel = [];
  }
  const totalPersonnel = allPersonnel.length;
  const activePersonnel = allPersonnel.filter((p) => p.status === "active").length;

  let qualifications: Doc<"qualifications">[] = [];
  try {
    qualifications = await ctx.db.query("qualifications").collect();
  } catch (error) {
    console.error("Error fetching qualifications:", error);
    qualifications = [];
  }
  const totalQualifications = qualifications.length;

  let personnelQualifications: Doc<"personnelQualifications">[] = [];
  try {
    personnelQualifications = await ctx.db.query("personnelQualifications").collect();
  } catch (error) {
    console.error("Error fetching personnelQualifications:", error);
    personnelQualifications = [];
  }
  const totalQualificationsAwarded = personnelQualifications.length;

  const avgQualificationsPerPerson =
    activePersonnel > 0 ? (totalQualificationsAwarded / activePersonnel).toFixed(1) : "0";

  let schools: Doc<"schools">[] = [];
  try {
    schools = await ctx.db.query("schools").collect();
  } catch (error) {
    console.error("Error fetching schools:", error);
    schools = [];
  }
  const schoolMap = new Map(schools.map((school) => [school._id, school]));

  const qualificationCounts = qualifications.map((qual) => {
    const count = personnelQualifications.filter((pq) => pq.qualificationId === qual._id).length;
    const school = qual?.schoolId ? schoolMap.get(qual.schoolId) : null;
    return {
      qualification: qual,
      school: {
        name: school?.name || "Unknown",
        color: school?.color || "#6B7280",
      },
      count,
      percentage: activePersonnel > 0 ? Math.round((count / activePersonnel) * 100) : 0,
    };
  });
  const topQualifications = qualificationCounts.sort((a, b) => b.count - a.count).slice(0, 5);

  const now = Date.now();
  const oneWeekAgo = now - 7 * 24 * 60 * 60 * 1000;
  const oneWeekFromNow = now + 7 * 24 * 60 * 60 * 1000;

  let allEvents: Doc<"events">[] = [];
  try {
    allEvents = await ctx.db.query("events").collect();
  } catch (error) {
    console.error("Error fetching events:", error);
    allEvents = [];
  }

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

  let upcomingEventsWithDetails: (UpcomingEventWithDetails | null)[] = [];
  try {
    upcomingEventsWithDetails = await Promise.all(
      upcomingEvents.slice(0, 5).map(async (event) => {
        try {
          const eventType = event.eventTypeId ? await ctx.db.get(event.eventTypeId) : null;
          const server = event.serverId ? await ctx.db.get(event.serverId) : null;

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
        } catch (error) {
          console.error("Error processing event:", event._id, error);
          return null;
        }
      })
    );
    upcomingEventsWithDetails = upcomingEventsWithDetails.filter((event) => event !== null);
  } catch (error) {
    console.error("Error fetching upcoming events details:", error);
    upcomingEventsWithDetails = [];
  }

  const nextEvent =
    upcomingEventsWithDetails.length > 0
      ? upcomingEventsWithDetails
          .filter((event): event is UpcomingEventWithDetails => event !== null && event.startDate >= now)
          .sort((a, b) => a.startDate - b.startDate)[0]
      : null;

  const allSchools = schools;
  let schoolStats: (SchoolStat | null)[] = [];
  try {
    schoolStats = await Promise.all(
      allSchools.map(async (school) => {
        try {
          const schoolQualifications = qualifications.filter((q) => q.schoolId === school._id);
          const instructors = await ctx.db
            .query("instructorSchools")
            .withIndex("by_school", (q) => q.eq("schoolId", school._id))
            .collect();

          return {
            name: school.name || "Unknown",
            abbreviation: school.abbreviation || "N/A",
            qualificationCount: schoolQualifications.length,
            instructorCount: instructors.length,
          };
        } catch (error) {
          console.error("Error processing school:", school._id, error);
          return null;
        }
      })
    );
    schoolStats = schoolStats.filter((school) => school !== null);
  } catch (error) {
    console.error("Error fetching school stats:", error);
    schoolStats = [];
  }

  let allUserRoles: Doc<"userRoles">[] = [];
  try {
    allUserRoles = await ctx.db.query("userRoles").collect();
  } catch (error) {
    console.error("Error fetching userRoles:", error);
    allUserRoles = [];
  }

  let allRoles: Doc<"roles">[] = [];
  try {
    allRoles = await ctx.db.query("roles").collect();
  } catch (error) {
    console.error("Error fetching roles:", error);
    allRoles = [];
  }

  const roleMap = new Map(allRoles.map((role) => [role._id, role.roleName]));

  const instructorCount = allUserRoles.filter(
    (ur) => ur.roleId && roleMap.get(ur.roleId) === "instructor"
  ).length;
  const gameMasterCount = allUserRoles.filter(
    (ur) => ur.roleId && roleMap.get(ur.roleId) === "game_master"
  ).length;

  let allRankHistory: Doc<"rankHistory">[] = [];
  try {
    allRankHistory = await ctx.db.query("rankHistory").collect();
  } catch (error) {
    console.error("Error fetching rankHistory:", error);
    allRankHistory = [];
  }
  const sortedRankHistory = allRankHistory.sort((a, b) => b.promotionDate - a.promotionDate);

  let recentPromotions: (RecentPromotionWithDetails | null)[] = [];
  try {
    recentPromotions = await Promise.all(
      sortedRankHistory.slice(0, 3).map(async (history) => {
        try {
          const person = history.personnelId ? await ctx.db.get(history.personnelId) : null;
          const rank = history.rankId ? await ctx.db.get(history.rankId) : null;
          const promotedBy = history.promotedBy ? await ctx.db.get(history.promotedBy) : null;

          let roles: Array<{ name: string; displayName: string; color: string }> = [];
          if (person && person.passwordHash) {
            const personnelRoles = await ctx.db
              .query("userRoles")
              .withIndex("by_personnel", (q) => q.eq("personnelId", person._id))
              .collect();

            const roleDetails = personnelRoles
              .map((ur) => (ur.roleId ? roleMap.get(ur.roleId) : null))
              .filter(Boolean)
              .map((roleName) => {
                const role = allRoles.find((r) => r.roleName === roleName);
                return role
                  ? {
                      name: role.roleName,
                      displayName: role.displayName,
                      color: role.color,
                    }
                  : null;
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
            notes: forPublic ? undefined : history.notes,
            roles,
            hasSystemAccess: person?.passwordHash !== undefined,
          };
        } catch (error) {
          console.error("Error processing promotion:", history._id, error);
          return null;
        }
      })
    );
    recentPromotions = recentPromotions.filter((promotion) => promotion !== null);
  } catch (error) {
    console.error("Error fetching recent promotions:", error);
    recentPromotions = [];
  }

  const startOfWeek = new Date();
  startOfWeek.setHours(0, 0, 0, 0);
  startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay());
  const endOfWeek = new Date(startOfWeek);
  endOfWeek.setDate(endOfWeek.getDate() + 7);

  const weekEvents = allEvents.filter(
    (event) =>
      event.startDate >= startOfWeek.getTime() &&
      event.startDate < endOfWeek.getTime() &&
      event.status === "scheduled"
  );

  let weekSchedule: (WeekScheduleEvent | null)[] = [];
  try {
    weekSchedule = await Promise.all(
      weekEvents.map(async (event) => {
        try {
          const eventType = event.eventTypeId ? await ctx.db.get(event.eventTypeId) : null;
          const server = event.serverId ? await ctx.db.get(event.serverId) : null;

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

          const row: WeekScheduleEvent = {
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
          if (forPublic) {
            const { bookingCode: _omit, ...publicRow } = row;
            return publicRow;
          }
          return row;
        } catch (error) {
          console.error("Error processing week schedule event:", event._id, error);
          return null;
        }
      })
    );
    weekSchedule = weekSchedule.filter((event) => event !== null);
  } catch (error) {
    console.error("Error fetching week schedule:", error);
    weekSchedule = [];
  }

  try {
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
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error("Unexpected error in buildDashboardOverview:", {
      userId: logCtx?.userId,
      source: logCtx?.source ?? "buildDashboardOverview",
      error: errorMessage,
      timestamp: new Date().toISOString(),
    });
    throw new Error(`Failed to load dashboard data: ${errorMessage}`);
  }
}
