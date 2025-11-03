"use node";

import { action } from "./_generated/server";
import { v } from "convex/values";
import { Id, Doc } from "./_generated/dataModel";
import { api, internal } from "./_generated/api";
import { scrypt, randomBytes } from "crypto";
import { validatePassword, generateTemporaryPassword } from "./helpers";

/**
 * Generate a cryptographically secure random salt for password hashing
 * Uses Node.js crypto.randomBytes for maximum security
 */
function generateSecureSalt(): string {
  return randomBytes(32).toString('hex'); // 32 bytes = 256 bits, hex encoded
}

/**
 * Hash a password with the given salt using scrypt
 */
async function hashPassword(password: string, salt: string): Promise<string> {
  return new Promise((resolve, reject) => {
    scrypt(password, salt, 64, (err, derivedKey) => {
      if (err) reject(err);
      else resolve(derivedKey.toString('hex'));
    });
  });
}

/**
 * Verify user credentials for authentication
 * This action verifies username and password and returns user info if valid
 * Includes rate limiting to prevent brute force attacks
 */
export const verifyCredentials = action({
  args: {
    username: v.string(),
    password: v.string(),
    ipAddress: v.optional(v.string()), // IP address for rate limiting
  },
  handler: async (ctx, args): Promise<{
    success: boolean;
    error?: string;
    user?: Doc<"personnel"> & { role?: string; name?: string };
  }> => {
    let personnelId: Id<"personnel"> | undefined = undefined;
    let failureReason: string | undefined = undefined;
    
    try {
      // Check rate limits before attempting authentication
      const rateLimitCheck = await ctx.runMutation(internal.rateLimiting.checkRateLimit, {
        username: args.username,
        ipAddress: args.ipAddress,
      });
      
      if (!rateLimitCheck.allowed) {
        // Record the blocked attempt
        await ctx.runMutation(internal.rateLimiting.recordLoginAttempt, {
          username: args.username,
          ipAddress: args.ipAddress,
          success: false,
          reason: rateLimitCheck.reason || "Rate limit exceeded",
          personnelId: undefined,
        });
        
        return {
          success: false,
          error: rateLimitCheck.reason || "Too many login attempts. Please try again later.",
        };
      }

      // Fetch personnel from database by callSign using internal query to get password hash
      const person = await ctx.runQuery(internal.users.getUserByUsernameInternal, { 
        username: args.username 
      });

      if (!person) {
        failureReason = "User not found";
        await ctx.runMutation(internal.rateLimiting.recordLoginAttempt, {
          username: args.username,
          ipAddress: args.ipAddress,
          success: false,
          reason: failureReason,
          personnelId: undefined,
        });
        return {
          success: false,
          error: "Invalid username or password"
        };
      }

      personnelId = person._id;

      // Verify password
      if (!person.passwordHash) {
        failureReason = "No password set";
        await ctx.runMutation(internal.rateLimiting.recordLoginAttempt, {
          username: args.username,
          ipAddress: args.ipAddress,
          success: false,
          reason: failureReason,
          personnelId,
        });
        return {
          success: false,
          error: "Please set up your password first"
        };
      }

      // Get salt - use stored salt if available, otherwise fall back to old hardcoded salt for backward compatibility
      const salt = person.passwordSalt || "anzac-management-salt";
      
      // Hash the provided password using the stored salt (or legacy salt) and compare
      const passwordHash = await hashPassword(args.password, salt);
      
      const isValidPassword = passwordHash === person.passwordHash;

      if (!isValidPassword) {
        failureReason = "Invalid password";
        await ctx.runMutation(internal.rateLimiting.recordLoginAttempt, {
          username: args.username,
          ipAddress: args.ipAddress,
          success: false,
          reason: failureReason,
          personnelId,
        });
        return {
          success: false,
          error: "Invalid username or password"
        };
      }

      if (!person.isActive) {
        failureReason = "Account deactivated";
        await ctx.runMutation(internal.rateLimiting.recordLoginAttempt, {
          username: args.username,
          ipAddress: args.ipAddress,
          success: false,
          reason: failureReason,
          personnelId,
        });
        return {
          success: false,
          error: "Your account has been deactivated"
        };
      }

      // Password migration: If user has legacy password (no passwordSalt), upgrade it silently
      // This improves security by replacing hardcoded salt with unique per-user salt
      if (!person.passwordSalt && isValidPassword) {
        try {
          // Generate a new unique salt for this user
          const newSalt = generateSecureSalt();
          
          // Re-hash the password with the new salt (we already have the plaintext password here)
          const newPasswordHash = await hashPassword(args.password, newSalt);
          
          // Update the user's password with the new salt
          await ctx.runMutation(internal.users.updatePassword, {
            userId: person._id,
            newPasswordHash,
            newPasswordSalt: newSalt,
          });
          
          // Note: We don't need to notify the user - this is a transparent security upgrade
        } catch (migrationError) {
          // Log error but don't fail login - migration can be retried on next login
          console.error("Password migration error for user:", args.username, migrationError);
        }
      }

      // Get user's primary role (for backwards compatibility)
      // Role priority: super_admin > administrator > instructor > game_master > member
      // Use person._id as both requester and target since we're verifying their own credentials
      const userRoles = await ctx.runQuery(api.users.getUserRoles, { 
        requesterUserId: person._id,
        userId: person._id 
      });
      
      // Extract role names from role objects
      const roleNames = userRoles.map(role => role.roleName).filter(Boolean);
      
      // Select the highest priority role
      let primaryRole: string | undefined = undefined;
      if (roleNames.includes("super_admin")) {
        primaryRole = "super_admin";
      } else if (roleNames.includes("administrator")) {
        primaryRole = "administrator";
      } else if (roleNames.includes("instructor")) {
        primaryRole = "instructor";
      } else if (roleNames.includes("game_master")) {
        primaryRole = "game_master";
      } else if (roleNames.includes("member")) {
        primaryRole = "member";
      } else {
        primaryRole = roleNames[0];
      }

      // Record successful login attempt
      await ctx.runMutation(internal.rateLimiting.recordLoginAttempt, {
        username: args.username,
        ipAddress: args.ipAddress,
        success: true,
        personnelId,
      });

      // Return personnel info (with name field for compatibility)
      // Exclude sensitive password fields from the response
      const { passwordHash: _, passwordSalt: __, ...safePerson } = person;
      return {
        success: true,
        user: {
          ...safePerson,
          name: person.callSign, // For compatibility with frontend
          role: primaryRole
        }
      };
    } catch (error) {
      console.error("Credential verification error:", error);
      
      // Record the error as a failed attempt
      await ctx.runMutation(internal.rateLimiting.recordLoginAttempt, {
        username: args.username,
        ipAddress: args.ipAddress,
        success: false,
        reason: error instanceof Error ? error.message : "Authentication error",
        personnelId,
      });
      
      return {
        success: false,
        error: "Authentication failed"
      };
    }
  },
});

