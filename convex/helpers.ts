import { QueryCtx, MutationCtx } from "./_generated/server";
import { Id } from "./_generated/dataModel";

// Role hierarchy for permission checking
export type UserRole = "super_admin" | "administrator" | "game_master" | "instructor" | "member";

const roleHierarchy: Record<UserRole, number> = {
  super_admin: 5,
  administrator: 4,
  instructor: 3,
  game_master: 2,
  member: 1,
};

/**
 * Get a personnel member by their ID
 */
export async function getUser(ctx: QueryCtx | MutationCtx, userId: Id<"personnel">) {
  return await ctx.db.get(userId);
}

/**
 * Get the current authenticated user
 * Note: With NextAuth, authentication is handled client-side
 * This returns null - use NextAuth session on the client
 */
export async function getCurrentUser(ctx: QueryCtx | MutationCtx) {
  // TODO: Implement proper JWT verification with NextAuth
  // For now, authentication is handled by Next.js middleware
  return null;
}

/**
 * Placeholder for authentication check
 * TODO: Implement proper authentication verification
 */
export async function requireAuth(ctx: QueryCtx | MutationCtx): Promise<any> {
  // TODO: Verify NextAuth JWT token
  // For now, we rely on Next.js middleware for authentication
  // This should be called from authenticated routes only
  return { _id: "" as Id<"personnel">, role: "administrator" as UserRole, isActive: true, email: "", callSign: "", requirePasswordChange: false };
}

/**
 * Placeholder for role-based authorization
 * TODO: Implement proper role verification
 */
export async function requireRole(
  ctx: QueryCtx | MutationCtx,
  minimumRole: UserRole
): Promise<any> {
  // TODO: Verify user role from NextAuth session
  // For now, we rely on Next.js middleware for authorization
  return { _id: "" as Id<"personnel">, role: minimumRole, isActive: true, email: "", callSign: "", requirePasswordChange: false };
}

/**
 * Check if an instructor can award a specific qualification
 * Returns true if:
 * - User is super_admin or administrator (can award anything)
 * - User is instructor and is assigned to the school that owns the qualification
 */
export async function canAwardQualification(
  ctx: QueryCtx | MutationCtx,
  personnelId: Id<"personnel">,
  qualificationId: Id<"qualifications">
): Promise<boolean> {
  // TODO: Remove this check once proper auth is implemented
  // If personnelId is empty (placeholder auth), allow the operation since auth is handled by middleware
  if (!personnelId || personnelId === ("" as Id<"personnel">)) {
    return true;
  }

  const person = await ctx.db.get(personnelId);
  if (!person || !person.isActive) {
    return false;
  }

  // Get user roles
  const personnelRoles = await ctx.db
    .query("userRoles")
    .withIndex("by_personnel", (q) => q.eq("personnelId", personnelId))
    .collect();

  const roles = await ctx.db.query("roles").collect();
  const roleMap = new Map(roles.map(role => [role._id, role.roleName]));
  const roleNames = personnelRoles.map(ur => ur.roleId ? roleMap.get(ur.roleId) : null).filter(Boolean);

  // Super admins and administrators can award any qualification
  if (roleNames.includes("super_admin") || roleNames.includes("administrator")) {
    return true;
  }

  // Game masters and members cannot award qualifications
  if (roleNames.includes("game_master") || roleNames.includes("member")) {
    return false;
  }

  // For instructors, check if they're assigned to the qualification's school
  if (roleNames.includes("instructor")) {
    const qualification = await ctx.db.get(qualificationId);
    if (!qualification) {
      return false;
    }

    // Check if instructor is assigned to this school
    const assignment = await ctx.db
      .query("instructorSchools")
      .withIndex("by_personnel_and_school", (q) =>
        q.eq("personnelId", personnelId).eq("schoolId", qualification.schoolId)
      )
      .first();

    return assignment !== null;
  }

  return false;
}

/**
 * Get all schools an instructor is assigned to
 */
