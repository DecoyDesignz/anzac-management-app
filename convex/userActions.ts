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
    user?: Doc<"systemUsers"> & { role?: string };
  }> => {
    try {
      // Fetch user from database
      const user = await ctx.runQuery(api.users.getUserByUsername, { 
        username: args.username 
      });

      if (!user) {
        return {
          success: false,
          error: "Invalid username or password"
        };
      }

      // Verify password
      if (!user.passwordHash) {
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
      
      const isValidPassword = passwordHash === user.passwordHash;

      if (!isValidPassword) {
        return {
          success: false,
          error: "Invalid username or password"
        };
      }

      if (!user.isActive) {
        return {
          success: false,
          error: "Your account has been deactivated"
        };
      }

      // Get user's primary role (for backwards compatibility)
      // Role priority: super_admin > administrator > instructor > game_master
      const userRoles = await ctx.runQuery(api.users.getUserRoles, { userId: user._id });
      
      // Select the highest priority role
      let primaryRole: string | undefined = undefined;
      if (userRoles.includes("super_admin")) {
        primaryRole = "super_admin";
      } else if (userRoles.includes("administrator")) {
        primaryRole = "administrator";
      } else if (userRoles.includes("instructor")) {
        primaryRole = "instructor";
      } else if (userRoles.includes("game_master")) {
        primaryRole = "game_master";
      } else {
        primaryRole = userRoles[0];
      }

      // Return user info
      return {
        success: true,
        user: {
          ...user,
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
 * Create a new user account with auth credentials (Administrator and Super Admin only)
 * This is an action because it needs to hash passwords with scrypt
 */
export const createUserAccount = action({
  args: {
    name: v.string(), // Username - must be unique
    password: v.string(),
    roles: v.array(v.union(
      v.literal("super_admin"),
      v.literal("administrator"),
      v.literal("game_master"),
      v.literal("instructor")
    )),
  },
  handler: async (ctx, args): Promise<{ success: boolean; userId: Id<"systemUsers"> }> => {
    // Note: This action doesn't have auth context, so we rely on the mutation
    // to do the role checking. Administrators cannot create super_admins.
    
    // Validate password
    const validation = validatePassword(args.password);
    if (!validation.isValid) {
      throw new Error(validation.errors.join(", "));
    }

    // Check if username already exists
    const existingUser = await ctx.runQuery(api.users.getUserByUsername, { 
      username: args.name 
    });

    if (existingUser) {
      throw new Error("Username already exists");
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

    // Create the user
    const result: { success: boolean; userId: Id<"systemUsers"> } = await ctx.runMutation(internal.users.createUserAccountInternal, {
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
  handler: async (ctx, args) => {
    // Get the user by username
    const currentUser = await ctx.runQuery(api.users.getUserByUsername, { username: args.username });
    if (!currentUser) {
      throw new Error("User not found");
    }

    // Type guard to ensure we have a user with required fields
    if (!currentUser.passwordHash) {
      throw new Error("No password set for this account");
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
      throw new Error("Current password is incorrect");
    }

    // Validate new password
    const validation = validatePassword(args.newPassword);
    if (!validation.isValid) {
      throw new Error(validation.errors.join(", "));
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

    return { success: true, message: "Password updated successfully" };
  },
});

/**
 * Reset a user's password (Administrator and Super Admin only)
 * This generates a new temporary password and requires the user to change it on next login
 */
export const resetUserPassword = action({
  args: {
    userId: v.id("systemUsers"),
  },
  handler: async (ctx, args): Promise<{ success: boolean; temporaryPassword: string }> => {
    // Get the user
    const user = await ctx.runQuery(api.users.getUser, { userId: args.userId });
    if (!user) {
      throw new Error("User not found");
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

    // Update the user's password and flag for password change
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