/**
 * Create a new personnel account with system access (Administrator and Super Admin only)
 * This is an action because it needs to hash passwords with scrypt
 */
export const createUserAccount = action({
  args: {
    name: v.string(), // CallSign - must be unique
    password: v.string(),
    roles: v.array(v.union(
      v.literal("super_admin"),
      v.literal("administrator"),
      v.literal("game_master"),
      v.literal("instructor"),
      v.literal("member")
    )),
  },
  handler: async (ctx, args): Promise<{ success: boolean; userId: Id<"personnel"> }> => {
    // Note: This action doesn't have auth context, so we rely on the mutation
    // to do the role checking. Administrators cannot create super_admins.
    
    // Validate password
    const validation = validatePassword(args.password);
    if (!validation.isValid) {
      throw new Error(validation.errors.join(", "));
    }

    // Check if callSign already exists
    const existingPerson = await ctx.runQuery(api.users.getUserByUsername, { 
      username: args.name 
    });

    if (existingPerson) {
      throw new Error("CallSign already exists");
    }

    // Generate a unique salt for this user
    const salt = generateSecureSalt();
    
    // Hash password with the generated salt
    const passwordHash = await hashPassword(args.password, salt);

    // Create the personnel with system access
    const result: { success: boolean; userId: Id<"personnel"> } = await ctx.runMutation(internal.users.createUserAccountInternal, {
      name: args.name,
      passwordHash,
      passwordSalt: salt,
      roles: args.roles,
    });

    return result;
  },
});

