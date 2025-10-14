"use node";

import { action } from "./_generated/server";
import { v } from "convex/values";
import { Id, Doc } from "./_generated/dataModel";
import { api, internal } from "./_generated/api";
import { scrypt } from "crypto";
import { validatePassword, generateTemporaryPassword } from "./helpers";

/**
 * Verify user credentials for authentication
 * This action verifies username and password and returns user info if valid
 */
export const verifyCredentials = action({
  args: {
    username: v.string(),
    password: v.string(),
  },
  handler: async (ctx, args): Promise<{
    success: boolean;
    error?: string;
    user?: Doc<"personnel"> & { role?: string; name?: string };
  }> => {
    try {
      // Fetch personnel from database by callSign
      const person = await ctx.runQuery(api.users.getUserByUsername, { 
        username: args.username 
      });

      if (!person) {
        return {
          success: false,
          error: "Invalid username or password"
        };
      }

      // Verify password
      if (!person.passwordHash) {
        return {
          success: false,
          error: "Please set up your password first"
        };
      }

      // Hash the provided password using the same salt and compare
      const salt = "anzac-management-salt";
      const passwordHashBuffer = await new Promise<Buffer>((resolve, reject) => {
        scrypt(args.password, salt, 64, (err, derivedKey) => {
          if (err) reject(err);
          else resolve(derivedKey);
        });
      });
      const passwordHash = passwordHashBuffer.toString('hex');
      
      const isValidPassword = passwordHash === person.passwordHash;

      if (!isValidPassword) {
        return {
          success: false,
          error: "Invalid username or password"
        };
      }

      if (!person.isActive) {
        return {
          success: false,
          error: "Your account has been deactivated"
        };
      }

      // Get user's primary role (for backwards compatibility)
      // Role priority: super_admin > administrator > instructor > game_master > member
      const userRoles = await ctx.runQuery(api.users.getUserRoles, { userId: person._id });
      
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

      // Return personnel info (with name field for compatibility)
      return {
        success: true,
        user: {
          ...person,
          name: person.callSign, // For compatibility with frontend
          role: primaryRole
        }
      };
    } catch (error) {
      console.error("Credential verification error:", error);
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

    // Hash password with scrypt
    const salt = "anzac-management-salt";
    
    // Promisify scrypt for async/await
    const passwordHashBuffer = await new Promise<Buffer>((resolve, reject) => {
      scrypt(args.password, salt, 64, (err, derivedKey) => {
        if (err) reject(err);
        else resolve(derivedKey);
      });
    });
    const passwordHash = passwordHashBuffer.toString('hex');

    // Create the personnel with system access
    const result: { success: boolean; userId: Id<"personnel"> } = await ctx.runMutation(internal.users.createUserAccountInternal, {
      name: args.name,
      passwordHash,
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
      // Get the user by username
      const currentUser = await ctx.runQuery(api.users.getUserByUsername, { username: args.username });
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

      // Verify current password
      const salt = "anzac-management-salt";
      
      // Promisify scrypt for async/await
      const currentPasswordHashBuffer = await new Promise<Buffer>((resolve, reject) => {
        scrypt(args.currentPassword, salt, 64, (err, derivedKey) => {
          if (err) reject(err);
          else resolve(derivedKey);
        });
      });
      const currentPasswordHash = currentPasswordHashBuffer.toString('hex');
      
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

      // Hash new password
      const newPasswordHashBuffer = await new Promise<Buffer>((resolve, reject) => {
        scrypt(args.newPassword, salt, 64, (err, derivedKey) => {
          if (err) reject(err);
          else resolve(derivedKey);
        });
      });
      const newPasswordHash = newPasswordHashBuffer.toString('hex');

      // Update password
      await ctx.runMutation(internal.users.updatePassword, {
        userId: currentUser._id,
        newPasswordHash,
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
    userId: v.id("personnel"),
  },
  handler: async (ctx, args): Promise<{ success: boolean; temporaryPassword: string }> => {
    // Get the personnel member
    const person = await ctx.runQuery(api.users.getUser, { userId: args.userId });
    if (!person) {
      throw new Error("Personnel not found");
    }

    // Generate a temporary password (16 characters)
    const temporaryPassword = generateTemporaryPassword(16);

    // Hash the temporary password
    const salt = "anzac-management-salt";
    const passwordHashBuffer = await new Promise<Buffer>((resolve, reject) => {
      scrypt(temporaryPassword, salt, 64, (err, derivedKey) => {
        if (err) reject(err);
        else resolve(derivedKey);
      });
    });
    const passwordHash = passwordHashBuffer.toString('hex');

    // Update the personnel's password and flag for password change
    await ctx.runMutation(internal.users.resetPassword, {
      userId: args.userId,
      newPasswordHash: passwordHash,
    });

    return {
      success: true,
      temporaryPassword,
    };
  },
});