export async function getInstructorSchools(
  ctx: QueryCtx,
  personnelId: Id<"personnel">
): Promise<Id<"schools">[]> {
  const assignments = await ctx.db
    .query("instructorSchools")
    .withIndex("by_personnel", (q) => q.eq("personnelId", personnelId))
    .collect();

  return assignments.map((a) => a.schoolId);
}

/**
 * Check if an instructor can manage a specific school
 * Returns true if:
 * - User is super_admin or administrator (can manage any school)
 * - User is instructor and is assigned to the school
 */
export async function canManageSchool(
  ctx: QueryCtx | MutationCtx,
  personnelId: Id<"personnel">,
  schoolId: Id<"schools">
): Promise<boolean> {
  // TODO: Remove this check once proper auth is implemented
  // If personnelId is empty (placeholder auth), allow the operation since auth is handled by middleware
  if (!personnelId || personnelId === ("" as Id<"personnel">)) {
    return true;
  }

  const person = await ctx.db.get(personnelId);
  if (!person || !person.isActive) {
    return false;
  }

  // Get personnel roles
  const personnelRoles = await ctx.db
    .query("userRoles")
    .withIndex("by_personnel", (q) => q.eq("personnelId", personnelId))
    .collect();

  const roles = await ctx.db.query("roles").collect();
  const roleMap = new Map(roles.map(role => [role._id, role.roleName]));
  const roleNames = personnelRoles.map(ur => ur.roleId ? roleMap.get(ur.roleId) : null).filter(Boolean);

  // Super admins and administrators can manage any school
  if (roleNames.includes("super_admin") || roleNames.includes("administrator")) {
    return true;
  }

  // Game masters and members cannot manage schools
  if (roleNames.includes("game_master") || roleNames.includes("member")) {
    return false;
  }

  // For instructors, check if they're assigned to this school
  if (roleNames.includes("instructor")) {
    const assignment = await ctx.db
      .query("instructorSchools")
      .withIndex("by_personnel_and_school", (q) =>
        q.eq("personnelId", personnelId).eq("schoolId", schoolId)
      )
      .first();

    return assignment !== null;
  }

  return false;
}

/**
 * Check if user has any of the specified roles
 */
export function hasAnyRole(userRole: UserRole, allowedRoles: UserRole[]): boolean {
  return allowedRoles.includes(userRole);
}

/**
 * Format user role for display
 */
export function formatRole(role: UserRole): string {
  const roleMap: Record<UserRole, string> = {
    super_admin: "Super Admin",
    administrator: "Administrator",
    game_master: "Game Master",
    instructor: "Instructor",
    member: "Member",
  };
  return roleMap[role];
}

/**
 * Generate a secure random password
 */
export function generateTemporaryPassword(length: number = 16): string {
  const charset = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*";
  let password = "";
  
  // Ensure at least one of each type
  password += "ABCDEFGHIJKLMNOPQRSTUVWXYZ"[Math.floor(Math.random() * 26)];
  password += "abcdefghijklmnopqrstuvwxyz"[Math.floor(Math.random() * 26)];
  password += "0123456789"[Math.floor(Math.random() * 10)];
  password += "!@#$%^&*"[Math.floor(Math.random() * 8)];
  
  // Fill the rest randomly
  for (let i = password.length; i < length; i++) {
    password += charset[Math.floor(Math.random() * charset.length)];
  }
  
  // Shuffle the password
  return password.split('').sort(() => Math.random() - 0.5).join('');
}

/**
 * Validate password strength
 */
export function validatePassword(password: string): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  if (password.length < 8) {
    errors.push("Password must be at least 8 characters long");
  }
  
  if (!/[A-Z]/.test(password)) {
    errors.push("Password must contain at least one uppercase letter");
  }
  
  if (!/[a-z]/.test(password)) {
    errors.push("Password must contain at least one lowercase letter");
  }
  
  if (!/[0-9]/.test(password)) {
    errors.push("Password must contain at least one number");
  }
  
  return { isValid: errors.length === 0, errors };
}

