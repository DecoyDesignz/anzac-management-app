"use node";

import { action } from "./_generated/server";
import { internal } from "./_generated/api";
import { scrypt } from "crypto";

/**
 * Seed the database with initial data
 * Run this once to populate the database with sample data
 */
export const seedDatabase = action({
  args: {},
  handler: async (ctx): Promise<{
    success: boolean;
    message: string;
    stats: {
      schools: number;
      ranks: number;
      qualifications: number;
      eventTypes: number;
      servers: number;
    };
    superAdmin: {
      username: string;
      temporaryPassword: string;
      instructions: string;
    };
  }> => {
    // Hash the admin password using scrypt
    const temporaryPassword = "TempAdmin123!";
    const salt = "anzac-management-salt"; // Using a fixed salt for simplicity in seed data
    
    // Promisify scrypt for async/await
    const passwordHashBuffer = await new Promise<Buffer>((resolve, reject) => {
      scrypt(temporaryPassword, salt, 64, (err, derivedKey) => {
        if (err) reject(err);
        else resolve(derivedKey);
      });
    });
    const passwordHash = passwordHashBuffer.toString('hex');
    
    // Call internal mutation to do the actual seeding
    const result: {
      success: boolean;
      message: string;
      stats: {
        schools: number;
        ranks: number;
        qualifications: number;
        eventTypes: number;
        servers: number;
      };
    } = await ctx.runMutation(internal.seed.seedDatabaseInternal, { passwordHash });
    
    return {
      ...result,
      superAdmin: {
        username: "admin",
        temporaryPassword,
        instructions: "Go to http://localhost:3000/login with username 'admin' and the password shown above."
      }
    };
  },
});

/**
 * Setup super admin account - creates system record only
 * Super admin must then sign up at /login with provided username and password
 * This is run automatically by seedDatabase, but can be run standalone if needed
 */
export const setupSuperAdmin = action({
  args: {},
  handler: async (ctx) => {
    const username = "admin";
    const temporaryPassword = "TempAdmin123!";

    // Check if super admin already exists
    const existingSuperAdmin = await ctx.runQuery(internal.seed.checkSuperAdminExists);
    
    if (existingSuperAdmin) {
      return {
        success: false,
        message: "Super admin account already exists. Clear database if you want to reset.",
      };
    }

    // Hash the password using scrypt
    const salt = "anzac-management-salt"; // Using a fixed salt for simplicity in seed data
    
    // Promisify scrypt for async/await
    const passwordHashBuffer = await new Promise<Buffer>((resolve, reject) => {
      scrypt(temporaryPassword, salt, 64, (err, derivedKey) => {
        if (err) reject(err);
        else resolve(derivedKey);
      });
    });
    const passwordHash = passwordHashBuffer.toString('hex');

    // Create the system user record with hashed password
    await ctx.runMutation(internal.seed.createSuperAdmin, { passwordHash });

    return {
      success: true,
      message: "Super admin account created!",
      instructions: `Go to http://localhost:3000/login and sign in with:\nUsername: ${username}\nPassword: ${temporaryPassword}`,
      username,
      temporaryPassword,
    };
  },
});