/**
 * Change password for the current user
 * This is an action because it needs to use scrypt
 */
export const changePassword = action({
  args: {
    username: v.string(),
    currentPassword: v.string(),
    newPassword: v.string(),
  },
  handler: async (ctx, args): Promise<{
    success: boolean;
    error?: string;
    message?: string;
  }> => {
    try {
      // Get the user by username using internal query to get password hash for verification
      const currentUser = await ctx.runQuery(internal.users.getUserByUsernameInternal, { username: args.username });
      if (!currentUser) {
        return {
          success: false,
          error: "User not found"
        };
      }

      // Type guard to ensure we have a user with required fields
      if (!currentUser.passwordHash) {
        return {
          success: false,
          error: "No password set for this account"
        };
      }

      // Verify current password using stored salt (or legacy salt for backward compatibility)
      const currentSalt = currentUser.passwordSalt || "anzac-management-salt";
      const currentPasswordHash = await hashPassword(args.currentPassword, currentSalt);
      
      const isValidPassword = currentPasswordHash === currentUser.passwordHash;

      if (!isValidPassword) {
        return {
          success: false,
          error: "Current password is incorrect"
        };
      }

      // Validate new password
      const validation = validatePassword(args.newPassword);
      if (!validation.isValid) {
        return {
          success: false,
          error: validation.errors.join(", ")
        };
      }

      // Generate a new unique salt for the new password (security best practice)
      const newSalt = generateSecureSalt();
      
      // Hash new password with new salt
      const newPasswordHash = await hashPassword(args.newPassword, newSalt);

      // Update password and salt
      await ctx.runMutation(internal.users.updatePassword, {
        userId: currentUser._id,
        newPasswordHash,
        newPasswordSalt: newSalt,
      });

      return { 
        success: true, 
        message: "Password updated successfully" 
      };
    } catch (error) {
      console.error("Password change error:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Failed to change password"
      };
    }
  },
});

/**
 * Reset a personnel member's password (Administrator and Super Admin only)
 * This generates a new temporary password and requires the user to change it on next login
 */
export const resetUserPassword = action({
  args: {
    requesterUserId: v.id("personnel"), // Admin performing the reset
    userId: v.id("personnel"), // Target user whose password is being reset
  },
  handler: async (ctx, args): Promise<{ success: boolean; temporaryPassword: string }> => {
    // Get the target user (getUser query requires requester to be an administrator)
    // This call will throw an error if the requester is not an administrator
    const targetPerson = await ctx.runQuery(api.users.getUser, {
      requesterUserId: args.requesterUserId,
      userId: args.userId
    });
    
    if (!targetPerson) {
      throw new Error("Personnel not found");
    }

    // Generate a temporary password (16 characters)
    const temporaryPassword = generateTemporaryPassword(16);

    // Generate a unique salt for the temporary password
    const salt = generateSecureSalt();
    
    // Hash the temporary password with the new salt
    const passwordHash = await hashPassword(temporaryPassword, salt);

    // Update the personnel's password, salt, and flag for password change
    await ctx.runMutation(internal.users.resetPassword, {
      userId: args.userId,
      newPasswordHash: passwordHash,
      newPasswordSalt: salt,
    });

    return {
      success: true,
      temporaryPassword,
    };
  },
});

