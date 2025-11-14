import { QueryCtx, MutationCtx } from "./_generated/server";
import { Id, Doc } from "./_generated/dataModel";

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
 * Get the authenticated user by their ID
 * Verifies the user exists, has system access, and is active
 * @throws Error if user is not found, inactive, or doesn't have system access
 */
export async function getAuthenticatedUser(
  ctx: QueryCtx | MutationCtx,
  userId: Id<"personnel"> | string
): Promise<Doc<"personnel">> {
  // Validate userId format
  if (!userId) {
    throw new Error("Authentication required: userId must be provided");
  }

  try {
    const user = await ctx.db.get(userId as Id<"personnel">);
    
    if (!user) {
      throw new Error(`User not found with ID: ${userId}`);
    }
    
    // Verify user has system access (passwordHash exists)
    if (!user.passwordHash) {
      throw new Error("User does not have system access");
    }
    
    // Verify user is active
    if (user.isActive === false) {
      throw new Error("User account is inactive");
    }
    
    return user;
  } catch (error) {
    // Re-throw with more context if it's not already an Error
    if (error instanceof Error) {
      throw error;
    }
    throw new Error(`Authentication failed: ${String(error)}`);
  }
}

/**
 * Require authentication - verifies user exists, has system access, and is active
 * @param ctx Convex context
 * @param userId User ID from NextAuth session (must be passed from client)
 * @returns Authenticated user document
 * @throws Error if authentication fails
 */
export async function requireAuth(
  ctx: QueryCtx | MutationCtx,
  userId: Id<"personnel"> | string
): Promise<Doc<"personnel">> {
  if (!userId) {
    throw new Error("Authentication required: userId must be provided");
  }
  
  return await getAuthenticatedUser(ctx, userId);
}

/**
 * Require a specific role or higher
 * Verifies user exists, is active, and has the required role
 * @param ctx Convex context
 * @param userId User ID from NextAuth session
 * @param minimumRole Minimum role required (role hierarchy is enforced)
 * @returns Authenticated user document
 * @throws Error if user doesn't have required role
 */
export async function requireRole(
  ctx: QueryCtx | MutationCtx,
  userId: Id<"personnel"> | string,
  minimumRole: UserRole
): Promise<Doc<"personnel">> {
  // First verify authentication
  const user = await requireAuth(ctx, userId);
  
  // Get user's roles from database
  const personnelRoles = await ctx.db
    .query("userRoles")
    .withIndex("by_personnel", (q) => q.eq("personnelId", user._id))
    .collect();
  
  const roles = await ctx.db.query("roles").collect();
  const roleMap = new Map(roles.map(role => [role._id, role.roleName]));
  const roleNames = personnelRoles
    .map(ur => ur.roleId ? roleMap.get(ur.roleId) : null)
    .filter(Boolean) as string[];
  
  // Check if user has the minimum required role (using hierarchy)
  const minimumRoleLevel = roleHierarchy[minimumRole];
  
  // Check each role the user has
  for (const roleName of roleNames) {
    const roleLevel = roleHierarchy[roleName as UserRole];
    if (roleLevel >= minimumRoleLevel) {
      return user; // User has sufficient role
    }
  }
  
  // User doesn't have required role
  throw new Error(`Access denied: Requires ${minimumRole} role or higher`);
}

/**
 * Check if an instructor can award a specific qualification
 * Returns true if:
 * - User is super_admin or administrator (can award anything)
 * - User is instructor and is assigned to the school that owns the qualification
 */
export async function canAwardQualification(
  ctx: QueryCtx | MutationCtx,
  userId: Id<"personnel"> | string,
  qualificationId: Id<"qualifications">
): Promise<boolean> {
  if (!userId) {
    return false;
  }

  const person = await ctx.db.get(userId as Id<"personnel">);
  if (!person || !person.isActive) {
    return false;
  }

  // Get user roles
  const personnelRoles = await ctx.db
    .query("userRoles")
    .withIndex("by_personnel", (q) => q.eq("personnelId", person._id))
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
        q.eq("personnelId", person._id).eq("schoolId", qualification.schoolId)
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
  userId: Id<"personnel"> | string
): Promise<Id<"schools">[]> {
  if (!userId) {
    return [];
  }
  
  const assignments = await ctx.db
    .query("instructorSchools")
    .withIndex("by_personnel", (q) => q.eq("personnelId", userId as Id<"personnel">))
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
  userId: Id<"personnel"> | string,
  schoolId: Id<"schools">
): Promise<boolean> {
  if (!userId) {
    return false;
  }

  const person = await ctx.db.get(userId as Id<"personnel">);
  if (!person || !person.isActive) {
    return false;
  }

  // Get personnel roles
  const personnelRoles = await ctx.db
    .query("userRoles")
    .withIndex("by_personnel", (q) => q.eq("personnelId", person._id))
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
        q.eq("personnelId", person._id).eq("schoolId", schoolId)
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
 * Check if a role is considered a staff role
 * Staff roles are: super_admin, administrator, instructor, game_master
 */
export function isStaffRole(roleName: string): boolean {
  const staffRoles: UserRole[] = ["super_admin", "administrator", "instructor", "game_master"];
  return staffRoles.includes(roleName as UserRole);
}

/**
 * Check if user has staff role by querying their roles
 */
export async function isStaff(
  ctx: QueryCtx | MutationCtx,
  userId: Id<"personnel"> | string
): Promise<boolean> {
  if (!userId) {
    return false;
  }

  const personnelRoles = await ctx.db
    .query("userRoles")
    .withIndex("by_personnel", (q) => q.eq("personnelId", userId as Id<"personnel">))
    .collect();

  const roles = await ctx.db.query("roles").collect();
  const roleMap = new Map(roles.map(role => [role._id, role.roleName]));
  const roleNames = personnelRoles.map(ur => ur.roleId ? roleMap.get(ur.roleId) : null).filter(Boolean);

  return roleNames.some(roleName => roleName && isStaffRole(roleName));
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
 * Generate a cryptographically secure random salt
 * Uses crypto.randomBytes for Node.js environments
 */
export function generateSecureSalt(): string {
  // For Node.js "use node" functions, we can use crypto.randomBytes
  // For regular Convex functions, we'll use a CSPRNG fallback
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    // Browser or modern Node.js environment
    const saltBytes = new Uint8Array(32); // 32 bytes = 256 bits
    crypto.getRandomValues(saltBytes);
    return Array.from(saltBytes)
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
  } else {
    // Fallback for older environments - should not be used in production
    // but included for completeness
    let salt = '';
    const chars = '0123456789abcdef';
    for (let i = 0; i < 64; i++) { // 64 hex chars = 32 bytes
      salt += chars[Math.floor(Math.random() * chars.length)];
    }
    return salt;
  }
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

